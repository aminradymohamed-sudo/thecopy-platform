/**
 * سياق المشروع الحالي — يحل مشكلة currentProjectId الفارغ
 *
 * التصميم:
 * 1. يقرأ المشروع من sessionStorage عند التحميل
 * 2. يوفر دوال setProject / clearProject لكل المكونات الفرعية
 * 3. يُزامن التغييرات مع sessionStorage تلقائياً
 * 4. يُبث حدث storage مخصص لإعلام التبويبات الأخرى
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  getCurrentProject,
  setCurrentProject as storeSet,
  clearCurrentProject as storeClear,
} from "@/lib/projectStore";
import {
  ensureProjectTaggedScenarioSnapshot,
  type TaggedScenarioSnapshot,
} from "@/lib/tagged-scenario-snapshot";

import type { Project } from "@/types/api";

/** الشكل الداخلي للمشروع المخزن */
interface StoredProject extends Project {
  scriptContent: string | null;
}

/** واجهة السياق */
interface ProjectContextValue {
  /** المشروع الحالي — null إذا لم يُختر مشروع */
  project: StoredProject | null;
  /** معرّف المشروع الحالي — سلسلة فارغة إذا لم يُختر */
  projectId: string;
  /** النسخة الموصومة الرسمية للسيناريو عند توفرها */
  taggedScenarioSnapshot: TaggedScenarioSnapshot | null;
  /** حالة ضمان النسخة الموصومة */
  taggedScenarioSnapshotStatus: "idle" | "loading" | "ready" | "error";
  /** آخر خطأ في ضمان النسخة الموصومة */
  taggedScenarioSnapshotError: string | null;
  /** تعيين المشروع الحالي */
  setProject: (project: Project) => void;
  /** مسح المشروع الحالي */
  clearProject: () => void;
  /** تشغيل ضمان النسخة الموصومة يدويًا عند الحاجة */
  ensureTaggedScenarioSnapshotForProject: () => Promise<TaggedScenarioSnapshot | null>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/** اسم الحدث المخصص للتزامن بين المكونات */
const PROJECT_CHANGE_EVENT = "directors-studio:project-changed";

let lastProjectSnapshotKey = "";
let lastProjectSnapshot: StoredProject | null = null;

function getProjectSnapshot(): StoredProject | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem("currentProject") ?? "";
  if (stored === lastProjectSnapshotKey) {
    return lastProjectSnapshot;
  }

  lastProjectSnapshotKey = stored;
  lastProjectSnapshot = getCurrentProject();
  return lastProjectSnapshot;
}

function getServerProjectSnapshot(): StoredProject | null {
  return null;
}

function subscribeToProjectChanges(onStoreChange: () => void): () => void {
  window.addEventListener(PROJECT_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(PROJECT_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const project = useSyncExternalStore(
    subscribeToProjectChanges,
    getProjectSnapshot,
    getServerProjectSnapshot
  );
  const [taggedScenarioSnapshot, setTaggedScenarioSnapshot] =
    useState<TaggedScenarioSnapshot | null>(null);
  const [taggedScenarioSnapshotStatus, setTaggedScenarioSnapshotStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const [taggedScenarioSnapshotError, setTaggedScenarioSnapshotError] =
    useState<string | null>(null);

  const projectId = project?.id ?? "";

  /** تعيين مشروع جديد */
  const setProject = useCallback((p: Project) => {
    const stored: StoredProject = {
      ...p,
      scriptContent: p.scriptContent ?? null,
    };
    storeSet(stored);
    window.dispatchEvent(new CustomEvent(PROJECT_CHANGE_EVENT));
  }, []);

  /** مسح المشروع */
  const clearProject = useCallback(() => {
    storeClear();
    setTaggedScenarioSnapshot(null);
    setTaggedScenarioSnapshotStatus("idle");
    setTaggedScenarioSnapshotError(null);
    window.dispatchEvent(new CustomEvent(PROJECT_CHANGE_EVENT));
  }, []);

  const ensureTaggedScenarioSnapshotForProject = useCallback(async () => {
    if (!project?.id || !project.scriptContent?.trim()) {
      setTaggedScenarioSnapshot(null);
      setTaggedScenarioSnapshotStatus("idle");
      setTaggedScenarioSnapshotError(null);
      return null;
    }

    setTaggedScenarioSnapshotStatus("loading");
    setTaggedScenarioSnapshotError(null);
    try {
      const result = await ensureProjectTaggedScenarioSnapshot(project);
      setTaggedScenarioSnapshot(result.snapshot);
      setTaggedScenarioSnapshotStatus("ready");
      return result.snapshot;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "فشل إنشاء النسخة الموصومة للسيناريو.";
      setTaggedScenarioSnapshot(null);
      setTaggedScenarioSnapshotStatus("error");
      setTaggedScenarioSnapshotError(message);
      return null;
    }
  }, [project]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      if (!project?.id || !project.scriptContent?.trim()) {
        setTaggedScenarioSnapshot(null);
        setTaggedScenarioSnapshotStatus("idle");
        setTaggedScenarioSnapshotError(null);
        return;
      }

      setTaggedScenarioSnapshotStatus("loading");
      setTaggedScenarioSnapshotError(null);
      try {
        const result = await ensureProjectTaggedScenarioSnapshot(project);
        if (cancelled) return;
        setTaggedScenarioSnapshot(result.snapshot);
        setTaggedScenarioSnapshotStatus("ready");
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "فشل إنشاء النسخة الموصومة للسيناريو.";
        setTaggedScenarioSnapshot(null);
        setTaggedScenarioSnapshotStatus("error");
        setTaggedScenarioSnapshotError(message);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [project]);

  return (
    <ProjectContext.Provider
      value={{
        project,
        projectId,
        taggedScenarioSnapshot,
        taggedScenarioSnapshotStatus,
        taggedScenarioSnapshotError,
        setProject,
        clearProject,
        ensureTaggedScenarioSnapshotForProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Hook للوصول لسياق المشروع
 * يرمي خطأ إذا استُخدم خارج ProjectProvider
 */
export function useCurrentProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useCurrentProject يجب استخدامه داخل ProjectProvider");
  }
  return ctx;
}
