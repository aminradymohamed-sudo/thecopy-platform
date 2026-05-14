import {
  Router,
  type RequestHandler,
  type Router as ExpressRouter,
} from "express";
import rateLimit from "express-rate-limit";

import { actorAiController } from "../controllers/actorai.controller";

const router: ExpressRouter = Router();

const analyticsLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      error: String(options.message),
    });
  },
});

const saveVoiceAnalytics: RequestHandler = (req, res) => {
  void actorAiController.saveVoiceAnalytics(req, res);
};

const saveWebcamAnalysis: RequestHandler = (req, res) => {
  void actorAiController.saveWebcamAnalysis(req, res);
};

router.post("/voice-analytics", analyticsLimiter, saveVoiceAnalytics);
router.post("/webcam-analysis", analyticsLimiter, saveWebcamAnalysis);

export { router as actoraiRouter };
