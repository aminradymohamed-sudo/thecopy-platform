// Soak / Endurance Test — هل يبقى مستقراً تحت حمل ثابت لفترة طويلة؟
// 30 VUs ثابت لـ 2 ساعة — يكشف memory leaks و rate drift و connection pool exhaustion

import { sleep } from 'k6';
const { getJson, postJson, ENDPOINTS, pickPayload } = require('../lib/helpers.js');

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 30,
      duration: __ENV.K6_SOAK_DURATION || '2h',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
};

export default function () {
  // mix يحاكي usage حقيقي طويل المدى
  const r = Math.random();
  if (r < 0.4) {
    getJson(ENDPOINTS.projects);
  } else if (r < 0.7) {
    getJson(ENDPOINTS.health);
  } else {
    const p = pickPayload();
    postJson(ENDPOINTS.memorySearch, p.body);
  }
  sleep(2);
}

export function handleSummary(data) {
  const m = data.metrics;
  // ملاحظة: قياس memory growth يجب أن يأتي من خارج k6 (Prometheus/Grafana)
  return {
    stdout: `\nSoak test summary:\n  duration: ${data.state?.testRunDurationMs ? (data.state.testRunDurationMs / 60000).toFixed(0) + 'min' : 'n/a'}\n  p95: ${m.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? 0}ms\n  failures: ${((m.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%\n  total iterations: ${m.iterations?.values?.count ?? 0}\n  HINT: memory growth must be measured externally (Prometheus/Grafana)\n`,
    'soak.summary.json': JSON.stringify(data),
  };
}
