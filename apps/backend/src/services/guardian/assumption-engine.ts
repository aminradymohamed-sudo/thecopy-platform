/**
 * Guardian Runtime — Assumption Engine
 *
 * @description
 * يحل الغموض في طلب المستخدم دون سؤاله، باختيار "أوسع افتراض معقول".
 * يوثق الافتراضات ويكشف ما إذا كان الفعل غير قابل للعكس.
 */

import type { Assumption, TaskClassification } from "./types";

// ============================================================================
// أنماط الغموض الشائعة
// ============================================================================

interface AmbiguityPattern {
  pattern: RegExp;
  assumption: string;
  reversible: boolean;
}

const AMBIGUITY_PATTERNS: AmbiguityPattern[] = [
  {
    pattern: /(أفضل|الأحسن)|\bbest\b/i,
    assumption:
      "يفترض أن 'أفضل' يعني الأكثر شيوعاً والأعلى تقييماً في السياق الحالي",
    reversible: true,
  },
  {
    pattern: /(سريع|سريعة)|\bfast\b/i,
    assumption:
      "يفترض أن 'سريع' يعني أقل من 3 ثوانٍ استجابة أو أقل زمن تنفيذ ممكن",
    reversible: true,
  },
  {
    pattern: /(شامل|كامل)|\b(comprehensive|complete)\b/i,
    assumption:
      "يفترض أن 'شامل' يعني تغطية النقاط الرئيسية وليس كل التفاصيل الممكنة",
    reversible: true,
  },
  {
    pattern: /(بسيط|سهل)|\b(simple|easy)\b/i,
    assumption:
      "يفترض أن 'بسيط' يعني بدون تعقيدات زائدة مع الحفاظ على الوظيفة الأساسية",
    reversible: true,
  },
  {
    pattern: /(حديث|جديد)|\b(recent|new|latest)\b/i,
    assumption:
      "يفترض أن 'حديث' يعني خلال الـ 12 شهراً الماضية ما لم يُحدد تاريخ أقصر",
    reversible: true,
  },
  {
    pattern: /(اقترح|أقترح)|\b(suggest|recommend)\b/i,
    assumption:
      "يفترض أن 'اقترح' يعني توفير خيارات متعددة مع مميزات وعيوب كل خيار",
    reversible: true,
  },
  {
    pattern: /(حلل|تحليل)|\banalyze\b/i,
    assumption:
      "يفترض أن 'حلل' يعني تفكيك المشكلة إلى مكونات رئيسية مع تقييم كل منها",
    reversible: true,
  },
  {
    pattern: /(راجع|مراجعة)|\breview\b/i,
    assumption:
      "يفترض أن 'راجع' يعني فحص الأخطاء والتحسينات الممكنة مع الحفاظ على النية الأصلية",
    reversible: true,
  },
  {
    pattern: /(اكتب|أنشئ)|\b(write|create)\b/i,
    assumption: "يفترض أن 'اكتب' يعني إنتاج مسودة كاملة يمكن تعديلها لاحقاً",
    reversible: true,
  },
  {
    pattern: /(قارن|مقارنة)|\bcompare\b/i,
    assumption:
      "يفترض أن 'قارن' يعني مقارنة جانبية مع ذكر الفروقات الرئيسية والسياق المناسب لكل خيار",
    reversible: true,
  },
];

// ============================================================================
// أنماط الأفعال غير القابلة للعكس
// ============================================================================

const IRREVERSIBLE_ACTIONS = [
  /(احذف|امسح|حذف نهائي)/,
  /\b(delete|erase permanently)\b/i,
  /(أرسل|أرسل فوراً)/,
  /\b(send now|send immediately)\b/i,
  /(اشترِ|ادفع)/,
  /\b(buy now|pay now|purchase immediately)\b/i,
  /(انشر|أنشر فوراً)/,
  /\b(publish now|deploy to production)\b/i,
  /(نفذ|شغل مباشرة)/,
  /\b(execute|run directly)\b/i,
];

// ============================================================================
// المحرك
// ============================================================================

