/**
 * Performance: backend health endpoints remain within latency budgets.
 */

import { expect } from "chai";

import { getEnvironment, performanceBudget } from "../../config/index.js";
import { sampleApiEndpoint } from "../../src/utils/PerformanceProbe.js";
import { logger } from "../../src/utils/Logger.js";

const log = logger("backend-health.performance.test");
const env = getEnvironment();

describe("Performance | Backend health latency", function suite() {
  this.timeout(120_000);

  it("/healthz p95 and max latency stay within budget", async function () {
    const summary = await sampleApiEndpoint(
      env.backend.livenessEndpoint,
      performanceBudget.minApiSamples,
      env.timeouts.apiRequestMs
    );
    log.info({ summary, budget: performanceBudget }, "API performance summary");

    expect(summary.samples.length, "sample count").to.be.at.least(
      performanceBudget.minApiSamples
    );
    expect(summary.p95Ms, `p95 ${summary.p95Ms}ms`).to.be.below(
      performanceBudget.apiHealthP95Ms
    );
    expect(summary.maxMs, `max ${summary.maxMs}ms`).to.be.below(
      performanceBudget.apiHealthMaxMs
    );
  });
});
