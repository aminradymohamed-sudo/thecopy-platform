// Stress Test — متى ينهار التطبيق؟
// تصاعد إلى 500 VUs — نسمح بـ failure حتى 5% و p95 حتى 2s لكشف breaking point

import { sleep } from 'k6';
const { getJson, postJson, ENDPOINTS, pickPayload } = require('../lib/helpers.js');

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  if (Math.random() < 0.4) {
    getJson(ENDPOINTS.projects);
    sleep(0.5);
    return;
  }
  const p = pickPayload();
  postJson(p.kind === 'breakdown' ? ENDPOINTS.breakdown : ENDPOINTS.memorySearch, p.body);
  sleep(1);
}

export function handleSummary(data) {
  const m = data.metrics;
  return {
    stdout: `\nStress test summary:\n  peak VUs: ${m.vus_max?.values?.value ?? 0}\n  p95: ${m.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? 0}ms\n  failures: ${((m.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%\n`,
    'stress.summary.json': JSON.stringify(data),
  };
}
