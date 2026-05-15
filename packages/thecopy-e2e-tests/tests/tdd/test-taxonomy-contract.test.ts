/**
 * TDD guardrail: the comprehensive suite taxonomy is executable first.
 * New disciplines must add script + directory + coverage contract before test code grows.
 */

import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect } from "chai";

import {
  REQUIRED_DISCIPLINES,
  TEST_TAXONOMY,
  type TestDiscipline,
} from "../../src/testing/TestTaxonomy.js";

const packageRoot = process.cwd();

describe("TDD | Test taxonomy contract", function suite() {
  this.timeout(30_000);

  it("declares every requested testing discipline exactly once", function () {
    const ids = TEST_TAXONOMY.map((entry) => entry.id);
    expect(new Set(ids).size, "unique taxonomy ids").to.equal(ids.length);
    for (const required of REQUIRED_DISCIPLINES) {
      expect(ids, `${required} must be present`).to.include(required);
    }
  });

  it("binds each requested discipline to a package script and directory", async function () {
    const pkg = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    for (const entry of TEST_TAXONOMY) {
      expect(pkg.scripts, `${entry.id} script`).to.have.property(entry.script);
      await access(resolve(packageRoot, entry.directory));
    }
  });

  it("keeps the user-requested suite set CI-required", function () {
    const byId = new Map<TestDiscipline, boolean>(
      TEST_TAXONOMY.map((entry) => [entry.id, entry.ciRequired])
    );
    for (const required of REQUIRED_DISCIPLINES) {
      expect(byId.get(required), `${required} ciRequired`).to.equal(true);
    }
  });
});
