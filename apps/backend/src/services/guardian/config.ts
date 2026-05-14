/**
 * Guardian Runtime — الإعدادات والسياسات
 *
 * @description
 * يحدد سياسات النظام بما فيها الصلاحيات، المسارات، والقواعد المضادة للمراوغة.
 * هذه الإعدادات ثابتة وتُحمّل مرة واحدة عند بدء النظام.
 */

import type {
  GuardianRuntimeConfig,
  PermissionSet,
  DangerousActionPolicy,
} from "./types";

// ============================================================================
// الصلاحيات المسبقة الافتراضية
// ============================================================================

export const DEFAULT_PERMISSIONS: PermissionSet = {
  readFiles: true,
  writeDrafts: true,
  editFilesInWorkspace: true,
  runTests: true,
  webSearch: true,
  sendEmail: false,
  deleteFiles: false,
  purchaseItems: false,
  modifyProductionDatabase: false,
  publishPublicly: false,
  executeCode: true, // sandbox_only عبر policy proxy
};

// ============================================================================
// سياسة الأفعال الخطرة
// ============================================================================

export const DANGEROUS_ACTION_POLICY: DangerousActionPolicy = {
  delete: {
    default: "deny",
    backupRequired: true,
  },
  sendEmail: {
    default: "draft_only",
  },
  publish: {
    default: "draft_only",
  },
  buyOrPay: {
    default: "recommend_only",
  },
  productionDatabase: {
    default: "migration_plan_only",
  },
  localFileEdit: {
    default: "allowed_if_workspace",
    backupRequired: true,
  },
  codeExecution: {
    default: "sandbox_only",
  },
};

// ============================================================================
// إعدادات التوجيه حسب نوع المهمة
// ============================================================================

export const ROUTING_CONFIG: GuardianRuntimeConfig["routing"] = {
  simple_question: {
    mode: "fast",
    verifier: "light",
    maxRepairLoops: 1,
    requireWeb: false,
    requireSources: false,
    requireTests: false,
  },
  research: {
    mode: "strict",
    verifier: "strong",
    maxRepairLoops: 2,
    requireWeb: true,
    requireSources: true,
    requireTests: false,
  },
  analysis: {
    mode: "balanced",
    verifier: "medium",
    maxRepairLoops: 1,
    requireWeb: false,
    requireSources: false,
    requireTests: false,
  },
  code: {
    mode: "strict",
    verifier: "strong",
    maxRepairLoops: 3,
    requireWeb: false,
    requireSources: false,
    requireTests: true,
    sandbox: true,
  },
  file: {
    mode: "balanced",
    verifier: "medium",
    maxRepairLoops: 1,
    requireWeb: false,
    requireSources: false,
    requireTests: false,
  },
  creative_writing: {
    mode: "balanced",
    verifier: "medium",
    maxRepairLoops: 1,
    preserveUserVoice: true,
    requireWeb: false,
    requireSources: false,
    requireTests: false,
  },
  destructive_action: {
    mode: "restricted",
    verifier: "strong",
    maxRepairLoops: 0,
    requireWeb: false,
    requireSources: false,
    requireTests: false,
  },
  external_action: {
    mode: "restricted",
    verifier: "strong",
    maxRepairLoops: 0,
    requireWeb: false,
    requireSources: false,
    requireTests: false,
  },
  comparison: {
    mode: "balanced",
    verifier: "medium",
    maxRepairLoops: 1,
    requireWeb: false,
    requireSources: true,
    requireTests: false,
  },
  unknown: {
    mode: "balanced",
    verifier: "medium",
    maxRepairLoops: 1,
    requireWeb: false,
    requireSources: false,
    requireTests: false,
  },
};

// ============================================================================
// القواعد المضادة للمراوغة
// ============================================================================

export const ANTI_EVASION_RULES: GuardianRuntimeConfig["antiEvasionRules"] = {
  examplesAreNonExclusive: {
    triggerTerms: [
      "مثل",
      "على سبيل المثال",
      "كـ",
      "منها",
      "including",
      "e.g.",
      "such as",
      "for example",
      "e.g",
    ],
    action: "expand_scope",
  },
  ambiguityPolicy: {
    action: "assume_broad_reasonable_scope",
    askUserOnlyIf: "irreversible_or_high_harm",
  },
  verificationClaims: {
    forbiddenWithoutEvidence: [
      "اختبرت",
      "تحققت",
      "تأكدت",
      "شامل",
      "نهائي",
      "يعمل",
      "tested",
      "verified",
      "confirmed",
      "comprehensive",
      "final",
      "works",
    ],
  },
  sourcePolicy: {
    requireClaimSourceAlignment: true,
    rejectSourceLaundering: true,
  },
  actionPolicy: {
    toolCallsMustPassPolicyProxy: true,
    destructiveActionsDefault: "deny",
  },
  finalization: {
    requireVerifierPass: true,
    ifFail: "repair",
    ifStillFail: "disclose_limitations",
  },
};

// ============================================================================
// الإعدادات الكاملة
// ============================================================================

export const GUARDIAN_RUNTIME_CONFIG: GuardianRuntimeConfig = {
  defaultUserBurden: "zero",
  permissions: DEFAULT_PERMISSIONS,
  dangerousActionPolicy: DANGEROUS_ACTION_POLICY,
  routing: ROUTING_CONFIG,
  antiEvasionRules: ANTI_EVASION_RULES,
};

// ============================================================================
// دوال مساعدة
// ============================================================================

/**
 * يسترجع إعدادات التوجيه لنوع مهمة معين
 */
export function getRoutingForTaskType(
  taskType: string,
): NonNullable<GuardianRuntimeConfig["routing"][string]> {
  return (
    ROUTING_CONFIG[taskType] ??
    ROUTING_CONFIG["unknown"] ?? {
      mode: "balanced",
      verifier: "medium",
      maxRepairLoops: 1,
    }
  );
}

/**
 * يتحقق ما إذا كان فعلاً معيناً مسموحاً به
 */
export function isActionPermitted(
  action: keyof DangerousActionPolicy,
  permissions: PermissionSet,
): boolean {
  switch (action) {
    case "delete":
      return permissions.deleteFiles;
    case "sendEmail":
      return permissions.sendEmail;
    case "publish":
      return permissions.publishPublicly;
    case "buyOrPay":
      return permissions.purchaseItems;
    case "productionDatabase":
      return permissions.modifyProductionDatabase;
    case "localFileEdit":
      return permissions.editFilesInWorkspace;
    case "codeExecution":
      return permissions.executeCode;
    default:
      return false;
  }
}
