import { config } from '../config.js';

/** Fetches target-service telemetry without letting a stalled dependency hang an investigation. */
export async function fetchTarget(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function requestErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return `Request timed out after ${config.requestTimeoutMs}ms`;
  }
  return error instanceof Error ? error.message : 'Unknown request failure';
}
