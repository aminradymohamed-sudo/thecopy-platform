"use client";

import { AlertCircle, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import {
  MODE_LABELS,
  type AnalysisMode,
  type ProjectPipeline,
} from "../lib/types";

import { ExportToolbar } from "./ExportToolbar";
import { ResultRenderer } from "./ResultRenderer";

interface OutputPanelProps {
  readonly status: "idle" | "loading" | "success" | "error";
  readonly loadingMessage: string;
  readonly result: string | null;
  readonly mode: AnalysisMode;
  readonly canAuditContinuity: boolean;
  readonly onAuditContinuity: () => void;
  readonly pipeline: ProjectPipeline;
  readonly pipelineOrder: readonly AnalysisMode[];
  readonly script: string;
}

/**
 * لوحة عرض نتائج التحليل (Idle / Loading / Result) + أزرار التصدير الموحَّدة.
 */
export function OutputPanel({
  status,
  loadingMessage,
  result,
  mode,
  canAuditContinuity,
  onAuditContinuity,
  pipeline,
  pipelineOrder,
  script,
}: OutputPanelProps) {
  const { toast } = useToast();

  return (
    <Card className="flex h-full flex-col border-[var(--app-border)] bg-[var(--app-surface)]">
      <CardHeader className="border-b border-[var(--app-border)] pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-[var(--app-text)]">
            المنطق الإخراجي · {MODE_LABELS[mode]}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {result !== null && canAuditContinuity && (
              <Button variant="outline" size="sm" onClick={onAuditContinuity}>
                فحص الاستمرارية
              </Button>
            )}
            <ExportToolbar
              result={result}
              mode={mode}
              pipeline={pipeline}
              pipelineOrder={pipelineOrder}
              script={script}
              onCsvUnavailable={() =>
                toast({
                  title: "لا توجد جداول قابلة للتصدير",
                  description: "نتيجة هذا الوضع ليست جدولية.",
                  variant: "destructive",
                })
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-6">
        {status === "idle" && result === null && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-[var(--app-text-muted)] opacity-40">
            <FileText className="mb-3 h-12 w-12" />
            <p className="text-base font-bold uppercase tracking-widest">
              في انتظار المدخلات الدرامية
            </p>
          </div>
        )}
        {status === "loading" && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--app-accent)]" />
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--app-accent)]">
              {loadingMessage || "جاري المعالجة..."}
            </p>
          </div>
        )}
        {status === "error" && result !== null && (
          <div className="flex flex-col items-start gap-3 rounded-md border border-rose-500/40 bg-rose-500/5 p-4">
            <AlertCircle className="h-5 w-5 text-rose-500" />
            <ResultRenderer text={result} />
          </div>
        )}
        {(status === "success" ||
          (status === "idle" && result !== null) ||
          (status === "loading" && result !== null)) &&
          result !== null && <ResultRenderer text={result} />}
      </CardContent>
    </Card>
  );
}
