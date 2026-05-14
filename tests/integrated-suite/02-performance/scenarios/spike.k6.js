// Spike Test — كيف يتصرف عند ارتفاع مفاجئ وحاد؟
// 5 → 200 VUs في 30 ثانية، ثم العودة. يقيس recovery time.

import { sleep } from 'k6';
const { getJson, postJson, ENDPOINTS, pickPayload } = require('../lib/helpers.js');

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '30s', target: 200 },
        { duration: '1m',  target: 200 },
        { duration: '30s', target: 5 },
        { duration: '1m',  target: 5 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<1500'],
    // مرحلة الاسترداد: بعد العودة لـ 5 VUs، p95 يجب أن يعود ≤ 800ms
    'http_req_duration{phase:recovery}': ['p(95)<800'],
  },
};

export default function () {
  const phase = __ITER < 200 ? 'spike' : 'recovery';
  if (Math.random() < 0.5) {
    getJson(ENDPOINTS.projects, { tags: { phase } });
  } else {
    const p = pickPayload();
    postJson(ENDPOINTS.memorySearch, p.body, { tags: { phase } });
  }
  sleep(1);
}

export function handleSummary(data) {
  const m = data.metrics;
  return {
    stdout: `\nSpike test summary:\n  peak VUs: ${m.vus_max?.values?.value ?? 0}\n  p95 overall: ${m.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? 0}ms\n  failure rate: ${((m.http_req_failed?.values?.rate ?? 0) * 100).toFixed(2)}%\n`,
    'spike.summary.json': JSON.stringify(data),
  };
}
