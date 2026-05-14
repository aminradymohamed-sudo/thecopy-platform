import { describe, expect, test } from "vitest";

import {
  buildEvidenceReport,
  findEvidenceReport,
  renderEvidenceReport,
} from "./evidence-report";
import { InMemoryAgentSessionStore } from "./session-store";
import type { AgentTurnRecord } from "./session-store";

function completeTurn(overrides: Partial<AgentTurnRecord> = {}): AgentTurnRecord {
  return {
    turnId: "turn-1",
    sessionId: "session-1",
    queryHash: "a".repeat(64),
    redactedQueryPreview: "هل يوجد تقرير إثبات؟",
    turnContextStatus: "ready",
    selectedIntent: "default",
    selectedProfile: "default",
    retrievalEventId: "retrieval-1",
    auditEventId: "audit-1",
    memoryContext: "AGENTS.md:memory-1",
    latencyMs: 25,
    answerRef: "answer-1",
    closed: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

describe("persistent memory evidence report", () => {
  test("renders a report from a saved completed turn trace", () => {
    const report = buildEvidenceReport(completeTurn());
    const rendered = renderEvidenceReport(report);

    expect(report.sourceTraceStatus).toBe("found");
    expect(report.missingFields).toEqual([]);
    expect(rendered).toContain("Persistent Memory Evidence Report");
    expect(rendered).toContain("turn_id: turn-1");
    expect(rendered).toContain("session_id: session-1");
    expect(rendered).toContain("retrieval_event_id: retrieval-1");
    expect(rendered).toContain("audit_event_id: audit-1");
  });

  test("fails when evidence is missing", async () => {
    const store = new InMemoryAgentSessionStore();

    await expect(
      findEvidenceReport({
        store,
        sessionId: "session-1",
        turnId: "missing-turn",
      }),
    ).rejects.toThrow(/missing evidence/i);
  });

  test("fails when a saved trace is incomplete", () => {
    expect(() =>
      buildEvidenceReport(
        completeTurn({
          answerRef: undefined,
          closed: false,
        }),
      ),
    ).toThrow(/answer_ref/i);
  });

  test("redacts sensitive values while preserving audit markers", () => {
    const report = buildEvidenceReport(
      completeTurn({
        redactedQueryPreview:
          "DATABASE_URL=postgresql://user:super-secret@localhost:5432/app",
        memoryContext:
          "Bearer abcdefghijklmnoqrstuvwxyz0123456789 audit-event",
      }),
    );
    const rendered = renderEvidenceReport(report);

    expect(report.redactionStatus).toBe("redacted");
    expect(rendered).toContain("retrieval_event_id: retrieval-1");
    expect(rendered).toContain("audit_event_id: audit-1");
    expect(rendered).not.toContain("super-secret");
    expect(rendered).not.toContain("abcdefghijklmnoqrstuvwxyz0123456789");
  });
});
