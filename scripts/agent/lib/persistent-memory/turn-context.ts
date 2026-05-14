import { promises as fsp } from "node:fs";

import {
  PERSISTENT_MEMORY_TURN_CONTEXT_PATH,
  ROUND_NOTES_PATH,
  SESSION_STATE_PATH,
} from "../constants";
import { fromRepoRoot, runGitCommand, sha256, writeTextIfChanged } from "../utils";
import { BGE_M3_EMBEDDING_MODEL_VERSION } from "./embeddings";
import { MemoryInjectionEnvelope, type InjectionEnvelopePayload } from "./injection";
import { createPersistentMemorySystem } from "./index";
import { FAST_TURN_CONTEXT_BUDGET_MS, elapsedMs, nowMs } from "./metrics";
import { openPersistentMemoryRuntime } from "./runtime";
import { MemorySecretScanner } from "./secrets";
import type { PersistentMemorySystem } from "./index";
import type { MemoryRetrievalHit, QueryIntent, SecretScanStatus } from "./types";

export interface TurnMemoryContext {
  turnContextStatus: "ready" | "degraded";
  status: "ready" | "degraded";
  reason?: string;
  queryHash: string;
  redactedQueryPreview: string;
  secretScanStatus: SecretScanStatus;
  selectedIntent: QueryIntent;
  selectedProfile: QueryIntent;
  retrievalEventId: string | null;
  auditEventId: string | null;
  latencyMs: number;
  degradationReason?: string;
  repairJobId?: string;
  routeDecision: TurnRouteDecision;
  envelope: InjectionEnvelopePayload;
}

export type TurnRoute = "fast" | "full";

export type TurnRouteReason =
  | "ordinary_ready_session"
  | "startup_missing"
  | "drift_detected"
  | "execution_task"
  | "verification_request"
  | "expired_session";

export type TurnDriftStatus = "no-drift" | "soft-drift" | "hard-drift";

export interface SessionReadinessInput {
  startupContextReady?: boolean;
  driftStatus?: TurnDriftStatus;
  expiresAt?: string | Date | null;
  intent?: QueryIntent;
  explicitVerification?: boolean;
  now?: Date;
}

export interface TurnRouteDecision {
  route: TurnRoute;
  reason: TurnRouteReason;
  sessionReady: boolean;
  driftStatus: TurnDriftStatus;
  expiresAt?: string;
}

export interface LiveStateSource {
  sourceRef: string;
  content: string;
}

export interface BuildTurnMemoryContextOptions {
  query: string;
  system?: PersistentMemorySystem;
  intent?: QueryIntent;
  topK?: number;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  liveStateSources?: LiveStateSource[];
  sessionReadiness?: SessionReadinessInput;
  latencyBudgetMs?: number;
}

export function classifyTurnMemoryIntent(query: string): QueryIntent {
  const normalized = query.toLowerCase();

  if (/كود|نفذ|صلح|عدل|اختبار|بناء/.test(normalized)) {
    return "execution_or_code_change";
  }
  if (/قرار|اتفق|اعتمد|نفذت|اكتمل|تم/.test(normalized)) {
    return "prior_decision_lookup";
  }
  if (/كرر|تكرار|نفس|قيد|ممنوع|لازم|احذر/.test(normalized)) {
    return "avoid_repetition_or_follow_constraints";
  }
  if (/فين|وصلت|حالة|دلوقتي|الآن|current/.test(normalized)) {
    return "current_state_lookup";
  }
  if (/كمل|استكمل|تابع|الجلسة|السابق/.test(normalized)) {
    return "continue_from_last_session";
  }
  if (/قيّم|راجع|خطة|تقييم/.test(normalized)) {
    return "plan_review_or_evaluation";
  }

  return "default";
}

function isOrdinaryFastRouteIntent(intent: QueryIntent): boolean {
  return intent !== "execution_or_code_change" && intent !== "plan_review_or_evaluation";
}

function isExpired(expiresAt: string | Date | null | undefined, now: Date): boolean {
  if (!expiresAt) {
    return false;
  }
  const expiryTime = expiresAt instanceof Date
    ? expiresAt.getTime()
    : new Date(expiresAt).getTime();
  return Number.isFinite(expiryTime) && expiryTime <= now.getTime();
}

