import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

async function ensureArtifactDir(): Promise<string> {
  const artifactDir = path.resolve(
    process.cwd(),
    "..",
    "..",
    "output",
    "playwright",
    "budget-runtime"
  );
  await mkdir(artifactDir, { recursive: true });
  return artifactDir;
}

async function clearBudgetState(
  baseURL: string,
  request: APIRequestContext
): Promise<void> {
  const readResponse = await request.get(`${baseURL}/api/app-state/BUDGET`);
  const setCookie = readResponse
    .headersArray()
    .find((header) => header.name.toLowerCase() === "set-cookie")?.value;

  if (!setCookie) {
    return;
  }

  const cookie = setCookie.split(";")[0] ?? "";
  const token = cookie.split("=")[1] ?? "";

  if (!token) {
    return;
  }

  await request.delete(`${baseURL}/api/app-state/BUDGET`, {
    headers: {
      Cookie: cookie,
      Origin: baseURL,
      "X-XSRF-TOKEN": token,
    },
  });
}

async function gotoReadyBudgetPage(page: Page, baseURL: string): Promise<void> {
  await page.goto(`${baseURL}/BUDGET`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByTestId("budget-title-input")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("budget-scenario-input")).toBeVisible();
  await expect(page.getByTestId("budget-generate-button")).toBeVisible();
}

