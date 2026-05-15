/**
 * System | Critical paths
 * تحميل عميق لكل استوديو من PLATFORM_STUDIOS
 * شروط النجاح: readyState=complete، الـ URL يحمل slug، الصفحة تنتج محتوى ذا معنى
 *   (نصاً مرئياً > 30 حرفاً أو عنصر تفاعل واحد على الأقل)
 */

import { expect } from "chai";
import { DriverFactory } from "../../../src/utils/DriverFactory.js";
import { StudioPage } from "../../../src/pages/StudioPage.js";
import { PLATFORM_STUDIOS } from "../../../src/pages/index.js";
import { captureScreenshot } from "../../../src/utils/ScreenshotHelper.js";
import { selectBrowsers, getEnvironment } from "../../../config/index.js";
import { RUN_STAMP } from "../../../src/utils/Hooks.js";
import { logger } from "../../../src/utils/Logger.js";

const log = logger("studios-deep-load.test");
const browsers = selectBrowsers();
const env = getEnvironment();
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected and VERCEL_AUTOMATION_BYPASS_SECRET missing"
    : null;

describe("System | Critical paths | studios deep load", function suite() {
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
        handle = await factory.build(browser, { testName: "studios-deep-load" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      for (const studio of PLATFORM_STUDIOS) {
        it(`${studio.slug} loads completely with meaningful content`, async function () {
          if (skipReason || !handle) {
            this.skip();
            return;
          }
          const page = new StudioPage(handle.driver, studio.slug);
          try {
            await page.navigate();
            const state = await page.readinessState();
            const url = await page.getCurrentUrl();
            const signal = await page.readContentSignal();
            log.info({ studio: studio.slug, ...signal }, "Studio content signal");
            expect(state, `readyState ${studio.slug}`).to.equal("complete");
            expect(url, `url contains slug ${studio.slug}`).to.include(studio.slug);
            expect(signal.htmlBytes, `htmlBytes ${studio.slug}`).to.be.greaterThan(500);
            expect(
              signal.hasMeaningfulContent,
              `studio ${studio.slug} produced no meaningful content (textLen=${signal.visibleTextLength}, interactive=${signal.hasInteractive})`
            ).to.equal(true);
          } catch (err) {
            await captureScreenshot(handle.driver, {
              runStamp: RUN_STAMP,
              browser,
              testTitle: `critical__${studio.slug}`,
              reason: "failure",
            });
            throw err;
          }
        });
      }
    });
  }
});
