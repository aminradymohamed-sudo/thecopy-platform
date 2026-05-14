import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { perUserAiLimiter } from "@/middleware";
import { authMiddleware } from "@/middleware/auth.middleware";
import { csrfProtection } from "@/middleware/csrf.middleware";

import { editorRagService } from "./service";

import type { EditorRagIndexOptions } from "./service";

const router = Router();

const positiveLimitSchema = z.number().int().positive().max(25).optional();

const indexBodySchema = z.object({
  repoPath: z.string().min(1).optional(),
  specificFiles: z.array(z.string().min(1)).optional(),
  reset: z.boolean().optional(),
  maxFiles: z.number().int().positive().max(10_000).optional(),
});

const searchBodySchema = z.object({
  query: z.string().min(1),
  limit: positiveLimitSchema,
});

const askBodySchema = z.object({
  question: z.string().min(1),
  limit: positiveLimitSchema,
});

type IndexBody = z.infer<typeof indexBodySchema>;

function toIndexOptions(body: IndexBody): EditorRagIndexOptions {
  return {
    ...(body.repoPath ? { repoPath: body.repoPath } : {}),
    ...(body.specificFiles ? { specificFiles: body.specificFiles } : {}),
    ...(typeof body.reset === "boolean" ? { reset: body.reset } : {}),
    ...(body.maxFiles ? { maxFiles: body.maxFiles } : {}),
  };
}

function validationError(res: Response): void {
  res.status(400).json({
    success: false,
    error: "Invalid Editor RAG request payload.",
  });
}

function serverError(res: Response, error: unknown): void {
  res.status(500).json({
    success: false,
    error:
      error instanceof Error
        ? error.message
        : "Editor RAG request failed unexpectedly.",
  });
}

router.use(authMiddleware);

router.get("/health", async (_req: Request, res: Response): Promise<void> => {
  try {
    const health = await editorRagService.health();
    res.status(health.status === "unhealthy" ? 503 : 200).json({
      success: health.status !== "unhealthy",
      data: health,
    });
  } catch (error) {
    serverError(res, error);
  }
});

router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await editorRagService.stats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    serverError(res, error);
  }
});

router.post(
  "/index",
  csrfProtection,
  perUserAiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = indexBodySchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res);
      return;
    }

    try {
      const result = await editorRagService.index(toIndexOptions(parsed.data));
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      serverError(res, error);
    }
  },
);

router.post(
  "/search",
  csrfProtection,
  perUserAiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = searchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res);
      return;
    }

    try {
      const results = await editorRagService.searchCode(
        parsed.data.query,
        parsed.data.limit,
      );
      res.json({
        success: true,
        count: results.length,
        results,
      });
    } catch (error) {
      serverError(res, error);
    }
  },
);

router.post(
  "/ask",
  csrfProtection,
  perUserAiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const parsed = askBodySchema.safeParse(req.body);
    if (!parsed.success) {
      validationError(res);
      return;
    }

    try {
      const answer = await editorRagService.askQuestion(
        parsed.data.question,
        parsed.data.limit,
      );
      res.json({
        success: true,
        data: answer,
      });
    } catch (error) {
      serverError(res, error);
    }
  },
);

export { router as editorRagRouter };
