import { END, START, StateGraph } from '@langchain/langgraph';
import type { GoogleGenAI } from '@google/genai';
import { createInvestigateNode } from './nodes/investigate.js';
import { synthesizeNode } from './nodes/synthesize.js';
import { createToolsNode } from './nodes/tools.js';
import { routeAfterInvestigation } from './routing.js';
import { SREAgentAnnotation } from './state.js';

interface InvokableTool {
  invoke(input: any): Promise<any>;
}

export function compileSREGraph(ai: GoogleGenAI, toolsByName: Map<string, InvokableTool>) {
  return new StateGraph(SREAgentAnnotation)
    .addNode('investigate', createInvestigateNode(ai))
    .addNode('tools', createToolsNode(toolsByName))
    .addNode('synthesize', synthesizeNode)
    .addEdge(START, 'investigate')
    .addConditionalEdges('investigate', routeAfterInvestigation)
    .addEdge('tools', 'investigate')
    .addEdge('synthesize', END)
    .compile();
}
