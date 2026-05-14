"use client";

import { ensureAuthenticated, removeToken } from "@the-copy/breakapp/lib/auth";
import { getDefaultRedirect, isValidRole } from "@the-copy/breakapp/lib/roles";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FALLBACK_LOGIN_PATH = "/BREAKAPP/login/qr";

function getRedirectForRole(role: string | undefined): string {
  if (!role || !isValidRole(role)) {
    return "/BREAKAPP/dashboard";
  }

  return getDefaultRedirect(role);
}

export default function BREAKAPPHome() {
  const router = useRouter();
  const [message, setMessage] = useState("جارٍ تجهيز المسار المناسب");

  useEffect(() => {
    let active = true;

    async function redirectToSessionTarget(): Promise<void> {
      try {
        const user = await ensureAuthenticated();
        if (!active) {
          return;
        }

        if (!user) {
          removeToken();
          router.replace(FALLBACK_LOGIN_PATH);
          return;
        }

        router.replace(getRedirectForRole(user.role));
      } catch {
        if (!active) {
          return;
        }
        removeToken();
        setMessage("تعذر التحقق من الجلسة، جارٍ التحويل لتسجيل الدخول");
        router.replace(FALLBACK_LOGIN_PATH);
      }
    }

    void redirectToSessionTarget();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main
      dir="rtl"
      role="main"
      aria-label="تهيئة بوابة بريك آب"
      className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-50"
    >
      <section className="w-full max-w-xl rounded-2xl border border-cyan-200/20 bg-slate-900 p-8 text-center shadow-2xl shadow-black/35">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-200/20 bg-slate-800">
          <div
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent"
          />
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
          BREAKAPP
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          {message}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-300">
          يتم فحص حالة الجلسة محليًا ثم التحويل إلى تسجيل الدخول أو لوحة الدور
          المناسبة دون تحميل واجهة المنصة العامة.
        </p>
      </section>
    </main>
  );
}
