import type { IncidentReport } from '../schemas/report.js';

export function printTerminalReport(report: IncidentReport): void {
  const line = '━'.repeat(64);
  const severityColors: Record<string, string> = {
    CRITICAL: '\x1b[31;1m',
    HIGH: '\x1b[33;1m',
    MEDIUM: '\x1b[36;1m',
    LOW: '\x1b[32;1m',
  };
  const color = severityColors[report.severity] || '\x1b[37m';
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';

  console.log(`\n${line}`);
  console.log(`${bold}🚨 EVIDENCE-BACKED INCIDENT DIAGNOSIS REPORT${reset}`);
  console.log(`${line}`);
  console.log(`${bold}Incident ID:${reset}       ${report.incidentId}`);
  console.log(`${bold}Severity:${reset}          ${color}${report.severity}${reset}`);
  console.log(`${bold}Service:${reset}           ${report.failingService}`);
  console.log(
    `${bold}Root Cause:${reset}        ${bold}\x1b[35m${report.rootCauseCategory}${reset}`
  );
  console.log(`${bold}Confidence Score:${reset}  ${report.confidenceScore}%`);
  console.log(`${bold}Affected Routes:${reset}   ${report.affectedEndpoints.join(', ') || 'None'}`);
  console.log(`${bold}Healthy Routes:${reset}    ${report.healthyEndpoints.join(', ') || 'None'}`);
  console.log(`${line}`);

  console.log(`\n${bold}📋 Executive Summary:${reset}`);
  console.log(`  ${report.summary}`);

  console.log(`\n${bold}🔬 Detailed Diagnosis:${reset}`);
  console.log(`  ${report.detailedDiagnosis}`);

  console.log(`\n${bold}🔍 Collected Telemetry Evidence:${reset}`);
  console.log(`  • ${bold}Health Probe:${reset}  ${report.evidence.healthProbe}`);
  console.log(`  • ${bold}Metrics:${reset}       ${report.evidence.metrics}`);
  console.log(`  • ${bold}Deployments:${reset}   ${report.evidence.deployments}`);
  console.log(`  • ${bold}Logs / Trace:${reset}  ${report.evidence.logs}`);

  console.log(`\n${bold}⏱️ Diagnostic Timeline:${reset}`);
  for (const item of report.timeline) {
    console.log(`  ${dim}[${item.step}]${reset} ${item.observation}`);
  }

  console.log(`\n${bold}🛠️ Remediation Plan:${reset}`);
  console.log(
    `  • ${bold}Immediate Action:${reset}     \x1b[32m${report.remediation.immediateAction}${reset}`
  );
  console.log(
    `  • ${bold}Recommended Action:${reset}   ${report.remediation.recommendedRemediationType}`
  );
  console.log(`  • ${bold}Permanent Fix:${reset}        ${report.remediation.longTermFix}`);
  console.log(
    `  • ${bold}Can Auto-Remediate:${reset}   ${report.remediation.canAutoRemediate ? 'YES ✅' : 'NO ❌'}`
  );
  console.log(`${line}\n`);
}