export function decideTurnRoute(input: SessionReadinessInput): TurnRouteDecision {
  const driftStatus = input.driftStatus ?? "no-drift";
  const sessionReady = input.startupContextReady ?? true;
  const intent = input.intent ?? "default";
  const now = input.now ?? new Date();
  const expiresAt = input.expiresAt
    ? (input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt))
    : undefined;
  const base = {
    sessionReady,
    driftStatus,
    expiresAt: expiresAt?.toISOString(),
  };

  if (!sessionReady) {
    return { ...base, route: "full", reason: "startup_missing" };
  }
  if (driftStatus !== "no-drift") {
    return { ...base, route: "full", reason: "drift_detected" };
  }
  if (input.explicitVerification) {
    return { ...base, route: "full", reason: "verification_request" };
  }
  if (isExpired(input.expiresAt, now)) {
    return { ...base, route: "full", reason: "expired_session" };
  }
  if (!isOrdinaryFastRouteIntent(intent)) {
    return { ...base, route: "full", reason: "execution_task" };
  }

  return { ...base, route: "fast", reason: "ordinary_ready_session" };
}

function buildQueryPreview(query: string, clean: boolean): string {
  if (!clean) {
    return `redacted:${sha256(query).slice(0, 16)}`;
  }

  return query.replace(/\s+/g, " ").trim().slice(0, 160).trimEnd();
}

async function buildFallbackSystem(): Promise<PersistentMemorySystem> {
  const system = createPersistentMemorySystem();
  await system.ingestRawEvent({
    sourceRef: "AGENTS.md",
    eventType: "decision",
    content:
      "قرار حاكم عالي الثقة: عند تدهور بنية الذاكرة الدائمة يستخدم الوكيل أسرع سياق آمن متاح ولا يحقن خارج memory_context.",
    tags: ["startup", "fallback", "governing"],
  });
  await system.ingestRawEvent({
    sourceRef: ".repo-agent/STARTUP-PROTOCOL.md",
    eventType: "memory",
    content:
      "قيد تشغيل: يجب بناء سياق سؤال حي يتضمن query_hash وretrieval_event_id وaudit_event_id قبل الحكم التنفيذي.",
    tags: ["turn", "context", "governing"],
  });
  return system;
}

function isBroadOperationalSnapshot(hit: MemoryRetrievalHit): boolean {
  return (
    (hit.sourceRef === "output/round-notes.md" ||
      hit.sourceRef === "output/session-state.md") &&
    hit.content.length > 800
  );
}

function shouldUseLiveState(intent: QueryIntent): boolean {
  return intent === "current_state_lookup" || intent === "continue_from_last_session";
}

function stableLiveStateId(sourceRef: string): string {
  const slug = sourceRef
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `live-state-${slug}`;
}

async function readLiveStateSource(sourceRef: string): Promise<LiveStateSource | null> {
  try {
    const content = await fsp.readFile(fromRepoRoot(sourceRef), "utf8");
    return { sourceRef, content };
  } catch {
    return null;
  }
}

async function readDefaultLiveStateSources(): Promise<LiveStateSource[]> {
  const sources = await Promise.all(
    [SESSION_STATE_PATH, ROUND_NOTES_PATH].map((sourceRef) =>
      readLiveStateSource(sourceRef),
    ),
  );

  return [
    buildRuntimeGitStateSource(),
    ...sources.filter((source): source is LiveStateSource => source !== null),
  ];
}

