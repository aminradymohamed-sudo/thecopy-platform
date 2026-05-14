import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WritingEditor } from "@/app/(main)/arabic-creative-writing-studio/components/WritingEditor";

import type { WritingEditorProps } from "@/app/(main)/arabic-creative-writing-studio/components/WritingEditor";
import type {
  AppSettings,
  CreativeProject,
} from "@/app/(main)/arabic-creative-writing-studio/types";

const SETTINGS: AppSettings = {
  language: "ar",
  theme: "dark",
  textDirection: "rtl",
  fontSize: "medium",
  autoSave: false,
  autoSaveInterval: 30000,
  geminiModel: "gemini-2.5-pro",
  geminiTemperature: 0.7,
  geminiMaxTokens: 8192,
};

function makeProject(
  overrides: Partial<CreativeProject> = {}
): CreativeProject {
  return {
    id: "project-1",
    title: "مشروع اختبار",
    content: "نص أولي",
    promptId: "",
    genre: "cross_genre",
    creativeTone: "balanced",
    wordCount: 2,
    characterCount: 7,
    paragraphCount: 1,
    createdAt: new Date("2026-05-04T08:00:00.000Z"),
    updatedAt: new Date("2026-05-04T08:00:00.000Z"),
    tags: [],
    isCompleted: false,
    ...overrides,
  };
}

function renderEditor(
  options: {
    project?: CreativeProject;
    analysisAvailable?: boolean;
    analysisBlockedReason?: string;
  } = {}
) {
  const onProjectChange = vi.fn();
  const onSave = vi.fn();
  const onAnalyze = vi.fn().mockResolvedValue(null);
  const onExport = vi.fn().mockResolvedValue({
    success: true,
    format: "txt",
    filename: "project.txt",
    message: "تم التصدير",
  });
  const onOpenSettings = vi.fn();

  function Harness() {
    const [project, setProject] = useState(options.project ?? makeProject());
    const handleProjectChange: WritingEditorProps["onProjectChange"] = (
      nextProject
    ) => {
      onProjectChange(nextProject);
      setProject(nextProject);
    };
    const handleSave: WritingEditorProps["onSave"] = (nextProject) => {
      onSave(nextProject);
      setProject(nextProject);
    };

    return (
      <WritingEditor
        project={project}
        selectedPrompt={null}
        onProjectChange={handleProjectChange}
        onSave={handleSave}
        onAnalyze={onAnalyze}
        onExport={onExport}
        onOpenSettings={onOpenSettings}
        analysisAvailable={options.analysisAvailable ?? true}
        analysisBlockedReason={
          options.analysisBlockedReason ??
          "تحليل النص يحتاج مفتاح Gemini صالحاً."
        }
        activeChallenge={null}
        settings={SETTINGS}
        loading={false}
      />
    );
  }

  render(<Harness />);

  return {
    onAnalyze,
    onOpenSettings,
    onProjectChange,
    onSave,
  };
}

