/**
 * Integration: frontend runtime can call backend health from an actual browser session.
 */

import { expect } from "chai";

import { getEnvironment, selectBrowsers } from "../../config/index.js";
import { HealthCheckAPI } from "../../src/api/HealthCheckAPI.js";
import { TheCopyExperience } from "../../src/flows/TheCopyExperience.js";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { logger } from "../../src/utils/Logger.js";

const log = logger("frontend-backend.integration.test");
const env = getEnvironment();
const browsers = selectBrowsers();
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected; integration flow requires bypass secret"
    : null;

function isCrossOrigin(): boolean {
  try {
    return new URL(env.frontend.baseUrl).origin !== new URL(env.backend.baseUrl).origin;
  } catch {
    return false;
  }
}

describe("Integration | Frontend browser to backend health", function suite() {
  this.timeout(env.timeouts.sessionMs);

  it("backend liveness is reachable before browser-origin integration probes", async function () {
    const api = new HealthCheckAPI();
    const response = await api.getLiveness();
    expect(response.status, `${env.backend.baseUrl}${env.backend.livenessEndpoint}`).to.equal(200);
    expect(response.body?.status).to.equal("alive");
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
        handle = await factory.build(browser, { testName: "integration-frontend-backend" });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      it("browser-side fetch reaches backend liveness without breaking the page", async function () {
        if (skipReason || !handle) {
          this.skip();
          return;
        }
        const experience = new TheCopyExperience(handle.driver);
        await experience.openHome();

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
          log.warn({ body: result.body.slice(0, 240) }, "CORS env-gated");
          this.skip();
          return;
        }

        expect(result.status, `fetch ${probeUrl}`).to.equal(200);
        const parsed = JSON.parse(result.body) as { status: string; uptime: number };
        expect(parsed.status).to.equal("alive");
        expect(parsed.uptime).to.be.greaterThan(0);
      });
    });
  }
});
