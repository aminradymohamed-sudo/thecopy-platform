/**
 * Decoupage feature — أنواع البيانات (frontend mirror)
 *
 * مرآة لأنواع backend في `apps/backend/src/modules/decoupage/types.ts`
 * مع إبقاء التعريفات محلية لتجنب الاعتماد عبر workspace boundary.
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
 * صورة base64 (بدون البادئة `data:`).
 * الحدود: ≤3 صور، حجم ≤9.4MB لكل صورة (محدد على backend وفق express body limit 10MB).
 */
export interface ImageInput {
  mimeType: string;
  data: string;
}

export interface ImagePreview {
  id: string;
  src: string;
  file: File;
  mimeType: string;
  data: string;
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

export interface ImageGenerationResult {
  mimeType: string;
  data: string;
}

export const MAX_IMAGES = 3;
export const MAX_IMAGE_BYTES_BEFORE_BASE64 = 7 * 1024 * 1024; // 7MB

export interface StructuredAnalysisTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface StructuredAnalysisWidget {
  type: "parameter" | "highlight" | "status";
  label: string;
  value: string;
}

export interface StructuredAnalysisSection {
  title: string;
  content: string;
}

export interface StructuredAnalysisResult {
  title?: string;
  summary?: string;
  widgets?: StructuredAnalysisWidget[];
  sections?: StructuredAnalysisSection[];
  tables?: StructuredAnalysisTable[];
}

export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  aspectRatio: "16:9",
  imageSize: "1K",
  useSearch: false,
  searchKeywords: "",
  pipelineAutoAdvance: true,
  cameraAngle: "Eye Level",
  cameraMovement: "Static",
  cameraRule: "Neutral Observation",
};

export const DEFAULT_SPATIAL_PARAMS: SpatialParams = {
  style: "",
  colors: "",
  lighting: "",
  setDressing: "",
  details: "",
};

export const DEFAULT_PROMPT_BUILDER_PARAMS: PromptBuilderParams = {
  genre: "",
  sceneDescription: "",
};

export const DEFAULT_RHYTHM_PARAMS: RhythmParams = { goal: "" };
export const DEFAULT_PERSPECTIVE_PARAMS: PerspectiveParams = { cameraRule: "" };

export const MODE_LABELS: Readonly<Record<AnalysisMode, string>> = {
  scene: "الزمن الدرامي",
  space: "الهندسة المكانية",
  flow: "سياسات الإدراك",
  perspective: "السلوك البصري",
  rhythm: "مايسترو التوتر",
  framing: "الكادراج",
  blocking: "هندسة الحركة",
  coverage: "هندسة التغطية",
  shotlist: "قائمة اللقطات",
  storyboard: "لوحات القصة",
  prompt_builder: "مولد التوجيه",
};

export const MODE_DESCRIPTIONS: Readonly<Record<AnalysisMode, string>> = {
  scene: "تفكيك الزمن (الواقع vs العرض vs الإدراك)",
  space: "تحويل الزمن إلى مساحة (Zoning & Blocking)",
  flow: "هندسة المنظور وتدفق المعلومات",
  perspective: "تحديد عقد الكاميرا وقاموس الأفعال",
  rhythm: "هندسة الإيقاع، الصمت، ومنحنى التوتر",
  framing: "هندسة الإطار، توزيع الكتل، وقاموس التكوين",
  blocking: "هندسة الحركة، التمركز، وقواعد المحور",
  coverage: "تصميم الإعدادات وجدول التصوير",
  shotlist: "تحويل الإعدادات إلى قائمة لقطات تنفيذية",
  storyboard: "تصميم لوحات التحكم البصري (تحليلي)",
  prompt_builder: "تحويل البيانات إلى أوامر توجيه لنماذج الفيديو",
};

export function buildEmptyPipeline(): ProjectPipeline {
  const stages = {} as Record<AnalysisMode, PipelineStage>;
  for (const mode of ANALYSIS_MODES) {
    stages[mode] = { mode, status: "pending", result: null, error: null };
  }
  return { isActive: false, stages, currentStage: null };
}
