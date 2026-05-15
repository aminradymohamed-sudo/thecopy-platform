/**
 * بصمات قدرات المتصفحات لكل عقدة
 */

import type { BrowserCapabilityProfile, BrowserId } from "./types.js";

const COMMON_ARGS = ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"];

export const browserProfiles: Record<BrowserId, BrowserCapabilityProfile> = {
  chromium: {
    id: "chromium",
    label: "Chromium",
    windowWidth: 1920,
    windowHeight: 1080,
    acceptInsecureCerts: true,
    language: "ar-EG",
    extraArguments: [
      ...COMMON_ARGS,
      "--window-size=1920,1080",
      "--lang=ar-EG",
      "--disable-blink-features=AutomationControlled",
    ],
  },
  firefox: {
    id: "firefox",
    label: "Firefox",
    windowWidth: 1920,
    windowHeight: 1080,
    acceptInsecureCerts: true,
    language: "ar-EG",
    extraArguments: ["--width=1920", "--height=1080"],
  },
  edge: {
    id: "edge",
    label: "Edge",
    windowWidth: 1920,
    windowHeight: 1080,
    acceptInsecureCerts: true,
    language: "ar-EG",
    extraArguments: [
      ...COMMON_ARGS,
      "--window-size=1920,1080",
      "--lang=ar-EG",
      "--disable-blink-features=AutomationControlled",
    ],
  },
};

export function selectBrowsers(): BrowserId[] {
  const requested = (process.env.E2E_BROWSERS ?? "chromium,firefox,edge")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);

  const valid: BrowserId[] = [];
  for (const token of requested) {
    if (token === "chromium" || token === "chrome") valid.push("chromium");
    else if (token === "firefox") valid.push("firefox");
    else if (token === "edge" || token === "msedge") valid.push("edge");
  }
  return valid.length > 0 ? Array.from(new Set(valid)) : ["chromium"];
}
