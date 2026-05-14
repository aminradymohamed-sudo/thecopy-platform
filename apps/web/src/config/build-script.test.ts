import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

interface WebPackageJson {
  scripts?: Record<string, string>;
}

async function readWebPackageJson(): Promise<WebPackageJson> {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  return JSON.parse(await readFile(packageJsonPath, "utf8")) as WebPackageJson;
}

describe("web build process memory contract", () => {
  it.each(["build", "build:production"])(
    "keeps the production heap limit and readlink shim in %s",
    async (scriptName) => {
      const packageJson = await readWebPackageJson();
      const buildScript = packageJson.scripts?.[scriptName] ?? "";
      const nodeOptionsMatch = /NODE_OPTIONS=(?:"([^"]+)"|(\S+))/.exec(
        buildScript
      );
      const nodeOptions = nodeOptionsMatch?.[1] ?? nodeOptionsMatch?.[2] ?? "";

      expect(buildScript).toContain("NODE_ENV=production");
      expect(buildScript).toContain("next build --webpack");
      expect(nodeOptions.split(/\s+/)).toEqual(
        expect.arrayContaining([
          "--max-old-space-size=8192",
          "--require=./scripts/node-readlink-eisdir-shim.cjs",
        ])
      );
    }
  );
});
