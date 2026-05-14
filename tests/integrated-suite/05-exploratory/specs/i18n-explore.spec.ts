// i18n-explore.spec.ts
// استكشاف RTL والتدويل — heuristics من i18n-charter.md

import { test } from '@playwright/test';
import * as path from 'node:path';
import { FieldReporter } from '../lib/reporter';

const BASE = process.env.EXPLORE_BASE_URL || 'http://localhost:5000';
const ARTIFACTS = process.env.EXPLORE_ARTIFACTS_DIR || path.join(process.cwd(), 'artifacts/integrated-suite/explore-local');
const OUT = path.join(ARTIFACTS, 'i18n-explore');

const ROUTES = ['/', '/editor', '/cinematography-studio', '/breakdown', '/actorai-arabic'];

test.setTimeout(8 * 60_000);

test('i18n — agentic exploration', async ({ page }) => {
  const r = new FieldReporter(OUT, BASE, 'i18n-charter');
  r.attachPage(page);

  for (const route of ROUTES) {
    try {
      await page.goto(`${BASE}${route}`, { timeout: 30_000 });
      await page.waitForLoadState('domcontentloaded');
    } catch (e: any) {
      r.addResult(`I18N-${route}-LOAD`, 'i18n', 'محجوب', `load ${route}`, e.message);
      continue;
    }

    // 1. dir=rtl
    const dir = await page.evaluate(() => document.documentElement.dir);
    r.addResult(`I18N-${route}-DIR`, 'i18n',
      dir === 'rtl' ? 'ناجح' : 'فاشل',
      `${route}: dir attribute`, `dir=${dir}`);

    // 2. lang=ar*
    const lang = await page.evaluate(() => document.documentElement.lang);
    const isArabic = /^ar/.test(lang || '');
    r.addResult(`I18N-${route}-LANG`, 'i18n',
      isArabic ? 'ناجح' : 'فاشل',
      `${route}: lang attribute`, `lang=${lang}`);

    // 3. أي نص untranslated مثل {count} أو {{key}}
    const html = await page.content();
    const untranslated = (html.match(/\{\{[^}]+\}\}|\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || [])
      .filter((m) => !m.includes('href') && !m.includes('src'));
    r.addResult(`I18N-${route}-RAW`, 'i18n',
      untranslated.length === 0 ? 'ناجح' : 'فاشل',
      `${route}: نصوص untranslated`, `count=${untranslated.length}; samples=${untranslated.slice(0, 3).join(',')}`,
      [], untranslated.length > 0 ? 'متوسطة' : 'منخفضة');

    // 4. CSS logical properties applied (margin-inline)
    const usesLogical = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*')).slice(0, 200);
      return all.some((el) => {
        const cs = getComputedStyle(el);
        return cs.marginInlineStart !== '0px' || cs.paddingInlineStart !== '0px';
      });
    });
    r.addResult(`I18N-${route}-LOGICAL`, 'i18n',
      usesLogical ? 'ناجح' : 'فاشل',
      `${route}: logical CSS properties`, `usesLogical=${usesLogical}`,
      [], usesLogical ? 'منخفضة' : 'متوسطة');

    await r.screenshot(page, `i18n-${route.replace(/\//g, '_')}`);
  }

  // 5. Intl.DateTimeFormat ar-SA يعمل
  await page.goto(BASE);
  const arDate = await page.evaluate(() =>
    new Intl.DateTimeFormat('ar-SA', { dateStyle: 'long' }).format(new Date(2026, 4, 7))
  );
  r.addResult('I18N-INTL-01', 'i18n',
    arDate && arDate.length > 3 ? 'ناجح' : 'فاشل',
    'Intl.DateTimeFormat ar-SA', `formatted="${arDate}"`);

  await r.finalize();
});
