"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

import { GeminiService } from "@/ai/gemini-service";
import {
  ACTIVE_WEEKLY_CHALLENGE,
  FEATURED_DAILY_PROMPT,
  type FeaturedWeeklyChallenge,
} from "@/app/(main)/arabic-creative-writing-studio/lib/featured-content";
import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import { restoreProject, persistProject } from "../lib/studio/project-helpers";
import { buildTextAnalysis } from "../lib/studio/text-analysis";

import type {
  CreativeWritingStudioSnapshot,
  StudioView,
  NotificationState,
  PersistedCreativeProject,
} from "../types/studio";
import type {
  ExportFormat,
  ExportResult,
} from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import type {
  CreativeProject,
  CreativePrompt,
  AppSettings,
  CreativeGenre,
  WritingTechnique,
  TextAnalysis,
} from "@/app/(main)/arabic-creative-writing-studio/types";

const DEFAULT_SETTINGS: AppSettings = {
  language: "ar",
  theme: "dark",
  textDirection: "rtl",
  fontSize: "medium",
  autoSave: true,
  autoSaveInterval: 30000,
  geminiModel: "gemini-2.5-pro",
  geminiTemperature: 0.7,
  geminiMaxTokens: 8192,
};

const LOCAL_SNAPSHOT_KEY =
  "the-copy:arabic-creative-writing-studio:snapshot:v1";

interface LocalSnapshotEnvelope {
  savedAt: string;
  snapshot: CreativeWritingStudioSnapshot;
}

function buildSettings(initialSettings?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  };
}

function sanitizeSettingsForPersistence(
  settings: Partial<AppSettings>
): Partial<AppSettings> {
  const normalizedSettings = buildSettings(settings);
  return {
    language: normalizedSettings.language,
    theme: normalizedSettings.theme,
    textDirection: normalizedSettings.textDirection,
    fontSize: normalizedSettings.fontSize,
    autoSave: normalizedSettings.autoSave,
    autoSaveInterval: normalizedSettings.autoSaveInterval,
  };
}

function getProjectTime(project?: PersistedCreativeProject | null): number {
  if (!project) return 0;
  const updatedAt = new Date(project.updatedAt).getTime();
  return Number.isFinite(updatedAt) ? updatedAt : 0;
}

function getSnapshotActivityTime(
  snapshot?: CreativeWritingStudioSnapshot | null
): number {
  if (!snapshot) return 0;
  return Math.max(
    getProjectTime(snapshot.currentProject),
    ...snapshot.projects.map((project) => getProjectTime(project))
  );
}

function hasMeaningfulSnapshot(
  snapshot?: CreativeWritingStudioSnapshot | null
): snapshot is CreativeWritingStudioSnapshot {
  if (!snapshot) return false;
  return [
    snapshot.currentProject !== null,
    snapshot.projects.length > 0,
    snapshot.selectedPrompt !== null,
  ].some(Boolean);
}

function selectSnapshot(
  localSnapshot: CreativeWritingStudioSnapshot | null,
  remoteSnapshot: CreativeWritingStudioSnapshot | null
): CreativeWritingStudioSnapshot | null {
  if (!hasMeaningfulSnapshot(localSnapshot)) return remoteSnapshot;
  if (!hasMeaningfulSnapshot(remoteSnapshot)) return localSnapshot;

  return getSnapshotActivityTime(remoteSnapshot) >=
    getSnapshotActivityTime(localSnapshot)
    ? remoteSnapshot
    : localSnapshot;
}

function readLocalSnapshot(): CreativeWritingStudioSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const rawSnapshot = window.localStorage.getItem(LOCAL_SNAPSHOT_KEY);
    if (!rawSnapshot) return null;

    const envelope = JSON.parse(rawSnapshot) as Partial<LocalSnapshotEnvelope>;
    return envelope.snapshot ?? null;
  } catch {
    return null;
  }
}

function writeLocalSnapshot(snapshot: CreativeWritingStudioSnapshot): void {
  if (typeof window === "undefined") return;

  const envelope: LocalSnapshotEnvelope = {
    savedAt: new Date().toISOString(),
    snapshot: {
      ...snapshot,
      settings: sanitizeSettingsForPersistence(snapshot.settings),
    },
  };

  try {
    window.localStorage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(envelope));
  } catch {
    /* empty */
  }
}

function buildChallengeProject(): CreativeProject {
  const prompt = ACTIVE_WEEKLY_CHALLENGE.prompt;
  return {
    id: `challenge_${Date.now()}`,
    title: prompt.title,
    content: "",
    promptId: prompt.id,
    genre: prompt.genre,
    creativeTone: "balanced",
    wordCount: 0,
    characterCount: 0,
    paragraphCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [...prompt.tags, ACTIVE_WEEKLY_CHALLENGE.id],
    isCompleted: false,
  };
}

