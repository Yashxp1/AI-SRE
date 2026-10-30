import { Router, Request, Response } from 'express';
import { systemState } from '../state.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  const incident = systemState.getIncident();
  const uptimeSeconds = Math.floor(process.uptime());

  if (incident.activeIncident === 'service_unavailable') {
    logger.append('ERROR', 'Health check probe FAILED: downstream services unreachable', {
      endpoint: '/health',
      statusCode: 503,
      stackTrace:
        'Error: ServiceUnavailable\n    at checkHealth (/app/src/routes/health.ts:22:15)\n    at Layer.handle [as handle_request] (express/lib/router/layer.js:95:5)',
    });

    return res.status(503).json({
      status: 'unhealthy',
      service: config.serviceName,
      version: config.serviceVersion,
      uptime_seconds: uptimeSeconds,
      timestamp: new Date().toISOString(),
      checks: {
        database: 'DOWN',
        api_gateway: 'UNREACHABLE',
        cache: 'DEGRADED',
        disk: 'UP',
      },
      error: 'Critical dependencies are down: health check probes failed on 2 subsystem targets',
    });
  }

  if (incident.activeIncident === 'database_failure') {
    return res.status(503).json({
      status: 'degraded',
      service: config.serviceName,
      version: config.serviceVersion,
      uptime_seconds: uptimeSeconds,
      timestamp: new Date().toISOString(),
      checks: {
        database: 'TIMEOUT: connection to db-primary.internal:5432 timed out after 5000ms',
        cache: 'UP',
        disk: 'UP',
      },
      error: 'Database connection pool timed out',
    });
  }

  return res.status(200).json({
    status: 'healthy',
    service: config.serviceName,
    version: config.serviceVersion,
    uptime_seconds: uptimeSeconds,
    timestamp: new Date().toISOString(),
    checks: {
      database: 'UP',
      cache: 'UP',
      disk: 'UP',
    },
  });
});
