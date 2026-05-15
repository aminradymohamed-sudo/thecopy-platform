/**
 * Smoke: مرور سريع على كل صفحات (main) المؤكَّدة
 * يُولّد اختباراً واحداً لكل استوديو من PLATFORM_STUDIOS
 */

import { expect } from "chai";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { StudioPage } from "../../src/pages/StudioPage.js";
import { PLATFORM_STUDIOS } from "../../src/pages/index.js";
import { captureScreenshot } from "../../src/utils/ScreenshotHelper.js";
import { selectBrowsers, getEnvironment } from "../../config/index.js";
import { RUN_STAMP } from "../../src/utils/Hooks.js";

const browsers = selectBrowsers();
const env = getEnvironment();
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected and VERCEL_AUTOMATION_BYPASS_SECRET missing"
    : null;

describe("Smoke | (main) studios availability", function suite() {
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
        handle = await factory.build(browser, { testName: "studios-availability" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      for (const studio of PLATFORM_STUDIOS) {
        it(`renders ${studio.slug}`, async function () {
          if (skipReason || !handle) {
            this.skip();
            return;
          }
          const page = new StudioPage(handle.driver, studio.slug);
          try {
            await page.navigate();
            const state = await page.readinessState();
            const url = await page.getCurrentUrl();
            expect(state, `readyState for /${studio.slug}`).to.equal("complete");
            expect(url, `current url for /${studio.slug}`).to.include(studio.slug);
          } catch (err) {
            await captureScreenshot(handle.driver, {
              runStamp: RUN_STAMP,
              browser,
              testTitle: `studio__${studio.slug}`,
              reason: "failure",
            });
            throw err;
          }
        });
      }
    });
  }
});
