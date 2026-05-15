/**
 * Canonical map of the comprehensive Selenium test system.
 */

export type TestDiscipline =
  | "smoke"
  | "functional"
  | "integration"
  | "performance"
  | "regression"
  | "tdd"
  | "bdd"
  | "system";

export interface TestDisciplineDefinition {
  id: TestDiscipline;
  script: string;
  directory: string;
  purpose: string;
  seleniumRole: "browser" | "api" | "hybrid" | "methodology";
  gridRequired: boolean;
  ciRequired: boolean;
}

export const TEST_TAXONOMY: readonly TestDisciplineDefinition[] = [
  {
    id: "smoke",
    script: "smoke",
    directory: "tests/smoke",
    purpose: "Fast availability probes for frontend, backend, and confirmed studio routes.",
    seleniumRole: "hybrid",
    gridRequired: true,
    ciRequired: true,
  },
  {
    id: "functional",
    script: "functional",
    directory: "tests/functional",
    purpose: "Feature-level verification of visible user functions through Page Objects.",
    seleniumRole: "browser",
    gridRequired: true,
    ciRequired: true,
  },
  {
    id: "integration",
    script: "integration",
    directory: "tests/integration",
    purpose: "Cross-component checks for frontend, backend, auth, and browser-side API calls.",
    seleniumRole: "hybrid",
    gridRequired: true,
    ciRequired: true,
  },
  {
    id: "performance",
    script: "performance",
    directory: "tests/performance",
    purpose: "Latency and navigation timing budgets for critical API and browser paths.",
    seleniumRole: "hybrid",
    gridRequired: true,
    ciRequired: true,
  },
  {
    id: "regression",
    script: "regression",
    directory: "tests/regression",
    purpose: "Re-check stable contracts after fixes and features to catch broken behavior.",
    seleniumRole: "hybrid",
    gridRequired: true,
    ciRequired: true,
  },
  {
    id: "tdd",
    script: "tdd",
    directory: "tests/tdd",
    purpose: "Executable contracts that drive and guard test-system design before expansion.",
    seleniumRole: "methodology",
    gridRequired: false,
    ciRequired: true,
  },
  {
    id: "bdd",
    script: "bdd",
    directory: "tests/bdd",
    purpose: "Gherkin-backed behavior scenarios expressed in shared product language.",
    seleniumRole: "browser",
    gridRequired: true,
    ciRequired: true,
  },
  {
    id: "system",
    script: "system",
    directory: "tests/system",
    purpose: "Complete end-to-end journeys on a production-like environment.",
    seleniumRole: "hybrid",
    gridRequired: true,
    ciRequired: true,
  },
] as const;

export const REQUIRED_DISCIPLINES: readonly TestDiscipline[] = [
  "functional",
  "integration",
  "performance",
  "regression",
  "tdd",
  "bdd",
  "system",
] as const;

export function getDiscipline(id: TestDiscipline): TestDisciplineDefinition {
  const found = TEST_TAXONOMY.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown test discipline: ${id}`);
  return found;
}
