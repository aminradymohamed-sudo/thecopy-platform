/**
 * Decoupage Module — أنواع البيانات
 *
 * منقولة من تطبيق D-COUPAGE المصدر إلى backend منصّة the-copy.
 * المرجع التشغيلي: docs/dcoupage-audit.md § 1.1.3 و § INTEGRATION PLAN.
 */

export type AnalysisMode =
  | "scene"
  | "space"
  | "flow"
  | "perspective"
  | "rhythm"
  | "framing"
  | "blocking"
  | "coverage"
  | "shotlist"
  | "storyboard"
  | "prompt_builder";

export const ANALYSIS_MODES: readonly AnalysisMode[] = [
  "scene",
  "space",
  "flow",
  "perspective",
  "rhythm",
  "framing",
  "blocking",
  "coverage",
  "shotlist",
  "storyboard",
  "prompt_builder",
] as const;

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type ImageSize = "1K" | "2K" | "4K";

export interface SpatialParams {
  style: string;
  colors: string;
  lighting: string;
  setDressing: string;
  details: string;
}

export interface PromptBuilderParams {
  genre: string;
  sceneDescription: string;
}

export interface RhythmParams {
  goal: string;
}

export interface PerspectiveParams {
  cameraRule: string;
}

export interface AnalysisSettings {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  useSearch: boolean;
  searchKeywords?: string;
  pipelineAutoAdvance: boolean;
  cameraAngle?: string;
  cameraMovement?: string;
  cameraRule?: string;
}

export interface ContinuityEntity {
  name: string;
  description: string;
  firstAppearance?: string;
}

export interface ScenarioMap {
  characters: ContinuityEntity[];
  locations: ContinuityEntity[];
  motifs: ContinuityEntity[];
}

export type PipelineStageStatus =
  | "pending"
  | "loading"
  | "success"
  | "error"
  | "needs_review";

export interface PipelineStage {
  mode: AnalysisMode;
  status: PipelineStageStatus;
  result: string | null;
  error: string | null;
}

export interface ProjectPipeline {
  isActive: boolean;
  stages: Record<AnalysisMode, PipelineStage>;
  currentStage: AnalysisMode | null;
}

export interface DecoupageProjectPayload {
  name: string;
  script: string;
  intent: string;
  directorIntent?: string;
  fullScenario: string;
  scenarioMap?: ScenarioMap;
  mode: AnalysisMode;
  settings: AnalysisSettings;
  spatialParams: SpatialParams;
  promptBuilderParams: PromptBuilderParams;
  rhythmParams: RhythmParams;
  perspectiveParams: PerspectiveParams;
  pipeline: ProjectPipeline;
  result?: string;
}

export interface DecoupageProject extends DecoupageProjectPayload {
  id: string;
  ownerId: string;
  updatedAt: number;
  createdAt: number;
}

/**
 * صورة مرفوعة كـ base64 (بدون البادئة `data:`).
 * الحدود التشغيلية مفروضة في schemas.ts:
 *   - أقصى عدد صور = 3 (مطابق MAX_IMAGES في D-COUPAGE المصدر)
 *   - أقصى حجم لكل صورة = 7MB قبل base64 (≈ 9.4MB بعد)
 *   - السبب: الـ body limit الفعلي على express هو 10MB (apps/backend/src/middleware/index.ts:149)
 */
export interface ImageInput {
  mimeType: string;
  data: string; // base64 (no data: prefix)
}

export interface AnalysisRequestPayload {
  mode: AnalysisMode;
  script: string;
  intent: string;
  directorIntent?: string;
  fullScenario: string;
  scenarioMap?: ScenarioMap;
  settings: AnalysisSettings;
  spatialParams: SpatialParams;
  promptBuilderParams?: PromptBuilderParams;
  rhythmParams?: RhythmParams;
  perspectiveParams?: PerspectiveParams;
  images?: ImageInput[];
}

/**
 * نتيجة توليد/تعديل صورة (لـ storyboard).
 * `data` هو base64 جاهز للحقن في `data:image/...;base64,...`.
 */
export interface ImageGenerationResult {
  mimeType: string;
  data: string;
}

export interface AnalysisResultPayload {
  success: boolean;
  data: string;
  error: string | null;
}

export interface ContinuityAuditRequest {
  scenarioMap: ScenarioMap;
  pipelineResults: string;
  script: string;
}

export interface SpatialDeductionRequest {
  script: string;
  intent: string;
}

export interface ScenarioMapRequest {
  fullScenario: string;
}
