"use client";

import { ensureCsrfToken as ensureMemoryCsrfToken } from "@/lib/csrf-client";

async function requireCsrfToken(): Promise<string> {
  const csrfToken = await ensureMemoryCsrfToken({
    credentials: "include",
  });
  if (!csrfToken) {
    throw new Error(
      "تعذر الحصول على رمز الحماية. أعد تسجيل الجلسة ثم حاول مرة أخرى."
    );
  }

  return csrfToken;
}

async function buildError(response: Response): Promise<Error> {
  let message = `فشل الطلب (${response.status})`;

  try {
    const payload = (await response.json()) as {
      error?: string;
      message?: string;
      code?: string;
    };

    if (
      payload.code === "CSRF_TOKEN_MISSING" ||
      payload.code === "CSRF_TOKEN_INVALID"
    ) {
      message = "فشل التحقق الأمني للطلب. أعد تسجيل الجلسة ثم حاول مرة أخرى.";
    } else {
      message = payload.message ?? payload.error ?? message;
    }
  } catch {
    // Keep the generic message when the payload is not JSON.
  }

  return new Error(message);
}

export interface StudioRequestOptions {
  requireCsrf?: boolean;
  /** Timeout in milliseconds. When exceeded the request is aborted. */
  timeoutMs?: number;
  /** Custom message surfaced when the timeout fires. */
  timeoutMessage?: string;
}

async function postStudioRoute<TResponse>(
  path: string,
  init: RequestInit,
  options: StudioRequestOptions = {}
): Promise<TResponse> {
  const { requireCsrf = false, timeoutMs, timeoutMessage } = options;
  const headers = new Headers(init.headers);

  if (requireCsrf) {
    const csrfToken = await requireCsrfToken();
    headers.set("X-XSRF-TOKEN", csrfToken);
    headers.set("x-xsrf-token", csrfToken);
  }

  const controller = timeoutMs != null ? new AbortController() : null;
  const timer =
    controller && timeoutMs != null
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const response = await fetch(path, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
      signal: controller?.signal ?? init.signal ?? null,
    });

    if (!response.ok) {
      throw await buildError(response);
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        timeoutMessage ??
          `انتهت المهلة الزمنية للطلب (${timeoutMs}ms). حاول مرة أخرى.`
      );
    }
    throw error;
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}

export async function postStudioJson<TResponse>(
  path: string,
  body: unknown,
  options?: StudioRequestOptions
): Promise<TResponse> {
  return postStudioRoute<TResponse>(
    path,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    options
  );
}

export async function postStudioFormData<TResponse>(
  path: string,
  formData: FormData,
  options?: StudioRequestOptions
): Promise<TResponse> {
  return postStudioRoute<TResponse>(
    path,
    {
      method: "POST",
      body: formData,
    },
    options
  );
}
