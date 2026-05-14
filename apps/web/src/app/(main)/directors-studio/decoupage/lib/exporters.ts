/**
 * Decoupage feature — مصدِّرو النتائج (متطابق مع D-COUPAGE/src/services/exportService.ts).
 *
 * كل العمل في المتصفح: Blob + URL.createObjectURL + anchor click.
 * لا يوجد طلب backend هنا، ولا حقن أسرار.
 */

import { jsonToMarkdown, tryParseJSON } from "./result-parser";

import type { AnalysisMode, PipelineStage } from "./types";

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeCsvCell(cell: string): string {
  let escaped = cell.replace(/"/g, '""');
  if (
    escaped.includes(",") ||
    escaped.includes("\n") ||
    escaped.includes('"')
  ) {
    escaped = `"${escaped}"`;
  }
  return escaped;
}

/**
 * يصدّر النتيجة كملف Markdown (`.md`).
 * يحوّل JSON المنظَّم إلى Markdown عند الإمكان.
 */
export function exportMarkdown(content: string, prefix = "decoupage"): void {
  const json = tryParseJSON(content);
  const finalContent = json ? jsonToMarkdown(json) : content;
  downloadFile(
    finalContent,
    `${prefix}_${dateStamp()}.md`,
    "text/markdown;charset=utf-8"
  );
}

/**
 * يصدّر الجداول داخل النتيجة كملف CSV (`.csv`).
 * يدعم استخراج جداول من JSON المنظَّم أو من جداول Markdown.
 */
export function exportCSV(content: string, prefix = "shotlist"): boolean {
  const json = tryParseJSON(content);
  let csvData = "";

  if (json?.tables && json.tables.length > 0) {
    for (const t of json.tables) {
      if (t.headers && t.headers.length > 0) {
        csvData += `${t.headers.map(escapeCsvCell).join(",")}\n`;
      }
      if (t.rows && t.rows.length > 0) {
        for (const r of t.rows) {
          csvData += `${r.map(escapeCsvCell).join(",")}\n`;
        }
      }
      csvData += "\n";
    }
  } else {
    const lines = content.split("\n");
    const csvLines: string[] = [];
    let inTable = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        inTable = true;
        if (/^\|[-:| ]+\|$/.test(trimmed)) continue;
        const cells = trimmed
          .split("|")
          .map((c) => c.trim())
          .slice(1, -1);
        csvLines.push(cells.map(escapeCsvCell).join(","));
      } else if (inTable) {
        inTable = false;
      }
    }
    csvData = csvLines.join("\n");
  }

  if (!csvData.trim()) {
    return false;
  }
  downloadFile(
    csvData,
    `${prefix}_${dateStamp()}.csv`,
    "text/csv;charset=utf-8"
  );
  return true;
}

/**
 * يصدّر النتيجة كـ JSON خام (`.json`).
 */
export function exportJSON(data: string, prefix = "decoupage"): void {
  let finalContent: string;
  try {
    JSON.parse(data);
    finalContent = data;
  } catch {
    finalContent = JSON.stringify({ content: data }, null, 2);
  }
  downloadFile(
    finalContent,
    `${prefix}_${dateStamp()}.json`,
    "application/json;charset=utf-8"
  );
}

/**
 * يصدّر «حزمة الإنتاج» Markdown يضم كل المراحل الناجحة + السكربت الأصلي.
 */
export function exportProductionPacket(
  stages: Record<AnalysisMode, PipelineStage>,
  script: string,
  pipelineOrder: readonly AnalysisMode[]
): void {
  let packet = `# Découpage Production Packet\n\nDate: ${new Date().toLocaleDateString()}\n\n`;
  packet += `## Original Script\n\n${script || "No script provided."}\n\n---\n\n`;

  for (const mode of pipelineOrder) {
    const stage = stages[mode];
    if (stage.status === "success" && stage.result) {
      packet += `## Phase: ${mode.toUpperCase()}\n\n`;
      const json = tryParseJSON(stage.result);
      if (json) {
        packet += jsonToMarkdown(json);
      } else {
        packet += stage.result;
      }
      packet += `\n\n---\n\n`;
    }
  }
  downloadFile(
    packet,
    `production_packet_${dateStamp()}.md`,
    "text/markdown;charset=utf-8"
  );
}
