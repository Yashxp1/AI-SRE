# 🚨 AI-SRE Demo Target Service (`order-service`)

> **Pure TypeScript microservice built specifically to test and demonstrate autonomous AI-SRE incident diagnosis agents.**

This service simulates real-world production incidents inside Docker or locally. It exposes rich observability endpoints (`/health`, `/api/logs`, `/api/metrics`, `/api/deployments`) alongside an admin fault-injection plane (`/admin/incidents/:type`) to provide unambiguous, reproducible signals for your AI agent to investigate, correlate, and produce evidence-backed root-cause diagnoses.

---

## 📌 Architecture & Features

- **100% TypeScript (Node.js)**: Modern ESM codebase using Express, strict TypeScript, and zero Python dependencies.
- **7 Reproducible Incident Modes**: Safely simulates HTTP 500s, DB pool timeouts, latency spikes, health failures, bad deployments, memory pressure, and rate limiting.
- **In-Memory Structured Telemetry**:
  - **Circular Log Buffer**: Real-time stack traces, log levels (`INFO`, `WARN`, `ERROR`), request IDs, and query filters (`since_seconds`, `level`, `endpoint`).
  - **Rolling Window Metrics**: Computes request percentiles (`p50`, `p90`, `p95`, `p99`), error rates, endpoint breakdowns, and simulated cgroup memory/CPU usage.
  - **Deployment Audit Trail**: Realistic deployment events allowing the agent to correlate release timestamps with error spikes.
- **Interactive Visual Dashboard**: A Datadog-style dark UI at `http://localhost:8000/` for 1-click incident triggering, response probing, live metric cards, and log streaming.
- **Docker-Ready**: Multi-stage `Dockerfile` and `docker-compose.yml` with cgroup memory limits (512MB) and container healthchecks.

---

## 📋 Endpoints Matrix

### Public & Observability Endpoints

| Endpoint           | Method | Purpose                                              | Typical Nominal Response                                   |
| :----------------- | :----- | :--------------------------------------------------- | :--------------------------------------------------------- |
| `/health`          | `GET`  | Service & dependency healthcheck                     | `200 OK` (checks: database, cache, disk UP)                |
| `/api/users`       | `GET`  | Sample working API (healthy control group)           | `200 OK` (returns list of users)                           |
| `/api/orders`      | `GET`  | Sample business API that experiences failures        | `200 OK` (returns orders)                                  |
| `/api/logs`        | `GET`  | Application log stream with query filters            | `200 OK` (`logs: [...]`, filter by `level`, `limit`, etc.) |
| `/api/metrics`     | `GET`  | Prometheus/SRE metrics (p50/p95, error rate, memory) | `200 OK` (`requests`, `latency_ms`, `resources`)           |
| `/api/deployments` | `GET`  | Deployment history and release metadata              | `200 OK` (`deployments: [...]`)                            |

### Protected Admin Fault-Injection Endpoints

| Endpoint                 | Method | Purpose                                             | Authentication                    |
| :----------------------- | :----- | :-------------------------------------------------- | :-------------------------------- |
| `/admin/incidents/:type` | `POST` | Injects one of the 7 predefined failures            | `X-Admin-Key` header or localhost |
| `/admin/reset`           | `POST` | Restores normal baseline operation & clears metrics | `X-Admin-Key` header or localhost |
| `/admin/status`          | `GET`  | Returns currently active incident state             | `X-Admin-Key` header or localhost |

_Default Admin Key:_ `sre-demo-secret-key-2026` (configurable via `ADMIN_API_KEY` in `.env`).

---

## 💥 Simulated Incidents & Expected Agent Diagnosis

| Incident (`:type`)    | What the Demo App Does                                                                                                                        | What the AI Agent Should Discover                                                                                                           |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `http_500`            | `/api/orders` starts returning HTTP 500 errors.                                                                                               | Identifies failing endpoint `/api/orders`, isolates error cause (`PaymentGatewaySerializer.ts:54`), and notes `/api/users` remains healthy. |
| `database_failure`    | Simulates database connection pool exhaustion and 5000ms timeout on `db-primary.internal:5432`. `/health` reports degraded.                   | Connects error logs (`ERR_DB_POOL_EXHAUSTION`) and health degradation to DB timeout, distinguishing it from application logic bugs.         |
| `high_latency`        | Delays `/api/orders` responses by 3.5–4.5 seconds.                                                                                            | Observes latency spike in `/api/metrics` (p95 > 3500ms) and identifies downstream `WarehousePricingRPC` bottleneck.                         |
| `service_unavailable` | `/health` returns HTTP 503 Service Unavailable with failing dependency status.                                                                | Discovers overall cluster unhealthiness and pinpoints which subsystem health checks are failing.                                            |
| `bad_deployment`      | Triggers a runtime `TypeError` on `/api/orders` and dynamically adds a new release (`v2.4.2-buggy`) deployed 3 min ago to `/api/deployments`. | **Causality detection**: Correlates the exact deployment timestamp with the sudden spike in errors and recommends a rollback to `v2.4.1`.   |
| `memory_pressure`     | Container simulated memory usage spikes to 485.6MB (94.8% of 512MB cgroup limit).                                                             | Discovers memory pressure warning in logs and resource metrics, diagnosing an approaching OOM event.                                        |
| `rate_limiting`       | `/api/orders` throttles requests with HTTP 429 and `Retry-After: 60`.                                                                         | Identifies client throttling/excessive traffic volume via HTTP 429 response codes and rate-limiter logs.                                    |

