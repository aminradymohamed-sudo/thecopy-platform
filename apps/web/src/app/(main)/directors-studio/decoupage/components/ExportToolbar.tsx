"use client";

import { Code, FileText, Package, Table } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  exportCSV,
  exportJSON,
  exportMarkdown,
  exportProductionPacket,
} from "../lib/exporters";
import { tryParseJSON } from "../lib/result-parser";

import type { AnalysisMode, ProjectPipeline } from "../lib/types";

interface ExportToolbarProps {
  readonly result: string | null;
  readonly mode: AnalysisMode;
  readonly pipeline: ProjectPipeline;
  readonly pipelineOrder: readonly AnalysisMode[];
  readonly script: string;
  readonly onCsvUnavailable: () => void;
}

/**
 * أزرار التصدير الموحَّدة (Markdown/CSV/JSON/Production Packet).
 * كل المنطق في المتصفح — لا يتصل بأي endpoint.
 */
export function ExportToolbar({
  result,
  mode,
  pipeline,
  pipelineOrder,
  script,
  onCsvUnavailable,
}: ExportToolbarProps) {
  const hasResult = result !== null;
  const parsedJson = hasResult ? tryParseJSON(result) : null;
  const canExportCsv =
    hasResult &&
    (mode === "shotlist" ||
      result.includes("|---|") ||
      (parsedJson?.tables && parsedJson.tables.length > 0));
  const hasAnyPipelineSuccess = pipelineOrder.some(
    (m) => pipeline.stages[m].status === "success"
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasResult && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMarkdown(result, mode)}
            title="تصدير كـ Markdown"
          >
            <FileText className="ml-1 h-3 w-3" />
            Markdown
          </Button>
          {parsedJson && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportJSON(result, mode)}
              title="تصدير كـ JSON"
            >
              <Code className="ml-1 h-3 w-3" />
              JSON
            </Button>
          )}
          {canExportCsv && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const ok = exportCSV(result, mode);
                if (!ok) onCsvUnavailable();
              }}
              title="تصدير كـ CSV"
            >
              <Table className="ml-1 h-3 w-3" />
              CSV
            </Button>
          )}
        </>
      )}
      {hasAnyPipelineSuccess && (
        <Button
          size="sm"
          onClick={() =>
            exportProductionPacket(pipeline.stages, script, pipelineOrder)
          }
          title="تصدير حزمة الإنتاج الكاملة"
        >
          <Package className="ml-1 h-3 w-3" />
          حزمة الإنتاج
        </Button>
      )}
    </div>
  );
}
