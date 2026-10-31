import { config } from '../config.js';
import { fetchTarget, requestErrorMessage } from './http.js';

const SAFE_PROBE_PATHS = new Set(['/health', '/api/orders', '/api/users']);

export interface EndpointProbeResult {
  endpoint: string;
  statusCode: number;
  durationMs: number;
  headers: Record<string, string>;
  body: any;
  error?: string;
}

export async function probeEndpoint(endpoint: string): Promise<EndpointProbeResult> {
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (!SAFE_PROBE_PATHS.has(normalizedPath)) {
    return {
      endpoint: normalizedPath,
      statusCode: 0,
      durationMs: 0,
      headers: {},
      body: null,
      error: `Endpoint is not in the diagnostic probe allowlist: ${normalizedPath}`,
    };
  }

  const url = `${config.targetServiceUrl}${normalizedPath}`;
  const start = performance.now();

  try {
    const res = await fetchTarget(url, { headers: { Accept: 'application/json' } });
    const durationMs = Math.round(performance.now() - start);

    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    let body: any;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }

    return {
      endpoint: normalizedPath,
      statusCode: res.status,
      durationMs,
      headers,
      body,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    return {
      endpoint: normalizedPath,
      statusCode: 0,
      durationMs,
      headers: {},
      body: null,
      error: `Probe failed to ${url}: ${requestErrorMessage(err)}`,
    };
  }
}

export const probeEndpointDeclaration = {
  type: 'function',
  name: 'probe_endpoint',
  description:
    'Sends a direct synthetic HTTP GET request to a specific endpoint (e.g. /api/orders, /api/users, /health) to inspect the live status code, response time, response headers (e.g. Retry-After), and error response payload.',
  parameters: {
    type: 'object',
    properties: {
      endpoint: {
        type: 'string',
        description: 'The endpoint path to probe, e.g. "/api/orders" or "/api/users"',
      },
    },
    required: ['endpoint'],
  },
};
