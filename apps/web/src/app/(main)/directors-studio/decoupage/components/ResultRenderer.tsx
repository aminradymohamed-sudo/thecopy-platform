"use client";

import { useMemo, type ReactElement } from "react";

import { jsonToMarkdown, tryParseJSON } from "../lib/result-parser";

interface ResultRendererProps {
  readonly text: string;
}

interface ParsedLine {
  kind: "h1" | "h2" | "h3" | "list" | "table" | "paragraph" | "empty";
  content: string;
  cells?: string[];
}

function parseLine(line: string): ParsedLine {
  const trimmed = line.trim();
  if (!trimmed) return { kind: "empty", content: "" };
  if (line.startsWith("# ")) return { kind: "h1", content: line.slice(2) };
  if (line.startsWith("## ")) return { kind: "h2", content: line.slice(3) };
  if (line.startsWith("### ")) return { kind: "h3", content: line.slice(4) };
  if (line.startsWith("- ") || line.startsWith("* ")) {
    return { kind: "list", content: line.slice(2) };
  }
  if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
    if (trimmed.includes("---")) return { kind: "empty", content: "" };
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    return { kind: "table", content: trimmed, cells };
  }
  return { kind: "paragraph", content: line };
}

/**
 * عارض markdown منظَّم لمخرجات Gemini.
 * يقبل نصًا خامًا أو JSON حسب الحقل `text`، ثم يحوّله markdown ويعرضه.
 */
export function ResultRenderer({ text }: ResultRendererProps) {
  const markdown = useMemo(() => {
    if (!text) return "";
    const json = tryParseJSON(text);
    if (json) return jsonToMarkdown(json);
    return text;
  }, [text]);

  const elements = useMemo(() => {
    const lines = markdown.split("\n");
    return lines.map((line, idx): ReactElement => {
      const parsed = parseLine(line);
      const key = `line-${idx}`;
      switch (parsed.kind) {
        case "empty":
          return <div key={key} className="h-2" />;
        case "h1":
          return (
            <h1
              key={key}
              className="mb-3 mt-6 text-2xl font-bold text-[var(--app-text)]"
            >
              {parsed.content}
            </h1>
          );
        case "h2":
          return (
            <h2
              key={key}
              className="mb-2 mt-5 border-b border-[var(--app-border)] pb-2 text-xl font-bold text-[var(--app-text)]"
            >
              {parsed.content}
            </h2>
          );
        case "h3":
          return (
            <h3
              key={key}
              className="mb-2 mt-4 border-r-4 border-[var(--app-accent)] pr-3 text-base font-bold uppercase tracking-widest text-[var(--app-text)]"
            >
              {parsed.content}
            </h3>
          );
        case "list":
          return (
            <div
              key={key}
              className="mr-4 flex gap-2 text-sm text-[var(--app-text)]"
            >
              <span className="text-[var(--app-accent)]">❖</span>
              <span>{parsed.content}</span>
            </div>
          );
        case "table":
          if (!parsed.cells) {
            return <div key={key} className="h-2" />;
          }
          return (
            <div
              key={key}
              className="grid border-b border-[var(--app-border)] hover:bg-[var(--app-surface)]/50"
              style={{
                gridTemplateColumns: `repeat(${parsed.cells.length}, minmax(0, 1fr))`,
              }}
            >
              {parsed.cells.map((cell, i) => (
                <div
                  key={`${key}-c${i}`}
                  className="border-l border-[var(--app-border)] p-2 text-xs first:border-l-0"
                >
                  {cell.replace(/\*\*/g, "")}
                </div>
              ))}
            </div>
          );
        case "paragraph":
        default:
          return (
            <p
              key={key}
              className="mb-1 text-sm leading-relaxed text-[var(--app-text)]"
            >
              {parsed.content}
            </p>
          );
      }
    });
  }, [markdown]);

  if (!text) return null;

  return <div className="space-y-1">{elements}</div>;
}
