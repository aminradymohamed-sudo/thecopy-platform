import { describe, expect, it, vi, beforeEach } from "vitest";

import { cspMiddleware, cspViolationReporter } from "../csp.middleware";

import type { Request, Response, NextFunction } from "express";

// Mock Express types for testing
interface MockResponse extends Partial<Response> {
  _headers: Record<string, string>;
  locals: Record<string, unknown>;
  setHeader: any;
  status: any;
  end: any;
  json: any;
}

interface MockRequest extends Partial<Request> {
  body?: unknown;
}

describe("CSP Middleware", () => {
  let mockReq: MockRequest;
  let mockRes: MockResponse;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      _headers: {},
      locals: {},
      setHeader: vi.fn((name: string, value: string) => {
        mockRes._headers[name] = value;
        return mockRes as any;
      }),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
      json: vi.fn(),
    } as any;
    mockNext = vi.fn();
  });

  it("يطبّق Content-Security-Policy ويحقن nonce ويستدعي next", () => {
    cspMiddleware(
      mockReq as unknown as Request,
      mockRes as unknown as Response,
      mockNext,
    );

    const cspHeader = mockRes._headers["Content-Security-Policy"];
    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("default-src 'self'");
    expect(cspHeader).toContain("frame-ancestors 'none'");
    expect(cspHeader).toContain("object-src 'none'");

    const nonce = mockRes.locals["cspNonce"];
    expect(typeof nonce).toBe("string");
    expect((nonce as string).length).toBeGreaterThan(0);
    expect(cspHeader).toContain(`'nonce-${nonce as string}'`);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("يولّد nonce مختلفًا لكل طلب", () => {
    cspMiddleware(
      mockReq as unknown as Request,
      mockRes as unknown as Response,
      mockNext,
    );
    const firstNonce = mockRes.locals["cspNonce"] as string;

    // طلب جديد
    const secondRes = {
      _headers: {} as Record<string, string>,
      locals: {} as Record<string, unknown>,
      setHeader: vi.fn((name: string, value: string) => {
        secondRes._headers[name] = value;
        return secondRes as any;
      }),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
      json: vi.fn(),
    } as unknown as MockResponse;
    const secondNext = vi.fn();

    cspMiddleware(
      mockReq as unknown as Request,
      secondRes as unknown as Response,
      secondNext,
    );
    const secondNonce = secondRes.locals["cspNonce"] as string;

    expect(firstNonce).not.toBe(secondNonce);
    expect(secondNext).toHaveBeenCalledTimes(1);
  });

  it("يرسل رد 204 لخروقات CSP", () => {
    mockReq.body = {
      "csp-report": {
        "document-uri": "https://example.com",
        "violated-directive": "script-src",
        "blocked-uri": "https://evil.com",
      },
    };

    cspViolationReporter(mockReq as unknown as Request, mockRes as unknown as Response);

    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.end).toHaveBeenCalled();
  });

  it("يتعامل مع جسم التقرير المفقود", () => {
    mockReq.body = {};

    cspViolationReporter(mockReq as unknown as Request, mockRes as unknown as Response);

    expect(mockRes.status).toHaveBeenCalledWith(204);
    expect(mockRes.end).toHaveBeenCalled();
  });
});
