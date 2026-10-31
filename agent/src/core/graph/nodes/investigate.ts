import type { GoogleGenAI } from '@google/genai';
import { config } from '../../../config.js';
import { SRE_TOOL_DECLARATIONS } from '../../../tools/index.js';
import { SRE_SYSTEM_PROMPT } from '../../prompts.js';
import type { SREAgentState } from '../state.js';

/** Calls Gemini and records either its requested diagnostic tools or final text. */
export function createInvestigateNode(ai: GoogleGenAI) {
  return async (state: SREAgentState) => {
    const turn = state.turnCount + 1;
    console.log(
      `🔄 [LangGraph turn ${turn}/${config.maxInvestigationTurns}] Querying ${config.modelName}...`
    );

    const response = state.previousInteractionId
      ? await ai.interactions.create({
          model: config.modelName,
          previous_interaction_id: state.previousInteractionId,
          input: state.toolResults,
        })
      : await ai.interactions.create({
          model: config.modelName,
          input: `${SRE_SYSTEM_PROMPT}\n\nINCIDENT TRIGGER:\nIncident ID: ${state.incidentId}\nAlert: ${state.alert}\nTarget Service URL: ${config.targetServiceUrl}\n\nBegin the investigation using diagnostic tools. When sufficient evidence has been collected, return only the JSON report.`,
          tools: SRE_TOOL_DECLARATIONS as any,
        });

    const pendingToolCalls = (response.steps || [])
      .filter((step) => step.type === 'function_call')
      .map((step) => ({
        id: step.id || `call-${crypto.randomUUID()}`,
        name: step.name || '',
        args: (step.arguments as Record<string, unknown>) || {},
      }));

    return {
      previousInteractionId: response.id,
      pendingToolCalls,
      toolResults: [],
      outputText: response.output_text || '',
      turnCount: turn,
    };
  };
}
