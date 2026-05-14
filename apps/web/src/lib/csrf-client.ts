interface CsrfHealthPayload {
  csrfToken?: string;
  data?: {
    csrfToken?: string;
  };
}

interface EnsureCsrfTokenOptions {
  healthPath?: string;
  credentials?: RequestCredentials;
}

let csrfTokenCache: string | null = null;

function extractCsrfToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as CsrfHealthPayload;
  return candidate.data?.csrfToken ?? candidate.csrfToken ?? null;
}

export function clearCachedCsrfTokenForTests(): void {
  csrfTokenCache = null;
}

export async function ensureCsrfToken(
  options: EnsureCsrfTokenOptions = {}
): Promise<string | null> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }

  try {
    const response = await fetch(
      options.healthPath ?? "/api/breakdown/health",
      {
        method: "GET",
        credentials: options.credentials ?? "same-origin",
        cache: "no-store",
      }
    );
    const payload: unknown = await response.json();
    const csrfToken = extractCsrfToken(payload);
    if (csrfToken) {
      csrfTokenCache = csrfToken;
      return csrfToken;
    }
  } catch {
    return null;
  }

  return null;
}