describe("WritingEditor behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/arabic-creative-writing-studio");
  });

  it("blocks saving an empty draft with validation instead of success", () => {
    const { onSave } = renderEditor({
      project: makeProject({ content: "", wordCount: 0, characterCount: 0 }),
    });

    fireEvent.click(screen.getByRole("button", { name: /حفظ$/ }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("أضف محتوى قبل حفظ المشروع.")).toBeInTheDocument();
    expect(
      screen.queryByText("تم حفظ المشروع يدوياً.")
    ).not.toBeInTheDocument();
  });

  it("keeps analysis clickable and validates empty content before the API key", () => {
    const { onAnalyze } = renderEditor({
      project: makeProject({ content: "", wordCount: 0, characterCount: 0 }),
      analysisAvailable: false,
    });

    const analyzeButton = screen.getByRole("button", { name: /تحليل النص/ });

    expect(analyzeButton).not.toBeDisabled();

    fireEvent.click(analyzeButton);

    expect(onAnalyze).not.toHaveBeenCalled();
    expect(
      screen.getByText("أضف محتوى أولاً قبل تشغيل التحليل.")
    ).toBeInTheDocument();
  });

  it("shows the API key message after non-empty analysis without a key", () => {
    const blockedReason = "تحليل النص يحتاج مفتاح Gemini صالحاً.";
    const { onAnalyze } = renderEditor({
      project: makeProject({ content: "نص فعلي للتحليل" }),
      analysisAvailable: false,
      analysisBlockedReason: blockedReason,
    });

    fireEvent.click(screen.getByRole("button", { name: /تحليل النص/ }));

    expect(onAnalyze).not.toHaveBeenCalled();
    expect(screen.getByText(blockedReason)).toBeInTheDocument();
  });

  it("imports supported text files into the editor", async () => {
    const { onProjectChange } = renderEditor({
      project: makeProject({ content: "" }),
    });
    const file = new File(["نص مستورد من ملف"], "draft.txt", {
      type: "text/plain",
    });

    fireEvent.change(screen.getByLabelText("استيراد ملف نصي"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByLabelText("محرر النص الإبداعي")).toHaveValue(
        "نص مستورد من ملف"
      );
    });
    expect(onProjectChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: "نص مستورد من ملف" })
    );
  });

  it("rejects unsupported file imports without changing content", () => {
    renderEditor({
      project: makeProject({ content: "نص محفوظ قبل الرفع" }),
    });
    const file = new File(["payload"], "payload.exe", {
      type: "application/octet-stream",
    });

    fireEvent.change(screen.getByLabelText("استيراد ملف نصي"), {
      target: { files: [file] },
    });

    expect(screen.getByLabelText("محرر النص الإبداعي")).toHaveValue(
      "نص محفوظ قبل الرفع"
    );
    expect(
      screen.getByText("صيغة الملف غير مدعومة. استخدم ملفاً نصياً فقط.")
    ).toBeInTheDocument();
  });

  it("resets the draft after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onProjectChange } = renderEditor({
      project: makeProject({ content: "نص قبل المسح" }),
    });

    fireEvent.click(screen.getByRole("button", { name: "بدء جديد" }));

    await waitFor(() => {
      expect(screen.getByLabelText("محرر النص الإبداعي")).toHaveValue("");
    });
    expect(onProjectChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: "مسودة جديدة", content: "" })
    );
    expect(screen.getByText("تم مسح المسودة الحالية.")).toBeInTheDocument();
  });

  it("changes creative tone without clearing the current text", async () => {
    const { onProjectChange } = renderEditor({
      project: makeProject({ content: "نص ثابت قبل تغيير النبرة" }),
    });

    fireEvent.change(
      screen.getByRole("combobox", { name: "النبرة الإبداعية" }),
      { target: { value: "dramatic" } }
    );

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "النبرة الإبداعية" })
      ).toHaveValue("dramatic");
    });
    expect(screen.getByLabelText("محرر النص الإبداعي")).toHaveValue(
      "نص ثابت قبل تغيير النبرة"
    );
    expect(onProjectChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        creativeTone: "dramatic",
        content: "نص ثابت قبل تغيير النبرة",
      })
    );
  });

  it("copies a clean share link without sensitive query data", async () => {
    let copiedShareLink = "";
    const writeText = vi.fn((value: string) => {
      copiedShareLink = value;
      return Promise.resolve();
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.history.replaceState(
      {},
      "",
      "/arabic-creative-writing-studio?token=secret&geminiApiKey=secret#draft"
    );
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "مشاركة" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });

    const cleanUrl = new URL(copiedShareLink);
    expect(cleanUrl.pathname).toBe("/arabic-creative-writing-studio");
    expect(cleanUrl.search).toBe("");
    expect(cleanUrl.hash).toBe("");
    expect(copiedShareLink).not.toMatch(/token|auth|session|key|gemini/i);
  });
});
