// Load Test — هل يتحمّل التطبيق العدد المتوقع من المستخدمين؟
// 50 VUs ثابت لـ 5 دقائق

import { sleep } from 'k6';
const { getJson, postJson, ENDPOINTS, pickPayload } = require('../lib/helpers.js');

export const options = {
  scenarios: {
    steady_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    checks: ['rate>0.99'],
    'http_req_duration{endpoint:health}': ['p(95)<100'],
    'http_req_duration{endpoint:projects}': ['p(95)<500'],
    'http_req_duration{endpoint:memory_search}': ['p(95)<1000'],
  },
};

export default function () {
  // 30% health checks — represents observability traffic
  if (Math.random() < 0.3) {
    getJson(ENDPOINTS.health, { tags: { endpoint: 'health' } });
    sleep(0.5);
    return;
  }

  // 50% list operations — most common user action
  if (Math.random() < 0.5) {
    getJson(ENDPOINTS.projects, { tags: { endpoint: 'projects' } });
    sleep(1);
    return;
  }

  // 20% AI / heavy ops
  const p = pickPayload();
  if (p.kind === 'memory-search') {
    postJson(ENDPOINTS.memorySearch, p.body, { tags: { endpoint: 'memory_search' } });
  } else if (p.kind === 'breakdown') {
    postJson(ENDPOINTS.breakdown, p.body, { tags: { endpoint: 'breakdown' } });
  } else {
    postJson(ENDPOINTS.cinematography, p.body, { tags: { endpoint: 'cinematography' } });
  }
  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'load.summary.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const p95 = m.http_req_duration?.values?.['p(95)'] ?? 0;
  const fail = m.http_req_failed?.values?.rate ?? 0;
  return `\nLoad test summary:\n  p95: ${p95.toFixed(0)}ms\n  failure rate: ${(fail * 100).toFixed(2)}%\n  iterations: ${m.iterations?.values?.count ?? 0}\n`;
}
