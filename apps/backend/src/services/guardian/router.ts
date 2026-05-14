/**
 * Guardian Runtime — Speed/Quality Router
 *
 * @description
 * يختار مسار السرعة/الجودة بناءً على تصنيف المهمة والخطر.
 * المسارات: fast | balanced | strict | background | restricted
 */

import { getRoutingForTaskType } from "./config";

import type { TaskClassification, SpeedMode } from "./types";

// ============================================================================
// نتيجة التوجيه
// ============================================================================

export interface RouteDecision {
  mode: SpeedMode;
  verifier: "light" | "medium" | "strong";
  maxRepairLoops: number;
  requireWeb: boolean | undefined;
  requireSources: boolean | undefined;
  requireTests: boolean | undefined;
  sandbox: boolean | undefined;
  preserveUserVoice: boolean | undefined;
  target: string;
  reason: string;
}

// ============================================================================
// الموجه
// ============================================================================

export class SpeedQualityRouter {
  route(classification: TaskClassification): RouteDecision {
    const baseRouting = getRoutingForTaskType(classification.taskType);

    // تعديل المسار بناءً على مستوى الخطر
    const adjusted = this.adjustForRiskLevel(
      baseRouting,
      classification.riskLevel,
    );

    // تعديل إضافي بناءً على الحاجات المكتشفة
    const final = this.adjustForNeeds(adjusted, classification);

    return {
      mode: final.mode,
      verifier: final.verifier,
      maxRepairLoops: final.maxRepairLoops,
      requireWeb: final.requireWeb,
      requireSources: final.requireSources,
      requireTests: final.requireTests,
      sandbox: final.sandbox,
      preserveUserVoice: final.preserveUserVoice,
      target: this.getTargetDescription(final.mode),
      reason: this.getReason(final.mode, classification),
    };
  }

  private adjustForRiskLevel(
    base: ReturnType<typeof getRoutingForTaskType>,
    riskLevel: string,
  ): ReturnType<typeof getRoutingForTaskType> {
    // إذا كان الخطر مرتفعاً → ارفع المسار على الأقل إلى strict
    if (riskLevel === "high" || riskLevel === "critical") {
      return {
        ...base,
        mode: base.mode === "restricted" ? "restricted" : "strict",
        verifier: "strong",
        maxRepairLoops: Math.max(base.maxRepairLoops, 2),
      };
    }

    // إذا كان الخطر متوسطاً → ارفع المسار على الأقل إلى balanced
    if (riskLevel === "medium") {
      return {
        ...base,
        mode: base.mode === "fast" ? "balanced" : base.mode,
        verifier: base.verifier === "light" ? "medium" : base.verifier,
      };
    }

    return base;
  }

  private adjustForNeeds(
    base: ReturnType<typeof getRoutingForTaskType>,
    classification: TaskClassification,
  ): ReturnType<typeof getRoutingForTaskType> {
    const adjusted = { ...base };

    // إذا احتاج بحث ويب → ربما strict
    if (classification.needsWeb && adjusted.mode === "fast") {
      adjusted.mode = "balanced";
      adjusted.requireWeb = true;
    }

    // إذا احتاج مصادر → اجعلها مطلوبة
    if (classification.needsSources) {
      adjusted.requireSources = true;
    }

    // إذا احتاج اختبارات → اجعلها مطلوبة
    if (classification.needsTests) {
      adjusted.requireTests = true;
      adjusted.sandbox = true;
    }

    // إذا كان sandbox مطلوباً → تأكد
    if (classification.needsSandbox) {
      adjusted.sandbox = true;
    }

    return adjusted;
  }

  private getTargetDescription(mode: SpeedMode): string {
    switch (mode) {
      case "fast":
        return "fastest_acceptable_answer";
      case "balanced":
        return "good_quality_without_heavy_latency";
      case "strict":
        return "high_accuracy";
      case "background":
        return "complete_result_without_user_burden";
      case "restricted":
        return "deny_or_draft_unless_pre_authorized";
      default:
        return "good_quality_without_heavy_latency";
    }
  }

  private getReason(
    mode: SpeedMode,
    classification: TaskClassification,
  ): string {
    const parts: string[] = [];
    parts.push(`نوع المهمة: ${classification.taskType}`);
    parts.push(`مستوى الخطر: ${classification.riskLevel}`);

    if (classification.needsWeb) parts.push("يتطلب بحثاً حديثاً");
    if (classification.needsSources) parts.push("يتطلب مصادر");
    if (classification.needsTests) parts.push("يتطلب اختبارات");
    if (classification.needsSandbox) parts.push("يتطلب sandbox");

    parts.push(`المسار المختار: ${mode}`);

    return parts.join(" | ");
  }
}

// ============================================================================
// Singleton
// ============================================================================

let routerInstance: SpeedQualityRouter | null = null;

export function getSpeedQualityRouter(): SpeedQualityRouter {
  routerInstance ??= new SpeedQualityRouter();
  return routerInstance;
}
