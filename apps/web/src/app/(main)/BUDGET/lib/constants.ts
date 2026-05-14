// Budget Constants - Re-exports
// ثوابت الموازنة - إعادة تصدير

import {
  INITIAL_BUDGET_TEMPLATE,
  SHORT_FILM_BUDGET,
  DOCUMENTARY_BUDGET,
  COMMERCIAL_BUDGET,
} from "./budget-data";

import type { Budget } from "./types";

export {
  createLineItem,
  createCategory,
  createSection,
} from "./budget-helpers";
export {
  INITIAL_BUDGET_TEMPLATE,
  SHORT_FILM_BUDGET,
  DOCUMENTARY_BUDGET,
  COMMERCIAL_BUDGET,
  CURRENCIES,
  UNITS,
} from "./budget-data";

// =============================================================================
// لوحة الألوان للرسوم البيانية — مستهلكة في EnhancedChart عبر COLOR_PALETTE.charts
// مصفوفة ثابتة من ألوان hex متباينة وقابلة للتدوير عبر النسبة المئوية
// =============================================================================
export const COLOR_PALETTE: { readonly charts: readonly string[] } = {
  charts: [
    "#3B82F6", // أزرق
    "#10B981", // أخضر
    "#F59E0B", // كهرماني
    "#EF4444", // أحمر
    "#8B5CF6", // بنفسجي
    "#EC4899", // وردي
    "#14B8A6", // فيروزي
    "#F97316", // برتقالي
    "#06B6D4", // سماوي
    "#84CC16", // ليموني
  ] as const,
};

// =============================================================================
// قوالب الموازنة الجاهزة — مستهلكة في TemplateSelector و useBudgetState
// كل قالب يحدد فئة المشروع ويعتمد على INITIAL_BUDGET_TEMPLATE كهيكل أساسي
// =============================================================================
export interface BudgetTemplate {
  id: string;
  name: string;
  icon: string;
  category: "feature" | "short" | "documentary" | "commercial";
  description: string;
  budget: Budget;
}

export const BUDGET_TEMPLATES: readonly BudgetTemplate[] = [
  {
    id: "feature-default",
    name: "فيلم روائي طويل",
    icon: "🎬",
    category: "feature",
    description:
      "ميزانية مرجعية لفيلم روائي متوسط التمويل — 30 يوم تصوير، طاقم كامل",
    budget: INITIAL_BUDGET_TEMPLATE,
  },
  {
    id: "short-default",
    name: "فيلم قصير",
    icon: "🎞️",
    category: "short",
    description:
      "ميزانية مرجعية لفيلم قصير منخفض التكلفة — 5 أيام تصوير (~$25,000)",
    budget: SHORT_FILM_BUDGET,
  },
  {
    id: "documentary-default",
    name: "فيلم وثائقي",
    icon: "📽️",
    category: "documentary",
    description:
      "ميزانية مرجعية لوثائقي ميداني — 15 يوم تصوير، بحث وأرشيف (~$75,000)",
    budget: DOCUMENTARY_BUDGET,
  },
  {
    id: "commercial-default",
    name: "إعلان تجاري",
    icon: "📺",
    category: "commercial",
    description:
      "ميزانية مرجعية لإعلان تجاري عالي الإنتاج — يومان تصوير (~$100,000)",
    budget: COMMERCIAL_BUDGET,
  },
] as const;
