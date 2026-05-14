"use client";

/**
 * Thin route-level wrapper for the seven-stations analysis surface.
 *
 * The parent page already provides the shell, so this wrapper avoids an extra
 * Suspense boundary and keeps the primary controls visible as soon as the route
 * hydrates.
 */

import SevenStationsComponent from "./seven-stations-component";

export default function SevenStationsPage() {
  return <SevenStationsComponent />;
}