export class AssumptionEngine {
  resolveAmbiguity(
    userRequest: string,
    classification: TaskClassification,
  ): {
    assumptions: Assumption[];
    shouldAskUser: boolean;
    askUserReason: string | null;
  } {
    const assumptions: Assumption[] = [];

    // 1. فحص الأفعال غير القابلة للعكس أولاً
    const isIrreversible = IRREVERSIBLE_ACTIONS.some((pattern) =>
      pattern.test(userRequest),
    );

    if (
      isIrreversible &&
      (classification.riskLevel === "high" ||
        classification.riskLevel === "critical")
    ) {
      return {
        assumptions: [],
        shouldAskUser: true,
        askUserReason:
          "الفعل المطلوب قد يكون غير قابل للعكس ويحمل خطراً عالياً. يتطلب تأكيداً صريحاً.",
      };
    }

    // 2. كشف الغموض وتوليد افتراضات
    for (const { pattern, assumption, reversible } of AMBIGUITY_PATTERNS) {
      if (pattern.test(userRequest)) {
        assumptions.push({
          id: this.generateId(),
          assumption,
          reason: `تم اكتشاف غموض في الكلمة المطابقة: ${pattern.source}`,
          reversible,
          disclosedToUser: false, // يُكشف فقط عند الحاجة
        });
      }
    }

    // 3. افتراضات إضافية بناءً على نوع المهمة
    const taskAssumptions = this.getTaskSpecificAssumptions(classification);
    assumptions.push(...taskAssumptions);

    // 4. افتراض عام إذا كان الطلب قصيراً جداً أو غامضاً
    if (classification.ambiguityDetected && assumptions.length === 0) {
      assumptions.push({
        id: this.generateId(),
        assumption:
          "يفترض أن المستخدم يريد إجابة عامة ومختصرة نظراً لقلة التفاصيل",
        reason: "الطلب قصير أو يحتوي على كلمات غامضة",
        reversible: true,
        disclosedToUser: false,
      });
    }

    return {
      assumptions,
      shouldAskUser: false,
      askUserReason: null,
    };
  }

  private getTaskSpecificAssumptions(
    classification: TaskClassification,
  ): Assumption[] {
    const assumptions: Assumption[] = [];

    switch (classification.taskType) {
      case "code":
        assumptions.push({
          id: this.generateId(),
          assumption:
            "يفترض أن الكود المطلوب بلغة TypeScript/JavaScript ما لم يُحدد خلاف ذلك",
          reason: "نوع المهمة: كود بدون تحديد لغة",
          reversible: true,
          disclosedToUser: false,
        });
        if (classification.needsTests) {
          assumptions.push({
            id: this.generateId(),
            assumption:
              "يفترض أن الاختبارات المطلوبة هي unit tests باستخدام vitest أو jest",
            reason: "نوع المهمة: كود مع حاجة لاختبار",
            reversible: true,
            disclosedToUser: false,
          });
        }
        break;
      case "research":
        assumptions.push({
          id: this.generateId(),
          assumption:
            "يفترض أن المصادر المطلوبة هي مصادر أولية أو ثانوية موثوقة (لا ويكيبيديا وحدها)",
          reason: "نوع المهمة: بحث",
          reversible: true,
          disclosedToUser: false,
        });
        break;
      case "file":
        assumptions.push({
          id: this.generateId(),
          assumption:
            "يفترض أن العمل على الملفات يقتصر على مساحة العمل (workspace) الحالية",
          reason: "نوع المهمة: ملفات",
          reversible: true,
          disclosedToUser: false,
        });
        break;
      case "creative_writing":
        assumptions.push({
          id: this.generateId(),
          assumption: "يفترض الحفاظ على نبرة المستخدم وتفضيلاته الأسلوبية",
          reason: "نوع المهمة: كتابة إبداعية",
          reversible: true,
          disclosedToUser: false,
        });
        break;
      default:
        break;
    }

    return assumptions;
  }

  /**
   * يولد نص الإفصاح عن الافتراضات للمستخدم
   */
  formatAssumptionsForUser(assumptions: Assumption[]): string[] {
    return assumptions
      .filter((a) => a.reversible)
      .map((a) => `• ${a.assumption}`);
  }

  private generateId(): string {
    return `asm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let assumptionEngineInstance: AssumptionEngine | null = null;

export function getAssumptionEngine(): AssumptionEngine {
  assumptionEngineInstance ??= new AssumptionEngine();
  return assumptionEngineInstance;
}
