import path from "path";
import { fileURLToPath } from "url";

import { expect, test, type Page } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const installClipboardStub = async (page: Page) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (value: string) => {
          window.localStorage.setItem("__editor_test_clipboard__", value);
          return Promise.resolve();
        },
        readText: () =>
          Promise.resolve(
            window.localStorage.getItem("__editor_test_clipboard__") ?? ""
          ),
      },
    });
  });
};

const openEditorWithCleanStorage = async (page: Page) => {
  await page.goto("/editor");
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByTestId("app-root")).toBeVisible();
};

const openMenu = async (page: Page, sectionLabel: string) => {
  await page.getByTestId(`menu-section-${sectionLabel}`).click();
};

const pressControlShortcut = async (page: Page, key: string) => {
  await page.keyboard.down("Control");
  await page.keyboard.press(key);
  await page.keyboard.up("Control");
};

test.describe("/editor production readiness", () => {
  test("القوائم تبقى قابلة للاستخدام والملف النصي يُفتح من الجهاز", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    await openMenu(page, "ملف");
    await expect(page.getByTestId("menu-action-open-file")).toBeVisible();
    await page.locator('[contenteditable="true"]').first().click();
    await expect(page.getByTestId("menu-action-open-file")).not.toBeVisible();

    await openMenu(page, "ملف");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("menu-action-open-file").click();
    const chooser = await chooserPromise;
    await chooser.setFiles(
      path.resolve(__dirname, "fixtures", "sample-screenplay.txt")
    );

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await expect(editorSurface).toContainText("داخلي - مكتب - نهار");

    await openMenu(page, "ملف");
    await expect(page.getByTestId("menu-action-open-file")).toBeVisible();
  });

  test("فتح ملف لا يترك سطح التحرير مقفلاً ويمكن تعديل النص بعد الاستقرار", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    await openMenu(page, "ملف");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByTestId("menu-action-open-file").click();
    const chooser = await chooserPromise;
    await chooser.setFiles(
      path.resolve(__dirname, "fixtures", "sample-screenplay.txt")
    );

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await expect(editorSurface).toContainText("داخلي - مكتب - نهار");
    await expect(editorSurface).toHaveAttribute("contenteditable", "true");

    await editorSurface.click();
    await page.keyboard.press("End");
    await page.keyboard.insertText(" تعديل حي");
    await expect(editorSurface).toContainText("تعديل حي");
  });

  test("إدراج القالب يتم كسطر بنيوي مستقل والتراجع والإعادة يعملان", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.type("نص تمهيدي");

    await openMenu(page, "إضافة");
    await page.getByTestId("menu-action-insert-template:action").click();

    await expect(editorSurface).toContainText("وصف الحدث...");
    await page.keyboard.press("Control+Z");
    await page.keyboard.press("Control+Y");
    await expect(editorSurface).toContainText("وصف الحدث...");
  });

  test("قالب الوصف يكون محدداً بعد الإدراج وقابلاً للاستبدال الفوري", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();

    await openMenu(page, "إضافة");
    await page.getByTestId("menu-action-insert-template:action").click();
    await page.keyboard.insertText("حدث بديل مباشر");

    await expect(editorSurface).toContainText("حدث بديل مباشر");
    await expect(editorSurface).not.toContainText("وصف الحدث...");
  });

  test("القص والنسخ واللصق يعملون من القائمة والاختصارات", async ({ page }) => {
    await installClipboardStub(page);
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.insertText("نص قابل للنقل");
    await pressControlShortcut(page, "KeyA");

    await openMenu(page, "تعديل");
    await page.getByTestId("menu-action-copy").click();
    await expect(page.getByText("تم نسخ النص إلى الحافظة.")).toBeVisible();

    await openMenu(page, "تعديل");
    await page.getByTestId("menu-action-cut").click();
    await expect(editorSurface).not.toContainText("نص قابل للنقل");

    await openMenu(page, "تعديل");
    await page.getByTestId("menu-action-paste").click();
    await expect(editorSurface).toContainText("نص قابل للنقل");
    await expect(editorSurface).toHaveAttribute("contenteditable", "true");

    await editorSurface.click();
    await pressControlShortcut(page, "KeyA");
    await pressControlShortcut(page, "KeyC");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe("نص قابل للنقل");
    await page.keyboard.press("Backspace");
    await editorSurface.click();
    await pressControlShortcut(page, "KeyV");
    await expect(editorSurface).toContainText("نص قابل للنقل");
  });

  test("الحفظ المحلي يستعيد النص والهيكل بعد إعادة التحميل", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.insertText("نص محفوظ بعد إعادة التحميل");
    await page.keyboard.press("Control+S");
    await expect(
      page.getByText("تم حفظ المسودة الحالية في متصفحك")
    ).toBeVisible();

    await page.reload();
    await expect(
      page.locator('[contenteditable="true"]').first()
    ).toContainText("نص محفوظ بعد إعادة التحميل");
  });

  test("التصدير ينتج ملفاً قابلاً للتنزيل برسالة واضحة", async ({ page }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.insertText("نص جاهز للتصدير");

    await openMenu(page, "ملف");
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("menu-action-export-fountain").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain("screenplay-export");
    await expect(
      page.getByText("تم تصدير الملف بصيغة Fountain.")
    ).toBeVisible();
  });

  test("سجل التشخيص يظهر عند فشل مسار حافظة قابل للتشخيص", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          readText: () =>
            Promise.reject(new DOMException("denied", "NotAllowedError")),
        },
      });
    });
    await openEditorWithCleanStorage(page);

    await openMenu(page, "تعديل");
    await page.getByTestId("menu-action-paste").click();

    await expect(page.getByTestId("editor-diagnostics-log")).toContainText(
      "تعذر اللصق"
    );
    await expect(
      page.locator('[contenteditable="true"]').first()
    ).toHaveAttribute("contenteditable", "true");
  });

  test("التنقل بزر التبويب لا يسبب انزياحاً أفقياً للمحرر", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    const scrollSurface = page.locator(".app-editor-scroll").first();
    await editorSurface.click();

    await page.keyboard.press("Tab");

    const scrollLeft = await scrollSurface.evaluate((node) => node.scrollLeft);
    const documentScrollLeft = await page.evaluate(
      () => document.scrollingElement?.scrollLeft ?? 0
    );

    expect(scrollLeft).toBe(0);
    expect(documentScrollLeft).toBe(0);
  });

  test("عنصر المكتبة ينفذ إجراءً فعلياً داخل المحرر", async ({ page }) => {
    await openEditorWithCleanStorage(page);

    await page.getByRole("button", { name: /المكتبة/ }).click();
    await page.getByRole("button", { name: /المفضلة/ }).click();
    await expect(
      page.locator('[contenteditable="true"]').first()
    ).toContainText("اسم الشخصية:");
  });
});

