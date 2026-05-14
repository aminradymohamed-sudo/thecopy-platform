/**
 * Decoupage Module — Routes
 *
 * يُسجَّل عبر `registerDecoupageRoutes(app)` من
 * `apps/backend/src/server/route-registrars.ts`.
 *
 * كل المسارات تحت `/api/decoupage/*`.
 * - JWT عبر `authMiddleware`.
 * - Rate limit على مسارات AI عبر `perUserAiLimiter`.
 * - Zod validation عبر `validateBody` على المدخلات الحرجة.
 */

import {
  Router,
  type RequestHandler,
  type Router as ExpressRouter,
} from "express";

import { perUserAiLimiter } from "@/middleware";
import { authMiddleware } from "@/middleware/auth.middleware";
import { validateBody } from "@/middleware/validation.middleware";

import { decoupageController } from "./controller";
import {
  analyzeRequestSchema,
  continuityAuditRequestSchema,
  editImageRequestSchema,
  generateImageRequestSchema,
  projectPayloadSchema,
  scenarioMapRequestSchema,
  spatialDeductionRequestSchema,
} from "./schemas";

const router: ExpressRouter = Router();

const analyzeHandler: RequestHandler = (req, res) => {
  void decoupageController.analyze(req, res);
};

const deduceSpatialParamsHandler: RequestHandler = (req, res) => {
  void decoupageController.deduceSpatialParams(req, res);
};

const generateScenarioMapHandler: RequestHandler = (req, res) => {
  void decoupageController.generateScenarioMap(req, res);
};

const auditContinuityHandler: RequestHandler = (req, res) => {
  void decoupageController.auditContinuity(req, res);
};

const listProjectsHandler: RequestHandler = (req, res) => {
  void decoupageController.listProjects(req, res);
};

const getProjectHandler: RequestHandler = (req, res) => {
  void decoupageController.getProject(req, res);
};

const upsertProjectHandler: RequestHandler = (req, res) => {
  void decoupageController.upsertProject(req, res);
};

const deleteProjectHandler: RequestHandler = (req, res) => {
  void decoupageController.deleteProject(req, res);
};

// AI endpoints (محمية بـ auth + rate limit + zod)
router.post(
  "/analyze",
  authMiddleware,
  perUserAiLimiter,
  validateBody(analyzeRequestSchema),
  analyzeHandler,
);

router.post(
  "/spatial-params",
  authMiddleware,
  perUserAiLimiter,
  validateBody(spatialDeductionRequestSchema),
  deduceSpatialParamsHandler,
);

router.post(
  "/scenario-map",
  authMiddleware,
  perUserAiLimiter,
  validateBody(scenarioMapRequestSchema),
  generateScenarioMapHandler,
);

router.post(
  "/audit-continuity",
  authMiddleware,
  perUserAiLimiter,
  validateBody(continuityAuditRequestSchema),
  auditContinuityHandler,
);

// Project CRUD (محمية بـ auth فقط)
router.get("/projects", authMiddleware, listProjectsHandler);

router.post(
  "/projects",
  authMiddleware,
  validateBody(projectPayloadSchema),
  upsertProjectHandler,
);

router.get("/projects/:id", authMiddleware, getProjectHandler);

router.delete("/projects/:id", authMiddleware, deleteProjectHandler);

const generateImageHandler: RequestHandler = (req, res) => {
  void decoupageController.generateImage(req, res);
};

const editImageHandler: RequestHandler = (req, res) => {
  void decoupageController.editImage(req, res);
};

router.post(
  "/generate-image",
  authMiddleware,
  perUserAiLimiter,
  validateBody(generateImageRequestSchema),
  generateImageHandler,
);

router.post(
  "/edit-image",
  authMiddleware,
  perUserAiLimiter,
  validateBody(editImageRequestSchema),
  editImageHandler,
);

export { router as decoupageRouter };
