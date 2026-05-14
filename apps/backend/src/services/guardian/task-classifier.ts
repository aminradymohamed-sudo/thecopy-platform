/**
 * Guardian Runtime — Task Classifier
 *
 * @description
 * يصنف طلب المستخدم إلى نوع مهمة ومستوى خطر وحاجات تشغيلية
 * باستخدام regex + keyword heuristics سريعة دون الحاجة لاستدعاء LLM.
 */

import type { TaskClassification, TaskType, RiskLevel } from "./types";

// ============================================================================
// أنماط الكلمات المفتاحية لكل نوع مهمة
// ============================================================================

const TASK_PATTERNS: Record<TaskType, RegExp[]> = {
  simple_question: [
    /^(?:ما|كيف|لماذا|متى|أين|من|هل)\s/i,
    /^(?:اشرح|وضح|حدد|عرف)\s/i,
    /\b(معنى|تعريف|شرح|توضيح)\b/,
  ],
  research: [
    /(ابحث|بحث|دراسة|استعراض|مراجعة|تطور|حديث|جديد|آخر)/,
    /\b(research|search|study|review|latest|recent|current|202[0-9]|202[0-9])\b/i,
    /(نماذج|تقنيات|منصات|أدوات|مكتبات).*(حديثة|جديدة|الأحدث)/,
  ],
  analysis: [
    /(حلل|تحليل|قارن|مقارنة|تقييم|استخرج|اكتشف)/,
    /\b(analyze|analysis|compare|comparison|evaluate|extract|identify)\b/i,
    /(نقاط القوة|نقاط الضعف|فرص|تهديدات|SWOT)/,
  ],
  code: [
    /(اكتب كود|أنشئ كود|راجع كود|صحح كود|وظيفة|دالة)/,
    /\b(class|function)\b/i,
    /\b(code|function|class|component|script|bug|fix|refactor|implement)\b/i,
    /(جافا سكريبت|تايب سكريبت|بايثون|جافا|سي\+\+|csharp|go|rust|ruby)/,
    /\b(JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|Ruby)\b/,
  ],
  file: [
    /(اقرأ ملف|اكتب ملف|عدل ملف|أنشئ ملف|حذف ملف|مجلد|مسار)/,
    /\b(read file|write file|edit file|create file|delete file|folder|path)\b/i,
    /\.(ts|js|py|java|go|rs|json|yaml|yml|md|txt|sql)\b/,
  ],
  creative_writing: [
    /(اكتب|أنشئ|صيغ|أعد صياغة|سيناريو|حوار|مشهد|قصة|مقال|نص)/,
    /\b(write|create|draft|compose|story|scene|dialogue|script|article|essay|poem)\b/i,
    /(أسلوب|نبرة|لغة|أدبي|إبداعي)/,
  ],
  destructive_action: [
    /(احذف|امسح|أزل|تخلص من|دمّر)/,
    /\b(delete|remove|erase|destroy|drop\s+(?:table|database)|truncate)\b/i,
    /(حذف نهائي|لا يمكن الاسترجاع)/,
  ],
  external_action: [
    /(أرسل بريد|أرسل رسالة|اشترِ|ادفع|انشر|أجرِ اتصال)/,
    /\b(send email|send message|buy|purchase|pay|publish|deploy|call\s+api)\b/i,
    /(شراء|دفع|تحويل مالي|اشتراك)/,
  ],
  comparison: [
    /(قارن|مقارنة|أفضل|أسوأ|الفرق بين|فرق بين|مقابل|vs|versus)/,
    /\b(compare|comparison|better|worse|difference between|vs\.?|versus)\b/i,
    /(مميزات|عيوب|إيجابيات|سلبيات)/,
  ],
  unknown: [],
};

// ============================================================================
// أنماط مستوى الخطر
// ============================================================================

