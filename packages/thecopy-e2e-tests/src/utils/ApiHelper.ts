/**
 * عميل HTTP خفيف لطبقة الـ API
 * يدعم retries بـ exponential backoff
 * يحقن رمز Vercel bypass تلقائياً عند توفّره
 */

import { setTimeout as delay } from "node:timers/promises";

import { getEnvironment, type EnvironmentConfig } from "../../config/index.js";
import { logger } from "./Logger.js";

const log = logger("ApiHelper");

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  durationMs: number;
  body: T | null;
  rawText: string | null;
  headers: Record<string, string>;
}

export interface RequestOptions {
  baseUrl?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  retryOnStatus?: number[];
}

export class ApiHelper {
  private readonly env: EnvironmentConfig;

  constructor() {
    this.env = getEnvironment();
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const baseUrl = options.baseUrl ?? this.env.backend.baseUrl;
    const url = path.startsWith("http") ? path : `${baseUrl.replace(/\/$/, "")}${path}`;
    const method = options.method ?? "GET";
    const timeoutMs = options.timeoutMs ?? this.env.timeouts.apiRequestMs;
    const maxRetries = options.retries ?? this.env.retries.apiAttempts;
    const retryOnStatus = options.retryOnStatus ?? [502, 503, 504];

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "thecopy-e2e/0.1.0 (+selenium-grid)",
      ...(options.headers ?? {}),
    };

    const isFrontendCall = baseUrl.startsWith(this.env.frontend.baseUrl);
    if (isFrontendCall && this.env.frontend.vercelBypassSecret) {
      headers["x-vercel-protection-bypass"] = this.env.frontend.vercelBypassSecret;
      headers["x-vercel-set-bypass-cookie"] = "true";
    }

    if (options.body !== undefined && headers["Content-Type"] === undefined) {
      headers["Content-Type"] = "application/json";
    }

    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= Math.max(1, maxRetries); attempt++) {
      const t0 = Date.now();
      const controller = new AbortController();
      const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method,
          headers,
          body:
            options.body === undefined
              ? undefined
              : typeof options.body === "string"
                ? options.body
                : JSON.stringify(options.body),
          signal: controller.signal,
        });
        const text = await res.text();
        let parsed: T | null = null;
        try {
          parsed = text.length > 0 ? (JSON.parse(text) as T) : null;
        } catch {
          parsed = null;
        }
        const headersOut: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          headersOut[k] = v;
        });
        const result: ApiResponse<T> = {
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          url,
          durationMs: Date.now() - t0,
          body: parsed,
          rawText: text,
          headers: headersOut,
        };
        if (!res.ok && retryOnStatus.includes(res.status) && attempt < maxRetries) {
          await this.backoff(attempt);
          continue;
        }
        log.debug(
          { method, url, status: res.status, durationMs: result.durationMs, attempt },
          "API response"
        );
        return result;
      } catch (err) {
        lastErr = err;
        log.warn(
          { method, url, attempt, err: err instanceof Error ? err.message : String(err) },
          "API attempt failed"
        );
        if (attempt < maxRetries) {
          await this.backoff(attempt);
          continue;
        }
        return {
          ok: false,
          status: 0,
          statusText: err instanceof Error ? err.message : String(err),
          url,
          durationMs: Date.now() - t0,
          body: null,
          rawText: null,
          headers: {},
        };
      } finally {
        globalThis.clearTimeout(timer);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private async backoff(attempt: number): Promise<void> {
    const ms = this.env.retries.apiBackoffMs * 2 ** (attempt - 1);
    await delay(ms);
  }
}
