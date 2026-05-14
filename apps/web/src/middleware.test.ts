import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildContentSecurityPolicy, proxy } from "./proxy";

describe("content security policy builder", () => {
  it("builds correct CSP: nonce on script-src and style-src, 'unsafe-inline' isolated to style-src-attr only", () => {
    const mockNonce = "mocked-nonce-123456";
    const header = buildContentSecurityPolicy({
      isDevelopment: false,
      allowedDevOrigin: "",
      sentryOrigin: "https://o4511284205453312.ingest.us.sentry.io",
      cdnOrigin: "https://cdn.example.com",
      nonce: mockNonce,
    });

    // تشديد: 'unsafe-inline' محظورة داخل script-src و style-src المخصص لعناصر <style>
    const scriptSrcDirective =
      header?.match(/(?:^|;\s*)script-src\s+[^;]+/)?.[0] ?? "";
    const styleSrcElemDirective =
      header?.match(/(?:^|;\s*)style-src(?!-attr)\s+[^;]+/)?.[0] ?? "";
    expect(scriptSrcDirective).not.toContain("'unsafe-inline'");
    expect(styleSrcElemDirective).not.toContain("'unsafe-inline'");

    // تشديد: style-src-attr يحوي 'unsafe-inline' حصرًا لسمات style="..." المدمجة
    expect(header).toContain("style-src-attr 'unsafe-inline'");

    // تشديد: 'unsafe-inline' لا تظهر في الترويسة إلا مرة واحدة بالضبط (في style-src-attr)
    const unsafeInlineCount = (header?.match(/'unsafe-inline'/g) ?? []).length;
    expect(unsafeInlineCount).toBe(1);

    // التأكد من وجود nonce
    expect(header).toContain(`'nonce-${mockNonce}'`);

    // التأكد من وجود strict-dynamic
    expect(header).toContain("'strict-dynamic'");

    // التأكد من وجود report-uri
    expect(header).toContain(
      "report-uri https://o4511284205453312.ingest.us.sentry.io"
    );

    // التأكد من وجود directives الأساسية
    expect(header).toContain("script-src");
    expect(header).toContain("style-src");
  });

  it("allows the inline bootstrap needed by the static production app with nonce", () => {
    const mockNonce = "test-nonce-abc123";
    const header = buildContentSecurityPolicy({
      isDevelopment: false,
      allowedDevOrigin: "",
      sentryOrigin: "https://o0.ingest.sentry.io",
      cdnOrigin: "https://cdn.example.com",
      nonce: mockNonce,
    });

    expect(header).toContain("script-src 'self'");
    expect(header).toContain(`'nonce-${mockNonce}'`);
    expect(header).toContain(
      "style-src 'self' 'nonce-test-nonce-abc123' https://fonts.googleapis.com https://cdn.example.com"
    );

    // تشديد: 'unsafe-inline' محظورة في script-src وفي style-src المخصص لعناصر <style>
    const scriptSrcDirective =
      header?.match(/(?:^|;\s*)script-src\s+[^;]+/)?.[0] ?? "";
    const styleSrcElemDirective =
      header?.match(/(?:^|;\s*)style-src(?!-attr)\s+[^;]+/)?.[0] ?? "";
    expect(scriptSrcDirective).not.toContain("'unsafe-inline'");
    expect(styleSrcElemDirective).not.toContain("'unsafe-inline'");

    // 'unsafe-inline' مسموحة حصرًا داخل style-src-attr لسمات style المدمجة
    expect(header).toContain("style-src-attr 'unsafe-inline'");

    expect(header).not.toContain("unsafe-eval");
  });

  it("allows configured backend origins in connect-src without duplication", () => {
    const mockNonce = "test-nonce";
    const header = buildContentSecurityPolicy({
      isDevelopment: false,
      allowedDevOrigin: "",
      sentryOrigin: "",
      cdnOrigin: "",
      connectOrigins: [
        "https://backend-thecopy-production.up.railway.app",
        "https://backend-thecopy-production.up.railway.app",
        "https://secondary-editor-runtime.example.com",
      ],
      nonce: mockNonce,
    });

    expect(header).toContain(
      "connect-src 'self' https://apis.google.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://backend-thecopy-production.up.railway.app https://secondary-editor-runtime.example.com"
    );
    expect(
      header?.match(/https:\/\/backend-thecopy-production\.up\.railway\.app/g)
        ?.length
    ).toBe(1);
  });

  it("returns null in development mode", () => {
    const header = buildContentSecurityPolicy({
      isDevelopment: true,
      allowedDevOrigin: "",
      sentryOrigin: "",
      cdnOrigin: "",
    });

    expect(header).toBeNull();
  });

  it("generates CSP with strict-dynamic for script-src", () => {
    const mockNonce = "dynamic-test-nonce";
    const header = buildContentSecurityPolicy({
      isDevelopment: false,
      allowedDevOrigin: "",
      sentryOrigin: "",
      cdnOrigin: "",
      nonce: mockNonce,
    });

    expect(header).toContain("'strict-dynamic'");
    expect(header).toContain("script-src");
  });

  it("includes nonce in both script-src and style-src", () => {
    const mockNonce = "both-directives-nonce";
    const header = buildContentSecurityPolicy({
      isDevelopment: false,
      allowedDevOrigin: "",
      sentryOrigin: "",
      cdnOrigin: "",
      nonce: mockNonce,
    });

    expect(header).not.toBeNull();
    expect(header).toBeDefined();

    // التأكد من وجود nonce في script-src
    const scriptSrcMatch = header?.match(
      /script-src[^;]*'nonce-both-directives-nonce'/
    );
    expect(scriptSrcMatch).toBeTruthy();

    // التأكد من وجود nonce في style-src
    const styleSrcMatch = header?.match(
      /style-src[^;]*'nonce-both-directives-nonce'/
    );
    expect(styleSrcMatch).toBeTruthy();
  });

  it("isolates 'unsafe-inline' strictly to style-src-attr and verifies it appears exactly once", () => {
    const mockNonce = "isolation-boundary-nonce";
    const header = buildContentSecurityPolicy({
      isDevelopment: false,
      allowedDevOrigin: "",
      sentryOrigin: "",
      cdnOrigin: "",
      nonce: mockNonce,
    });

    // التوجيه المخصص لسمات style="..." المدمجة يحوي 'unsafe-inline'
    expect(header).toContain("style-src-attr 'unsafe-inline'");

    // عد ظهور 'unsafe-inline' في الترويسة كاملة: مرة واحدة فقط (داخل style-src-attr)
    const unsafeInlineMatches = header?.match(/'unsafe-inline'/g) ?? [];
    expect(unsafeInlineMatches).toHaveLength(1);

    // التوجيه style-src-attr بمفرده يحوي 'unsafe-inline'
    const styleSrcAttrDirective =
      header?.match(/(?:^|;\s*)style-src-attr\s+[^;]+/)?.[0] ?? "";
    expect(styleSrcAttrDirective).toContain("'unsafe-inline'");

    // script-src و style-src للعناصر <style>: لا تحوي 'unsafe-inline'
    const scriptSrcDirective =
      header?.match(/(?:^|;\s*)script-src\s+[^;]+/)?.[0] ?? "";
    const styleSrcElemDirective =
      header?.match(/(?:^|;\s*)style-src(?!-attr)\s+[^;]+/)?.[0] ?? "";
    expect(scriptSrcDirective).not.toContain("'unsafe-inline'");
    expect(styleSrcElemDirective).not.toContain("'unsafe-inline'");
  });
});