const RISK_PATTERNS: Record<RiskLevel, RegExp[]> = {
  low: [
    /^(?:ما|كيف|لماذا|متى|أين|من|هل)\s/i,
    /\b(تعريف|شرح|توضيح|معلومات عامة)\b/,
  ],
  medium: [
    /(حلل|قارن|راجع|اقترح|نصيحة)/,
    /\b(analyze|compare|review|suggest|advice)\b/i,
    /(ملف|كود|تقرير|مشروع)/,
  ],
  high: [
    /(قانون|طب|مالية|استثمار|صحة|دواء|علاج|تشخيص)/,
    /\b(legal|medical|financial|investment|health|diagnosis|treatment)\b/i,
    /(احذف|أرسل|ادفع|اشترِ|انشر|عدل قاعدة بيانات)/,
    /\b(delete|send|pay|buy|publish|modify production)\b/i,
  ],
  critical: [
    /(حذف كل|احذف كل|مسح كل|امسح كل|تدمير|فورمات)/,
    /\b(truncate all|drop all)\b/i,
    /(تحويل مالي كبير|شراء بمبالغ ضخمة)/,
  ],
};

// ============================================================================
// كلمات تدل على الحاجة لبحث/اختبار/مصادر
// ============================================================================

const NEEDS_WEB_PATTERNS = [
  /(حديث|جديد|آخر|اليوم|هذا الأسبوع|هذا الشهر|أخبار)/,
  /\b202[0-9]\b/,
  /\b(recent|latest|today|this week|this month|202[0-9]|news|current)\b/i,
  /\b(ابحث في الويب|ابحث على الإنترنت|google|bing)\b/,
];

const NEEDS_SOURCES_PATTERNS = [
  /(بحث|دراسة|إحصائية|بيانات|أرقام|نسبة|مصدر)/,
  /\b(research|study|statistics|data|numbers|percentage|source|citation)\b/i,
  /(وفقاً|حسب|طبقاً لـ|يقول|ذكر|أفاد)/,
];

const NEEDS_TESTS_PATTERNS = [
  /\b(اختبار|test|testing|jest|vitest|unit test|e2e|integration)\b/i,
  /(صحح)/,
  /\b(debug|troubleshoot|verify that it works)\b/i,
];

const NEEDS_SANDBOX_PATTERNS = [
  /(نفذ|شغل).*(كود)/,
  /\b(run|execute)\b.*\b(code|script|file)\b/i,
  /\b(eval|exec|spawn|child_process|shell)\b/i,
];

// ============================================================================
// كلمات تدل على الأمثلة غير الحصرية
// ============================================================================

const EXAMPLE_TRIGGER_TERMS = [
  "مثل",
  "على سبيل المثال",
  "كـ",
  "منها",
  "including",
  "e.g.",
  "such as",
  "for example",
  "e.g",
];

// ============================================================================
// التصنيف
// ============================================================================

export class TaskClassifier {
  classify(userRequest: string): TaskClassification {
    const normalizedRequest = userRequest.trim();

    const taskType = this.detectTaskType(normalizedRequest);
    const riskLevel = this.detectRiskLevel(normalizedRequest, taskType);
    const needsWeb = this.detectNeedsWeb(normalizedRequest);
    const needsSources = this.detectNeedsSources(normalizedRequest, taskType);
    const needsTests = this.detectNeedsTests(normalizedRequest, taskType);
    const needsSandbox = this.detectNeedsSandbox(normalizedRequest, taskType);
    const examplesAreExclusive =
      this.detectExclusiveExamples(normalizedRequest);
    const ambiguityDetected = this.detectAmbiguity(normalizedRequest);

    return {
      taskType,
      riskLevel,
      needsWeb,
      needsSources,
      needsTests,
      needsSandbox,
      examplesAreExclusive,
      ambiguityDetected,
      userIntentSummary: this.summarizeIntent(normalizedRequest, taskType),
    };
  }

