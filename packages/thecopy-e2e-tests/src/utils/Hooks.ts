/**
 * Hooks جذرية لـ Mocha (Root Hooks Plugin pattern)
 * تطبع banner البيئة قبل بدء أي suite وتُسجِّل runStamp مشترك
 * يُحمَّل تلقائياً عبر "require" في .mocharc.json
 */

import { getEnvironment, getGrid, selectBrowsers } from "../../config/index.js";
import { logger } from "./Logger.js";

const log = logger("Hooks");

export const RUN_STAMP = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace(/Z$/, "Z");

declare global {
  // eslint-disable-next-line no-var
  var __thecopyRunStamp: string | undefined;
}

if (!globalThis.__thecopyRunStamp) {
  globalThis.__thecopyRunStamp = RUN_STAMP;
}

/**
 * Mocha Root Hooks Plugin export
 * https://mochajs.org/#root-hook-plugins
 */
export const mochaHooks = {
  beforeAll(): void {
    const env = getEnvironment();
    const grid = getGrid();
    const browsers = selectBrowsers();
    log.info(
      {
        runStamp: RUN_STAMP,
        env: env.name,
        frontend: env.frontend.baseUrl,
        backend: env.backend.baseUrl,
        hub: grid.hubUrl,
        browsers,
        vercelBypass: Boolean(env.frontend.vercelBypassSecret),
      },
      "thecopy-e2e suite starting"
    );
  },
  afterAll(): void {
    log.info({ runStamp: RUN_STAMP }, "thecopy-e2e suite finished");
  },
};
