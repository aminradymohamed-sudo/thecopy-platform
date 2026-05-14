"use client";

/**
 * @module useSessionPersistence
 * @description هوك حفظ واسترجاع جلسات العصف الذهني من التخزين المحلي
 *
 * السبب: يمنع فقدان الجلسات عند إعادة تحميل الصفحة
 * ويتيح للمستخدم الرجوع لجلسات سابقة
 */

import { useState, useCallback, useEffect } from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import type { Session, DebateMessage } from "../types";

/**
 * مفاتيح التخزين — الإصدار الجديد بادئة namespace واضحة
 * المفاتيح القديمة محتفظ بها للترحيل الصامت عند أول قراءة
 */
const STORAGE_KEY = "the-copy.brainstorm.archive.v2";
const STORAGE_KEY_LEGACY = "brainstorm_sessions";
const STORAGE_KEY_LEGACY_NAMESPACED = "the-copy.brainstorm.sessions.v1";
const CURRENT_BRAINSTORM_POINTER_KEY = "the-copy.brainstorm.active.v2";
const CURRENT_BRAINSTORM_POINTER_KEY_LEGACY = "brainstorm_current_session";
const CURRENT_BRAINSTORM_POINTER_KEY_LEGACY_NAMESPACED =
  "the-copy.brainstorm.current-session.v1";

/** جلسة محفوظة مع بيانات النقاش */
export interface SavedSession {
  session: Session;
  messages: DebateMessage[];
  savedAt: string;
}

/** قائمة الجلسات المحفوظة */
interface SessionStore {
  sessions: SavedSession[];
  version: number;
}

interface PersistedSavedSession {
  session: Omit<Session, "startTime"> & {
    startTime: string;
  };
  messages: (Omit<DebateMessage, "timestamp"> & {
    timestamp: string;
  })[];
  savedAt: string;
}

interface BrainstormPersistenceSnapshot {
  sessions: PersistedSavedSession[];
  currentSessionId: string | null;
  version: number;
}

function encodeText(value: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const bytes = new TextEncoder().encode(value);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
      ""
    );
    return window.btoa(binary);
  }

  return Buffer.from(value, "utf8").toString("base64");
}

function decodeText(value: string): string | null {
  try {
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      const binary = window.atob(value);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }

    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function parseStoredJson(value: string): unknown {
  const decoded = value.trim().startsWith("{") ? value : decodeText(value);
  if (!decoded) {
    return null;
  }
  return JSON.parse(decoded) as unknown;
}

function serializeStore(store: SessionStore): string {
  return encodeText(
    JSON.stringify({
      sessions: store.sessions.map(serializeSavedSession),
      version: store.version,
    })
  );
}

function restoreSessionStore(value: unknown): SessionStore {
  if (!value || typeof value !== "object") {
    return { sessions: [], version: 1 };
  }

  const parsed = value as {
    sessions?: unknown;
    version?: number;
  };

  return {
    sessions: Array.isArray(parsed.sessions)
      ? parsed.sessions
          .map((session) => restoreSavedSession(session))
          .filter((session): session is SavedSession => Boolean(session))
      : [],
    version: typeof parsed.version === "number" ? parsed.version : 1,
  };
}

function removeLegacyStorageKeys(): void {
  localStorage.removeItem(STORAGE_KEY_LEGACY);
  localStorage.removeItem(STORAGE_KEY_LEGACY_NAMESPACED);
  localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY_LEGACY);
  localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY_LEGACY_NAMESPACED);
}

function writeCurrentSessionIdToStorage(id: string | null): void {
  if (typeof window === "undefined") return;

  if (id) {
    localStorage.setItem(CURRENT_BRAINSTORM_POINTER_KEY, encodeText(id));
  } else {
    localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY);
  }
  localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY_LEGACY);
  localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY_LEGACY_NAMESPACED);
}

