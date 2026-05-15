/**
 * Performance: browser Navigation Timing budgets through Selenium Grid.
 */

import { expect } from "chai";

import { getEnvironment, performanceBudget, selectBrowsers } from "../../config/index.js";
import { TheCopyExperience } from "../../src/flows/TheCopyExperience.js";
import { PLATFORM_STUDIOS } from "../../src/pages/index.js";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { readNavigationTiming } from "../../src/utils/PerformanceProbe.js";
import { logger } from "../../src/utils/Logger.js";

const log = logger("frontend-navigation.performance.test");
const env = getEnvironment();
const browsers = selectBrowsers();
const representativeStudio = PLATFORM_STUDIOS.find((studio) => studio.slug === "analysis") ?? PLATFORM_STUDIOS[0];
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected and VERCEL_AUTOMATION_BYPASS_SECRET missing"
    : null;

describe("Performance | Frontend navigation timing", function suite() {
  this.timeout(env.timeouts.sessionMs);

  for (const browser of browsers) {
    describe(`browser=${browser}`, function browserSuite() {
      const factory = new DriverFactory();
      let handle: Awaited<ReturnType<DriverFactory["build"]>> | null = null;

      before(async function setup() {
        if (skipReason) {
          this.skip();
          return;
        }
        handle = await factory.build(browser, { testName: "performance-navigation" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      it("home page completes load and DOM content within budget", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const experience = new TheCopyExperience(handle.driver);
        await experience.openHome();
        const timing = await readNavigationTiming(handle.driver);
        log.info({ browser, timing }, "Home navigation timing");
        expect(timing.durationMs, "home duration").to.be.below(
          performanceBudget.frontendHomeLoadMs
        );
        expect(timing.domContentLoadedMs, "home DOMContentLoaded").to.be.below(
          performanceBudget.frontendDomContentLoadedMs
        );
      });

      it(`${representativeStudio.slug} studio completes load within budget`, async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const experience = new TheCopyExperience(handle.driver);
        await experience.openStudio(representativeStudio);
        const timing = await readNavigationTiming(handle.driver);
        log.info({ browser, studio: representativeStudio.slug, timing }, "Studio navigation timing");
        expect(timing.durationMs, "studio duration").to.be.below(
          performanceBudget.frontendStudioLoadMs
        );
      });
    });
  }
});
