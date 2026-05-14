import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearCachedCsrfTokenForTests } from "@/lib/csrf-client";

import { exportAnalysis, startAnalysisStream } from "./api";

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function csrfHealthResponse(): Response {
  return Response.json({ success: true, data: { csrfToken: "health-token" } });
}

function findRequestInit(
  fetchMock: ReturnType<typeof vi.fn>,
  url: string
): RequestInit {
  const requestCall = fetchMock.mock.calls.find(
    ([input]) => requestUrl(input as RequestInfo | URL) === url
  );
  expect(requestCall).toBeDefined();
  if (!requestCall) {
    throw new Error(`Missing request call for ${url}`);
  }
  return requestCall[1] as RequestInit;
}

describe("analysis api client", () => {
  beforeEach(() => {
    clearCachedCsrfTokenForTests();
  });

  afterEach(() => {
    clearCachedCsrfTokenForTests();
    vi.unstubAllGlobals();
  });

  it("starts streaming analysis through the public analysis endpoint", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (requestUrl(input) === "/api/breakdown/health") {
        return Promise.resolve(csrfHealthResponse());
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, analysisId: "analysis-1" }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        )
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      startAnalysisStream({
        text: "نص عربي طويل للتحليل",
        projectName: "اختبار التحليل",
      })
    ).resolves.toEqual({ analysisId: "analysis-1" });

    const init = findRequestInit(
      fetchMock,
      "/api/public/analysis/seven-stations/start"
    );
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      })
    );
    expect((init.headers as Headers).get("X-XSRF-TOKEN")).toBe("health-token");
  });

  it("does not expose raw html error bodies to the user interface", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (requestUrl(input) === "/api/breakdown/health") {
        return Promise.resolve(csrfHealthResponse());
      }
      return Promise.resolve(
        new Response(
          "<!DOCTYPE html><html><head></head><body>Cannot POST /api/analysis/seven-stations/start</body></html>",
          {
            status: 404,
            headers: { "content-type": "text/html" },
          }
        )
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    let message = "";
    try {
      await startAnalysisStream({ text: "نص عربي للتحليل" });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("خدمة التحليل غير متاحة");
    expect(message).not.toMatch(/<!DOCTYPE|<html|<head|<body|Cannot POST/i);
  });

  it("uses a controlled message when the network request fails", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (requestUrl(input) === "/api/breakdown/health") {
        return Promise.resolve(csrfHealthResponse());
      }
      return Promise.reject(new TypeError("Failed to fetch"));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      startAnalysisStream({ text: "نص عربي للتحليل" })
    ).rejects.toThrow("تعذر الاتصال بخدمة التحليل");
  });

  it("exports analysis through the public endpoint as a blob", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (requestUrl(input) === "/api/breakdown/health") {
        return Promise.resolve(csrfHealthResponse());
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const blob = await exportAnalysis("analysis-1", "json");

    expect(blob.type).toBe("application/json");
    await expect(blob.text()).resolves.toBe(JSON.stringify({ ok: true }));
    const init = findRequestInit(
      fetchMock,
      "/api/public/analysis/seven-stations/analysis-1/export"
    );
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ format: "json" }),
      })
    );
    expect((init.headers as Headers).get("X-XSRF-TOKEN")).toBe("health-token");
  });
});
