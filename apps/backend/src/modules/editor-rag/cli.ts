import { weaviateStore } from "@/memory/vector-store/client";

import { editorRagService } from "./service";

type CliCommand = "ask" | "index" | "smoke" | "stats";

function readFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  const value = args[index + 1];
  return value;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function readRepeatedFlag(args: string[], name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) {
      const value = args[index + 1];
      if (value) {
        values.push(value);
      }
      index += 1;
    }
  }
  return values;
}

function readPositionals(args: string[]): string[] {
  const positionals: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item) {
      continue;
    }
    if (item.startsWith("--")) {
      index += 1;
      continue;
    }
    positionals.push(item);
  }
  return positionals;
}

function parseMaxFiles(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runIndex(args: string[]): Promise<void> {
  const repoPath = readFlag(args, "--repo-path") ?? readPositionals(args)[0];
  const specificFiles = readRepeatedFlag(args, "--file");
  const result = await editorRagService.index({
    reset: hasFlag(args, "--reset"),
    allowOutsideWorkspace: true,
    ...(repoPath ? { repoPath } : {}),
    ...(() => {
      const maxFiles = parseMaxFiles(readFlag(args, "--max-files"));
      return maxFiles ? { maxFiles } : {};
    })(),
    ...(specificFiles.length > 0 ? { specificFiles } : {}),
  });

  printJson({
    success: true,
    repoPath: result.repoPath,
    stats: result.stats,
    models: result.models,
  });
}

async function runAsk(args: string[]): Promise<void> {
  const question =
    readFlag(args, "--question") ?? readPositionals(args).join(" ");
  if (!question.trim()) {
    throw new Error(
      'Usage: pnpm --filter @the-copy/backend editor-rag:ask "your question"',
    );
  }

  const limit = parseMaxFiles(readFlag(args, "--limit")) ?? 5;
  const answer = await editorRagService.askQuestion(question, limit);
  printJson({
    success: true,
    ...answer,
  });
}

async function runStats(): Promise<void> {
  printJson({
    success: true,
    data: await editorRagService.stats(),
  });
}

async function runSmoke(): Promise<void> {
  const health = await editorRagService.health();
  if (health.status !== "healthy") {
    throw new Error(
      `Editor RAG is not healthy: ${health.status}${
        health.geminiError ? ` (${health.geminiError})` : ""
      }`,
    );
  }

  const smokeFile = "src/pipeline/unstructured/normalize.ts";
  await editorRagService.index({
    specificFiles: [smokeFile],
    maxFiles: 1,
    allowOutsideWorkspace: false,
  });

  const answer = await editorRagService.askQuestion(
    `ما وظيفة normalizeForUnstructuredWork في ملف ${smokeFile}؟`,
    3,
  );

  if (
    !answer.sources.some((source) =>
      source.filePath.replace(/\\/g, "/").includes(smokeFile),
    )
  ) {
    throw new Error(
      `Editor RAG smoke search returned no source for ${smokeFile}`,
    );
  }

  printJson({
    success: true,
    health,
    answer,
  });
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2) as [
    CliCommand | undefined,
    ...string[],
  ];

  switch (command) {
    case "index":
      await runIndex(args);
      return;
    case "ask":
      await runAsk(args);
      return;
    case "stats":
      await runStats();
      return;
    case "smoke":
      await runSmoke();
      return;
    default:
      throw new Error(
        "Usage: editor-rag <index|ask|stats|smoke> [--repo-path path] [--reset]",
      );
  }
}

main()
  .then(async () => {
    await weaviateStore.disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    await weaviateStore.disconnect().catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
