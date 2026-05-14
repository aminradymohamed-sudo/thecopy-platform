import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRemoteAppState,
  loadRemoteAppState,
  persistRemoteAppState,
} from "./app-state-client";
import { clearCachedCsrfTokenForTests } from "./csrf-client";

const APP_ID = "actorai-arabic";

function fetchInputUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

describe("app-state-client remote fallback", () => {
  beforeEach(() => {
    clearCachedCsrfTokenForTests();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REMOTE_APP_STATE", undefined);
    vi.stubEnv("NEXT_PUBLIC_APP_STATE_BASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
    vi.stubEnv("BACKEND_URL", undefined);
  });

  it("does not call remote endpoints when remote app state is not configured", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network should not be used"));

    await expect(loadRemoteAppState(APP_ID)).resolves.toBeNull();
    await expect(
      persistRemoteAppState(APP_ID, { currentView: "home" })
    ).resolves.toEqual({ currentView: "home" });
    await expect(clearRemoteAppState(APP_ID)).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not treat the generic backend URL as remote app-state configuration", async () => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://localhost:3001");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network should not be used"));

    await expect(loadRemoteAppState(APP_ID)).resolves.toBeNull();
    await expect(
      persistRemoteAppState(APP_ID, { currentView: "demo" })
    ).resolves.toEqual({ currentView: "demo" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps BUDGET anonymous state local unless remote state is explicitly enabled", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network should not be used"));

    await expect(loadRemoteAppState("BUDGET")).resolves.toBeNull();
    await expect(
      persistRemoteAppState("BUDGET", { title: "local" })
    ).resolves.toEqual({ title: "local" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps cinematography studio state local unless remote state is explicitly enabled", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("network should not be used"));

    await expect(
      loadRemoteAppState("cinematography-studio")
    ).resolves.toBeNull();
    await expect(
      persistRemoteAppState("cinematography-studio", { phase: "pre" })
    ).resolves.toEqual({ phase: "pre" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the same-origin app-state endpoint by default for database-backed apps", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { textInput: "draft" },
          updatedAt: new Date().toISOString(),
        }),
        { status: 200 }
      )
    );

    await expect(loadRemoteAppState("development")).resolves.toEqual({
      textInput: "draft",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/app-state/development",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("uses the configured remote endpoint when explicitly enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REMOTE_APP_STATE", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_STATE_BASE_URL", "https://state.example.test");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { currentView: "demo" },
          updatedAt: new Date().toISOString(),
        }),
        { status: 200 }
      )
    );

    await expect(loadRemoteAppState(APP_ID)).resolves.toEqual({
      currentView: "demo",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/app-state/actorai-arabic",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("uses the csrf token returned by the health endpoint for remote writes", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_REMOTE_APP_STATE", "true");
    let xsrfHeader: string | null = null;
    let lowercaseXsrfHeader: string | null = null;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = fetchInputUrl(input);

        if (url === "/api/breakdown/health") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: { csrfToken: "token-from-health" },
              }),
              { status: 200 }
            )
          );
        }

        if (url.includes("/api/app-state/development")) {
          if (!(init?.headers instanceof Headers)) {
            return Promise.reject(new Error("Expected Headers instance."));
          }
          xsrfHeader = init.headers.get("X-XSRF-TOKEN");
          lowercaseXsrfHeader = init.headers.get("x-xsrf-token");
          return Promise.resolve(
            new Response(
              JSON.stringify({
                success: true,
                data: { textInput: "draft" },
                updatedAt: new Date().toISOString(),
              }),
              { status: 200 }
            )
          );
        }

        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      });

    await expect(
      persistRemoteAppState("development", { textInput: "draft" })
    ).resolves.toEqual({ textInput: "draft" });

    expect(xsrfHeader).toBe("token-from-health");
    expect(lowercaseXsrfHeader).toBe("token-from-health");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/breakdown/health",
      expect.objectContaining({ method: "GET" })
    );
  });
});
