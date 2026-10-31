import { agent } from '../core/agent.js';
import { config } from '../config.js';
import type { RootCauseCategory } from '../schemas/report.js';

interface TestCase {
  name: string;
  incidentType: string;
  expectedCategory: RootCauseCategory;
  expectedSeverity: string;
  expectedAffectedEndpoint?: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: '1. Null Pointer in Orders Pipeline',
    incidentType: 'http_500',
    expectedCategory: 'CODE_BUG',
    expectedSeverity: 'HIGH',
    expectedAffectedEndpoint: '/api/orders',
  },
  {
    name: '2. PostgreSQL Connection Pool Timeout',
    incidentType: 'database_failure',
    expectedCategory: 'DB_CONNECTION_EXHAUSTION',
    expectedSeverity: 'CRITICAL',
    expectedAffectedEndpoint: '/api/orders',
  },
  {
    name: '3. Downstream Warehouse RPC Latency',
    incidentType: 'high_latency',
    expectedCategory: 'DOWNSTREAM_LATENCY',
    expectedSeverity: 'HIGH',
    expectedAffectedEndpoint: '/api/orders',
  },
  {
    name: '4. Critical Dependency Health Check Failure',
    incidentType: 'service_unavailable',
    expectedCategory: 'INFRASTRUCTURE_UNAVAILABLE',
    expectedSeverity: 'CRITICAL',
  },
  {
    name: '5. Buggy Discount Calculator Release',
    incidentType: 'bad_deployment',
    expectedCategory: 'BAD_DEPLOYMENT',
    expectedSeverity: 'CRITICAL',
    expectedAffectedEndpoint: '/api/orders',
  },
  {
    name: '6. Heap Cache Memory Leak & Pressure',
    incidentType: 'memory_pressure',
    expectedCategory: 'MEMORY_PRESSURE_OOM',
    expectedSeverity: 'HIGH',
    expectedAffectedEndpoint: '/api/orders',
  },
  {
    name: '7. Traffic Spike & Token Bucket Throttling',
    incidentType: 'rate_limiting',
    expectedCategory: 'RATE_LIMITING',
    expectedSeverity: 'MEDIUM',
    expectedAffectedEndpoint: '/api/orders',
  },
];

async function injectIncident(type: string): Promise<void> {
  const res = await fetch(`${config.targetServiceUrl}/admin/incidents/${type}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': config.adminApiKey,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`Failed to inject incident ${type}: HTTP ${res.status}`);
  }
}

async function resetSystem(): Promise<void> {
  const res = await fetch(`${config.targetServiceUrl}/admin/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': config.adminApiKey,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    throw new Error(`Failed to reset target service: HTTP ${res.status}`);
  }
}

async function runBenchmark() {
  console.log(`\n======================================================`);
  console.log(` 🏆 AI-SRE DIAGNOSTIC ACCURACY BENCHMARK`);
  console.log(` Evaluating Agent Against 7 Real-World Incident Scenarios`);
  console.log(` Target Service: ${config.targetServiceUrl}`);
  console.log(`======================================================\n`);

  // Verify target service is reachable
  try {
    const health = await fetch(`${config.targetServiceUrl}/health`);
    if (!health.ok && health.status !== 503) {
      throw new Error(`Health probe returned ${health.status}`);
    }
  } catch (err: any) {
    console.error(`❌ Target demo-app is not reachable at ${config.targetServiceUrl}.`);
    console.error(`   Please start demo-app first: (cd demo-app && npm run dev)`);
    process.exit(1);
  }

  const results: Array<{ test: TestCase; passed: boolean; actualCategory: string; notes: string }> =
    [];

  for (const tc of TEST_CASES) {
    console.log(`\n------------------------------------------------------`);
    console.log(`▶️ Executing Scenario: ${tc.name} [${tc.incidentType}]`);
    console.log(`------------------------------------------------------`);

    // 1. Reset first to guarantee clean baseline
    await resetSystem();

    // 2. Inject failure
    await injectIncident(tc.incidentType);

    // 3. Let Agent autonomously investigate
    const report = await agent.investigate({
      incidentId: `BENCH-${tc.incidentType}`,
      alertMessage: `Alert: Automated detection of degraded behavior matching incident ${tc.incidentType}`,
    });

    // 4. Validate findings
    const categoryMatches = report.rootCauseCategory === tc.expectedCategory;
    const severityMatches = report.severity === tc.expectedSeverity;
    const hasEvidence = Boolean(
      report.evidence.logs || report.evidence.metrics || report.evidence.healthProbe
    );

    const passed = categoryMatches && hasEvidence;
    const notes = passed
      ? `Correctly identified ${report.rootCauseCategory} (Confidence: ${report.confidenceScore}%)`
      : `Mismatch: Expected ${tc.expectedCategory}, got ${report.rootCauseCategory}`;

    results.push({
      test: tc,
      passed,
      actualCategory: report.rootCauseCategory,
      notes,
    });

    console.log(`[Result] ${passed ? '✅ PASSED' : '❌ FAILED'}: ${notes}`);
  }

  // Restore clean state after benchmark
  await resetSystem();

  // Print Final Summary Scorecard
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const accuracyPct = Math.round((passedCount / total) * 100);

  console.log(`\n========================================================================`);
  console.log(`                     BENCHMARK EVALUATION SCORECARD                     `);
  console.log(`========================================================================`);
  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(
      ` ${status} | ${r.test.incidentType.padEnd(22)} | ${r.actualCategory.padEnd(26)} | ${r.notes}`
    );
  }
  console.log(`========================================================================`);
  console.log(` TOTAL SCORE: ${passedCount}/${total} (${accuracyPct}% Diagnostic Accuracy)`);
  console.log(`========================================================================\n`);

  if (passedCount === total) {
    console.log(
      `🎉 100% PERFECT SCORE! All 7 microservice outages accurately diagnosed with supporting telemetry evidence.\n`
    );
  } else {
    process.exit(1);
  }
}

runBenchmark().catch((err) => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
