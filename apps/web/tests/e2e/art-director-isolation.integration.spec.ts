import { expect, test } from "@playwright/test";

/**
 * E2E-6 â€” art-director isolation (P0-6 acceptance)
 *
 * ÙŠÙØ«Ø¨Øª Ø¥ØµÙ„Ø§Ø­ P0-6:
 *   - Ø­Ù‚Ù† x-actor-kind Ùˆ x-anonymous-session-id Ù‚Ø¨Ù„ proxy.
 *   - cookie tc_anon_sid ÙŠÙÙˆÙ„ÙŽÙ‘Ø¯ Ù„Ù„Ù…Ø¬Ù‡ÙˆÙ„ Ø§Ù„Ø¬Ø¯ÙŠØ¯.
 *   - rate limit Ù„Ù„ÙƒØªØ§Ø¨Ø§Øª.
 *
 * Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…ØªØ£Ø«Ø±:
 *   apps/web/src/app/api/art-director/[...path]/route.ts
 */

const BASE_URL = (
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`
).replace(/\/+$/, "");

test.describe("/api/art-director â€” actor scoping & rate limit", () => {
  test("Ø§Ù„Ø²ÙŠØ§Ø±Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ Ù…Ù† Ù…Ø¬Ù‡ÙˆÙ„ ØªÙÙ†Ø´Ø¦ cookie tc_anon_sid", async ({
    request,
  }) => {
    // GET Ø¨Ø³ÙŠØ· Ø¹Ù„Ù‰ Ù…Ø³Ø§Ø± ØµØ­Ù‘ÙŠ. Ø§Ù„Ù€ proxy ÙŠØ­Ù‚Ù† cookie Ø­ØªÙ‰ Ù„Ùˆ backend ØºÙŠØ± Ù…ØªØ§Ø­.
    const response = await request.get(`${BASE_URL}/api/art-director/health`, {
      failOnStatusCode: false,
    });

    // Ù†Ù‚Ø±Ø£ Set-Cookie Ù…Ù† Ø§Ù„Ù€ headers.
    const cookies = response.headers()["set-cookie"] ?? "";
    expect(
      cookies,
      `Expected tc_anon_sid cookie to be set on first anonymous visit. Headers: ${cookies}`
    ).toMatch(/tc_anon_sid=/);
    expect(cookies).toMatch(/HttpOnly/i);
  });

  test("rate limit Ù„Ù„ÙƒØªØ§Ø¨Ø§Øª: 11 Ø·Ù„Ø¨ POST â†’ Ø§Ù„Ø­Ø§Ø¯ÙŠ Ø¹Ø´Ø± ÙŠÙØ±ÙØ¶ Ø¨Ù€ 429", async ({
    request,
  }) => {
    // Ø§Ù„Ø­Ø¯Ù‘ Ù„Ù„ÙƒØªØ§Ø¨Ø§Øª Ù…Ù† Ø§Ù„Ù…Ø¬Ù‡ÙˆÙ„ Ù‡Ùˆ 10/Ø³Ø§Ø¹Ø©.
    // Ù†Ø³ØªØ®Ø¯Ù… anonymous_session_id Ø«Ø§Ø¨Øª Ù„ÙŠÙØ­Ø³Ø¨ Ø¹Ù„Ù‰ Ù†ÙØ³ bucket.
    const sessionId = `e2e-isolation-${Date.now()}`;

    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const response = await request.post(
        `${BASE_URL}/api/art-director/locations/add`,
        {
          headers: {
            "x-anonymous-session-id": sessionId,
            cookie: `tc_anon_sid=${sessionId}`,
          },
          data: { name: `Ù…ÙˆÙ‚Ø¹ Ø§Ø®ØªØ¨Ø§Ø± ${i}` },
          failOnStatusCode: false,
        }
      );
      statuses.push(response.status());
    }

    const blockedCount = statuses.filter((s) => s === 429).length;
    expect(
      blockedCount,
      `Expected at least one 429 after 10 writes. Got: ${JSON.stringify(statuses)}`
    ).toBeGreaterThanOrEqual(1);
  });

  test("Ø§Ù„Ù€ 429 ÙŠØ­ØªÙˆÙŠ ApiFailure Ù…ØµÙ†Ù‘Ù Ù„Ø§ stack trace", async ({
    request,
  }) => {
    const sessionId = `e2e-isolation-msg-${Date.now()}`;

    // Ù†ØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯ Ø¹Ù…Ø¯Ø§Ù‹.
    for (let i = 0; i < 12; i += 1) {
      await request.post(`${BASE_URL}/api/art-director/locations/add`, {
        headers: {
          "x-anonymous-session-id": sessionId,
          cookie: `tc_anon_sid=${sessionId}`,
        },
        data: { name: "ping" },
        failOnStatusCode: false,
      });
    }

    const final = await request.post(
      `${BASE_URL}/api/art-director/locations/add`,
      {
        headers: {
          "x-anonymous-session-id": sessionId,
          cookie: `tc_anon_sid=${sessionId}`,
        },
        data: { name: "ping" },
        failOnStatusCode: false,
      }
    );

    expect(final.status()).toBe(429);
    const body = (await final.json()) as {
      ok?: boolean;
      error?: { code?: string; message?: string };
    };
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe("quota_exceeded");
    // Ø±Ø³Ø§Ù„Ø© Ø¹Ø±Ø¨ÙŠØ©ØŒ Ø¨Ø¯ÙˆÙ† stack trace.
    expect(body.error?.message ?? "").toMatch(
      /ØªØ¬Ø§ÙˆØ²Øª|Ø­Ø¯ Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…/
    );
    expect(body.error?.message ?? "").not.toMatch(/at .*\.ts:\d+/);
  });
});
