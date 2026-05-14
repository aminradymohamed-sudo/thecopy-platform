/**
 * E2E â€” brain-storm-ai session flow
 * Tests: create brief â†’ start session â†’ run phases â†’ view concepts
 */

import { test, expect, type Page, type Route } from "@playwright/test";

const BASE_BRIEF_ID = "e2e-brief-001";
const BASE_SESSION_ID = "e2e-session-001";
const BASE_CONCEPT_ID = "e2e-concept-001";
const BASE_IDEA_ID = "e2e-idea-001";

const MOCK_BRIEF = {
  id: BASE_BRIEF_ID,
  title: "ÙÙŠÙ„Ù… ØªØ´ÙˆÙŠÙ‚ Ù†ÙØ³ÙŠ",
  body: "Ù‚ØµØ© Ø¹Ù† Ø´Ø®Øµ ÙŠÙƒØªØ´Ù Ø£Ù† Ø°Ø§ÙƒØ±ØªÙ‡ Ù…Ø²ÙŠÙØ©",
  audienceProfile: "Ø¨Ø§Ù„ØºÙˆÙ† 18-35",
  constraints: "Ù…ÙŠØ²Ø§Ù†ÙŠØ© Ù…ØªÙˆØ³Ø·Ø©",
  creativeSeed: "Ø§Ù„Ù‡ÙˆÙŠØ© ÙˆØ§Ù„Ø°Ø§ÙƒØ±Ø©",
  createdBy: "user-1",
};

const MOCK_SESSION = {
  session: {
    id: BASE_SESSION_ID,
    briefId: BASE_BRIEF_ID,
    status: "planning",
  },
  brief: MOCK_BRIEF,
  ideas: [],
  concepts: [],
};

const MOCK_SESSION_WITH_IDEAS = {
  ...MOCK_SESSION,
  session: { ...MOCK_SESSION.session, status: "divergent" },
  ideas: [
    {
      id: BASE_IDEA_ID,
      ideaStrId: "IDEA-001",
      headline: "Ø§Ù„ØµØ¯Ù‰ Ø§Ù„Ù…Ø²ÙŠÙ",
      premise:
        "Ø±Ø¬Ù„ ÙŠÙƒØªØ´Ù Ø£Ù† ÙƒÙ„ Ø°ÙƒØ±ÙŠØ§ØªÙ‡ Ø²Ø±Ø¹Øª Ø¨ÙˆØ§Ø³Ø·Ø© Ø­ÙƒÙˆÙ…Ø©",
      technique: "whatif",
      status: "alive" as const,
      scores: {
        originality: 80,
        thematicDepth: 75,
        audienceFit: 70,
        conflictComplexity: 85,
        producibility: 60,
        culturalResonance: 72,
        composite: 74,
      },
    },
  ],
};

const MOCK_CONCEPTS = {
  concepts: [
    {
      concept: {
        id: BASE_CONCEPT_ID,
        dossierMd:
          "# Ø§Ù„ØµØ¯Ù‰ Ø§Ù„Ù…Ø²ÙŠÙ\n\nÙÙƒØ±Ø© ØªØ´ÙˆÙŠÙ‚ÙŠØ© Ù†ÙØ³ÙŠØ© Ø¹Ù† Ø§Ù„Ø°Ø§ÙƒØ±Ø© ÙˆØ§Ù„Ù‡ÙˆÙŠØ©.",
        dossierJson: {
          logline: "Ø±Ø¬Ù„ ÙŠÙƒØªØ´Ù Ø£Ù† Ø°Ø§ÙƒØ±ØªÙ‡ ÙƒØ§Ù…Ù„Ø§Ù‹ Ù…Ø²ÙŠÙØ©",
          premise: "ÙÙŠ Ù…Ø¬ØªÙ…Ø¹ Ù…Ø±Ø§Ù‚Ø¨",
          themes: "Ø§Ù„Ù‡ÙˆÙŠØ© ÙˆØ§Ù„Ø­Ø±ÙŠØ©",
          characters: "Ø§Ù„Ø¨Ø·Ù„: Ø±Ø¬Ù„ ÙÙŠ Ø§Ù„Ø«Ù„Ø§Ø«ÙŠÙ†ÙŠØ§Øª",
          conflictMap: "Ø§Ù„ÙØ±Ø¯ Ø¶Ø¯ Ø§Ù„Ø¯ÙˆÙ„Ø©",
          plotArc: "Ø§ÙƒØªØ´Ø§Ù â†’ ØµØ±Ø§Ø¹ â†’ ØªØ­Ø±Ø±",
          audienceGenre: "ØªØ´ÙˆÙŠÙ‚/Ø¥Ø«Ø§Ø±Ø© Ù„Ù„Ø¨Ø§Ù„ØºÙŠÙ†",
          producibilityBrief: "Ø¥Ù†ØªØ§Ø¬ Ù…ØªÙˆØ³Ø· Ø§Ù„ØªÙƒÙ„ÙØ©",
          productionNotes: "Ù…ÙˆØ§Ù‚Ø¹ Ø­Ø¶Ø±ÙŠØ©",
        },
      },
      idea: {
        id: BASE_IDEA_ID,
        ideaStrId: "IDEA-001",
        headline: "Ø§Ù„ØµØ¯Ù‰ Ø§Ù„Ù…Ø²ÙŠÙ",
      },
    },
  ],
  brief: { title: "ÙÙŠÙ„Ù… ØªØ´ÙˆÙŠÙ‚ Ù†ÙØ³ÙŠ" },
};

