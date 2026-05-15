/**
 * مُسجِّل منظم باستخدام pino
 * يكتب JSON ساكناً مباشرة إلى stdout (لا transport) لتفادي قيود pino multi-stream
 */

import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

export const rootLogger = pino({
  level,
  base: { service: "thecopy-e2e", env: process.env.TEST_ENV ?? "staging" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type ScopedLogger = pino.Logger;

export function logger(scope: string, extra?: Record<string, unknown>): ScopedLogger {
  return rootLogger.child({ scope, ...(extra ?? {}) });
}
