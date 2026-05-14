/**
 * Guardian Runtime — Finalizer
 *
 * @description
 * يجهز الإجابة النهائية للمستخدم بإخفاء السجلات الداخلية
 * وعرض النتيجة + المصادر + حدود الثقة فقط.
 */

import { EvidenceLedger } from "./evidence-ledger";

import type {
  GuardianDraft,
  Verdict,
  TaskContract,
  FinalAnswer,
} from "./types";

// ============================================================================
// المُجهز النهائي
// ============================================================================

export class Finalizer {
  finalize(
    draft: GuardianDraft,
    verdict: Verdict,
    contract: TaskContract,
    ledger: EvidenceLedger,
    options: {
      exposeInternalDetails?: boolean;
      includeAssumptions?: boolean;
      includeConfidenceLimits?: boolean;
    } = {},
  ): FinalAnswer {
    const {
      exposeInternalDetails = false,
      includeAssumptions = false,
      includeConfidenceLimits = true,
    } = options;

    let content = draft.content;
    const sources = draft.metadata.sources;
    const assumptions: string[] = [];
    const confidenceLimits: string[] = [];

    // 1. إضافة افتراضات إذا طُلبت
    if (includeAssumptions && contract.assumptions.length > 0) {
      assumptions.push(...contract.assumptions.map((a) => a.assumption));
    }

    // 2. إضافة حدود الثقة
    if (includeConfidenceLimits) {
      confidenceLimits.push(
        ...this.buildConfidenceLimits(verdict, ledger, contract),
      );
    }

    // 3. إضافة تفاصيل داخلية فقط إذا طُلبت صراحةً
    if (exposeInternalDetails) {
      content += this.buildInternalDetails(verdict, ledger);
    }

    // 4. إذا فشل الـ verifier وتم الكشف عن الحدود
    if (!verdict.passed && verdict.failures.length > 0) {
      const undisclosedFailures = verdict.failures.filter(
        (f) => f.severity === "critical" || f.severity === "major",
      );
      if (undisclosedFailures.length > 0) {
        confidenceLimits.push(
          "حدود الثقة: بعض الأجزاء لم تمر بالتحقق الكامل. تم الإفصاح عن التحذيرات أعلاه.",
        );
      }
    }

    return {
      content,
      sources: sources.length > 0 ? sources : undefined,
      assumptions: assumptions.length > 0 ? assumptions : undefined,
      confidenceLimits:
        confidenceLimits.length > 0 ? confidenceLimits : undefined,
      internalDetailsExposed: exposeInternalDetails,
    };
  }

  /**
   * يبني نص حدود الثقة
   */
  private buildConfidenceLimits(
    verdict: Verdict,
    ledger: EvidenceLedger,
    contract: TaskContract,
  ): string[] {
    const limits: string[] = [];

    // حدود بناءً على نتيجة التحقق
    if (!verdict.passed) {
      const criticalCount = verdict.failures.filter(
        (f) => f.severity === "critical",
      ).length;
      if (criticalCount > 0) {
        limits.push("منخفضة: تم اكتشاف أخطاء حرجة تستدعي مراجعة يدوية.");
      } else {
        limits.push("متوسطة: الرد يحتوي على تحذيرات غير حرجة.");
      }
    } else if (verdict.warnings.length > 0) {
      limits.push("متوسطة-عالية: الرد مقبول مع بعض التحذيرات الطفيفة.");
    } else {
      limits.push("عالية: الرد مراجعة آلياً بدون ملاحظات حرجة.");
    }

    // حدود بناءً على المصادر
    const { aligned, unaligned } = ledger.validateSources();
    if (unaligned.length > 0) {
      limits.push(
        `متوسطة في المصادر: ${unaligned.length} ادعاءات بدون مصادر مباشرة.`,
      );
    }
    if (aligned.length > 0) {
      limits.push(
        `عالية في المصادر المدعومة: ${aligned.length} ادعاءات موثقة.`,
      );
    }

    // حدود بناءً على نوع المهمة
    if (contract.classification.taskType === "research") {
      limits.push(
        "متوسطة في المعلومات الحديثة: تعتمد على تواريخ البحث المتاحة.",
      );
    }

    if (
      contract.classification.taskType === "code" &&
      !ledger.hasTestEvidence()
    ) {
      limits.push("منخفضة في صحة الكود: لم يُختبر فعلياً في بيئة تنفيذ.");
    }

    return limits;
  }

  /**
   * يبني تفاصيل داخلية (للتقارير التقنية فقط)
   */
  private buildInternalDetails(
    verdict: Verdict,
    ledger: EvidenceLedger,
  ): string {
    const lines: string[] = ["\n\n--- تفاصيل داخلية (Guardian Runtime) ---"];

    lines.push(`التحقق: ${verdict.passed ? "نجح" : "فشل"}`);
    lines.push(`الفحوصات المُجريَة: ${verdict.checksRun.join(", ")}`);

    if (verdict.failures.length > 0) {
      lines.push("\nالأخطاء:");
      for (const failure of verdict.failures) {
        lines.push(
          `- [${failure.severity}] ${failure.check}: ${failure.message}`,
        );
      }
    }

    if (verdict.warnings.length > 0) {
      lines.push("\nالتحذيرات:");
      for (const warning of verdict.warnings) {
        lines.push(`- ${warning}`);
      }
    }

    const { aligned, unaligned } = ledger.validateSources();
    lines.push(`\nالادعاءات الموثقة: ${aligned.length}`);
    lines.push(`الادعاءات غير الموثقة: ${unaligned.length}`);
    lines.push(`سجلات الاختبار: ${ledger.getTestLogs().length}`);

    lines.push("--- نهاية التفاصيل الداخلية ---");

    return lines.join("\n");
  }
}

// ============================================================================
// Singleton
// ============================================================================

let finalizerInstance: Finalizer | null = null;

export function getFinalizer(): Finalizer {
  finalizerInstance ??= new Finalizer();
  return finalizerInstance;
}
