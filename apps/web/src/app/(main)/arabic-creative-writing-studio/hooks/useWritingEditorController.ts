"use client";

import { useCallback, useMemo, useRef } from "react";

import {
  useOperationFeed,
  useWritingAnalysis,
  useWritingProjectState,
  useWritingTimer,
} from "@/app/(main)/arabic-creative-writing-studio/hooks/useWritingEditorSupport";
import {
  buildAnalysisNarrative,
  calculateTextStats,
  getAverageQuality,
} from "@/app/(main)/arabic-creative-writing-studio/lib/studio/writing-editor-utils";

import type { WritingEditorProps } from "@/app/(main)/arabic-creative-writing-studio/components/writing-editor/types";
import type { ExportFormat } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import type {
  CreativeProject,
  CreativeTone,
} from "@/app/(main)/arabic-creative-writing-studio/types";

type ActiveWritingEditorProps = Omit<WritingEditorProps, "project"> & {
  project: NonNullable<WritingEditorProps["project"]>;
};

function readTextFile(file: File): Promise<string> {
  const textReader = (file as Blob & { text?: () => Promise<string> }).text;
  if (typeof textReader === "function") {
    return textReader.call(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read text file."));
    reader.readAsText(file);
  });
}

export function useWritingEditorController({
  project,
  onAnalyze,
  onExport,
  onProjectChange,
  onSave,
  analysisAvailable,
  analysisBlockedReason,
  settings,
}: ActiveWritingEditorProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const creativeTone = project.creativeTone ?? "balanced";
  const { operationFeed, pushOperation } = useOperationFeed();
  const { markWriting, writingTimeLabel } = useWritingTimer();
  const {
    content,
    handleContentChange,
    handleTitleChange,
    replaceDraft,
    title,
  } = useWritingProjectState({
    onProjectChange,
    onSave,
    project,
    pushOperation,
    settings,
  });
  const { analysis, analysisSnapshot, handleAnalyze, isAnalyzing } =
    useWritingAnalysis({
      analysisAvailable,
      analysisBlockedReason,
      content,
      onAnalyze,
      pushOperation,
    });

  const textStats = useMemo(() => calculateTextStats(content), [content]);
  const isAnalysisStale = Boolean(analysis && analysisSnapshot !== content);
  const analysisNarrative = useMemo(
    () => (analysis ? buildAnalysisNarrative(analysis) : null),
    [analysis]
  );

  const handleTrackedContentChange = useCallback(
    (nextContent: string) => {
      markWriting();
      handleContentChange(nextContent);
    },
    [handleContentChange, markWriting]
  );

  const buildCurrentProject = useCallback(
    (
      overrides: Partial<
        Pick<CreativeProject, "content" | "creativeTone" | "title">
      > = {}
    ): CreativeProject => {
      const nextContent = overrides.content ?? content;
      const nextTitle = overrides.title ?? title;
      const nextStats = calculateTextStats(nextContent);

      return {
        ...project,
        title: nextTitle,
        content: nextContent,
        creativeTone: overrides.creativeTone ?? creativeTone,
        wordCount: nextStats.wordCount,
        characterCount: nextStats.characterCount,
        paragraphCount: nextStats.paragraphCount,
        updatedAt: new Date(),
      };
    },
    [content, creativeTone, project, title]
  );

  const handleTrackedAnalyze = useCallback(async () => {
    const result = await handleAnalyze();
    if (!result) {
      return;
    }

    pushOperation(
      "success",
      "تحليل النص",
      `اكتمل التحليل. متوسط الجودة الحالي ${getAverageQuality(result)}/100.`
    );
  }, [handleAnalyze, pushOperation]);

  const handleSave = useCallback(() => {
    if (!content.trim()) {
      pushOperation("blocked", "حفظ المشروع", "أضف محتوى قبل حفظ المشروع.");
      return;
    }

    const updatedProject = buildCurrentProject();

    onSave(updatedProject);
    pushOperation("success", "حفظ المشروع", "تم حفظ المشروع يدوياً.");
  }, [buildCurrentProject, content, onSave, pushOperation]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      pushOperation(
        "info",
        "تصدير",
        `جاري تجهيز ملف ${format.toUpperCase()} للتنزيل.`
      );

      const result = await Promise.resolve(
        onExport(buildCurrentProject(), format)
      );
      pushOperation(
        result.success ? "success" : "error",
        "تصدير",
        result.message
      );
    },
    [buildCurrentProject, onExport, pushOperation]
  );

  const handleResetDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("هل تريد مسح المسودة الحالية؟");
      if (!confirmed) return;
    }

    replaceDraft("مسودة جديدة", "");
    pushOperation("success", "بدء جديد", "تم مسح المسودة الحالية.");
  }, [pushOperation, replaceDraft]);

  const handleImportFile = useCallback(
    (file: File | null) => {
      if (!file) return;

      const isTextFile =
        file.type === "text/plain" ||
        file.type === "text/markdown" ||
        /\.(txt|md)$/i.test(file.name);

      if (!isTextFile) {
        pushOperation(
          "blocked",
          "استيراد",
          "صيغة الملف غير مدعومة. استخدم ملفاً نصياً فقط."
        );
        return;
      }

      void readTextFile(file)
        .then((fileContent) => {
          handleTrackedContentChange(fileContent);
          pushOperation("success", "استيراد", "تم استيراد الملف النصي.");
        })
        .catch(() => {
          pushOperation("error", "استيراد", "لم تنجح قراءة الملف النصي.");
        });
    },
    [handleTrackedContentChange, pushOperation]
  );

  const handleToneChange = useCallback(
    (nextTone: CreativeTone) => {
      onProjectChange(buildCurrentProject({ creativeTone: nextTone }));
      pushOperation("info", "النبرة", "تم تحديث النبرة الإبداعية.");
    },
    [buildCurrentProject, onProjectChange, pushOperation]
  );

  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return;

    const currentUrl = new URL(window.location.href);
    currentUrl.search = "";
    currentUrl.hash = "";
    const cleanUrl = currentUrl.toString();

    const copyWithFallback = async () => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanUrl);
        return;
      }

      const textarea = document.createElement("textarea");
      textarea.value = cleanUrl;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    };

    void copyWithFallback()
      .then(() => {
        pushOperation("success", "مشاركة", "تم نسخ رابط الصفحة.");
      })
      .catch(() => {
        pushOperation("error", "مشاركة", "لم ينجح نسخ رابط الصفحة.");
      });
  }, [pushOperation]);

  return {
    analysis,
    analysisNarrative,
    content,
    creativeTone,
    editorRef,
    handleAnalyze: handleTrackedAnalyze,
    handleContentChange: handleTrackedContentChange,
    handleExport,
    handleImportFile,
    handleResetDraft,
    handleSave,
    handleShare,
    handleTitleChange,
    handleToneChange,
    isAnalysisStale,
    isAnalyzing,
    operationFeed,
    textStats,
    title,
    writingTimeLabel,
  };
}
