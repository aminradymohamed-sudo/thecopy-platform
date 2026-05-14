/**
 * Unified LLM Gateway
 *
 * @description
 * نقطة مركزية واحدة لكل استدعاءات LLM في النظام.
 * تمرر كل طلب عبر Guardian Runtime قبل وبعد استدعاء النموذج.
 */

import { logger } from "@/lib/logger";

import { GeminiService } from "./gemini.service";
import {
  GuardianRuntime,
  getGuardianRuntime,
  type GuardianRuntimeInput,
 GuardianDraft, PermissionSet, TaskContract } from "./guardian";
import { PlatformGenAIService } from "./platform-genai.service";

// ============================================================================
// أنواع Gateway
// ============================================================================

export interface UnifiedLLMRequest {
  prompt: string;
  originalInput?: string;
  requestType: string;
  provider?: "gemini" | "platform-genai";
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
    responseMimeType?: string;
  };
  context?: {
    userId?: string;
    conversationHistory?: string[];
    permissions?: Partial<PermissionSet>;
  };
}

export interface UnifiedLLMResponse {
  content: string;
  sources: string[] | undefined;
  confidenceLimits: string[] | undefined;
  assumptions: string[] | undefined;
  guardianTrace:
    | {
        taskType: string;
        riskLevel: string;
        speedMode: string;
        verifierPassed: boolean;
        repairCount: number;
        durationMs: number;
      }
    | undefined;
}

// ============================================================================
// الخدمة
// ============================================================================

export class UnifiedLLMGateway {
  private guardianRuntime: GuardianRuntime;
  private geminiService: GeminiService;
  private platformGenAIService: PlatformGenAIService;

  constructor() {
    this.guardianRuntime = getGuardianRuntime();
    this.geminiService = new GeminiService();
    this.platformGenAIService = new PlatformGenAIService();
  }

  /**
   * يولد نصاً من خلال Gateway مع حراسة كاملة
   */
  async generateText(request: UnifiedLLMRequest): Promise<UnifiedLLMResponse> {
    try {
      const runtimeInput: GuardianRuntimeInput = {
        userRequest: request.prompt,
        originalInput: request.originalInput ?? request.prompt,
      };
      const runtimeContext = buildGuardianContext(request.context);
      if (runtimeContext) {
        runtimeInput.context = runtimeContext;
      }

      // تشغيل Guardian Runtime
      const result = await this.guardianRuntime.execute(
        runtimeInput,
        async (contract: TaskContract) => {
          // executor: استدعاء LLM الفعلي
          return this.executeLLM(request, contract);
        },
      );

      return {
        content: result.answer.content,
        sources: result.answer.sources,
        confidenceLimits: result.answer.confidenceLimits,
        assumptions: result.answer.assumptions,
        guardianTrace: {
          taskType: result.contract.classification.taskType,
          riskLevel: result.contract.classification.riskLevel,
          speedMode: result.contract.speedMode,
          verifierPassed: result.verdict.passed,
          repairCount: result.repairCount,
          durationMs: result.durationMs,
        },
      };
    } catch (error) {
      logger.error("UnifiedLLMGateway.generateText failed:", error);
      throw error;
    }
  }

