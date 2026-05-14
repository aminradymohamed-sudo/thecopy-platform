// k6 helpers — shared across all performance scenarios

import { check } from 'k6';
import http from 'k6/http';
import { SharedArray } from 'k6/data';

export const BASE = __ENV.K6_TARGET_BASE_URL || 'http://localhost:3001';
export const WEB_BASE = __ENV.K6_WEB_BASE_URL || 'http://localhost:5000';

// BACKEND_BASE / WEB_BASE for split smoke scenarios — required, no silent fallback in CI.
export function requireBackendBase() {
  const url = __ENV.K6_BACKEND_BASE_URL;
  if (!url) throw new Error('K6_BACKEND_BASE_URL is required for smoke-backend.k6.js — set it to the backend base URL');
  return url;
}

export function requireWebBase() {
  const url = __ENV.K6_WEB_BASE_URL;
  if (!url) throw new Error('K6_WEB_BASE_URL is required for smoke-web.k6.js — set it to the frontend base URL');
  return url;
}
export const TOKEN = __ENV.K6_TEST_USER_TOKEN || '';

export function authHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
  return h;
}

export function getJson(path, params = {}) {
  const res = http.get(`${BASE}${path}`, { 
    headers: authHeaders(), 
    responseCallback: http.expectedStatuses({ min: 200, max: 499 }),
    ...params 
  });
  check(res, {
    [`GET ${path} status < 500`]: (r) => r.status < 500,
    [`GET ${path} has body`]: (r) => r.body && r.body.length > 0,
  });
  return res;
}

export function postJson(path, body, params = {}) {
  const res = http.post(`${BASE}${path}`, JSON.stringify(body), {
    headers: authHeaders(),
    responseCallback: http.expectedStatuses({ min: 200, max: 499 }),
    ...params,
  });
  check(res, {
    [`POST ${path} status < 500`]: (r) => r.status < 500,
  });
  return res;
}

export function head(path, params = {}) {
  const res = http.request('HEAD', `${BASE}${path}`, null, { 
    headers: authHeaders(), 
    responseCallback: http.expectedStatuses({ min: 200, max: 499 }),
    ...params 
  });
  check(res, {
    [`HEAD ${path} status < 500`]: (r) => r.status < 500,
  });
  return res;
}

// تحديث 2026-05-10: مسارات الـ backend الفعلية تستخدم /api/* بلا v1 prefix
// المرايا والإنتاج كلاهما يستخدم نفس البنية (route-registrars.ts).
// المسارات بدون auth تُرجع 401 وتعتبر "نجاح بنية" لـ k6. (status < 500)
export const ENDPOINTS = {
  health: '/health',
  apiHealth: '/api/health',
  login: '/api/auth/login',
  signup: '/api/auth/signup',
  projects: '/api/projects',
  breakdown: '/api/breakdown/health',
  cinematography: '/api/decoupage',
  memorySearch: '/api/memory/health',
};

// payloads عينة — يمكن استبدالها من ملف
export const SAMPLE_PAYLOADS = new SharedArray('payloads', () => [
  { kind: 'breakdown', body: { scriptText: 'مشهد قصير في مقهى. يدخل أحمد. يجلس.' } },
  { kind: 'memory-search', body: { query: 'ذاكرة المشاريع', topK: 5 } },
  { kind: 'cinematography', body: { sceneText: 'لقطة قريبة على الوجه عند الفجر.' } },
]);

export function pickPayload() {
  return SAMPLE_PAYLOADS[Math.floor(Math.random() * SAMPLE_PAYLOADS.length)];
}
