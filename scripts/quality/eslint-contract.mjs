#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const args = process.argv.slice(2);
const projectArg = args.find((arg) => arg.startsWith("--project="));
const project = projectArg?.slice("--project=".length);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const reportLimit = limitArg ? Number(limitArg.slice("--limit=".length)) : 50;
const targetArgs = args
  .filter((arg) => arg.startsWith("--target="))
  .map((arg) => arg.slice("--target=".length))
  .filter(Boolean);

const projects = {
  web: {
    root: resolve(repoRoot, "apps/web"),
    discoverTargets(root) {
      const targets = [];
      const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

      function extensionOf(fileName) {
        return fileName.slice(fileName.lastIndexOf("."));
      }

      function hasLintableFiles(relativePath) {
        const full = resolve(root, relativePath);
        if (!existsSync(full)) {
          return false;
        }

        const stats = statSync(full);
        if (stats.isFile()) {
          return extensions.has(extensionOf(relativePath));
        }

        return readdirSync(full).some((entry) =>
          hasLintableFiles(`${relativePath}/${entry}`),
        );
      }

      function addFileOrDirectory(relativePath) {
        const full = resolve(root, relativePath);
        if (!existsSync(full)) {
          return;
        }

        const stats = statSync(full);
        if (stats.isFile()) {
          if (extensions.has(extensionOf(relativePath))) {
            targets.push(relativePath);
          }
          return;
        }

        if (hasLintableFiles(relativePath)) {
          targets.push(relativePath);
        }
      }

      function addChildren(relativePath) {
        const full = resolve(root, relativePath);
        if (!existsSync(full) || !statSync(full).isDirectory()) {
          return;
        }

        for (const entry of readdirSync(full)) {
          addFileOrDirectory(`${relativePath}/${entry}`);
        }
      }

      for (const entry of readdirSync(root)) {
        const full = resolve(root, entry);
        if (entry === "src") {
          addChildren("src");
          continue;
        }

        if (["tests", "scripts"].includes(entry)) {
          addChildren(entry);
          continue;
        }

        if (statSync(full).isFile() && extensions.has(extensionOf(entry))) {
          targets.push(entry);
        }
      }

      const splitTargets = [
        "src/ai",
        "src/app",
        "src/app/(main)",
        "src/components",
        "src/lib",
      ];
      for (const splitTarget of splitTargets) {
        const targetIndex = targets.indexOf(splitTarget);
        if (targetIndex >= 0) {
          targets.splice(targetIndex, 1);
          addChildren(splitTarget);
        }
      }

      return targets;
    },
  },
  backend: {
    root: resolve(repoRoot, "apps/backend"),
    discoverTargets(root) {
      const targets = [];
      const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

      function collect(relativePath) {
        const full = resolve(root, relativePath);
        if (!existsSync(full)) {
          return;
        }

        const stats = statSync(full);
        if (stats.isDirectory()) {
          for (const entry of readdirSync(full)) {
            collect(`${relativePath}/${entry}`);
          }
          return;
        }

        const extension = relativePath.slice(relativePath.lastIndexOf("."));
        if (extensions.has(extension)) {
          targets.push(relativePath);
        }
      }

      const src = resolve(root, "src");
      for (const entry of readdirSync(src)) {
        const full = resolve(src, entry);
        if (statSync(full).isDirectory()) {
          if (entry === "ocr-arabic-pdf-to-txt-pipeline") {
            collect(`src/${entry}`);
          } else {
            targets.push(`src/${entry}`);
          }
        } else if (extensions.has(entry.slice(entry.lastIndexOf(".")))) {
          targets.push(`src/${entry}`);
        }
      }

      for (const entry of ["scripts", "agents", "examples"]) {
        const full = resolve(root, entry);
        if (existsSync(full) && statSync(full).isDirectory()) {
          targets.push(entry);
        }
      }

      if (existsSync(resolve(root, "mcp-server.ts"))) {
        targets.push("mcp-server.ts");
      }

      return targets;
    },
  },
};

if (!project || !projects[project]) {
  console.error(
    "Usage: node scripts/quality/eslint-contract.mjs --project=web|backend [--limit=N] [--target=<path>]",
  );
  process.exit(2);
}

if (!Number.isFinite(reportLimit) || reportLimit < 1) {
  console.error("[lint] --limit must be a positive number.");
  process.exit(2);
}

const eslintBin = resolve(repoRoot, "node_modules/eslint/bin/eslint.js");
const config = projects[project];
const targets =
  targetArgs.length > 0
    ? targetArgs
    : (config.targets ?? config.discoverTargets(config.root));

if (project === "web") {
  const lintTargets = targetArgs.length > 0 ? targets : ["."];
  const result = spawnSync(
    process.execPath,
    [
      "--max-old-space-size=8192",
      eslintBin,
      ...lintTargets,
      "--no-warn-ignored",
      "--max-warnings=0",
    ],
    {
      cwd: config.root,
      encoding: "utf8",
      stdio: "inherit",
    },
  );

  process.exit(result.status ?? 1);
}

function fingerprint(message, filePath) {
  const file = relative(repoRoot, filePath).replaceAll("\\", "/");
  const rule = message.ruleId ?? "parser";
  return `${file}|${rule}|${message.message}`;
}

