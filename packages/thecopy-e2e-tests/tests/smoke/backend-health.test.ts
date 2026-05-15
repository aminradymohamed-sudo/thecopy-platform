/**
 * Smoke: فحص صحة الخدمة الخلفية على بيئة الـ Staging
 * يستهدف نقاط: /health و /healthz
 */

import { expect } from "chai";
import { HealthCheckAPI } from "../../src/api/HealthCheckAPI.js";
import { getEnvironment } from "../../config/index.js";

describe("Smoke | Backend Health", function suite() {
  this.timeout(60_000);

  const api = new HealthCheckAPI();
  const env = getEnvironment();

  it("/healthz should return 200 alive", async function () {
    const res = await api.getLiveness();
    expect(res.status, `Liveness ${env.backend.baseUrl}${env.backend.livenessEndpoint}`).to.equal(200);
    expect(res.body, "liveness body").to.not.be.null;
    expect(res.body?.status).to.equal("alive");
    expect(res.body?.uptime).to.be.a("number").and.greaterThan(0);
  });

  it("/health should return 200 and report required subsystems healthy", async function () {
    const res = await api.getHealth();
    expect(res.status).to.equal(200);
    expect(res.body, "health body").to.not.be.null;
    const body = res.body!;
    expect(body.status).to.be.oneOf(["healthy", "degraded"]);
    expect(body.checks).to.be.an("object");

    const requiredKeys = ["database", "database_schema", "redis"] as const;
    for (const key of requiredKeys) {
      const entry = body.checks[key];
      expect(entry, `check.${key}`).to.exist;
      expect(entry!.status, `check.${key}.status`).to.equal("healthy");
    }
  });

  it("/health response should arrive under 5 seconds (SLO)", async function () {
    const res = await api.getHealth();
    expect(res.durationMs, `health duration ${res.durationMs}ms`).to.be.below(5_000);
  });
});
