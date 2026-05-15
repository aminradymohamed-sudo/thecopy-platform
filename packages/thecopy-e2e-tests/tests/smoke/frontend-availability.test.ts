/**
 * Smoke: توفّر الواجهة الأمامية على المتصفحات المختارة
 * إذا كانت الواجهة محمية بـ Vercel SSO ولا يوجد bypass،
 * يُفترض أن يعمل الاختبار ضد production تلقائياً عبر TEST_ENV=production
 */

import { expect } from "chai";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { HomePage } from "../../src/pages/HomePage.js";
import { captureScreenshot } from "../../src/utils/ScreenshotHelper.js";
import { selectBrowsers, getEnvironment } from "../../config/index.js";
import { RUN_STAMP } from "../../src/utils/Hooks.js";

const browsers = selectBrowsers();
const env = getEnvironment();
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected and VERCEL_AUTOMATION_BYPASS_SECRET missing"
    : null;

describe("Smoke | Frontend availability", function suite() {
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
        handle = await factory.build(browser, { testName: "frontend-availability" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      it("homepage loads, has DOM, and renders Arabic content", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const page = new HomePage(handle.driver);
        await page.navigate();
        const url = await page.getCurrentUrl();
        const title = await page.getTitle();
        const state = await page.readinessState();
        const arabic = await page.pageHasArabicContent();
        const navOk = await page.hasNavigationLandmark();
        try {
          expect(url, "final url").to.be.a("string").and.have.length.greaterThan(0);
          expect(title, "document title").to.be.a("string");
          expect(state, "readyState").to.equal("complete");
          expect(arabic, "page must contain Arabic content").to.equal(true);
          expect(navOk, "navigation landmark").to.equal(true);
        } catch (err) {
          await captureScreenshot(handle.driver, {
            runStamp: RUN_STAMP,
            browser,
            testTitle: "frontend-availability__homepage",
            reason: "failure",
          });
          throw err;
        }
      });
    });
  }
});
