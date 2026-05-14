import { describe, expect, test } from "vitest";

import { runEvidenceCommand } from "./persistent-memory-evidence";
import { InMemoryAgentSessionStore } from "./lib/persistent-memory/session-store";

async function buildStore(): Promise<InMemoryAgentSessionStore> {
  const store = new InMemoryAgentSessionStore();
  await store.markTurnStarted("turn-1", {
    sessionId: "session-1",
    queryHash: "a".repeat(64),
    redactedQueryPreview: "هل يوجد تقرير؟",
  });
  await store.seedTurnForTesting({
    turnId: "turn-1",
    sessionId: "session-1",
    queryHash: "a".repeat(64),
    redactedQueryPreview: "هل يوجد تقرير؟",
    turnContextStatus: "ready",
    selectedIntent: "default",
    selectedProfile: "default",
    retrievalEventId: "retrieval-1",
    auditEventId: "audit-1",
    memoryContext: "AGENTS.md:memory-1",
    latencyMs: 15,
    answerRef: "answer-1",
    closed: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  });
  return store;
}

describe("persistent memory evidence command", () => {
  test("renders saved evidence for a completed trace", async () => {
    const result = await runEvidenceCommand(
      ["--session", "session-1", "--turn", "turn-1"],
      { store: await buildStore() },
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Persistent Memory Evidence Report");
    expect(result.output).toContain("turn_id: turn-1");
    expect(result.output).not.toContain("missing evidence");
  });

  test("fails clearly when the turn is missing", async () => {
    const result = await runEvidenceCommand(
      ["--session", "session-1", "--turn", "missing-turn"],
      { store: await buildStore() },
    );

    expect(result.exitCode).toBe(1);
    expect(result.error).toMatch(/missing evidence/i);
    expect(result.output).toBe("");
  });

  test("requires both session and turn identifiers", async () => {
    const result = await runEvidenceCommand(["--session", "session-1"], {
      store: await buildStore(),
    });

    expect(result.exitCode).toBe(1);
    expect(result.error).toMatch(/--turn/i);
  });
});
