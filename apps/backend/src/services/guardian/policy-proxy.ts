/**
 * Guardian Runtime — Tool Policy Proxy
 *
 * @description
 * يتحكم في استدعاء الأدوات والأفعال الخارجية وفق سياسات الصلاحيات المحددة مسبقاً.
 * كل فعل يمر عبر proxy ويتم تسجيله.
 */

import {
  DEFAULT_PERMISSIONS,
  DANGEROUS_ACTION_POLICY,
  isActionPermitted,
} from "./config";

import type { PermissionSet, DangerousActionPolicy } from "./types";

// ============================================================================
// نتيجة التحقق من السياسة
// ============================================================================

export interface PolicyCheckResult {
  allowed: boolean;
  action:
    | "allow"
    | "deny"
    | "draft_only"
    | "recommend_only"
    | "migration_plan_only"
    | "sandbox_only"
    | "produce_deletion_plan";
  reason: string;
  fallback?: string;
  requiresBackup?: boolean;
}

export interface ToolCallRecord {
  toolName: string;
  action: string;
  timestamp: number;
  policyResult: PolicyCheckResult;
  argsHash: string;
}

// ============================================================================
// البروكسي
// ============================================================================

export class ToolPolicyProxy {
  private permissions: PermissionSet;
  private dangerousPolicy: DangerousActionPolicy;
  private callLog: ToolCallRecord[] = [];

  constructor(
    permissions: PermissionSet = DEFAULT_PERMISSIONS,
    dangerousPolicy: DangerousActionPolicy = DANGEROUS_ACTION_POLICY,
  ) {
    this.permissions = permissions;
    this.dangerousPolicy = dangerousPolicy;
  }

  /**
   يفحص ما إذا كان استدعاء أداة معين مسموحاً به
   */
  checkToolCall(toolName: string, action: string): PolicyCheckResult {
    const normalizedTool = toolName.toLowerCase();
    const normalizedAction = action.toLowerCase();

    // 1. تحديد نوع الفعل الخطرة
    const dangerType = this.classifyDangerousAction(
      normalizedTool,
      normalizedAction,
    );

    if (dangerType) {
      return this.evaluateDangerousAction(dangerType);
    }

    // 2. فحص الصلاحيات العامة
    const permitted = this.checkGeneralPermission(
      normalizedTool,
      normalizedAction,
    );
    if (!permitted) {
      return {
        allowed: false,
        action: "deny",
        reason: `الأداة '${toolName}' مع الفعل '${action}' غير مسموح به وفق الصلاحيات المحددة`,
      };
    }

    // 3. مسموح
    const result: PolicyCheckResult = {
      allowed: true,
      action: "allow",
      reason: `الأداة '${toolName}' مع الفعل '${action}' مسموح به`,
    };

    this.logCall(toolName, action, result);
    return result;
  }

  /**
   * يفحص فعل محدد (مفيد للأفعال المستخرجة من النصوص)
   */
  checkAction(actionType: keyof DangerousActionPolicy): PolicyCheckResult {
    return this.evaluateDangerousAction(actionType);
  }

  /**
   * يسترجع سجل الاستدعاءات
   */
  getCallLog(): ToolCallRecord[] {
    return [...this.callLog];
  }

  /**
   * يمسح السجل
   */
  clearLog(): void {
    this.callLog = [];
  }

  // ============================================================================
  // دوال داخلية
  // ============================================================================

  private classifyDangerousAction(
    toolName: string,
    action: string,
  ): keyof DangerousActionPolicy | null {
    const combined = `${toolName} ${action}`;

    if (/delete|remove|erase|destroy|unlink|rmdir/.test(combined)) {
      return "delete";
    }
    if (/email|mail|send.*message|notify/.test(combined)) {
      return "sendEmail";
    }
    if (/publish|deploy|release|public/.test(combined)) {
      return "publish";
    }
    if (/buy|purchase|pay|order|checkout/.test(combined)) {
      return "buyOrPay";
    }
    if (/database|db|sql|migration|schema/.test(combined)) {
      return "productionDatabase";
    }
    if (/edit|write|modify|patch|update.*file/.test(combined)) {
      return "localFileEdit";
    }
    if (/execute|run|exec|spawn|eval|shell/.test(combined)) {
      return "codeExecution";
    }

    return null;
  }

  private evaluateDangerousAction(
    dangerType: keyof DangerousActionPolicy,
  ): PolicyCheckResult {
    const policy = this.dangerousPolicy[dangerType];
    const permitted = isActionPermitted(dangerType, this.permissions);

    // إذا كان الفعل مسموحاً مسبقاً ولا يوجد حظر صريح
    if (permitted && policy.default !== "deny") {
      const result: PolicyCheckResult = {
        allowed: true,
        action: "allow",
        reason: `الفعل '${dangerType}' مسموح به صراحةً في الإعدادات`,
        requiresBackup:
          "backupRequired" in policy ? policy.backupRequired : false,
      };
      this.logCall(dangerType, "direct", result);
      return result;
    }

    // تطبيق السياسة الافتراضية
    switch (policy.default) {
      case "deny":
        return {
          allowed: false,
          action: "deny",
          reason: `الفعل '${dangerType}' مرفوض تلقائياً وفق سياسة الحماية`,
          fallback: `استخدم '${dangerType}' عبر قناة مصرح بها أو اطلب موافقة صريحة`,
        };
      case "draft_only":
        return {
          allowed: true,
          action: "draft_only",
          reason: `الفعل '${dangerType}' مسموح به كمسودة فقط دون تنفيذ فعلي`,
        };
      case "recommend_only":
        return {
          allowed: true,
          action: "recommend_only",
          reason: `الفعل '${dangerType}' مسموح به كتوصية فقط دون تنفيذ`,
        };
      case "migration_plan_only":
        return {
          allowed: true,
          action: "migration_plan_only",
          reason: `الفعل '${dangerType}' مسموح به كخطة migration غير منفذة`,
        };
      case "sandbox_only":
        return {
          allowed: true,
          action: "sandbox_only",
          reason: `الفعل '${dangerType}' مسموح به داخل بيئة sandbox معزولة فقط`,
        };
      case "produce_deletion_plan":
        return {
          allowed: true,
          action: "produce_deletion_plan",
          reason: `الفعل '${dangerType}' مسموح به كخطة حذف مع نسخ احتياطية`,
          requiresBackup: true,
        };
      default:
        return {
          allowed: false,
          action: "deny",
          reason: `سياسة غير معروفة للفعل '${dangerType}'`,
        };
    }
  }

  private checkGeneralPermission(_toolName: string, action: string): boolean {
    // فحص عام للأدوات بناءً على الأسماء
    if (/read|get|fetch|retrieve|list/.test(action)) {
      return this.permissions.readFiles;
    }
    if (/write|create|save|store/.test(action)) {
      return (
        this.permissions.writeDrafts || this.permissions.editFilesInWorkspace
      );
    }
    if (/test|run.*test|validate/.test(action)) {
      return this.permissions.runTests;
    }
    if (/search|web|internet|browse/.test(action)) {
      return this.permissions.webSearch;
    }

    // افتراضياً: مسموح للأدوات غير الخطرة
    return true;
  }

  private logCall(
    toolName: string,
    action: string,
    policyResult: PolicyCheckResult,
  ): void {
    this.callLog.push({
      toolName,
      action,
      timestamp: Date.now(),
      policyResult,
      argsHash: "", // يمكن ملؤها لاحقاً إذا لزم
    });
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createToolPolicyProxy(
  permissions?: PermissionSet,
): ToolPolicyProxy {
  return new ToolPolicyProxy(permissions);
}
