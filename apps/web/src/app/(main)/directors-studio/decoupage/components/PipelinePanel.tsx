"use client";

import { Check, Loader2, AlertCircle, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  MODE_DESCRIPTIONS,
  MODE_LABELS,
  type AnalysisMode,
  type ProjectPipeline,
} from "../lib/types";

interface PipelinePanelProps {
  readonly pipeline: ProjectPipeline;
  readonly pipelineOrder: readonly AnalysisMode[];
  readonly onStopPipeline: () => void;
  readonly onApproveStage: (mode: AnalysisMode) => void;
  readonly onRestartStage: (mode: AnalysisMode) => void;
}

/**
 * يعرض شبكة مراحل Pipeline (11 مرحلة) مع شريط تقدم،
 * وأزرار «موافقة وتقدم» عند `needs_review`، وإعادة تشغيل المرحلة.
 */
export function PipelinePanel({
  pipeline,
  pipelineOrder,
  onStopPipeline,
  onApproveStage,
  onRestartStage,
}: PipelinePanelProps) {
  if (!pipeline.isActive) {
    return null;
  }

  const totalStages = pipelineOrder.length;
  const completedCount = pipelineOrder.filter(
    (m) => pipeline.stages[m].status === "success"
  ).length;
  const progressPct = Math.round((completedCount / totalStages) * 100);

  return (
    <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-[var(--app-accent)]">
              سير عمل Découpage
            </CardTitle>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              {progressPct}% مكتمل · {completedCount} / {totalStages} مراحل
              {pipeline.currentStage && (
                <>
                  <span className="mx-2">·</span>
                  المرحلة النشطة:{" "}
                  <span className="text-[var(--app-accent)]">
                    {MODE_LABELS[pipeline.currentStage]}
                  </span>
                </>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onStopPipeline}>
            إيقاف السيرفر
          </Button>
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[var(--app-border)]">
          <div
            className="h-full bg-[var(--app-accent)] transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {pipelineOrder.map((mode, idx) => {
            const stage = pipeline.stages[mode];
            const isActive = pipeline.currentStage === mode;
            return (
              <div
                key={mode}
                className={`rounded-md border p-3 transition-colors ${
                  isActive
                    ? "border-[var(--app-accent)] bg-[var(--app-accent)]/5"
                    : "border-[var(--app-border)] bg-[var(--app-surface)]/40"
                }`}
              >
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <span className="text-[var(--app-text-muted)]">
                      {String(idx + 1).padStart(2, "0")}.
                    </span>
                    <span
                      className={
                        stage.status === "success"
                          ? "text-emerald-500"
                          : stage.status === "loading"
                            ? "text-[var(--app-accent)]"
                            : stage.status === "needs_review"
                              ? "text-amber-500"
                              : stage.status === "error"
                                ? "text-rose-500"
                                : "text-[var(--app-text-muted)]"
                      }
                    >
                      {MODE_LABELS[mode]}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    {stage.status === "pending" && (
                      <Clock className="h-3 w-3 text-[var(--app-text-muted)]" />
                    )}
                    {stage.status === "loading" && (
                      <Loader2 className="h-3 w-3 animate-spin text-[var(--app-accent)]" />
                    )}
                    {stage.status === "success" && (
                      <Check className="h-3 w-3 text-emerald-500" />
                    )}
                    {stage.status === "error" && (
                      <AlertCircle className="h-3 w-3 text-rose-500" />
                    )}
                    {(stage.status === "success" ||
                      stage.status === "error" ||
                      stage.status === "needs_review") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-[10px]"
                        onClick={() => onRestartStage(mode)}
                        title="إعادة تشغيل المرحلة"
                      >
                        ↻
                      </Button>
                    )}
                  </span>
                </div>
                <p className="line-clamp-2 text-[10px] leading-snug text-[var(--app-text-muted)]">
                  {MODE_DESCRIPTIONS[mode]}
                </p>
                {stage.status === "needs_review" && (
                  <Button
                    size="sm"
                    className="mt-3 w-full text-[10px]"
                    onClick={() => onApproveStage(mode)}
                  >
                    موافقة وتقدم
                  </Button>
                )}
                {stage.status === "error" && stage.error && (
                  <p className="mt-2 text-[10px] text-rose-500">
                    {stage.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
