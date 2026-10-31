import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { checkHealth, checkHealthDeclaration } from './health.tool.js';
import type { HealthCheckResult } from './health.tool.js';
import { getMetrics, getMetricsDeclaration } from './metrics.tool.js';
import type { ServiceMetricsResult } from './metrics.tool.js';
import { getDiagnosticLogs, getDiagnosticLogsDeclaration } from './logs.tool.js';
import type { GetLogsOptions, LogsResult } from './logs.tool.js';
import { getDeploymentHistory, getDeploymentHistoryDeclaration } from './deployments.tool.js';
import type { DeploymentHistoryResult } from './deployments.tool.js';
import { probeEndpoint, probeEndpointDeclaration } from './probe.tool.js';
import type { EndpointProbeResult } from './probe.tool.js';
import { triggerRemediation } from './remediate.tool.js';
import type { RemediationResult } from './remediate.tool.js';

// Re-export raw functions and types
export {
  checkHealth,
  getMetrics,
  getDiagnosticLogs,
  getDeploymentHistory,
  probeEndpoint,
  triggerRemediation,
  type HealthCheckResult,
  type ServiceMetricsResult,
  type GetLogsOptions,
  type LogsResult,
  type DeploymentHistoryResult,
  type EndpointProbeResult,
  type RemediationResult,
};

// SRE Tool Function Declarations for LLM wire protocol
export const SRE_TOOL_DECLARATIONS = [
  checkHealthDeclaration,
  getMetricsDeclaration,
  getDiagnosticLogsDeclaration,
  getDeploymentHistoryDeclaration,
  probeEndpointDeclaration,
];

// LangChain Structured Tools (@langchain/core/tools)
export const checkHealthTool = tool(
  async () => {
    const result = await checkHealth();
    return JSON.stringify(result);
  },
  {
    name: 'check_health',
    description:
      'Queries target microservice /health endpoint to check service status, uptime, and underlying dependencies (database, cache, disk).',
    schema: z.object({}),
  }
);

export const getMetricsTool = tool(
  async () => {
    const result = await getMetrics();
    return JSON.stringify(result);
  },
  {
    name: 'get_metrics',
    description:
      'Fetches Prometheus-style golden signals: error rate %, request count, p50/p95/p99 latency, and container memory/CPU utilization.',
    schema: z.object({}),
  }
);

export const getDiagnosticLogsTool = tool(
  async ({ level, endpoint, limit, sinceSeconds }) => {
    const result = await getDiagnosticLogs({
      level: level as any,
      endpoint,
      limit,
      sinceSeconds,
    });
    return JSON.stringify(result);
  },
  {
    name: 'get_diagnostic_logs',
    description:
      'Retrieves diagnostic logs with optional filters (level: ERROR/WARN/INFO, endpoint, limit). Used to extract stack traces and exceptions.',
    schema: z.object({
      level: z
        .enum(['INFO', 'WARN', 'ERROR', 'FATAL'])
        .optional()
        .describe('Severity filter; prefer ERROR for root cause detection.'),
      endpoint: z.string().optional().describe('Filter by endpoint, e.g. /api/orders'),
      limit: z.number().optional().describe('Max logs to return (default 20, max 100)'),
      sinceSeconds: z.number().optional().describe('Logs from the last N seconds'),
    }),
  }
);

export const getDeploymentHistoryTool = tool(
  async () => {
    const result = await getDeploymentHistory();
    return JSON.stringify(result);
  },
  {
    name: 'get_deployment_history',
    description:
      'Fetches recent microservice deployment records, commit hashes, release timestamps, and changelogs. Crucial for correlating error spikes with bad releases.',
    schema: z.object({}),
  }
);

export const probeEndpointTool = tool(
  async ({ endpoint }) => {
    const result = await probeEndpoint(endpoint);
    return JSON.stringify(result);
  },
  {
    name: 'probe_endpoint',
    description:
      'Sends an active synthetic HTTP GET probe to an endpoint (e.g. /api/orders vs /api/users) to compare live status codes, latency, and headers.',
    schema: z.object({
      endpoint: z.string().describe('The path to probe, e.g. "/api/orders" or "/api/users"'),
    }),
  }
);

export const allLangChainTools = [
  checkHealthTool,
  getMetricsTool,
  getDiagnosticLogsTool,
  getDeploymentHistoryTool,
  probeEndpointTool,
];
