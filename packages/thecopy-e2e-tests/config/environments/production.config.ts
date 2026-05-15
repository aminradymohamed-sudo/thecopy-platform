/**
 * إعدادات بيئة الإنتاج
 * Frontend عام بدون حماية | Backend الإنتاجي على Railway
 */

import type { EnvironmentConfig } from "../types.js";

export const productionConfig: EnvironmentConfig = {
  name: "production",
  frontend: {
    baseUrl: process.env.PROD_FRONTEND_URL ?? "https://www.thecopy.app",
    isProtected: false,
    vercelBypassSecret: null,
  },
  backend: {
    baseUrl:
      process.env.PROD_BACKEND_URL ??
      "https://backend-thecopy-production.up.railway.app",
    healthEndpoint: "/health",
    livenessEndpoint: "/healthz",
    apiPrefix: "/api",
  },
  timeouts: {
    pageLoadMs: 45_000,
    elementWaitMs: 15_000,
    apiRequestMs: 20_000,
    sessionMs: 180_000,
  },
  retries: {
    apiAttempts: 3,
    apiBackoffMs: 1_000,
    flakyTestRetries: 1,
  },
};
