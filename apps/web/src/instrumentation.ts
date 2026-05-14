type SentryServerModule = typeof import("@sentry/nextjs");
type CaptureRequestError = SentryServerModule["captureRequestError"];

let sentryServerModulePromise: Promise<SentryServerModule> | null = null;

const instrumentationLog = {
  info(message: string): void {
    console.warn(message);
  },
  warn(message: string): void {
    console.warn(message);
  },
};

// مصدر release موحّد (server + edge): override يدوي ثم Vercel/Railway commit SHA.
function resolveSentryRelease(): string | undefined {
  const explicit =
    process.env.SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_SENTRY_RELEASE;
  if (explicit) return explicit;

  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

  return sha ? `the-copy-web@${sha.slice(0, 12)}` : undefined;
}

function shouldLoadSentryServer(): boolean {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    instrumentationLog.info("[Sentry] Disabled in development mode");
    return false;
  }

  if (!dsn) {
    instrumentationLog.warn("[Sentry] DSN not configured, monitoring disabled");
    return false;
  }

  return true;
}

function loadSentryServer(): Promise<SentryServerModule | null> {
  if (!shouldLoadSentryServer()) {
    return Promise.resolve(null);
  }

  sentryServerModulePromise ??= import("@sentry/nextjs");
  return sentryServerModulePromise;
}

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const isDevelopment = process.env.NODE_ENV === "development";
  const release = resolveSentryRelease();

  const Sentry = await loadSentryServer();
  if (!Sentry || !dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side initialization
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      ...(release ? { release } : {}),
      sendDefaultPii: false,
      tracesSampleRate: isDevelopment ? 0.1 : 0.2,
      debug: false,
      tracePropagationTargets: [
        "localhost",
        process.env.BACKEND_URL ?? "",
        "googleapis.com",
      ],
      integrations: [Sentry.httpIntegration()],
      profilesSampleRate: isDevelopment ? 0.1 : 0.2,
      beforeSend(event) {
        if (isDevelopment) return null;
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
        const pathname = samplingContext.name ?? "";
        if (pathname.includes("/api/") || pathname.includes("/genkit/")) {
          return 1.0;
        }
        return isDevelopment ? 1.0 : 0.2;
      },
    });
    instrumentationLog.info("[Sentry] Server initialized");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Edge runtime initialization
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      ...(release ? { release } : {}),
      sendDefaultPii: false,
      tracesSampleRate: isDevelopment ? 0.1 : 0.2,
      debug: false,
      integrations: [],
      beforeSend(event) {
        if (isDevelopment) return null;
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
        const pathname = samplingContext.name ?? "";
        if (pathname.includes("/api/")) {
          return 1.0;
        }
        return isDevelopment ? 1.0 : 0.2;
      },
    });
    instrumentationLog.info("[Sentry] Edge runtime initialized");
  }
}

export const onRequestError: CaptureRequestError = (...args) => {
  void loadSentryServer().then((Sentry) => {
    if (!Sentry) return;
    Sentry.captureRequestError(...args);
  });
};
