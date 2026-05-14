// smoke-web.k6.js — frontend (Next.js / Vercel) smoke test
// يضرب routes الواجهة فقط. يقرأ K6_WEB_BASE_URL.
// يُستخدَم عند اختبار Vercel deployment أو dev server.

import { sleep } from 'k6';
import { check } from 'k6';
import http from 'k6/http';
import { requireWebBase } from '../lib/helpers.js';

const WEB = requireWebBase();

export const options = {
  scenarios: {
    smoke_web: {
      executor: 'constant-vus',
      vus: parseInt(__ENV.K6_VUS || '3', 10),
      duration: __ENV.K6_DURATION || '90s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<4000', 'p(99)<6000'],
  },
};

export default function () {
  const get = (path, label) => {
    const res = http.get(`${WEB}${path}`, {
      responseCallback: http.expectedStatuses({ min: 200, max: 499 }),
    });
    check(res, {
      [`web GET ${label || path} status < 500`]: (r) => r.status < 500,
      [`web GET ${label || path} has body`]: (r) => r.body && r.body.length > 0,
    });
    return res;
  };

  get('/', 'homepage');
  get('/api/health', 'api-health-proxy');

  sleep(2);
}

export function handleSummary(data) {
  const m = data.metrics;
  const dur = (data.state?.testRunDurationMs ?? 0) / 1000;
  const p95 = m.http_req_duration?.values?.['p(95)'] ?? 0;
  const failRate = ((m.http_req_failed?.values?.rate ?? 0) * 100);

  return {
    stdout: `Web smoke: ${dur.toFixed(1)}s | p95=${p95.toFixed(0)}ms | fail=${failRate.toFixed(2)}%\n`,
    'smoke-web.summary.json': JSON.stringify(data, null, 2),
  };
}
