import { describe, expect, test } from "vitest";

import {
  assertLiveTurnCommandShape,
  buildCommandPlan,
  renderPlanReviewReport,
} from "./plan-implementation-reviewer";

describe("plan implementation reviewer", () => {
  const scripts = {
    "agent:bootstrap": "tsx scripts/agent/bootstrap.ts",
    "agent:verify": "tsx scripts/agent/verify-state.ts",
    "agent:persistent-memory:turn": "tsx scripts/agent/persistent-memory-turn.ts",
    "agent:persistent-memory:session:close":
      "tsx scripts/agent/persistent-memory-session.ts --close",
    test: "turbo test",
  };

  test("does not run live turn context acceptance without a query", () => {
    const commands = buildCommandPlan(scripts, true);

    expect(commands).not.toContainEqual(["agent:persistent-memory:turn"]);
    expect(
      commands
        .filter((command) => command[0] === "agent:persistent-memory:turn")
        .every((command) => command.includes("--query")),
    ).toBe(true);
    expect(
      commands
        .filter((command) => command[0] === "agent:persistent-memory:turn")
        .every((command) => command.includes("--quiet")),
    ).toBe(true);
  });

  test("rejects missing, empty, and non-quiet live turn command fixtures", () => {
    expect(() =>
      assertLiveTurnCommandShape(["agent:persistent-memory:turn"]),
    ).toThrow(/query/i);
    expect(() =>
      assertLiveTurnCommandShape([
        "agent:persistent-memory:turn",
        "--",
        "--query",
        "",
        "--quiet",
      ]),
    ).toThrow(/query/i);
    expect(() =>
      assertLiveTurnCommandShape([
        "agent:persistent-memory:turn",
        "--",
        "--query",
        "ما الغرض؟",
      ]),
    ).toThrow(/quiet/i);
  });

  test("puts quiet live turn checks before broader acceptance checks", () => {
    const commands = buildCommandPlan(scripts, true);
    const firstLiveTurnIndex = commands.findIndex(
      (command) => command[0] === "agent:persistent-memory:turn",
    );
    const testIndex = commands.findIndex((command) => command[0] === "test");

    expect(firstLiveTurnIndex).toBeGreaterThanOrEqual(0);
    expect(testIndex).toBeGreaterThan(firstLiveTurnIndex);
  });

  test("keeps detailed acceptance live turn commands guarded", () => {
    const commands = buildCommandPlan(scripts, true).filter(
      (command) => command[0] === "agent:persistent-memory:turn",
    );

    expect(commands.length).toBeGreaterThan(2);
    for (const command of commands) {
      expect(() => assertLiveTurnCommandShape(command)).not.toThrow();
    }
  });

  test("labels static matches as supporting evidence only and omits live context by default", () => {
    const report = renderPlanReviewReport({
      planPath: "specs/006-agent-memory-flow/plan.md",
      items: [],
      commandResults: [],
    });

    expect(report).toContain("Static matches are supporting evidence only");
    expect(report).not.toContain("Persistent Memory Live Turn Context");
    expect(report).not.toContain("memory_context:");
  });
});
