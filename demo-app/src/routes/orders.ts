import { Router, Request, Response } from "express";
import { systemState } from "../state.js";
import { logger } from "../logger.js";

export const ordersRouter = Router();

const SAMPLE_ORDERS = [
  {
    id: "ord-1001",
    userId: "usr_101",
    item: "Cloud SRE Monitoring Suite",
    amount: 249.99,
    status: "completed",
    createdAt: "2026-10-29T18:30:00Z",
  },
  {
    id: "ord-1002",
    userId: "usr_102",
    item: "Dedicated Log Aggregator Node",
    amount: 89.5,
    status: "completed",
    createdAt: "2026-10-29T18:45:00Z",
  },
  {
    id: "ord-1003",
    userId: "usr_103",
    item: "Automated Anomaly Detector",
    amount: 499.0,
    status: "processing",
    createdAt: "2026-10-29T19:00:00Z",
  },
  {
    id: "ord-1004",
    userId: "usr_104",
    item: "Synthetic Traffic Generator Pro",
    amount: 120.0,
    status: "completed",
    createdAt: "2026-10-29T19:15:00Z",
  },
];

ordersRouter.get("/", async (req: Request, res: Response) => {
  const incident = systemState.getIncident();

  // 1. HTTP 500 Incident
  if (incident.activeIncident === "http_500") {
    const errorMsg =
      "Unhandled NullPointerException in PaymentGatewaySerializer";
    const stackTrace = `OrderProcessingException: Null pointer dereference in PaymentGatewaySerializer
    at PaymentGatewaySerializer.serialize (/app/src/services/payment_serializer.ts:54:19)
    at OrderPipeline.execute (/app/src/pipelines/order_pipeline.ts:112:34)
    at async /app/src/routes/orders.ts:25:7`;

    logger.append("ERROR", errorMsg, {
      endpoint: "/api/orders",
      statusCode: 500,
      stackTrace,
      context: {
        errorClass: "OrderProcessingException",
        component: "PaymentGatewaySerializer",
      },
    });

    return res.status(500).json({
      error: "InternalServerError",
      message:
        "Failed to process order pipeline: Null pointer reference in PaymentGatewaySerializer.ts:54",
      code: "ERR_PAYMENT_SERIALIZATION_FAILED",
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Database Failure Incident
  if (incident.activeIncident === "database_failure") {
    const dbHost =
      (incident.details.dbHost as string) || "db-primary.internal:5432";
    const timeoutMs = (incident.details.timeoutMs as number) || 5000;
    const errorMsg = `ConnectionTimeout: Failed to acquire PostgreSQL connection from pool '${dbHost}' after ${timeoutMs}ms`;
    const stackTrace = `ConnectionTimeoutError: Timed out waiting for connection slot from pool 'postgres-primary'
    at ConnectionPool.acquire (/app/node_modules/pg-pool/index.js:312:13)
    at async DatabaseClient.query (/app/src/db/client.ts:88:21)
    at async OrderRepository.listOrders (/app/src/repositories/orders.ts:34:12)`;

    logger.append("ERROR", errorMsg, {
      endpoint: "/api/orders",
      statusCode: 500,
      stackTrace,
      context: { pool: "postgres-primary", target: dbHost, timeoutMs },
    });

    return res.status(500).json({
      error: "DatabaseConnectionTimeout",
      message: `Timed out after ${timeoutMs}ms attempting to acquire connection from pool 'postgres-primary'`,
      target: dbHost,
      code: "ERR_DB_POOL_EXHAUSTION",
      timestamp: new Date().toISOString(),
    });
  }

  // 3. High Latency Incident
  if (incident.activeIncident === "high_latency") {
    const delay = (incident.details.latencyMs as number) || 3600;
    await new Promise((resolve) => setTimeout(resolve, delay));

    logger.append(
      "WARN",
      `HighLatencyWarning: Request to /api/orders took ${delay}ms (SLA threshold: 500ms)`,
      {
        endpoint: "/api/orders",
        statusCode: 200,
        context: { latencyMs: delay, slowDependency: "WarehousePricingRPC" },
      },
    );

    res.setHeader("X-Response-Time-Ms", delay.toString());
    return res.status(200).json({
      warning: "High latency detected on downstream dependency",
      latency_ms: delay,
      total: SAMPLE_ORDERS.length,
      orders: SAMPLE_ORDERS,
    });
  }

  // 4. Bad Deployment Incident
  if (incident.activeIncident === "bad_deployment") {
    const badVersion =
      (incident.details.badVersion as string) || "v2.4.2-buggy";
    const commitHash = (incident.details.commitHash as string) || "f92a3c1";
    const stackTrace = `TypeError: Cannot read properties of undefined (reading 'calculateDiscount')
    at DiscountEngine.applyRule (/app/src/billing/discount_calculator.ts:42:18)
    at OrderProcessor.calculateTotal (/app/src/services/order_processor.ts:77:24)
    at async /app/src/routes/orders.ts:68:5`;

    logger.append(
      "ERROR",
      `TypeError in DiscountEngine: Cannot read properties of undefined (version ${badVersion})`,
      {
        endpoint: "/api/orders",
        statusCode: 500,
        stackTrace,
        context: { deployedVersion: badVersion, commit: commitHash },
      },
    );

    return res.status(500).json({
      error: "TypeError",
      message:
        "Cannot read properties of undefined (reading 'calculateDiscount') in discount_calculator.ts:42",
      version: badVersion,
      commit: commitHash,
      code: "ERR_RUNTIME_EXCEPTION",
      timestamp: new Date().toISOString(),
    });
  }

  // 5. Memory Pressure Incident
  if (incident.activeIncident === "memory_pressure") {
    logger.append(
      "WARN",
      "MemoryPressureWarning: Container memory usage at 485.6MB (94.8% of 512MB limit)",
      {
        endpoint: "/api/orders",
        statusCode: 500,
        stackTrace: `ResourceExhaustionWarning: Heap memory limit approaching critical threshold (94.8%)
    at MemoryWatchdog.checkUsage (/app/src/monitoring/watchdog.ts:31:11)
    at /app/src/routes/orders.ts:82:9`,
        context: { memoryMb: 485.6, limitMb: 512.0, cgroupState: "CRITICAL" },
      },
    );

    return res.status(500).json({
      error: "ResourceExhaustionError",
      message:
        "Container memory limit reached: current usage 485.6MB exceeds 94% threshold of 512MB cgroup limit",
      memory_usage_mb: 485.6,
      memory_limit_mb: 512.0,
      code: "ERR_MEMORY_PRESSURE_CRITICAL",
      timestamp: new Date().toISOString(),
    });
  }

  // 6. Rate Limiting Incident
  if (incident.activeIncident === "rate_limiting") {
    const retryAfter = (incident.details.retryAfterSeconds as number) || 60;
    res.setHeader("Retry-After", retryAfter.toString());
    res.setHeader("X-RateLimit-Limit", "100");
    res.setHeader("X-RateLimit-Remaining", "0");

    logger.append(
      "WARN",
      "Rate limit exceeded: client throttled by TokenBucketRateLimiter",
      {
        endpoint: "/api/orders",
        statusCode: 429,
        context: { quota: "100 req/min", retryAfterSeconds: retryAfter },
      },
    );

    return res.status(429).json({
      error: "TooManyRequests",
      message:
        "Rate limit exceeded: quota of 100 requests per minute has been exhausted for this IP client",
      retry_after_seconds: retryAfter,
      code: "ERR_RATE_LIMIT_EXCEEDED",
      timestamp: new Date().toISOString(),
    });
  }

  // 7. Service Unavailable Incident
  if (incident.activeIncident === "service_unavailable") {
    return res.status(503).json({
      error: "ServiceUnavailable",
      message:
        "Subsystem order-service is currently unavailable due to cluster-level health failure",
      code: "ERR_SERVICE_DOWN",
      timestamp: new Date().toISOString(),
    });
  }

  // Baseline Healthy State
  return res.status(200).json({
    total: SAMPLE_ORDERS.length,
    orders: SAMPLE_ORDERS,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});
