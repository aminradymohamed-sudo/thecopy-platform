import { describe, expect, it } from "vitest";

import {
  buildSentryReplaySettings,
  shouldEnableSentryClientForPathname,
  shouldEnableSentryReplay,
  type SentryEnvironment,
} from "./sentry-client";

const enabledEnv: SentryEnvironment = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SENTRY_DSN: "https://public@example.invalid/1",
  NEXT_PUBLIC_ENABLE_SENTRY_REPLAY: "true",
};

describe("sentry client route gating", () => {
  it("disables all client monitoring for the app gateway", () => {
    expect(shouldEnableSentryClientForPathname("/BREAKAPP", enabledEnv)).toBe(
      false
    );
    expect(
      shouldEnableSentryClientForPathname("/BREAKAPP/login/qr", enabledEnv)
    ).toBe(false);
  });

  it("does not disable similarly named unrelated routes", () => {
    expect(
      shouldEnableSentryClientForPathname("/BREAKAPP-preview", enabledEnv)
    ).toBe(true);
  });

  it("disables replay on isolated heavy routes", () => {
    expect(shouldEnableSentryReplay(enabledEnv, "/BREAKAPP/login/qr")).toBe(
      false
    );
    expect(shouldEnableSentryReplay(enabledEnv, "/actorai-arabic")).toBe(false);
    expect(shouldEnableSentryReplay(enabledEnv, "/directors-studio")).toBe(
      false
    );
  });

  it("keeps monitoring without replay on directors studio", () => {
    expect(
      shouldEnableSentryClientForPathname("/directors-studio", enabledEnv)
    ).toBe(true);
    expect(buildSentryReplaySettings(enabledEnv, "/directors-studio")).toEqual({
      enableReplay: false,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
  });
});
