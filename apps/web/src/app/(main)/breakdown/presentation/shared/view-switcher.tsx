"use client";

/**
 * الصفحة: breakdown / ViewSwitcher
 * الهوية: مفتاح تبديل وظيفي بتدرج تشغيلي متسق مع قشرة التفكيك الجديدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات الصفحة المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: لا يستخدم مكوّن مباشر؛ يعتمد على متغيرات القشرة الموحدة
 */

import { Clapperboard, FileText } from "lucide-react";

export type BreakdownView = "workspace" | "report";

export const VIEW_CONFIG: {
  id: BreakdownView;
  label: string;
  description: string;
  icon: typeof Clapperboard;
}[] = [
  {
    id: "workspace",
    label: "مساحة التفكيك",
    description: "واجهة تفكيك السيناريو الكاملة متعددة الوكلاء داخل المنصة.",
    icon: Clapperboard,
  },
  {
    id: "report",
    label: "التقرير",
    description: "عرض تقرير التحليل النهائي من نفس مسار المنصة.",
    icon: FileText,
  },
];

interface ViewSwitcherProps {
  activeView: BreakdownView;
  onSelect: (view: BreakdownView) => void;
}

export function ViewSwitcher({ activeView, onSelect }: ViewSwitcherProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-3"
      role="tablist"
      aria-label="تبديل عرض التفكيك"
    >
      {VIEW_CONFIG.map((view) => {
        const Icon = view.icon;
        const isActive = activeView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelect(view.id)}
            id={`breakdown-view-tab-${view.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`breakdown-view-panel-${view.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
              isActive
                ? "text-white shadow-[0_14px_34px_rgba(0,0,0,0.26)]"
                : "border-white/10 bg-white/6 text-white/58 hover:border-white/16 hover:bg-white/10 hover:text-white"
            }`}
            style={
              isActive
                ? {
                    borderColor: "transparent",
                    background:
                      "linear-gradient(135deg,var(--page-accent),var(--page-accent-2))",
                  }
                : undefined
            }
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span>{view.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
