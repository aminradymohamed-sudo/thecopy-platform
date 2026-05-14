"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

import { HeroAnimation } from "@/components/HeroAnimation";

const AppGrid = dynamic(
  () =>
    import("@/components/AppGrid").then((mod) => ({ default: mod.AppGrid })),
  {
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    ),
  }
);

export default function Page() {
  const [showApps, setShowApps] = useState(false);

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-hidden">
      {/* A11Y: روابط ثابتة دائمة موجودة في كل حالات الصفحة - تضمن وجود focusables في DOM
          حتى لو فشل hydration الـ HeroAnimation أو تأخّر */}
      <a
        href="#home-content"
        className="fixed top-0 right-0 z-[20000] -translate-y-full focus:translate-y-0 rounded-bl-md bg-white px-4 py-2 text-black font-bold transition-transform"
        aria-label="تخطّي إلى المحتوى الرئيسي"
      >
        تخطّي إلى المحتوى
      </a>
      <nav
        aria-label="قائمة الوصول السريع للأدوات"
        className="fixed top-2 left-2 z-[19999] flex gap-2 text-xs"
      >
        <button
          type="button"
          onClick={() => setShowApps(true)}
          className="rounded-md border border-white/20 bg-black/60 px-3 py-1.5 text-white backdrop-blur hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="إظهار شبكة الأدوات"
        >
          الأدوات
        </button>
        <Link
          href="/directors-studio"
          className="rounded-md border border-white/20 bg-black/60 px-3 py-1.5 text-white backdrop-blur hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="الانتقال إلى استوديو المخرج"
        >
          الاستوديو
        </Link>
        <Link
          href="/editor"
          className="rounded-md border border-white/20 bg-black/60 px-3 py-1.5 text-white backdrop-blur hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="الانتقال إلى المحرر"
        >
          المحرر
        </Link>
      </nav>
      <span id="home-content" tabIndex={-1} aria-hidden="true" />
      {!showApps ? (
        <HeroAnimation onContinue={() => setShowApps(true)} />
      ) : (
        <AppGrid />
      )}
    </main>
  );
}
