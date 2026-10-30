import { config } from '../config.js';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  endpoint?: string;
  statusCode?: number;
  message: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
}

export interface GetLogsOptions {
  level?: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  endpoint?: string;
  limit?: number;
  sinceSeconds?: number;
}

export interface LogsResult {
  statusCode: number;
  total?: number;
  returned?: number;
  logs?: LogEntry[];
  error?: string;
}

export async function getDiagnosticLogs(options: GetLogsOptions = {}): Promise<LogsResult> {
  const query = new URLSearchParams();
  if (options.level) query.append('level', options.level);
  if (options.endpoint) query.append('endpoint', options.endpoint);
  if (options.limit) query.append('limit', options.limit.toString());
  if (options.sinceSeconds) query.append('since_seconds', options.sinceSeconds.toString());

  const url = `${config.targetServiceUrl}/api/logs?${query.toString()}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return { statusCode: res.status, error: `Logs endpoint returned HTTP ${res.status}` };
    }
    const json = (await res.json()) as any;
    return {
      statusCode: res.status,
      total: json.total,
      returned: json.returned,
      logs: json.logs,
    };
  } catch (err: any) {
    return {
      statusCode: 0,
      error: `Failed to fetch logs from ${url}: ${err.message}`,
    };
  }
}

export const getDiagnosticLogsDeclaration = {
  type: 'function',
  name: 'get_diagnostic_logs',
  description:
    'Retrieves application logs with optional filtering by severity level (ERROR, WARN, INFO), endpoint, or recency. Returns stack traces and error details.',
  parameters: {
    type: 'object',
    properties: {
      level: {
        type: 'string',
        enum: ['INFO', 'WARN', 'ERROR', 'FATAL'],
        description:
          'Filter logs by severity level. Strongly recommend starting with ERROR to extract stack traces.',
      },
      endpoint: {
        type: 'string',
        description: 'Filter logs by specific endpoint path (e.g. /api/orders)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of log entries to retrieve (default: 20, max: 100)',
      },
      sinceSeconds: {
        type: 'number',
        description: 'Retrieve logs only from the last N seconds (e.g. 300 for last 5 minutes)',
      },
    },
    required: [],
  },
};
