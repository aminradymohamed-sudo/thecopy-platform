import React from "react";

export const Footer: React.FC = () => (
  <footer className="mt-16 max-w-full overflow-x-hidden bg-black/14 py-12 text-white">
    <div className="container mx-auto max-w-full px-4">
      <div className="grid max-w-full grid-cols-1 gap-8 md:grid-cols-4">
        <div className="min-w-0">
          <h3 className="mb-4 flex items-center gap-2 break-words text-xl font-bold">
            🎭 استوديو الممثل العربي
          </h3>
          <p className="break-words text-white/72">
            منصة تدريب الممثلين بالذكاء الاصطناعي
          </p>
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold mb-4">المنتج</h4>
          <ul className="space-y-2 text-white/72">
            <li className="hover:text-white cursor-pointer">التجربة</li>
            <li className="hover:text-white cursor-pointer">الميزات</li>
            <li className="hover:text-white cursor-pointer">الأسعار</li>
          </ul>
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold mb-4">الموارد</h4>
          <ul className="space-y-2 text-white/72">
            <li className="hover:text-white cursor-pointer">المدونة</li>
            <li className="hover:text-white cursor-pointer">الدروس</li>
            <li className="hover:text-white cursor-pointer">الدعم</li>
          </ul>
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold mb-4">تواصل معنا</h4>
          <p className="break-words text-white/72">
            © 2025 استوديو الممثل العربي
          </p>
        </div>
      </div>
    </div>
  </footer>
);
