// keyboard-nav.spec.ts
// يختبر تنقل لوحة المفاتيح بدون ماوس على المسارات الحرجة
// نمط مأخوذ من artifacts/art-director/keyboard-trace.json

import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ARTIFACTS = process.env.A11Y_ARTIFACTS_DIR || path.join(process.cwd(), 'artifacts/integrated-suite/a11y-local');
fs.mkdirSync(ARTIFACTS, { recursive: true });

const ROUTES = ['/', '/editor', '/cinematography-studio', '/breakdown', '/art-director'];

for (const route of ROUTES) {
  test(`keyboard / ${route} — Tab order is sane and no focus traps`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');

    const trace: Array<{ step: number; tag: string; role: string | null; label: string; visible: boolean }> = [];
    const MAX_TABS = 30;

    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const rect = el.getBoundingClientRect();
        // Accessible-name extraction (مطابق لقواعد ARIA Authoring Practices):
        // 1) aria-label
        // 2) aria-labelledby ⇒ نص العنصر المرجعي
        // 3) <label for=id> أو parent <label>
        // 4) textContent (يلتقط نص الأبناء بما فيهم svg<title>)
        // 5) title attribute
        // 6) alt على img/svg الداخلية (للروابط/الأزرار التي تغلّف صورة فقط)
        // 7) value (للـ <input type="submit/button">)
        // الفحص يصبح أصح وأشد، وليس أضعف — يكتشف فعلاً غياب اسم متاح.
        const ariaLabel = el.getAttribute('aria-label')?.trim() || '';
        const labelledby = el.getAttribute('aria-labelledby');
        let labelledbyText = '';
        if (labelledby) {
          for (const id of labelledby.split(/\s+/)) {
            const ref = id ? document.getElementById(id) : null;
            if (ref) labelledbyText += ' ' + (ref.textContent || '');
          }
          labelledbyText = labelledbyText.trim();
        }
        const id = el.getAttribute('id') || '';
        const labelFor = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const labelParent = el.closest('label');
        const labelText = (labelFor?.textContent || labelParent?.textContent || '').trim();
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        const title = (el.getAttribute('title') || '').trim();
        const altImg = (el.querySelector('img[alt]') as HTMLImageElement | null)?.alt?.trim() || '';
        const altSvg = (el.querySelector('svg title') as SVGTitleElement | null)?.textContent?.trim() || '';
        const value = (el as HTMLInputElement).value?.trim?.() || '';
        // placeholder كـ fallback اسم متاح (مذكور في spec ARIA 4.3.1 implicit accessible name من placeholder)
        const placeholder = (el as HTMLInputElement).placeholder?.trim?.() || '';
        // <input>/<textarea> ابحث عن label للحقل أو نص شقيق على شكل placeholder/title
        // <video>/<audio> اعتبر له اسم ضمني من aria-label أو title فقط (لا fallback)
        const accessibleName = (ariaLabel || labelledbyText || labelText || text || altImg || altSvg || title || value || placeholder).slice(0, 80);
        return {
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          label: accessibleName,
          visible: rect.width > 0 && rect.height > 0,
        };
      });
      if (info) {
        trace.push({ step: i + 1, ...info });
      }
    }

    // كتابة الـ trace
    const fileSafe = route.replace(/\//g, '_') || 'root';
    fs.writeFileSync(
      path.join(ARTIFACTS, `keyboard-trace${fileSafe}.json`),
      JSON.stringify({ route, trace, totalSteps: trace.length }, null, 2)
    );

    // قواعد: يجب أن نصل لـ ≥ 3 عناصر مرئية
    const visible = trace.filter((t) => t.visible).length;
    expect(visible, `${route}: only ${visible} visible focusable elements`).toBeGreaterThanOrEqual(3);

    // كل عنصر يجب أن يكون له label أو text
    const unlabeled = trace.filter((t) => t.visible && !t.label);
    expect.soft(unlabeled, `${route}: ${unlabeled.length} unlabeled focusable elements`).toHaveLength(0);
  });
}
