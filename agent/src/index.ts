import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { agent } from './core/agent.js';
import { printTerminalReport } from './reporter/terminal.js';
import { saveMarkdownReport } from './reporter/markdown.js';
import { triggerRemediation } from './tools/remediate.tool.js';

const app = express();

app.use(cors());
app.use(express.json());

// Root Info Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ai-sre-agent',
    version: '1.0.0',
    description:
      'Autonomous AI Site Reliability Engineer Agent for Incident Diagnosis & Root Cause Analysis',
    status: 'ONLINE',
    config: {
      targetServiceUrl: config.targetServiceUrl,
      modelName: config.modelName,
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
    timestamp: new Date().toISOString(),
    targetService: config.targetServiceUrl,
    llmProvider: config.geminiApiKey ? 'Google Gemini API' : 'Telemetry Heuristic Engine',
  });
});

// Trigger Investigation Endpoint
app.post('/api/investigate', async (req, res) => {
  try {
    const { incidentId, alertMessage, autoRemediate, forceHeuristics } = req.body || {};

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
  const alertData = req.body || {};
  const alertSummary =
    alertData.summary || alertData.message || 'Incoming monitoring webhook alert';
  const incidentId = alertData.id || `INC-${Date.now().toString().slice(-4)}`;

  console.log(`\n🔔 [Webhook Alert Received] ${alertSummary}`);

  // Kick off asynchronous investigation
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
    message: `Incident ${incidentId} queued for autonomous investigation.`,
    incidentId,
  });
});

// Direct Remediation Endpoint
app.post('/api/remediate', async (req, res) => {
  const { action } = req.body || {};
  const result = await triggerRemediation(action || 'RESET_STATE');
  res.status(result.success ? 200 : 500).json(result);
});

app.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(` 🤖 AI-SRE Autonomous Agent running on http://localhost:${config.port}`);
  console.log(` Target Microservice: ${config.targetServiceUrl}`);
  console.log(
    ` Diagnostic Engine:   ${config.geminiApiKey ? `Gemini LLM (${config.modelName})` : 'Telemetry Heuristic Engine'}`
  );
  console.log(` Trigger API:         POST http://localhost:${config.port}/api/investigate`);
  console.log(`======================================================\n`);
});

export default app;
