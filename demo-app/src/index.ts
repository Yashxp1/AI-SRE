import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { requestTrackerMiddleware } from './middleware/tracker.js';
import { adminAuthMiddleware } from './middleware/auth.js';
import { healthRouter } from './routes/health.js';
import { usersRouter } from './routes/users.js';
import { ordersRouter } from './routes/orders.js';
import { logsRouter } from './routes/logs.js';
import { metricsRouter } from './routes/metrics.js';
import { deploymentsRouter } from './routes/deployments.js';
import { adminRouter } from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(requestTrackerMiddleware);

// Static Web Dashboard
const staticDir = path.join(__dirname, 'static');
app.use(express.static(staticDir));
app.get('/', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Demo Service Endpoints (Image 3 specification)
app.use('/health', healthRouter);
app.use('/api/users', usersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/logs', logsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/deployments', deploymentsRouter);

// Protected Admin Incident Injection Endpoints
app.use('/admin', adminAuthMiddleware, adminRouter);

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.path}`,
    available_endpoints: [
      'GET /health',
      'GET /api/users',
      'GET /api/orders',
      'GET /api/logs',
      'GET /api/metrics',
      'GET /api/deployments',
      'POST /admin/incidents/:type',
      'POST /admin/reset'
    ]
  });
});

const server = app.listen(config.port, () => {
  console.log(`\n======================================================`);
  console.log(` AI-SRE Demo Target Service running on http://localhost:${config.port}`);
  console.log(` Environment: ${config.environment} | Version: ${config.serviceVersion}`);
  console.log(` Visual SRE Dashboard: http://localhost:${config.port}/`);
  console.log(` Admin API Key: ${config.adminApiKey}`);
  console.log(`======================================================\n`);
});

process.on('SIGINT', () => {
  console.log('\nGracefully shutting down AI-SRE Demo Service...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\nGracefully shutting down AI-SRE Demo Service...');
  server.close(() => process.exit(0));
});

export default app;

