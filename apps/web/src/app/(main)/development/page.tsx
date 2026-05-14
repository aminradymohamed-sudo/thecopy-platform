"use client";

/**
 * الصفحة: development
 * الهوية: استوديو تطوير إبداعي بطابع مختبر/معالجة داخل قشرة موحدة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border
 */

import dynamic from "next/dynamic";
import { useEffect } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

const CreativeDevelopment = dynamic(() => import("./creative-development"), {
  loading: () => (
    <div className="flex min-h-[360px] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-lg border border-[var(--page-border)] bg-zinc-950/88 p-6 text-center shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[var(--page-accent)] border-t-transparent" />
        <h1 className="text-2xl font-bold text-white">
          مختبر تطوير النصوص الدرامية
        </h1>
        <p className="mt-3 text-sm leading-7 text-white/70">
          جارٍ تحميل أدوات التطوير داخل الصفحة.
        </p>
      </div>
    </div>
  ),
  ssr: false,
});

export default function DevelopmentPage() {
  useEffect(() => {
    document.documentElement.classList.add("development-responsive-page");
    document.body.classList.add("development-responsive-page");

    return () => {
      document.documentElement.classList.remove("development-responsive-page");
      document.body.classList.remove("development-responsive-page");
    };
  }, []);

  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen w-full max-w-full overflow-x-hidden bg-zinc-950 text-white"
      style={{
        backgroundColor: "#09090b",
        ["--page-accent" as string]: "var(--accent-creative, #c2255c)",
        ["--page-accent-2" as string]: "var(--accent-technical, #3b5bdb)",
        ["--page-border" as string]: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(194,37,92,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,91,219,0.12),transparent_36%),linear-gradient(180deg,rgba(0,0,0,0.34),rgba(0,0,0,0.08))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] opacity-55" />

      <div className="relative z-10 mx-auto w-full max-w-[1600px] overflow-x-hidden px-3 py-4 md:px-6 md:py-6">
        <div className="w-full max-w-full space-y-6 overflow-x-hidden">
          <CardSpotlight className="w-full max-w-full overflow-hidden rounded-[24px] border border-[var(--page-border)] bg-zinc-950 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:rounded-[32px] md:p-8">
            <div className="max-w-full space-y-3 break-words bg-zinc-950 text-right">
              <p className="text-[11px] font-semibold text-white/62">
                مختبر التطوير الإبداعي
              </p>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">
                مختبر تطوير النصوص الدرامية
              </h1>
              <p className="max-w-4xl text-base leading-8 text-white/68 md:text-lg">
                نفس نواة المنصة، لكن بنبرة مختبرية أدق مناسبة لتراكم التقارير
                والمهام والوكلاء ومعالجة النتائج الإبداعية.
              </p>
            </div>
          </CardSpotlight>

          <CardSpotlight className="w-full max-w-full overflow-hidden rounded-[24px] border border-[var(--page-border)] bg-zinc-950 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl md:rounded-[32px]">
            <div className="w-full max-w-full overflow-x-hidden bg-zinc-950 p-1 md:p-4">
              <CreativeDevelopment />
            </div>
          </CardSpotlight>
        </div>
      </div>
    </main>
  );
}
