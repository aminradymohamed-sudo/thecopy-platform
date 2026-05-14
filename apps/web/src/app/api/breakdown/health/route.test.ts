import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("GET /api/breakdown/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reissues an existing csrf cookie with hardened attributes", () => {
    const response = GET(
      new NextRequest("http://localhost/api/breakdown/health", {
        headers: {
          cookie: "XSRF-TOKEN=stale-token",
        },
      })
    );

    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("XSRF-TOKEN=stale-token");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=86400");
  });

  it("returns the csrf token in the health payload while storing it as secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = GET(
      new NextRequest("https://www.thecopy.app/api/breakdown/health")
    );
    const payload = (await response.json()) as {
      data?: { csrfToken?: string };
    };
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(payload.data?.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toMatch(/SameSite=Strict/i);
  });
});