function addCount(map, key, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function debugLog(message) {
  if (process.env.ESLINT_CONTRACT_DEBUG === "1") {
    console.error(`[lint-debug] ${message}`);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function createLintProject(target) {
  if (project !== "backend" && project !== "web") {
    return null;
  }

  const targetList = asArray(target);
  const safeName = targetList
    .join("--")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 120);
  const tempConfig = resolve(
    config.root,
    `.tsconfig.eslint-contract.${process.pid}.${safeName}.json`,
  );
  const targetInclude = targetList.flatMap((item) => {
    const isFile = /\.[cm]?[jt]sx?$/.test(item);
    return isFile
      ? [item]
      : [
          `${item}/**/*.ts`,
          `${item}/**/*.tsx`,
          `${item}/**/*.js`,
          `${item}/**/*.mjs`,
          `${item}/**/*.cjs`,
        ];
  });
  const include =
    project === "web"
      ? ["next-env.d.ts", "src/env.d.ts", "src/global.d.ts", ...targetInclude]
      : [
          "src/global.d.ts",
          "src/env.d.ts",
          "src/types/env.d.ts",
          "src/types/mcp-sdk-compat.d.ts",
          "src/types/module-alias.d.ts",
          ...targetInclude,
        ];

  const projectConfig = {
    extends: "./tsconfig.check.json",
    compilerOptions: {
      noEmit: true,
    },
    include,
    exclude:
      project === "web"
        ? ["node_modules", ".next", "out", "dist", "build", "coverage"]
        : ["node_modules", "dist"],
  };

  writeFileSync(tempConfig, `${JSON.stringify(projectConfig, null, 2)}\n`);
  return tempConfig;
}

async function runEslint(target) {
  const lintTargets = asArray(target);
  const tempProject = createLintProject(target);
  const result = spawnSync(
    process.execPath,
    [
      project === "web"
        ? "--max-old-space-size=4096"
        : "--max-old-space-size=16384",
      eslintBin,
      ...lintTargets,
      "--format",
      "json",
      "--no-warn-ignored",
    ],
    {
      cwd: config.root,
      encoding: "utf8",
      env: tempProject
        ? { ...process.env, ESLINT_CONTRACT_TSCONFIG: tempProject }
        : process.env,
      maxBuffer: 1024 * 1024 * 200,
    },
  );

  if (!result.stdout.trim()) {
    if (project === "web") {
      const previousProject = process.env.ESLINT_CONTRACT_TSCONFIG;
      try {
        if (tempProject) {
          process.env.ESLINT_CONTRACT_TSCONFIG = tempProject;
        }
        const eslint = new ESLint({
          cwd: config.root,
          overrideConfigFile: resolve(config.root, "eslint.config.js"),
        });
        return {
          fatal: false,
          status: 0,
          output: "",
          messages: await eslint.lintFiles(lintTargets),
        };
      } catch (error) {
        return {
          fatal: true,
          status: 1,
          output: error instanceof Error ? error.message : String(error),
          messages: [],
        };
      } finally {
        if (previousProject === undefined) {
          delete process.env.ESLINT_CONTRACT_TSCONFIG;
        } else {
          process.env.ESLINT_CONTRACT_TSCONFIG = previousProject;
        }
        if (tempProject) {
          rmSync(tempProject, { force: true });
        }
      }
    }
    if (tempProject) {
      rmSync(tempProject, { force: true });
    }
    return {
      fatal: true,
      status: result.status ?? 1,
      output:
        `${result.stderr ?? ""}${result.stdout ?? ""}` ||
        `ESLint produced no output. status=${String(result.status)} signal=${String(result.signal)}`,
      messages: [],
    };
  }
  if (tempProject) {
    rmSync(tempProject, { force: true });
  }

  try {
    return {
      fatal: false,
      status: result.status ?? 0,
      output: result.stderr ?? "",
      messages: JSON.parse(result.stdout),
    };
  } catch (error) {
    return {
      fatal: true,
      status: result.status ?? 1,
      output: `${error.message}\n${result.stderr ?? ""}\n${result.stdout ?? ""}`,
      messages: [],
    };
  }
}

const current = {};
let errors = 0;
let warnings = 0;
let filesWithMessages = 0;
const fatalOutputs = [];

function recordLintMessages(messages) {
  for (const fileResult of messages) {
    const count = (fileResult.messages ?? []).length;
    if (count > 0) {
      filesWithMessages += 1;
    }
    errors += fileResult.errorCount ?? 0;
    warnings += fileResult.warningCount ?? 0;

    for (const message of fileResult.messages ?? []) {
      addCount(current, fingerprint(message, fileResult.filePath));
    }
  }
}

function chunkTargets(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

if (project === "web") {
  debugLog(`chdir ${config.root}`);
  process.chdir(config.root);
}

const targetBatches =
  project === "web"
    ? chunkTargets(
        targets,
        Number(process.env.ESLINT_CONTRACT_BATCH_SIZE ?? 12),
      )
    : targets.map((target) => [target]);

for (const targetBatch of targetBatches) {
  debugLog(`lint ${targetBatch.join(", ")}`);
  const result = await runEslint(targetBatch);
  if (result.fatal) {
    fatalOutputs.push(`[${targetBatch.join(", ")}] ${result.output}`);
    continue;
  }

  recordLintMessages(result.messages);
  debugLog(`done ${targetBatch.join(", ")}`);
}

if (fatalOutputs.length > 0) {
  console.error(fatalOutputs.join("\n"));
  process.exit(1);
}

console.log(
  `[lint] ${project}: ${errors} error(s), ${warnings} warning(s), ${filesWithMessages} file(s) with messages.`,
);

if (Object.keys(current).length > 0) {
  const sorted = Object.entries(current)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
  for (const item of sorted.slice(0, reportLimit)) {
    console.error(`  ${item.count}× ${item.key}`);
  }
  if (sorted.length > reportLimit) {
    console.error(
      `  ...and ${sorted.length - reportLimit} more unique violation(s).`,
    );
  }
}

if (errors > 0 || warnings > 0) {
  console.error(`[lint] ${project}: lint violations detected.`);
  process.exit(1);
}
