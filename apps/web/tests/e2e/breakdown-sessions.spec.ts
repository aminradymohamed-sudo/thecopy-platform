/**
 * E2E â€” breakdown session flow
 * Tests: upload screenplay â†’ view scenes â†’ open scene detail â†’ view cast list
 */

import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_PROJECT_ID = "e2e-project-001";
const BASE_SCENE_ID = "e2e-scene-001";

const MOCK_SCREENPLAY_RESPONSE = {
  success: true,
  data: { projectId: BASE_PROJECT_ID },
};

const MOCK_SESSION = {
  success: true,
  data: {
    id: "report-001",
    projectId: BASE_PROJECT_ID,
    title: "Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±",
    generatedAt: new Date().toISOString(),
    scenes: [
      {
        reportSceneId: "rs-1",
        sceneId: BASE_SCENE_ID,
        header: "INT. Ù…Ø·Ø¨Ø® - Ù„ÙŠÙ„",
        content:
          "Ø£Ø­Ù…Ø¯ ÙŠØ¬Ù„Ø³ ÙˆØ­ÙŠØ¯Ø§Ù‹. ÙƒÙˆØ¨ Ù‚Ù‡ÙˆØ© Ø¨Ø§Ø±Ø¯ Ø£Ù…Ø§Ù…Ù‡.",
        headerData: {
          sceneNumber: 1,
          type: "INT",
          location: "Ù…Ø·Ø¨Ø®",
          timeOfDay: "Ù„ÙŠÙ„",
          raw: "INT. Ù…Ø·Ø¨Ø® - Ù„ÙŠÙ„",
        },
        analysis: {
          cast: [
            {
              name: "Ø£Ø­Ù…Ø¯",
              role: "Lead",
              age: "35",
              description: "Ø¨Ø·Ù„ Ø§Ù„Ù‚ØµØ©",
            },
          ],
          props: ["ÙƒÙˆØ¨ Ù‚Ù‡ÙˆØ©", "Ù…Ù„Ø¹Ù‚Ø©"],
          handProps: ["Ù…Ù„Ø¹Ù‚Ø©"],
          costumes: ["Ù…Ù„Ø§Ø¨Ø³ Ù…Ù†Ø²Ù„ÙŠØ©"],
          makeup: [],
          vehicles: [],
          stunts: [],
          spfx: [],
          vfx: [],
          setDressing: ["Ø·Ø§ÙˆÙ„Ø© Ù…Ø·Ø¨Ø®", "Ø³Ø§Ø¹Ø© Ø­Ø§Ø¦Ø·"],
          locations: ["Ù…Ø·Ø¨Ø® Ø¯Ø§Ø®Ù„ÙŠ"],
          extras: [],
          summary: "Ø£Ø­Ù…Ø¯ ÙÙŠ Ù…Ø·Ø¨Ø® Ù…Ù†Ø²Ù„Ù‡ Ù„ÙŠÙ„Ø§Ù‹",
          warnings: [],
          elements: [],
        },
      },
    ],
    schedule: [],
  },
};

const MOCK_ANALYSIS_TRIGGER = {
  success: true,
};

const E2E_SCRIPT = `INT. Ù…Ø·Ø¨Ø® - Ù„ÙŠÙ„

Ø£Ø­Ù…Ø¯ (35) ÙŠØ¬Ù„Ø³ ÙˆØ­ÙŠØ¯Ø§Ù‹ Ø¹Ù„Ù‰ Ø·Ø§ÙˆÙ„Ø© Ø§Ù„Ù…Ø·Ø¨Ø®.
ÙƒÙˆØ¨ Ù‚Ù‡ÙˆØ© Ø¨Ø§Ø±Ø¯ Ø£Ù…Ø§Ù…Ù‡.`;

