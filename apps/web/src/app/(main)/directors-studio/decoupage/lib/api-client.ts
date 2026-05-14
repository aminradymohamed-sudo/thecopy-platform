/**
 * Decoupage feature — عميل HTTP (frontend → backend)
 *
 * يستهدف `/api/decoupage/*` على backend الموجود.
 * يستخدم cookies (httpOnly JWT) — لا يحمل أسرارًا في الواجهة.
 */

import type {
  AnalysisRequestPayload,
  AspectRatio,
  DecoupageProject,
  DecoupageProjectPayload,
  ImageGenerationResult,
  ImageInput,
  ImageSize,
  ScenarioMap,
  SpatialParams,
} from "./types";

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

async function request<TResponse>(
  path: string,
  init: RequestInit = {}
): Promise<TResponse> {
  const response = await fetch(`/api/decoupage${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error("تتطلب هذه العملية تسجيل الدخول");
  }

  const json = (await response.json()) as Envelope<TResponse>;
  if (!response.ok || !json.success) {
    throw new Error(json.error ?? `فشل الطلب (${response.status})`);
  }
  if (json.data === undefined) {
    throw new Error("استجابة بدون بيانات");
  }
  return json.data;
}

export const decoupageApi = {
  analyze(payload: AnalysisRequestPayload): Promise<string> {
    return request<string>("/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deduceSpatialParams(payload: {
    script: string;
    intent: string;
  }): Promise<SpatialParams> {
    return request<SpatialParams>("/spatial-params", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  generateScenarioMap(payload: { fullScenario: string }): Promise<ScenarioMap> {
    return request<ScenarioMap>("/scenario-map", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  auditContinuity(payload: {
    scenarioMap: ScenarioMap;
    pipelineResults: string;
    script: string;
  }): Promise<string> {
    return request<string>("/audit-continuity", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listProjects(): Promise<DecoupageProject[]> {
    return request<DecoupageProject[]>("/projects", { method: "GET" });
  },

  upsertProject(
    payload: DecoupageProjectPayload,
    existingId?: string
  ): Promise<DecoupageProject> {
    const query =
      existingId !== undefined && existingId.length > 0
        ? `?id=${encodeURIComponent(existingId)}`
        : "";
    return request<DecoupageProject>(`/projects${query}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteProject(id: string): Promise<{ id: string }> {
    return request<{ id: string }>(`/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  generateImage(payload: {
    prompt: string;
    aspectRatio: AspectRatio;
    imageSize: ImageSize;
  }): Promise<ImageGenerationResult> {
    return request<ImageGenerationResult>("/generate-image", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  editImage(payload: { image: ImageInput; prompt: string }): Promise<string> {
    return request<string>("/edit-image", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
