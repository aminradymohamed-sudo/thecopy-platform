/**
 * Guardian Runtime — Routes
 *
 * @description
 * مسارات API للمراقبة والتحكم في Guardian Runtime.
 */

import { Router } from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";
import { authMiddleware } from "@/middleware/auth.middleware";
import { getUnifiedLLMGateway } from "@/services/unified-llm-gateway";
import { GUARDIAN_RUNTIME_CONFIG, getTaskClassifier } from "@/services/guardian";

const router = Router();

const classifyBodySchema = z.object({
  requestText: z.string().min(1),
});

const generateBodySchema = z.object({
  prompt: z.string().min(1),
  requestType: z.string().optional(),
  provider: z.enum(["gemini", "platform-genai"]).optional(),
  options: z
    .object({
      temperature: z.number().optional(),
      maxTokens: z.number().int().positive().optional(),
      model: z.string().optional(),
      responseMimeType: z.string().optional(),
    })
    .optional(),
});

/**
 * GET /api/guardian/status
 * حالة النظام وإعداداته
 */
router.get("/status", authMiddleware, (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        status: "active",
        version: "1.0.0",
        defaultUserBurden: GUARDIAN_RUNTIME_CONFIG.defaultUserBurden,
        routingModes: Object.keys(GUARDIAN_RUNTIME_CONFIG.routing),
        antiEvasionRules: {
          exampleExpansionEnabled:
            GUARDIAN_RUNTIME_CONFIG.antiEvasionRules.examplesAreNonExclusive
              .action === "expand_scope",
          sourceLaunderingDetection:
            GUARDIAN_RUNTIME_CONFIG.antiEvasionRules.sourcePolicy
              .rejectSourceLaundering,
          forbiddenClaimsCount:
            GUARDIAN_RUNTIME_CONFIG.antiEvasionRules.verificationClaims
              .forbiddenWithoutEvidence.length,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Guardian status error:", error);
    res.status(500).json({
      success: false,
      error: "فشل في استرجاع حالة Guardian",
    });
  }
});

/**
 * POST /api/guardian/classify
 * تصنيف طلب بدون تنفيذ (للاختبار والتصحيح)
 */
router.post("/classify", authMiddleware, (req, res) => {
  try {
    const validation = classifyBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: "requestText مطلوب ويجب أن يكون نصاً",
        details: validation.error.issues,
      });
      return;
    }
    const { requestText } = validation.data;

    const classifier = getTaskClassifier();
    const classification = classifier.classify(requestText);

    res.json({
      success: true,
      data: classification,
    });
  } catch (error) {
    logger.error("Guardian classify error:", error);
    res.status(500).json({
      success: false,
      error: "فشل في تصنيف الطلب",
    });
  }
});

/**
 * POST /api/guardian/generate
 * توليد نص عبر Gateway مع حراسة كاملة
 */
router.post("/generate", authMiddleware, async (req, res) => {
  try {
    const validation = generateBodySchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: "prompt مطلوب",
        details: validation.error.issues,
      });
      return;
    }
    const { prompt, requestType, provider, options } = validation.data;

    const gateway = getUnifiedLLMGateway();
    const response = await gateway.generateText({
      prompt,
      requestType: requestType ?? "guardian-generate",
      provider: provider ?? "gemini",
      ...(options && {
        options: {
          ...(options.temperature !== undefined && {
            temperature: options.temperature,
          }),
          ...(options.maxTokens !== undefined && {
            maxTokens: options.maxTokens,
          }),
          ...(options.model !== undefined && { model: options.model }),
          ...(options.responseMimeType !== undefined && {
            responseMimeType: options.responseMimeType,
          }),
        },
      }),
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    logger.error("Guardian generate error:", error);
    res.status(500).json({
      success: false,
      error: "فشل في التوليد عبر Gateway",
    });
  }
});

/**
 * GET /api/guardian/metrics
 * مقاييس Guardian Runtime
 */
router.get("/metrics", authMiddleware, (_req, res) => {
  try {
    res.json({
      success: true,
      data: {
        checks: [
          "scope_collapse",
          "ambiguity_abuse",
          "unsupported_claims",
          "untested_completion_claims",
          "sycophancy",
          "source_laundering",
          "unauthorized_action",
          "premature_completion",
        ],
        routingModes: [
          "fast",
          "balanced",
          "strict",
          "background",
          "restricted",
        ],
        taskTypes: [
          "simple_question",
          "research",
          "analysis",
          "code",
          "file",
          "creative_writing",
          "destructive_action",
          "external_action",
          "comparison",
        ],
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Guardian metrics error:", error);
    res.status(500).json({
      success: false,
      error: "فشل في استرجاع المقاييس",
    });
  }
});

export { router as guardianRoutes };
