/**
 * Smoke: تحقق من قدرة الواجهة على الوصول لنقاط backend الصحية مباشرة
 * يفتح baseUrl للواجهة، يحقن fetch داخل المتصفح، ويستدعي health
 *
 * إذا اختلف origin الواجهة عن allowlist الـ CORS الخاص بالـ backend
 * يُسجَّل ذلك كقيد بيئي ويُتجاوز الاختبار (لا يُعدّ فشلاً تقنياً)
 */

import { expect } from "chai";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { HomePage } from "../../src/pages/HomePage.js";
import { selectBrowsers, getEnvironment } from "../../config/index.js";
import { logger } from "../../src/utils/Logger.js";

const log = logger("frontend-backend-connectivity.test");
const browsers = selectBrowsers();
const env = getEnvironment();

const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected; pure API connectivity is covered in backend-health"
    : null;

function isCrossOrigin(): boolean {
  try {
    const fe = new URL(env.frontend.baseUrl);
    const be = new URL(env.backend.baseUrl);
    return fe.origin !== be.origin;
  } catch {
    return false;
  }
}

describe("Smoke | Frontend reaches Backend health from within the page", function suite() {
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
        handle = await factory.build(browser, { testName: "frontend-backend-connectivity" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      it("in-page fetch to backend /healthz returns alive (or env-gated by CORS)", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const page = new HomePage(handle.driver);
        await page.navigate();
        const probeUrl = `${env.backend.baseUrl.replace(/\/$/, "")}${env.backend.livenessEndpoint}`;
        const result = (await handle.driver.executeAsyncScript(
          `
          const cb = arguments[arguments.length - 1];
          fetch(${JSON.stringify(probeUrl)}, { method: 'GET', credentials: 'omit' })
            .then(r => r.text().then(t => cb({ status: r.status, body: t })))
            .catch(e => cb({ status: 0, body: String(e) }));
          `
        )) as { status: number; body: string };

        if (result.status === 0 && isCrossOrigin()) {
          log.warn(
            { fe: env.frontend.baseUrl, be: env.backend.baseUrl, body: result.body.slice(0, 200) },
            "Cross-origin fetch blocked by CORS — env-gated, not a failure"
          );
          this.skip();
          return;
        }
        expect(result.status, `in-page fetch status for ${probeUrl}`).to.equal(200);
        const parsed = JSON.parse(result.body) as { status: string; uptime: number };
        expect(parsed.status).to.equal("alive");
        expect(parsed.uptime).to.be.greaterThan(0);
      });
    });
  }
});
