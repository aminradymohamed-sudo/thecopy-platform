/**
 * Decoupage Module — خدمة التحليل
 *
 * تستهلك `geminiService` المركزي من `@/services/gemini.service`
 * عبر دواله العامة `generateText` / `generateJson` — دون أي تعامل
 * مباشر مع SDK خارجي ودون مفتاح API على مستوى الخدمة.
 */

import { logger } from "@/lib/logger";
import { geminiService } from "@/services/gemini.service";

import {
  buildMultimodalParts,
  generateImage,
  generateMultimodalText,
} from "./gemini-adapter";
import {
  buildSystemInstruction,
  buildUserContent,
  CONTINUITY_AUDIT_INSTRUCTION,
  SCENARIO_MAP_INSTRUCTION,
  SPATIAL_DEDUCTION_INSTRUCTION,
} from "./prompts";

import type {
  AnalysisRequestPayload,
  AnalysisResultPayload,
  ContinuityAuditRequest,
  ImageGenerationResult,
  ImageInput,
  ScenarioMap,
  ScenarioMapRequest,
  SpatialDeductionRequest,
  SpatialParams,
} from "./types";

const EMPTY_SCENARIO_MAP: ScenarioMap = {
  characters: [],
  locations: [],
  motifs: [],
};

const EMPTY_SPATIAL_PARAMS: SpatialParams = {
  style: "",
  colors: "",
  lighting: "",
  setDressing: "",
  details: "",
};

