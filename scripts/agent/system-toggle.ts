import { promises as fsp } from "node:fs";
import path from "node:path";

import {
  AGENT_SYSTEM_DISABLED_MARKER_PATH,
  FINGERPRINT_PATH,
  PERSISTENT_MEMORY_CONTEXT_PATH,
  PERSISTENT_MEMORY_TURN_CONTEXT_PATH,
  SESSION_STATE_PATH,
} from "./lib/constants";
import {
  AGENT_SYSTEM_DISABLED_ENV,
  readAgentSystemDisabledState,
} from "./lib/agent-guard";
import { fromRepoRoot } from "./lib/utils";

const MARKER_PATH = fromRepoRoot(AGENT_SYSTEM_DISABLED_MARKER_PATH);

function usage(): string {
  return [
    "Usage: pnpm agent-system:disable|enable|status",
    "",
    `Temporary opt-out: set ${AGENT_SYSTEM_DISABLED_ENV}=true for a command.`,
    `Persistent local opt-out: ${AGENT_SYSTEM_DISABLED_MARKER_PATH}`,
  ].join("\n");
}

async function disable(): Promise<void> {
  await fsp.mkdir(path.dirname(MARKER_PATH), { recursive: true });
  await fsp.writeFile(
    MARKER_PATH,
    [
      "# Agent System Disabled",
      "",
      "This local marker disables repository agent guard, bootstrap, verify,",
      "live memory, and drift enforcement hooks.",
      "",
      "Remove it with:",
      "",
      "pnpm agent-system:enable",
      "",
      "Generated files are intentionally left in place but ignored by hooks.",
      `Known generated references: ${SESSION_STATE_PATH}, ${PERSISTENT_MEMORY_CONTEXT_PATH}, ${PERSISTENT_MEMORY_TURN_CONTEXT_PATH}, ${FINGERPRINT_PATH}`,
      "",
    ].join("\n"),
  );
  console.log(`Agent system disabled via ${AGENT_SYSTEM_DISABLED_MARKER_PATH}`);
}

async function enable(): Promise<void> {
  await fsp.rm(MARKER_PATH, { force: true });
  console.log("Agent system enabled.");
}

async function status(): Promise<void> {
  const state = await readAgentSystemDisabledState();
  if (state.disabled) {
    console.log(`disabled: ${state.reasons.join(", ")}`);
    return;
  }

  console.log("enabled");
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "disable") {
    await disable();
    return;
  }
  if (command === "enable") {
    await enable();
    return;
  }
  if (command === "status") {
    await status();
    return;
  }

  console.error(usage());
  process.exit(1);
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
