/**
 * Guardian Runtime — أنواع البيانات المشتركة
 *
 * @description
 * يحدد جميع الأنواع والواجهات المستخدمة عبر مكونات Guardian Runtime الثمانية.
 * هذا الملف هو العقد النوعي للنظام.
 */

// ============================================================================
// تصنيف المهمة والخطر
// ============================================================================

/** نوع المهمة التي يطلبها المستخدم */
export type TaskType =
  | "simple_question"
  | "research"
  | "analysis"
  | "code"
  | "file"
  | "creative_writing"
  | "destructive_action"
  | "external_action"
  | "comparison"
  | "unknown";

/** مستوى الخطر المرتبط بالمهمة */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/** مسار السرعة/الجودة المختار */
export type SpeedMode =
  | "fast"
  | "balanced"
  | "strict"
  | "background"
  | "restricted";

// ============================================================================
// نتيجة التصنيف
// ============================================================================

export interface TaskClassification {
  taskType: TaskType;
  riskLevel: RiskLevel;
  needsWeb: boolean;
  needsSources: boolean;
  needsTests: boolean;
  needsSandbox: boolean;
  examplesAreExclusive: boolean;
  ambiguityDetected: boolean;
  userIntentSummary: string;
}

// ============================================================================
// عقد المهمة الداخلية
// ============================================================================

export interface TaskContract {
  userRequest: string;
  originalInput: string;
  classification: TaskClassification;
  speedMode: SpeedMode;
  ambiguityPolicy: "broad_reasonable_assumption" | "ask_user";
  scopeExpansion: ScopeExpansionResult | null;
  assumptions: Assumption[];
  maxRepairLoops: number;
  verifierStrength: "light" | "medium" | "strong";
  permissions: PermissionSet;
  timestamp: number;
}

// ============================================================================
// توسيع النطاق
// ============================================================================

export interface ScopeExpansionResult {
  triggerTerms: string[];
  detectedExamples: string[];
  expandedScope: string[];
  expansionApplied: boolean;
  reason: string;
}

// ============================================================================
// الافتراضات
// ============================================================================

export interface Assumption {
  id: string;
  assumption: string;
  reason: string;
  reversible: boolean;
  disclosedToUser: boolean;
}

// ============================================================================
// سياسات الصلاحيات
// ============================================================================

export interface PermissionSet {
  readFiles: boolean;
  writeDrafts: boolean;
  editFilesInWorkspace: boolean;
  runTests: boolean;
  webSearch: boolean;
  sendEmail: boolean;
  deleteFiles: boolean;
  purchaseItems: boolean;
  modifyProductionDatabase: boolean;
  publishPublicly: boolean;
  executeCode: boolean;
}

export interface DangerousActionPolicy {
  delete: {
    default: "deny" | "produce_deletion_plan";
    backupRequired: boolean;
  };
  sendEmail: { default: "draft_only" | "allow" };
  publish: { default: "draft_only" | "allow" };
  buyOrPay: { default: "recommend_only" | "allow" };
  productionDatabase: { default: "migration_plan_only" | "allow" };
  localFileEdit: {
    default: "allowed_if_workspace" | "deny";
    backupRequired: boolean;
  };
  codeExecution: { default: "sandbox_only" | "allow" };
}

// ============================================================================
// سجل الأدلة
// ============================================================================

export interface EvidenceClaim {
  id: string;
  claim: string;
  source: string | undefined;
  sourceType:
    | "primary"
    | "secondary"
    | "model_output"
    | "user_input"
    | "test_log"
    | undefined;
  confidence: "high" | "medium" | "low" | "unverified";
  timestamp: number;
  validated: boolean;
}

export interface EvidenceLedger {
  claims: EvidenceClaim[];
  testLogs: TestLog[];
  sourcesChecked: string[];
}

export interface TestLog {
  id: string;
  testName: string;
  executed: boolean;
  passed: boolean | null;
  output: string;
  timestamp: number;
}

// ============================================================================
// التحقق والمراجعة
// ============================================================================

export type VerificationCheckName =
  | "scope_collapse"
  | "ambiguity_abuse"
  | "unsupported_claims"
  | "untested_completion_claims"
  | "sycophancy"
  | "source_laundering"
  | "unauthorized_action"
  | "premature_completion";

export interface VerificationFailure {
  check: VerificationCheckName;
  severity: "critical" | "major" | "minor";
  message: string;
  details?: Record<string, unknown>;
}

export interface Verdict {
  passed: boolean;
  failures: VerificationFailure[];
  warnings: string[];
  checksRun: VerificationCheckName[];
  timestamp: number;
}

// ============================================================================
// التصحيح التلقائي
// ============================================================================

export interface RepairInstruction {
  targetCheck: VerificationCheckName;
  instruction: string;
  priority: number;
}

export interface RepairResult {
  repairedDraft: GuardianDraft;
  repairCount: number;
  remainingFailures: VerificationFailure[];
  limitationsDisclosed: boolean;
}

// ============================================================================
// المسودة والنتيجة النهائية
// ============================================================================

export interface GuardianDraft {
  content: string;
  metadata: {
    sources: string[];
    testsRun: string[];
    assumptionsMade: string[];
    toolsUsed: string[];
    confidence: "high" | "medium" | "low";
  };
}

export interface FinalAnswer {
  content: string;
  sources: string[] | undefined;
  confidenceLimits: string[] | undefined;
  assumptions: string[] | undefined;
  internalDetailsExposed: boolean;
}

// ============================================================================
// إعدادات Guardian Runtime
// ============================================================================

export interface GuardianRuntimeConfig {
  defaultUserBurden: "zero" | "minimal" | "full";
  permissions: PermissionSet;
  dangerousActionPolicy: DangerousActionPolicy;
  routing: Record<
    string,
    {
      mode: SpeedMode;
      verifier: "light" | "medium" | "strong";
      maxRepairLoops: number;
      requireWeb?: boolean;
      requireSources?: boolean;
      requireTests?: boolean;
      sandbox?: boolean;
      preserveUserVoice?: boolean;
    }
  >;
  antiEvasionRules: {
    examplesAreNonExclusive: {
      triggerTerms: string[];
      action: "expand_scope";
    };
    ambiguityPolicy: {
      action: "assume_broad_reasonable_scope";
      askUserOnlyIf: "irreversible_or_high_harm";
    };
    verificationClaims: {
      forbiddenWithoutEvidence: string[];
    };
    sourcePolicy: {
      requireClaimSourceAlignment: boolean;
      rejectSourceLaundering: boolean;
    };
    actionPolicy: {
      toolCallsMustPassPolicyProxy: boolean;
      destructiveActionsDefault: "deny";
    };
    finalization: {
      requireVerifierPass: boolean;
      ifFail: "repair";
      ifStillFail: "disclose_limitations";
    };
  };
}

// ============================================================================
// نتيجة التشغيل الكاملة
// ============================================================================

export interface GuardianRuntimeResult {
  answer: FinalAnswer;
  contract: TaskContract;
  ledger: EvidenceLedger;
  verdict: Verdict;
  repairCount: number;
  executionTrace: ExecutionTraceEntry[];
  durationMs: number;
}

export interface ExecutionTraceEntry {
  phase: string;
  status: "started" | "completed" | "failed";
  timestamp: number;
  details: Record<string, unknown> | undefined;
}
