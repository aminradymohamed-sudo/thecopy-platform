/**
 * Performance budgets for browser and API checks.
 * Values can be tightened per environment with env vars without changing tests.
 */

import type { PerformanceBudgetConfig } from "./types.js";

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const performanceBudget: PerformanceBudgetConfig = {
  apiHealthP95Ms: readPositiveInt("E2E_API_HEALTH_P95_MS", 5_000),
  apiHealthMaxMs: readPositiveInt("E2E_API_HEALTH_MAX_MS", 8_000),
  frontendHomeLoadMs: readPositiveInt("E2E_FRONTEND_HOME_LOAD_MS", 20_000),
  frontendStudioLoadMs: readPositiveInt("E2E_FRONTEND_STUDIO_LOAD_MS", 30_000),
  frontendDomContentLoadedMs: readPositiveInt(
    "E2E_FRONTEND_DOM_CONTENT_LOADED_MS",
    12_000
  ),
  minApiSamples: readPositiveInt("E2E_PERF_API_SAMPLES", 5),
};
