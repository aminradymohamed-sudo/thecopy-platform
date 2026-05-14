/**
 * Guardian Runtime — Repair Loop
 *
 * @description
 * يصحح المخرجات تلقائياً عند فشل الـ Verifier.
 * يولد تعليمات تصحيح ويعيد تشغيل التنفيذ حتى max_repair_loops.
 */

import type {
  GuardianDraft,
  TaskContract,
  Verdict,
  VerificationFailure,
  RepairResult,
  RepairInstruction,
} from "./types";

// ============================================================================
// حلقة الإصلاح
// ============================================================================

export class RepairLoop {
  /**
   * يولد تعليمات إصلاح من فشل التحقق
   */
  generateRepairInstructions(
    failures: VerificationFailure[],
  ): RepairInstruction[] {
    const instructions: RepairInstruction[] = [];

    for (const failure of failures) {
      const instruction = this.mapFailureToInstruction(failure);
      if (instruction) {
        instructions.push(instruction);
      }
    }

    // رتب حسب الأولوية
    return instructions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * يصلح المسودة بناءً على تعليمات الإصلاح
   */
  applyRepair(
    draft: GuardianDraft,
    instructions: RepairInstruction[],
  ): GuardianDraft {
    let repairedContent = draft.content;
    const addedMetadata = { ...draft.metadata, warnings: [] as string[] };

    for (const instruction of instructions) {
      switch (instruction.targetCheck) {
        case "scope_collapse":
          repairedContent = this.repairScopeCollapse(repairedContent);
          addedMetadata.warnings.push("تم توسيع النطاق بعد التصحيح");
          break;
        case "unsupported_claims":
          repairedContent = this.repairUnsupportedClaims(repairedContent);
          break;
        case "untested_completion_claims":
          repairedContent = this.repairUntestedClaims(repairedContent);
          break;
        case "sycophancy":
          repairedContent = this.repairSycophancy(repairedContent);
          break;
        case "source_laundering":
          repairedContent = this.repairSourceLaundering(repairedContent);
          break;
        case "ambiguity_abuse":
          repairedContent = this.repairAmbiguityAbuse(repairedContent);
          break;
        case "premature_completion":
          repairedContent = this.repairPrematureCompletion(repairedContent);
          break;
        case "unauthorized_action":
          repairedContent = this.repairUnauthorizedAction(repairedContent);
          break;
        default:
          break;
      }
    }

    return {
      content: repairedContent,
      metadata: addedMetadata,
    };
  }

  /**
   * ينفذ حلقة الإصلاح الكاملة
   */
  async executeRepair(
    draft: GuardianDraft,
    verdict: Verdict,
    contract: TaskContract,
    executor: (instructions: string[]) => Promise<GuardianDraft>,
  ): Promise<RepairResult> {
    let currentDraft = draft;
    let repairCount = 0;
    const maxRepairs = contract.maxRepairLoops;

    while (repairCount < maxRepairs && !verdict.passed) {
      const instructions = this.generateRepairInstructions(verdict.failures);
      if (instructions.length === 0) break;

      const instructionTexts = instructions.map((i) => i.instruction);
      currentDraft = await executor(instructionTexts);
      repairCount++;

      // ملاحظة: في التنفيذ الكامل، يجب إعادة التحقق هنا
      // لكن هذا يتطلب إعادة استدعاء verifier من الخارج
      break; // نخرج بعد إصلاح واحد لأن الـ verifier سيُعاد خارجياً
    }

    const limitationsDisclosed = repairCount >= maxRepairs && !verdict.passed;

    return {
      repairedDraft: currentDraft,
      repairCount,
      remainingFailures: verdict.passed ? [] : verdict.failures,
      limitationsDisclosed,
    };
  }

  // ============================================================================
  // تعيين الفشل إلى تعليمات
  // ============================================================================

  private mapFailureToInstruction(
    failure: VerificationFailure,
  ): RepairInstruction | null {
    switch (failure.check) {
      case "scope_collapse":
        return {
          targetCheck: "scope_collapse",
          instruction:
            "وسّع النطاق. لا تكتفِ بأسماء المستخدم أو الأمثلة المذكورة. أضف عناصر إضافية ذات صلة.",
          priority: 1,
        };
      case "unsupported_claims":
        return {
          targetCheck: "unsupported_claims",
          instruction:
            "أزل الادعاءات غير المدعومة أو استبدلها بصياغة توضح عدم التحقق. تجنب كلمات 'اختبرت' أو 'تحققت' أو 'شامل' بدون دليل.",
          priority: 1,
        };
      case "untested_completion_claims":
        return {
          targetCheck: "untested_completion_claims",
          instruction:
            "إما شغّل الاختبار فعلياً أو غيّر الصياغة إلى 'لم أستطع اختبار هذا فعلياً'.",
          priority: 1,
        };
      case "sycophancy":
        return {
          targetCheck: "sycophancy",
          instruction:
            "أعد صياغة الرد بصيغة نقدية: 'الفرضية مفهومة، لكن التحقق يبين...'. لا توافق على فرضية المستخدم دون تمحيص.",
          priority: 2,
        };
      case "source_laundering":
        return {
          targetCheck: "source_laundering",
          instruction:
            "أضف مصادر أولية تثبت الادعاءات. إذا لم تتوفر مصادر أولية، خفف الادعاء أو أزل المصادر غير الداعمة.",
          priority: 1,
        };
      case "ambiguity_abuse":
        return {
          targetCheck: "ambiguity_abuse",
          instruction:
            "قدم إجابة محددة بناءً على أوسع افتراض معقول. لا تتجنب الإجابة بحجة الغموض.",
          priority: 2,
        };
      case "premature_completion":
        return {
          targetCheck: "premature_completion",
          instruction:
            "عمّق الرد بتفاصيل ملموسة. تجنب العبارات الشكلية مثل 'يعتمد على احتياجاتك' كختام.",
          priority: 3,
        };
      case "unauthorized_action":
        return {
          targetCheck: "unauthorized_action",
          instruction:
            "لا تنفذ الفعل المطلوب. إنشئ مسودة أو خطة فقط. أضف تحذيراً واضحاً.",
          priority: 1,
        };
      default:
        return null;
    }
  }

  // ============================================================================
  // دوال الإصلاح النصية
  // ============================================================================

  private repairScopeCollapse(content: string): string {
    // إضافة ملاحظة توضح أن الأمثلة غير حصرية
    if (!content.includes("مثال")) {
      return (
        content +
        "\n\n[ملاحظة: الأمثلة المذكورة غير حصرية وهناك خيارات إضافية متاحة.]"
      );
    }
    return content;
  }

  private repairUnsupportedClaims(content: string): string {
    const forbiddenTerms = [
      "اختبرت",
      "تحققت",
      "تأكدت",
      "شامل",
      "نهائي",
      "tested",
      "verified",
      "confirmed",
      "comprehensive",
      "final",
    ];

    let repaired = content;
    for (const term of forbiddenTerms) {
      const regex = new RegExp(term, "gi");
      repaired = repaired.replace(regex, (match) => `[غير مؤكد: ${match}]`);
    }

    return repaired;
  }

  private repairUntestedClaims(content: string): string {
    const untestedPatterns = [
      /تم اختباره ويعمل/,
      /works correctly/,
      /tested and verified/,
      /يعمل بشكل صحيح/,
    ];

    let repaired = content;
    for (const pattern of untestedPatterns) {
      repaired = repaired.replace(
        pattern,
        "[لم يُختبر فعلياً — يحتاج اختباراً]",
      );
    }

    return repaired;
  }

  private repairSycophancy(content: string): string {
    const sycophancyReplacements: [RegExp, string][] = [
      [/أنت محق تماماً/g, "فرضيتك مفهومة، لكن دعنا نفحص التفاصيل:"],
      [
        /you are absolutely correct/gi,
        "Your assumption is understandable, but let's examine:",
      ],
      [
        /لا يوجد خطأ في تحليلك/g,
        "التحليل يحتوي على نقاط صحيحة، مع بعض الملاحظات:",
      ],
    ];

    let repaired = content;
    for (const [pattern, replacement] of sycophancyReplacements) {
      repaired = repaired.replace(pattern, replacement);
    }

    return repaired;
  }

  private repairSourceLaundering(content: string): string {
    return (
      content +
      "\n\n[ملاحظة: بعض المصادر المذكورة قد تحتاج إلى توثيق أولي إضافي.]"
    );
  }

  private repairAmbiguityAbuse(content: string): string {
    // إذا كان الرد يتجنب الإجابة
    const vaguePatterns = [/قد يختلف.*حسب السياق/g, /يعتمد على.*عوامل متعددة/g];

    let repaired = content;
    for (const pattern of vaguePatterns) {
      repaired = repaired.replace(
        pattern,
        "بناءً على الافتراضات المعقولة في هذا السياق: [إجابة محددة مطلوبة هنا]",
      );
    }

    return repaired;
  }

  private repairPrematureCompletion(content: string): string {
    // إزالة الخاتمة الشكلية
    const shallowEndings = [
      /في النهاية،.*يعتمد على احتياجاتك\.?$/,
      /الأمر يختلف.*حسب السياق\.?$/,
    ];

    let repaired = content;
    for (const pattern of shallowEndings) {
      repaired = repaired.replace(pattern, "[يتطلب تفاصيل إضافية ملموسة]");
    }

    return repaired;
  }

  private repairUnauthorizedAction(content: string): string {
    return (
      "[تنبيه: الفعل المطلوب يتطلب تصريحاً صريحاً. تم إنشاء مسودة فقط دون تنفيذ.]\n\n" +
      content
    );
  }
}

// ============================================================================
// Singleton
// ============================================================================

let repairLoopInstance: RepairLoop | null = null;

export function getRepairLoop(): RepairLoop {
  repairLoopInstance ??= new RepairLoop();
  return repairLoopInstance;
}