function migrateLegacyStoreFromStorage(): string | null {
  const legacy =
    localStorage.getItem(STORAGE_KEY_LEGACY_NAMESPACED) ??
    localStorage.getItem(STORAGE_KEY_LEGACY);

  if (!legacy) {
    return null;
  }

  try {
    const migratedStore = restoreSessionStore(parseStoredJson(legacy));
    if (migratedStore.sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY, serializeStore(migratedStore));
    }
    removeLegacyStorageKeys();
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function restoreSavedSession(value: unknown): SavedSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const saved = value as Partial<PersistedSavedSession>;
  if (
    !saved.session ||
    typeof saved.session !== "object" ||
    typeof saved.session.id !== "string" ||
    typeof saved.session.brief !== "string" ||
    typeof saved.session.phase !== "number" ||
    typeof saved.session.status !== "string" ||
    typeof saved.session.startTime !== "string" ||
    !Array.isArray(saved.session.activeAgents) ||
    !Array.isArray(saved.messages) ||
    typeof saved.savedAt !== "string"
  ) {
    return null;
  }

  return {
    session: {
      ...saved.session,
      startTime: new Date(saved.session.startTime),
    },
    messages: saved.messages
      .map((message) => {
        if (
          !message ||
          typeof message !== "object" ||
          typeof message.agentId !== "string" ||
          typeof message.agentName !== "string" ||
          typeof message.message !== "string" ||
          typeof message.timestamp !== "string" ||
          typeof message.type !== "string"
        ) {
          return null;
        }

        return {
          ...message,
          timestamp: new Date(message.timestamp),
        };
      })
      .filter((message): message is DebateMessage => Boolean(message)),
    savedAt: saved.savedAt,
  };
}

function serializeSavedSession(saved: SavedSession): PersistedSavedSession {
  return {
    session: {
      ...saved.session,
      startTime: saved.session.startTime.toISOString(),
    },
    messages: saved.messages.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    })),
    savedAt: saved.savedAt,
  };
}

function readCurrentSessionIdFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const encodedId = localStorage.getItem(CURRENT_BRAINSTORM_POINTER_KEY);
  if (encodedId) return decodeText(encodedId);

  // ترحيل صامت: نقل من المفتاح القديم إلى الجديد عند أول قراءة
  const legacyId =
    localStorage.getItem(CURRENT_BRAINSTORM_POINTER_KEY_LEGACY_NAMESPACED) ??
    localStorage.getItem(CURRENT_BRAINSTORM_POINTER_KEY_LEGACY);
  if (legacyId) {
    try {
      writeCurrentSessionIdToStorage(legacyId);
    } catch {
      // تجاهل أخطاء التخزين
    }
    return legacyId;
  }

  return null;
}

async function persistRemoteStore(store: SessionStore): Promise<void> {
  await persistRemoteAppState<BrainstormPersistenceSnapshot>("brain-storm-ai", {
    sessions: store.sessions.map(serializeSavedSession),
    currentSessionId: readCurrentSessionIdFromStorage(),
    version: store.version,
  });
}

/**
 * قراءة المخزن من localStorage
 */
function readStore(): SessionStore {
  if (typeof window === "undefined") {
    return { sessions: [], version: 1 };
  }

  try {
    let raw = localStorage.getItem(STORAGE_KEY);

    // ترحيل صامت: قراءة المفتاح القديم ونقله إلى الجديد عند أول استخدام
    raw ??= migrateLegacyStoreFromStorage();

    if (!raw) return { sessions: [], version: 1 };

    return restoreSessionStore(parseStoredJson(raw));
  } catch {
    return { sessions: [], version: 1 };
  }
}

/**
 * كتابة المخزن إلى localStorage
 */
function writeStore(store: SessionStore): void {
  if (typeof window === "undefined") return;

  try {
    if (store.sessions.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, serializeStore(store));
    }
    localStorage.removeItem(STORAGE_KEY_LEGACY);
    localStorage.removeItem(STORAGE_KEY_LEGACY_NAMESPACED);
  } catch {
    // تجاهل أخطاء الكتابة (مساحة ممتلئة)
  }
}

