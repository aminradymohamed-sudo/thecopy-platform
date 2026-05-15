/**
 * BDD: executable Gherkin scenarios backed by Selenium Page Objects.
 */

import { resolve } from "node:path";

import { getEnvironment, selectBrowsers } from "../../config/index.js";
import { readFeatureFile, runScenario } from "../../src/bdd/FeatureFile.js";
import { createPlatformWorld, platformSteps } from "../../src/bdd/platformSteps.js";
import { DriverFactory } from "../../src/utils/DriverFactory.js";
import { RUN_STAMP } from "../../src/utils/Hooks.js";
import { captureScreenshot } from "../../src/utils/ScreenshotHelper.js";

const env = getEnvironment();
const browsers = selectBrowsers();
const featurePath = resolve(process.cwd(), "features/platform-availability.feature");
const feature = await readFeatureFile(featurePath);
const skipReason =
  env.frontend.isProtected && !env.frontend.vercelBypassSecret
    ? "Frontend protected and VERCEL_AUTOMATION_BYPASS_SECRET missing"
    : null;

describe(`BDD | ${feature.name}`, function suite() {
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
        handle = await factory.build(browser, { testName: `bdd-${feature.name}` });
      });

      after(async function teardown() {
        await factory.destroy(handle);
        handle = null;
      });

      for (const scenario of feature.scenarios) {
        it(`Scenario: ${scenario.name}`, async function () {
          if (skipReason || !handle) {
            this.skip();
            return;
          }
          const world = createPlatformWorld(handle.driver);
          try {
            await runScenario(world, scenario, platformSteps);
          } catch (err) {
            await captureScreenshot(handle.driver, {
              runStamp: RUN_STAMP,
              browser,
              testTitle: `bdd__${scenario.name}`,
              reason: "failure",
            });
            throw err;
          }
        });
      }
    });
  }
});
