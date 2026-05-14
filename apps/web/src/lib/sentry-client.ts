"use client";

import { logger } from "@/lib/ai/utils/logger";

type SentryModule = typeof import("@sentry/nextjs");
type CaptureExceptionOptions = Parameters<SentryModule["captureException"]>[1];
type RouterTransitionArgs = Parameters<
  SentryModule["captureRouterTransitionStart"]
>;

export type SentryReplayEnv = Readonly<Record<string, unknown>>;
export type SentryEnvironment = SentryReplayEnv &
  Partial<
    Pick<
      NodeJS.ProcessEnv,
      | "NODE_ENV"
      | "NEXT_PUBLIC_SENTRY_DSN"
      | "NEXT_PUBLIC_ENABLE_SESSION_REPLAY"
      | "NEXT_PUBLIC_ENABLE_SENTRY_REPLAY"
    >
  >;

const CLIENT_MONITORING_EXCLUDED_PREFIXES = ["/BREAKAPP"] as const;
const REPLAY_EXCLUDED_PREFIXES = [
  "/BREAKAPP",
  "/actorai-arabic",
  "/directors-studio",
] as const;
const SENTRY_REPLAY_STORAGE_KEYS = ["sentryReplaySession"] as const;
const isDevelopment = (env: SentryEnvironment = process.env): boolean =>
  env.NODE_ENV === "development";
const releaseSha =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
  (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ? `the-copy-web@${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12)}`
    : undefined);

let sentryModulePromise: Promise<SentryModule> | null = null;
let sentryInitialized = false;
let sentryStatusLogged = false;

function getCurrentBrowserPathname(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.pathname;
}

function isPathPrefixMatch(pathname: string, prefixes: readonly string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isClientMonitoringExcludedPath(pathname: string): boolean {
  return isPathPrefixMatch(pathname, CLIENT_MONITORING_EXCLUDED_PREFIXES);
}

function isReplayExcludedPath(pathname: string): boolean {
  return isPathPrefixMatch(pathname, REPLAY_EXCLUDED_PREFIXES);
}

export function shouldEnableSentryReplay(
  env: SentryEnvironment = process.env,
  pathname = getCurrentBrowserPathname()
): boolean {
  const replayFlag =
    env.NEXT_PUBLIC_ENABLE_SESSION_REPLAY ??
    env.NEXT_PUBLIC_ENABLE_SENTRY_REPLAY;

  return replayFlag === "true" && !isReplayExcludedPath(pathname);
}

export function buildSentryReplaySettings(
  env: SentryEnvironment = process.env,
  pathname = getCurrentBrowserPathname()
): {
  enableReplay: boolean;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
} {
  const enableReplay = shouldEnableSentryReplay(env, pathname);

  return {
    enableReplay,
    replaysSessionSampleRate: enableReplay ? 0.1 : 0,
    replaysOnErrorSampleRate: enableReplay ? 1 : 0,
  };
}

export function shouldEnableSentryClientForPathname(
  pathname: string,
  env: SentryEnvironment = process.env
): boolean {
  return (
    !isDevelopment(env) &&
    Boolean(env.NEXT_PUBLIC_SENTRY_DSN) &&
    !isClientMonitoringExcludedPath(pathname)
  );
}

function shouldLoadSentryClient(
  pathname = getCurrentBrowserPathname()
): boolean {
  return shouldEnableSentryClientForPathname(pathname, process.env);
}

function clearSentryReplayStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of SENTRY_REPLAY_STORAGE_KEYS) {
      try {
        storage.removeItem(key);
      } catch {
        // Storage may be blocked by the browser; monitoring must not break app boot.
      }
    }
  }
}

function logSentryStatus(): void {
  if (sentryStatusLogged) return;
  sentryStatusLogged = true;

  if (isDevelopment()) {
    logger.info("[Sentry] Client disabled in development mode");
    return;
  }

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    logger.info("[Sentry] Client DSN not configured, monitoring disabled");
  }
}

function loadSentryClient(
  pathname = getCurrentBrowserPathname()
): Promise<SentryModule | null> {
  if (!shouldLoadSentryClient(pathname)) {
    logSentryStatus();
    return Promise.resolve(null);
  }

  sentryModulePromise ??= import("@sentry/nextjs");
  return sentryModulePromise;
}

export async function initSentryClient(): Promise<void> {
  const pathname = getCurrentBrowserPathname();
  const replaySettings = buildSentryReplaySettings(process.env, pathname);

  if (!replaySettings.enableReplay) {
    clearSentryReplayStorage();
  }

  const Sentry = await loadSentryClient(pathname);
  if (!Sentry || sentryInitialized) return;

  const configuredDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!configuredDsn) return;

  Sentry.init({
    dsn: configuredDsn,
    environment: process.env.NODE_ENV ?? "development",
    ...(releaseSha ? { release: releaseSha } : {}),
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: replaySettings.replaysSessionSampleRate,
    replaysOnErrorSampleRate: replaySettings.replaysOnErrorSampleRate,
    debug: false,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/www\.thecopy\.app/,
      /^https:\/\/.*\.railway\.app/,
    ],
    integrations: [
      Sentry.browserTracingIntegration(),
      ...(replaySettings.enableReplay
        ? [
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ]
        : []),
    ],
    beforeSend(event) {
      if (isDevelopment()) return null;
      return event;
    },
    beforeSendTransaction(event) {
      if (event.transaction?.startsWith("/api/")) {
        event.transaction = event.transaction.replace(
          /\/[0-9a-f-]{36}/g,
          "/:id"
        );
      }
      return event;
    },
    tracesSampler(samplingContext) {
      const pathname = samplingContext.name || "";
      if (pathname.includes("/api/") || pathname.includes("/genkit/")) {
        return 1.0;
      }
      return 0.2;
    },
  });

  sentryInitialized = true;
  logger.info("[Sentry] Client initialized");
}

export function captureSentryException(
  error: unknown,
  captureContext?: CaptureExceptionOptions
): void {
  const pathname = getCurrentBrowserPathname();
  if (!shouldLoadSentryClient(pathname)) return;

  void initSentryClient()
    .then(() => loadSentryClient(pathname))
    .then((Sentry) => {
      Sentry?.captureException(error, captureContext);
    });
}

export function captureSentryRouterTransitionStart(
  ...args: RouterTransitionArgs
): void {
  const pathname = getCurrentBrowserPathname();
  if (!shouldLoadSentryClient(pathname)) return;

  void initSentryClient()
    .then(() => loadSentryClient(pathname))
    .then((Sentry) => {
      Sentry?.captureRouterTransitionStart(...args);
    });
}
