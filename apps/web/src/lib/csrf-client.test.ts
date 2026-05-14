import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearCachedCsrfTokenForTests, ensureCsrfToken } from "./csrf-client";

describe("csrf-client", () => {
  beforeEach(() => {
    clearCachedCsrfTokenForTests();
    vi.restoreAllMocks();
    document.cookie = "XSRF-TOKEN=; Max-Age=0";
    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("reads the csrf token from the breakdown health payload and caches it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { csrfToken: "token-from-health" },
        }),
        { status: 200 }
      )
    );

    await expect(ensureCsrfToken()).resolves.toBe("token-from-health");
    await expect(ensureCsrfToken()).resolves.toBe("token-from-health");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/breakdown/health",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
        method: "GET",
      })
    );
  });

  it("supports a top-level csrf token payload for compatible health routes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ csrfToken: "top-level-token" }), {
        status: 200,
      })
    );

    await expect(
      ensureCsrfToken({
        credentials: "include",
        healthPath: "https://api.example.test/api/breakdown/health",
      })
    ).resolves.toBe("top-level-token");
  });

  it("returns null when the health request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await expect(ensureCsrfToken()).resolves.toBeNull();
  });

  it("does not read a readable legacy cookie when health does not return a token", async () => {
    document.cookie = "XSRF-TOKEN=legacy-token; path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200,
      })
    );

    await expect(ensureCsrfToken()).resolves.toBeNull();
  });
});