function combinePrompt(systemInstruction: string, userContent: string): string {
  return `${systemInstruction}\n\n=========================================\nUSER INPUT:\n=========================================\n${userContent}`;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export const decoupageAnalysisService = {
  /**
   * تنفيذ تحليل وضع واحد. يُرجع نص JSON كما تنتجه Gemini
   * (المنصّة الفرونتية تتعامل معه عبر `tryParseJSON`).
   *
   * إذا حُمِّلت صور، نستخدم مهايئ `@google/genai` لإرسالها كأجزاء `inlineData`؛
   * وإلا نمر عبر `geminiService` المركزي (الذي يطبّق caching/guardrails/metrics
   * على المسار النصي الصِرف).
   */
  async analyze(req: AnalysisRequestPayload): Promise<AnalysisResultPayload> {
    const systemInstruction = buildSystemInstruction(req.mode);
    const userContent = buildUserContent({
      script: req.script,
      intent: req.intent,
      ...(req.directorIntent !== undefined && {
        directorIntent: req.directorIntent,
      }),
      fullScenario: req.fullScenario,
      scenarioMap: req.scenarioMap,
      spatialParams: req.spatialParams,
      mode: req.mode,
      ...(req.promptBuilderParams && {
        promptBuilderParams: req.promptBuilderParams,
      }),
      ...(req.rhythmParams && { rhythmParams: req.rhythmParams }),
      ...(req.perspectiveParams && {
        perspectiveParams: req.perspectiveParams,
      }),
      ...(req.settings.searchKeywords !== undefined && {
        searchKeywords: req.settings.searchKeywords,
      }),
      useSearch: req.settings.useSearch,
    });

    const hasImages = (req.images?.length ?? 0) > 0;

    try {
      let data: string;
      if (hasImages) {
        const parts = buildMultimodalParts({
          text: userContent,
          images: req.images,
        });
        data = await generateMultimodalText({
          systemInstruction,
          parts,
          responseMimeType: "application/json",
        });
      } else {
        const fullPrompt = combinePrompt(systemInstruction, userContent);
        data = await geminiService.generateText(fullPrompt);
      }
      logger.info("decoupage.analyze.success", {
        mode: req.mode,
        outputBytes: data.length,
        imagesCount: req.images?.length ?? 0,
      });
      return { success: true, data, error: null };
    } catch (error) {
      const message = safeErrorMessage(error);
      logger.error("decoupage.analyze.failure", { mode: req.mode, message });
      return {
        success: false,
        data: `## خطأ\nفشل التحليل: ${message}`,
        error: message,
      };
    }
  },

  /**
   * توليد صورة Storyboard مستقلة.
   * يُستخدم عبر `POST /api/decoupage/generate-image`.
   */
  async generateStoryboardImage(input: {
    prompt: string;
    aspectRatio: AnalysisRequestPayload["settings"]["aspectRatio"];
    imageSize: AnalysisRequestPayload["settings"]["imageSize"];
  }): Promise<ImageGenerationResult> {
    const result = await generateImage({
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      imageSize: input.imageSize,
    });
    logger.info("decoupage.generateStoryboardImage.success", {
      mimeType: result.mimeType,
      dataBytes: result.data.length,
    });
    return result;
  },

  /**
   * تعديل صورة موجودة وفق توجيه نصي (آلية «editImage» الأصلية).
   * يستهلك مهايئ `@google/genai` لإرسال صورة + توجيه ثم إرجاع نص + صور (إن وُجدت).
   */
  async editStoryboardImage(input: {
    image: ImageInput;
    prompt: string;
  }): Promise<string> {
    const parts = buildMultimodalParts({
      text: input.prompt,
      images: [input.image],
    });
    return generateMultimodalText({
      systemInstruction:
        "You are an expert image editor. Apply the requested edit precisely.",
      parts,
      responseMimeType: undefined,
    });
  },

  /**
   * استنتاج SpatialParams من نص + intent.
   */
  async deduceSpatialParams(
    req: SpatialDeductionRequest,
  ): Promise<SpatialParams> {
    const prompt = `${SPATIAL_DEDUCTION_INSTRUCTION}\n\nScript:\n${req.script}\n\nIntent:\n${req.intent}`;
    try {
      const parsed = await geminiService.generateJson<Partial<SpatialParams>>(
        prompt,
      );
      return {
        style: parsed.style ?? "",
        colors: parsed.colors ?? "",
        lighting: parsed.lighting ?? "",
        setDressing: parsed.setDressing ?? "",
        details: parsed.details ?? "",
      };
    } catch (error) {
      logger.error("decoupage.deduceSpatialParams.failure", {
        message: safeErrorMessage(error),
      });
      return EMPTY_SPATIAL_PARAMS;
    }
  },

  /**
   * توليد خريطة استمرارية من سيناريو كامل.
   */
  async generateScenarioMap(req: ScenarioMapRequest): Promise<ScenarioMap> {
    const prompt = `${SCENARIO_MAP_INSTRUCTION}\n\nScenario:\n${req.fullScenario}`;
    try {
      const parsed = await geminiService.generateJson<Partial<ScenarioMap>>(
        prompt,
      );
      return {
        characters: Array.isArray(parsed.characters) ? parsed.characters : [],
        locations: Array.isArray(parsed.locations) ? parsed.locations : [],
        motifs: Array.isArray(parsed.motifs) ? parsed.motifs : [],
      };
    } catch (error) {
      logger.error("decoupage.generateScenarioMap.failure", {
        message: safeErrorMessage(error),
      });
      return EMPTY_SCENARIO_MAP;
    }
  },

  /**
   * فحص استمرارية مقابل خريطة + نتائج pipeline + script.
   */
  async auditContinuity(req: ContinuityAuditRequest): Promise<string> {
    const prompt = `${CONTINUITY_AUDIT_INSTRUCTION}\n\nOriginal Script:\n${req.script.slice(0, 5000)}\n\nContinuity Map:\n${JSON.stringify(req.scenarioMap)}\n\nPipeline Results:\n${req.pipelineResults.slice(0, 15000)}`;
    try {
      const data = await geminiService.generateText(prompt);
      return data;
    } catch (error) {
      const message = safeErrorMessage(error);
      logger.error("decoupage.auditContinuity.failure", { message });
      throw new Error(`فشل فحص الاستمرارية: ${message}`);
    }
  },
};
