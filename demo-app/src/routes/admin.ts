import { Router, Request, Response } from 'express';
import { systemState, IncidentType } from '../state.js';
import { logger } from '../logger.js';
import { metricsCollector } from '../metrics.js';

export const adminRouter = Router();

const VALID_INCIDENTS: IncidentType[] = [
  'http_500',
  'database_failure',
  'high_latency',
  'service_unavailable',
  'bad_deployment',
  'memory_pressure',
  'rate_limiting'
];

adminRouter.post('/incidents/:type', (req: Request, res: Response) => {
  const typeParam = req.params.type as IncidentType;

  if (!VALID_INCIDENTS.includes(typeParam)) {
    return res.status(400).json({
      error: 'InvalidIncidentType',
      message: `Incident type '${req.params.type}' is not supported. Supported incidents: ${VALID_INCIDENTS.join(', ')}`
    });
  }

  const customDetails = req.body || {};
  const updatedState = systemState.triggerIncident(typeParam, customDetails);

  logger.append('WARN', `ADMIN ACTION: Incident '${typeParam}' activated via /admin/incidents/${typeParam}`, {
    endpoint: `/admin/incidents/${typeParam}`,
    statusCode: 200,
    context: {
      incidentType: typeParam,
      details: updatedState.details
    }
  });

  return res.status(200).json({
    status: 'incident_triggered',
    message: `Incident '${typeParam}' is now ACTIVE. Observe /health, /api/orders, /api/logs, and /api/metrics.`,
    incident: updatedState
  });
});

adminRouter.post('/reset', (req: Request, res: Response) => {
  const previous = systemState.getIncident();
  const resetState = systemState.reset();
  metricsCollector.reset();

  logger.append('INFO', `ADMIN ACTION: Incident '${previous.activeIncident}' CLEARED. System returned to nominal baseline.`, {
    endpoint: '/admin/reset',
    statusCode: 200
  });

  return res.status(200).json({
    status: 'system_restored',
    message: 'System nominal state successfully restored. Incidents cleared and metrics baseline reset.',
    incident: resetState
  });
});

adminRouter.get('/status', (req: Request, res: Response) => {
  res.status(200).json({
    incident: systemState.getIncident(),
    supported_incidents: VALID_INCIDENTS
  });
});

