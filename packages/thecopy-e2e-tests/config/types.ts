/**
 * تعريفات الأنواع المشتركة لطبقة الإعدادات
 */

export interface FrontendEnvConfig {
  baseUrl: string;
  isProtected: boolean;
  vercelBypassSecret: string | null;
}

export interface BackendEnvConfig {
  baseUrl: string;
  healthEndpoint: string;
  livenessEndpoint: string;
  apiPrefix: string;
}

export interface EnvTimeouts {
  pageLoadMs: number;
  elementWaitMs: number;
  apiRequestMs: number;
  sessionMs: number;
}

export interface EnvRetries {
  apiAttempts: number;
  apiBackoffMs: number;
  flakyTestRetries: number;
}

export type EnvironmentName = "staging" | "production" | "local";

export interface EnvironmentConfig {
  name: EnvironmentName;
  frontend: FrontendEnvConfig;
  backend: BackendEnvConfig;
  timeouts: EnvTimeouts;
  retries: EnvRetries;
}

export type BrowserId = "chromium" | "firefox" | "edge";

export interface GridConfig {
  hubUrl: string;
  vncUrls: Record<BrowserId, string>;
  videoEnabled: boolean;
}

export interface BrowserCapabilityProfile {
  id: BrowserId;
  label: string;
  windowWidth: number;
  windowHeight: number;
  acceptInsecureCerts: boolean;
  language: string;
  extraArguments: string[];
}

export interface PerformanceBudgetConfig {
  apiHealthP95Ms: number;
  apiHealthMaxMs: number;
  frontendHomeLoadMs: number;
  frontendStudioLoadMs: number;
  frontendDomContentLoadedMs: number;
  minApiSamples: number;
}
