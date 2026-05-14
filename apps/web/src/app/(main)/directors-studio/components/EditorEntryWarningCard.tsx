"use client";

import { AlertCircle } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

export function EditorEntryWarningCard() {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-amber-600/20 bg-amber-950/25 p-4 backdrop-blur-xl md:p-5">
      <div className="space-y-3 text-right">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <h3 className="text-sm font-semibold text-amber-200">
            مسار الدخول الرسمي إلى المحرر
          </h3>
        </div>
        <p className="text-xs leading-relaxed text-amber-100/70">
          يتم فتح المحرر فقط ضمن حالة مشروع صالحة مع تمرير عقد query ثابت
          (`projectId` + `source`) لضمان اتساق الحالة بين الاستوديو والمحرر.
        </p>
      </div>
    </CardSpotlight>
  );
}
