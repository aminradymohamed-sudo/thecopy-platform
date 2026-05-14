"use client";

import { useEffect, useState } from "react";

import { loadAnalysisReport } from "../../application/report/report-loader";
import { readAnalysisReportFromStorage } from "../../application/report/report-storage";
import { logError } from "../../domain/errors";
import {
  BreakdownLoadingState,
  BreakdownMessageState,
  BreakdownReportView,
} from "../shared/breakdown-report-view";

import type { AnalysisReportOutput } from "../../domain/schemas";

interface BreakdownContentProps {
  allowStaticFallback?: boolean;
}

interface BreakdownContentState {
  report: AnalysisReportOutput | null;
  loading: boolean;
  error: string | null;
}

function resolveInitialState(
  allowStaticFallback: boolean
): BreakdownContentState {
  if (allowStaticFallback || typeof window === "undefined") {
    return { report: null, loading: true, error: null };
  }

  const storageResult = readAnalysisReportFromStorage(window.sessionStorage);

  if (storageResult.success) {
    return { report: storageResult.data, loading: false, error: null };
  }

  return { report: null, loading: false, error: storageResult.error };
}

export default function BreakdownContent({
  allowStaticFallback = true,
}: BreakdownContentProps) {
  const [{ report, loading, error }, setState] = useState(() =>
    resolveInitialState(allowStaticFallback)
  );

  useEffect(() => {
    if (!allowStaticFallback) {
      return;
    }

    let cancelled = false;

    loadAnalysisReport(
      typeof window === "undefined" ? undefined : window.sessionStorage,
      { allowStaticFallback }
    )
      .then((result) => {
        if (cancelled) return;
        if (result.report) {
          setState({ report: result.report, loading: false, error: null });
          return;
        }
        const fallbackMessage =
          result.storageResult && !result.storageResult.success
            ? result.storageResult.error
            : "فشل في تحميل تقرير التحليل";
        setState({ report: null, loading: false, error: fallbackMessage });
      })
      .catch((fetchError: unknown) => {
        if (cancelled) return;
        logError("BreakdownContent.fetchReport", fetchError);
        setState({
          report: null,
          loading: false,
          error: "فشل في تحميل تقرير التحليل",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [allowStaticFallback]);

  if (loading) {
    return <BreakdownLoadingState />;
  }

  if (error || !report) {
    return (
      <BreakdownMessageState
        title="تحليل النص"
        message={error ?? "لم يتم العثور على تقرير تحليل."}
      />
    );
  }

  return <BreakdownReportView report={report} />;
}
