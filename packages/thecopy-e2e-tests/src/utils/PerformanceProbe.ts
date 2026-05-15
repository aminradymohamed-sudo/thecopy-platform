/**
 * Browser and API measurement helpers for performance suites.
 */

import type { WebDriver } from "selenium-webdriver";

import { ApiHelper } from "./ApiHelper.js";

export interface NavigationTimingSnapshot {
  url: string;
  durationMs: number;
  domContentLoadedMs: number;
  loadEventEndMs: number;
  responseEndMs: number;
  transferSize: number;
  encodedBodySize: number;
}

export interface ApiTimingSummary {
  samples: readonly number[];
  minMs: number;
  maxMs: number;
  avgMs: number;
  p95Ms: number;
}

export async function readNavigationTiming(
  driver: WebDriver
): Promise<NavigationTimingSnapshot> {
  const raw = (await driver.executeScript(`
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    return {
      url: nav.name,
      durationMs: nav.duration,
      domContentLoadedMs: nav.domContentLoadedEventEnd,
      loadEventEndMs: nav.loadEventEnd,
      responseEndMs: nav.responseEnd,
      transferSize: nav.transferSize || 0,
      encodedBodySize: nav.encodedBodySize || 0
    };
  `)) as NavigationTimingSnapshot | null;

  if (!raw) {
    throw new Error("Navigation Timing entry is unavailable for current page");
  }

  return {
    url: raw.url,
    durationMs: Math.round(raw.durationMs),
    domContentLoadedMs: Math.round(raw.domContentLoadedMs),
    loadEventEndMs: Math.round(raw.loadEventEndMs),
    responseEndMs: Math.round(raw.responseEndMs),
    transferSize: raw.transferSize,
    encodedBodySize: raw.encodedBodySize,
  };
}

export async function sampleApiEndpoint(
  path: string,
  sampleCount: number,
  timeoutMs: number
): Promise<ApiTimingSummary> {
  const api = new ApiHelper();
  const samples: number[] = [];

  for (let index = 0; index < sampleCount; index++) {
    const response = await api.request(path, {
      timeoutMs,
      retries: 1,
    });
    if (!response.ok) {
      throw new Error(
        `Performance sample ${index + 1} failed: HTTP ${response.status} ${response.statusText}`
      );
    }
    samples.push(response.durationMs);
  }

  return summarizeTimings(samples);
}

export function summarizeTimings(samples: readonly number[]): ApiTimingSummary {
  if (samples.length === 0) {
    throw new Error("Cannot summarize empty timing sample set");
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return {
    samples,
    minMs: sorted[0]!,
    maxMs: sorted[sorted.length - 1]!,
    avgMs: Math.round(total / sorted.length),
    p95Ms: sorted[p95Index]!,
  };
}
