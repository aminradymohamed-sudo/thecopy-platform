import { ensureCsrfToken } from "@/lib/csrf-client";

import type { AppStateId } from "@/lib/app-state-contract";

interface AppStateApiResponse<T extends object> {
  success: boolean;
  data: T;
  updatedAt: string;
}

const DATABASE_BACKED_APP_STATE_IDS = new Set<AppStateId>([
  "analysis",
  "art-director",
  "development",
]);

function resolveServerBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_STATE_BASE_URL ??
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error(
      "App state backend URL is not configured. Set BACKEND_URL or NEXT_PUBLIC_BACKEND_URL."
    );
  }

  return baseUrl.replace(/\/$/, "");
}

function isRemoteAppStateEnabled(appId: AppStateId): boolean {
  const explicitFlag = process.env.NEXT_PUBLIC_ENABLE_REMOTE_APP_STATE;
  if (explicitFlag !== undefined) {
    return explicitFlag === "true";
  }

  return (
    Boolean(process.env.NEXT_PUBLIC_APP_STATE_BASE_URL) ||
    DATABASE_BACKED_APP_STATE_IDS.has(appId)
  );
}

function buildAppStateUrl(appId: AppStateId): string {
  const path = `/api/app-state/${appId}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }

  return new URL(path, resolveServerBaseUrl()).toString();
}

async function parseJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T;
  return json;
}

export async function loadRemoteAppState<T extends object>(
  appId: AppStateId
): Promise<T | null> {
  if (!isRemoteAppStateEnabled(appId)) {
    return null;
  }

  const response = await fetch(buildAppStateUrl(appId), {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Failed to load app state for ${appId}`);
  }

  const payload = await parseJson<AppStateApiResponse<T>>(response);
  return payload.data ?? null;
}

export async function persistRemoteAppState<T extends object>(
  appId: AppStateId,
  data: T
): Promise<T> {
  if (!isRemoteAppStateEnabled(appId)) {
    return data;
  }

  const csrfToken = await ensureCsrfToken();
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (csrfToken) {
    headers.set("X-XSRF-TOKEN", csrfToken);
    headers.set("x-xsrf-token", csrfToken);
  }

  const response = await fetch(buildAppStateUrl(appId), {
    method: "PUT",
    headers,
    credentials: "same-origin",
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist app state for ${appId}`);
  }

  const payload = await parseJson<AppStateApiResponse<T>>(response);
  return payload.data;
}

export async function clearRemoteAppState(appId: AppStateId): Promise<void> {
  if (!isRemoteAppStateEnabled(appId)) {
    return;
  }

  const csrfToken = await ensureCsrfToken();
  const headers = new Headers();

  if (csrfToken) {
    headers.set("X-XSRF-TOKEN", csrfToken);
    headers.set("x-xsrf-token", csrfToken);
  }

  const response = await fetch(buildAppStateUrl(appId), {
    method: "DELETE",
    headers,
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Failed to clear app state for ${appId}`);
  }
}
