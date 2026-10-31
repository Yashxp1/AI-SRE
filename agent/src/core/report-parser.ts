import { IncidentReportSchema } from '../schemas/report.js';
import type { IncidentReport } from '../schemas/report.js';

export function parseIncidentReport(text: string, incidentId: string): IncidentReport | null {
  try {
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return null;

    const report = JSON.parse(json);
    report.incidentId ??= incidentId;
    report.detectedAt ??= new Date().toISOString();
    const parsed = IncidentReportSchema.safeParse(report);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
