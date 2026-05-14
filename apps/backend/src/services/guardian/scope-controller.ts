/**
 * Guardian Runtime — Scope Controller
 *
 * @description
 * يمنع تضييق النطاق (scope collapse) عندما يذكر المستخدم أمثلة.
 * إذا قال المستخدم "مثل X" فإن النظام يوسّع العينة تلقائياً.
 */

import { ANTI_EVASION_RULES } from "./config";

import type { ScopeExpansionResult } from "./types";

// ============================================================================
// قواعد التوسيع المعرفة مسبقاً
// ============================================================================

interface ExpansionRule {
  category: string;
  examples: string[];
  relatedItems: string[];
}

const EXPANSION_RULES: ExpansionRule[] = [
  {
    category: "نماذج لغوية كبيرة",
    examples: ["GPT", "ChatGPT", "GPT-4", "GPT-5", "Claude", "Gemini"],
    relatedItems: [
      "GPT-4o",
      "GPT-5",
      "Claude 4",
      "Gemini 2.5",
      "DeepSeek-V3",
      "DeepSeek-R1",
      "Qwen 3",
      "Mistral Large",
      "Llama 4",
      "Grok",
    ],
  },
  {
    category: "لغات برمجة",
    examples: ["JavaScript", "Python", "Java", "C++", "TypeScript"],
    relatedItems: [
      "JavaScript",
      "TypeScript",
      "Python",
      "Java",
      "C++",
      "C#",
      "Go",
      "Rust",
      "Ruby",
      "PHP",
      "Swift",
      "Kotlin",
      "Scala",
      "Elixir",
    ],
  },
  {
    category: "أطر عمل frontend",
    examples: ["React", "Vue", "Angular", "Svelte"],
    relatedItems: [
      "React",
      "Vue.js",
      "Angular",
      "Svelte",
      "SolidJS",
      "Preact",
      "Qwik",
      "Alpine.js",
    ],
  },
  {
    category: "قواعد بيانات",
    examples: ["PostgreSQL", "MySQL", "MongoDB", "Redis"],
    relatedItems: [
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "Redis",
      "SQLite",
      "CockroachDB",
      "Cassandra",
      "DynamoDB",
      "Firebase",
      "Supabase",
    ],
  },
  {
    category: "مزودي سحابة",
    examples: ["AWS", "Azure", "GCP", "Google Cloud"],
    relatedItems: [
      "AWS (Amazon Web Services)",
      "Microsoft Azure",
      "Google Cloud Platform",
      "Oracle Cloud",
      "IBM Cloud",
      "DigitalOcean",
      "Linode",
      "Hetzner",
    ],
  },
  {
    category: "أدوات بناء",
    examples: ["Webpack", "Vite", "esbuild", "Turbopack"],
    relatedItems: [
      "Webpack",
      "Vite",
      "esbuild",
      "Turbopack",
      "Rollup",
      "Parcel",
      "Rspack",
      "SWC",
    ],
  },
];

// ============================================================================
// كاشف التوسيع
// ============================================================================

export class ScopeController {
  private triggerTerms: string[] =
    ANTI_EVASION_RULES.examplesAreNonExclusive.triggerTerms;

  expandScope(userRequest: string): ScopeExpansionResult {
    const normalizedRequest = userRequest.toLowerCase();

    // 1. كشف كلمات الزناد
    const detectedTriggers = this.triggerTerms.filter((term) =>
      normalizedRequest.includes(term.toLowerCase()),
    );

    if (detectedTriggers.length === 0) {
      return {
        triggerTerms: [],
        detectedExamples: [],
        expandedScope: [],
        expansionApplied: false,
        reason: "لا توجد كلمات زناد للتوسيع",
      };
    }

    // 2. كشف الأمثلة المذكورة
    const detectedExamples: string[] = [];
    const expandedScope: string[] = [];

    for (const rule of EXPANSION_RULES) {
      const foundExamples = rule.examples.filter((ex) =>
        normalizedRequest.includes(ex.toLowerCase()),
      );

      if (foundExamples.length > 0) {
        detectedExamples.push(...foundExamples);
        // أضف العناصر المرتبطة إلا تلك المذكورة بالفعل
        const newItems = rule.relatedItems.filter(
          (item) =>
            !foundExamples.some((ex) =>
              item.toLowerCase().includes(ex.toLowerCase()),
            ),
        );
        expandedScope.push(...newItems);
      }
    }

    // 3. إذا لم يُعثر على قاعدة معروفة، أضف تحذير عام
    const expansionApplied =
      expandedScope.length > 0 || detectedExamples.length > 0;

    return {
      triggerTerms: detectedTriggers,
      detectedExamples: [...new Set(detectedExamples)],
      expandedScope: [...new Set(expandedScope)],
      expansionApplied,
      reason: expansionApplied
        ? `تم الكشف على أمثلة في فئات: ${detectedExamples.join(", ")}. تم توسيع النطاق تلقائياً.`
        : "تم الكشف على كلمات أمثلة لكن لا توجد قواعد توسيع معرفة لهذا السياق",
    };
  }

  /**
   * يتحقق هل الرد اقتصر على أمثلة المستخدم فقط (scope collapse)
   */
  detectScopeCollapse(
    userRequest: string,
    response: string,
  ): { collapsed: boolean; reason: string } {
    const scopeResult = this.expandScope(userRequest);

    if (!scopeResult.expansionApplied) {
      return { collapsed: false, reason: "لا يوجد توسيع مطلوب" };
    }

    // تحقق هل الرد يتضمن عناصر من expandedScope
    const responseLower = response.toLowerCase();
    const expandedItemsFound = scopeResult.expandedScope.filter((item) =>
      responseLower.includes(item.toLowerCase()),
    );

    // إذا لم يُذكر أي عنصر موسّع → ربما حصل تضييق
    if (
      expandedItemsFound.length === 0 &&
      scopeResult.expandedScope.length > 0
    ) {
      return {
        collapsed: true,
        reason: `الرد اقتصر على أمثلة المستخدم (${scopeResult.detectedExamples.join(
          ", ",
        )}) دون توسيع النطاق المطلوب`,
      };
    }

    return {
      collapsed: false,
      reason: `تم توسيع النطاق بشكل كافٍ: ${expandedItemsFound.join(", ")}`,
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let scopeControllerInstance: ScopeController | null = null;

export function getScopeController(): ScopeController {
  scopeControllerInstance ??= new ScopeController();
  return scopeControllerInstance;
}
