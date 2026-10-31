import { config } from '../config.js';
import { fetchTarget, requestErrorMessage } from './http.js';

export interface HealthCheckResult {
  status: string;
  statusCode: number;
  checks?: Record<string, string>;
  service?: string;
  version?: string;
  uptime_seconds?: number;
  error?: string;
}

export async function checkHealth(): Promise<HealthCheckResult> {
  const url = `${config.targetServiceUrl}/health`;
  try {
    const res = await fetchTarget(url, { headers: { Accept: 'application/json' } });
    const json = (await res.json()) as any;
    return {
      status: json.status || (res.status === 200 ? 'healthy' : 'unhealthy'),
      statusCode: res.status,
      checks: json.checks,
      service: json.service,
      version: json.version,
      uptime_seconds: json.uptime_seconds,
      error: json.error,
    };
  } catch (err: any) {
    return {
      status: 'unreachable',
      statusCode: 0,
      error: `Failed to connect to health probe at ${url}: ${requestErrorMessage(err)}`,
    };
  }
}

export const checkHealthDeclaration = {
  type: 'function',
  name: 'check_health',
  description:
    'Queries the target service /health endpoint to verify overall status and subsystem checks (database, cache, disk).',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};
