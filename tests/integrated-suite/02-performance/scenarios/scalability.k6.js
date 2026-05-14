// Scalability Test — هل يتوسع التطبيق بكفاءة مع زيادة الحمل تدريجياً؟
// 25 → 50 → 100 → 200 VUs — قياس throughput-per-VU

import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
const { getJson, postJson, ENDPOINTS, pickPayload } = require('../lib/helpers.js');

const stageRps = new Trend('stage_rps', false);

export const options = {
  scenarios: {
    scalability: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '2m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1200'],
  },
};

export default function () {
  if (Math.random() < 0.6) {
    getJson(ENDPOINTS.projects);
  } else {
    const p = pickPayload();
    postJson(ENDPOINTS.memorySearch, p.body);
  }
  sleep(1);
}

export function handleSummary(data) {
  const m = data.metrics;
  const totalIter = m.iterations?.values?.count ?? 0;
  const totalDur = (data.state?.testRunDurationMs ?? 1) / 1000;
  const avgRps = totalIter / totalDur;
  return {
    stdout: `\nScalability test summary:\n  total iterations: ${totalIter}\n  avg RPS: ${avgRps.toFixed(2)}\n  p95: ${m.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? 0}ms\n  efficiency: requires per-stage breakdown — see stage_rps trend\n`,
    'scalability.summary.json': JSON.stringify(data),
  };
}
