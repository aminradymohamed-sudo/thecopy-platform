import { expect, test, type Page } from "@playwright/test";

const BASE_URL = (
  process.env.ANALYSIS_E2E_BASE_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`
).replace(/\/+$/, "");

const ANALYSIS_ID = "e2e-analysis";
const ANALYSIS_INPUT_PLACEHOLDER =
  "Ø£Ù„ØµÙ‚ Ø§Ù„Ù†Øµ Ø§Ù„Ø¯Ø±Ø§Ù…ÙŠ Ù‡Ù†Ø§ Ù„Ø¨Ø¯Ø¡ Ø§Ù„ØªØ­Ù„ÙŠÙ„ ...";

function sseEvent(id: number, event: string, data: unknown): string {
  return `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function getReadyAnalysisInput(page: Page) {
  const input = page.getByPlaceholder(ANALYSIS_INPUT_PLACEHOLDER);
  await expect(input).toBeVisible({ timeout: 60_000 });
  return input;
}

function completedSseBody(): string {
  const events: string[] = [
    sseEvent(1, "pipeline.started", {
      type: "pipeline.started",
      analysisId: ANALYSIS_ID,
      projectName: "Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„ØªØ­Ù„ÙŠÙ„",
      capabilities: { exports: ["json", "docx"] },
    }),
  ];

  let id = 2;
  for (const stationId of [1, 2, 3, 4, 5, 6, 7] as const) {
    events.push(
      sseEvent(id++, "station.started", {
        type: "station.started",
        stationId,
        name: `Ø§Ù„Ù…Ø­Ø·Ø© ${stationId}`,
        at: new Date("2026-04-30T00:00:00.000Z").toISOString(),
      })
    );
    events.push(
      sseEvent(id++, "station.completed", {
        type: "station.completed",
        stationId,
        output: {
          details: {
            fullAnalysis: `Ù†ØªÙŠØ¬Ø© Ø§Ù„Ù…Ø­Ø·Ø© ${stationId}`,
            ...(stationId === 7
              ? { finalReport: "ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ" }
              : {}),
          },
        },
        confidence: 0.91,
        durationMs: 10,
      })
    );
  }

  events.push(
    sseEvent(id, "pipeline.completed", {
      type: "pipeline.completed",
      status: "completed",
      durationMs: 140,
    })
  );

  return events.join("");
}

async function mockSuccessfulAnalysis(page: Page): Promise<void> {
  await page.route(
    "**/api/public/analysis/seven-stations/start",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, analysisId: ANALYSIS_ID }),
      });
    }
  );

  await page.route(
    `**/api/public/analysis/seven-stations/stream/${ANALYSIS_ID}`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream; charset=utf-8",
        body: completedSseBody(),
      });
    }
  );

  await page.route(
    `**/api/public/analysis/seven-stations/${ANALYSIS_ID}/export`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        headers: {
          "content-disposition": `attachment; filename="analysis-${ANALYSIS_ID}.json"`,
        },
        body: JSON.stringify({ analysisId: ANALYSIS_ID, status: "completed" }),
      });
    }
  );
}

test.describe("analysis public flow", () => {
  test("starts analysis, completes stations, exports valid formats, and resets", async ({
    page,
  }) => {
    await mockSuccessfulAnalysis(page);

    await page.goto(`${BASE_URL}/analysis`, { waitUntil: "domcontentloaded" });
    await (
      await getReadyAnalysisInput(page)
    ).fill(
      "Ù†Øµ Ø¹Ø±Ø¨ÙŠ Ø·ÙˆÙŠÙ„ Ù„Ø§Ø®ØªØ¨Ø§Ø± Ù…Ø³Ø§Ø± Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø¹Ø§Ù…"
    );
    await page.getByRole("button", { name: /Ø§Ø¨Ø¯Ø£ Ø§Ù„ØªØ­Ù„ÙŠÙ„/ }).click();

    await expect(page).toHaveURL(/analysis=e2e-analysis/);
    await expect(
      page.getByRole("button", { name: /ØªØµØ¯ÙŠØ± JSON/ })
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: /ØªØµØ¯ÙŠØ± DOCX/ })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /PDF/ })).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /ØªØµØ¯ÙŠØ± JSON/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`analysis-${ANALYSIS_ID}.json`);

    await page.getByRole("button", { name: /Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ†/ }).click();
    await expect(page).not.toHaveURL(/analysis=/);
    await expect(
      page.getByPlaceholder(
        "Ø£Ù„ØµÙ‚ Ø§Ù„Ù†Øµ Ø§Ù„Ø¯Ø±Ø§Ù…ÙŠ Ù‡Ù†Ø§ Ù„Ø¨Ø¯Ø¡ Ø§Ù„ØªØ­Ù„ÙŠÙ„ ..."
      )
    ).toHaveValue("");
    await expect(
      page.getByRole("button", { name: /ØªØµØ¯ÙŠØ± JSON/ })
    ).toHaveCount(0);
  });

  test("shows controlled error text when upstream returns html", async ({
    page,
  }) => {
    await page.route(
      "**/api/public/analysis/seven-stations/start",
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: "text/html",
          body: "<!DOCTYPE html><html><body>Cannot POST</body></html>",
        });
      }
    );

    await page.goto(`${BASE_URL}/analysis`, { waitUntil: "domcontentloaded" });
    await (
      await getReadyAnalysisInput(page)
    ).fill("Ù†Øµ Ø¹Ø±Ø¨ÙŠ Ø·ÙˆÙŠÙ„ Ù„Ø§Ø®ØªØ¨Ø§Ø± ÙØ´Ù„ Ø§Ù„Ø®Ø§Ø¯Ù…");
    await page.getByRole("button", { name: /Ø§Ø¨Ø¯Ø£ Ø§Ù„ØªØ­Ù„ÙŠÙ„/ }).click();

    await expect(
      page.getByText(
        "Ø®Ø¯Ù…Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„ ØºÙŠØ± Ù…ØªØ§Ø­Ø© Ø§Ù„Ø¢Ù†ØŒ Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰ Ø¨Ø¹Ø¯ Ù„Ø­Ø¸Ø§Øª"
      )
    ).toBeVisible();
    await expect(page.getByText(/<!DOCTYPE|Cannot POST/)).toHaveCount(0);
  });

  test("shows controlled error text when the network goes offline", async ({
    context,
    page,
  }) => {
    await page.goto(`${BASE_URL}/analysis`, { waitUntil: "domcontentloaded" });
    const input = await getReadyAnalysisInput(page);
    await context.setOffline(true);
    await input.fill(
      "Ù†Øµ Ø¹Ø±Ø¨ÙŠ Ø·ÙˆÙŠÙ„ Ù„Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù†Ù‚Ø·Ø§Ø¹ Ø§Ù„Ø´Ø¨ÙƒØ©"
    );
    await page.getByRole("button", { name: /Ø§Ø¨Ø¯Ø£ Ø§Ù„ØªØ­Ù„ÙŠÙ„/ }).click();

    await expect(
      page.getByText(/ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø®Ø¯Ù…Ø© Ø§Ù„ØªØ­Ù„ÙŠÙ„/)
    ).toBeVisible();
    await expect(page.getByText(/Failed to fetch/)).toHaveCount(0);
    await context.setOffline(false);
  });
});
