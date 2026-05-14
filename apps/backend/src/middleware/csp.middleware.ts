/**
 * Content Security Policy Middleware
 * حماية من XSS والهجمات الأخرى
 */

import { randomBytes } from "crypto";

import { logger } from "../lib/logger";

import type { Request, Response, NextFunction } from "express";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * بناء report-uri من متغيرات البيئة
 */
function buildReportUri(): string | null {
  const sentryOrigin = process.env["SENTRY_DSN"] ? new URL(process.env["SENTRY_DSN"]).origin : null;
  const projectId = process.env["SENTRY_PROJECT_ID"] ?? process.env["NEXT_PUBLIC_SENTRY_PROJECT_ID"];
  const publicKey = process.env["SENTRY_PUBLIC_KEY"] ?? process.env["NEXT_PUBLIC_SENTRY_PUBLIC_KEY"];

  if (!sentryOrigin || !projectId || !publicKey) {
    return null;
  }

  return `${sentryOrigin}/api/${projectId}/security/?sentry_key=${publicKey}`;
}

/**
 * توليد nonce عشوائي باستخدام base64url
 */
function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * بناء CSP header string
 */
function buildCSPHeader(nonce: string): string {
  const reportUri = buildReportUri();

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.thecopy.app https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "upgrade-insecure-requests",
  ];

  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }

  return directives.join("; ");
}

/**
 * CSP Middleware
 */
export function cspMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // توليد nonce لكل طلب
  const nonce = generateNonce();

  // إضافة nonce إلى res.locals للوصول إليه في templates
  res.locals["cspNonce"] = nonce;

  // بناء CSP header
  const cspHeader = buildCSPHeader(nonce);

  // تطبيق CSP
  res.setHeader("Content-Security-Policy", cspHeader);

  // CSP Report-Only (للاختبار)
  // res.setHeader('Content-Security-Policy-Report-Only', cspHeader);

  next();
}

/**
 * Additional Security Headers
 */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (legacy browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()",
  );

  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  next();
}

/**
 * CSP Violation Reporter
 */
export function cspViolationReporter(req: Request, res: Response) {
  const body: unknown = req.body;
  const report = isRecord(body) ? body["csp-report"] : undefined;

  if (isRecord(report)) {
    logger.warn("CSP Violation:", {
      documentUri: asOptionalString(report["document-uri"]),
      violatedDirective: asOptionalString(report["violated-directive"]),
      blockedUri: asOptionalString(report["blocked-uri"]),
      disposition: asOptionalString(report["disposition"]),
    });

    // في الإنتاج: يمكن إرسال التقارير إلى خدمة monitoring
  }

  res.status(204).end();
}
