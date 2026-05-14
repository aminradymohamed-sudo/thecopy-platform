import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearCachedCsrfTokenForTests } from "@/lib/csrf-client";

import { bootstrapBreakdownProject } from "../../infrastructure/platform-client";

function fetchInputUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

describe("breakdown platform client", () => {
  beforeEach(() => {
    clearCachedCsrfTokenForTests();
    vi.restoreAllMocks();
    document.cookie = "XSRF-TOKEN=; Max-Age=0";
    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("does not leak upstream HTML bodies when bootstrap fails", async () => {
    document.cookie = "XSRF-TOKEN=test-token; path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<!DOCTYPE html><html><body>Cannot POST</body></html>", {
        status: 500,
        headers: { "content-type": "text/html" },
      })
    );

    let thrown: unknown;
    try {
      await bootstrapBreakdownProject("INT. غرفة - ليل\nشخصية تنتظر.");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message).toContain("تعذر تنفيذ طلب البريك دون");
    expect(message).not.toMatch(/<!doctype|<html|cannot post|syntaxerror/i);
  });

  it("sanitizes JSON errors that contain raw server output", async () => {
    document.cookie = "XSRF-TOKEN=test-token; path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          success: false,
          error: "<!DOCTYPE html><html><body>Cannot POST</body></html>",
        },
        { status: 502 }
      )
    );

    let thrown: unknown;
    try {
      await bootstrapBreakdownProject("INT. مكتب - نهار\nحوار قصير.");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = (thrown as Error).message;
    expect(message).toContain("خدمة البريك دون غير متاحة الآن");
    expect(message).not.toMatch(/<!doctype|<html|cannot post|syntaxerror/i);
  });

  it("uses the csrf token from health payload when the cookie is httpOnly", async () => {
    document.cookie = "XSRF-TOKEN=; Max-Age=0";
    document.cookie =
      "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    let xsrfHeader: string | null = null;
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = fetchInputUrl(input);

        if (url.endsWith("/api/breakdown/health")) {
          return Promise.resolve(
            Response.json({
              success: true,
              data: { csrfToken: "health-token" },
            })
          );
        }

        if (!(init?.headers instanceof Headers)) {
          return Promise.reject(new Error("Expected Headers instance."));
        }
        xsrfHeader = init.headers.get("X-XSRF-TOKEN");
        return Promise.resolve(
          Response.json({
            success: true,
            data: {
              projectId: "project-1",
              reportId: "report-1",
              scenes: [],
            },
          })
        );
      });

    await expect(
      bootstrapBreakdownProject("INT. غرفة - ليل\nشخصية تنتظر.")
    ).resolves.toMatchObject({ projectId: "project-1" });

    expect(xsrfHeader).toBe("health-token");
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3000/api/breakdown/health",
      expect.objectContaining({ method: "GET" })
    );
  });
});