describe("proxy middleware: nonce forwarding via request headers", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("attaches Content-Security-Policy and x-nonce to response headers", () => {
    const request = new NextRequest(new URL("http://localhost/"));
    const response = proxy(request);

    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toBeTruthy();
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");

    const nonce = response.headers.get("x-nonce");
    expect(nonce).toBeTruthy();
    expect((nonce ?? "").length).toBeGreaterThanOrEqual(16);
  });

  it("forwards Content-Security-Policy and x-nonce via request headers (Next.js NextResponse.next mechanism)", () => {
    const request = new NextRequest(new URL("http://localhost/"));
    const response = proxy(request);

    // Next.js يشفّر تعديلات request headers كرؤوس استجابة خاصة
    // عبر x-middleware-override-headers + x-middleware-request-<header>
    const overrideHeader =
      response.headers.get("x-middleware-override-headers") ?? "";
    expect(overrideHeader.toLowerCase()).toContain("x-nonce");
    expect(overrideHeader.toLowerCase()).toContain("content-security-policy");

    const forwardedNonce = response.headers.get(
      "x-middleware-request-x-nonce"
    );
    expect(forwardedNonce).toBeTruthy();

    const forwardedCsp = response.headers.get(
      "x-middleware-request-content-security-policy"
    );
    expect(forwardedCsp).toBeTruthy();
    expect(forwardedCsp).toContain("'strict-dynamic'");
  });

  it("forwarded nonce in request headers matches the nonce embedded in CSP", () => {
    const request = new NextRequest(new URL("http://localhost/"));
    const response = proxy(request);

    const csp = response.headers.get("Content-Security-Policy") ?? "";
    const forwardedNonce =
      response.headers.get("x-middleware-request-x-nonce") ?? "";

    // النونس المُمرَّر في request headers يجب أن يكون نفسه الموجود في CSP
    // (هذا هو الشرط الذي يجعل Next.js يحقن نفس النونس في كل <script>)
    expect(forwardedNonce.length).toBeGreaterThanOrEqual(16);
    expect(csp).toContain(`'nonce-${forwardedNonce}'`);
  });

  it("does not attach CSP headers in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");

    const request = new NextRequest(new URL("http://localhost/"));
    const response = proxy(request);

    expect(response.headers.get("Content-Security-Policy")).toBeNull();
    expect(response.headers.get("x-nonce")).toBeNull();
  });
});
