/**
 * Hook لإدارة حالة Pipeline متعدد المراحل (11 وضعًا).
 */

"use client";

import { useCallback, useState } from "react";

import {
  ANALYSIS_MODES,
  buildEmptyPipeline,
  type AnalysisMode,
  type PipelineStageStatus,
  type ProjectPipeline,
} from "../lib/types";

interface UsePipelineReturn {
  pipeline: ProjectPipeline;
  pipelineOrder: readonly AnalysisMode[];
  startPipeline: () => void;
  stopPipeline: () => void;
  resetStage: (mode: AnalysisMode) => void;
  setCurrentStage: (mode: AnalysisMode) => void;
  setPipeline: (next: ProjectPipeline) => void;
  updateStageStatus: (
    mode: AnalysisMode,
    status: PipelineStageStatus,
    result?: string,
    error?: string
  ) => void;
  advancePipeline: () => void;
}

export function usePipeline(): UsePipelineReturn {
  const [pipeline, setPipelineState] = useState<ProjectPipeline>(() =>
    buildEmptyPipeline()
  );

  const startPipeline = useCallback((): void => {
    setPipelineState({
      isActive: true,
      stages: buildEmptyPipeline().stages,
      currentStage: ANALYSIS_MODES[0] ?? null,
    });
  }, []);

  const stopPipeline = useCallback((): void => {
    setPipelineState((prev) => ({
      ...prev,
      isActive: false,
      currentStage: null,
    }));
  }, []);

  const updateStageStatus = useCallback(
    (
      mode: AnalysisMode,
      status: PipelineStageStatus,
      result?: string,
      error?: string
    ): void => {
      setPipelineState((prev) => {
        const existing = prev.stages[mode];
        const updatedStage = {
          ...existing,
          status,
          ...(result !== undefined ? { result } : {}),
          ...(error !== undefined ? { error } : {}),
        };
        return {
          ...prev,
          stages: { ...prev.stages, [mode]: updatedStage },
        };
      });
    },
    []
  );

  const advancePipeline = useCallback((): void => {
    setPipelineState((prev) => {
      if (!prev.currentStage) return prev;
      const idx = ANALYSIS_MODES.indexOf(prev.currentStage);
      if (idx < 0) return prev;
      const next = ANALYSIS_MODES[idx + 1];
      if (next) {
        return { ...prev, currentStage: next };
      }
      return { ...prev, currentStage: null };
    });
  }, []);

  const resetStage = useCallback((mode: AnalysisMode): void => {
    setPipelineState((prev) => ({
      ...prev,
      stages: {
        ...prev.stages,
        [mode]: { mode, status: "pending", result: null, error: null },
      },
    }));
  }, []);

  const setCurrentStage = useCallback((mode: AnalysisMode): void => {
    setPipelineState((prev) => ({ ...prev, currentStage: mode }));
  }, []);

  const setPipeline = useCallback((next: ProjectPipeline): void => {
    setPipelineState(next);
  }, []);

  return {
    pipeline,
    pipelineOrder: ANALYSIS_MODES,
    startPipeline,
    stopPipeline,
    updateStageStatus,
    advancePipeline,
    resetStage,
    setCurrentStage,
    setPipeline,
  };
}
