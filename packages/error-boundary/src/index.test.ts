import { describe, expect, it } from "vitest";

import { ApiError, formatErrorForUser, normalizeError } from "./index";

describe("normalizeError", () => {
  it("preserves ApiError details and marks retriable failures", () => {
    const normalized = normalizeError(
      new ApiError({
        code: "network_error",
        message: "Network unavailable",
        requestId: "req_123",
      }),
    );

    expect(normalized).toEqual({
      code: "network_error",
      message: "Network unavailable",
      requestId: "req_123",
      retriable: true,
    });
  });

  it("normalizes unknown failures without exposing exception details", () => {
    const normalized = normalizeError(new Error("stack should not leak"));

    expect(normalized.code).toBe("unknown_error");
    expect(normalized.message).not.toContain("stack should not leak");
    expect(normalized.requestId).toBeUndefined();
    expect(normalized.retriable).toBe(false);
  });
});

describe("formatErrorForUser", () => {
  it("includes request identifiers for support correlation", () => {
    expect(
      formatErrorForUser({
        code: "server_error",
        message: "Server failed",
        requestId: "req_456",
        retriable: true,
      }),
    ).toEqual({
      title: "خطأ في الخادم",
      message: "Server failed",
      hint: "رقم الطلب: req_456",
    });
  });
});
