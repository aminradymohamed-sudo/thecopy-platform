/**
 * Regression: stable platform contracts that should not break after changes.
 */

import { expect } from "chai";

import { getEnvironment, selectBrowsers } from "../../config/index.js";
import { TheCopyExperience } from "../../src/flows/TheCopyExperience.js";
import { PLATFORM_STUDIOS } from "../../src/pages/index.js";
import { TEST_TAXONOMY } from "../../src/testing/TestTaxonomy.js";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { RUN_STAMP } from "../../src/utils/Hooks.js";
import { captureScreenshot } from "../../src/utils/ScreenshotHelper.js";

const env = getEnvironment();
const browsers = selectBrowsers();
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected and VERCEL_AUTOMATION_BYPASS_SECRET missing"
    : null;

describe("Regression | Platform contracts", function suite() {
  this.timeout(env.timeouts.sessionMs);

  it("suite taxonomy keeps regression as a first-class discipline", function () {
    const regression = TEST_TAXONOMY.find((entry) => entry.id === "regression");
    expect(regression, "regression taxonomy entry").to.exist;
    expect(regression?.ciRequired).to.equal(true);
    expect(regression?.gridRequired).to.equal(true);
  });

  for (const browser of browsers) {
    describe(`browser=${browser}`, function browserSuite() {
      const factory = new DriverFactory();
      let handle: Awaited<ReturnType<DriverFactory["build"]>> | null = null;

      before(async function setup() {
        if (skipReason) {
          this.skip();
          return;
        }
        handle = await factory.build(browser, { testName: "regression-platform-contracts" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      it("all canonical studio routes still resolve to meaningful pages", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const experience = new TheCopyExperience(handle.driver);
        for (const studio of PLATFORM_STUDIOS) {
          try {
            const page = await experience.openStudio(studio);
            const url = await page.getCurrentUrl();
            const signal = await page.readContentSignal();
            expect(url, `${studio.slug} url`).to.include(studio.slug);
            expect(signal.hasMeaningfulContent, `${studio.slug} content`).to.equal(true);
          } catch (err) {
            await captureScreenshot(handle.driver, {
              runStamp: RUN_STAMP,
              browser,
              testTitle: `regression__studio__${studio.slug}`,
              reason: "failure",
            });
            throw err;
          }
        }
      });
    });
  }
});