function buildNewProject(prompt?: CreativePrompt): CreativeProject {
  return {
    id: `project_${Date.now()}`,
    title: prompt ? prompt.title : "مشروع جديد",
    content: "",
    promptId: prompt?.id ?? "",
    genre: prompt?.genre ?? "cross_genre",
    creativeTone: "balanced",
    wordCount: 0,
    characterCount: 0,
    paragraphCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: prompt?.tags ?? [],
    isCompleted: false,
  };
}

async function runAnalyzeText(
  geminiService: GeminiService,
  text: string
): Promise<{ success: boolean; data?: TextAnalysis; error?: string }> {
  const response = await geminiService.analyzeText(text);
  if (response.success) {
    return { success: true, data: buildTextAnalysis(text, response.data) };
  }
  return { success: false, error: response.error ?? "فشل في تحليل النص" };
}

async function runEnhancePrompt(
  geminiService: GeminiService,
  prompt: string,
  genre: CreativeGenre,
  technique: WritingTechnique
): Promise<{ success: boolean; data?: string; error?: string }> {
  const response = await geminiService.enhancePrompt(prompt, genre, technique);
  if (response.success && typeof response.data === "string") {
    return { success: true, data: response.data };
  }
  return {
    success: false,
    error: response.error ?? "فشل في تحسين المحفز",
  };
}

interface UseCreativeStudioProps {
  initialSettings?: Partial<AppSettings>;
  showNotification: (type: NotificationState["type"], message: string) => void;
  analysisBlockedReason: string;
  exportProjectFn: (
    project: CreativeProject,
    format: ExportFormat
  ) => ExportResult;
}