export function useSessionPersistence() {
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(
    () => readStore().sessions
  );
  const [isLoaded, setIsLoaded] = useState(false);

  /** تحميل الجلسات المحفوظة عند التهيئة */
  useEffect(() => {
    let cancelled = false;
    const localStore = readStore();

    void loadRemoteAppState<BrainstormPersistenceSnapshot>("brain-storm-ai")
      .then((snapshot) => {
        if (cancelled || !snapshot) {
          return;
        }

        const remoteSessions = Array.isArray(snapshot.sessions)
          ? snapshot.sessions
              .map((session) => restoreSavedSession(session))
              .filter((session): session is SavedSession => Boolean(session))
          : [];

        const nextStore: SessionStore =
          remoteSessions.length > 0
            ? {
                sessions: remoteSessions,
                version:
                  typeof snapshot.version === "number" ? snapshot.version : 1,
              }
            : localStore;

        writeStore(nextStore);
        writeCurrentSessionIdToStorage(snapshot.currentSessionId);

        setSavedSessions(nextStore.sessions);
      })
      .catch(() => {
        /* empty */
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * حفظ جلسة حالية
   */
  const saveSession = useCallback(
    (session: Session, messages: DebateMessage[]): void => {
      const savedSession: SavedSession = {
        session: {
          ...session,
          startTime: session.startTime,
        },
        messages: messages.map((m) => ({
          ...m,
          timestamp: m.timestamp,
        })),
        savedAt: new Date().toISOString(),
      };

      const store = readStore();

      // تحديث الجلسة إذا كانت موجودة أو إضافتها
      const existingIndex = store.sessions.findIndex(
        (s) => s.session.id === session.id
      );
      if (existingIndex >= 0) {
        store.sessions[existingIndex] = savedSession;
      } else {
        store.sessions.unshift(savedSession);
      }

      // الاحتفاظ بآخر 20 جلسة فقط
      if (store.sessions.length > 20) {
        store.sessions = store.sessions.slice(0, 20);
      }

      writeStore(store);
      setSavedSessions([...store.sessions]);
      void persistRemoteStore(store).catch(() => {
        /* empty */
      });
    },
    []
  );

  /**
   * حذف جلسة محفوظة
   */
  const deleteSession = useCallback((sessionId: string): void => {
    const store = readStore();
    store.sessions = store.sessions.filter((s) => s.session.id !== sessionId);
    writeStore(store);
    setSavedSessions([...store.sessions]);
    void persistRemoteStore(store).catch(() => {
      /* empty */
    });
  }, []);

  /**
   * تحميل جلسة محفوظة
   */
  const loadSession = useCallback((sessionId: string): SavedSession | null => {
    const store = readStore();
    return store.sessions.find((s) => s.session.id === sessionId) ?? null;
  }, []);

  /**
   * مسح جميع الجلسات
   */
  const clearAllSessions = useCallback((): void => {
    writeStore({ sessions: [], version: 1 });
    setSavedSessions([]);
    writeCurrentSessionIdToStorage(null);
    void persistRemoteAppState<BrainstormPersistenceSnapshot>(
      "brain-storm-ai",
      {
        sessions: [],
        currentSessionId: null,
        version: 1,
      }
    ).catch(() => {
      /* empty */
    });
  }, []);

  /**
   * حفظ معرّف الجلسة الحالية
   */
  const setCurrentSessionId = useCallback((id: string | null): void => {
    if (typeof window === "undefined") return;
    writeCurrentSessionIdToStorage(id);

    const store = readStore();
    void persistRemoteAppState<BrainstormPersistenceSnapshot>(
      "brain-storm-ai",
      {
        sessions: store.sessions.map(serializeSavedSession),
        currentSessionId: id,
        version: store.version,
      }
    ).catch(() => {
      /* empty */
    });
  }, []);

  /**
   * استرجاع معرّف الجلسة الحالية
   */
  const getCurrentSessionId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    return readCurrentSessionIdFromStorage();
  }, []);

  return {
    savedSessions,
    isLoaded,
    saveSession,
    deleteSession,
    loadSession,
    clearAllSessions,
    setCurrentSessionId,
    getCurrentSessionId,
  };
}
