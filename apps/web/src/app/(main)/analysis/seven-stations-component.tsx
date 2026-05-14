"use client";

/**
 * Refactored Seven Stations surface.
 *
 * - SSE-only streaming (no WebSocket).
 * - Server snapshot is the only source of truth for restored state — no
 *   sessionStorage of analysis results.
 * - Per-station retry, quality badges, warnings, exports (DOCX/JSON),
 *   relationship graph, full Arabic / RTL.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ExportBar } from "./components/ExportBar";
import { FinalReport } from "./components/FinalReport";
import { InputPanel } from "./components/InputPanel";
import { PipelineProgress } from "./components/PipelineProgress";
import { RelationshipGraph } from "./components/RelationshipGraph";
import { StationsBoard } from "./components/StationsBoard";
import { WarningsPanel } from "./components/WarningsPanel";
import { useAnalysisMachine } from "./hooks/useAnalysisMachine";

import type { StationId } from "./lib/types";

const RESUME_QUERY_PARAM = "analysis";
const EMPTY_TEXT_MESSAGE = "ألصق نصًا دراميًا قبل بدء التحليل.";

export default function SevenStationsComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams?.get(RESUME_QUERY_PARAM) ?? null;

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const textRef = useRef("");
  const [hasText, setHasText] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );
  const [selectedStationId, setSelectedStationId] = useState<StationId>(1);

  const handleAuthRequired = useCallback(
    (status: number) => {
      const dest = `/login?reason=${status === 401 ? "unauthenticated" : "forbidden"}`;
      router.push(dest);
    },
    [router]
  );

  const machine = useAnalysisMachine({
    resumeAnalysisId: resumeId,
    onAuthRequired: handleAuthRequired,
  });

  // Reflect the live analysisId in the URL so deep-linking & refresh work.
  useEffect(() => {
    if (!machine.state.analysisId) return;
    if (resumeId === machine.state.analysisId) return;
    const url = new URL(window.location.href);
    url.searchParams.set(RESUME_QUERY_PARAM, machine.state.analysisId);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`, {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.state.analysisId]);

  const handleTextInput = useCallback(
    (value: string) => {
      textRef.current = value;
      const nextHasText = Boolean(value.trim());
      setHasText((current) =>
        current === nextHasText ? current : nextHasText
      );
      if (validationMessage && nextHasText) setValidationMessage(null);
    },
    [validationMessage]
  );

  const handleStart = useCallback(() => {
    const text = textRef.current.trim();
    if (!text) {
      setValidationMessage(EMPTY_TEXT_MESSAGE);
      inputRef.current?.focus();
      return;
    }
    setValidationMessage(null);
    void machine.start({ text });
  }, [machine]);

  const handleReset = useCallback(() => {
    machine.reset();
    textRef.current = "";
    setHasText(false);
    setValidationMessage(null);
    setResetToken((current) => current + 1);
    setSelectedStationId(1);
    const url = new URL(window.location.href);
    url.searchParams.delete(RESUME_QUERY_PARAM);
    router.replace(url.pathname, { scroll: false });
  }, [machine, router]);

  const handleRetry = useCallback(
    (stationId: StationId) => {
      void machine.retryStation(stationId, textRef.current);
    },
    [machine]
  );

  const hasRun = machine.state.status !== "idle" || machine.state.analysisId;

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-4 md:p-6" dir="rtl">
      <header className="space-y-2 text-right">
        <h2 className="text-2xl font-bold text-white">
          المحطات السبع للتحليل الدرامي
        </h2>
        <p className="text-sm text-white/60">
          تحليل عميق للنص الدرامي عبر سبع محطات متخصصة، مع بثّ مباشر للتقدم ودعم
          لإعادة تشغيل أي محطة على حدة.
        </p>
      </header>

      <InputPanel
        inputRef={inputRef}
        hasText={hasText}
        resetToken={resetToken}
        validationMessage={validationMessage}
        onTextInput={handleTextInput}
        onStart={handleStart}
        onReset={handleReset}
        isRunning={machine.isRunning}
      />

      <StationsBoard
        stations={machine.state.stations}
        selectedStationId={selectedStationId}
        canRetry={Boolean(machine.state.analysisId) && hasText}
        onSelectStation={setSelectedStationId}
        onRetry={handleRetry}
      />

      {hasRun && (
        <>
          <PipelineProgress
            progress={machine.progress}
            status={machine.state.status}
          />

          {machine.state.fatalError && (
            <div
              className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 text-right text-sm text-rose-200"
              role="alert"
            >
              {machine.state.fatalError}
            </div>
          )}

          <WarningsPanel warnings={machine.state.warnings} />

          <RelationshipGraph stations={machine.state.stations} />

          {machine.allCompleted ? (
            <ExportBar
              disabled={false}
              formats={machine.state.capabilities.exports}
              onExport={(f) => void machine.exportAs(f)}
            />
          ) : machine.state.status === "failed" ? (
            <div
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-right text-sm text-white/70"
              role="status"
            >
              لا توجد نتائج مكتملة قابلة للتصدير بعد.
            </div>
          ) : null}

          <FinalReport report={machine.state.finalReport} />
        </>
      )}
    </div>
  );
}
