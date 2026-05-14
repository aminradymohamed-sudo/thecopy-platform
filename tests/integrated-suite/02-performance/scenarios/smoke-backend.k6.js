// smoke-backend.k6.js — backend-only smoke test
// يضرب فقط endpoints خلفية معروفة. يقرأ K6_BACKEND_BASE_URL.
// يُستخدَم بدل smoke.k6.js القديم عند الاختبار على الخلفية منفصلةً (Railway).

import { sleep } from 'k6';
import { check } from 'k6';
import http from 'k6/http';
import { requireBackendBase, authHeaders, ENDPOINTS } from '../lib/helpers.js';

const BACKEND = requireBackendBase();

export const options = {
  scenarios: {
    smoke_backend: {
      executor: 'constant-vus',
      vus: parseInt(__ENV.K6_VUS || '3', 10),
      duration: __ENV.K6_DURATION || '90s',
    },
  },
  thresholds: {
    // أقسى من smoke العام لأن هذا health check — أي فشل هنا خلل حقيقي
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
  },
};

export default function () {
  const get = (path) => {
    const res = http.get(`${BACKEND}${path}`, {
      headers: authHeaders(),
      responseCallback: http.expectedStatuses({ min: 200, max: 499 }),
    });
    check(res, {
      [`backend GET ${path} status < 500`]: (r) => r.status < 500,
      [`backend GET ${path} has body`]: (r) => r.body && r.body.length > 0,
    });
    return res;
  };

  get('/health/live');
  get(ENDPOINTS.apiHealth);

  sleep(2);
}

export function handleSummary(data) {
  const m = data.metrics;
  const dur = (data.state?.testRunDurationMs ?? 0) / 1000;
  const p95 = m.http_req_duration?.values?.['p(95)'] ?? 0;
  const failRate = ((m.http_req_failed?.values?.rate ?? 0) * 100);

  return {
    stdout: `Backend smoke: ${dur.toFixed(1)}s | p95=${p95.toFixed(0)}ms | fail=${failRate.toFixed(2)}%\n`,
    'smoke-backend.summary.json': JSON.stringify(data, null, 2),
  };
}
