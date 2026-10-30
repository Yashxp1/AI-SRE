import crypto from 'crypto';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  endpoint?: string;
  statusCode?: number;
  message: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
}

export interface LogFilterOptions {
  limit?: number;
  level?: LogLevel;
  endpoint?: string;
  sinceSeconds?: number;
}

class InMemLogBuffer {
  private logs: LogEntry[] = [];
  private readonly maxCapacity = 1000;

  constructor() {
    this.seedInitialLogs();
  }

  public append(
    level: LogLevel,
    message: string,
    options: {
      endpoint?: string;
      statusCode?: number;
      stackTrace?: string;
      context?: Record<string, unknown>;
    } = {}
  ): LogEntry {
    const entry: LogEntry = {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      level,
      service: 'order-service',
      endpoint: options.endpoint,
      statusCode: options.statusCode,
      message,
      stackTrace: options.stackTrace,
      context: options.context
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxCapacity) {
      this.logs.shift();
    }

    // Also output to console for docker logs / stdout inspection
    const colorMap: Record<LogLevel, string> = {
      INFO: '\x1b[36m',
      WARN: '\x1b[33m',
      ERROR: '\x1b[31m',
      FATAL: '\x1b[35m'
    };
    const reset = '\x1b[0m';
    console.log(
      `${colorMap[level]}[${entry.timestamp}] [${level}]${reset} ${options.endpoint ? `[${options.endpoint}]` : ''} ${message}${
        options.stackTrace ? `\n${options.stackTrace}` : ''
      }`
    );

    return entry;
  }

  public query(options: LogFilterOptions = {}): { total: number; logs: LogEntry[] } {
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    let filtered = [...this.logs];

    if (options.level) {
      filtered = filtered.filter(l => l.level === options.level);
    }

    if (options.endpoint) {
      filtered = filtered.filter(l => l.endpoint && l.endpoint.includes(options.endpoint!));
    }

    if (options.sinceSeconds && options.sinceSeconds > 0) {
      const cutoff = Date.now() - options.sinceSeconds * 1000;
      filtered = filtered.filter(l => new Date(l.timestamp).getTime() >= cutoff);
    }

    // Return the latest logs first
    filtered.reverse();
    const paginated = filtered.slice(0, limit);

    return {
      total: filtered.length,
      logs: paginated
    };
  }

  public clear(): void {
    this.logs = [];
    this.append('INFO', 'Log buffer cleared. System diagnostic state reset.');
  }

  private seedInitialLogs(): void {
    const now = Date.now();
    const seedEvents: Array<{ offsetMs: number; level: LogLevel; msg: string; endpoint?: string; status?: number }> = [
      { offsetMs: 300000, level: 'INFO', msg: 'Service order-service v2.4.1 initialized successfully on port 8000' },
      { offsetMs: 280000, level: 'INFO', msg: 'Connected to primary PostgreSQL cluster at pgsql-master.internal:5432 (pool size: 20)' },
      { offsetMs: 250000, level: 'INFO', msg: 'Redis cache pool connected, ping latency 0.8ms' },
      { offsetMs: 210000, level: 'INFO', msg: 'Health probe status: HEALTHY', endpoint: '/health', status: 200 },
      { offsetMs: 180000, level: 'INFO', msg: 'User session verified for user_id=usr_102', endpoint: '/api/users', status: 200 },
      { offsetMs: 120000, level: 'INFO', msg: 'Order ord-9921 processed and persisted to storage', endpoint: '/api/orders', status: 200 },
      { offsetMs: 60000, level: 'INFO', msg: 'Routine health check passed (cpu: 11%, memory: 128MB/512MB)', endpoint: '/health', status: 200 }
    ];

    for (const seed of seedEvents) {
      this.logs.push({
        id: `log-${crypto.randomUUID().slice(0, 8)}`,
        timestamp: new Date(now - seed.offsetMs).toISOString(),
        level: seed.level,
        service: 'order-service',
        endpoint: seed.endpoint,
        statusCode: seed.status,
        message: seed.msg
      });
    }
  }
}

export const logger = new InMemLogBuffer();

