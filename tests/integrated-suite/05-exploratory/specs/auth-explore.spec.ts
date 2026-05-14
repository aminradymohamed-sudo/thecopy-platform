// auth-explore.spec.ts
// استكشاف آلي للمصادقة — ينفّذ heuristics من auth-charter.md

import { test } from '@playwright/test';
import * as path from 'node:path';
import { FieldReporter } from '../lib/reporter';

const BASE = process.env.EXPLORE_BASE_URL || 'http://localhost:5000';
const API_BASE = process.env.EXPLORE_API_URL || 'http://localhost:3001';
const ARTIFACTS = process.env.EXPLORE_ARTIFACTS_DIR || path.join(process.cwd(), 'artifacts/integrated-suite/explore-local');
const OUT = path.join(ARTIFACTS, 'auth-explore');

test.setTimeout(10 * 60_000);

test('auth — agentic exploration', async ({ page, request }) => {
  const r = new FieldReporter(OUT, `${API_BASE}/api/v1/auth`, 'auth-charter');
  r.attachPage(page);

  // 1. Brute-force / rate-limit
  const failedAttempts: number[] = [];
  for (let i = 0; i < 20; i++) {
    try {
      const resp = await request.post(`${API_BASE}/api/v1/auth/login`, {
        data: { email: 'test@example.com', password: 'wrong-' + i },
        timeout: 5000,
      });
      failedAttempts.push(resp.status());
    } catch (e: any) {
      failedAttempts.push(-1);
    }
  }
  const got429 = failedAttempts.some((s) => s === 429);
  r.addResult('AUTH-RL-01', 'rate-limit',
    got429 ? 'ناجح' : 'فاشل',
    '20 محاولة فاشلة في تسلسل', `statuses=${failedAttempts.join(',')}`,
    [], got429 ? 'منخفضة' : 'مرتفعة');

  // 2. SQL injection محاولة في email
  const sqliResp = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email: "admin' OR '1'='1", password: 'x' },
    timeout: 5000,
  }).catch(() => null);
  const sqliStatus = sqliResp?.status() ?? -1;
  r.addResult('AUTH-SQL-01', 'injection',
    sqliStatus >= 400 && sqliStatus < 500 ? 'ناجح' : 'فاشل',
    'SQLi في email', `status=${sqliStatus}`,
    [], sqliStatus === 200 ? 'حرجة' : 'منخفضة');

  // 3. NoSQL injection
  const nosqliResp = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email: { $ne: null }, password: { $ne: null } },
    timeout: 5000,
  }).catch(() => null);
  const nosqliStatus = nosqliResp?.status() ?? -1;
  r.addResult('AUTH-NSQL-01', 'injection',
    nosqliStatus >= 400 && nosqliStatus < 500 ? 'ناجح' : 'فاشل',
    'NoSQLi في email/password', `status=${nosqliStatus}`,
    [], nosqliStatus === 200 ? 'حرجة' : 'منخفضة');

  // 4. Tampered JWT
  const tamperedResp = await request.get(`${API_BASE}/api/v1/projects`, {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tamperedXXX' },
    timeout: 5000,
  }).catch(() => null);
  const tamperedStatus = tamperedResp?.status() ?? -1;
  r.addResult('AUTH-JWT-01', 'token',
    tamperedStatus === 401 ? 'ناجح' : 'فاشل',
    'JWT مُحرَّف', `status=${tamperedStatus}`,
    [], tamperedStatus === 200 ? 'حرجة' : 'منخفضة');

  // 5. Missing Authorization header
  const noAuthResp = await request.get(`${API_BASE}/api/v1/projects`, { timeout: 5000 }).catch(() => null);
  const noAuthStatus = noAuthResp?.status() ?? -1;
  r.addResult('AUTH-NOAUTH-01', 'token',
    noAuthStatus === 401 ? 'ناجح' : 'فاشل',
    'بدون Authorization header', `status=${noAuthStatus}`,
    [], noAuthStatus === 200 ? 'حرجة' : 'منخفضة');

  // 6. Password reset enumeration
  const existResp = await request.post(`${API_BASE}/api/v1/auth/password-reset`, {
    data: { email: 'admin@thecopy.app' }, timeout: 5000,
  }).catch(() => null);
  const notExistResp = await request.post(`${API_BASE}/api/v1/auth/password-reset`, {
    data: { email: 'definitely-does-not-exist@test.invalid' }, timeout: 5000,
  }).catch(() => null);
  const sameResponse = existResp?.status() === notExistResp?.status();
  r.addResult('AUTH-ENUM-01', 'enumeration',
    sameResponse ? 'ناجح' : 'فاشل',
    'تعداد عبر password-reset', `same-response=${sameResponse}`,
    [], sameResponse ? 'منخفضة' : 'مرتفعة');

  await r.finalize();
});
