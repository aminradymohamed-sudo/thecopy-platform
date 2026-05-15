/**
 * إعدادات بيئة الـ Staging
 * Frontend يستخدم الدومين الإنتاجي العام www.thecopy.app
 * (الفرع المحمي thecopy-front-amin9.vercel.app يتطلب SSO ولا يصلح للاختبار العام)
 * Backend خادم Railway الـ Staging مفتوح للقراءة
 */

import type { EnvironmentConfig } from "../types.js";

export const stagingConfig: EnvironmentConfig = {
  name: "staging",
  frontend: {
    baseUrl: process.env.STAGING_FRONTEND_URL ?? "https://www.thecopy.app",
    isProtected: false,
    vercelBypassSecret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? null,
  },
  backend: {
    baseUrl:
      process.env.STAGING_BACKEND_URL ??
      "https://backend-thecopy-staging.up.railway.app",
    healthEndpoint: "/health",
    livenessEndpoint: "/healthz",
    apiPrefix: "/api",
  },
  timeouts: {
    pageLoadMs: 60_000,
    elementWaitMs: 20_000,
    apiRequestMs: 30_000,
    sessionMs: 300_000,
  },
  retries: {
    apiAttempts: 3,
    apiBackoffMs: 1_000,
    flakyTestRetries: 1,
  },
};
