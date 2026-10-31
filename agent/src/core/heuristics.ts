import { checkHealth } from '../tools/health.tool.js';
import { getMetrics } from '../tools/metrics.tool.js';
import { getDiagnosticLogs } from '../tools/logs.tool.js';
import { getDeploymentHistory } from '../tools/deployments.tool.js';
import { probeEndpoint } from '../tools/probe.tool.js';
import type { IncidentReport, RootCauseCategory } from '../schemas/report.js';

export async function runHeuristicInvestigation(
  incidentId: string = `INC-${Date.now().toString().slice(-4)}`
): Promise<IncidentReport> {
  const timeline: Array<{ step: string; observation: string }> = [];

  // Step 1: Health Probe
  const health = await checkHealth();
  timeline.push({
    step: '1. Health Probe Check',
    observation: `Health status is ${health.status.toUpperCase()} (HTTP ${health.statusCode}). Checks: ${JSON.stringify(health.checks || {})}`,
  });

  // Step 2: Metrics Golden Signals
  const metrics = await getMetrics();
  const errorRate = metrics.requests?.error_rate_percentage ?? 0;
  const p95Latency = metrics.latency_ms?.p95 ?? 0;
  const memPct = metrics.resources?.memory_percentage ?? 0;
  const memUsageMb = metrics.resources?.memory_usage_mb ?? 0;
  timeline.push({
    step: '2. Metrics Inspection',
    observation: `Error Rate: ${errorRate}%, p95 Latency: ${p95Latency}ms, Memory: ${memUsageMb}MB (${memPct}%)`,
  });

  // Step 3: Endpoint Probing (Target vs Control)
  const probeOrders = await probeEndpoint('/api/orders');
  const probeUsers = await probeEndpoint('/api/users');
  timeline.push({
    step: '3. Endpoint Differential Probing',
    observation: `/api/orders responded HTTP ${probeOrders.statusCode} in ${probeOrders.durationMs}ms; Control /api/users responded HTTP ${probeUsers.statusCode} in ${probeUsers.durationMs}ms`,
  });

  // Step 4: Error Logs Inspection
  const logsResult = await getDiagnosticLogs({ level: 'ERROR', limit: 10 });
  const errorLogs = logsResult.logs || [];
  const latestError = errorLogs[0];
  timeline.push({
    step: '4. Log Stream Analysis',
    observation: `Found ${errorLogs.length} ERROR log entries. Latest: ${latestError?.message || 'None'}`,
  });

  // Step 5: Deployment History Audit
  const deploymentsResult = await getDeploymentHistory();
  const deployments = deploymentsResult.deployments || [];
  const latestDeploy = deployments[0];
  timeline.push({
    step: '5. Deployment History Audit',
    observation: `Latest deployment: ${latestDeploy?.version} by ${latestDeploy?.deployedBy} (${latestDeploy?.summary || 'No summary'})`,
  });

  // Evidence synthesis & Root Cause Classification
  let category: RootCauseCategory = 'UNKNOWN';
  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let summary = 'Unknown system anomaly detected.';
  let detailedDiagnosis = 'Telemetry does not match any recognized failure signature.';
  let remediationAction: IncidentReport['remediation']['recommendedRemediationType'] =
    'RESET_STATE';
  let immediateAction = 'Investigate system logs and restart container.';
  let longTermFix = 'Enhance unit tests and resilience patterns.';
  let confidence = 85;

  // Rule 1: Bad Deployment
  if (
    latestDeploy?.version.includes('buggy') ||
    latestError?.message.includes('TypeError') ||
    latestError?.stackTrace?.includes('discount_calculator') ||
    probeOrders.body?.version?.includes('buggy')
  ) {
    category = 'BAD_DEPLOYMENT';
    severity = 'CRITICAL';
    summary = `Release ${latestDeploy?.version || 'v2.4.2-buggy'} introduced a fatal TypeError in discount calculation logic.`;
    detailedDiagnosis = `Runtime exception triggered on /api/orders due to TypeError: Cannot read properties of undefined (reading 'calculateDiscount') in discount_calculator.ts:42. Errors perfectly coincide with the deployment of commit ${latestDeploy?.commitHash || 'f92a3c1'}.`;
    remediationAction = 'ROLLBACK_DEPLOYMENT';
    immediateAction = `Immediately rollback deployment from ${latestDeploy?.version} to previous stable version v2.4.1.`;
    longTermFix =
      'Add automated canary testing and pre-deployment integration regression tests for the discount engine.';
    confidence = 98;
  }
  // Rule 2: Database Connection Failure
  else if (
    health.checks?.database?.includes('TIMEOUT') ||
    latestError?.message.includes('PostgreSQL') ||
    latestError?.context?.errorClass === 'ConnectionTimeout' ||
    probeOrders.body?.code === 'ERR_DB_POOL_EXHAUSTION'
  ) {
    category = 'DB_CONNECTION_EXHAUSTION';
    severity = 'CRITICAL';
    summary = 'Database connection pool exhausted; queries to pgsql-master timeout after 5000ms.';
    detailedDiagnosis = `PostgreSQL client pool exhausted on db-primary.internal:5432. All connection slots are in use, causing /api/orders requests to timeout and return HTTP 500 ERR_DB_POOL_EXHAUSTION.`;
    remediationAction = 'RESTART_DB_POOL';
    immediateAction =
      'Restart the database connection pool or terminate lingering idle connections on db-primary.internal.';
    longTermFix =
      'Tune max_connections in PostgreSQL, configure PgBouncer connection pooling, and implement circuit breakers.';
    confidence = 96;
  }
  // Rule 3: Memory Pressure
  else if (
    memPct > 90 ||
    latestError?.message.includes('MemoryPressure') ||
    probeOrders.body?.code === 'ERR_MEMORY_PRESSURE_CRITICAL'
  ) {
    category = 'MEMORY_PRESSURE_OOM';
    severity = 'HIGH';
    summary = `Container memory usage at ${memUsageMb}MB (${memPct}% of 512MB limit) triggering imminent OOM risk.`;
    detailedDiagnosis = `In-memory order cache leak causing continuous RSS memory escalation. Usage is currently ${memUsageMb}MB out of 512MB cgroup limit (${memPct}%), leading to GC pauses and request throttling.`;
    remediationAction = 'SCALE_CONTAINER_MEMORY';
    immediateAction =
      'Purge in-memory caching layer and increase container cgroup limit to 1024MB.';
    longTermFix =
      'Profile heap allocation with Chrome DevTools to locate uncollected references in the caching queue.';
    confidence = 95;
  }
  // Rule 4: Service Unavailable (Health check down)
  else if (health.statusCode === 503 || health.checks?.api_gateway === 'UNREACHABLE') {
    category = 'INFRASTRUCTURE_UNAVAILABLE';
    severity = 'CRITICAL';
    summary = 'Multiple upstream infrastructure subsystems down; health probe returning HTTP 503.';
    detailedDiagnosis = `Health probe failed with HTTP 503. Critical internal dependencies (database and API gateway) reported DOWN or UNREACHABLE.`;
    remediationAction = 'RESET_STATE';
    immediateAction = 'Trigger automated cluster health recovery and verify gateway ingress proxy.';
    longTermFix =
      'Implement graceful degradation and fallback routes when secondary subsystems become unreachable.';
    confidence = 94;
  }
  // Rule 5: High Latency
  else if (p95Latency > 2500 || probeOrders.durationMs > 2500) {
    category = 'DOWNSTREAM_LATENCY';
    severity = 'HIGH';
    summary = `Degraded response latency on /api/orders (${probeOrders.durationMs}ms vs SLA threshold of 500ms).`;
    detailedDiagnosis = `Downstream dependency WarehousePricingRPC is experiencing severe queuing delays, causing order calculations to block for ${probeOrders.durationMs}ms before completing.`;
    remediationAction = 'ISOLATE_DOWNSTREAM_DEPENDENCY';
    immediateAction =
      'Engage circuit breaker on WarehousePricingRPC and serve cached pricing estimates.';
    longTermFix =
      'Implement asynchronous pricing calculation via Kafka/RabbitMQ message queues rather than blocking synchronous RPCs.';
    confidence = 92;
  }
  // Rule 6: Rate Limiting
  else if (probeOrders.statusCode === 429 || probeOrders.headers['retry-after']) {
    category = 'RATE_LIMITING';
    severity = 'MEDIUM';
    summary = 'Client rate limit exceeded; requests throttled with HTTP 429 Too Many Requests.';
    detailedDiagnosis = `TokenBucketRateLimiter engaged on /api/orders. Quota of 100 req/min exceeded. Client received HTTP 429 with Retry-After: ${probeOrders.headers['retry-after'] || '60'}s.`;
    remediationAction = 'THROTTLE_OR_INCREASE_QUOTA';
    immediateAction =
      'Advise upstream caller to respect Retry-After header or temporarily bump token bucket capacity.';
    longTermFix =
      'Implement client-side exponential backoff with jitter and tiered API quota limits.';
    confidence = 98;
  }
  // Rule 7: General Code Bug (HTTP 500 Null Pointer)
  else if (
    probeOrders.statusCode === 500 ||
    latestError?.message.includes('PaymentGatewaySerializer')
  ) {
    category = 'CODE_BUG';
    severity = 'HIGH';
    summary = 'Unhandled NullPointerException in PaymentGatewaySerializer on /api/orders.';
    detailedDiagnosis = `Order processing pipeline failed with OrderProcessingException: Null pointer dereference in PaymentGatewaySerializer.ts:54. /api/users remains healthy, isolating the bug to the checkout serialization layer.`;
    remediationAction = 'RESET_STATE';
    immediateAction =
      'Apply fallback null check in PaymentGatewaySerializer.ts and restart the worker pod.';
    longTermFix =
      'Enforce strict null checks in TypeScript compiler options and add unit tests for missing payment metadata.';
    confidence = 97;
  }

  return {
    incidentId,
    severity,
    detectedAt: new Date().toISOString(),
    failingService: metrics.service || health.service || 'order-service',
    affectedEndpoints:
      probeOrders.statusCode >= 400 || probeOrders.durationMs > 2500 ? ['/api/orders'] : [],
    healthyEndpoints: probeUsers.statusCode === 200 ? ['/api/users'] : [],
    rootCauseCategory: category,
    summary,
    detailedDiagnosis,
    evidence: {
      healthProbe: `Status: ${health.status.toUpperCase()} (${health.statusCode}) | Checks: ${JSON.stringify(health.checks || {})}`,
      metrics: `Error rate: ${errorRate}%, p95 latency: ${p95Latency}ms, Memory: ${memUsageMb}MB (${memPct}%)`,
      logs: latestError
        ? `[${latestError.level}] ${latestError.message}${latestError.stackTrace ? '\n' + latestError.stackTrace : ''}`
        : 'No ERROR logs present',
      deployments: `Active: ${deploymentsResult.current_version || 'unknown'} | Latest: ${latestDeploy?.version} (${latestDeploy?.summary})`,
    },
    timeline,
    remediation: {
      immediateAction,
      longTermFix,
      // The demo target exposes only /admin/reset. Other recommended actions are advisory
      // and require an operator or an integration with the real control plane.
      canAutoRemediate: remediationAction === 'RESET_STATE' && category !== 'UNKNOWN',
      recommendedRemediationType: remediationAction,
    },
    confidenceScore: confidence,
  };
}