function buildRuntimeGitStateSource(): LiveStateSource {
  const branch = runGitCommand(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown";
  const commit = runGitCommand(["rev-parse", "HEAD"]) || "unknown";
  const status = runGitCommand(["status", "--short"]);
  const changedFiles = status
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const workingTree = changedFiles.length === 0
    ? "نظيفة"
    : `غير نظيفة — ${changedFiles.length} ملف متغير`;

  return {
    sourceRef: ".repo-agent/live-runtime-state",
    content: [
      "لقطة حالة حية مولدة لحظة السؤال.",
      `الفرع الحالي: ${branch}`,
      `آخر commit: ${commit}`,
      `حالة working tree: ${workingTree}`,
      `عدد الملفات المتغيرة: ${changedFiles.length}`,
      "هذه اللقطة تسبق ملفات الحالة المولدة عند سؤال الحالة الحالية.",
    ].join("\n"),
  };
}

function compactLiveStateContent(sourceRef: string, content: string): string {
  const normalizedLines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const priorityPatterns = [
    /الفرع الحالي|current branch/i,
    /آخر commit|commit/i,
    /لقطة حالة حية|git الحية/i,
    /حالة working tree|working tree/i,
    /drift|انحراف/i,
    /الجاهزية|ready|readiness/i,
    /أهم الأعطال|الأعطال المفتوحة|open issues/i,
    /البنية المحلية|infra|podman|postgres|redis|weaviate|qdrant/i,
    /الذاكرة الدائمة|persistent memory|turn_context|memory_context/i,
  ];

  const priorityLines = normalizedLines.filter((line) =>
    priorityPatterns.some((pattern) => pattern.test(line)),
  );

  const headLines = normalizedLines.slice(0, sourceRef === ROUND_NOTES_PATH ? 24 : 80);
  const combined = Array.from(new Set([...priorityLines, ...headLines]));

  return combined.join("\n").replace(/\s+\n/g, "\n").trim().slice(0, 1800);
}

function buildLiveStateHit(
  source: LiveStateSource,
  scanner: MemorySecretScanner,
  rank: number,
): MemoryRetrievalHit | null {
  const compactContent = compactLiveStateContent(source.sourceRef, source.content);
  if (!compactContent) {
    return null;
  }

  const scan = scanner.scan(compactContent);
  if (!scan.clean) {
    return null;
  }

  const now = new Date().toISOString();
  const id = stableLiveStateId(source.sourceRef);

  return {
    id,
    candidateId: `${id}-candidate`,
    sourceRef: source.sourceRef,
    contentHash: sha256(compactContent),
    content: compactContent,
    memoryType: "state_snapshot",
    tags: ["live-state", "current"],
    trustLevel: "high",
    modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
    injectionProbability: 0,
    createdAt: now,
    updatedAt: now,
    score: 1_000 - rank,
    rank,
  };
}

function mergeLiveStateHits(
  liveHits: MemoryRetrievalHit[],
  retrievedHits: MemoryRetrievalHit[],
  topK: number,
): MemoryRetrievalHit[] {
  if (liveHits.length === 0) {
    return retrievedHits.slice(0, topK);
  }

  const liveSourceRefs = new Set(liveHits.map((hit) => hit.sourceRef));
  const filteredRetrieved = retrievedHits.filter(
    (hit) => !(liveSourceRefs.has(hit.sourceRef) && isBroadOperationalSnapshot(hit)),
  );

  return [...liveHits, ...filteredRetrieved]
    .slice(0, topK)
    .map((hit, index) => ({ ...hit, rank: index + 1 }));
}

function isAllowedForIntent(hit: MemoryRetrievalHit, intent: QueryIntent): boolean {
  if (hit.quarantined || hit.injectionProbability >= 0.7) {
    return false;
  }

  if (
    isBroadOperationalSnapshot(hit) &&
    intent !== "current_state_lookup" &&
    intent !== "continue_from_last_session"
  ) {
    return false;
  }

  if (intent === "prior_decision_lookup") {
    return hit.memoryType === "decision" || hit.memoryType === "memory";
  }

  if (intent === "avoid_repetition_or_follow_constraints") {
    return (
      hit.memoryType === "memory" ||
      hit.memoryType === "decision" ||
      hit.memoryType === "fact"
    );
  }

  return true;
}

export async function buildTurnMemoryContext(
  options: BuildTurnMemoryContextOptions,
): Promise<TurnMemoryContext> {
  const startedAt = nowMs();
  const query = options.query.trim();
  if (!query) {
    throw new Error("A current user question is required for live memory injection.");
  }

  const envelope = new MemoryInjectionEnvelope();
  const scanner = new MemorySecretScanner();
  const scan = scanner.scan(query);
  const queryHash = sha256(query);
  const redactedQueryPreview = buildQueryPreview(query, scan.clean);
  const retrievalQuery = scan.clean ? query : redactedQueryPreview;
  const env = options.env ?? process.env;
  const intent = options.intent ?? classifyTurnMemoryIntent(query);
  const routeDecision = decideTurnRoute({
    ...(options.sessionReadiness ?? {}),
    intent,
  });
  const topK = options.topK ?? 5;
  const latencyBudgetMs = options.latencyBudgetMs ?? FAST_TURN_CONTEXT_BUDGET_MS;
  const runtime = options.system ? null : await openPersistentMemoryRuntime(env);

  try {
    const system = options.system ?? runtime?.system ?? (await buildFallbackSystem());

    let result = await system.retrieve({ query: retrievalQuery, intent, topK });
    let hits = result.hits.filter((hit) => isAllowedForIntent(hit, intent));
    if (hits.length === 0 && !options.system) {
      const fallback = await buildFallbackSystem();
      result = await fallback.retrieve({ query: retrievalQuery, intent, topK });
      hits = result.hits.filter((hit) => isAllowedForIntent(hit, intent));
    }
    if (shouldUseLiveState(intent)) {
      const liveSources =
        options.liveStateSources ??
        (options.system ? [] : await readDefaultLiveStateSources());
      const liveHits = liveSources
        .map((source, index) => buildLiveStateHit(source, scanner, index + 1))
        .filter((hit): hit is MemoryRetrievalHit => hit !== null);

      hits = mergeLiveStateHits(liveHits, hits, topK);
    }
    const measuredLatencyMs = result.latencyMs || elapsedMs(startedAt);
    const latencyExceeded =
      routeDecision.route === "fast" && measuredLatencyMs > latencyBudgetMs;
    const runtimeDegraded = !options.system && runtime?.status === "degraded";
    const degraded = runtimeDegraded || latencyExceeded;
    const degradationReason = latencyExceeded
      ? "fast_route_latency_budget_exceeded"
      : runtimeDegraded
        ? runtime?.reason
        : undefined;

    return {
      turnContextStatus: degraded ? "degraded" : "ready",
      status: degraded ? "degraded" : "ready",
      reason: degradationReason,
      queryHash,
      redactedQueryPreview,
      secretScanStatus: scan.clean ? "clean" : "rejected",
      selectedIntent: intent,
      selectedProfile: result.selectedProfile,
      retrievalEventId: result.retrievalEventId,
      auditEventId: result.auditEventId,
      latencyMs: measuredLatencyMs,
      degradationReason,
      repairJobId: undefined,
      routeDecision,
      envelope: envelope.fromPersistentMemories("memory_context", hits),
    };
  } finally {
    await runtime?.close();
  }
}

export function renderTurnMemoryContext(context: TurnMemoryContext): string {
  const lines = [
    "# Persistent Memory Live Turn Context",
    "",
    `turn_context_status: ${context.turnContextStatus}`,
    `status: ${context.status}`,
    `zone: ${context.envelope.zone}`,
    `query_hash: ${context.queryHash}`,
    `redacted_query_preview: ${context.redactedQueryPreview}`,
    `secret_scan_status: ${context.secretScanStatus}`,
    `selected_intent: ${context.selectedIntent}`,
    `selected_profile: ${context.selectedProfile}`,
    `retrieval_event_id: ${context.retrievalEventId ?? "none"}`,
    `audit_event_id: ${context.auditEventId ?? "none"}`,
    `latency_ms: ${context.latencyMs}`,
    `route: ${context.routeDecision.route}`,
    `route_reason: ${context.routeDecision.reason}`,
  ];

  lines.push(
    `degradation_reason: ${context.degradationReason ?? context.reason ?? "none"}`,
    `repair_job_id: ${context.repairJobId ?? "none"}`,
  );

  lines.push("", "memory_context:", "");

  if (context.envelope.items.length === 0) {
    lines.push("- none");
  } else {
    for (const item of context.envelope.items) {
      lines.push(
        `- id: ${item.id}`,
        `  source_ref: ${item.sourceRef}`,
        `  trust_level: ${item.trustLevel}`,
        `  model_version: ${item.modelVersionId}`,
        `  text: ${formatTurnMemoryText(item.content)}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatTurnMemoryText(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 500).trimEnd();
}

export async function writeTurnMemoryContext(
  context: TurnMemoryContext,
  outputPath = PERSISTENT_MEMORY_TURN_CONTEXT_PATH,
): Promise<boolean> {
  return writeTextIfChanged(outputPath, renderTurnMemoryContext(context));
}
