import {
  findEvidenceReport,
  renderEvidenceReport,
} from "./lib/persistent-memory/evidence-report";
import {
  FileAgentSessionStore,
  type AgentSessionStore,
} from "./lib/persistent-memory/session-store";

export interface EvidenceCommandResult {
  exitCode: 0 | 1;
  output: string;
  error?: string;
}

export interface EvidenceCommandOptions {
  store?: AgentSessionStore;
}

function readArg(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  return args[index + 1];
}

async function openDefaultStore(): Promise<FileAgentSessionStore> {
  const store = new FileAgentSessionStore();
  await store.hydrate();
  return store;
}

export async function runEvidenceCommand(
  args: string[],
  options: EvidenceCommandOptions = {},
): Promise<EvidenceCommandResult> {
  try {
    const sessionId = readArg(args, "--session");
    const turnId = readArg(args, "--turn");
    if (!sessionId?.trim()) {
      throw new Error("--session is required for evidence reports.");
    }
    if (!turnId?.trim()) {
      throw new Error("--turn is required for evidence reports.");
    }

    const store = options.store ?? (await openDefaultStore());
    const report = await findEvidenceReport({ store, sessionId, turnId });
    return {
      exitCode: 0,
      output: renderEvidenceReport(report),
    };
  } catch (error) {
    return {
      exitCode: 1,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  const result = await runEvidenceCommand(process.argv.slice(2));
  if (result.output) {
    console.log(result.output);
  }
  if (result.error) {
    console.error(result.error);
  }
  process.exit(result.exitCode);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
