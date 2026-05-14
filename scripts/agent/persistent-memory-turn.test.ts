import { describe, expect, test } from "vitest";

import {
  assertTurnContextFileContent,
  renderTurnCommandOutput,
  shouldPrintTurnContext,
} from "./persistent-memory-turn";
import type { TurnMemoryContext } from "./lib/persistent-memory/turn-context";

const context: TurnMemoryContext = {
  turnContextStatus: "ready",
  status: "ready",
  queryHash: "a".repeat(64),
  redactedQueryPreview: "وضع الحقن الالي ايه",
  secretScanStatus: "clean",
  selectedIntent: "current_state_lookup",
  selectedProfile: "current_state_lookup",
  retrievalEventId: "retrieval-event",
  auditEventId: "audit-event",
  latencyMs: 12,
  degradationReason: "none",
  repairJobId: "none",
  routeDecision: {
    route: "fast",
    reason: "ordinary_ready_session",
    sessionReady: true,
    driftStatus: "no-drift",
  },
  envelope: {
    zone: "memory_context",
    items: [
      {
        id: "memory-1",
        content: "تفاصيل ذاكرة طويلة يجب ألا تظهر افتراضيًا.",
        sourceRef: "output/session-state.md",
        trustLevel: "high",
        modelVersionId: "baai-bge-m3-local",
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
      },
    ],
  },
};

describe("persistent memory turn command output", () => {
  const forbiddenDefaultFragments = [
    "memory_context",
    "تفاصيل ذاكرة طويلة",
    "retrieval-event",
    "audit-event",
    "route:",
    "route_reason:",
    "status:",
    "intent:",
    "proof",
    "evidence",
  ];

  test("does not print the full memory context by default", () => {
    const output = renderTurnCommandOutput(context, []);

    expect(output).toContain("سياق السؤال الحي محفوظ");
    for (const fragment of forbiddenDefaultFragments) {
      expect(output).not.toContain(fragment);
    }
  });

  test("prints the full context only when explicitly requested", () => {
    const output = renderTurnCommandOutput(context, ["--print-context"]);

    expect(output).toContain("memory_context");
    expect(output).toContain("تفاصيل ذاكرة طويلة");
  });

  test("supports a completely quiet mode for background gates", () => {
    expect(renderTurnCommandOutput(context, ["--quiet"])).toBe("");
    expect(shouldPrintTurnContext(["--print-context"])).toBe(true);
    expect(shouldPrintTurnContext(["--verbose"])).toBe(true);
    expect(shouldPrintTurnContext([])).toBe(false);
  });

  test("does not keep explicit context output enabled for the next ordinary turn", () => {
    const explicitOutput = renderTurnCommandOutput(context, ["--print-context"]);
    const ordinaryOutput = renderTurnCommandOutput(context, []);

    expect(explicitOutput).toContain("memory_context");
    expect(ordinaryOutput).toContain("سياق السؤال الحي محفوظ");
    for (const fragment of forbiddenDefaultFragments) {
      expect(ordinaryOutput).not.toContain(fragment);
    }
  });

  test("verifies all required live context fields and rejects isolated missing-field content", () => {
    const validContent = [
      "turn_context_status: ready",
      "query_hash: abc",
      "selected_intent: default",
      "selected_profile: default",
      "retrieval_event_id: retrieval",
      "audit_event_id: audit",
      "latency_ms: 12",
      "degradation_reason: none",
      "repair_job_id: none",
      "memory_context:",
    ].join("\n");
    const invalidContent = validContent.replace("audit_event_id: audit\n", "");

    expect(assertTurnContextFileContent(validContent)).toEqual([]);
    expect(assertTurnContextFileContent(invalidContent)).toEqual(["audit_event_id:"]);
  });
});
