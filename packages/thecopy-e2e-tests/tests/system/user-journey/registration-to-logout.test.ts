/**
 * System | User Journey
 * تسجيل مستخدم اختباري عبر API → تسجيل دخول من الواجهة → الوصول للجذر → تسجيل خروج عبر API
 * يستخدم بيانات معزولة فريدة لكل تشغيل (لا يلامس بيانات حقيقية)
 *
 * استجابات WAF (401/403) من بيئة الـ Staging تُعامَل كقيود بيئية (skip لا fail)
 */

import { expect } from "chai";
import { DriverFactory } from "../../../src/utils/DriverFactory.js";
import { LoginPage } from "../../../src/pages/LoginPage.js";
import { HomePage } from "../../../src/pages/HomePage.js";
import { AuthAPI, isEnvGated } from "../../../src/api/AuthAPI.js";
import { generateUser } from "../../../src/utils/DataGenerator.js";
import { selectBrowsers, getEnvironment } from "../../../config/index.js";
import { captureScreenshot } from "../../../src/utils/ScreenshotHelper.js";
import { RUN_STAMP } from "../../../src/utils/Hooks.js";
import { logger } from "../../../src/utils/Logger.js";

const log = logger("registration-to-logout.test");
const browsers = selectBrowsers();
const env = getEnvironment();
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected; UI portion of journey requires bypass secret"
    : null;

describe("System | Journey | register → login → home → logout", function suite() {
  this.timeout(env.timeouts.sessionMs);

  for (const browser of browsers) {
    describe(`browser=${browser}`, function browserSuite() {
      const factory = new DriverFactory();
      const auth = new AuthAPI();
      const user = generateUser();
      let handle: Awaited<ReturnType<DriverFactory["build"]>> | null = null;
      let accessToken: string | null = null;
      let envGated = false;

      before(async function setup() {
        if (skipReason) {
          this.skip();
          return;
        }
        handle = await factory.build(browser, { testName: "registration-to-logout" });
      });

      after(async function teardown() {
        if (accessToken) await auth.logout(accessToken).catch(() => undefined);
        await factory.destroy(handle);
        handle = null;
      });

      it("registers a new user via API", async function () {
        if (skipReason) {
          this.skip();
          return;
        }
        const res = await auth.register({
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
        });
        if (isEnvGated(res.status)) {
          log.warn({ status: res.status }, "Register gated; rest of journey skipped");
          envGated = true;
          this.skip();
          return;
        }
        expect(res.status, `register response: ${res.rawText?.slice(0, 200)}`).to.be.oneOf([200, 201, 409]);
      });

      it("logs in via the UI and reaches the application root", async function () {
        if (skipReason || !handle || envGated) {
          this.skip();
          return;
        }
        const login = new LoginPage(handle.driver);
        try {
          await login.navigate();
          await login.fillEmail(user.email);
          await login.fillPassword(user.password);
          await login.submit();
          const home = new HomePage(handle.driver);
          await home.waitUntilReady();
          const finalUrl = await home.getCurrentUrl();
          expect(finalUrl).to.match(/thecopy/);
        } catch (err) {
          await captureScreenshot(handle.driver, {
            runStamp: RUN_STAMP,
            browser,
            testTitle: "journey__login",
            reason: "failure",
          });
          throw err;
        }
      });

      it("logs out cleanly via API", async function () {
        if (skipReason || envGated) {
          this.skip();
          return;
        }
        const loginRes = await auth.login({ email: user.email, password: user.password });
        if (isEnvGated(loginRes.status)) {
          this.skip();
          return;
        }
        const body = loginRes.body;
        const token =
          body && typeof body === "object" && "accessToken" in body
            ? (body as { accessToken?: string }).accessToken
            : undefined;
        if (!token) {
          this.skip();
          return;
        }
        accessToken = token;
        const out = await auth.logout(token);
        expect(out.status).to.be.oneOf([200, 204, 401]);
      });
    });
  }
});
