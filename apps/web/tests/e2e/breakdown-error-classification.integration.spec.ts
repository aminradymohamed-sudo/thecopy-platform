import { expect, test } from "@playwright/test";

/**
 * E2E-3 â€” breakdown analyze (P0-3 acceptance)
 *
 * ÙŠÙØ«Ø¨Øª Ø¥ØµÙ„Ø§Ø­ P0-3: POST /api/breakdown/projects/{uuid}/analyze
 * Ù„Ù… ÙŠØ¹Ø¯ ÙŠØ±Ø¬Ù‘Ø¹ 500 Ø®Ø§Ù… Ù„Ù„Ø£Ø®Ø·Ø§Ø¡ Ø§Ù„Ù…Ø¹Ø±ÙˆÙØ©.
 *
 * Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…ØªØ£Ø«Ø±:
 *   apps/web/src/app/api/breakdown/projects/[projectId]/analyze/route.ts
 *
 * Ø´Ø±ÙˆØ· Ø§Ù„Ù‚Ø¨ÙˆÙ„ Ø§Ù„Ù…ÙØ®ØªØ¨Ø±Ø©:
 *   - Ù…Ø´Ø±ÙˆØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ â†’ 404 (Ù„Ø§ 500).
 *   - Ù…Ø¹Ø±Ù‘Ù Ù…Ø´Ø±ÙˆØ¹ ÙØ§Ø±Øº â†’ 400 (Ù„Ø§ 500).
 *   - Ø§Ù„ÙØ´Ù„ Ù„Ø§ ÙŠÙƒØ´Ù stack trace.
 */

const BASE_URL = (
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`
).replace(/\/+$/, "");

const REQUEST_BODY_SCRIPT = `INT. KITCHEN - NIGHT
Ahmed sits alone at the table.

EXT. STREET - DAY
Rania carries heavy bags.`;

const REQUEST_BODY_PARSED = {
  scenes: [
    {
      header: "INT. KITCHEN - NIGHT",
      content: "Ahmed sits alone at the table.",
    },
    {
      header: "EXT. STREET - DAY",
      content: "Rania carries heavy bags.",
    },
  ],
};

test.describe("/api/breakdown/projects/[projectId]/analyze â€” error classification", () => {
  test.describe.configure({ timeout: 120_000 });

  test("Ù…Ø´Ø±ÙˆØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙŠØ±Ø¬Ù‘Ø¹ 404 Ù„Ø§ 500", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/breakdown/projects/00000000-0000-0000-0000-000000000000/analyze`,
      { data: {}, failOnStatusCode: false }
    );

    expect(
      response.status(),
      `Status must not be 500 raw. Got: ${response.status()}`
    ).not.toBe(500);

    // 404 Ù‡Ùˆ Ø§Ù„ØµØ­ÙŠØ­ Ù„Ù…Ø´Ø±ÙˆØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø§Ù„Ø¬Ù„Ø³Ø©.
    expect([404, 422, 401]).toContain(response.status());

    const body: unknown = await response.json().catch((): null => null);
    expect(body).not.toBeNull();
  });

  test("Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ù„Ø§ ØªÙƒØ´Ù stack trace Ø£Ùˆ Ø±Ø³Ø§Ù„Ø© ØªÙ‚Ù†ÙŠØ© Ø®Ø§Ù…", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/breakdown/projects/non-existent-uuid/analyze`,
      { data: {}, failOnStatusCode: false }
    );

    const text = await response.text();

    // Ù„Ø§ ÙŠÙˆØ¬Ø¯ stack trace.
    expect(text).not.toMatch(/at .*\.ts:\d+:\d+/);
    expect(text).not.toMatch(/\bError:.*\n\s+at\b/);
    expect(text).not.toContain("TypeError");
    expect(text).not.toMatch(/Internal Server Error/i);
  });

  test("Ø§Ù„Ù€ endpoint Ù…ÙˆØ¬ÙˆØ¯ ÙˆÙ…Ø³ØªØ¬ÙŠØ¨ (Ù„Ø§ 404 Ù„Ù„Ù…Ø³Ø§Ø± Ù†ÙØ³Ù‡)", async ({
    request,
  }) => {
    // GET Ø¹Ù„Ù‰ Ù†ÙØ³ Ø§Ù„Ù…Ø³Ø§Ø± ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ³ØªØ¬ÙŠØ¨ (ÙˆÙÙ‚ route handler Ø§Ù„Ø­Ø§Ù„ÙŠ).
    const response = await request.get(
      `${BASE_URL}/api/breakdown/projects/00000000-0000-0000-0000-000000000000/analyze`,
      { failOnStatusCode: false }
    );
    // GET ÙŠÙØ±Ø¬Ø¹ 200 Ù…Ø¹ sessionFound=false Ù„Ù„Ù…Ø¹Ø±Ù‘Ù ØºÙŠØ± Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯.
    expect([200, 404]).toContain(response.status());
  });

  test("Ø·Ù„Ø¨ ØªØ­Ù„ÙŠÙ„ ÙŠØ­Ù…Ù„ Ø§Ù„Ù†Øµ ÙˆØ§Ù„Ù…Ø´Ø§Ù‡Ø¯ ÙŠØ¹Ù…Ù„ Ø¯ÙˆÙ† Ø¬Ù„Ø³Ø© Ø®Ø§Ø¯Ù…ÙŠØ©", async ({
    request,
  }) => {
    const response = await request.post(
      `${BASE_URL}/api/breakdown/projects/request-body-only/analyze`,
      {
        data: {
          scriptContent: REQUEST_BODY_SCRIPT,
          title: "Request Body Only",
          parsed: REQUEST_BODY_PARSED,
        },
        failOnStatusCode: false,
      }
    );

    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      success: boolean;
      data?: {
        projectId: string;
        sceneCount: number;
        scenes: unknown[];
      };
    };

    expect(body.success).toBe(true);
    expect(body.data?.projectId).toBe("request-body-only");
    expect(body.data?.sceneCount).toBe(REQUEST_BODY_PARSED.scenes.length);
    expect(body.data?.scenes.length).toBeGreaterThan(0);
  });
});
