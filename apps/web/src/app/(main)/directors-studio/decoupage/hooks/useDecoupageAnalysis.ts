/**
 * Hook لتغليف TanStack Mutations للمسارات الثلاثة الأساسية:
 * تحليل، استخراج خريطة استمرارية، استنتاج SpatialParams.
 */

"use client";

import { useMutation } from "@tanstack/react-query";

import { decoupageApi } from "../lib/api-client";

import type {
  AnalysisRequestPayload,
  ScenarioMap,
  SpatialParams,
} from "../lib/types";

export function useAnalyzeMode() {
  return useMutation<string, Error, AnalysisRequestPayload>({
    mutationFn: (payload) => decoupageApi.analyze(payload),
  });
}

export function useGenerateScenarioMap() {
  return useMutation<ScenarioMap, Error, { fullScenario: string }>({
    mutationFn: (payload) => decoupageApi.generateScenarioMap(payload),
  });
}

export function useDeduceSpatialParams() {
  return useMutation<SpatialParams, Error, { script: string; intent: string }>({
    mutationFn: (payload) => decoupageApi.deduceSpatialParams(payload),
  });
}

export function useAuditContinuity() {
  return useMutation<
    string,
    Error,
    { scenarioMap: ScenarioMap; pipelineResults: string; script: string }
  >({
    mutationFn: (payload) => decoupageApi.auditContinuity(payload),
  });
}
