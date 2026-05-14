// axe-scan.spec.ts
// يفحص كل الصفحات الحرجة بـ axe-core ويُصدِر تقرير JSON قابل للمقارنة بـ baseline
// النمط مأخوذ من artifacts/art-director/run-art-director-field-test.cjs

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ARTIFACTS = process.env.A11Y_ARTIFACTS_DIR || path.join(process.cwd(), 'artifacts/integrated-suite/a11y-local');
fs.mkdirSync(ARTIFACTS, { recursive: true });

interface PageTarget {
  id: string;
  path: string;
  // expected baseline من artifacts/* — أي زيادة عن هذا = فشل
  baselineViolations?: number;
}

const TARGETS: PageTarget[] = [
  { id: 'home', path: '/' },
  { id: 'editor', path: '/editor' },
  { id: 'cinematography', path: '/cinematography-studio' },
  { id: 'breakdown', path: '/breakdown' },
  { id: 'actorai-arabic', path: '/actorai-arabic' },
  { id: 'art-director', path: '/art-director' },
  { id: 'brain-storm', path: '/brain-storm' },
];

async function scanPage(page: Page, target: PageTarget) {
  await page.goto(target.path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();

  // كتابة تقرير لكل صفحة
  const reportPath = path.join(ARTIFACTS, `axe-${target.id}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    target,
    timestamp: new Date().toISOString(),
    url: page.url(),
    violations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    inapplicable: results.inapplicable.length,
  }, null, 2));

  return results;
}

for (const target of TARGETS) {
  test(`a11y / ${target.id} — no critical violations`, async ({ page }) => {
    const results = await scanPage(page, target);
    const critical = results.violations.filter((v) => v.impact === 'critical');
    const serious = results.violations.filter((v) => v.impact === 'serious');

    if (critical.length || serious.length) {
      console.log(`[${target.id}] critical=${critical.length}, serious=${serious.length}`);
      for (const v of [...critical, ...serious]) {
        console.log(`  - ${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`);
      }
    }

    // قاعدة: لا critical/serious violations مسموح بها على الإطلاق
    expect.soft(critical, `${target.id}: critical violations: ${critical.map((v) => v.id).join(', ')}`).toHaveLength(0);
    expect.soft(serious, `${target.id}: serious violations: ${serious.map((v) => v.id).join(', ')}`).toHaveLength(0);
  });
}

test('a11y / aggregate report', async ({ page }) => {
  // جمع كل التقارير في تقرير موحد
  const aggregate: any = {
    timestamp: new Date().toISOString(),
    targets: [],
    totals: { critical: 0, serious: 0, moderate: 0, minor: 0 },
  };

  for (const target of TARGETS) {
    const reportPath = path.join(ARTIFACTS, `axe-${target.id}.json`);
    if (fs.existsSync(reportPath)) {
      const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
      const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
      for (const v of data.violations) {
        if (v.impact && counts[v.impact as keyof typeof counts] !== undefined) {
          counts[v.impact as keyof typeof counts] += v.nodes.length;
        }
      }
      aggregate.targets.push({ id: target.id, counts, totalViolations: data.violations.length });
      aggregate.totals.critical += counts.critical;
      aggregate.totals.serious += counts.serious;
      aggregate.totals.moderate += counts.moderate;
      aggregate.totals.minor += counts.minor;
    }
  }

  fs.writeFileSync(path.join(ARTIFACTS, 'axe-aggregate.json'), JSON.stringify(aggregate, null, 2));
  expect(aggregate.totals.critical, 'aggregate critical violations').toBe(0);
});
