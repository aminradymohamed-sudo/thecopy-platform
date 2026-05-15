/**
 * إعدادات بيئة التطوير المحلي
 */

import type { EnvironmentConfig } from "../types.js";

export const localConfig: EnvironmentConfig = {
  name: "local",
  frontend: {
    baseUrl: process.env.LOCAL_FRONTEND_URL ?? "http://host.containers.internal:5000",
    isProtected: false,
    vercelBypassSecret: null,
  },
  backend: {
    baseUrl: process.env.LOCAL_BACKEND_URL ?? "http://host.containers.internal:3001",
    healthEndpoint: "/health",
    livenessEndpoint: "/healthz",
    apiPrefix: "/api",
  },
  timeouts: {
    pageLoadMs: 30_000,
    elementWaitMs: 10_000,
    apiRequestMs: 15_000,
    sessionMs: 120_000,
  },
  retries: {
    apiAttempts: 2,
    apiBackoffMs: 500,
    flakyTestRetries: 0,
  },
};
