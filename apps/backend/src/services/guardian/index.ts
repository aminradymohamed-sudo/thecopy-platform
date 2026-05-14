/**
 * Guardian Runtime — الواجهة الرئيسية
 *
 * @description
 * يصدر جميع مكونات Guardian Runtime للاستخدام الخارجي.
 */

// الأنواع
export type {
  TaskClassification,
  TaskType,
  RiskLevel,
  SpeedMode,
  TaskContract,
  ScopeExpansionResult,
  Assumption,
  PermissionSet,
  DangerousActionPolicy,
  EvidenceClaim,
  EvidenceLedger,
  TestLog,
  Verdict,
  VerificationFailure,
  VerificationCheckName,
  RepairInstruction,
  RepairResult,
  GuardianDraft,
  FinalAnswer,
  GuardianRuntimeConfig,
  GuardianRuntimeResult,
  ExecutionTraceEntry,
} from "./types";

// الإعدادات
export {
  GUARDIAN_RUNTIME_CONFIG,
  DEFAULT_PERMISSIONS,
  DANGEROUS_ACTION_POLICY,
  ROUTING_CONFIG,
  ANTI_EVASION_RULES,
  getRoutingForTaskType,
  isActionPermitted,
} from "./config";

// المكونات
export { TaskClassifier, getTaskClassifier } from "./task-classifier";
export { ScopeController, getScopeController } from "./scope-controller";
export { AssumptionEngine, getAssumptionEngine } from "./assumption-engine";
export { SpeedQualityRouter, getSpeedQualityRouter } from "./router";
export { ToolPolicyProxy, createToolPolicyProxy } from "./policy-proxy";
export {
  EvidenceLedger as EvidenceLedgerService,
  createEvidenceLedger,
} from "./evidence-ledger";
export { AutoVerifier, getAutoVerifier } from "./verifier";
export { RepairLoop, getRepairLoop } from "./repair-loop";
export { Finalizer, getFinalizer } from "./finalizer";

// المحرك الرئيسي
export { GuardianRuntime, getGuardianRuntime } from "./guardian-runtime";
export type { GuardianRuntimeInput } from "./guardian-runtime";