async function setupMocks(page: Page): Promise<void> {
  await page.route("**/api/breakdown/screenplays", async (route: Route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SCREENPLAY_RESPONSE),
    });
  });

  await page.route(
    `**/api/breakdown/sessions/${BASE_PROJECT_ID}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SESSION),
      });
    }
  );

  await page.route("**/api/breakdown/sessions", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYSIS_TRIGGER),
      });
    }
  });
}

test.describe("breakdown â€” session flow", () => {
  test.use({
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ??
      `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`,
  });

  test("ÙŠØ±ÙØ¹ Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ ÙˆÙŠÙ†ØªÙ‚Ù„ Ø¥Ù„Ù‰ ØµÙØ­Ø© Ø§Ù„Ø¬Ù„Ø³Ø©", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto("/breakdown/screenplays/new");

    await expect(
      page.getByTestId("new-screenplay-page"),
      "ØµÙØ­Ø© Ø§Ù„Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ø¸Ø§Ù‡Ø±Ø©"
    ).toBeVisible();

    await page
      .getByTestId("screenplay-title")
      .fill("Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±");
    await page.getByTestId("screenplay-content").fill(E2E_SCRIPT);
    await page.getByTestId("submit-screenplay").click();

    await expect(page).toHaveURL(
      new RegExp(`/breakdown/sessions/${BASE_PROJECT_ID}`),
      { timeout: 10000 }
    );
  });

  test("ØªØ¹Ø±Ø¶ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø´Ø§Ù‡Ø¯ Ø¨Ø´ÙƒÙ„ ØµØ­ÙŠØ­", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto(`/breakdown/sessions/${BASE_PROJECT_ID}`);

    await expect(
      page.getByTestId("breakdown-session-page"),
      "ØµÙØ­Ø© Ø§Ù„Ø¬Ù„Ø³Ø© Ø¸Ø§Ù‡Ø±Ø©"
    ).toBeVisible();

    await expect(
      page.getByTestId(`scene-card-${BASE_SCENE_ID}`),
      "Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ù…Ø´Ù‡Ø¯ Ø¸Ø§Ù‡Ø±Ø©"
    ).toBeVisible();
  });

  test("ÙŠÙØ´ØºÙ‘Ù„ Ø§Ù„ØªØ­Ù„ÙŠÙ„ Ø§Ù„ÙƒØ§Ù…Ù„ Ù…Ù† Ø²Ø± Ø§Ù„Ø¬Ù„Ø³Ø©", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto(`/breakdown/sessions/${BASE_PROJECT_ID}`);

    const runBtn = page.getByTestId("run-analysis-btn");
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toBeEnabled();

    await runBtn.click();

    await expect(
      page.getByTestId(`scene-card-${BASE_SCENE_ID}`),
      "Ø§Ù„Ù…Ø´Ø§Ù‡Ø¯ Ù„Ø§ ØªØ²Ø§Ù„ Ø¸Ø§Ù‡Ø±Ø© Ø¨Ø¹Ø¯ Ø§Ù„ØªØ­Ù„ÙŠÙ„"
    ).toBeVisible({ timeout: 10000 });
  });

  test("ÙŠÙØªØ­ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ø´Ù‡Ø¯ ÙˆÙŠØ¹Ø±Ø¶ BreakdownSheet", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto(`/breakdown/sessions/${BASE_PROJECT_ID}`);

    await page.getByTestId(`scene-card-${BASE_SCENE_ID}`).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/breakdown/sessions/${BASE_PROJECT_ID}/scenes/${BASE_SCENE_ID}`
      ),
      { timeout: 10000 }
    );

    await expect(
      page.getByTestId("scene-detail-page"),
      "ØµÙØ­Ø© ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ø´Ù‡Ø¯ Ø¸Ø§Ù‡Ø±Ø©"
    ).toBeVisible();

    await expect(
      page.getByTestId("breakdown-sheet"),
      "BreakdownSheet Ø¸Ø§Ù‡Ø±"
    ).toBeVisible();
  });

  test("ÙŠÙØ¨Ø¯Ù‘Ù„ ØªØ¨ÙˆÙŠØ¨Ø§Øª BreakdownSheet", async ({ page }) => {
    await setupMocks(page);
    await page.goto(
      `/breakdown/sessions/${BASE_PROJECT_ID}/scenes/${BASE_SCENE_ID}`
    );

    await expect(page.getByTestId("breakdown-sheet")).toBeVisible();

    await page.getByTestId("breakdown-tab-cast").click();
    await expect(
      page.getByTestId("breakdown-tab-cast"),
      "ØªØ¨ÙˆÙŠØ¨ Ø§Ù„ÙƒØ§Ø³Øª Ù†Ø´Ø·"
    ).toHaveClass(/amber/);

    await page.getByTestId("breakdown-tab-props").click();
    await expect(
      page.getByTestId("breakdown-tab-props"),
      "ØªØ¨ÙˆÙŠØ¨ Props Ù†Ø´Ø·"
    ).toHaveClass(/amber/);
  });

  test("ÙŠÙØªØ­ ØµÙØ­Ø© Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± ÙˆÙŠØ¹Ø±Ø¶ cast list", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto(`/breakdown/sessions/${BASE_PROJECT_ID}`);

    await expect(
      page.getByTestId("view-reports-link"),
      "Ø±Ø§Ø¨Ø· Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø¸Ø§Ù‡Ø±"
    ).toBeVisible();

    await page.getByTestId("view-reports-link").click();

    await expect(page).toHaveURL(
      new RegExp(`/breakdown/sessions/${BASE_PROJECT_ID}/reports`),
      { timeout: 10000 }
    );

    await expect(
      page.getByTestId("reports-page"),
      "ØµÙØ­Ø© Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ± Ø¸Ø§Ù‡Ø±Ø©"
    ).toBeVisible();

    await expect(
      page.getByTestId("report-tab-cast"),
      "ØªØ¨ÙˆÙŠØ¨ Ø§Ù„ÙƒØ§Ø³Øª Ø¸Ø§Ù‡Ø±"
    ).toBeVisible();

    await expect(
      page.getByTestId("cast-list"),
      "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ÙƒØ§Ø³Øª Ø¸Ø§Ù‡Ø±Ø©"
    ).toBeVisible();
  });
});
