"use client";

import { Clapperboard, FileText, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import appMetadata from "./metadata.json";
import {
  ViewSwitcher,
  VIEW_CONFIG,
  type BreakdownView,
} from "./presentation/shared/view-switcher";

const BreakdownAmbientEffects = dynamic(
  () =>
    import("./presentation/shared/breakdown-ambient-effects").then(
      (module) => module.BreakdownAmbientEffects
    ),
  { ssr: false }
);

const WorkspaceGlowCard = dynamic(
  () =>
    import("./presentation/shared/workspace-glow-card").then(
      (module) => module.WorkspaceGlowCard
    ),
  {
    ssr: false,
    loading: () => <WorkspaceGlowCardFallback />,
  }
);

const BreakdownApp = dynamic(() => import("./App"), {
  ssr: false,
  loading: () => <WorkspacePanelFallback />,
});

const BreakdownReportContent = dynamic(() => import("./breakdown-content"), {
  ssr: false,
  loading: () => <ReportPanelFallback />,
});

function WorkspaceGlowCardFallback() {
  return (
    <div className="relative min-h-[29.625rem] w-full max-w-[25rem] overflow-hidden rounded-[30px] border border-white/10 bg-black/30 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="flex min-h-[18rem] flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-3 w-40 rounded bg-white/8" />
            <div className="space-y-2">
              <div className="h-7 w-48 rounded bg-white/10" />
              <div className="h-4 w-64 max-w-full rounded bg-white/8" />
              <div className="h-4 w-52 max-w-full rounded bg-white/8" />
            </div>
          </div>
          <div className="size-14 rounded-2xl border border-white/12 bg-white/10" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-32 rounded-2xl border border-white/10 bg-black/25" />
          <div className="h-32 rounded-2xl border border-white/10 bg-black/25" />
        </div>
      </div>
    </div>
  );
}

function WorkspacePanelFallback() {
  return (
    <div className="min-h-[760px] px-4 py-8" aria-busy="true">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="h-16 rounded-2xl border border-white/8 bg-white/6" />
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-10 w-96 max-w-full rounded bg-white/10" />
            <div className="mx-auto h-5 w-[32rem] max-w-full rounded bg-white/8" />
          </div>
          <div className="h-96 rounded-[22px] border border-white/8 bg-black/18" />
          <div className="mx-auto h-14 w-56 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function ReportPanelFallback() {
  return (
    <div className="min-h-[560px] space-y-5 p-6 md:p-8" aria-busy="true">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-xl border border-white/8 bg-white/6"
          />
        ))}
      </div>
      <div className="h-80 rounded-xl border border-white/8 bg-white/6" />
    </div>
  );
}

function scheduleIdleWork(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const idleCallback = window.requestIdleCallback;
  const cancelIdleCallback = window.cancelIdleCallback;

  if (idleCallback && cancelIdleCallback) {
    const id = idleCallback(callback, { timeout: 2500 });
    return () => cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 1800);
  return () => window.clearTimeout(id);
}

export default function BreakdownPageRuntime() {
  const [activeView, setActiveView] = useState<BreakdownView>("workspace");
  const [hasOpenedReport, setHasOpenedReport] = useState(false);
  const [showAmbientEffects, setShowAmbientEffects] = useState(false);

  const activeViewConfig = useMemo(() => {
    const fallbackViewConfig = VIEW_CONFIG[0];
    if (!fallbackViewConfig) {
      return null;
    }
    return VIEW_CONFIG.find((v) => v.id === activeView) ?? fallbackViewConfig;
  }, [activeView]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) {
      return undefined;
    }

    return scheduleIdleWork(() => {
      setShowAmbientEffects(true);
    });
  }, []);

  const handleSelectView = useCallback((view: BreakdownView) => {
    if (view === "report") {
      setHasOpenedReport(true);
    }
    setActiveView(view);
  }, []);

  if (!activeViewConfig) {
    return null;
  }

  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))]"
      style={{
        ["--page-accent" as string]: "var(--brand-bronze, #746842)",
        ["--page-accent-2" as string]: "var(--accent-technical, #3b5bdb)",
        ["--page-border" as string]: "rgba(255,255,255,0.08)",
      }}
    >
      {showAmbientEffects && <BreakdownAmbientEffects />}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(116,104,66,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,91,219,0.16),transparent_32%)]" />

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[var(--page-border)] bg-black/30 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] xl:items-start">
              <div className="space-y-4">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
                    BREAKDOWN WORKSPACE
                  </p>
                  <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                    {appMetadata.name}
                  </h1>
                  <p className="max-w-3xl text-base leading-8 text-white/68 md:text-lg">
                    {appMetadata.description}
                  </p>
                  <p className="text-sm leading-7 text-white/55">
                    {activeViewConfig.description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white/42">المسار</p>
                      <Clapperboard className="h-4 w-4 text-[var(--page-accent)]" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      Production Workflow
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white/42">الوضع الحالي</p>
                      <FileText className="h-4 w-4 text-[var(--page-accent-2)]" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {activeViewConfig.label}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white/42">الهوية</p>
                      <Sparkles className="h-4 w-4 text-[var(--page-accent)]" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">
                      Unified Industrial Shell
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 xl:items-end">
                <ViewSwitcher
                  activeView={activeView}
                  onSelect={handleSelectView}
                />
                <WorkspaceGlowCard />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
            <div
              id="breakdown-view-panel-workspace"
              role="tabpanel"
              aria-labelledby="breakdown-view-tab-workspace"
              aria-hidden={activeView !== "workspace"}
              hidden={activeView !== "workspace"}
              tabIndex={0}
            >
              <BreakdownApp />
            </div>
            <div
              id="breakdown-view-panel-report"
              role="tabpanel"
              aria-labelledby="breakdown-view-tab-report"
              aria-hidden={activeView !== "report"}
              hidden={activeView !== "report"}
              tabIndex={0}
              className="p-6 md:p-8"
            >
              {hasOpenedReport && (
                <BreakdownReportContent allowStaticFallback={false} />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
