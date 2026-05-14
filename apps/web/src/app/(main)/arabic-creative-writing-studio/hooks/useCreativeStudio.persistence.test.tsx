import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCreativeStudio } from "@/app/(main)/arabic-creative-writing-studio/hooks/useCreativeStudio";

import type { ExportResult } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import type {
  CreativeWritingStudioSnapshot,
  PersistedCreativeProject,
} from "@/app/(main)/arabic-creative-writing-studio/types/studio";

const { loadRemoteAppState, persistRemoteAppState } = vi.hoisted(() => ({
  loadRemoteAppState: vi.fn(),
  persistRemoteAppState: vi.fn(),
}));

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState,
  persistRemoteAppState,
}));

vi.mock("@/ai/gemini-service", () => ({
  GeminiService: class {
    analyzeText = vi.fn();
    enhancePrompt = vi.fn();
  },
}));

const LOCAL_SNAPSHOT_KEY =
  "the-copy:arabic-creative-writing-studio:snapshot:v1";

function makePersistedProject(
  overrides: Partial<PersistedCreativeProject> = {}
): PersistedCreativeProject {
  return {
    id: "project-1",
    title: "مشروع محفوظ",
    content: "نص محفوظ محلياً",
    promptId: "",
    genre: "cross_genre",
    creativeTone: "balanced",
    wordCount: 3,
    characterCount: 15,
    paragraphCount: 1,
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z",
    tags: [],
    isCompleted: false,
    ...overrides,
  };
}

function makeSnapshot(
  project: PersistedCreativeProject
): CreativeWritingStudioSnapshot {
  return {
    currentView: "editor",
    currentProject: project,
    selectedPrompt: null,
    projects: [project],
    settings: {
      language: "ar",
      theme: "dark",
      textDirection: "rtl",
      fontSize: "medium",
      autoSave: true,
      autoSaveInterval: 30000,
      geminiModel: "gemini-2.5-pro",
      geminiTemperature: 0.7,
      geminiMaxTokens: 8192,
    },
  };
}

function writeLocalSnapshot(snapshot: CreativeWritingStudioSnapshot) {
  localStorage.setItem(
    LOCAL_SNAPSHOT_KEY,
    JSON.stringify({
      savedAt: "2026-05-04T08:00:00.000Z",
      snapshot,
    })
  );
}

function renderStudioHook() {
  const exportProjectFn = vi.fn(
    (): ExportResult => ({
      success: true,
      format: "txt",
      filename: "project.txt",
      message: "تم التصدير",
    })
  );

  return renderHook(() =>
    useCreativeStudio({
      showNotification: vi.fn(),
      analysisBlockedReason: "تحليل النص يحتاج مفتاح Gemini صالحاً.",
      exportProjectFn,
    })
  );
}

describe("useCreativeStudio local persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    loadRemoteAppState.mockResolvedValue(null);
    persistRemoteAppState.mockResolvedValue(undefined);
  });

  it("restores a locally saved project after remounting", async () => {
    const uniqueText = "نص فريد يعود بعد تحديث الصفحة";
    writeLocalSnapshot(
      makeSnapshot(
        makePersistedProject({
          content: uniqueText,
          updatedAt: "2026-05-04T09:00:00.000Z",
        })
      )
    );

    const { result } = renderStudioHook();

    await waitFor(() => {
      expect(result.current.currentProject?.content).toBe(uniqueText);
    });
    expect(result.current.currentView).toBe("editor");
  });

  it("keeps draft text locally when remote persistence is offline", async () => {
    const offlineText = "نص كتب أثناء انقطاع الشبكة";
    loadRemoteAppState.mockRejectedValue(new Error("offline"));
    persistRemoteAppState.mockRejectedValue(new Error("offline"));

    const firstMount = renderStudioHook();

    await waitFor(() => {
      expect(firstMount.result.current.isRemoteStateReady).toBe(true);
    });

    act(() => {
      firstMount.result.current.createNewProject();
    });

    await waitFor(() => {
      expect(firstMount.result.current.currentProject).not.toBeNull();
    });

    act(() => {
      firstMount.result.current.setCurrentProject({
        ...firstMount.result.current.currentProject!,
        content: offlineText,
        wordCount: 5,
        characterCount: offlineText.length,
        paragraphCount: 1,
        updatedAt: new Date("2026-05-04T10:00:00.000Z"),
      });
    });

    await waitFor(() => {
      expect(localStorage.getItem(LOCAL_SNAPSHOT_KEY)).toContain(offlineText);
    });
    expect(localStorage.getItem(LOCAL_SNAPSHOT_KEY)).not.toMatch(
      /gemini|token|secret|auth|session|key/i
    );

    firstMount.unmount();
    loadRemoteAppState.mockResolvedValue(null);

    const secondMount = renderStudioHook();

    await waitFor(() => {
      expect(secondMount.result.current.currentProject?.content).toBe(
        offlineText
      );
    });
  });
});
