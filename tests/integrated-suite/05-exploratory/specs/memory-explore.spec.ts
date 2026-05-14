// memory-explore.spec.ts
// استكشاف الذاكرة الدائمة + RAG — heuristics من memory-charter.md

import { test } from '@playwright/test';
import * as path from 'node:path';
import { FieldReporter } from '../lib/reporter';

const BASE = process.env.EXPLORE_BASE_URL || 'http://localhost:5000';
const API_BASE = process.env.EXPLORE_API_URL || 'http://localhost:3001';
const TOKEN = process.env.EXPLORE_TEST_TOKEN || '';
const ARTIFACTS = process.env.EXPLORE_ARTIFACTS_DIR || path.join(process.cwd(), 'artifacts/integrated-suite/explore-local');
const OUT = path.join(ARTIFACTS, 'memory-explore');

test.setTimeout(10 * 60_000);

test('memory — agentic exploration', async ({ request }) => {
  const r = new FieldReporter(OUT, `${API_BASE}/api/v1/memory`, 'memory-charter');

  const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

  // 1. Empty query
  const emptyResp = await request.post(`${API_BASE}/api/v1/memory/search`, {
    data: { query: '', topK: 5 }, headers, timeout: 10_000,
  }).catch(() => null);
  r.addResult('MEM-EMPTY-01', 'input-validation',
    (emptyResp?.status() ?? -1) >= 400 && (emptyResp?.status() ?? -1) < 500 ? 'ناجح' : 'فاشل',
    'بحث بـ query فارغ', `status=${emptyResp?.status()}`);

  // 2. SQL injection في query
  const sqliResp = await request.post(`${API_BASE}/api/v1/memory/search`, {
    data: { query: "'; DROP TABLE users;--", topK: 5 }, headers, timeout: 10_000,
  }).catch(() => null);
  const sqliBody = await sqliResp?.text().catch(() => '');
  const dbErrorLeaked = /syntax error|psql|postgres|column.*does not exist/i.test(sqliBody || '');
  r.addResult('MEM-SQL-01', 'injection',
    !dbErrorLeaked ? 'ناجح' : 'فاشل',
    'SQLi في query', `db-error-leaked=${dbErrorLeaked}`,
    [], dbErrorLeaked ? 'حرجة' : 'منخفضة');

  // 3. Secret leak prevention
  const fakeSecret = `sk-test-VERIFY-NOT-LEAKED-${Date.now()}`;
  const ingestResp = await request.post(`${API_BASE}/api/v1/memory`, {
    data: { content: `Note containing secret: ${fakeSecret}`, type: 'note' },
    headers, timeout: 10_000,
  }).catch(() => null);
  if (ingestResp && ingestResp.status() < 500) {
    // ابحث عنه
    await new Promise((res) => setTimeout(res, 2000)); // فترة indexing
    const searchResp = await request.post(`${API_BASE}/api/v1/memory/search`, {
      data: { query: 'sk-test', topK: 10 }, headers, timeout: 10_000,
    }).catch(() => null);
    const body = await searchResp?.text().catch(() => '');
    const leaked = body?.includes(fakeSecret) ?? false;
    r.addResult('MEM-SEC-01', 'secret-scanning',
      !leaked ? 'ناجح' : 'فاشل',
      'فحص أن secrets لا تُسترجَع', `leaked=${leaked}`,
      [], leaked ? 'حرجة' : 'منخفضة');
  } else {
    r.addResult('MEM-SEC-01', 'secret-scanning', 'محجوب',
      'ingest فشل — لا يمكن المتابعة', `ingest-status=${ingestResp?.status()}`);
  }

  // 4. Long query stress
  const longQuery = 'البحث في الذاكرة '.repeat(2000);
  const longResp = await request.post(`${API_BASE}/api/v1/memory/search`, {
    data: { query: longQuery.slice(0, 50_000), topK: 5 }, headers, timeout: 30_000,
  }).catch(() => null);
  r.addResult('MEM-LONG-01', 'boundary',
    (longResp?.status() ?? -1) < 500 ? 'ناجح' : 'فاشل',
    'query بطول 50K حرف', `status=${longResp?.status()}`);

  // 5. topK boundary
  const topKResp = await request.post(`${API_BASE}/api/v1/memory/search`, {
    data: { query: 'test', topK: 999_999 }, headers, timeout: 10_000,
  }).catch(() => null);
  r.addResult('MEM-TOPK-01', 'boundary',
    (topKResp?.status() ?? -1) < 500 ? 'ناجح' : 'فاشل',
    'topK=999999', `status=${topKResp?.status()}`);

  await r.finalize();
});
