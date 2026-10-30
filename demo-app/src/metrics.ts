import { systemState } from './state.js';
import { config } from './config.js';

export interface EndpointMetric {
  total: number;
  success: number;
  clientErrors: number;
  serverErrors: number;
  latencies: number[];
}

export interface MetricSnapshot {
  timestamp: string;
  service: string;
  version: string;
  active_incident: string;
  requests: {
    total: number;
    success_2xx: number;
    client_error_4xx: number;
    server_error_5xx: number;
    error_rate_percentage: number;
  };
  latency_ms: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  resources: {
    memory_usage_mb: number;
    memory_limit_mb: number;
    memory_percentage: number;
    cpu_percentage: number;
  };
  endpoints: Record<
    string,
    {
      total: number;
      errors: number;
      avg_latency_ms: number;
    }
  >;
}

class MetricsCollector {
  private totalRequests = 0;
  private success2xx = 0;
  private clientError4xx = 0;
  private serverError5xx = 0;
  private latencies: number[] = [];
  private readonly maxLatenciesWindow = 500;
  private endpointStats: Map<string, EndpointMetric> = new Map();

  constructor() {
    this.seedInitialMetrics();
  }

  public recordRequest(endpoint: string, statusCode: number, latencyMs: number): void {
    this.totalRequests++;

    if (statusCode >= 200 && statusCode < 400) {
      this.success2xx++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.clientError4xx++;
    } else if (statusCode >= 500) {
      this.serverError5xx++;
    }

    this.latencies.push(latencyMs);
    if (this.latencies.length > this.maxLatenciesWindow) {
      this.latencies.shift();
    }

    let ep = this.endpointStats.get(endpoint);
    if (!ep) {
      ep = {
        total: 0,
        success: 0,
        clientErrors: 0,
        serverErrors: 0,
        latencies: [],
      };
      this.endpointStats.set(endpoint, ep);
    }
    ep.total++;
    if (statusCode >= 200 && statusCode < 400) ep.success++;
    else if (statusCode >= 400 && statusCode < 500) ep.clientErrors++;
    else if (statusCode >= 500) ep.serverErrors++;

    ep.latencies.push(latencyMs);
    if (ep.latencies.length > 100) ep.latencies.shift();
  }

  public getSnapshot(): MetricSnapshot {
    const incident = systemState.getIncident();
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const count = sorted.length;

    const percentile = (p: number): number => {
      if (count === 0) return 0;
      const index = Math.min(Math.floor((p / 100) * count), count - 1);
      return Math.round(sorted[index] * 10) / 10;
    };

    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    const min = count > 0 ? Math.round(sorted[0] * 10) / 10 : 0;
    const max = count > 0 ? Math.round(sorted[count - 1] * 10) / 10 : 0;

    const errorCount = this.clientError4xx + this.serverError5xx;
    const errorRate =
      this.totalRequests > 0 ? Math.round((errorCount / this.totalRequests) * 10000) / 100 : 0.0;

    // Resource calculations: simulate memory pressure when active
    let memoryUsageMb = 135.2; // nominal baseline
    let cpuPercent = 14.2;

    if (incident.activeIncident === 'memory_pressure') {
      memoryUsageMb = 485.6; // 94.8% of 512MB
      cpuPercent = 84.5;
    } else if (incident.activeIncident === 'high_latency') {
      cpuPercent = 42.1;
    }

    const memoryLimitMb = config.cgroupMemoryLimitMb;
    const memoryPercent = Math.round((memoryUsageMb / memoryLimitMb) * 1000) / 10;

    const epBreakdown: Record<string, { total: number; errors: number; avg_latency_ms: number }> =
      {};
    for (const [name, stats] of this.endpointStats.entries()) {
      const epAvg =
        stats.latencies.length > 0
          ? Math.round((stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length) * 10) /
            10
          : 0;
      epBreakdown[name] = {
        total: stats.total,
        errors: stats.clientErrors + stats.serverErrors,
        avg_latency_ms: epAvg,
      };
    }

    // Determine reported version (in bad_deployment incident, report bad version)
    const currentVersion =
      incident.activeIncident === 'bad_deployment'
        ? (incident.details.badVersion as string) || 'v2.4.2-buggy'
        : config.serviceVersion;

    return {
      timestamp: new Date().toISOString(),
      service: config.serviceName,
      version: currentVersion,
      active_incident: incident.activeIncident,
      requests: {
        total: this.totalRequests,
        success_2xx: this.success2xx,
        client_error_4xx: this.clientError4xx,
        server_error_5xx: this.serverError5xx,
        error_rate_percentage: errorRate,
      },
      latency_ms: {
        avg,
        min,
        max,
        p50: percentile(50),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99),
      },
      resources: {
        memory_usage_mb: memoryUsageMb,
        memory_limit_mb: memoryLimitMb,
        memory_percentage: memoryPercent,
        cpu_percentage: cpuPercent,
      },
      endpoints: epBreakdown,
    };
  }

  public reset(): void {
    this.totalRequests = 0;
    this.success2xx = 0;
    this.clientError4xx = 0;
    this.serverError5xx = 0;
    this.latencies = [];
    this.endpointStats.clear();
    this.seedInitialMetrics();
  }

  private seedInitialMetrics(): void {
    // Seed baseline healthy requests
    const initialSamples = [12, 15, 18, 22, 25, 28, 32, 35, 40, 48, 55, 62];
    for (const lat of initialSamples) {
      this.recordRequest('/health', 200, lat);
      this.recordRequest('/api/users', 200, lat + 8);
      this.recordRequest('/api/orders', 200, lat + 14);
    }
  }
}

export const metricsCollector = new MetricsCollector();