---

## 🚀 Quick Start

### Option 1: Local Development (Fastest)

```bash
# Navigate to directory
cd demo-app

# Install dependencies (only needed once)
npm install

# Run in live-reload dev mode using tsx
npm run dev
```

### Option 2: Build & Production Start

```bash
cd demo-app
npm run build
npm start
```

### Option 3: Docker Compose

```bash
cd demo-app
docker compose up --build
```

The service will be live at **`http://localhost:8000`**.

---

## 🧪 Automated Incident Verification Suite

You can verify all 7 incidents and automated recovery in seconds with the built-in test runner:

```bash
npm run test:incidents
```

Sample output:

```text
🧪 Starting AI-SRE Incident Simulation Test Suite
Target: http://localhost:8000

[PASS] Baseline Health: service reports 200 OK across all endpoints.
[PASS] Incident http_500: Orders returned 500 (InternalServerError).
[PASS] Incident database_failure: DB pool connection timeout simulated.
[PASS] Incident high_latency: Request took 3813ms.
[PASS] Incident service_unavailable: Health returned 503.
[PASS] Incident bad_deployment: Version v2.4.2-buggy causes TypeError.
[PASS] Incident memory_pressure: Memory at 94.8%.
[PASS] Incident rate_limiting: Returned HTTP 429 Too Many Requests.
[PASS] Recovery Reset: System restored to nominal baseline.

=========================================
         TEST SUMMARY RESULTS
=========================================
 ✅ PASS | baseline_health      | Health=200, Users=200, Orders=200
 ✅ PASS | http_500             | Status=500, Code=ERR_PAYMENT_SERIALIZATION_FAILED
 ✅ PASS | database_failure     | Orders=500, Health=503, Target=db-primary.internal:5432
 ✅ PASS | high_latency         | Elapsed=3813ms (expected >=3000ms)
 ✅ PASS | service_unavailable  | Health status=503
 ✅ PASS | bad_deployment       | Current version=v2.4.2-buggy, Order status=500
 ✅ PASS | memory_pressure      | Memory pct=94.8%, Usage=485.6MB
 ✅ PASS | rate_limiting        | Status=429, Retry-After=60
 ✅ PASS | recovery_reset       | Health=200, Orders=200, Incident=none
=========================================
```

---

## 🚦 Synthetic Traffic Generator

To simulate continuous live traffic (ideal for demonstrating your AI agent detecting an incident in real-time):

```bash
npm run traffic
```

This sends randomized requests to `/health`, `/api/users`, and `/api/orders` every second, updating metrics and logs in real-time.

---

## 🤖 Guide for Your AI-SRE Agent

When your AI-SRE agent starts an investigation, it should follow this structured diagnostic loop:

1. **Step 1: Check System Health**

   ```bash
   curl http://localhost:8000/health
   ```

   _Question: Is the whole service down, or are specific dependency checks failing?_

2. **Step 2: Inspect Golden Signals (Metrics)**

   ```bash
   curl http://localhost:8000/api/metrics
   ```

   _Question: What is the error rate? Is latency (p95/p99) elevated? Is memory approaching the 512MB cgroup limit?_

3. **Step 3: Analyze Recent Logs for Stack Traces**

   ```bash
   curl "http://localhost:8000/api/logs?level=ERROR&limit=20"
   ```

   _Question: What exact error classes, stack traces, and failing components are appearing?_

4. **Step 4: Check Deployment History for Recent Changes**

   ```bash
   curl http://localhost:8000/api/deployments
   ```

   _Question: Was a new version deployed right before the error spike?_

5. **Step 5: Synthesize Root Cause & Remediation**
   - Provide supporting telemetry evidence (log snippet, metric values, deployment commit).
   - Propose mitigation (e.g., rollback deployment, scale memory limit, restart pool connection, or engage rate limiting).
