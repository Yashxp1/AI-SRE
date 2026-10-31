import { Annotation } from '@langchain/langgraph';
import type { Interactions } from '@google/genai';
import type { IncidentReport } from '../../schemas/report.js';

export interface PendingToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** The shared state that flows through every LangGraph node. */
export const SREAgentAnnotation = Annotation.Root({
  incidentId: Annotation<string>({ reducer: (_, update) => update, default: () => '' }),
  alert: Annotation<string>({ reducer: (_, update) => update, default: () => '' }),
  turnCount: Annotation<number>({ reducer: (_, update) => update, default: () => 0 }),
  previousInteractionId: Annotation<string | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  pendingToolCalls: Annotation<PendingToolCall[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  toolResults: Annotation<Interactions.Step[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  outputText: Annotation<string>({ reducer: (_, update) => update, default: () => '' }),
  finalReport: Annotation<IncidentReport | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

export type SREAgentState = typeof SREAgentAnnotation.State;
