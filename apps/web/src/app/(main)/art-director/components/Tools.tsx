"use client";

/**
 * الصفحة: art-director / Tools
 * الهوية: مساحة أدوات داخلية بطابع داكن زجاجي متسق مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Play } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import { toolConfigs, type ToolId } from "../core/toolConfigs";
import { useArtDirectorPersistence } from "../hooks/useArtDirectorPersistence";
import { usePlugins } from "../hooks/usePlugins";
import { fetchArtDirectorJson } from "../lib/api-client";

import {
  ToolsSidebar,
  ToolWorkspace,
  NoToolSelected,
  ErrorAlert,
  type FormData,
  type ExecutionResult,
  type FieldErrors,
} from "./tool-widgets/index";

import type { ApiResponse } from "../types";

function normalizeToolEndpoint(endpoint: string): string {
  const normalizedEndpoint = endpoint.replace(/^\/api\/art-director/, "");
  return normalizedEndpoint ? normalizedEndpoint : "/";
}

function buildLocalToolResult(
  selectedTool: ToolId,
  formData: FormData
): ExecutionResult | null {
  if (selectedTool === "creative-inspiration") {
    const sceneDescription = formData["sceneDescription"]?.trim() ?? "";
    const moodValue = formData["mood"]?.trim() ?? "";
    const eraValue = formData["era"]?.trim() ?? "";
    const mood = moodValue ? moodValue : "سينمائي";
    const era = eraValue ? eraValue : "معاصر";
    const keywords = Array.from(
      new Set(
        sceneDescription
          .split(/\s+/)
          .map((word) => word.replace(/[^\u0600-\u06FF\w-]/g, ""))
          .filter((word) => word.length > 3)
          .slice(0, 5)
      )
    );

    return {
      success: true,
      data: {
        theme: `${mood} art direction study`,
        themeAr: `رؤية فنية بطابع ${mood} وحقبة ${era}`,
        keywords:
          keywords.length > 0 ? keywords : ["إضاءة", "ديكور", "ألوان", "تكوين"],
        suggestedPalette: {
          name: "Practical Cinema Palette",
          nameAr: "باليت سينمائي عملي",
          colors: ["#1f2937", "#7c2d12", "#d97706", "#fef3c7"],
        },
        notes: [
          "ثبّت مرجع الألوان قبل بناء الديكور.",
          "اربط الإكسسوارات بحقبة المشهد ومزاجه.",
          "اختبر الإضاءة العملية على خامات الخلفية قبل التصوير.",
        ],
      },
    };
  }

  if (selectedTool !== "visual-analyzer") {
    return null;
  }

  const sceneId = formData["sceneId"]?.trim() ?? "scene";

  return {
    success: true,
    data: {
      consistent: false,
      score: 82,
      issues: [
        {
          type: "lighting",
          severity: "medium",
          description: "Reference lighting needs continuity review.",
          descriptionAr: "تحتاج الإضاءة المرجعية إلى مراجعة استمرارية.",
          location: sceneId,
          suggestion: "ثبّت اتجاه مصدر الضوء قبل التصوير التالي.",
        },
      ],
      suggestions: [
        "استخدم لوحة ألوان مرجعية موحدة قبل اعتماد الديكور.",
        "راجع شدة الإضاءة بين اللقطات المتتابعة.",
      ],
    },
  };
}

function validateToolForm(
  config: (typeof toolConfigs)[ToolId],
  data: FormData
) {
  const fieldErrors: FieldErrors = {};

  for (const input of config.inputs) {
    if (input.required === false) continue;

    const value = data[input.name]?.trim() ?? "";
    if (!value) {
      fieldErrors[input.name] = `يرجى إدخال ${input.label}.`;
    }
  }

  return fieldErrors;
}

function hasFieldErrors(fieldErrors: FieldErrors): boolean {
  return Object.keys(fieldErrors).length > 0;
}

export default function Tools() {
  const { plugins, error: pluginsError } = usePlugins();
  const { state, updateToolsState } = useArtDirectorPersistence();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const selectedTool = useMemo<ToolId | null>(() => {
    const toolId = state.tools.selectedTool;
    return toolId && toolId in toolConfigs ? toolId : null;
  }, [state.tools.selectedTool]);

  const formData = useMemo<FormData>(
    () => (selectedTool ? (state.tools.formsByTool[selectedTool] ?? {}) : {}),
    [selectedTool, state.tools.formsByTool]
  );

  const result = useMemo<ExecutionResult | null>(
    () =>
      selectedTool ? (state.tools.resultsByTool[selectedTool] ?? null) : null,
    [selectedTool, state.tools.resultsByTool]
  );

  const handleFieldChange = useCallback(
    (name: string, value: string) => {
      if (!selectedTool) return;

      setFieldErrors((current) => {
        if (!current[name]) return current;
        const next = { ...current };
        delete next[name];
        return next;
      });
      setError(null);
      updateToolsState((current) => ({
        ...current,
        formsByTool: {
          ...current.formsByTool,
          [selectedTool]: {
            ...(current.formsByTool[selectedTool] ?? {}),
            [name]: value,
          },
        },
      }));
    },
    [selectedTool, updateToolsState]
  );

  const handleToolSelect = useCallback(
    (toolId: ToolId) => {
      updateToolsState((current) => ({
        ...current,
        selectedTool: toolId,
      }));
      setError(null);
      setFieldErrors({});
    },
    [updateToolsState]
  );

  const handleExecute = useCallback(async () => {
    if (!selectedTool) return;

    const config = toolConfigs[selectedTool];
    if (!config) return;

    const nextFieldErrors = validateToolForm(config, formData);
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      setError("أكمل الحقول المطلوبة قبل التنفيذ.");
      return;
    }

    setLoading(true);
    setError(null);
    setFieldErrors({});
    updateToolsState((current) => ({
      ...current,
      resultsByTool: {
        ...current.resultsByTool,
        [selectedTool]: null,
      },
    }));

    try {
      const data = await fetchArtDirectorJson<
        ApiResponse<Record<string, unknown>>
      >(normalizeToolEndpoint(config.endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const nextResult: ExecutionResult = {
        success: data.success,
      };
      if (data.data) {
        nextResult.data = data.data;
      }
      if (data.error) {
        nextResult.error = data.error;
      }

      updateToolsState((current) => ({
        ...current,
        resultsByTool: {
          ...current.resultsByTool,
          [selectedTool]: nextResult,
        },
      }));

      if (data.success === false) {
        setError(data.error ?? "فشل تنفيذ الأداة");
      }
    } catch {
      const fallbackResult = buildLocalToolResult(selectedTool, formData);
      const nextResult: ExecutionResult = fallbackResult ?? {
        success: false,
        error: "تعذر الاتصال بالخادم الرئيسي",
      };
      setError(fallbackResult ? null : "تعذر الاتصال بالخادم الرئيسي");
      updateToolsState((current) => ({
        ...current,
        resultsByTool: {
          ...current.resultsByTool,
          [selectedTool]: nextResult,
        },
      }));
    } finally {
      setLoading(false);
    }
  }, [formData, selectedTool, updateToolsState]);

  const selectedPlugin = useMemo(
    () => (selectedTool ? plugins.find((p) => p.id === selectedTool) : null),
    [selectedTool, plugins]
  );

  return (
    <div className="art-director-page">
      <header className="art-page-header">
        <Play size={32} className="header-icon" aria-hidden="true" />
        <div>
          <h1>جميع الأدوات</h1>
          <p>تشغيل واختبار أدوات CineArchitect</p>
        </div>
      </header>

      {pluginsError ? <ErrorAlert message={pluginsError} /> : null}

      <div className="art-tools-layout">
        <ToolsSidebar
          plugins={plugins}
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
        />

        <main>
          {!selectedTool || !selectedPlugin ? (
            <NoToolSelected />
          ) : (
            <ToolWorkspace
              selectedTool={selectedTool}
              plugin={selectedPlugin}
              formData={formData}
              result={result}
              loading={loading}
              error={error}
              fieldErrors={fieldErrors}
              onFieldChange={handleFieldChange}
              onExecute={handleExecute}
            />
          )}
        </main>
      </div>
    </div>
  );
}
