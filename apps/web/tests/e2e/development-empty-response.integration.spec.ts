import { expect, test } from "@playwright/test";

/**
 * E2E-5 â€” development /api/execute (P0-5 acceptance)
 *
 * ÙŠÙØ«Ø¨Øª Ø¥ØµÙ„Ø§Ø­ P0-5: empty response Ù„Ø§ ÙŠÙ…Ø± ÙƒÙ†Ø¬Ø§Ø­.
 *
 * Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…ØªØ£Ø«Ø±:
 *   apps/web/src/app/api/development/execute/route.ts
 *
 * Ø§Ù„ØªØºÙŠÙŠØ± Ø§Ù„Ø¬ÙˆÙ‡Ø±ÙŠ:
 *   - Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ assertModelTextNotEmpty Ù„Ù…Ù†Ø¹ Ù†Øµ ÙØ§Ø±Øº.
 *   - Ø§Ø³ØªØ¨Ø¯Ø§Ù„ 500 Ø®Ø§Ù… Ø¨Ù€ ApiError Ù…ØµÙ†Ù‘Ù.
 *   - Ø¹Ù‚Ø¯ ApiResponse Ø§Ù„Ù…ÙˆØ­Ø¯.
 */

const BASE_URL = (
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`
).replace(/\/+$/, "");

const ENDPOINT = "/api/development/execute";

test.describe("/api/development/execute â€” empty response prevention", () => {
  test("Ù†Øµ Ù‚ØµÙŠØ± Ø¬Ø¯Ø§Ù‹ ÙŠØ±Ø¬Ù‘Ø¹ 400 Ù„Ø§ 500", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: { taskId: "completion", originalText: "Ù‚ØµÙŠØ±" },
      failOnStatusCode: false,
    });

    expect(response.status()).not.toBe(500);
    expect(response.status()).toBe(400);
  });

  test("Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© ØªØªØ¨Ø¹ Ø´ÙƒÙ„Ø§Ù‹ Ù…ÙˆØ­Ø¯Ø§Ù‹ ÙˆÙ„Ø§ ØªÙƒØ´Ù stack", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: { taskId: "completion", originalText: "" },
      failOnStatusCode: false,
    });

    const text = await response.text();
    expect(text).not.toMatch(/at .*\.ts:\d+:\d+/);
    expect(text).not.toContain("TypeError");
  });

  test("GET ÙŠÙØ±Ø¬Ø¹ ÙˆØµÙ Ø§Ù„Ø®Ø¯Ù…Ø© (ÙŠØ«Ø¨Øª Ø£Ù† Ø§Ù„Ù…Ø³Ø§Ø± Ø­ÙŠÙ‘ ÙˆÙ…Ø³ØªØ¬ÙŠØ¨)", async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}${ENDPOINT}`, {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      success?: boolean;
      data?: { service?: string; tasksSupported?: number };
    };
    expect(body.success).toBe(true);
    expect(body.data?.service).toBe("development-execute");
    expect(body.data?.tasksSupported).toBe(27);
  });

  test("Ø§Ù„Ù†Øµ Ø§Ù„ØµØ§Ù„Ø­: Ø¹Ù†Ø¯ ØºÙŠØ§Ø¨ Ù…ÙØªØ§Ø­ API ÙŠØ±Ø¬Ù‘Ø¹ 503 Ù„Ø§ 500", async ({
    request,
  }) => {
    // Ø¥Ø°Ø§ ÙƒØ§Ù† GEMINI_API_KEY ØºÙŠØ± Ù…Ù‡ÙŠÙ‘Ø£ØŒ Ø§Ù„Ù€ route ÙŠÙƒØ´Ù Ø°Ù„Ùƒ ÙˆÙŠØ±Ø¬Ù‘Ø¹ 503.
    // Ø¥Ø°Ø§ ÙƒØ§Ù† Ù…Ù‡ÙŠÙ‘Ø£ØŒ Ø§Ù„Ù€ test ÙŠÙ‚Ø¨Ù„ Ø£ÙŠØ¶Ø§Ù‹ 200 (Ù†Ø¬Ø§Ø­ ÙØ¹Ù„ÙŠ Ù…Ø¹ Ù†ØªÙŠØ¬Ø© ØºÙŠØ± ÙØ§Ø±ØºØ©).
    const longText =
      "Ù‡Ø°Ø§ Ù†Øµ Ø§Ø®ØªØ¨Ø§Ø± Ø·ÙˆÙŠÙ„ ÙŠÙƒÙÙŠ Ù„ØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰. ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ Ø¹Ø¯Ø© Ø¬Ù…Ù„ Ø¹Ø±Ø¨ÙŠØ©. " +
      "ÙˆÙŠØªØ¬Ø§ÙˆØ² Ø¹Ø´Ø±ÙŠÙ† Ø­Ø±ÙØ§Ù‹ Ø¨ÙƒØ«ÙŠØ± Ù„ÙŠØªÙ…ÙƒÙ† Ù…Ù† Ø§Ù„Ù…Ø±ÙˆØ± Ø¨Ù…Ø±Ø­Ù„Ø© validation.";

    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: { taskId: "completion", originalText: longText },
      failOnStatusCode: false,
    });

    expect(response.status()).not.toBe(500);
    // Ø¥Ù…Ø§ 503 (Ù…ÙØªØ§Ø­ ØºÙŠØ± Ù…ØªÙˆÙØ±) Ø£Ùˆ 200 (Ù†Ø¬Ø§Ø­) Ø£Ùˆ 502 (model_empty Ø§Ù„Ù…ØµÙ†Ù‘Ù).
    expect([200, 502, 503]).toContain(response.status());

    if (response.status() === 200) {
      // Ø¥Ø°Ø§ Ù†Ø¬Ø­ØŒ ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ content ÙØ¹Ù„ÙŠ (Ù„ÙŠØ³ ÙØ§Ø±ØºØ§Ù‹).
      const body = (await response.json()) as {
        ok?: boolean;
        data?: { finalDecision?: string };
        success?: boolean;
        result?: { finalDecision?: string };
      };
      const text = body.data?.finalDecision ?? body.result?.finalDecision ?? "";
      expect(text.trim().length).toBeGreaterThan(0);
    }

    if (response.status() === 502) {
      // model_empty Ù…ØµÙ†Ù‘Ù ØµØ­ÙŠØ­.
      const body = (await response.json()) as {
        ok?: boolean;
        error?: { code?: string };
      };
      expect(body.ok).toBe(false);
      expect(body.error?.code).toBe("model_empty");
    }
  });
});