  /**
   * يولد JSON من خلال Gateway
   */
  async generateJson<T>(
    request: UnifiedLLMRequest,
  ): Promise<UnifiedLLMResponse & { parsed: T | undefined }> {
    const jsonRequest: UnifiedLLMRequest = {
      ...request,
      provider: "platform-genai",
      options: buildJsonOptions(request.options),
    };

    const response = await this.generateText(jsonRequest);

    let parsed: T | undefined;
    try {
      parsed = JSON.parse(response.content) as T;
    } catch {
      // محاولة استخراج JSON من النص
      const text = response.content;
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          parsed = JSON.parse(text.slice(start, end + 1)) as T;
        } catch {
          // فشل الاستخراج
        }
      }
    }

    return { ...response, parsed: parsed };
  }

  // ============================================================================
  // تنفيذ LLM الفعلي
  // ============================================================================

  private async executeLLM(
    request: UnifiedLLMRequest,
    contract: TaskContract,
  ): Promise<GuardianDraft> {
    const provider = request.provider ?? "gemini";
    const prompt = request.prompt;
    const options = request.options;

    let content = "";
    let sources: string[] = [];

    try {
      if (provider === "gemini") {
        const geminiOptions = buildGeminiOptions(options);
        content = await this.geminiService.generateText(prompt, geminiOptions);
      } else {
        const genaiOptions = buildPlatformOptions(options);
        content = await this.platformGenAIService.generateText(
          prompt,
          genaiOptions,
        );
      }

      // إذا كانت المهمة بحث، أضف ملاحظة عن المصادر
      if (contract.classification.needsSources) {
        sources = this.extractSources(content);
      }
    } catch (error) {
      logger.error("LLM execution failed in gateway:", error);
      content = `عذراً، فشل استدعاء نموذج اللغة: ${error instanceof Error ? error.message : String(error)}`;
    }

    return {
      content,
      metadata: {
        sources,
        testsRun: [],
        assumptionsMade: contract.assumptions.map((a) => a.assumption),
        toolsUsed: [provider],
        confidence:
          contract.classification.riskLevel === "high" ? "low" : "medium",
      },
    };
  }

  /**
   * يستخرج مصادر محتملة من النص (heuristic)
   */
  private extractSources(content: string): string[] {
    const sources: string[] = [];

    // كشف روابط
    const urlPattern = /https?:\/\/[^\s\)\]\>"']+/g;
    const urls = content.match(urlPattern);
    if (urls) {
      sources.push(...urls);
    }

    // كشف مراجع مكتوبة
    const citationPattern = /\[?(?:\d{4})\]?\s*\.?\s*[^\.\n]+/g;
    const citations = content.match(citationPattern);
    if (citations) {
      sources.push(...citations.slice(0, 5));
    }

    return [...new Set(sources)].slice(0, 10);
  }
}

function buildGuardianContext(
  context: UnifiedLLMRequest["context"],
): GuardianRuntimeInput["context"] | undefined {
  if (!context) {
    return undefined;
  }

  const runtimeContext: NonNullable<GuardianRuntimeInput["context"]> = {};
  if (context.userId !== undefined) {
    runtimeContext.userId = context.userId;
  }
  if (context.conversationHistory !== undefined) {
    runtimeContext.conversationHistory = context.conversationHistory;
  }
  if (context.permissions !== undefined) {
    runtimeContext.permissions = context.permissions;
  }

  return Object.keys(runtimeContext).length > 0 ? runtimeContext : undefined;
}

function buildJsonOptions(
  options: UnifiedLLMRequest["options"],
): NonNullable<UnifiedLLMRequest["options"]> {
  return {
    ...(options?.temperature !== undefined && {
      temperature: options.temperature,
    }),
    ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
    ...(options?.model !== undefined && { model: options.model }),
    responseMimeType: "application/json",
  };
}

function buildGeminiOptions(
  options: UnifiedLLMRequest["options"],
): { temperature?: number; maxTokens?: number } | undefined {
  if (!options) {
    return undefined;
  }

  const geminiOptions: { temperature?: number; maxTokens?: number } = {};
  if (options.temperature !== undefined) {
    geminiOptions.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    geminiOptions.maxTokens = options.maxTokens;
  }

  return Object.keys(geminiOptions).length > 0 ? geminiOptions : undefined;
}

function buildPlatformOptions(
  options: UnifiedLLMRequest["options"],
):
  | { model?: string; temperature?: number; maxOutputTokens?: number }
  | undefined {
  if (!options) {
    return undefined;
  }

  const platformOptions: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  } = {};
  if (options.model !== undefined) {
    platformOptions.model = options.model;
  }
  if (options.temperature !== undefined) {
    platformOptions.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    platformOptions.maxOutputTokens = options.maxTokens;
  }

  return Object.keys(platformOptions).length > 0 ? platformOptions : undefined;
}

// ============================================================================
// Singleton
// ============================================================================

let gatewayInstance: UnifiedLLMGateway | null = null;

export function getUnifiedLLMGateway(): UnifiedLLMGateway {
  gatewayInstance ??= new UnifiedLLMGateway();
  return gatewayInstance;
}
