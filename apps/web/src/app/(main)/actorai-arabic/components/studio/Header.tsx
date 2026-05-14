import React from "react";

import { Button } from "@/components/ui/button";

import type { User, ViewType } from "../../types";

interface NavItem {
  view: ViewType;
  label: string;
}

interface HeaderProps {
  currentView: ViewType;
  user: User | null;
  navigate: (view: ViewType) => void;
  handleLogout: () => void;
  toggleTheme: () => void;
  theme: "light" | "dark";
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { view: "home", label: "🏠 الرئيسية" },
  { view: "studio", label: "🎬 الاستوديو" },
  { view: "vocal", label: "🎤 تمارين الصوت" },
  { view: "voicecoach", label: "🎙️ مدرب الصوت" },
  { view: "rhythm", label: "🎵 إيقاع المشهد" },
  { view: "webcam", label: "👁️ التحليل البصري" },
  { view: "ar", label: "🥽 تدريب AR/MR" },
  { view: "memorization", label: "🧠 اختبار الذاكرة" },
];

function getNavButtonClass(isActive: boolean) {
  return isActive
    ? "bg-white/[0.08] text-white"
    : "text-white hover:bg-blue-800";
}

function HeaderNavButton({
  item,
  currentView,
  navigate,
}: {
  item: NavItem;
  currentView: ViewType;
  navigate: (view: ViewType) => void;
}) {
  const isActive = currentView === item.view;

  return (
    <Button
      onClick={() => navigate(item.view)}
      variant={isActive ? "secondary" : "ghost"}
      className={`max-w-full whitespace-normal break-words ${getNavButtonClass(isActive)}`}
    >
      {item.label}
    </Button>
  );
}

function AuthButtons({
  user,
  currentView,
  navigate,
  handleLogout,
}: {
  user: User | null;
  currentView: ViewType;
  navigate: (view: ViewType) => void;
  handleLogout: () => void;
}) {
  if (!user) {
    return (
      <>
        <Button
          onClick={() => navigate("login")}
          variant="ghost"
          className="max-w-full whitespace-normal break-words text-white hover:bg-blue-800"
        >
          دخول
        </Button>
        <Button
          onClick={() => navigate("register")}
          className="max-w-full whitespace-normal break-words bg-indigo-700 text-white hover:bg-indigo-800"
        >
          ابدأ الآن
        </Button>
      </>
    );
  }

  const isDashboard = currentView === "dashboard";

  return (
    <>
      <Button
        onClick={() => navigate("dashboard")}
        variant={isDashboard ? "secondary" : "ghost"}
        className={`max-w-full whitespace-normal break-words ${getNavButtonClass(isDashboard)}`}
      >
        📊 لوحة التحكم
      </Button>
      <Button
        onClick={handleLogout}
        variant="ghost"
        className="max-w-full whitespace-normal break-words text-white hover:bg-red-700"
      >
        🚪 خروج
      </Button>
    </>
  );
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  user,
  navigate,
  handleLogout,
  toggleTheme,
  theme,
}) => (
  <header className="sticky top-0 z-40 max-w-full overflow-x-hidden bg-gradient-to-l from-blue-950 to-purple-950 p-6 text-white">
    <div className="container mx-auto max-w-full">
      <div className="flex max-w-full flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-4xl">🎭</span>
          <h1 className="break-words text-3xl font-bold">
            استوديو الممثل العربي
          </h1>
        </div>

        <nav className="flex max-w-full flex-wrap items-center gap-2">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <HeaderNavButton
              key={item.view}
              item={item}
              currentView={currentView}
              navigate={navigate}
            />
          ))}

          <AuthButtons
            user={user}
            currentView={currentView}
            navigate={navigate}
            handleLogout={handleLogout}
          />

          <Button
            onClick={toggleTheme}
            variant="ghost"
            className="text-white hover:bg-blue-800"
            size="icon"
            aria-label="تبديل السمة"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </Button>
        </nav>
      </div>
    </div>
  </header>
);
