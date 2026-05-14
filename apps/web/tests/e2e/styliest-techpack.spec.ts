/**
 * ============================================================================
 * Playwright E2E â€” StyleIST Tech Pack Export
 * ============================================================================
 *
 * ÙŠØºØ·ÙŠ Ù…Ø³Ø§Ø± ØªØµØ¯ÙŠØ± Tech Pack Ø§Ù„ÙƒØ§Ù…Ù„ Ù„ØªØ·Ø¨ÙŠÙ‚ /styleIST:
 *   1) ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙØ­Ø© ÙˆØ§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ø¥Ù„Ù‰ ÙˆØ¶Ø¹ The Atelier
 *   2) ÙØªØ­ Ù†Ø§ÙØ°Ø© Tech Pack Modal Ù…Ù† Ø²Ø± "Generate Tech Pack"
 *   3) Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¨Ù†ÙŠØ© Ø§Ù„Ù†Ø§ÙØ°Ø© ÙˆØ¥Ù…ÙƒØ§Ù†ÙŠØ© Ø§Ù„ÙˆØµÙˆÙ„ (ARIA)
 *   4) Ø§Ù„Ø¥ØºÙ„Ø§Ù‚ Ø¨Ù…ÙØªØ§Ø­ Escape
 *   5) Ø§Ù„Ø¥ØºÙ„Ø§Ù‚ Ø¨Ø²Ø± âœ•
 *   6) ØªØµØ¯ÙŠØ± PDF â€” Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙØªØ­ Ù†Ø§ÙØ°Ø© blob Ø¬Ø¯ÙŠØ¯Ø©
 *
 * Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø¨Ù†ÙŠÙˆÙŠØ©:
 *   - Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„ØªÙ‚Ù†ÙŠ ÙŠÙÙ†Ø´Ø£ client-side Ø¨Ø¯ÙˆÙ† Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ API â†’ Ù„Ø§ Ø­Ø§Ø¬Ø© Ù„Ù…Ø­Ø§ÙƒØ§Ø© Ø§Ù„Ø®Ø§Ø¯Ù…
 *   - getSceneCostumes ÙŠÙØ¹Ø§Ø¯ ØªÙˆØ¬ÙŠÙ‡Ù‡ Ù„ØªÙØ§Ø¯ÙŠ Ø¶Ø¬ÙŠØ¬ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±
 *   - LightingStudio Ù‚Ø¯ ÙŠÙØ±Ø³Ù„ ØªØ­Ø°ÙŠØ±Ø§Øª WebGL ÙÙŠ ÙˆØ¶Ø¹ headless â€” ÙŠÙØ³ØªÙˆØ¹Ø¨ Ø¨ØµÙ…Øª
 * ============================================================================
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { test, expect, type Page, type Route } from "@playwright/test";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ù…Ø¯ÙŠØ± Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class StyleISTTestConfig {
  readonly baseUrl: string;
  readonly routePath: string;

  private constructor() {
    this.baseUrl = (
      process.env.STYLEIST_E2E_BASE_URL ??
      process.env.PLAYWRIGHT_BASE_URL ??
      `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? process.env.WEB_PORT ?? "6080"}`
    ).replace(/\/+$/, "");
    this.routePath = process.env.STYLEIST_E2E_ROUTE ?? "/styleIST";
  }

  static fromEnv(): StyleISTTestConfig {
    return new StyleISTTestConfig();
  }

  get fullUrl(): string {
    return `${this.baseUrl}${this.routePath}`;
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ø¯Ù„ÙŠÙ„ Ø§Ù„Ù…Ø®Ø±Ø¬Ø§Øª Ù„Ù„Ù‚Ø·Ø§Øª Ø§Ù„Ø´Ø§Ø´Ø©
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function ensureArtifactDir(): Promise<string> {
  const artifactDir = path.resolve(
    process.cwd(),
    "..",
    "..",
    "output",
    "playwright",
    "styliest-techpack"
  );
  await mkdir(artifactDir, { recursive: true });
  return artifactDir;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ØªÙˆØ¬ÙŠÙ‡ Ø·Ù„Ø¨Ø§Øª API ØºÙŠØ± Ø§Ù„Ø¬ÙˆÙ‡Ø±ÙŠØ© Ù„ØªÙØ§Ø¯ÙŠ Ø§Ù„Ø¶Ø¬ÙŠØ¬ ÙÙŠ Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function installApiStubs(page: Page): Promise<void> {
  // getSceneCostumes â€” ÙŠÙØ¹ÙŠØ¯ Ù…ØµÙÙˆÙØ© ÙØ§Ø±ØºØ© â†’ ÙŠØ­ØªÙØ¸ FittingRoom Ø¨Ù€ INITIAL_SCENES
  await page.route(
    /\/api\/styleist\/projects\/[^/]+\/scene-costumes/,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  );

  // saveDesign â€” ÙŠÙØ¹ÙŠØ¯ Ù†Ø¬Ø§Ø­Ø§Ù‹ ØµØ§Ù…ØªØ§Ù‹
  await page.route(/\/api\/styleist\/designs/, async (route: Route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { id: "stub-design" } }),
    });
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ø¯ÙˆØ§Ù„ Ù…Ø³Ø§Ø¹Ø¯Ø© Ù„Ù„ØªÙ†Ù‚Ù„
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * ÙŠØ­Ù…Ù‘Ù„ Ø§Ù„ØµÙØ­Ø© ÙˆÙŠÙ†ØªØ¸Ø± Ø§ÙƒØªÙ…Ø§Ù„ dynamic import
 */
