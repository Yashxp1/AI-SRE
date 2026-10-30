import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerKey = req.headers['x-admin-key'];
  const queryKey = req.query.admin_key;
  const providedKey =
    (Array.isArray(headerKey) ? headerKey[0] : headerKey) ||
    (typeof queryKey === 'string' ? queryKey : null);

  // 1. Check exact API key match
  if (providedKey === config.adminApiKey) {
    return next();
  }

  // 2. Allow local demo environment access if enabled
  if (config.allowLocalAdmin) {
    const ip = req.ip || req.socket.remoteAddress || '';
    console.log('ip--->', ip);
    const isLocal =
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip === '::ffff:127.0.0.1' ||
      ip.includes('localhost') ||
      req.hostname === 'localhost';

    if (isLocal) {
      return next();
    }
  }

  res.status(401).json({
    error: 'Unauthorized',
    message:
      'Admin endpoints are protected. Provide header "x-admin-key: <ADMIN_API_KEY>" or ?admin_key query parameter.',
  });
}
