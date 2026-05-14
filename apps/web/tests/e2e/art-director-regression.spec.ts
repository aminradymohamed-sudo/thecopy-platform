import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "the-copy.art-director.state.v1";
const CLEAR_MARKER = "__art_director_regression_cleared";

async function prepareArtDirectorPage(page: Page) {
  await page.route("**/api/app-state/art-director", async (route) => {
    const request = route.request();

    if (request.method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: null,
          updatedAt: new Date(0).toISOString(),
        }),
      });
      return;
    }

    if (request.method() === "PUT") {
      const payload = request.postDataJSON() as { data?: unknown };
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: payload.data ?? null,
          updatedAt: new Date().toISOString(),
        }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.addInitScript(
    ({ storageKey, marker }) => {
      if (window.sessionStorage.getItem(marker)) return;

      window.localStorage.removeItem(storageKey);
      window.sessionStorage.setItem(marker, "1");
    },
    { storageKey: STORAGE_KEY, marker: CLEAR_MARKER }
  );
}

async function openTools(page: Page) {
  await page.goto("/art-director?tab=tools", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await expect(page.getByRole("heading", { name: "جميع الأدوات" })).toBeVisible(
    { timeout: 20000 }
  );
}

async function selectCreativeInspiration(page: Page) {
  await page
    .getByRole("button", { name: /المساعد الإبداعي للإلهام البصري/ })
    .click();
  await expect(page.getByRole("heading", { name: "المدخلات" })).toBeVisible();
}

async function fillCreativeInspiration(page: Page, description: string) {
  await page.getByLabel("وصف المشهد").fill(description);
  await page.getByLabel("المزاج").selectOption("dramatic");
  await page.getByLabel("الحقبة").fill("الثمانينيات");
}

test.describe("Art Director regressions", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await prepareArtDirectorPage(page);
  });

  test("يرفض التنفيذ الفارغ برسائل تحقق ولا يرسل الطلب", async ({ page }) => {
    let calls = 0;
    await page.route(
      "**/api/art-director/inspiration/analyze",
      async (route) => {
        calls += 1;
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: {} }),
        });
      }
    );

    await openTools(page);
    await selectCreativeInspiration(page);
    await page.getByRole("button", { name: "تنفيذ" }).click();

    await expect(
      page.getByText("أكمل الحقول المطلوبة قبل التنفيذ.")
    ).toBeVisible();
    await expect(page.getByText("يرجى إدخال وصف المشهد.")).toBeVisible();
    await expect(page.getByLabel("وصف المشهد")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(calls).toBe(0);
  });

  test("يعرض نتيجة منطقية ويحفظ مدخل الأداة بعد إعادة التحميل", async ({
    page,
  }) => {
    await page.route(
      "**/api/art-director/inspiration/analyze",
      async (route) => {
        await route.abort();
      }
    );

    const description = "مشهد اختبار في شارع ممطر بإضاءة نيون وديكور قديم";

    await openTools(page);
    await selectCreativeInspiration(page);
    await fillCreativeInspiration(page, description);
    await page.getByRole("button", { name: "تنفيذ" }).click();

    await expect(page.getByText("نجح التنفيذ")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("باليت سينمائي عملي")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((storageKey) => {
          const raw = window.localStorage.getItem(storageKey);
          return raw?.includes("شارع ممطر") ?? false;
        }, STORAGE_KEY)
      )
      .toBe(true);

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "جميع الأدوات" })
    ).toBeVisible();
    await expect(page.getByLabel("وصف المشهد")).toHaveValue(description);
  });

  test("يدعم التنقل بلوحة المفاتيح ويظهر تركيزاً مرئياً", async ({ page }) => {
    await openTools(page);

    const toolsTab = page.getByRole("tab", { name: "جميع الأدوات" });
    await toolsTab.focus();
    await expect(toolsTab).toBeFocused();

    const focusStyle = await toolsTab.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      };
    });
    expect(focusStyle.outlineStyle).not.toBe("none");
    expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(
      3
    );

    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("tab", { name: "الإلهام البصري" })
    ).toHaveAttribute("aria-selected", "true");

    await page.getByRole("tab", { name: "جميع الأدوات" }).focus();
    await page.keyboard.press("Enter");
    await selectCreativeInspiration(page);
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("button", { name: /منسّق المواقع/ })
    ).toBeFocused();
  });

  test("يحافظ على تباين حالة النجاح ويحمي ملفات الارتباط الحساسة", async ({
    page,
    context,
  }) => {
    await page.route(
      "**/api/art-director/inspiration/analyze",
      async (route) => {
        await route.abort();
      }
    );

    await openTools(page);
    await selectCreativeInspiration(page);
    await fillCreativeInspiration(
      page,
      "مشهد تحقق أمني مع قاعة واسعة وألوان متباينة"
    );
    await page.getByRole("button", { name: "تنفيذ" }).click();
    const status = page.locator(".art-result-status.success");
    await expect(status).toBeVisible({ timeout: 15000 });

    const ratio = await status.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const parseRgb = (value: string): [number, number, number] => {
        const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value);
        if (!match) return [0, 0, 0];
        return [
          Number(match[1] ?? 0),
          Number(match[2] ?? 0),
          Number(match[3] ?? 0),
        ];
      };
      const luminance = ([r, g, b]: [number, number, number]) => {
        const toLinear = (channel: number) => {
          const value = channel / 255;
          return value <= 0.03928
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4);
        };
        const red = toLinear(r);
        const green = toLinear(g);
        const blue = toLinear(b);
        return red * 0.2126 + green * 0.7152 + blue * 0.0722;
      };
      const foreground = luminance(parseRgb(style.color));
      const background = luminance(parseRgb(style.backgroundColor));
      const lighter = Math.max(foreground, background);
      const darker = Math.min(foreground, background);
      return (lighter + 0.05) / (darker + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(4.5);

    const cookies = await context.cookies();
    const unsafeSensitiveCookies = cookies.filter(
      (cookie) =>
        /(token|auth|session|jwt|xsrf|csrf)/i.test(cookie.name) &&
        !cookie.httpOnly
    );
    expect(unsafeSensitiveCookies).toEqual([]);
  });

  test("ينفذ التراجع داخل المدخل الطويل دون بطء مفرط", async ({ page }) => {
    await openTools(page);
    await selectCreativeInspiration(page);

    const input = page.getByLabel("وصف المشهد");
    await input.fill("س".repeat(5000));
    await input.focus();

    const startedAt = Date.now();
    for (let index = 0; index < 100; index += 1) {
      await page.keyboard.press("ControlOrMeta+Z");
    }
    const duration = Date.now() - startedAt;

    await expect(input).not.toHaveValue("س".repeat(5000));
    expect(duration).toBeLessThan(5000);
  });
});