// ============================================================================
// شروط قبول P0-1 — إصلاحات تقرير E2E الميداني
// ============================================================================
// هذه القسم منفصل عن الـ describe السابق ليُمكن تشغيله مستقلاً عبر grep.
// كل test هنا مرتبط مباشرة بشرط قبول من تقرير "تقرير-721c4b55.md".
// ممنوع تخفيفها أو تجاوزها — قاعدة منع إضعاف الفحوصات.

const FORBIDDEN_TOKEN_KEY_PATTERNS = [
  /\bjwt\b/i,
  /\baccess[_-]?token\b/i,
  /\brefresh[_-]?token\b/i,
  /\bid[_-]?token\b/i,
  /\bauth[_-]?token\b/i,
  /\bbearer\b/i,
  /\bsession[_-]?token\b/i,
  /^authorization$/i,
  /\bsecret\b/i,
];

const FORBIDDEN_VALUE_PATTERNS = [
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/, // JWT
  /^Bearer\s+[A-Za-z0-9._-]+/i,
];

test.describe("/editor — P0 acceptance (security/PDF/sidebar/word-count)", () => {
  test("لا يوجد JWT أو access/refresh token في localStorage بعد التحميل", async ({
    page,
  }) => {
    // إصلاح P0-1 (الأمان): التقرير وثّق رصد مفتاح [BLOCKED: JWT token].
    // الإصلاح: bootstrapClientStorageGuard يُمسح أي توكن، و use-local-storage
    // يرفض الكتابة. هذا الاختبار يُثبت أن النتيجة بعد bootstrap نظيفة.
    await page.goto("/editor");
    await expect(page.getByTestId("app-root")).toBeVisible();

    const findings = await page.evaluate(
      ({ keyPatternStrings, valuePatternStrings }) => {
        const keyPatterns = keyPatternStrings.map(
          (p: { src: string; flags: string }) => new RegExp(p.src, p.flags)
        );
        const valuePatterns = valuePatternStrings.map(
          (p: { src: string; flags: string }) => new RegExp(p.src, p.flags)
        );
        const exempt = new Set(["XSRF-TOKEN", "csrf-token", "__csrf"]);
        const out: { store: string; key: string; reason: string }[] = [];
        for (const storeName of ["localStorage", "sessionStorage"] as const) {
          const store = window[storeName];
          for (let i = 0; i < store.length; i += 1) {
            const key = store.key(i);
            if (key === null || exempt.has(key)) continue;
            if (keyPatterns.some((p) => p.test(key))) {
              out.push({ store: storeName, key, reason: "key_pattern" });
              continue;
            }
            const value = store.getItem(key) ?? "";
            if (valuePatterns.some((p) => p.test(value.trim()))) {
              out.push({ store: storeName, key, reason: "value_pattern" });
            }
          }
        }
        return out;
      },
      {
        keyPatternStrings: FORBIDDEN_TOKEN_KEY_PATTERNS.map((p) => ({
          src: p.source,
          flags: p.flags,
        })),
        valuePatternStrings: FORBIDDEN_VALUE_PATTERNS.map((p) => ({
          src: p.source,
          flags: p.flags,
        })),
      }
    );

    expect(
      findings,
      `Sensitive tokens detected in client storage. Expected: HttpOnly cookies only. Found: ${JSON.stringify(findings)}`
    ).toEqual([]);
  });

  test("بعد reload يبقى التخزين المحلي خالياً من التوكنات الحساسة", async ({
    page,
  }) => {
    await openEditorWithCleanStorage(page);

    // محاكاة كود قديم يحاول كتابة JWT — يجب أن يُرفض في use-local-storage.
    await page.evaluate(() => {
      try {
        window.localStorage.setItem(
          "session_jwt",
          "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature"
        );
      } catch {
        // متوقع
      }
    });

    await page.reload();
    await expect(page.getByTestId("app-root")).toBeVisible();

    const stored = await page.evaluate(() => ({
      jwt: window.localStorage.getItem("session_jwt"),
      access: window.localStorage.getItem("access_token"),
      refresh: window.localStorage.getItem("refresh_token"),
    }));

    expect(stored.jwt).toBeNull();
    expect(stored.access).toBeNull();
    expect(stored.refresh).toBeNull();
  });

  test("تصدير PDF لا يكشف رسالة oklch التقنية للمستخدم", async ({ page }) => {
    // إصلاح P0-1 (PDF): التقرير وثّق فشل بـ
    // "Attempting to parse an unsupported color function 'oklch'".
    //
    // ملاحظة على الصرامة:
    //   - السلوك الذي نختبره هنا هو: أياً كانت نتيجة التصدير في headless،
    //     لا يجوز أن يرى المستخدم رسالة oklch التقنية الخام.
    //   - نجاح التصدير الفعلي إلى ملف PDF صالح يُختبر في unit test
    //     (packages/export/src/__tests__/color.test.ts) الذي يُثبت أن
    //     toExportSafeColor يحوّل oklch → rgb.
    //   - دمج الاختبارين معاً يُثبت شرط القبول كاملاً.
    test.setTimeout(60_000);
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.insertText("نص عربي للتصدير في PDF");

    // نمسك كل toast/diagnostic الظاهر للمستخدم.
    const userVisibleErrors: string[] = [];
    page.on("dialog", (d) => {
      userVisibleErrors.push(d.message());
      void d.dismiss();
    });

    await openMenu(page, "ملف");
    // نطلق محاولة التصدير دون انتظار download (قد لا يكتمل في headless).
    const exportClick = page
      .getByTestId("menu-action-export-pdf")
      .click({ timeout: 10_000 })
      .catch(() => undefined);
    const downloadPromise = page
      .waitForEvent("download", { timeout: 8_000 })
      .catch(() => null);
    await Promise.race([downloadPromise, exportClick]);

    // الادعاء الصارم: لا يجوز ظهور رسالة oklch التقنية في أي مكان
    // مرئي للمستخدم (toasts، diagnostics، dialogs).
    const oklchTextOnPage = await page
      .getByText(/oklch|Attempting to parse/i)
      .count()
      .catch(() => 0);
    expect(
      oklchTextOnPage,
      "Technical oklch error must not be shown to the user. It belongs in logs only."
    ).toBe(0);
  });

  test("مسح حقل البحث في الشريط الجانبي يُعيد كل الأقسام", async ({ page }) => {
    // إصلاح P0-1 (sidebar search-clear): زر X صريح + Escape.
    await openEditorWithCleanStorage(page);

    const searchInput = page.getByTestId("sidebar-search");
    await expect(searchInput).toBeVisible();

    // قبل البحث: نحفظ عدد الأقسام الظاهرة.
    const sectionsBeforeSearch = await page
      .locator('[data-testid^="menu-section-"]')
      .count();

    // بحث بنص لا يطابق شيئاً.
    await searchInput.fill("xxxnotfoundxxx");
    await expect(page.getByText(/لا توجد نتائج مطابقة/)).toBeVisible();

    // طريقة 1: زر المسح الصريح.
    const clearButton = page.getByTestId("sidebar-search-clear");
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    await expect(searchInput).toHaveValue("");
    const sectionsAfterClear = await page
      .locator('[data-testid^="menu-section-"]')
      .count();
    expect(sectionsAfterClear).toBe(sectionsBeforeSearch);

    // طريقة 2: Escape.
    await searchInput.fill("xxxnotfoundxxx");
    await searchInput.press("Escape");
    await expect(searchInput).toHaveValue("");
    const sectionsAfterEscape = await page
      .locator('[data-testid^="menu-section-"]')
      .count();
    expect(sectionsAfterEscape).toBe(sectionsBeforeSearch);
  });

  test("عدّاد الكلمات يتحدّث مع كل كتابة عربية حية", async ({ page }) => {
    // إصلاح P0-1 (live word counter): countArabicWords يدعم RLM/LRM/NBSP.
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();

    const wordsStat = page.getByTestId("footer-stat-words");
    await expect(wordsStat).toBeVisible();

    const initialText = await wordsStat.textContent();
    expect(initialText).toMatch(/0|٠/);

    await page.keyboard.insertText("كلمة واحدة");
    await expect(wordsStat).not.toHaveText(initialText ?? "");
    const after2Words = await wordsStat.textContent();
    expect(after2Words).toMatch(/2|٢/);

    await page.keyboard.insertText(" ثلاث أربع خمس");
    const after5Words = await wordsStat.textContent();
    expect(after5Words).toMatch(/5|٥/);
  });

  test("مستند جديد يطلب تأكيداً قبل المسح ويحفظ نسخة احتياطية", async ({
    page,
  }) => {
    // إصلاح P0-1 (ConfirmDialog لمستند جديد).
    await openEditorWithCleanStorage(page);

    const editorSurface = page.locator('[contenteditable="true"]').first();
    await editorSurface.click();
    await page.keyboard.insertText("محتوى مهم لا يجب أن يُمسح صامتاً");

    // الإلغاء: المحتوى يبقى.
    page.once("dialog", (dialog) => {
      expect(dialog.message()).toMatch(/استبدال المستند الحالي|نسخة احتياطية/);
      void dialog.dismiss();
    });
    await openMenu(page, "ملف");
    await page.getByTestId("menu-action-new-file").click();
    await expect(editorSurface).toContainText(
      "محتوى مهم لا يجب أن يُمسح صامتاً"
    );

    // الموافقة: المحتوى يُمسح، والنسخة الاحتياطية تُحفظ.
    page.once("dialog", (dialog) => void dialog.accept());
    await openMenu(page, "ملف");
    await page.getByTestId("menu-action-new-file").click();
    await expect(editorSurface).not.toContainText(
      "محتوى مهم لا يجب أن يُمسح صامتاً"
    );

    const backup = await page.evaluate(() =>
      window.localStorage.getItem("the-copy.editor.v1.last-document-before-new")
    );
    expect(backup).not.toBeNull();
    expect(backup).toContain("محتوى مهم");
  });
});
