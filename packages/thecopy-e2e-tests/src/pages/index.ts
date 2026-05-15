/**
 * فهرس Page Objects
 * يطابق الـ routes الفعلية تحت apps/web/src/app
 * المجموعتان الأساسيتان:
 *   (auth)  → /login | /register
 *   (main)  → 15 صفحة استوديو/تطبيق (مؤكَّدة من المستخدم)
 */

export { BasePage } from "./BasePage.js";
export { HomePage } from "./HomePage.js";
export { LoginPage } from "./LoginPage.js";
export { RegisterPage } from "./RegisterPage.js";
export { StudioPage } from "./StudioPage.js";

/**
 * قائمة استوديوهات (main) المؤكَّدة على المنصة
 * المصدر: apps/web/src/app/(main)
 */
export const PLATFORM_STUDIOS = [
  { slug: "actorai-arabic", label: "ActorAI Arabic" },
  { slug: "analysis", label: "Analysis" },
  { slug: "arabic-creative-writing-studio", label: "Arabic Creative Writing Studio" },
  { slug: "arabic-prompt-engineering-studio", label: "Arabic Prompt Engineering Studio" },
  { slug: "art-director", label: "Art Director" },
  { slug: "brain-storm-ai", label: "Brain Storm AI" },
  { slug: "BREAKAPP", label: "BreakApp" },
  { slug: "breakdown", label: "Breakdown" },
  { slug: "BUDGET", label: "Budget" },
  { slug: "cinematography-studio", label: "Cinematography Studio" },
  { slug: "development", label: "Development" },
  { slug: "directors-studio", label: "Directors Studio" },
  { slug: "editor", label: "Editor" },
  { slug: "styleIST", label: "StyleIST" },
  { slug: "ui", label: "UI" },
] as const;

export type PlatformStudio = (typeof PLATFORM_STUDIOS)[number];

/**
 * صفحات المصادقة المؤكَّدة
 * المصدر: apps/web/src/app/(auth)
 */
export const AUTH_PAGES = [
  { slug: "login", label: "Login", path: "/login" },
  { slug: "register", label: "Register", path: "/register" },
] as const;

export type AuthPage = (typeof AUTH_PAGES)[number];
