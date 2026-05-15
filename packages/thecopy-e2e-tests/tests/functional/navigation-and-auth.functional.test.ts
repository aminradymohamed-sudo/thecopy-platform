/**
 * Functional: visible user-facing auth and navigation capabilities.
 */

import { expect } from "chai";

import { getEnvironment, selectBrowsers } from "../../config/index.js";
import { TheCopyExperience } from "../../src/flows/TheCopyExperience.js";
import { BasePage } from "../../src/pages/BasePage.js";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { RUN_STAMP } from "../../src/utils/Hooks.js";
import { captureScreenshot } from "../../src/utils/ScreenshotHelper.js";

const env = getEnvironment();
const browsers = selectBrowsers();
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected and VERCEL_AUTOMATION_BYPASS_SECRET missing"
    : null;

describe("Functional | Navigation and auth pages", function suite() {
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
        handle = await factory.build(browser, { testName: "functional-navigation-auth" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      it("home page exposes main content and primary navigation controls", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const experience = new TheCopyExperience(handle.driver);
        try {
          const home = await experience.openHome();
          expect(await home.hasMainLandmark(), "main landmark").to.equal(true);
          expect(await home.hasNavigationLandmark(), "navigation landmark").to.equal(true);
          expect(await home.pageHasArabicContent(), "Arabic content").to.equal(true);
          expect(await experience.pageExposesUserNavigation(), "primary navigation").to.equal(true);
        } catch (err) {
          await captureScreenshot(handle.driver, {
            runStamp: RUN_STAMP,
            browser,
            testTitle: "functional__home_navigation",
            reason: "failure",
          });
          throw err;
        }
      });

      it("login and register pages expose usable forms", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const experience = new TheCopyExperience(handle.driver);
        try {
          const login = await experience.openLogin();
          expect(await login.hasRegisterLink(), "login register link").to.equal(true);
          expect(await login.findOptional(BasePage.byText("تسجيل الدخول"))).to.not.equal(null);

          const register = await experience.openRegister();
          expect(await register.findOptional(BasePage.byText("إنشاء حساب"))).to.not.equal(null);
        } catch (err) {
          await captureScreenshot(handle.driver, {
            runStamp: RUN_STAMP,
            browser,
            testTitle: "functional__auth_forms",
            reason: "failure",
          });
          throw err;
        }
      });
    });
  }
});