async function loadStyleISTPage(page: Page, fullUrl: string): Promise<void> {
  await page.goto(fullUrl, { waitUntil: "domcontentloaded" });

  // CineFitApp ÙŠÙØ­Ù…ÙŽÙ‘Ù„ Ø¹Ø¨Ø± dynamic import (ssr: false) â€” Ù†Ù†ØªØ¸Ø± Ø¸Ù‡ÙˆØ± HomeDashboard
  await expect(
    page.getByRole("heading", { name: "The Atelier" }),
    "HomeDashboard: The Atelier Ø¸Ø§Ù‡Ø±"
  ).toBeVisible({ timeout: 60_000 });
}

/**
 * ÙŠØ¯Ø®Ù„ ÙˆØ¶Ø¹ Fitting Room Ø¹Ø¨Ø± Ø§Ù„Ù†Ù‚Ø± Ø¹Ù„Ù‰ Ø¨Ø·Ø§Ù‚Ø© The Atelier
 */
async function enterFittingRoom(page: Page): Promise<void> {
  // Ø§Ù„Ø²Ø± ÙŠØ­ØªÙˆÙŠ Ø§Ù„Ù€ h2 "The Atelier" ÙˆÙ‡Ùˆ clickable
  const atelierButton = page.getByRole("button").filter({
    has: page.getByRole("heading", { name: "The Atelier" }),
  });

  await atelierButton.click();

  // Ø§Ù†ØªØ¸Ø§Ø± Ø¸Ù‡ÙˆØ± Ø²Ø± "Generate Tech Pack" ÙÙŠ InspectorPanel
  await expect(
    page.getByRole("button", { name: "Generate Tech Pack" }),
    "FittingRoom: Ø²Ø± Generate Tech Pack Ø¸Ø§Ù‡Ø±"
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * ÙŠÙØªØ­ Ù†Ø§ÙØ°Ø© Tech Pack Modal
 */
async function openTechPackModal(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Generate Tech Pack" }).click();

  await expect(
    page.getByRole("dialog"),
    "TechPackModal: Ù†Ø§ÙØ°Ø© dialog Ø¸Ø§Ù‡Ø±Ø©"
  ).toBeVisible({ timeout: 10_000 });

  await expect(
    page.getByText("TECH PACK GENERATOR"),
    "TechPackModal: Ø¹Ù†ÙˆØ§Ù† TECH PACK GENERATOR Ø¸Ø§Ù‡Ø±"
  ).toBeVisible();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±Ø§Øª
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

test.describe("StyleIST â€” Tech Pack Export", () => {
  const config = StyleISTTestConfig.fromEnv();

  test.beforeEach(async ({ page }) => {
    await installApiStubs(page);
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test("ÙŠØ­Ù…Ù‘Ù„ Ø§Ù„ØµÙØ­Ø© ÙˆÙŠØ¹Ø±Ø¶ HomeDashboard Ø¨Ø§Ù„Ø¨Ø·Ø§Ù‚ØªÙŠÙ†", async ({
    page,
  }) => {
    const artifactDir = await ensureArtifactDir();
    await loadStyleISTPage(page, config.fullUrl);

    await expect(
      page.getByRole("heading", { name: "Design Brief" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The Atelier" })
    ).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "home-dashboard.png"),
      fullPage: true,
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test("ÙŠÙ†ØªÙ‚Ù„ Ø¥Ù„Ù‰ FittingRoom ÙˆÙŠØ¹Ø±Ø¶ Ø²Ø± Generate Tech Pack", async ({
    page,
  }) => {
    const artifactDir = await ensureArtifactDir();
    await loadStyleISTPage(page, config.fullUrl);
    await enterFittingRoom(page);

    await page.screenshot({
      path: path.join(artifactDir, "fitting-room.png"),
      fullPage: true,
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test("ÙŠÙØªØ­ TechPackModal Ø¨Ø¹Ù†Ø§ØµØ± ARIA ØµØ­ÙŠØ­Ø©", async ({
    page,
  }) => {
    const artifactDir = await ensureArtifactDir();
    await loadStyleISTPage(page, config.fullUrl);
    await enterFittingRoom(page);
    await openTechPackModal(page);

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ARIA
    const dialog = page.getByRole("dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute(
      "aria-labelledby",
      "techpack-modal-title"
    );

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ø²Ø± Ø§Ù„ØªØµØ¯ÙŠØ± ÙˆØ²Ø± Ø§Ù„Ø¥ØºÙ„Ø§Ù‚
    await expect(
      page.getByRole("button", { name: "Export PDF" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Ø¥ØºÙ„Ø§Ù‚" })
    ).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, "techpack-modal-open.png"),
      fullPage: true,
    });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test("ÙŠÙØºÙ„Ù‚ Ø§Ù„Ù†Ø§ÙØ°Ø© Ø¨Ù…ÙØªØ§Ø­ Escape", async ({ page }) => {
    await loadStyleISTPage(page, config.fullUrl);
    await enterFittingRoom(page);
    await openTechPackModal(page);

    const dialog = page.getByRole("dialog");
    await dialog.press("Escape");

    await expect(
      dialog,
      "TechPackModal: Ø§Ø®ØªÙØª Ø¨Ø¹Ø¯ Escape"
    ).not.toBeVisible({
      timeout: 5_000,
    });

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø£Ù† Ø²Ø± Generate Tech Pack Ù„Ø§ ÙŠØ²Ø§Ù„ Ù…ÙˆØ¬ÙˆØ¯Ø§Ù‹ (FittingRoom Ù„Ø§ ÙŠØ²Ø§Ù„ Ø¸Ø§Ù‡Ø±Ø§Ù‹)
    await expect(
      page.getByRole("button", { name: "Generate Tech Pack" })
    ).toBeVisible();
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test("ÙŠÙØºÙ„Ù‚ Ø§Ù„Ù†Ø§ÙØ°Ø© Ø¨Ø²Ø± âœ•", async ({ page }) => {
    await loadStyleISTPage(page, config.fullUrl);
    await enterFittingRoom(page);
    await openTechPackModal(page);

    await page.getByRole("button", { name: "Ø¥ØºÙ„Ø§Ù‚" }).click();

    await expect(
      page.getByRole("dialog"),
      "TechPackModal: Ø§Ø®ØªÙØª Ø¨Ø¹Ø¯ Ø§Ù„Ù†Ù‚Ø± Ø¹Ù„Ù‰ âœ•"
    ).not.toBeVisible({ timeout: 5_000 });
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test("Export PDF ÙŠÙØªØ­ Ù†Ø§ÙØ°Ø© blob Ø¬Ø¯ÙŠØ¯Ø© Ø¨Ù…Ø­ØªÙˆÙ‰ HTML ØµØ­ÙŠØ­", async ({
    page,
  }) => {
    const artifactDir = await ensureArtifactDir();
    await loadStyleISTPage(page, config.fullUrl);
    await enterFittingRoom(page);
    await openTechPackModal(page);

    // Ù†Ø³ØªÙ…Ø¹ Ù„Ø­Ø¯Ø« Ø§Ù„Ù€ popup Ù‚Ø¨Ù„ Ø§Ù„Ù†Ù‚Ø±
    const popupPromise = page.waitForEvent("popup", { timeout: 15_000 });

    await page.getByRole("button", { name: "Export PDF" }).click();

    const popup = await popupPromise;

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø£Ù† Ø§Ù„Ù€ URL Ù…Ù† Ù†ÙˆØ¹ blob
    expect(
      popup.url(),
      "Export PDF: Ø§Ù„Ù€ popup ÙŠØ³ØªØ®Ø¯Ù… blob URL"
    ).toMatch(/^blob:/);

    // Ø§Ù†ØªØ¸Ø§Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„ØµÙØ­Ø©
    await popup.waitForLoadState("domcontentloaded", { timeout: 10_000 });

    // Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† ÙˆØ¬ÙˆØ¯ Ù…Ø­ØªÙˆÙ‰ Tech Pack ÙÙŠ Ø§Ù„ØµÙØ­Ø©
    const pageTitle = await popup.title();
    expect(
      pageTitle,
      "Export PDF: Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ØµÙØ­Ø© ÙŠØªØ¶Ù…Ù† Tech Pack"
    ).toContain("Tech Pack");

    await popup.screenshot({
      path: path.join(artifactDir, "techpack-export-popup.png"),
      fullPage: true,
    });

    await popup.close();
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test("ÙŠÙ…ÙƒÙ† ÙØªØ­ Ø§Ù„Ù†Ø§ÙØ°Ø© Ù…Ø±Ø© Ø«Ø§Ù†ÙŠØ© Ø¨Ø¹Ø¯ Ø¥ØºÙ„Ø§Ù‚Ù‡Ø§", async ({
    page,
  }) => {
    await loadStyleISTPage(page, config.fullUrl);
    await enterFittingRoom(page);

    // ÙØªØ­ â†’ Ø¥ØºÙ„Ø§Ù‚ â†’ ÙØªØ­ Ù…Ø¬Ø¯Ø¯Ø§Ù‹
    await openTechPackModal(page);
    await page.getByRole("button", { name: "Ø¥ØºÙ„Ø§Ù‚" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await openTechPackModal(page);
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("TECH PACK GENERATOR")).toBeVisible();
  });

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  test("Ø§Ù„Ù†Ù‚Ø± Ø®Ø§Ø±Ø¬ Ø§Ù„Ù†Ø§ÙØ°Ø© ÙŠÙØºÙ„Ù‚Ù‡Ø§ (backdrop click)", async ({
    page,
  }) => {
    await loadStyleISTPage(page, config.fullUrl);
    await enterFittingRoom(page);
    await openTechPackModal(page);

    // Ø§Ù„Ù†Ù‚Ø± Ø¹Ù„Ù‰ Ø§Ù„Ù€ backdrop (Ø§Ù„Ø®Ù„ÙÙŠØ© Ø®Ø§Ø±Ø¬ Ø§Ù„Ù†Ø§ÙØ°Ø©)
    // Ø§Ù„Ù€ backdrop Ù‡Ùˆ Ø§Ù„Ù€ div Ø§Ù„Ø£ÙˆÙ„ ÙÙŠ fixed inset-0 â€” Ù†Ù†Ù‚Ø± ÙÙŠ Ø§Ù„Ø²Ø§ÙˆÙŠØ© Ø§Ù„Ø¹Ù„ÙˆÙŠØ© Ø§Ù„ÙŠØ³Ø±Ù‰
    await page.mouse.click(10, 10);

    await expect(
      page.getByRole("dialog"),
      "TechPackModal: Ø§Ø®ØªÙØª Ø¨Ø¹Ø¯ Ø§Ù„Ù†Ù‚Ø± Ø¹Ù„Ù‰ Ø§Ù„Ù€ backdrop"
    ).not.toBeVisible({ timeout: 5_000 });
  });
});
