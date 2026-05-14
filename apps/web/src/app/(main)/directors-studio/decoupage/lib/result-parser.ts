/**
 * أدوات تحليل وتنسيق مخرجات Gemini (JSON منظَّم → markdown).
 * مرجع المصدر: D-COUPAGE/src/services/exportService.ts
 */

import type { StructuredAnalysisResult } from "./types";

export function tryParseJSON(content: string): StructuredAnalysisResult | null {
  try {
    const trimmed = content.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    const payload = fenced?.[1]?.trim() ?? trimmed;
    const data: unknown = JSON.parse(payload);
    if (
      data !== null &&
      typeof data === "object" &&
      ("title" in data || "sections" in data || "tables" in data)
    ) {
      return data as StructuredAnalysisResult;
    }
  } catch {
    return null;
  }
  return null;
}

export function jsonToMarkdown(json: StructuredAnalysisResult): string {
  let md = "";
  if (json.title) md += `# ${json.title}\n\n`;
  if (json.summary) md += `**Summary:** ${json.summary}\n\n`;

  if (json.widgets && json.widgets.length > 0) {
    md += `> **Insights**\n`;
    for (const w of json.widgets) {
      md += `> - **${w.label}:** ${w.value}\n`;
    }
    md += `\n`;
  }

  if (json.sections) {
    for (const s of json.sections) {
      md += `## ${s.title}\n\n${s.content}\n\n`;
    }
  }

  if (json.tables) {
    for (const t of json.tables) {
      md += `### ${t.title || "Data"}\n\n`;
      if (t.headers && t.headers.length > 0) {
        md += `| ${t.headers.join(" | ")} |\n`;
        md += `| ${t.headers.map(() => "---").join(" | ")} |\n`;
      }
      if (t.rows && t.rows.length > 0) {
        for (const r of t.rows) {
          md += `| ${r.join(" | ")} |\n`;
        }
      }
      md += `\n`;
    }
  }
  return md;
}
