import { expect, test } from "@playwright/test";

const DECOUPAGE_PATH = "/directors-studio/decoupage";

test.describe("decoupage smoke", () => {
  test("page renders without runtime exception and shows core controls", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(DECOUPAGE_PATH, { waitUntil: "domcontentloaded" });

    // العنوان الرئيسي
    await expect(page.getByRole("heading", { name: /DÉCOUPAGE/i })).toBeVisible(
      { timeout: 15_000 }
    );

    // أزرار الأوضاع — يجب أن تظهر 11 وضعًا
    const modeButtons = page.locator("button", {
      hasText: /^\d{2}/,
    });
    await expect(modeButtons.first()).toBeVisible({ timeout: 15_000 });

    // زر «بدء سير عمل DÉCOUPAGE»
    await expect(
      page.getByRole("button", { name: /بدء سير عمل/i })
    ).toBeVisible({ timeout: 15_000 });

    // textarea النص المصدر
    await expect(
      page.getByPlaceholder("أدخل النص الدرامي أو وصف المشهد...")
    ).toBeVisible({ timeout: 15_000 });

    // عدم وجود استثناءات runtime
    expect(consoleErrors).toEqual([]);
  });
});
