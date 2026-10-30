export type IncidentType =
  | 'none'
  | 'http_500'
  | 'database_failure'
  | 'high_latency'
  | 'service_unavailable'
  | 'bad_deployment'
  | 'memory_pressure'
  | 'rate_limiting';

export interface IncidentState {
  activeIncident: IncidentType;
  startedAt: string | null;
  details: {
    description?: string;
    failingComponent?: string;
    latencyMs?: number;
    errorRatePercent?: number;
    simulatedMemoryUsageMb?: number;
    badVersion?: string;
    rateLimitQuota?: number;
    [key: string]: unknown;
  };
}

class SystemStateManager {
  private state: IncidentState = {
    activeIncident: 'none',
    startedAt: null,
    details: {},
  };

  public getIncident(): IncidentState {
    return { ...this.state, details: { ...this.state.details } };
  }

  public isIncidentActive(type: IncidentType): boolean {
    return this.state.activeIncident === type;
  }

  public triggerIncident(
    type: IncidentType,
    customDetails: Record<string, unknown> = {}
  ): IncidentState {
    const defaultDetails: Record<IncidentType, Record<string, unknown>> = {
      none: {},
      http_500: {
        description:
          'Orders API returns 500 Internal Server Error due to null pointer in payment gateway serializer',
        failingComponent: 'PaymentGatewaySerializer',
        errorClass: 'OrderProcessingException',
      },
      database_failure: {
        description:
          'PostgreSQL connection timeout: pool exhausted and unable to connect to db.internal:5432 after 5000ms',
        failingComponent: 'PostgreSQL ConnectionPool',
        dbHost: 'db-primary.internal:5432',
        timeoutMs: 5000,
      },
      high_latency: {
        description:
          'Downstream legacy warehouse pricing service degraded; requests take 3500-4500ms',
        failingComponent: 'WarehousePricingRPC',
        latencyMs: 3800,
      },
      service_unavailable: {
        description: 'Healthcheck failing. Critical backend dependencies down, returning HTTP 503',
        failingComponent: 'CoreClusterHealthCheck',
        status: 'DOWN',
      },
      bad_deployment: {
        description: 'Deployment v2.4.2-buggy introduced TypeError in discount calculator engine',
        badVersion: 'v2.4.2-buggy',
        commitHash: 'f92a3c1',
        errorClass: 'TypeError: Cannot read properties of undefined (reading calculateTax)',
      },
      memory_pressure: {
        description:
          'Unbounded in-memory order cache leak; container memory exceeds 94% cgroup limit',
        simulatedMemoryUsageMb: 485.4,
        cgroupLimitMb: 512.0,
        memoryPercent: 94.8,
      },
      rate_limiting: {
        description: 'Token bucket rate limiter engaged; client exceeded quota of 100 req/min',
        failingComponent: 'RateLimiterMiddleware',
        statusCode: 429,
        retryAfterSeconds: 60,
      },
    };

    this.state = {
      activeIncident: type,
      startedAt: new Date().toISOString(),
      details: {
        ...defaultDetails[type],
        ...customDetails,
      },
    };

    return this.getIncident();
  }

  public reset(): IncidentState {
    this.state = {
      activeIncident: 'none',
      startedAt: null,
      details: {},
    };
    return this.getIncident();
  }
}

export const systemState = new SystemStateManager();
