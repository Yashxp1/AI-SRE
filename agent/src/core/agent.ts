import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { allLangChainTools } from '../tools/index.js';
import { compileSREGraph } from './graph/graph.js';
import { SREAgentAnnotation } from './graph/state.js';
import type { SREAgentState } from './graph/state.js';
import { runHeuristicInvestigation } from './heuristics.js';
import type { IncidentReport } from '../schemas/report.js';

export { SREAgentAnnotation };
export type { SREAgentState as SREAgentStateType };

export interface InvestigationOptions {
  incidentId?: string;
  alertMessage?: string;
  forceHeuristics?: boolean;
}

/**
 * Public entry point for callers. LangGraph state, routing, and nodes live in ./graph.
 */
export class SREAgent {
  private graph: ReturnType<typeof compileSREGraph> | null = null;

  constructor() {
    if (config.geminiApiKey) {
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const toolsByName = new Map(allLangChainTools.map((tool) => [tool.name, tool]));
      this.graph = compileSREGraph(ai, toolsByName);
    }
  }

  public async investigate(options: InvestigationOptions = {}): Promise<IncidentReport> {
    const incidentId = options.incidentId || `INC-${Date.now().toString().slice(-4)}`;
    const alertMessage =
      options.alertMessage ||
      'CRITICAL ALERT: Target microservice reports elevated 500 error rates or degradation.';

    if (!this.graph || options.forceHeuristics) {
      return runHeuristicInvestigation(incidentId);
    }

    try {
      const result = await this.graph.invoke({
        incidentId,
        alert: alertMessage,
        turnCount: 0,
        previousInteractionId: null,
        pendingToolCalls: [],
        toolResults: [],
        outputText: '',
        finalReport: null,
      });
      return result.finalReport || (await runHeuristicInvestigation(incidentId));
    } catch (error) {
      console.warn(
        `LangGraph investigation failed (${error instanceof Error ? error.message : 'unknown error'}); using deterministic evidence synthesis.`
      );
      return runHeuristicInvestigation(incidentId);
    }
  }
}

export const agent = new SREAgent();