  private detectTaskType(request: string): TaskType {
    const scores: Record<TaskType, number> = {
      simple_question: 0,
      research: 0,
      analysis: 0,
      code: 0,
      file: 0,
      creative_writing: 0,
      destructive_action: 0,
      external_action: 0,
      comparison: 0,
      unknown: 0,
    };

    for (const [taskType, patterns] of Object.entries(TASK_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(request)) {
          scores[taskType as TaskType]++;
        }
      }
    }

    // destructive_action و external_action لها أولوية حتى لو درجاتها أقل
    if (scores.destructive_action > 0) return "destructive_action";
    if (scores.external_action > 0) return "external_action";

    // اختر النوع بأعلى درجة
    let bestType: TaskType = "unknown";
    let bestScore = 0;
    for (const [type, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type as TaskType;
      }
    }

    // إذا لم يتطابق شيء لكن الطلب قصير جداً → simple_question
    if (bestType === "unknown" && request.length < 100) {
      return "simple_question";
    }

    return bestType;
  }

  private detectRiskLevel(request: string, taskType: TaskType): RiskLevel {
    // destructive_action أو external_action → high على الأقل
    if (taskType === "destructive_action" || taskType === "external_action") {
      // تحقق من critical
      for (const pattern of RISK_PATTERNS.critical) {
        if (pattern.test(request)) return "critical";
      }
      return "high";
    }

    // فحص critical أولاً
    for (const pattern of RISK_PATTERNS.critical) {
      if (pattern.test(request)) return "critical";
    }

    // فحص high
    for (const pattern of RISK_PATTERNS.high) {
      if (pattern.test(request)) return "high";
    }

    // فحص medium
    for (const pattern of RISK_PATTERNS.medium) {
      if (pattern.test(request)) return "medium";
    }

    return "low";
  }

  private detectNeedsWeb(request: string): boolean {
    return NEEDS_WEB_PATTERNS.some((p) => p.test(request));
  }

  private detectNeedsSources(request: string, taskType: TaskType): boolean {
    // البحث يحتاج مصادر تلقائياً
    if (taskType === "research" || taskType === "analysis") return true;
    return NEEDS_SOURCES_PATTERNS.some((p) => p.test(request));
  }

  private detectNeedsTests(request: string, taskType: TaskType): boolean {
    if (taskType === "code") return true;
    return NEEDS_TESTS_PATTERNS.some((p) => p.test(request));
  }

  private detectNeedsSandbox(request: string, taskType: TaskType): boolean {
    if (taskType === "code") return true;
    return NEEDS_SANDBOX_PATTERNS.some((p) => p.test(request));
  }

  private detectExclusiveExamples(request: string): boolean {
    // إذا وجدت كلمات أمثلة → الأمثلة غير حصرية (false = not exclusive)
    // المعنى: examplesAreExclusive = true فقط لو لم يوجد أي دليل على أنها أمثلة
    const hasExampleTerms = EXAMPLE_TRIGGER_TERMS.some((term) =>
      request.toLowerCase().includes(term.toLowerCase()),
    );
    return !hasExampleTerms;
  }

  private detectAmbiguity(request: string): boolean {
    // كشف الغموض: كلمات غير محددة أو طلبات عامة جداً
    const ambiguousPatterns = [
      /(شيء|أشياء|كذا|كذلك|وهكذا|إلخ|...)/,
      /\betc\b/i,
      /\b(something|things|stuff|whatever|etc|…)\b/i,
      /^\s*[^.!?]{0,30}\s*$/, // جملة قصيرة جداً بدون تفاصيل
    ];
    return ambiguousPatterns.some((p) => p.test(request));
  }

  private summarizeIntent(request: string, taskType: TaskType): string {
    // ملخص بسيط للنية (يستخدم في التسجيل)
    return `${taskType}: ${request.substring(0, 120)}`;
  }
}

// ============================================================================
// Singleton
// ============================================================================

let classifierInstance: TaskClassifier | null = null;

export function getTaskClassifier(): TaskClassifier {
  classifierInstance ??= new TaskClassifier();
  return classifierInstance;
}
