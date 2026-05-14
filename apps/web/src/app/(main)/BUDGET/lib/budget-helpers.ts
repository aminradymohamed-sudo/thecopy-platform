import type { Budget, LineItem, Category, Section } from "./types";

export const createLineItem = (
  code: string,
  description: string
): LineItem => ({
  code,
  description,
  amount: 0,
  unit: "Flat",
  rate: 0,
  total: 0,
  notes: "",
  lastModified: new Date().toISOString(),
});

export const createCategory = (
  code: string,
  name: string,
  items: LineItem[]
): Category => ({
  code,
  name,
  items,
  total: 0,
  description: "",
});

export const createSection = (
  id: string,
  name: string,
  categories: Category[],
  color: string
): Section => ({
  id,
  name,
  categories,
  total: 0,
  color,
});

// =============================================================================
// بناء ميزانية مع حساب الإجماليات — يُستخدم في القوالب الجاهزة
// كل بند: total = amount × rate | كل فئة: sum(items) | كل قسم: sum(cats)
// =============================================================================

interface RawItem {
  code: string;
  description: string;
  amount: number;
  unit: string;
  rate: number;
  notes?: string;
}

interface RawCategory {
  code: string;
  name: string;
  items: RawItem[];
}

interface RawSection {
  id: string;
  name: string;
  color: string;
  categories: RawCategory[];
}

export function buildBudgetWithTotals(
  currency: string,
  rawSections: RawSection[],
  metadata?: Budget["metadata"]
): Budget {
  const sections: Section[] = rawSections.map((s) => {
    const categories: Category[] = s.categories.map((c) => {
      const items: LineItem[] = c.items.map((i) => ({
        code: i.code,
        description: i.description,
        amount: i.amount,
        unit: i.unit,
        rate: i.rate,
        total: Math.round(i.amount * i.rate * 100) / 100,
        notes: i.notes ?? "",
        lastModified: new Date().toISOString(),
      }));
      return {
        code: c.code,
        name: c.name,
        items,
        total: items.reduce((acc, i) => acc + i.total, 0),
        description: "",
      };
    });
    return {
      id: s.id,
      name: s.name,
      categories,
      total: categories.reduce((acc, c) => acc + c.total, 0),
      color: s.color,
    };
  });

  const grandTotal = sections.reduce((acc, s) => acc + s.total, 0);
  const base: Budget = { currency, grandTotal, sections };
  if (metadata !== undefined) base.metadata = metadata;
  return base;
}
