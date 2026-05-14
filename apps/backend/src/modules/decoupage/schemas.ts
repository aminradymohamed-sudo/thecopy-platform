/**
 * Decoupage Module — Zod Schemas للمدخلات
 *
 * تُستخدم عبر `validateBody` من `@/middleware/validation.middleware`.
 */

import { z } from "zod";

import { ANALYSIS_MODES } from "./types";

const analysisModeSchema = z.enum(
  ANALYSIS_MODES as unknown as readonly [string, ...string[]],
);

const aspectRatioSchema = z.enum(["1:1", "3:4", "4:3", "9:16", "16:9"]);
const imageSizeSchema = z.enum(["1K", "2K", "4K"]);

const spatialParamsSchema = z.object({
  style: z.string(),
  colors: z.string(),
  lighting: z.string(),
  setDressing: z.string(),
  details: z.string(),
});

const promptBuilderParamsSchema = z.object({
  genre: z.string(),
  sceneDescription: z.string(),
});

const rhythmParamsSchema = z.object({
  goal: z.string(),
});

const perspectiveParamsSchema = z.object({
  cameraRule: z.string(),
});

const settingsSchema = z.object({
  aspectRatio: aspectRatioSchema,
  imageSize: imageSizeSchema,
  useSearch: z.boolean(),
  searchKeywords: z.string().optional(),
  pipelineAutoAdvance: z.boolean(),
  cameraAngle: z.string().optional(),
  cameraMovement: z.string().optional(),
  cameraRule: z.string().optional(),
});

const continuityEntitySchema = z.object({
  name: z.string(),
  description: z.string(),
  firstAppearance: z.string().optional(),
});

const scenarioMapSchema = z.object({
  characters: z.array(continuityEntitySchema),
  locations: z.array(continuityEntitySchema),
  motifs: z.array(continuityEntitySchema),
});

/**
 * صورة base64 مدخلة. الحدود (MAX_IMAGES=3، حجم ≤9.4MB لكل صورة) متأتية من
 * حد body parser الفعلي على express (10MB) — راجع apps/backend/src/middleware/index.ts:149.
 */
const imageInputSchema = z.object({
  mimeType: z
    .string()
    .regex(/^image\//, "نوع MIME يجب أن يبدأ بـ image/"),
  data: z.string().min(1).max(10_000_000),
});

export const analyzeRequestSchema = z.object({
  mode: analysisModeSchema,
  script: z.string().max(50_000),
  intent: z.string().max(20_000),
  directorIntent: z.string().max(20_000).optional(),
  fullScenario: z.string().max(200_000),
  scenarioMap: scenarioMapSchema.optional(),
  settings: settingsSchema,
  spatialParams: spatialParamsSchema,
  promptBuilderParams: promptBuilderParamsSchema.optional(),
  rhythmParams: rhythmParamsSchema.optional(),
  perspectiveParams: perspectiveParamsSchema.optional(),
  images: z.array(imageInputSchema).max(3).optional(),
});

export const spatialDeductionRequestSchema = z.object({
  script: z.string().min(1).max(50_000),
  intent: z.string().max(20_000),
});

export const scenarioMapRequestSchema = z.object({
  fullScenario: z.string().min(1).max(200_000),
});

export const continuityAuditRequestSchema = z.object({
  scenarioMap: scenarioMapSchema,
  pipelineResults: z.string().max(200_000),
  script: z.string().max(50_000),
});

const stageStatusSchema = z.enum([
  "pending",
  "loading",
  "success",
  "error",
  "needs_review",
]);

const pipelineStageSchema = z.object({
  mode: analysisModeSchema,
  status: stageStatusSchema,
  result: z.string().nullable(),
  error: z.string().nullable(),
});

const projectPipelineSchema = z.object({
  isActive: z.boolean(),
  stages: z.record(analysisModeSchema, pipelineStageSchema),
  currentStage: analysisModeSchema.nullable(),
});

export const projectPayloadSchema = z.object({
  name: z.string().min(1).max(200),
  script: z.string().max(50_000),
  intent: z.string().max(20_000),
  directorIntent: z.string().max(20_000).optional(),
  fullScenario: z.string().max(200_000),
  scenarioMap: scenarioMapSchema.optional(),
  mode: analysisModeSchema,
  settings: settingsSchema,
  spatialParams: spatialParamsSchema,
  promptBuilderParams: promptBuilderParamsSchema,
  rhythmParams: rhythmParamsSchema,
  perspectiveParams: perspectiveParamsSchema,
  pipeline: projectPipelineSchema,
  result: z.string().optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().min(1).max(128),
});

export const generateImageRequestSchema = z.object({
  prompt: z.string().min(1).max(20_000),
  aspectRatio: aspectRatioSchema,
  imageSize: imageSizeSchema,
});

export const editImageRequestSchema = z.object({
  image: imageInputSchema,
  prompt: z.string().min(1).max(20_000),
});
