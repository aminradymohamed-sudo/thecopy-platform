import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { PERSISTENT_MEMORY_TURN_CONTEXT_PATH } from "./lib/constants";
import { FileAgentSessionStore } from "./lib/persistent-memory/session-store";
import {
  buildTurnMemoryContext,
  renderTurnMemoryContext,
  type TurnMemoryContext,
  writeTurnMemoryContext,
} from "./lib/persistent-memory/turn-context";
import { MemorySecretScanner } from "./lib/persistent-memory/secrets";
import { fromRepoRoot } from "./lib/utils";

function readArgFrom(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  return args[index + 1];
}

function readArg(name: string): string | undefined {
  return readArgFrom(process.argv, name);
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export function shouldPrintTurnContext(args: string[]): boolean {
  return hasFlag(args, "--print-context") || hasFlag(args, "--verbose");
}

function isQuiet(args: string[]): boolean {
  return hasFlag(args, "--quiet") || process.env["PERSISTENT_MEMORY_QUIET"] === "true";
}

export function renderTurnCommandOutput(
  context: TurnMemoryContext,
  args: string[],
): string {
  if (isQuiet(args)) {
    return "";
  }

  if (shouldPrintTurnContext(args)) {
    return renderTurnMemoryContext(context);
  }

  return [
    "سياق السؤال الحي محفوظ بصمت.",
    "التفاصيل محفوظة داخليًا عند الطلب الصريح.",
  ].join("\n");
}

const REQUIRED_TURN_CONTEXT_FIELDS = [
  "turn_context_status:",
  "query_hash:",
  "selected_intent:",
  "selected_profile:",
  "retrieval_event_id:",
  "audit_event_id:",
  "latency_ms:",
  "degradation_reason:",
  "repair_job_id:",
  "memory_context:",
];

export function assertTurnContextFileContent(content: string): string[] {
  return REQUIRED_TURN_CONTEXT_FIELDS.filter((field) => !content.includes(field));
}

function resolveRepoPath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : fromRepoRoot(filePath);
}

function assertTurnContextFile(args = process.argv): void {
  const contextPath =
    readArgFrom(args, "--context") ?? PERSISTENT_MEMORY_TURN_CONTEXT_PATH;
  const content = readFileSync(resolveRepoPath(contextPath), "utf8");
  const missing = assertTurnContextFileContent(content);
  if (missing.length > 0) {
    throw new Error(`Live turn context is missing fields: ${missing.join(", ")}`);
  }
}

async function runComplete(): Promise<void> {
  const sessionId =
    readArg("--session") || process.env["PERSISTENT_MEMORY_SESSION_ID"] || "local-agent-session";
  const turnId = readArg("--turn");
  const answerRef = readArg("--answer-ref");
  if (!turnId?.trim()) {
    throw new Error("--turn is required when completing a turn trace.");
  }
  if (!answerRef?.trim()) {
    throw new Error("--answer-ref is required when completing a turn trace.");
  }

  const store = new FileAgentSessionStore();
  await store.hydrate();
  const existing = await store.getTurnContextRecord(turnId);
  if (!existing || existing.sessionId !== sessionId) {
    throw new Error(`Turn does not exist for session ${sessionId}: ${turnId}`);
  }
  await store.markTurnAnswered(turnId, answerRef);
  await store.markTurnClosed(turnId);
  await store.persist();

  if (!isQuiet(process.argv.slice(2))) {
    console.log("أثر الدور مكتمل وقابل للتقرير.");
  }
}

async function runBuild(): Promise<void> {
  const query = readArg("--query");
  if (!query?.trim()) {
    throw new Error("--query is required for live turn memory context.");
  }

  const context = await buildTurnMemoryContext({ query });
  await writeTurnMemoryContext(context);

  const scanner = new MemorySecretScanner();
  const scan = scanner.scan(query);
  const sessionId =
    readArg("--session") || process.env["PERSISTENT_MEMORY_SESSION_ID"] || "local-agent-session";
  const turnId = readArg("--turn") || randomUUID();
  const store = new FileAgentSessionStore();
  await store.hydrate();
  await store.markTurnStarted(turnId, {
    sessionId,
    rawQueryForRepair: scan.clean ? query : undefined,
    queryHash: context.queryHash,
    redactedQueryPreview: context.redactedQueryPreview,
  });
  await store.markTurnContextBuilt(turnId, context);
  await store.persist();

  const output = renderTurnCommandOutput(context, process.argv.slice(2));
  if (output) {
    console.log(output);
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--verify")) {
    assertTurnContextFile();
    console.log("live turn context verification passed");
    return;
  }

  if (process.argv.includes("--repair") && !readArg("--query")) {
    assertTurnContextFile();
    console.log("live turn context repair found an existing valid context");
    return;
  }

  if (process.argv.includes("--complete")) {
    await runComplete();
    return;
  }

  await runBuild();
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
