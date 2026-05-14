import { randomUUID } from "node:crypto";

import { sha256 } from "../utils";
import { MemorySecretScanner } from "./secrets";
import {
  missingReportableTurnFields,
  type AgentSessionStore,
  type AgentTurnRecord,
} from "./session-store";

export interface EvidenceReport {
  reportId: string;
  turnId: string;
  sessionId: string;
  sourceTraceStatus: "found";
  evidenceSummary: string;
  missingFields: string[];
  redactionStatus: "clean" | "redacted";
  queryHash: string;
  selectedIntent: string;
  selectedProfile: string;
  retrievalEventId: string;
  auditEventId: string;
  latencyMs: number;
  answerRef: string;
  createdAt: string;
}

export interface FindEvidenceReportInput {
  store: AgentSessionStore;
  sessionId: string;
  turnId: string;
}

function redactSensitiveValue(
  scanner: MemorySecretScanner,
  value: string,
): { value: string; redacted: boolean } {
  const scan = scanner.scan(value);
  if (scan.clean) {
    return { value, redacted: false };
  }

  return {
    value: `redacted:${sha256(value).slice(0, 16)}`,
    redacted: true,
  };
}

export function buildEvidenceReport(
  turn: AgentTurnRecord,
  now = new Date(),
): EvidenceReport {
  const missingFields = missingReportableTurnFields(turn);
  if (missingFields.length > 0) {
    throw new Error(
      `Incomplete evidence trace; missing fields: ${missingFields.join(", ")}`,
    );
  }

  const scanner = new MemorySecretScanner();
  const queryPreview = redactSensitiveValue(
    scanner,
    turn.redactedQueryPreview ?? "",
  );
  const memoryContext = redactSensitiveValue(scanner, turn.memoryContext ?? "");
  const answerRef = redactSensitiveValue(scanner, turn.answerRef ?? "");
  const redacted =
    queryPreview.redacted || memoryContext.redacted || answerRef.redacted;

  return {
    reportId: randomUUID(),
    turnId: turn.turnId,
    sessionId: turn.sessionId,
    sourceTraceStatus: "found",
    evidenceSummary: [
      `query_preview=${queryPreview.value}`,
      `memory_context=${memoryContext.value}`,
      `answer_ref=${answerRef.value}`,
    ].join("\n"),
    missingFields: [],
    redactionStatus: redacted ? "redacted" : "clean",
    queryHash: turn.queryHash!,
    selectedIntent: turn.selectedIntent!,
    selectedProfile: turn.selectedProfile!,
    retrievalEventId: turn.retrievalEventId!,
    auditEventId: turn.auditEventId!,
    latencyMs: turn.latencyMs!,
    answerRef: answerRef.value,
    createdAt: now.toISOString(),
  };
}

export async function findEvidenceReport(
  input: FindEvidenceReportInput,
): Promise<EvidenceReport> {
  const turn = await input.store.getTurnContextRecord(input.turnId);
  if (!turn || turn.sessionId !== input.sessionId) {
    throw new Error(
      `Missing evidence trace for session ${input.sessionId} and turn ${input.turnId}.`,
    );
  }

  return buildEvidenceReport(turn);
}

export function renderEvidenceReport(report: EvidenceReport): string {
  return [
    "# Persistent Memory Evidence Report",
    "",
    `report_id: ${report.reportId}`,
    `turn_id: ${report.turnId}`,
    `session_id: ${report.sessionId}`,
    `source_trace_status: ${report.sourceTraceStatus}`,
    `redaction_status: ${report.redactionStatus}`,
    `query_hash: ${report.queryHash}`,
    `selected_intent: ${report.selectedIntent}`,
    `selected_profile: ${report.selectedProfile}`,
    `retrieval_event_id: ${report.retrievalEventId}`,
    `audit_event_id: ${report.auditEventId}`,
    `latency_ms: ${report.latencyMs}`,
    `created_at: ${report.createdAt}`,
    "",
    "## Evidence Summary",
    "",
    report.evidenceSummary,
    "",
    "## Missing Fields",
    "",
    report.missingFields.length === 0
      ? "- none"
      : report.missingFields.map((field) => `- ${field}`).join("\n"),
    "",
  ].join("\n");
}
