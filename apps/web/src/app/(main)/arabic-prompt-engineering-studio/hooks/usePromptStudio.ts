import {
  analyzePrompt,
  comparePrompts,
  generateEnhancementSuggestions,
} from "@the-copy/prompt-engineering/lib/prompt-analyzer";
import {
  defaultPromptTemplates,
  renderTemplate,
} from "@the-copy/prompt-engineering/lib/prompt-data";
import * as React from "react";

import {
  clearRemoteAppState,
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import {
  PromptEngineeringSnapshot,
  PromptHistoryEntry,
  PromptStudioLabResult,
} from "../types";
import { persistPromptHistory, restorePromptHistory } from "../utils/history";

import type {
  PromptAnalysis,
  PromptTemplate,
} from "@the-copy/prompt-engineering/types";

export type PromptComparisonResult = ReturnType<typeof comparePrompts>;

const LOCAL_SNAPSHOT_KEY = "the-copy.prompt-studio.snapshot";

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPromptComparisonResult(
  value: unknown
): value is PromptComparisonResult {
  if (!isUnknownRecord(value)) {
    return false;
  }

  const winner = value["winner"];
  const differences = value["differences"];

  return (
    isUnknownRecord(value["prompt1"]) &&
    isUnknownRecord(value["prompt2"]) &&
    (winner === 1 || winner === 2 || winner === "tie") &&
    Array.isArray(differences) &&
    differences.every((item) => typeof item === "string")
  );
}

function isLabResult(value: unknown): value is PromptStudioLabResult {
  return (
    isUnknownRecord(value) &&
    typeof value["input"] === "string" &&
    isUnknownRecord(value["analysis"]) &&
    Array.isArray(value["suggestions"]) &&
    value["suggestions"].every((item) => typeof item === "string") &&
    typeof value["ranAt"] === "string"
  );
}

function readLocalSnapshot(): PromptEngineeringSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LOCAL_SNAPSHOT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PromptEngineeringSnapshot>;

    return {
      prompt: typeof parsed.prompt === "string" ? parsed.prompt : "",
      analysis: parsed.analysis ?? null,
      activeTab:
        typeof parsed.activeTab === "string" ? parsed.activeTab : "editor",
      selectedTemplate: parsed.selectedTemplate ?? null,
      templateVariables: isUnknownRecord(parsed.templateVariables)
        ? Object.fromEntries(
            Object.entries(parsed.templateVariables).filter(
              ([, value]) => typeof value === "string"
            )
          )
        : {},
      promptHistory: Array.isArray(parsed.promptHistory)
        ? parsed.promptHistory
        : [],
      comparePrompt1:
        typeof parsed.comparePrompt1 === "string" ? parsed.comparePrompt1 : "",
      comparePrompt2:
        typeof parsed.comparePrompt2 === "string" ? parsed.comparePrompt2 : "",
      comparisonResult: isPromptComparisonResult(parsed.comparisonResult)
        ? parsed.comparisonResult
        : null,
      labInput: typeof parsed.labInput === "string" ? parsed.labInput : "",
      labResult: isLabResult(parsed.labResult) ? parsed.labResult : null,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((item) => typeof item === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function persistLocalSnapshot(snapshot: PromptEngineeringSnapshot): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function clearLocalSnapshot(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_SNAPSHOT_KEY);
}

export function usePromptStudio() {
  const [prompt, setPrompt] = React.useState("");
  const [analysis, setAnalysis] = React.useState<PromptAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("editor");
  const [selectedTemplate, setSelectedTemplate] =
    React.useState<PromptTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = React.useState<
    Record<string, string>
  >({});
  const [promptHistory, setPromptHistory] = React.useState<
    PromptHistoryEntry[]
  >([]);
  const [comparePrompt1, setComparePrompt1] = React.useState("");
  const [comparePrompt2, setComparePrompt2] = React.useState("");
  const [comparisonResult, setComparisonResult] =
    React.useState<PromptComparisonResult | null>(null);
  const [labInput, setLabInput] = React.useState("");
  const [labResult, setLabResult] =
    React.useState<PromptStudioLabResult | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [isRemoteStateReady, setIsRemoteStateReady] = React.useState(false);

  const applySnapshot = React.useCallback(
    (snapshot: PromptEngineeringSnapshot) => {
      setPrompt(snapshot.prompt ?? "");
      setAnalysis(snapshot.analysis ?? null);
      setActiveTab(snapshot.activeTab ?? "editor");
      setSelectedTemplate(snapshot.selectedTemplate ?? null);
      setTemplateVariables(snapshot.templateVariables ?? {});
      setPromptHistory(restorePromptHistory(snapshot.promptHistory));
      setComparePrompt1(snapshot.comparePrompt1 ?? "");
      setComparePrompt2(snapshot.comparePrompt2 ?? "");
      setComparisonResult(
        isPromptComparisonResult(snapshot.comparisonResult)
          ? snapshot.comparisonResult
          : null
      );
      setLabInput(snapshot.labInput ?? "");
      setLabResult(snapshot.labResult ?? null);
      setSuggestions(snapshot.suggestions ?? []);
    },
    []
  );

  React.useEffect(() => {
    let cancelled = false;
    const localSnapshot = readLocalSnapshot();

    if (localSnapshot) {
      React.startTransition(() => {
        applySnapshot(localSnapshot);
      });
    }

    void loadRemoteAppState<PromptEngineeringSnapshot>(
      "arabic-prompt-engineering-studio"
    )
      .then((snapshot) => {
        if (cancelled || !snapshot) {
          return;
        }

        React.startTransition(() => {
          applySnapshot(snapshot);
        });
      })
      .catch((error: unknown) => {
        void error;
      })
      .finally(() => {
        if (!cancelled) {
          setIsRemoteStateReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applySnapshot]);

  React.useEffect(() => {
    if (!isRemoteStateReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const snapshot: PromptEngineeringSnapshot = {
        prompt,
        analysis,
        activeTab,
        selectedTemplate,
        templateVariables,
        promptHistory: persistPromptHistory(promptHistory),
        comparePrompt1,
        comparePrompt2,
        comparisonResult,
        labInput,
        labResult,
        suggestions,
      };

      persistLocalSnapshot(snapshot);

      void persistRemoteAppState<PromptEngineeringSnapshot>(
        "arabic-prompt-engineering-studio",
        snapshot
      ).catch((error: unknown) => {
        void error;
      });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeTab,
    analysis,
    comparePrompt1,
    comparePrompt2,
    comparisonResult,
    isRemoteStateReady,
    labInput,
    labResult,
    prompt,
    promptHistory,
    selectedTemplate,
    suggestions,
    templateVariables,
  ]);

  const handleAnalyze = React.useCallback(() => {
    if (!prompt.trim()) return;

    setIsAnalyzing(true);

    setTimeout(() => {
      try {
        const result = analyzePrompt(prompt);
        setAnalysis(result);
        setSuggestions(generateEnhancementSuggestions(prompt));

        setPromptHistory((prev) => [
          { prompt, timestamp: new Date(), score: result.metrics.overallScore },
          ...prev.slice(0, 9),
        ]);
      } catch {
        setAnalysis(null);
        setSuggestions([]);
      }
      setIsAnalyzing(false);
    }, 500);
  }, [prompt]);

  const handleCopy = React.useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
  }, []);

  const handleApplyTemplate = React.useCallback(() => {
    if (!selectedTemplate) return;

    setPrompt(renderTemplate(selectedTemplate, templateVariables));
    setActiveTab("editor");
  }, [selectedTemplate, templateVariables]);

  const handleCompare = React.useCallback(() => {
    if (!comparePrompt1.trim() || !comparePrompt2.trim()) {
      setComparisonResult(null);
      return;
    }

    setComparisonResult(comparePrompts(comparePrompt1, comparePrompt2));
  }, [comparePrompt1, comparePrompt2]);

  const handleRestoreHistoryEntry = React.useCallback(
    (entry: PromptHistoryEntry) => {
      setPrompt(entry.prompt);
      setActiveTab("editor");
    },
    []
  );

  const handleClearStudio = React.useCallback(() => {
    setPrompt("");
    setAnalysis(null);
    setSelectedTemplate(null);
    setTemplateVariables({});
    setPromptHistory([]);
    setComparePrompt1("");
    setComparePrompt2("");
    setComparisonResult(null);
    setLabInput("");
    setLabResult(null);
    setSuggestions([]);
    clearLocalSnapshot();
    void clearRemoteAppState("arabic-prompt-engineering-studio").catch(
      (error: unknown) => {
        void error;
      }
    );
  }, []);

  const handleRunLab = React.useCallback(() => {
    const input = (labInput || prompt).trim();
    if (!input) {
      setLabResult(null);
      return;
    }

    const result = analyzePrompt(input);
    setLabResult({
      input,
      analysis: result,
      suggestions: generateEnhancementSuggestions(input),
      ranAt: new Date().toISOString(),
    });
  }, [labInput, prompt]);

  return {
    prompt,
    setPrompt,
    analysis,
    setAnalysis,
    isAnalyzing,
    activeTab,
    setActiveTab,
    selectedTemplate,
    setSelectedTemplate,
    templateVariables,
    setTemplateVariables,
    promptHistory,
    setPromptHistory,
    comparePrompt1,
    setComparePrompt1,
    comparePrompt2,
    setComparePrompt2,
    comparisonResult,
    setComparisonResult,
    labInput,
    setLabInput,
    labResult,
    setLabResult,
    templates: defaultPromptTemplates,
    suggestions,
    setSuggestions,
    handleAnalyze,
    handleCopy,
    handleApplyTemplate,
    handleCompare,
    handleRestoreHistoryEntry,
    handleClearStudio,
    handleRunLab,
  };
}
