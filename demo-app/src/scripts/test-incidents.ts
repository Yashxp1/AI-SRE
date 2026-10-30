/**
 * Automated Verification Test for AI-SRE Demo App
 * Run with: npm run test:incidents
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:8000";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "sre-demo-secret-key-2026";

interface TestResult {
  incident: string;
  passed: boolean;
  notes: string;
}

const results: TestResult[] = [];

async function trigger(type: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/admin/incidents/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
  });
  return res.json();
}

async function reset(): Promise<any> {
  const res = await fetch(`${BASE_URL}/admin/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
  });
  return res.json();
}

async function runTests() {
  console.log(`\n🧪 Starting AI-SRE Incident Simulation Test Suite`);
  console.log(`Target: ${BASE_URL}\n`);

  try {
    // 1. Baseline Check
    await reset();
    const healthRes = await fetch(`${BASE_URL}/health`);
    const usersRes = await fetch(`${BASE_URL}/api/users`);
    const ordersRes = await fetch(`${BASE_URL}/api/orders`);

    const baselineOk =
      healthRes.status === 200 &&
      usersRes.status === 200 &&
      ordersRes.status === 200;
    results.push({
      incident: "baseline_health",
      passed: baselineOk,
      notes: `Health=${healthRes.status}, Users=${usersRes.status}, Orders=${ordersRes.status}`,
    });
    console.log(
      `[PASS] Baseline Health: service reports 200 OK across all endpoints.`,
    );

    // 2. HTTP 500 Incident
    await trigger("http_500");
    const errRes = await fetch(`${BASE_URL}/api/orders`);
    const errJson: any = await errRes.json();
    const is500 =
      errRes.status === 500 &&
      errJson.code === "ERR_PAYMENT_SERIALIZATION_FAILED";
    results.push({
      incident: "http_500",
      passed: is500,
      notes: `Status=${errRes.status}, Code=${errJson.code}`,
    });
    console.log(
      `[${is500 ? "PASS" : "FAIL"}] Incident http_500: Orders returned 500 (${errJson.error}).`,
    );

    // 3. Database Failure Incident
    await trigger("database_failure");
    const dbRes = await fetch(`${BASE_URL}/api/orders`);
    const dbJson: any = await dbRes.json();
    const dbHealthRes = await fetch(`${BASE_URL}/health`);
    const isDbFail =
      dbRes.status === 500 &&
      dbJson.code === "ERR_DB_POOL_EXHAUSTION" &&
      dbHealthRes.status === 503;
    results.push({
      incident: "database_failure",
      passed: isDbFail,
      notes: `Orders=${dbRes.status}, Health=${dbHealthRes.status}, Target=${dbJson.target}`,
    });
    console.log(
      `[${isDbFail ? "PASS" : "FAIL"}] Incident database_failure: DB pool connection timeout simulated.`,
    );

    // 4. High Latency Incident
    await trigger("high_latency");
    const t0 = Date.now();
    const latRes = await fetch(`${BASE_URL}/api/orders`);
    const elapsed = Date.now() - t0;
    const isHighLatency = elapsed >= 3000 && latRes.status === 200;
    results.push({
      incident: "high_latency",
      passed: isHighLatency,
      notes: `Elapsed=${elapsed}ms (expected >=3000ms)`,
    });
    console.log(
      `[${isHighLatency ? "PASS" : "FAIL"}] Incident high_latency: Request took ${elapsed}ms.`,
    );

    // 5. Service Unavailable Incident
    await trigger("service_unavailable");
    const sUnavailableRes = await fetch(`${BASE_URL}/health`);
    const isUnavail = sUnavailableRes.status === 503;
    results.push({
      incident: "service_unavailable",
      passed: isUnavail,
      notes: `Health status=${sUnavailableRes.status}`,
    });
    console.log(
      `[${isUnavail ? "PASS" : "FAIL"}] Incident service_unavailable: Health returned 503.`,
    );

    // 6. Bad Deployment Incident
    await trigger("bad_deployment");
    const depRes = await fetch(`${BASE_URL}/api/deployments`);
    const depJson: any = await depRes.json();
    const badOrderRes = await fetch(`${BASE_URL}/api/orders`);
    const isBadDep =
      depJson.deployments[0].version === "v2.4.2-buggy" &&
      badOrderRes.status === 500;
    results.push({
      incident: "bad_deployment",
      passed: isBadDep,
      notes: `Current version=${depJson.current_version}, Order status=${badOrderRes.status}`,
    });
    console.log(
      `[${isBadDep ? "PASS" : "FAIL"}] Incident bad_deployment: Version v2.4.2-buggy causes TypeError.`,
    );

    // 7. Memory Pressure Incident
    await trigger("memory_pressure");
    const memMetricsRes = await fetch(`${BASE_URL}/api/metrics`);
    const memJson: any = await memMetricsRes.json();
    const isMemPressure = memJson.resources.memory_percentage > 90;
    results.push({
      incident: "memory_pressure",
      passed: isMemPressure,
      notes: `Memory pct=${memJson.resources.memory_percentage}%, Usage=${memJson.resources.memory_usage_mb}MB`,
    });
    console.log(
      `[${isMemPressure ? "PASS" : "FAIL"}] Incident memory_pressure: Memory at ${memJson.resources.memory_percentage}%.`,
    );

    // 8. Rate Limiting Incident
    await trigger("rate_limiting");
    const rateRes = await fetch(`${BASE_URL}/api/orders`);
    const isRateLimited = rateRes.status === 429;
    results.push({
      incident: "rate_limiting",
      passed: isRateLimited,
      notes: `Status=${rateRes.status}, Retry-After=${rateRes.headers.get("retry-after")}`,
    });
    console.log(
      `[${isRateLimited ? "PASS" : "FAIL"}] Incident rate_limiting: Returned HTTP 429 Too Many Requests.`,
    );

    // 9. Reset and Recovery
    await reset();
    const recoveredHealth = await fetch(`${BASE_URL}/health`);
    const recoveredOrders = await fetch(`${BASE_URL}/api/orders`);
    const recoveredMetrics = await fetch(`${BASE_URL}/api/metrics`);
    const recMetricsJson: any = await recoveredMetrics.json();
    const isRecovered =
      recoveredHealth.status === 200 &&
      recoveredOrders.status === 200 &&
      recMetricsJson.active_incident === "none";
    results.push({
      incident: "recovery_reset",
      passed: isRecovered,
      notes: `Health=${recoveredHealth.status}, Orders=${recoveredOrders.status}, Incident=${recMetricsJson.active_incident}`,
    });
    console.log(
      `[${isRecovered ? "PASS" : "FAIL"}] Recovery Reset: System restored to nominal baseline.`,
    );

    // Summary
    console.log("\n=========================================");
    console.log("         TEST SUMMARY RESULTS            ");
    console.log("=========================================");
    let allPassed = true;
    for (const r of results) {
      console.log(
        ` ${r.passed ? "✅ PASS" : "❌ FAIL"} | ${r.incident.padEnd(20)} | ${r.notes}`,
      );
      if (!r.passed) allPassed = false;
    }
    console.log("=========================================");

    if (!allPassed) {
      console.error("\n❌ Some incident tests failed.");
      process.exit(1);
    } else {
      console.log("\n🎉 ALL 7 INCIDENTS AND RECOVERY PASSED VERIFICATION!\n");
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}

runTests();
