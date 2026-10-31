import { config } from '../../config.js';
import type { SREAgentState } from './state.js';

export function routeAfterInvestigation(state: SREAgentState): 'tools' | 'synthesize' {
  return state.pendingToolCalls.length > 0 && state.turnCount < config.maxInvestigationTurns
    ? 'tools'
    : 'synthesize';
}
