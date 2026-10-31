import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { config } from './config.js';
import { agent } from './core/agent.js';
import { printTerminalReport } from './reporter/terminal.js';
import { saveMarkdownReport } from './reporter/markdown.js';
import { triggerRemediation } from './tools/remediate.tool.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '32kb' }));

const investigateRequestSchema = z
  .object({
    incidentId: z.string().trim().min(1).max(100).optional(),
    alertMessage: z.string().trim().min(1).max(4_000).optional(),
    autoRemediate: z.boolean().optional(),
    forceHeuristics: z.boolean().optional(),
  })
  .strict();

const webhookRequestSchema = z
  .object({
    id: z.string().trim().min(1).max(100).optional(),
    summary: z.string().trim().min(1).max(4_000).optional(),
    message: z.string().trim().min(1).max(4_000).optional(),
  })
  .passthrough();

function hasRemediationAuthorization(request: express.Request): boolean {
  return Boolean(config.agentApiKey && request.header('x-agent-api-key') === config.agentApiKey);
}

// Root Info Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ai-sre-agent',
    version: '1.0.0',
    frameworks: ['LangGraph', 'LangChain', 'Express', 'Zod', 'TypeScript'],
    description:
      'Autonomous AI Site Reliability Engineer Agent built with LangGraph StateGraph & LangChain for Incident Diagnosis & Root Cause Analysis',
    status: 'ONLINE',
    config: {
      targetServiceUrl: config.targetServiceUrl,
      modelName: config.modelName,
      orchestrator: 'LangGraph StateGraph',
      llmConfigured: Boolean(config.geminiApiKey),
    },
    endpoints: [
      'POST /api/investigate - Trigger autonomous incident investigation',
      'POST /api/remediate   - Trigger remediation action on target service',
      'POST /api/webhook     - Ingest PagerDuty/monitoring alerts to trigger auto-triage',
      'GET  /api/health      - Check agent health & connection status',
    ],
  });
});

// Agent Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    agent: 'ai-sre-agent',
    orchestrator: 'LangGraph StateGraph',
    framework: '@langchain/langgraph',
    timestamp: new Date().toISOString(),
    targetService: config.targetServiceUrl,
    llmProvider: config.geminiApiKey
      ? `LangGraph + LangChain (${config.modelName})`
      : 'Telemetry Heuristic Engine',
  });
});

// Trigger Investigation Endpoint
app.post('/api/investigate', async (req, res) => {
  try {
    const request = investigateRequestSchema.safeParse(req.body || {});
    if (!request.success) {
      return res.status(400).json({ status: 'INVALID_REQUEST', error: request.error.flatten() });
    }
    const { incidentId, alertMessage, autoRemediate, forceHeuristics } = request.data;

    if (autoRemediate && !hasRemediationAuthorization(req)) {
      return res.status(401).json({
        status: 'REMEDIATION_AUTH_REQUIRED',
        error:
          'Set AGENT_API_KEY and provide it in the x-agent-api-key header to enable remediation.',
      });
    }

    const report = await agent.investigate({
      incidentId: incidentId || `INC-${Date.now().toString().slice(-4)}`,
      alertMessage: alertMessage || 'Manual trigger: Anomaly detected on orders endpoint',
      forceHeuristics: Boolean(forceHeuristics),
    });

    printTerminalReport(report);
    const reportPath = saveMarkdownReport(report);

    let remediationResult: any = null;
    if (autoRemediate && report.remediation.canAutoRemediate) {
      remediationResult = await triggerRemediation(report.remediation.recommendedRemediationType);
    }

    res.status(200).json({
      status: 'INVESTIGATION_COMPLETE',
      orchestrator: 'LangGraph StateGraph',
      reportPath,
      report,
      remediationResult,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'INVESTIGATION_FAILED',
      error: err.message,
    });
  }
});

// Webhook for Alert Ingestion (PagerDuty / Alertmanager / Datadog style)
app.post('/api/webhook', async (req, res) => {
  const parsed = webhookRequestSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ status: 'INVALID_WEBHOOK', error: parsed.error.flatten() });
  }

  const alertData = parsed.data;
  const alertSummary =
    alertData.summary || alertData.message || 'Incoming monitoring webhook alert';
  const incidentId = alertData.id || `INC-${Date.now().toString().slice(-4)}`;

  console.log(`\n🔔 [Webhook Alert Received] ${alertSummary}`);

  // Kick off asynchronous investigation via LangGraph
  agent
    .investigate({ incidentId, alertMessage: alertSummary })
    .then((report) => {
      printTerminalReport(report);
      saveMarkdownReport(report);
    })
    .catch((err) => {
      console.error('Webhook investigation background error:', err);
    });

  res.status(202).json({
    status: 'ACCEPTED',
    orchestrator: 'LangGraph StateGraph',
    message: `Incident ${incidentId} queued for autonomous investigation.`,
    incidentId,
  });
});

// Direct Remediation Endpoint
app.post('/api/remediate', async (req, res) => {
  if (!hasRemediationAuthorization(req)) {
    return res.status(401).json({
      status: 'REMEDIATION_AUTH_REQUIRED',
      error: 'Set AGENT_API_KEY and provide it in the x-agent-api-key header to run remediation.',
    });
  }

  const request = z
    .object({ action: z.literal('RESET_STATE').default('RESET_STATE') })
    .safeParse(req.body || {});
  if (!request.success) {
    return res.status(400).json({
      status: 'UNSUPPORTED_REMEDIATION',
      error: 'The demo target supports only RESET_STATE. Other actions are advisory.',
    });
  }

  const result = await triggerRemediation(request.data.action);
  res.status(result.success ? 200 : 500).json(result);
});

// Keep malformed requests and internal exceptions from falling through to Express's HTML error page.
app.use(
  (
    error: Error & { status?: number; type?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (error.type === 'entity.parse.failed') {
      return res
        .status(400)
        .json({ status: 'INVALID_JSON', error: 'Request body must be valid JSON.' });
    }

    console.error('Unhandled agent API error:', error);
    return res.status(error.status && error.status >= 400 ? error.status : 500).json({
      status: 'INTERNAL_ERROR',
      error: 'The agent API could not process the request.',
    });
  }
);

app.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(` 🤖 AI-SRE Autonomous Agent running on http://localhost:${config.port}`);
  console.log(` Orchestrator:        LangGraph StateGraph (@langchain/langgraph)`);
  console.log(` Tools:               LangChain Structured Tools (@langchain/core)`);
  console.log(` Target Microservice: ${config.targetServiceUrl}`);
  console.log(
    ` Diagnostic Engine:   ${config.geminiApiKey ? `LangGraph StateGraph (${config.modelName})` : 'Telemetry Heuristic Engine'}`
  );
  console.log(` Trigger API:         POST http://localhost:${config.port}/api/investigate`);
  console.log(`======================================================\n`);
});

export default app;
