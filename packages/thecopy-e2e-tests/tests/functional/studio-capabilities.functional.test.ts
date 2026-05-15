/**
 * Functional: confirmed studios provide user-usable surfaces, not empty route shells.
 */

import { expect } from "chai";

import { getEnvironment, selectBrowsers } from "../../config/index.js";
import { TheCopyExperience } from "../../src/flows/TheCopyExperience.js";
import { PLATFORM_STUDIOS } from "../../src/pages/index.js";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { RUN_STAMP } from "../../src/utils/Hooks.js";
import { captureScreenshot } from "../../src/utils/ScreenshotHelper.js";

const env = getEnvironment();
const browsers = selectBrowsers();
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected and VERCEL_AUTOMATION_BYPASS_SECRET missing"
    : null;

describe("Functional | Studio capabilities", function suite() {
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
        handle = await factory.build(browser, { testName: "functional-studios" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      for (const studio of PLATFORM_STUDIOS) {
        it(`${studio.slug} exposes a functional user surface`, async function () {
          if (skipReason || !handle) {
            this.skip();
            return;
          }
          const experience = new TheCopyExperience(handle.driver);
          try {
            const page = await experience.openStudio(studio);
            const signal = await page.readContentSignal();
            expect(signal.hasMeaningfulContent, `${studio.slug} meaningful content`).to.equal(
              true
            );
            expect(
              signal.hasInteractive || signal.visibleTextLength > 100,
              `${studio.slug} interactive or text-rich surface`
            ).to.equal(true);
          } catch (err) {
            await captureScreenshot(handle.driver, {
              runStamp: RUN_STAMP,
              browser,
              testTitle: `functional__studio__${studio.slug}`,
              reason: "failure",
            });
            throw err;
          }
        });
      }
    });
  }
});
