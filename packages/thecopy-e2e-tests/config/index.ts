/**
 * نقطة الدخول الموحّدة لطبقة الإعدادات
 * تختار البيئة الفعّالة بناءً على متغير TEST_ENV
 */

import { stagingConfig } from "./environments/staging.config.js";
import { productionConfig } from "./environments/production.config.js";
import { localConfig } from "./environments/local.config.js";
import { gridConfig } from "./grid.config.js";
import { browserProfiles, selectBrowsers } from "./capabilities.js";
import { performanceBudget } from "./performance.config.js";
import type {
  EnvironmentConfig,
  EnvironmentName,
  GridConfig,
} from "./types.js";

const REGISTRY: Record<EnvironmentName, EnvironmentConfig> = {
  staging: stagingConfig,
  production: productionConfig,
  local: localConfig,
};

export function getEnvironment(): EnvironmentConfig {
  const requested = (process.env.TEST_ENV ?? "staging").toLowerCase();
  if (requested === "staging" || requested === "production" || requested === "local") {
    return REGISTRY[requested];
  }
  throw new Error(
    `Unknown TEST_ENV "${requested}". Expected one of: staging | production | local`
  );
}

export function getGrid(): GridConfig {
  return gridConfig;
}

export { browserProfiles, performanceBudget, selectBrowsers };
export type {
  EnvironmentConfig,
  GridConfig,
  PerformanceBudgetConfig,
} from "./types.js";
