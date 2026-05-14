"use client";

/**
 * الصفحة: actorai-arabic / AppFooter
 * الهوية: تذييل داخلي بطابع تقني/أدائي متسق مع القشرة الموحدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات ActorAiArabicStudioV2 المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

export function AppFooter() {
  return (
    <footer className="mt-10 max-w-full overflow-x-hidden px-3 pb-4 md:px-6 md:pb-6">
      <CardSpotlight className="max-w-full overflow-hidden rounded-[26px] border border-white/8 bg-black/55 p-6 backdrop-blur-2xl md:p-8">
        <div className="grid min-w-0 grid-cols-1 gap-8 text-right text-white md:grid-cols-4">
          <div className="min-w-0">
            <h3 className="mb-4 flex flex-wrap items-center justify-end gap-2 break-words text-xl font-bold">
              <span>استوديو الممثل العربي</span>
              <span aria-hidden="true">🎭</span>
            </h3>
            <p className="break-words leading-7 text-white">
              منصة تدريب الممثلين بالذكاء الاصطناعي داخل هوية بصرية موحدة مع
              المنصة.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">المنتج</h4>
            <ul className="space-y-2 text-white">
              <li className="hover:text-white cursor-pointer">التجربة</li>
              <li className="hover:text-white cursor-pointer">الميزات</li>
              <li className="hover:text-white cursor-pointer">الأسعار</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">الموارد</h4>
            <ul className="space-y-2 text-white">
              <li className="hover:text-white cursor-pointer">المدونة</li>
              <li className="hover:text-white cursor-pointer">الدروس</li>
              <li className="hover:text-white cursor-pointer">الدعم</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">تواصل معنا</h4>
            <p className="text-white">© 2025 استوديو الممثل العربي</p>
          </div>
        </div>
      </CardSpotlight>
    </footer>
  );
}
