import {
  type Recording,
  type Script,
  type User,
  type ViewType,
} from "../types";

export const APP_LEGACY_STORAGE_KEY = "actorai-arabic.app-state";
export const APP_PREFERENCES_STORAGE_KEY = "actorai-arabic.preferences.v1";
export const APP_STORAGE_KEY = APP_PREFERENCES_STORAGE_KEY;

export interface PersistedAppState {
  currentView?: ViewType;
  theme?: "light" | "dark";
  user?: User | null;
  scripts?: Script[];
  recordings?: Recording[];
}

const VALID_VIEWS: ViewType[] = [
  "home",
  "studio",
  "dashboard",
  "login",
  "register",
  "vocal",
  "voicecoach",
  "rhythm",
  "webcam",
  "ar",
  "memorization",
];

export function canUseBrowserStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined" &&
    typeof window.history !== "undefined"
  );
}

function isValidView(value: string | null | undefined): value is ViewType {
  return Boolean(value && VALID_VIEWS.includes(value as ViewType));
}

function parseStoredState(raw: string | null): PersistedAppState {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as PersistedAppState;
    const nextState: PersistedAppState = {};

    if (isValidView(parsed.currentView)) {
      nextState.currentView = parsed.currentView;
    }

    if (parsed.theme === "dark" || parsed.theme === "light") {
      nextState.theme = parsed.theme;
    }

    return nextState;
  } catch {
    return {};
  }
}

export function readPersistedAppState(): PersistedAppState {
  if (!canUseBrowserStorage()) {
    return {};
  }

  window.localStorage.removeItem(APP_LEGACY_STORAGE_KEY);
  return parseStoredState(
    window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY)
  );
}

export function writePersistedAppState(state: PersistedAppState): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(APP_LEGACY_STORAGE_KEY);
  window.localStorage.removeItem("sentryReplaySession");
  window.sessionStorage?.removeItem("sentryReplaySession");
  window.localStorage.setItem(
    APP_PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      currentView: state.currentView,
      theme: state.theme,
    })
  );
}

export function resolveInitialView(fallback: ViewType): ViewType {
  if (typeof window === "undefined") {
    return fallback;
  }

  const viewFromUrl = new URLSearchParams(window.location.search).get("view");
  if (isValidView(viewFromUrl)) {
    return viewFromUrl;
  }

  return fallback;
}

export function syncViewToUrl(view: ViewType): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  window.history.replaceState({}, "", url.toString());
}

export function syncThemeToDocument(theme: "light" | "dark"): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
}

export function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validatePassword(value: string): boolean {
  return value.trim().length >= 8;
}

export function deriveDisplayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "المستخدم";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
