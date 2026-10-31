import { runHeuristicInvestigation } from '../../heuristics.js';
import { parseIncidentReport } from '../../report-parser.js';
import type { SREAgentState } from '../state.js';

/** Validates the model's report, with deterministic evidence synthesis as a safe fallback. */
export async function synthesizeNode(state: SREAgentState) {
  const report = parseIncidentReport(state.outputText, state.incidentId);
  if (report) return { finalReport: report };

  console.warn(
    'LLM response was not a valid IncidentReport; using deterministic evidence synthesis.'
  );
  return { finalReport: await runHeuristicInvestigation(state.incidentId) };
}