export function useCreativeStudio({
  initialSettings,
  showNotification,
  analysisBlockedReason,
  exportProjectFn,
}: UseCreativeStudioProps) {
  const [currentView, setCurrentView] = useState<StudioView>("home");
  const [currentProject, setCurrentProject] = useState<CreativeProject | null>(
    null
  );
  const [selectedPrompt, setSelectedPrompt] = useState<CreativePrompt | null>(
    null
  );
  const [projects, setProjects] = useState<CreativeProject[]>([]);
  const [activeChallenge, setActiveChallenge] =
    useState<FeaturedWeeklyChallenge | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() =>
    buildSettings(initialSettings)
  );
  const geminiApiKey = settings.geminiApiKey?.trim() ?? "";
  const geminiService = useMemo(
    () => (geminiApiKey ? new GeminiService(geminiApiKey) : null),
    [geminiApiKey]
  );
  const [isRemoteStateReady, setIsRemoteStateReady] = useState(false);
  const [isLocalStateReady, setIsLocalStateReady] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

  const buildSnapshot = useCallback(
    (): CreativeWritingStudioSnapshot => ({
      currentView,
      currentProject: currentProject ? persistProject(currentProject) : null,
      selectedPrompt,
      projects: projects.map(persistProject),
      settings: sanitizeSettingsForPersistence(settings),
    }),
    [currentProject, currentView, projects, selectedPrompt, settings]
  );

  const applySnapshot = useCallback(
    (snapshot: CreativeWritingStudioSnapshot | null) => {
      if (!snapshot) return;
      setCurrentView(snapshot.currentView ?? "home");
      setProjects(
        (snapshot.projects ?? [])
          .map((project) => restoreProject(project))
          .filter((project): project is CreativeProject => Boolean(project))
      );
      setCurrentProject(restoreProject(snapshot.currentProject));
      setSelectedPrompt(snapshot.selectedPrompt ?? null);
      setSettings(buildSettings(snapshot.settings));
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const localSnapshot = readLocalSnapshot();
    startTransition(() => {
      applySnapshot(localSnapshot);
      setIsLocalStateReady(true);
    });

    void loadRemoteAppState<CreativeWritingStudioSnapshot>(
      "arabic-creative-writing-studio"
    )
      .then((snapshot) => {
        if (cancelled) return;
        startTransition(() => {
          applySnapshot(selectSnapshot(localSnapshot, snapshot));
        });
      })
      .catch(() => {
        /* empty */
      })
      .finally(() => {
        if (!cancelled) setIsRemoteStateReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [applySnapshot]);

  useEffect(() => {
    if (!isLocalStateReady) return;
    const snapshot = buildSnapshot();
    writeLocalSnapshot(snapshot);

    if (!isRemoteStateReady) return;

    const timeoutId = window.setTimeout(() => {
      void persistRemoteAppState<CreativeWritingStudioSnapshot>(
        "arabic-creative-writing-studio",
        snapshot
      ).catch(() => {
        /* empty */
      });
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [buildSnapshot, isLocalStateReady, isRemoteStateReady]);

  const saveProject = useCallback(
    (project: CreativeProject) => {
      const projectToSave = { ...project, updatedAt: new Date() };
      const existingIndex = projects.findIndex((p) => p.id === project.id);
      const nextProjects =
        existingIndex >= 0
          ? projects.map((item) =>
              item.id === project.id ? projectToSave : item
            )
          : [...projects, projectToSave];

      setProjects(nextProjects);
      setCurrentProject(projectToSave);
      writeLocalSnapshot({
        currentView,
        currentProject: persistProject(projectToSave),
        selectedPrompt,
        projects: nextProjects.map(persistProject),
        settings: sanitizeSettingsForPersistence(settings),
      });
      showNotification("success", "تم حفظ المشروع بنجاح 🎉");
    },
    [currentView, projects, selectedPrompt, settings, showNotification]
  );

  const createNewProject = useCallback((prompt?: CreativePrompt) => {
    setCurrentProject(buildNewProject(prompt));
    setSelectedPrompt(prompt ?? null);
    setActiveChallenge(null);
    setCurrentView("editor");
  }, []);

  const startDailyPrompt = useCallback(() => {
    createNewProject(FEATURED_DAILY_PROMPT.prompt);
    showNotification(
      "info",
      `تم فتح محرر جديد بمحفز اليوم: ${FEATURED_DAILY_PROMPT.prompt.title}`
    );
  }, [createNewProject, showNotification]);

  const startWeeklyChallenge = useCallback(() => {
    setCurrentProject(buildChallengeProject());
    setSelectedPrompt(ACTIVE_WEEKLY_CHALLENGE.prompt);
    setActiveChallenge(ACTIVE_WEEKLY_CHALLENGE);
    setCurrentView("editor");
    showNotification(
      "info",
      `تم فتح ${ACTIVE_WEEKLY_CHALLENGE.title} مع المتطلبات داخل المحرر.`
    );
  }, [showNotification]);

  const openProject = useCallback(
    (projectId: string) => {
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        showNotification("error", "المشروع المطلوب لم يعد متوفراً");
        return;
      }
      setCurrentProject(project);
      setSelectedPrompt(null);
      setActiveChallenge(null);
      setCurrentView("editor");
      showNotification("info", "تم فتح المشروع المحفوظ");
    },
    [projects, showNotification]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((previous) =>
        previous.filter((project) => project.id !== projectId)
      );
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        setActiveChallenge(null);
      }
      showNotification("info", "تم حذف المشروع من الأرشيف المحلي للمساحة");
    },
    [currentProject?.id, showNotification]
  );

  const analyzeText = useCallback(
    async (text: string): Promise<TextAnalysis | null> => {
      if (!geminiService) {
        showNotification("warning", analysisBlockedReason);
        return null;
      }
      setLoading(true);
      try {
        const result = await runAnalyzeText(geminiService, text);
        if (result.success) {
          showNotification("success", "تم تحليل النص بنجاح 📊");
          return result.data ?? null;
        }
        showNotification("error", result.error ?? "فشل في تحليل النص");
        return null;
      } catch {
        showNotification("error", "حدث خطأ أثناء تحليل النص");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [analysisBlockedReason, geminiService, showNotification]
  );

  const enhancePrompt = useCallback(
    async (
      prompt: string,
      genre: CreativeGenre,
      technique: WritingTechnique
    ) => {
      if (!geminiService) {
        showNotification("warning", "يرجى إعداد مفتاح Gemini API أولاً");
        return null;
      }
      setLoading(true);
      try {
        const result = await runEnhancePrompt(
          geminiService,
          prompt,
          genre,
          technique
        );
        if (result.success) {
          showNotification("success", "تم تحسين المحفز بنجاح 🚀");
          return result.data ?? null;
        }
        showNotification("error", result.error ?? "فشل في تحسين المحفز");
        return null;
      } catch {
        showNotification("error", "حدث خطأ أثناء تحسين المحفز");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [geminiService, showNotification]
  );

  const exportProject = useCallback(
    (project: CreativeProject, format: ExportFormat) => {
      const result = exportProjectFn(project, format);
      showNotification(result.success ? "success" : "error", result.message);
      return result;
    },
    [exportProjectFn, showNotification]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      showNotification("success", "تم حفظ الإعدادات ⚙️");
    },
    [showNotification]
  );

  return {
    currentView,
    setCurrentView,
    currentProject,
    setCurrentProject,
    selectedPrompt,
    setSelectedPrompt,
    projects,
    activeChallenge,
    setActiveChallenge,
    settings,
    isRemoteStateReady,
    loading,
    setLoading,
    saveProject,
    createNewProject,
    startDailyPrompt,
    startWeeklyChallenge,
    openProject,
    deleteProject,
    analyzeText,
    enhancePrompt,
    exportProject,
    updateSettings,
  };
}
