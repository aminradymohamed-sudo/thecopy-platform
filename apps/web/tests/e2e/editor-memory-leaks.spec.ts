/**
 * @file editor-memory-leaks.spec.ts
 * @description اختبار E2E للكشف عن تسريبات الذاكرة في محرر السيناريو العربي
 *   عبر 20 دورة reload متتالية، قياساً بـ CDP Runtime.getHeapUsage.
 *
 *   ما يكشفه هذا الاختبار:
 *   - مستمعو الأحداث غير المنظفة (window/document)
 *   - توقيتات setTimeout/setInterval تتراكم بين الدورات
 *   - مراجع DOM/كائنات تبقى في الذاكرة بعد unmount
 *   - نمو خطي في الكومة يُشير إلى تسريب حقيقي
 *
 *   مقيّد بـ Chromium فقط — CDP غير متاح على Firefox/WebKit.
 */

import { expect, test, type Page } from "@playwright/test";

// ==========================================================
// إعدادات الاختبار
// ==========================================================

function readNonEmptyEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

/**
 * مدير إعدادات بيئة الاختبار
 */
class EditorMemoryTestConfig {
  /** عنوان الخادم الأساسي */
  readonly baseUrl: string;

  /** مسار صفحة المحرر */
  readonly routePath: string = "/editor";

  /** عدد دورات الـ reload */
  readonly reloadCount: number = 20;

  /** أقصى نسبة نمو مسموح بها بين الدورة 1 والدورة 20 */
  readonly maxGrowthRatio1to20: number = 1.25;

  /** أقصى نسبة نمو مسموح بها بين الدورة 10 والدورة 20 */
  readonly maxGrowthRatio10to20: number = 1.15;

  constructor() {
    this.baseUrl =
      readNonEmptyEnv("PLAYWRIGHT_BASE_URL") ??
      `http://127.0.0.1:${
        readNonEmptyEnv("PLAYWRIGHT_PORT") ??
        readNonEmptyEnv("WEB_PORT") ??
        "5010"
      }`;
  }

  static fromEnv(): EditorMemoryTestConfig {
    return new EditorMemoryTestConfig();
  }

  get fullUrl(): string {
    return `${this.baseUrl}${this.routePath}`;
  }
}

// ==========================================================
// أدوات قياس الكومة عبر CDP
// ==========================================================

/**
 * يقيس حجم الكومة بالميغابايت بعد تشغيل Garbage Collection.
 * يُنشئ جلسة CDP جديدة وينظفها بعد القياس.
 */
async function measureHeapMB(page: Page): Promise<number> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("HeapProfiler.collectGarbage");
    const result = (await cdp.send("Runtime.getHeapUsage")) as {
      usedSize: number;
      totalSize: number;
    };
    return Math.round(result.usedSize / (1024 * 1024));
  } finally {
    await cdp.detach();
  }
}

// ==========================================================
// مساعدات التحميل
// ==========================================================

/**
 * يفتح المحرر ويُعيد 600ms لاستقرار توقيتات الحفظ التلقائي.
 */
async function loadEditor(page: Page, fullUrl: string): Promise<void> {
  await page.goto(fullUrl, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("app-root")).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(600);
}

/**
 * يُعيد تحميل المحرر وينتظر ظهور الجذر.
 */
async function reloadEditor(page: Page): Promise<void> {
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("app-root")).toBeVisible({ timeout: 30_000 });
  // انتظار قصير لاستقرار توقيتات autosave (scheduleAutoSave delay=1500ms)
  await page.waitForTimeout(400);
}

// ==========================================================
// الاختبارات
// ==========================================================

test.describe("editor — memory leaks بعد 20 reload", () => {
  // CDP متاح على Chromium فقط — تُتجاهل الاختبارات على Firefox/WebKit
  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName !== "chromium",
      "قياس CDP لتسريبات الذاكرة متاح على Chromium فقط"
    );
  });

  test("نمو الكومة بين الدورة 1 والدورة 20 يقل عن 25%", async ({ page }) => {
    test.setTimeout(180_000);

    const config = EditorMemoryTestConfig.fromEnv();

    // الدورة الأولى — تحميل أولي + قياس
    await loadEditor(page, config.fullUrl);
    const heap1 = await measureHeapMB(page);

    // دورات 2 إلى 20
    for (let i = 2; i <= config.reloadCount; i++) {
      await reloadEditor(page);
    }

    // قياس الدورة العشرين
    const heap20 = await measureHeapMB(page);
    const ratio = heap20 / heap1;

    console.warn(
      `[memory-leak] دورة 1: ${heap1} MB | دورة 20: ${heap20} MB | نسبة النمو: ${ratio.toFixed(3)}`
    );

    expect(ratio, `نسبة نمو الكومة (الدورة 1 → الدورة 20)`).toBeLessThan(
      config.maxGrowthRatio1to20
    );
  });

  test("الكومة مستقرة بين الدورة 10 والدورة 20 — لا نمو خطي", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const config = EditorMemoryTestConfig.fromEnv();

    // تحميل أولي
    await loadEditor(page, config.fullUrl);

    // الوصول للدورة 10
    for (let i = 2; i <= 10; i++) {
      await reloadEditor(page);
    }
    const heap10 = await measureHeapMB(page);

    // الوصول للدورة 20
    for (let i = 11; i <= config.reloadCount; i++) {
      await reloadEditor(page);
    }
    const heap20 = await measureHeapMB(page);

    const ratio = heap20 / heap10;

    console.warn(
      `[memory-leak] دورة 10: ${heap10} MB | دورة 20: ${heap20} MB | نسبة النمو: ${ratio.toFixed(3)}`
    );

    // إذا كان هناك تسريب خطي، فالنمو بين 10 و20 سيساوي تقريباً النمو بين 1 و10.
    // نسبة < 1.15 تعني أن الكومة مستقرة في النصف الثاني من الاختبار.
    expect(ratio, `نسبة نمو الكومة (الدورة 10 → الدورة 20)`).toBeLessThan(
      config.maxGrowthRatio10to20
    );
  });
});
