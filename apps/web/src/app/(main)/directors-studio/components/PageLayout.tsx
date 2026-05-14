"use client";

/**
 * الصفحة: directors-studio / PageLayout
 * الهوية: إطار إخراجي تنفيذي موحد مع Hero سينمائي ومحتوى داخل قشرة زجاجية داكنة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-bg, --page-surface, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";

import DashboardHero from "./DashboardHero";

interface PageLayoutProps {
  children: ReactNode;
}

const layoutStyle: CSSProperties = {
  ["--page-accent" as string]: "var(--brand-bronze, #746842)",
  ["--page-accent-2" as string]: "var(--brand, #029784)",
  ["--page-bg" as string]: "var(--background, oklch(0.145 0 0))",
  ["--page-surface" as string]: "rgba(10, 14, 22, 0.76)",
  ["--page-border" as string]: "rgba(255,255,255,0.08)",
};

function useDirectorsResponsiveShell() {
  useEffect(() => {
    document.documentElement.classList.add("directors-studio-responsive-page");
    document.body.classList.add("directors-studio-responsive-page");

    return () => {
      document.documentElement.classList.remove(
        "directors-studio-responsive-page"
      );
      document.body.classList.remove("directors-studio-responsive-page");
    };
  }, []);
}

function useDeferredDecorations(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    type IdleWindow = Window &
      typeof globalThis & {
        requestIdleCallback?: (
          callback: IdleRequestCallback,
          options?: IdleRequestOptions
        ) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    const browserWindow: IdleWindow = window;
    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const markReady = () => setReady(true);

    if (typeof browserWindow.requestIdleCallback === "function") {
      idleId = browserWindow.requestIdleCallback(markReady, { timeout: 1200 });
    } else {
      timeoutId = browserWindow.setTimeout(markReady, 900);
    }

    return () => {
      if (
        idleId !== null &&
        typeof browserWindow.cancelIdleCallback === "function"
      ) {
        browserWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        browserWindow.clearTimeout(timeoutId);
      }
    };
  }, []);

  return ready;
}

export function PageLayout({ children }: PageLayoutProps) {
  useDirectorsResponsiveShell();
  const decorationsReady = useDeferredDecorations();

  return (
    <div
      style={layoutStyle}
      className="relative isolate min-h-screen w-full min-w-0 max-w-full overflow-x-clip bg-[var(--page-bg)] text-[var(--foreground,white)]"
    >
      <NoiseBackground />
      <DottedGlowBackground
        className="pointer-events-none mask-radial-to-90pct mask-radial-at-center"
        animated={false}
        opacity={1}
        gap={10}
        radius={1.6}
        backgroundOpacity={0}
      />
      {decorationsReady ? (
        <div className="absolute inset-0 opacity-70 pointer-events-none">
          <BackgroundBeams />
        </div>
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(116,104,66,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(2,151,132,0.18),transparent_34%)] pointer-events-none" />

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-7xl px-3 py-4 sm:px-4 md:px-6 md:py-8">
        <div className="min-w-0 space-y-8">
          <CardSpotlight className="min-w-0 overflow-hidden rounded-[28px] border border-[var(--page-border)] bg-[var(--page-surface)] shadow-[0_18px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <DashboardHero />
          </CardSpotlight>

          {/*
           * Reserve a minimum content height so swapping between the
           * Loading skeleton, NoProject empty state, and ProjectContent
           * does not push the page height and trigger a Cumulative Layout
           * Shift on directors-studio (Lighthouse measured CLS=1.00 on
           * the previous run, caused by the html element growing from
           * ~600px to ~3000px when NoProjectSection mounted). The values
           * here approximate the largest expected variant on each
           * breakpoint; growing past them is fine because shifts that
           * happen below the fold during user input are excluded.
           */}
          <CardSpotlight className="min-h-[1400px] min-w-0 overflow-hidden rounded-[28px] border border-[var(--page-border)] bg-[color:rgba(9,12,18,0.72)] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl md:min-h-[1100px] md:p-6 lg:min-h-[900px]">
            {children}
          </CardSpotlight>
        </div>
      </div>
    </div>
  );
}
