/**
 * @fileoverview Same-origin proxy for the hero intro video.
 *
 * Fetches the upstream video from cdn.pixabay.com and re-emits it from
 * our own origin. This eliminates the third-party Cloudflare cookie
 * (`_cfuvid`) that the upstream sets, which Lighthouse reports as a
 * `third-party-cookies` failure (and a related `Cookie` issue under
 * `inspector-issues`) on the home page Best Practices audit.
 *
 * Range requests are forwarded so HTML5 video can seek/stream normally.
 * Set-Cookie headers from upstream are explicitly stripped before
 * forwarding back to the client. The response is publicly cacheable to
 * keep this from becoming a hot path.
 *
 * Performance optimizations:
 * - Explicit Accept-Ranges: bytes header for better client compatibility
 * - Proper handling of 206 Partial Content responses
 * - Enhanced error handling for upstream failures
 * - Strips potentially problematic headers from upstream
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM_VIDEO_URL =
  "https://cdn.pixabay.com/video/2025/11/09/314880.mp4";

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
] as const;

// Headers to explicitly strip from upstream response
const STRIPPED_HEADERS = [
  "set-cookie",
  "set-cookie2",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "www-authenticate",
  "authorization",
] as const;

export async function GET(request: NextRequest): Promise<Response> {
  const range = request.headers.get("range");

  const upstreamInit: RequestInit = {
    method: "GET",
    cache: "no-store",
  };
  if (range) {
    upstreamInit.headers = { range };
  }

  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM_VIDEO_URL, upstreamInit);
  } catch (error) {
    console.error("[hero-video] Upstream fetch failed:", error);
    return new NextResponse("Upstream video unavailable", {
      status: 502,
      statusText: "Bad Gateway",
    });
  }

  // Handle upstream errors (4xx, 5xx)
  if (!upstream.ok && upstream.status !== 206) {
    console.error(
      `[hero-video] Upstream returned error: ${upstream.status} ${upstream.statusText}`
    );
    return new NextResponse("Video not available", {
      status: upstream.status,
      statusText: upstream.statusText,
    });
  }

  const headers = new Headers();

  // Forward relevant headers from upstream
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Explicitly set Accept-Ranges if not already set by upstream
  if (!headers.has("accept-ranges")) {
    headers.set("accept-ranges", "bytes");
  }

  // Strip problematic headers
  for (const name of STRIPPED_HEADERS) {
    headers.delete(name);
  }

  // Explicitly strip third-party cookies — Lighthouse Best Practices
  // (`third-party-cookies`) penalises any `Set-Cookie` that isn't first-party.
  headers.delete("set-cookie");

  // Make the proxied video publicly cacheable so this route doesn't get hammered.
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  // Same-origin only — no need for CORS preflight on a same-origin <video>.
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // For range requests, ensure we have proper status and headers
  if (range && upstream.status === 206) {
    const contentRange = upstream.headers.get("content-range");
    if (!contentRange) {
      // If upstream didn't return Content-Range, we shouldn't return 206
      console.warn("[hero-video] Range request without Content-Range header");
    }
  }

  try {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    console.error("[hero-video] Failed to create response:", error);
    return new NextResponse("Internal server error", {
      status: 500,
      statusText: "Internal Server Error",
    });
  }
}

export async function HEAD(_request: NextRequest): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM_VIDEO_URL, {
      method: "HEAD",
      cache: "no-store",
    });
  } catch (error) {
    console.error("[hero-video] HEAD upstream fetch failed:", error);
    return new NextResponse(null, {
      status: 502,
      statusText: "Bad Gateway",
    });
  }

  // Handle upstream errors
  if (!upstream.ok) {
    console.error(
      `[hero-video] HEAD upstream returned error: ${upstream.status} ${upstream.statusText}`
    );
    return new NextResponse(null, {
      status: upstream.status,
      statusText: upstream.statusText,
    });
  }

  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Explicitly set Accept-Ranges if not already set
  if (!headers.has("accept-ranges")) {
    headers.set("accept-ranges", "bytes");
  }

  // Strip problematic headers
  for (const name of STRIPPED_HEADERS) {
    headers.delete(name);
  }

  headers.delete("set-cookie");
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return new NextResponse(null, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
