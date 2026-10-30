import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { metricsCollector } from '../metrics.js';
import { logger } from '../logger.js';

export function requestTrackerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime();
  const requestId =
    (req.headers['x-request-id'] as string) || `req-${crypto.randomUUID().slice(0, 8)}`;
  res.setHeader('X-Request-Id', requestId);

  // Hook into response finish event
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const latencyMs = Math.round((diff[0] * 1000 + diff[1] / 1e6) * 100) / 100;
    const path = req.baseUrl + req.path;

    // Record in metrics
    metricsCollector.recordRequest(path, res.statusCode, latencyMs);

    // Record in structured logs (ignore static assets or internal pollers to keep logs clean for SRE investigation)
    const isAsset = path.startsWith('/static') || path.endsWith('.ico') || path === '/favicon.ico';
    if (!isAsset) {
      const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
      logger.append(level, `${req.method} ${path} -> ${res.statusCode} (${latencyMs}ms)`, {
        endpoint: path,
        statusCode: res.statusCode,
        context: {
          requestId,
          method: req.method,
          clientIp: req.ip || req.socket.remoteAddress,
          latencyMs,
        },
      });
    }
  });

  next();
}
