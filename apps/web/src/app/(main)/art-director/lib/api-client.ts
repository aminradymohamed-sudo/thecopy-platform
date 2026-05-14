"use client";

import { ensureCsrfToken } from "@/lib/csrf-client";

export const ART_DIRECTOR_API_BASE = "/api/art-director";

export function artDirectorApiPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${ART_DIRECTOR_API_BASE}${normalizedPath}`;
}

export async function fetchArtDirectorJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);

  if (method !== "GET" && method !== "HEAD") {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers.set("X-XSRF-TOKEN", csrfToken);
      headers.set("x-xsrf-token", csrfToken);
    }
  }

  const response = await fetch(artDirectorApiPath(path), {
    ...init,
    method,
    headers,
    credentials: init?.credentials ?? "same-origin",
  });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data !== null && "error" in data && data.error
        ? String(data.error)
        : `فشل الطلب مع الحالة ${response.status}`
    );
  }

  return data;
}
