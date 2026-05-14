import { ensureCsrfToken } from "@/lib/csrf-client";

function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace(/\/$/, "");
}

export function getBackendBaseUrl(): string | null {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_BACKEND_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      null
  );
}

export async function postToBackend<TResponse = unknown>(
  path: string,
  body: unknown,
  options?: { bestEffort?: boolean }
): Promise<TResponse | null> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    if (options?.bestEffort) return null;
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }

  const csrfToken = await ensureCsrfToken({
    credentials: "include",
    healthPath: `${baseUrl}/api/breakdown/health`,
  });
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (options?.bestEffort) return null;

    let message = `Backend request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };
      message = payload.message ?? payload.error ?? message;
    } catch {
      // ignore JSON parse failure and keep generic message
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return (await response.json()) as TResponse;
}
