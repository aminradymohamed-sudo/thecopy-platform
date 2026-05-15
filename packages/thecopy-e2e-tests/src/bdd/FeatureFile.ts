/**
 * Tiny Gherkin reader for executable Mocha BDD scenarios.
 * It intentionally supports the subset this package owns: Feature, Scenario, Given/When/Then/And.
 */

import { readFile } from "node:fs/promises";

export interface BddScenario {
  name: string;
  steps: readonly string[];
}

export interface BddFeature {
  name: string;
  scenarios: readonly BddScenario[];
}

const STEP_PREFIX = /^(Given|When|Then|And|But)\s+/;

export async function readFeatureFile(path: string): Promise<BddFeature> {
  const text = await readFile(path, "utf8");
  const lines = text.split(/\r?\n/);
  let featureName = "";
  const scenarios: BddScenario[] = [];
  let active: { name: string; steps: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("Feature:")) {
      featureName = trimmed.slice("Feature:".length).trim();
      continue;
    }

    if (trimmed.startsWith("Scenario:")) {
      if (active) scenarios.push(active);
      active = {
        name: trimmed.slice("Scenario:".length).trim(),
        steps: [],
      };
      continue;
    }

    if (STEP_PREFIX.test(trimmed)) {
      if (!active) throw new Error(`Step found before Scenario in ${path}: ${trimmed}`);
      active.steps.push(trimmed.replace(STEP_PREFIX, ""));
    }
  }

  if (active) scenarios.push(active);
  if (!featureName) throw new Error(`Missing Feature title in ${path}`);
  if (scenarios.length === 0) throw new Error(`No scenarios found in ${path}`);

  return { name: featureName, scenarios };
}

export type BddStep<TWorld> = {
  pattern: RegExp;
  run: (world: TWorld, match: RegExpMatchArray) => Promise<void>;
};

export async function runScenario<TWorld>(
  world: TWorld,
  scenario: BddScenario,
  steps: readonly BddStep<TWorld>[]
): Promise<void> {
  for (const step of scenario.steps) {
    const found = steps.find((candidate) => candidate.pattern.test(step));
    if (!found) throw new Error(`No BDD step definition matched: ${step}`);
    const match = step.match(found.pattern);
    if (!match) throw new Error(`BDD step match failed unexpectedly: ${step}`);
    await found.run(world, match);
  }
}
