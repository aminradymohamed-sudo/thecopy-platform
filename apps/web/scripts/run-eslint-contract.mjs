import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const contractScript = resolve(repoRoot, "scripts/quality/eslint-contract.mjs");
const forwardedArgs = process.argv
  .slice(2)
  .map((arg) => (arg.startsWith("--") ? arg : `--target=${arg}`));
const result = spawnSync(
  process.execPath,
  [contractScript, "--project=web", ...forwardedArgs],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
  }
);

process.exit(result.status ?? 1);
