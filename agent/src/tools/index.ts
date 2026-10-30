import { checkHealth, checkHealthDeclaration } from './health.tool.js';
import { getMetrics, getMetricsDeclaration } from './metrics.tool.js';
import { getDiagnosticLogs, getDiagnosticLogsDeclaration, GetLogsOptions } from './logs.tool.js';
import { getDeploymentHistory, getDeploymentHistoryDeclaration } from './deployments.tool.js';
import { probeEndpoint, probeEndpointDeclaration } from './probe.tool.js';
import { triggerRemediation, triggerRemediationDeclaration } from './remediate.tool.js';

export {
  checkHealth,
  getMetrics,
  getDiagnosticLogs,
  getDeploymentHistory,
  probeEndpoint,
  triggerRemediation,
};

export const SRE_TOOL_DECLARATIONS = [
  checkHealthDeclaration,
  getMetricsDeclaration,
  getDiagnosticLogsDeclaration,
  getDeploymentHistoryDeclaration,
  probeEndpointDeclaration,
  triggerRemediationDeclaration,
];

export async function executeTool(name: string, args: Record<string, any> = {}): Promise<any> {
  switch (name) {
    case 'check_health':
      return await checkHealth();
    case 'get_metrics':
      return await getMetrics();
    case 'get_diagnostic_logs':
      return await getDiagnosticLogs(args as GetLogsOptions);
    case 'get_deployment_history':
      return await getDeploymentHistory();
    case 'probe_endpoint':
      return await probeEndpoint(args.endpoint || '/api/orders');
    case 'trigger_remediation':
      return await triggerRemediation(args.action || 'RESET_STATE');
    default:
      throw new Error(`Unknown SRE tool: ${name}`);
  }
}
