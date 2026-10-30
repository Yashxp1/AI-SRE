import { Router, Request, Response } from 'express';
import { metricsCollector } from '../metrics.js';

export const metricsRouter = Router();

metricsRouter.get('/', (req: Request, res: Response) => {
  const snapshot = metricsCollector.getSnapshot();
  res.status(200).json(snapshot);
});
