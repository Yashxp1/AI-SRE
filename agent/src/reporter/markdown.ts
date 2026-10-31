import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IncidentReport } from '../schemas/report.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function saveMarkdownReport(report: IncidentReport): string {
  const reportsDir = path.resolve(__dirname, '../../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filePath = path.join(reportsDir, `${report.incidentId}.md`);
  const content = `# Incident Diagnostic Report: ${report.incidentId}

**Generated At:** ${new Date().toISOString()}  
**Target Service:** \`${report.failingService}\`  
**Severity:** **${report.severity}**  
**Root Cause Category:** \`${report.rootCauseCategory}\`  
**Confidence Score:** **${report.confidenceScore}%**

---

## 1. Executive Summary
${report.summary}

---

## 2. Detailed Technical Diagnosis
${report.detailedDiagnosis}

### Affected vs Healthy Components
- **Affected Endpoints:** ${report.affectedEndpoints.map((e) => `\`${e}\``).join(', ') || 'None'}
- **Healthy Control Endpoints:** ${report.healthyEndpoints.map((e) => `\`${e}\``).join(', ') || 'None'}

---

## 3. Evidence-Backed Telemetry

| Category | Telemetry Findings |
| :--- | :--- |
| **Health Probe** | ${report.evidence.healthProbe} |
| **Metrics** | ${report.evidence.metrics} |
| **Deployments** | ${report.evidence.deployments} |
| **Logs & Traces** | \`${report.evidence.logs.replace(/\n/g, ' ')}\` |

---

## 4. Diagnostic Timeline
${report.timeline.map((t) => `- **${t.step}**: ${t.observation}`).join('\n')}

---

## 5. Remediation Plan
- **Immediate Mitigation:** ${report.remediation.immediateAction}
- **Remediation Action Type:** \`${report.remediation.recommendedRemediationType}\`
- **Permanent Solution:** ${report.remediation.longTermFix}
- **Auto-Remediate Capable:** ${report.remediation.canAutoRemediate ? 'Yes' : 'No'}
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}
