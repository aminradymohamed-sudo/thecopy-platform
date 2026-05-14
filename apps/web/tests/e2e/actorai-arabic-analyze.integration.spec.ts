import { expect, test } from "@playwright/test";

/**
 * E2E-4 â€” actorai-arabic /api/analyze-script (P0-4 acceptance)
 *
 * ÙŠÙØ«Ø¨Øª Ø¥ØµÙ„Ø§Ø­ P0-4: Ø§Ù„Ù€ endpoint Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ù…ÙˆØ¬ÙˆØ¯ ÙˆÙ…ØªØ³Ù‚ Ù…Ø¹ Ø¹Ù‚Ø¯ ApiResponse:
 *   { ok: true,  data: {...}, meta: { requestId, durationMs } }
 *   { ok: false, error: { code, message, requestId } }
 *
 * Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…ÙØ¶Ø§Ù:
 *   apps/web/src/app/api/actorai-arabic/analyze-script/route.ts
 *
 * Ø´Ø±ÙˆØ· Ø§Ù„Ù‚Ø¨ÙˆÙ„ Ø§Ù„Ù…ÙØ®ØªØ¨Ø±Ø©:
 *   - validation_error Ø¹Ù†Ø¯ Ù†Øµ ÙØ§Ø±Øº.
 *   - validation_error Ø¹Ù†Ø¯ Ø¬Ø³Ù… ØºÙŠØ± ØµØ§Ù„Ø­.
 *   - Ø±Ø³Ø§Ø¦Ù„ Ø¹Ø±Ø¨ÙŠØ© Ù…ØµÙ†Ù‘ÙØ©ØŒ Ù„Ø§ 500 Ø®Ø§Ù….
 *   - Ø±Ø¯ ÙŠÙ†Ø·Ø¨Ù‚ Ø¹Ù„Ù‰ ApiResponse contract.
 */

const BASE_URL = (
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`
).replace(/\/+$/, "");

const ENDPOINT = "/api/actorai-arabic/analyze-script";

test.describe("/api/actorai-arabic/analyze-script â€” contract", () => {
  test("Ù†Øµ ÙØ§Ø±Øº ÙŠØ±Ø¬Ù‘Ø¹ validation_error Ø¨Ù€ 422 Ù„Ø§ 500", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: { scriptText: "", language: "ar" },
      failOnStatusCode: false,
    });

    expect(response.status()).not.toBe(500);
    expect([422, 400]).toContain(response.status());

    const body = (await response.json()) as {
      ok: boolean;
      error?: { code: string; message: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error).toBeDefined();
    expect(body.error?.code).toBe("validation_error");
    expect(body.error?.message).toMatch(
      /Ù…Ø·Ù„ÙˆØ¨|Ø§Ù„Ø­Ù‚Ù„|ØºÙŠØ± ØµØ§Ù„Ø­Ø©/
    );
  });

  test("Ø¬Ø³Ù… ØºÙŠØ± ØµØ§Ù„Ø­ (JSON Ø®Ø§Ø·Ø¦) ÙŠØ±Ø¬Ù‘Ø¹ validation_error Ù„Ø§ 500", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: { invalid: "missing scriptText" },
      failOnStatusCode: false,
    });

    expect(response.status()).not.toBe(500);
    const body = (await response.json()) as {
      ok: boolean;
      error?: { code: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("validation_error");
  });

  test("Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© ØªØªØ¨Ø¹ ApiResponse contract (ok/data/meta Ø£Ùˆ ok/error)", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: { scriptText: "Ù†Øµ Ø§Ø®ØªØ¨Ø§Ø± Ù‚ØµÙŠØ±", language: "ar" },
      failOnStatusCode: false,
    });

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("ok");
    expect(typeof body["ok"]).toBe("boolean");

    if (body["ok"] === true) {
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("meta");
      const meta = body["meta"] as { requestId?: string };
      expect(typeof meta.requestId).toBe("string");
    } else {
      expect(body).toHaveProperty("error");
      const error = body["error"] as { code?: string; message?: string };
      expect(typeof error.code).toBe("string");
      expect(typeof error.message).toBe("string");
      // Ø§Ù„Ø±Ø³Ø§Ù„Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø¹Ø±Ø¨ÙŠØ©      // الرسالة يجب أن تكون عربية (تحتوي حرفًا عربيًا واحدًا على الأقل).
      expect(error.message ?? "").toMatch(/[\u0600-\u06FF]/);
    }
  });

  test("Ù„Ø§ ÙŠÙƒØ´Ù stack trace ÙÙŠ Ø£ÙŠ Ø­Ø§Ù„Ø© ÙØ´Ù„", async ({
    request,
  }) => {
    const response = await request.post(`${BASE_URL}${ENDPOINT}`, {
      data: { scriptText: 123 as unknown as string, language: "invalid_lang" },
      failOnStatusCode: false,
    });

    const text = await response.text();
    expect(text).not.toMatch(/at .*\.ts:\d+:\d+/);
    expect(text).not.toMatch(/\bstack\b/i);
    expect(text).not.toContain("TypeError");
  });
});