test.describe("budget runtime", () => {
  test.describe.configure({ mode: "serial" });
  // ØªØ¹Ù„ÙŠÙ‚ Ø¹Ø±Ø¨ÙŠ: Ù‡Ø°Ø§ Ø§Ù„Ù…Ø³Ø§Ø± ÙŠØ´ØºÙ‘Ù„ ØªÙˆÙ„ÙŠØ¯Ù‹Ø§ Ø­ÙŠÙ‹Ø§ ÙˆØªØµØ¯ÙŠØ±Ù‹Ø§ ÙØ¹Ù„ÙŠÙ‹Ø§ Ø«Ù… ÙŠØªØ­Ù‚Ù‚ Ù…Ù† Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø©ØŒ
  // ÙˆØªØ­Øª Ø§Ù„Ø­Ù…Ù„ Ø§Ù„Ù…ÙˆØ§Ø²ÙŠ Ù„Ù„Ù…Ø¬Ù…ÙˆØ¹Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø© Ù‚Ø¯ ÙŠØªØ¬Ø§ÙˆØ² 180 Ø«Ø§Ù†ÙŠØ© Ø±ØºÙ… Ù†Ø¬Ø§Ø­Ù‡ Ø§Ù„Ø³Ù„ÙˆÙƒÙŠ.
  test.setTimeout(300_000);

  test("ÙŠÙ†Ø´Ø¦ Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ© ÙˆÙŠØµØ¯Ø±Ù‡Ø§ ÙˆÙŠØ³ØªØ¹ÙŠØ¯Ù‡Ø§ Ø¨Ø¹Ø¯ Ø§Ù„ØªØ­Ø¯ÙŠØ«", async ({
    page,
    request,
    context,
    baseURL,
    browserName,
  }, testInfo) => {
    const resolvedBaseURL = baseURL ?? "http://127.0.0.1:6080";
    const artifactDir = await ensureArtifactDir();
    const shouldCollectManualTrace =
      browserName === "chromium" && testInfo.retry === 0;
    let manualTraceStarted = false;

    await clearBudgetState(resolvedBaseURL, request);
    if (shouldCollectManualTrace) {
      await context.tracing.start({ screenshots: true, snapshots: true });
      manualTraceStarted = true;
    }

    try {
      await gotoReadyBudgetPage(page, resolvedBaseURL);

      await page
        .getByTestId("budget-title-input")
        .fill("Ù…Ø·Ø§Ø±Ø¯Ø© Ø§Ù„ÙƒÙˆØ±Ù†ÙŠØ´");
      await page
        .getByTestId("budget-scenario-input")
        .fill(
          "Ù…Ø´Ù‡Ø¯ Ù…Ø·Ø§Ø±Ø¯Ø© Ø³ÙŠØ§Ø±Ø§Øª Ù†Ù‡Ø§Ø±ÙŠØ© ÙÙŠ Ø´Ø§Ø±Ø¹ÙŠÙ† Ù…Ø¹ Ø¨Ø·Ù„ÙŠÙ’Ù† ÙˆÙ…Ø´Ù‡Ø¯ Ø§Ù†ÙØ¬Ø§Ø± ÙˆØ§Ø­Ø¯ ÙˆØ«Ù„Ø§Ø«Ø© Ø£ÙŠØ§Ù… ØªØµÙˆÙŠØ±."
        );

      const generateButton = page.getByTestId("budget-generate-button");
      const generationResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/budget/generate") &&
          response.request().method() === "POST"
      );

      // ØªØ¹Ù„ÙŠÙ‚ Ø¹Ø±Ø¨ÙŠ: Ù†Ù„ØªÙ‚Ø· Ø­Ø§Ù„Ø© "Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°" ÙÙˆØ± Ø§Ù„Ù†Ù‚Ø± Ø¯ÙˆÙ† Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø³ØªØ¬Ø§Ø¨Ø©
      // Ø§Ù„Ø´Ø¨ÙƒØ©. setGenerating(true) ÙŠÙÙ†ÙÙ‘Ø° Ù…ØªØ²Ø§Ù…Ù†Ù‹Ø§ Ù‚Ø¨Ù„ Ø£ÙŠ await ÙÙŠ Ø§Ù„Ù€ handlerØŒ
      // Ù„Ø°Ø§ React ÙŠÙ„ØªØ²Ù…Ù‡Ø§ Ù‚Ø¨Ù„ Ø£Ù† ÙŠØ¹ÙˆØ¯ ØªÙ†ÙÙŠØ° Ø§Ù„Ù€ click promise. Ù†Ù‚Ø±Ø£ Ø§Ù„Ø³Ù…ØªÙŠÙ†
      // disabled Ùˆ aria-busy Ù…Ø¨Ø§Ø´Ø±Ø© Ø¨Ø¹Ø¯ click Ø¨Ø¯Ù„Ù‹Ø§ Ù…Ù† Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¹Ù„Ù‰ polling
      // Ø§Ù„Ø°ÙŠ Ù‚Ø¯ ÙŠÙÙˆÙ‘Øª Ø§Ù„Ù†Ø§ÙØ°Ø© Ø¹Ù†Ø¯ Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø´Ø¯ÙŠØ¯Ø© Ø§Ù„Ø³Ø±Ø¹Ø©.
      await generateButton.click();
      const inFlightSnapshot = await generateButton.evaluate(
        (node: HTMLButtonElement) => ({
          disabled: node.disabled,
          ariaBusy: node.getAttribute("aria-busy"),
        })
      );
      expect(inFlightSnapshot.disabled).toBe(true);
      expect(inFlightSnapshot.ariaBusy).toBe("true");

      const generationResponse = await generationResponsePromise;
      expect(generationResponse.status()).toBe(200);
      const generationPayload = (await generationResponse.json()) as {
        success: boolean;
        data: {
          meta: { source: string };
          budget: { grandTotal: number };
        };
      };

      expect(generationPayload.success).toBe(true);
      expect(["ai", "fallback"]).toContain(generationPayload.data.meta.source);
      expect(generationPayload.data.budget.grandTotal).toBeGreaterThan(0);

      // ØªØ¹Ù„ÙŠÙ‚ Ø¹Ø±Ø¨ÙŠ: Ù„Ø§ Ù†Ø¹ØªØ¨Ø± Ø§Ù„ØªØºÙŠÙŠØ± Ø§Ù„Ø´ÙƒÙ„ÙŠ Ù†Ø¬Ø§Ø­Ù‹Ø§ Ø¥Ù„Ø§ Ø¨Ø¹Ø¯ Ø¸Ù‡ÙˆØ± Ù†Ø§ØªØ¬ Ù…ÙŠØ²Ø§Ù†ÙŠØ© ÙØ¹Ù„ÙŠ Ù‚Ø§Ø¨Ù„ Ù„Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù….
      await expect(page.getByTestId("budget-grand-total")).not.toHaveText(
        "â€”"
      );
      await expect(page.getByText("Ù…ØµØ¯Ø± Ø§Ù„ØªÙˆÙ„ÙŠØ¯")).toBeVisible();

      const fallbackBanner = page.getByTestId("budget-fallback-banner");
      if (generationPayload.data.meta.source === "fallback") {
        await expect(fallbackBanner).toBeVisible();
      } else {
        await expect(fallbackBanner).toHaveCount(0);
      }

      await page.screenshot({
        path: path.join(artifactDir, "budget-success.png"),
        fullPage: true,
      });

      const downloadPromise = page.waitForEvent("download");
      await page.getByTestId("budget-export-button").click();
      const download = await downloadPromise;
      await download.saveAs(path.join(artifactDir, "budget-export.xlsx"));

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("budget-title-input")).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByTestId("budget-title-input")).toHaveValue(
        "Ù…Ø·Ø§Ø±Ø¯Ø© Ø§Ù„ÙƒÙˆØ±Ù†ÙŠØ´"
      );
      await expect(page.getByTestId("budget-grand-total")).not.toHaveText(
        "â€”"
      );
      await expect(page.getByTestId("budget-persisted-at")).toContainText(
        "Ø¢Ø®Ø± Ø­ÙØ¸"
      );
    } finally {
      if (manualTraceStarted) {
        try {
          await context.tracing.stop({
            path: path.join(artifactDir, "budget-success-trace.zip"),
          });
        } catch (error) {
          if (!String(error).includes("has been closed")) {
            console.warn("budget trace stop failed", error);
          }
        }
      }
    }
  });

  test("ÙŠØ¹Ø±Ø¶ Ø®Ø·Ø£ ÙˆØ§Ø¶Ø­Ø§Ù‹ Ø¹Ù†Ø¯ Ù…Ø­Ø§ÙˆÙ„Ø© Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡ Ø¨Ø¯ÙˆÙ† Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ", async ({
    page,
    request,
    baseURL,
  }) => {
    const resolvedBaseURL = baseURL ?? "http://127.0.0.1:6080";
    const artifactDir = await ensureArtifactDir();

    await clearBudgetState(resolvedBaseURL, request);

    await gotoReadyBudgetPage(page, resolvedBaseURL);

    await page
      .getByTestId("budget-title-input")
      .fill("Ø§Ø®ØªØ¨Ø§Ø± Ø¨Ù„Ø§ Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ");
    await page.getByTestId("budget-generate-button").click();

    await expect(page.getByTestId("budget-error-alert")).toContainText(
      "Ø£Ø¯Ø®Ù„ Ø§Ù„Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ Ø£ÙˆÙ„Ø§Ù‹ Ù„Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ©."
    );
    await expect(page.getByTestId("budget-summary-empty")).toContainText(
      "Ù„Ù… ØªÙÙ†Ø´Ø£ Ø§Ù„Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ø¨Ø¹Ø¯."
    );

    await page.screenshot({
      path: path.join(artifactDir, "budget-validation-error.png"),
      fullPage: true,
    });
  });
});
