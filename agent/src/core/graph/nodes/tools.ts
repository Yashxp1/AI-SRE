import type { Interactions } from '@google/genai';
import type { SREAgentState } from '../state.js';

interface InvokableTool {
  // Tool schemas differ, so their validated input type is intentionally erased at this graph boundary.
  invoke(input: any): Promise<any>;
}

/** Executes only the diagnostic tools requested by the investigate node. */
export function createToolsNode(toolsByName: Map<string, InvokableTool>) {
  return async (state: SREAgentState) => {
    const results: Interactions.Step[] = [];

    for (const call of state.pendingToolCalls) {
      console.log(`🛠️ [Diagnostic tool] ${call.name}(${JSON.stringify(call.args)})`);
      let result: string;
      try {
        const tool = toolsByName.get(call.name);
        if (!tool) throw new Error(`Tool ${call.name} is not registered`);
        result = await tool.invoke(call.args);
      } catch (error) {
        result = JSON.stringify({
          error: error instanceof Error ? error.message : 'Tool execution failed',
        });
      }

      results.push({
        type: 'function_result',
        name: call.name,
        call_id: call.id,
        result,
      });
    }

    return { pendingToolCalls: [], toolResults: results };
  };
}
