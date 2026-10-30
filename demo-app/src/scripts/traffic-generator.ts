/**
 * Synthetic Traffic Generator for AI-SRE Demo App
 * Sends background requests to simulate live production traffic.
 * Run with: npm run traffic
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '1000', 10);

const ENDPOINTS = [
  { path: '/health', weight: 4 },
  { path: '/api/users', weight: 3 },
  { path: '/api/orders', weight: 5 },
  { path: '/api/metrics', weight: 1 },
];

function selectEndpoint(): string {
  const totalWeight = ENDPOINTS.reduce((acc, e) => acc + e.weight, 0);
  let random = Math.random() * totalWeight;
  for (const ep of ENDPOINTS) {
    if (random < ep.weight) {
      return ep.path;
    }
    random -= ep.weight;
  }
  return '/health';
}

async function sendRequest() {
  const ep = selectEndpoint();
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${ep}`);
    const elapsed = Date.now() - t0;
    const color = res.status >= 500 ? '\x1b[31m' : res.status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(
      `${color}[${new Date().toISOString()}] ${res.status} GET ${ep} (${elapsed}ms)\x1b[0m`
    );
  } catch (err: any) {
    console.error(`\x1b[31m[${new Date().toISOString()}] ERROR GET ${ep}: ${err.message}\x1b[0m`);
  }
}

console.log(
  `\n🚀 Synthetic traffic generator started against ${BASE_URL} (Interval: ${INTERVAL_MS}ms)`
);
console.log(`Press Ctrl+C to stop.\n`);

setInterval(sendRequest, INTERVAL_MS);
