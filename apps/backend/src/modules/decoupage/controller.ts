/**
 * Decoupage Module — Controller (Express handlers)
 *
 * يربط HTTP layer بـ service + repository بنمط الـ controllers الموجودة
 * (مثل `appState.controller`). كل ردّ ينتهج بنية `{success, data?, error?, code?}`.
 */

import { logger } from "@/lib/logger";

import { decoupageProjectRepository } from "./repository";
import { decoupageAnalysisService } from "./service";

import type {
  AnalysisRequestPayload,
  AspectRatio,
  ContinuityAuditRequest,
  DecoupageProjectPayload,
  ImageInput,
  ImageSize,
  ScenarioMapRequest,
  SpatialDeductionRequest,
} from "./types";
import type { Request, Response } from "express";

// `req.userId` و `req.user` مُعرَّفان عبر module augmentation في src/global.d.ts
type AuthenticatedRequest = Request;

function resolveOwnerId(req: AuthenticatedRequest): string | null {
  const candidate = req.userId ?? req.user?.id ?? null;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate;
  }
  return null;
}

function unauthorized(res: Response): void {
  res.status(401).json({
    success: false,
    error: "تتطلب هذه العملية مستخدمًا مسجَّلًا",
    code: "UNAUTHORIZED",
  });
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const decoupageController = {
  async analyze(req: AuthenticatedRequest, res: Response): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const payload = req.body as AnalysisRequestPayload;
    const result = await decoupageAnalysisService.analyze(payload);

    if (!result.success) {
      res.status(502).json({
        success: false,
        error: result.error,
        data: result.data,
        code: "ANALYSIS_FAILED",
      });
      return;
    }

    res.json({ success: true, data: result.data });
  },

  async deduceSpatialParams(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const payload = req.body as SpatialDeductionRequest;
    try {
      const params = await decoupageAnalysisService.deduceSpatialParams(payload);
      res.json({ success: true, data: params });
    } catch (error) {
      logger.error("decoupage.controller.deduceSpatialParams", {
        message: safeError(error),
      });
      res.status(502).json({
        success: false,
        error: safeError(error),
        code: "DEDUCTION_FAILED",
      });
    }
  },

  async generateScenarioMap(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const payload = req.body as ScenarioMapRequest;
    try {
      const map = await decoupageAnalysisService.generateScenarioMap(payload);
      res.json({ success: true, data: map });
    } catch (error) {
      logger.error("decoupage.controller.generateScenarioMap", {
        message: safeError(error),
      });
      res.status(502).json({
        success: false,
        error: safeError(error),
        code: "SCENARIO_MAP_FAILED",
      });
    }
  },

  async auditContinuity(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const payload = req.body as ContinuityAuditRequest;
    try {
      const data = await decoupageAnalysisService.auditContinuity(payload);
      res.json({ success: true, data });
    } catch (error) {
      logger.error("decoupage.controller.auditContinuity", {
        message: safeError(error),
      });
      res.status(502).json({
        success: false,
        error: safeError(error),
        code: "CONTINUITY_AUDIT_FAILED",
      });
    }
  },

  async listProjects(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    try {
      const projects = await decoupageProjectRepository.list(ownerId);
      res.json({ success: true, data: projects });
    } catch (error) {
      logger.error("decoupage.controller.listProjects", {
        message: safeError(error),
      });
      res.status(500).json({
        success: false,
        error: "فشل تحميل المشاريع",
        code: "PROJECTS_LIST_FAILED",
      });
    }
  },

  async getProject(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const idParam = req.params["id"];
    if (typeof idParam !== "string" || idParam.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "معرّف المشروع مطلوب",
        code: "INVALID_PROJECT_ID",
      });
      return;
    }

    try {
      const project = await decoupageProjectRepository.findById(ownerId, idParam);
      if (!project) {
        res.status(404).json({
          success: false,
          error: "المشروع غير موجود",
          code: "PROJECT_NOT_FOUND",
        });
        return;
      }
      res.json({ success: true, data: project });
    } catch (error) {
      logger.error("decoupage.controller.getProject", {
        message: safeError(error),
      });
      res.status(500).json({
        success: false,
        error: "فشل تحميل المشروع",
        code: "PROJECT_GET_FAILED",
      });
    }
  },

  async upsertProject(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const payload = req.body as DecoupageProjectPayload;
    const queryId = req.query["id"];
    const existingId = typeof queryId === "string" ? queryId : undefined;

    try {
      const project = await decoupageProjectRepository.upsert(
        ownerId,
        payload,
        existingId,
      );
      res.json({ success: true, data: project });
    } catch (error) {
      logger.error("decoupage.controller.upsertProject", {
        message: safeError(error),
      });
      res.status(500).json({
        success: false,
        error: "فشل حفظ المشروع",
        code: "PROJECT_UPSERT_FAILED",
      });
    }
  },

  async deleteProject(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const idParam = req.params["id"];
    if (typeof idParam !== "string" || idParam.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "معرّف المشروع مطلوب",
        code: "INVALID_PROJECT_ID",
      });
      return;
    }

    try {
      const removed = await decoupageProjectRepository.remove(ownerId, idParam);
      if (!removed) {
        res.status(404).json({
          success: false,
          error: "المشروع غير موجود",
          code: "PROJECT_NOT_FOUND",
        });
        return;
      }
      res.json({ success: true, data: { id: idParam } });
    } catch (error) {
      logger.error("decoupage.controller.deleteProject", {
        message: safeError(error),
      });
      res.status(500).json({
        success: false,
        error: "فشل حذف المشروع",
        code: "PROJECT_DELETE_FAILED",
      });
    }
  },

  async generateImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const payload = req.body as {
      prompt: string;
      aspectRatio: AspectRatio;
      imageSize: ImageSize;
    };
    try {
      const data = await decoupageAnalysisService.generateStoryboardImage({
        prompt: payload.prompt,
        aspectRatio: payload.aspectRatio,
        imageSize: payload.imageSize,
      });
      res.json({ success: true, data });
    } catch (error) {
      logger.error("decoupage.controller.generateImage", {
        message: safeError(error),
      });
      res.status(502).json({
        success: false,
        error: safeError(error),
        code: "IMAGE_GEN_FAILED",
      });
    }
  },

  async editImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    const ownerId = resolveOwnerId(req);
    if (!ownerId) {
      unauthorized(res);
      return;
    }

    const payload = req.body as { image: ImageInput; prompt: string };
    try {
      const data = await decoupageAnalysisService.editStoryboardImage(payload);
      res.json({ success: true, data });
    } catch (error) {
      logger.error("decoupage.controller.editImage", {
        message: safeError(error),
      });
      res.status(502).json({
        success: false,
        error: safeError(error),
        code: "IMAGE_EDIT_FAILED",
      });
    }
  },
};
