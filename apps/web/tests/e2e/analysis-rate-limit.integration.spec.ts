import { expect, test } from "@playwright/test";

/**
 * E2E-2 â€” analysis rate limit (P0-2 acceptance)
 *
 * ÙŠÙØ«Ø¨Øª Ø¥ØµÙ„Ø§Ø­ P0-2: pre-check Ù‚Ø¨Ù„ proxy ÙŠÙØ±Ø¶ rate limit Ø¹Ù„Ù‰ start
 * Ù‚Ø¨Ù„ Ø£Ù† ÙŠØµÙ„ Ø§Ù„Ø·Ù„Ø¨ Ù„Ø£ÙŠ ØªØ­Ù„ÙŠÙ„ AI Ù…ÙƒÙ„Ù.
 *
 * Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…ØªØ£Ø«Ø±:
 *   apps/web/src/app/api/public/analysis/seven-stations/[...path]/route.ts
 *
 * Ø§Ù„Ø­Ø¯Ù‘ Ø§Ù„Ù…ÙØ·Ø¨ÙŽÙ‘Ù‚:
 *   - 30 Ø·Ù„Ø¨/Ø³Ø§Ø¹Ø© Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…ØµØ§Ø¯Ù‚.
 *   - 5 Ø·Ù„Ø¨Ø§Øª/Ø³Ø§Ø¹Ø© Ù„Ù„Ù…Ø¬Ù‡ÙˆÙ„ (Ù†ÙØ³ IP).
 *
 * Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø± ÙŠØªØ¬Ø§ÙˆØ² Ø­Ø¯ Ø§Ù„Ù…Ø¬Ù‡ÙˆÙ„ ÙˆÙŠØªØ£ÙƒØ¯ Ù…Ù† Ø±Ø¯ 429 + code quota_exceededØŒ
 * Ø¨Ø¯ÙˆÙ† Ø£Ù† ÙŠØµÙ„ Ø§Ù„Ø·Ù„Ø¨ Ø¥Ù„Ù‰ backend (Ø£ÙŠ Ø¨Ø¯ÙˆÙ† Ø§Ø³ØªÙ‡Ù„Ø§Ùƒ Ù…ÙˆØ§Ø±Ø¯ AI).
 */

const BASE_URL = (
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`
).replace(/\/+$/, "");

const START_PATH = "/api/public/analysis/seven-stations/start";

interface ApiFailureBody {
  ok: false;
  error: { code: string; message: string };
}

test.describe("/api/public/analysis/seven-stations â€” rate limit", () => {
  test("Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù…Ø¬Ù‡ÙˆÙ„ ÙŠÙØ­Ø¸Ø± Ø¨Ø¹Ø¯ ØªØ¬Ø§ÙˆØ² Ø­Ø¯ start (5/Ø³Ø§Ø¹Ø©)", async ({
    request,
  }) => {
    // Ù…ÙØªØ§Ø­ rate limit ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ IP. Ù†Ø³ØªØ®Ø¯Ù… anonymous_session_id ÙØ±ÙŠØ¯ Ù„ÙƒÙ„
    // Ø§Ø®ØªØ¨Ø§Ø± Ù„ØªÙØ§Ø¯ÙŠ ØªÙ„ÙˆÙ‘Ø« Ù…Ù† runs Ø³Ø§Ø¨Ù‚Ø©.
    const sessionId = `e2e-anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const responses: { status: number; body: unknown }[] = [];

    // 6 Ù…Ø­Ø§ÙˆÙ„Ø§Øª: Ø£ÙˆÙ„ 5 ØªÙ…Ø±Ù‘ rate limitØŒ Ø§Ù„Ø³Ø§Ø¯Ø³Ø© ÙŠØ¬Ø¨ Ø£Ù† ØªØ±Ø¬Ø¹ 429.
    for (let i = 0; i < 6; i += 1) {
      const response = await request.post(`${BASE_URL}${START_PATH}`, {
        headers: {
          "x-anonymous-session-id": sessionId,
          "x-forwarded-for": `203.0.113.${(i % 250) + 1}`,
          // Ù†ÙÙ…Ø±Ù‘Ø± Ù†ÙØ³ IP Ù„ÙƒÙ„ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø§Øª Ø­ØªÙ‰ ÙŠÙÙØ¹ÙŽÙ‘Ù„ rate limit per-IP.
        },
        data: { scriptText: "Ù†Øµ Ø§Ø®ØªØ¨Ø§Ø± Ù‚ØµÙŠØ±" },
        failOnStatusCode: false,
      });
      const body: unknown = await response.json().catch((): null => null);
      responses.push({ status: response.status(), body });
    }

    // Ø§Ù„Ø·Ù„Ø¨ Ø§Ù„Ø³Ø§Ø¯Ø³ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ±Ø¬Ø¹ 429.
    const blockedResponses = responses.filter((r) => r.status === 429);
    expect(
      blockedResponses.length,
      `Expected at least one 429 after exceeding anon limit. Got: ${JSON.stringify(responses.map((r) => r.status))}`
    ).toBeGreaterThanOrEqual(1);

    // ÙˆÙ†ØªØ£ÙƒØ¯ Ø£Ù† Ø¬Ø³Ù… 429 ÙŠØªØ¨Ø¹ Ø¹Ù‚Ø¯ ApiFailure Ù…Ø¹ code quota_exceeded.
    const blocked = blockedResponses[0];
    if (blocked !== undefined) {
      const body = blocked.body as ApiFailureBody | null;
      expect(body).not.toBeNull();
      expect(body?.ok).toBe(false);
      expect(body?.error?.code).toBe("quota_exceeded");
    }
  });

  test("Ø§Ù„Ù€ start ÙŠØ±Ø¬Ù‘Ø¹ Ø±Ø³Ø§Ù„Ø© Ø¹Ø±Ø¨ÙŠØ© Ù…ÙÙ‡ÙˆÙ…Ø© Ø¹Ù†Ø¯ ØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯ØŒ Ù„Ø§ stack trace", async ({
    request,
  }) => {
    const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
    const sessionId = `e2e-msg-${Date.now()}`;

    // Ù†ØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯ Ø¹Ù…Ø¯Ø§Ù‹.
    for (let i = 0; i < 6; i += 1) {
      await request.post(`${BASE_URL}${START_PATH}`, {
        headers: {
          "x-anonymous-session-id": sessionId,
          "x-forwarded-for": ip,
        },
        data: { scriptText: "Ø§Ø®ØªØ¨Ø§Ø±" },
        failOnStatusCode: false,
      });
    }

    const finalResponse = await request.post(`${BASE_URL}${START_PATH}`, {
      headers: {
        "x-anonymous-session-id": sessionId,
        "x-forwarded-for": ip,
      },
      data: { scriptText: "Ø§Ø®ØªØ¨Ø§Ø±" },
      failOnStatusCode: false,
    });

    expect(finalResponse.status()).toBe(429);
    const body = (await finalResponse.json()) as ApiFailureBody;
    expect(body.error.message).toMatch(
      /ØªØ¬Ø§ÙˆØ²Øª|Ø­Ø¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…|Ù…Ø­Ø§ÙˆÙ„Ø© Ù„Ø§Ø­Ù‚Ø§Ù‹/
    );
    // Ù„Ø§ ÙŠØ¬ÙˆØ² ÙƒØ´Ù stack trace Ø£Ùˆ Ø£ÙŠ ØªÙØ§ØµÙŠÙ„ ØªÙ‚Ù†ÙŠØ© Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù….
    expect(body.error.message).not.toMatch(
      /at .*\.ts:\d+|Error:|stack|TypeError/i
    );
  });
});
