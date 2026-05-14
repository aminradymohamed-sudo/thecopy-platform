import { randomUUID } from "node:crypto";

import { runAgentGuard } from "./lib/agent-guard";
import {
  buildTurnMemoryContext,
  renderTurnMemoryContext,
  writeTurnMemoryContext,
} from "./lib/persistent-memory/turn-context";
import { MemorySecretScanner } from "./lib/persistent-memory/secrets";
import { FileAgentSessionStore } from "./lib/persistent-memory/session-store";

interface ClaudePromptHookInput {
  session_id?: string;
  sessionId?: string;
  turn_id?: string;
  turnId?: string;
  prompt?: string;
  user_prompt?: string;
  message?: {
    content?: unknown;
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function readPromptFromHookInput(rawInput: string): string {
  const input = JSON.parse(rawInput || "{}") as ClaudePromptHookInput;
  const messageContent = input.message?.content;
  if (Array.isArray(messageContent)) {
    const text = messageContent
      .map((item) =>
        typeof item === "string"
          ? item
          : readString((item as { text?: unknown })?.text) ?? "",
      )
      .join("\n")
      .trim();
    if (text) {
      return text;
    }
  }

  return (
    readString(input.prompt) ??
    readString(input.user_prompt) ??
    readString(messageContent) ??
    "[media prompt]"
  );
}

function readSessionId(input: ClaudePromptHookInput): string {
  return (
    readString(input.session_id) ??
    readString(input.sessionId) ??
    process.env["PERSISTENT_MEMORY_SESSION_ID"] ??
    "local-agent-session"
  );
}

function readTurnId(input: ClaudePromptHookInput): string {
  return readString(input.turn_id) ?? readString(input.turnId) ?? randomUUID();
}

export function renderClaudeHookOutput(additionalContext: string): string {
  return JSON.stringify({
    continue: true,
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function suppressStdout<T>(operation: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  console.log = () => {};
  try {
    return await operation();
  } finally {
    console.log = originalLog;
  }
}

async function main(): Promise<void> {
  const rawInput = await readStdin();
  const hookInput = JSON.parse(rawInput || "{}") as ClaudePromptHookInput;
  const query = readPromptFromHookInput(rawInput);

  await suppressStdout(() => runAgentGuard("step"));

  const context = await buildTurnMemoryContext({ query });
  await writeTurnMemoryContext(context);

  const scanner = new MemorySecretScanner();
  const scan = scanner.scan(query);
  const store = new FileAgentSessionStore();
  const sessionId = readSessionId(hookInput);
  const turnId = readTurnId(hookInput);
  await store.hydrate();
  await store.markTurnStarted(turnId, {
    sessionId,
    rawQueryForRepair: scan.clean ? query : undefined,
    queryHash: context.queryHash,
    redactedQueryPreview: context.redactedQueryPreview,
  });
  await store.markTurnContextBuilt(turnId, context);
  await store.persist();

  console.log(renderClaudeHookOutput(renderTurnMemoryContext(context)));
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  });
}
