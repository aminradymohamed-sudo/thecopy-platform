"use client";

/**
 * الصفحة: actorai-arabic / AppHeader
 * الهوية: رأس تنقل داخلي بطابع تقني/أدائي متسق مع القشرة الموحدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات ActorAiArabicStudioV2 المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";

import { useApp } from "../context/AppContext";

const NAV_ITEMS = [
  { view: "home", label: "🏠 الرئيسية" },
  { view: "studio", label: "🎬 الاستوديو" },
  { view: "vocal", label: "🎤 النطق" },
  { view: "voicecoach", label: "🎙️ مدرب النطق" },
  { view: "rhythm", label: "🎵 الإيقاع" },
  { view: "webcam", label: "👁️ الرؤية" },
  { view: "ar", label: "🥽 الواقع الممتد" },
  { view: "memorization", label: "🧠 الذاكرة" },
] as const;

export function AppHeader() {
  const { currentView, user, theme, navigate, toggleTheme, handleLogout } =
    useApp();

  return (
    <div className="sticky top-0 z-40 max-w-full overflow-x-hidden p-3 md:p-6">
      <CardSpotlight className="max-w-full overflow-hidden rounded-[26px] border border-white/8 bg-black/55 px-3 py-4 backdrop-blur-2xl md:px-6">
        <div className="container mx-auto min-w-0 max-w-full">
          <div className="flex min-w-0 max-w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3 text-white">
              <span className="shrink-0 text-4xl" aria-hidden="true">
                🎭
              </span>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold md:text-3xl">
                  استوديو الممثل العربي
                </h1>
                <p className="max-w-full break-words text-sm text-white">
                  بيئة تدريب وأداء داخل هوية بصرية موحدة مع المنصة
                </p>
              </div>
            </div>

            <nav className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
              {NAV_ITEMS.map(({ view, label }) => (
                <Button
                  key={view}
                  onClick={() => navigate(view)}
                  variant={currentView === view ? "secondary" : "ghost"}
                  className={
                    currentView === view
                      ? "max-w-full whitespace-normal break-words bg-sky-700 text-white hover:bg-sky-800"
                      : "max-w-full whitespace-normal break-words text-white hover:bg-white/10"
                  }
                >
                  {label}
                </Button>
              ))}

              {user ? (
                <>
                  <Button
                    onClick={() => navigate("dashboard")}
                    variant={
                      currentView === "dashboard" ? "secondary" : "ghost"
                    }
                    className={
                      currentView === "dashboard"
                        ? "max-w-full whitespace-normal break-words bg-sky-700 text-white hover:bg-sky-800"
                        : "max-w-full whitespace-normal break-words text-white hover:bg-white/10"
                    }
                  >
                    📊 لوحة التحكم
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="max-w-full whitespace-normal break-words text-white hover:bg-red-700 hover:text-white"
                  >
                    🚪 خروج
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => navigate("login")}
                    variant="ghost"
                    className="max-w-full whitespace-normal break-words text-white hover:bg-white/10"
                  >
                    دخول
                  </Button>
                  <Button
                    onClick={() => navigate("register")}
                    className="max-w-full whitespace-normal break-words bg-sky-700 text-white hover:bg-sky-800"
                  >
                    ابدأ الآن
                  </Button>
                </>
              )}

              <Button
                onClick={toggleTheme}
                aria-label="تبديل السمة"
                variant="ghost"
                className="text-white hover:bg-white/10"
                size="icon"
              >
                {theme === "light" ? "🌙" : "☀️"}
              </Button>
            </nav>
          </div>
        </div>
      </CardSpotlight>
    </div>
  );
}
