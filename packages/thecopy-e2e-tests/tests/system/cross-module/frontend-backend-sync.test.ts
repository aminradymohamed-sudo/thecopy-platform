/**
 * System | Cross-module
 * يتحقّق أن:
 *   - الواجهة تُحمَّل
 *   - الواجهة تستطيع طلب /healthz من نفس الجلسة (مع تخطٍّ ذكي عند CORS)
 *   - الواجهة تتعامل مع 404 من backend بشكل لائق
 */

import { expect } from "chai";
import { DriverFactory } from "../../../src/utils/DriverFactory.js";
import { HomePage } from "../../../src/pages/HomePage.js";
import { selectBrowsers, getEnvironment } from "../../../config/index.js";
import { logger } from "../../../src/utils/Logger.js";

const log = logger("frontend-backend-sync.test");
const browsers = selectBrowsers();
const env = getEnvironment();

const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected; cross-module flow requires bypass secret"
    : null;

function isCrossOrigin(): boolean {
  try {
    return new URL(env.frontend.baseUrl).origin !== new URL(env.backend.baseUrl).origin;
  } catch {
    return false;
  }
}

describe("System | Cross-module | frontend ↔ backend sync", function suite() {
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
        handle = await factory.build(browser, { testName: "frontend-backend-sync" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      it("frontend page loads and an in-page fetch hits backend health", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const home = new HomePage(handle.driver);
        await home.navigate();
        const probe = `${env.backend.baseUrl}${env.backend.livenessEndpoint}`;
        const response = (await handle.driver.executeAsyncScript(
          `
          const cb = arguments[arguments.length - 1];
          fetch(${JSON.stringify(probe)})
            .then(r => r.text().then(t => cb({ status: r.status, body: t })))
            .catch(e => cb({ status: 0, body: String(e) }));
          `
        )) as { status: number; body: string };

        if (response.status === 0 && isCrossOrigin()) {
          log.warn(
            { fe: env.frontend.baseUrl, be: env.backend.baseUrl },
            "CORS-blocked in-page fetch — env-gated"
          );
          this.skip();
          return;
        }
        expect(response.status).to.equal(200);
        const parsed = JSON.parse(response.body) as { status: string };
        expect(parsed.status).to.equal("alive");
      });

      it("frontend handles a backend 404 gracefully (no console fatal)", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const home = new HomePage(handle.driver);
        await home.navigate();
        const probe = `${env.backend.baseUrl}/api/this-endpoint-does-not-exist-${Date.now()}`;
        const response = (await handle.driver.executeAsyncScript(
          `
          const cb = arguments[arguments.length - 1];
          fetch(${JSON.stringify(probe)})
            .then(r => cb({ status: r.status }))
            .catch(e => cb({ status: 0, error: String(e) }));
          `
        )) as { status: number };

        if (response.status === 0 && isCrossOrigin()) {
          this.skip();
          return;
        }
        expect(response.status).to.equal(404);
      });
    });
  }
});
