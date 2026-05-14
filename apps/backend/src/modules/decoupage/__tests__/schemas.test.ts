/**
 * Decoupage Module — Vitest schema tests
 *
 * يتحقق من Zod schemas دون لمس DB أو Gemini فعلي.
 */

import { describe, expect, it } from "vitest";

import {
  analyzeRequestSchema,
  continuityAuditRequestSchema,
  editImageRequestSchema,
  generateImageRequestSchema,
  projectPayloadSchema,
  scenarioMapRequestSchema,
  spatialDeductionRequestSchema,
} from "../schemas";
import {
  ANALYSIS_MODES,
  type AnalysisMode,
  type PipelineStage,
} from "../types";

const VALID_SETTINGS = {
  aspectRatio: "16:9" as const,
  imageSize: "1K" as const,
  useSearch: false,
  pipelineAutoAdvance: true,
};

const VALID_SPATIAL = {
  style: "",
  colors: "",
  lighting: "",
  setDressing: "",
  details: "",
};

const VALID_SCENARIO_MAP = {
  characters: [{ name: "X", description: "Y" }],
  locations: [],
  motifs: [],
};

function buildPipelineStages(
  overrides: Partial<Record<AnalysisMode, Partial<PipelineStage>>> = {},
): Record<AnalysisMode, PipelineStage> {
  return Object.fromEntries(
    ANALYSIS_MODES.map((mode) => [
      mode,
      {
        mode,
        status: "pending",
        result: null,
        error: null,
        ...overrides[mode],
      },
    ]),
  ) as Record<AnalysisMode, PipelineStage>;
}

describe("decoupage schemas", () => {
  describe("analyzeRequestSchema", () => {
    it("يقبل طلبًا أساسيًا بحقول إلزامية فقط", () => {
      const parsed = analyzeRequestSchema.safeParse({
        mode: "scene",
        script: "نص",
        intent: "نية",
        fullScenario: "",
        settings: VALID_SETTINGS,
        spatialParams: VALID_SPATIAL,
      });
      expect(parsed.success).toBe(true);
    });

    it("يرفض mode غير معروف", () => {
      const parsed = analyzeRequestSchema.safeParse({
        mode: "invalid",
        script: "x",
        intent: "y",
        fullScenario: "",
        settings: VALID_SETTINGS,
        spatialParams: VALID_SPATIAL,
      });
      expect(parsed.success).toBe(false);
    });

    it("يقبل صورًا حتى 3 و mimeType=image/*", () => {
      const parsed = analyzeRequestSchema.safeParse({
        mode: "storyboard",
        script: "x",
        intent: "y",
        fullScenario: "",
        settings: VALID_SETTINGS,
        spatialParams: VALID_SPATIAL,
        images: [
          { mimeType: "image/png", data: "AAAA" },
          { mimeType: "image/jpeg", data: "BBBB" },
        ],
      });
      expect(parsed.success).toBe(true);
    });

    it("يرفض أكثر من 3 صور", () => {
      const parsed = analyzeRequestSchema.safeParse({
        mode: "storyboard",
        script: "x",
        intent: "y",
        fullScenario: "",
        settings: VALID_SETTINGS,
        spatialParams: VALID_SPATIAL,
        images: Array.from({ length: 4 }, () => ({
          mimeType: "image/png",
          data: "x",
        })),
      });
      expect(parsed.success).toBe(false);
    });

    it("يرفض mimeType غير صورة", () => {
      const parsed = analyzeRequestSchema.safeParse({
        mode: "storyboard",
        script: "x",
        intent: "y",
        fullScenario: "",
        settings: VALID_SETTINGS,
        spatialParams: VALID_SPATIAL,
        images: [{ mimeType: "video/mp4", data: "x" }],
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("scenarioMapRequestSchema", () => {
    it("يقبل سيناريو غير فارغ", () => {
      const parsed = scenarioMapRequestSchema.safeParse({
        fullScenario: "نص السيناريو",
      });
      expect(parsed.success).toBe(true);
    });
    it("يرفض سيناريو فارغ", () => {
      const parsed = scenarioMapRequestSchema.safeParse({ fullScenario: "" });
      expect(parsed.success).toBe(false);
    });
  });

  describe("spatialDeductionRequestSchema", () => {
    it("يقبل script + intent", () => {
      const parsed = spatialDeductionRequestSchema.safeParse({
        script: "x",
        intent: "y",
      });
      expect(parsed.success).toBe(true);
    });
    it("يرفض script فارغ", () => {
      const parsed = spatialDeductionRequestSchema.safeParse({
        script: "",
        intent: "y",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("continuityAuditRequestSchema", () => {
    it("يقبل scenarioMap كامل + نتائج", () => {
      const parsed = continuityAuditRequestSchema.safeParse({
        scenarioMap: VALID_SCENARIO_MAP,
        pipelineResults: "results",
        script: "script",
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("projectPayloadSchema", () => {
    it("يقبل payload كامل", () => {
      const parsed = projectPayloadSchema.safeParse({
        name: "مشروع",
        script: "",
        intent: "",
        fullScenario: "",
        mode: "scene",
        settings: VALID_SETTINGS,
        spatialParams: VALID_SPATIAL,
        promptBuilderParams: { genre: "", sceneDescription: "" },
        rhythmParams: { goal: "" },
        perspectiveParams: { cameraRule: "" },
        pipeline: {
          isActive: false,
          stages: buildPipelineStages(),
          currentStage: null,
        },
      });
      expect(parsed.success).toBe(true);
    });

    it("يرفض name فارغ", () => {
      const parsed = projectPayloadSchema.safeParse({
        name: "",
        script: "",
        intent: "",
        fullScenario: "",
        mode: "scene",
        settings: VALID_SETTINGS,
        spatialParams: VALID_SPATIAL,
        promptBuilderParams: { genre: "", sceneDescription: "" },
        rhythmParams: { goal: "" },
        perspectiveParams: { cameraRule: "" },
        pipeline: {
          isActive: false,
          stages: buildPipelineStages(),
          currentStage: null,
        },
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("generateImageRequestSchema", () => {
    it("يقبل prompt + aspectRatio + imageSize", () => {
      const parsed = generateImageRequestSchema.safeParse({
        prompt: "test",
        aspectRatio: "16:9",
        imageSize: "1K",
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("editImageRequestSchema", () => {
    it("يقبل image + prompt", () => {
      const parsed = editImageRequestSchema.safeParse({
        image: { mimeType: "image/png", data: "AAAA" },
        prompt: "edit",
      });
      expect(parsed.success).toBe(true);
    });
  });
});
