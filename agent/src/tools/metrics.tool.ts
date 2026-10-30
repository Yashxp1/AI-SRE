import { config } from '../config.js';

export interface ServiceMetricsResult {
  statusCode: number;
  service?: string;
  version?: string;
  activeIncident?: string;
  requests?: {
    total: number;
    success_2xx: number;
    client_error_4xx: number;
    server_error_5xx: number;
    error_rate_percentage: number;
  };
  latency_ms?: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    avg: number;
  };
  resources?: {
    memory_usage_mb: number;
    memory_limit_mb: number;
    memory_percentage: number;
    cpu_percentage: number;
  };
  endpoints?: Record<string, { total: number; errors: number; avg_latency_ms: number }>;
  error?: string;
}

export async function getMetrics(): Promise<ServiceMetricsResult> {
  const url = `${config.targetServiceUrl}/api/metrics`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return {
        statusCode: res.status,
        error: `Metrics endpoint returned HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as any;
    return {
      statusCode: res.status,
      service: json.service,
      version: json.version,
      activeIncident: json.active_incident,
      requests: json.requests,
      latency_ms: json.latency_ms,
      resources: json.resources,
      endpoints: json.endpoints,
    };
  } catch (err: any) {
    return {
      statusCode: 0,
      error: `Failed to fetch telemetry metrics from ${url}: ${err.message}`,
    };
  }
}

export const getMetricsDeclaration = {
  type: 'function',
  name: 'get_metrics',
  description:
    'Fetches Prometheus-style golden signals: error rate percentage, request volume, p50/p95/p99 latency percentiles, and container memory/CPU resource usage.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};