async function setupMocks(page: Page): Promise<void> {
  await page.route("**/api/brainstorm/briefs", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_BRIEF }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [MOCK_BRIEF] }),
      });
    }
  });

  await page.route("**/api/brainstorm/sessions", async (route: Route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { session: MOCK_SESSION.session },
      }),
    });
  });

  await page.route(
    `**/api/brainstorm/sessions/${BASE_SESSION_ID}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_SESSION_WITH_IDEAS }),
      });
    }
  );

  await page.route(
    `**/api/brainstorm/sessions/${BASE_SESSION_ID}/divergent`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    }
  );

  await page.route(
    `**/api/brainstorm/sessions/${BASE_SESSION_ID}/concepts`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_CONCEPTS }),
      });
    }
  );
}

test.describe("brain-storm-ai â€” session flow", () => {
  test.use({
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL ??
      `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`,
  });

  test("ÙŠÙÙ†Ø´Ø¦ brief Ø¬Ø¯ÙŠØ¯ ÙˆÙŠØ¨Ø¯Ø£ Ø¬Ù„Ø³Ø©", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/brain-storm-ai/briefs/new");

    await expect(
      page.getByTestId("brief-title"),
      "Ø­Ù‚Ù„ Ø§Ù„Ø¹Ù†ÙˆØ§Ù† Ø¸Ø§Ù‡Ø±"
    ).toBeVisible();

    await page.getByTestId("brief-title").fill("ÙÙŠÙ„Ù… ØªØ´ÙˆÙŠÙ‚ Ù†ÙØ³ÙŠ");
    await page
      .getByTestId("brief-body")
      .fill("Ù‚ØµØ© Ø¹Ù† Ø´Ø®Øµ ÙŠÙƒØªØ´Ù Ø£Ù† Ø°Ø§ÙƒØ±ØªÙ‡ Ù…Ø²ÙŠÙØ©");
    await page.getByTestId("brief-audience").fill("Ø¨Ø§Ù„ØºÙˆÙ† 18-35");

    await page.getByTestId("submit-brief").click();

    await expect(page).toHaveURL(
      new RegExp(`/brain-storm-ai/sessions/${BASE_SESSION_ID}`),
      { timeout: 10000 }
    );
  });

  test("ÙŠØ¹Ø±Ø¶ ØµÙØ­Ø© Ø§Ù„Ø¬Ù„Ø³Ø© Ù…Ø¹ Ø§Ù„Ù…Ø±Ø§Ø­Ù„ ÙˆØ§Ù„Ø£ÙÙƒØ§Ø±", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto(`/brain-storm-ai/sessions/${BASE_SESSION_ID}`);

    await expect(page.getByTestId("session-page")).toBeVisible();
    await expect(page.getByTestId("phase-progress")).toBeVisible();

    await expect(
      page.getByTestId(`idea-card-IDEA-001`),
      "Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ÙÙƒØ±Ø© Ø¸Ø§Ù‡Ø±Ø©"
    ).toBeVisible();
  });

  test("ÙŠÙØ´ØºÙ‘Ù„ Ù…Ø±Ø­Ù„Ø© divergent ÙˆÙŠÙ†Ø¹ÙƒØ³ Ø§Ù„ØªØºÙŠÙŠØ±", async ({
    page,
  }) => {
    const planningSession = {
      ...MOCK_SESSION,
      session: { ...MOCK_SESSION.session, status: "planning" },
    };

    let callCount = 0;
    await page.route(
      `**/api/brainstorm/sessions/${BASE_SESSION_ID}`,
      async (route: Route) => {
        callCount += 1;
        const data =
          callCount === 1 ? planningSession : MOCK_SESSION_WITH_IDEAS;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data }),
        });
      }
    );
    await page.route(
      `**/api/brainstorm/sessions/${BASE_SESSION_ID}/divergent`,
      async (route: Route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
    );

    await page.goto(`/brain-storm-ai/sessions/${BASE_SESSION_ID}`);
    await expect(
      page.getByTestId("run-phase-divergent"),
      "Ø²Ø± ØªØ´ØºÙŠÙ„ Ù…Ø±Ø­Ù„Ø© divergent Ø¸Ø§Ù‡Ø±"
    ).toBeVisible();

    await page.getByTestId("run-phase-divergent").click();

    await expect(
      page.getByTestId(`idea-card-IDEA-001`),
      "Ø§Ù„ÙÙƒØ±Ø© Ø¸Ø§Ù‡Ø±Ø© Ø¨Ø¹Ø¯ ØªØ´ØºÙŠÙ„ Ø§Ù„Ù…Ø±Ø­Ù„Ø©"
    ).toBeVisible({ timeout: 10000 });
  });

  test("ØªØ¹Ø±Ø¶ ØµÙØ­Ø© Ø§Ù„Ù€ concepts Ø§Ù„Ø¯ÙˆØ³ÙŠÙ‡ Ø§Ù„ØµØ­ÙŠØ­", async ({
    page,
  }) => {
    await setupMocks(page);
    await page.goto(`/brain-storm-ai/sessions/${BASE_SESSION_ID}/concepts`);

    await expect(page.getByTestId("concepts-page")).toBeVisible();
    await expect(
      page.getByTestId("concept-tab-IDEA-001"),
      "ØªØ¨ÙˆÙŠØ¨ Ø§Ù„Ù€ concept Ø¸Ø§Ù‡Ø±"
    ).toBeVisible();
    await expect(
      page.getByTestId("dossier-IDEA-001"),
      "Ø§Ù„Ø¯ÙˆØ³ÙŠÙ‡ Ø¸Ø§Ù‡Ø±"
    ).toBeVisible();
  });
});
