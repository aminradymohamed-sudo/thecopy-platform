import { expect, test } from "@playwright/test";

const route = "/arabic-prompt-engineering-studio";
const snapshotStorageKey = "the-copy.prompt-studio.snapshot";

async function openStudio(page: import("@playwright/test").Page) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page
    .waitForLoadState("networkidle", { timeout: 20_000 })
    .catch((error: unknown) => {
      void error;
    });
  await expect(
    page.getByRole("heading", { name: "استوديو هندسة التوجيهات العربي" })
  ).toBeVisible();
}

async function fillPrompt(
  page: import("@playwright/test").Page,
  value: string
) {
  const prompt = page.getByPlaceholder(/اكتب توجيهك هنا/);
  await prompt.fill(value);
  await expect(prompt).toHaveValue(value);
  return prompt;
}

test.describe("استوديو هندسة التوجيهات العربي", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => {
      if (window.name === "prompt-studio-remediation-seeded") {
        return;
      }

      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(
        key,
        JSON.stringify({
          prompt: "",
          analysis: null,
          activeTab: "editor",
          selectedTemplate: null,
          templateVariables: {},
          promptHistory: [],
          comparePrompt1: "",
          comparePrompt2: "",
          comparisonResult: null,
          labInput: "",
          labResult: null,
          suggestions: [],
        })
      );
      window.name = "prompt-studio-remediation-seeded";
    }, snapshotStorageKey);
  });

  test("يعالج إخفاقات الوصولية والحفظ والتبويبات والتجاوب", async ({
    page,
  }) => {
    const responses: string[] = [];
    page.on("response", (response) => {
      responses.push(`${response.status()} ${response.url()}`);
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await openStudio(page);

    await expect(page.locator("main")).toHaveCount(1);

    const unnamedButtons = await page.evaluate(() =>
      Array.from(document.querySelectorAll("button,[role='button']"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        })
        .filter((element) => {
          const labelledBy = element.getAttribute("aria-labelledby");
          const labelledText = labelledBy
            ? labelledBy
                .split(/\s+/)
                .map((id) => document.getElementById(id)?.innerText ?? "")
                .join(" ")
                .trim()
            : "";
          const names = [
            element.textContent?.trim() ?? "",
            element.getAttribute("aria-label") ?? "",
            element.getAttribute("title") ?? "",
            labelledText,
          ];

          return names.every((name) => !name.trim());
        })
        .map((element) => element.outerHTML)
    );
    expect(unnamedButtons).toEqual([]);

    const prompt = await fillPrompt(
      page,
      "اكتب خطة عربية واضحة لتسويق فيلم قصير مع جمهور مستهدف ومخرجات محددة"
    );
    await prompt.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
    const selection = await prompt.evaluate((element) => ({
      start: (element as HTMLTextAreaElement).selectionStart,
      end: (element as HTMLTextAreaElement).selectionEnd,
      length: (element as HTMLTextAreaElement).value.length,
    }));
    expect(selection.start).toBe(0);
    expect(selection.end).toBe(selection.length);

    await page.getByRole("button", { name: "تحليل التوجيه" }).click();
    await expect(
      page.getByRole("heading", { name: "تفاصيل التقييم" })
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("heading", { name: "نقاط القوة" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "نقاط الضعف" })
    ).toBeVisible();

    await page.getByRole("tab", { name: "القوالب" }).click();
    await expect(
      page.getByRole("heading", { name: "كتابة إبداعية عربية" })
    ).toBeVisible();
    await page
      .getByRole("button", { name: /استخدام قالب/ })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "تطبيق القالب" })
    ).toBeVisible();
    await page.getByLabel("الموضوع الرئيسي للنص").fill("مشهد افتتاحي");
    await page.getByRole("button", { name: "تطبيق القالب" }).click();
    await expect(page.getByPlaceholder(/اكتب توجيهك هنا/)).toHaveValue(
      /مشهد افتتاحي/
    );

    await page.getByRole("tab", { name: "المقارنة" }).click();
    await page
      .getByLabel("التوجيه الأول")
      .fill("اكتب وصفًا موجزًا لشخصية رئيسية");
    await page
      .getByLabel("التوجيه الثاني")
      .fill("اكتب وصفًا موجزًا لشخصية رئيسية مع العمر والدافع والنبرة");
    await page.getByRole("button", { name: "قارن التوجيهين" }).click();
    await expect(
      page.getByRole("heading", { name: "نتيجة المقارنة" })
    ).toBeVisible();
    await expect(page.getByText(/الفائز|تعادل/)).toBeVisible();
    await expect(page.getByText("الفروق")).toBeVisible();

    await page.getByRole("tab", { name: "السجل" }).click();
    await expect(
      page.getByRole("heading", { name: "آخر التحليلات" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /استعادة/ })).toBeVisible();

    await page.getByRole("tab", { name: "المختبر" }).click();
    await page.getByLabel("نص الاختبار").fill("اكتب مخرجات منظمة عن فكرة مشهد");
    await page.getByRole("button", { name: "تشغيل الاختبار" }).click();
    await expect(
      page.getByRole("heading", { name: "نتيجة المختبر" })
    ).toBeVisible();
    await expect(page.getByText(/درجة الجودة/)).toBeVisible();

    const stableText = `نص محفوظ ${Date.now()}`;
    await page.getByRole("tab", { name: "المحرر" }).click();
    await fillPrompt(page, stableText);
    await page.waitForTimeout(700);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .waitForLoadState("networkidle", { timeout: 20_000 })
      .catch((error: unknown) => {
        void error;
      });
    await expect(page.getByPlaceholder(/اكتب توجيهك هنا/)).toHaveValue(
      stableText
    );

    const sensitiveStorage = await page.evaluate(() => {
      const suspicious: string[] = [];
      const keyPattern =
        /password|secret|private_key|credit|token|auth|session/i;
      const valuePattern =
        /\b(?:bearer\s+[a-z0-9._-]+|access[_-]?token|refresh[_-]?token|id[_-]?token|auth[_-]?token|session[_-]?token|jwt|password|secret|private_key|credit)\b/i;
      for (const storage of [localStorage, sessionStorage]) {
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i) ?? "";
          const value = storage.getItem(key) ?? "";
          if (keyPattern.test(key) || valuePattern.test(value)) {
            suspicious.push(key);
          }
        }
      }
      return suspicious;
    });
    expect(sensitiveStorage).toEqual([]);

    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByPlaceholder(/اكتب توجيهك هنا/)).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 4
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByPlaceholder(/اكتب توجيهك هنا/).fill("");
    await page.getByPlaceholder(/اكتب توجيهك هنا/).click();
    await page.keyboard.type("س".repeat(100), { delay: 0 });
    const undoStartedAt = Date.now();
    for (let i = 0; i < 100; i += 1) {
      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+Z" : "Control+Z"
      );
    }
    expect(Date.now() - undoStartedAt).toBeLessThan(5_000);

    await page.waitForTimeout(5_000);
    expect(responses.length).toBeLessThan(80);
  });
});
