import { Router, Request, Response } from 'express';
import { logger, LogLevel } from '../logger.js';

export const logsRouter = Router();

logsRouter.get('/', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const level = req.query.level ? (req.query.level as string).toUpperCase() as LogLevel : undefined;
  const endpoint = req.query.endpoint as string | undefined;
  const sinceSeconds = req.query.since_seconds ? parseInt(req.query.since_seconds as string, 10) : undefined;

  const result = logger.query({
    limit,
    level,
    endpoint,
    sinceSeconds
  });

  res.status(200).json({
    total: result.total,
    returned: result.logs.length,
    filters: {
      limit,
      level: level || 'ALL',
      endpoint: endpoint || 'ALL',
      since_seconds: sinceSeconds || 'ALL'
    },
    logs: result.logs
  });
});

