import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { editorRagRouter } from "./routes";

import type { NextFunction, Request, Response } from "express";

const { mockEditorRagService, mockAuthMiddleware, mockLimiter } = vi.hoisted(
  () => {
    const auth = vi.fn((req: Request, res: Response, next: NextFunction) => {
      if (req.get("authorization") !== "Bearer valid-token") {
        res.status(401).json({
          success: false,
          error: "غير مصرح - يرجى تسجيل الدخول",
        });
        return;
      }
      next();
    });

    const limiter = vi.fn(
      (_req: Request, _res: Response, next: NextFunction) => {
        next();
      },
    );

    return {
      mockAuthMiddleware: auth,
      mockLimiter: limiter,
      mockEditorRagService: {
        askQuestion: vi.fn(),
        health: vi.fn(),
        index: vi.fn(),
        searchCode: vi.fn(),
        stats: vi.fn(),
      },
    };
  },
);

vi.mock("@/middleware/auth.middleware", () => ({
  authMiddleware: mockAuthMiddleware,
}));

vi.mock("@/middleware", () => ({
  perUserAiLimiter: mockLimiter,
}));

vi.mock("./service", () => ({
  editorRagService: mockEditorRagService,
}));

function createApp(): express.Express {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use("/api/editor-rag", editorRagRouter);
  return app;
}

function csrfCookie(token: string): string {
  return `XSRF-TOKEN=${token}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEditorRagService.health.mockResolvedValue({
    status: "healthy",
    gemini: "ready",
    weaviate: {
      enabled: true,
      required: true,
      state: "connected",
    },
    models: {
      embedding: "gemini-embedding-2",
      generation: "gemini-2.5-flash",
      dimensionality: 1536,
    },
  });
  mockEditorRagService.stats.mockResolvedValue({
    collections: { CodeChunks: 4 },
    totalDocuments: 4,
    storage: { provider: "weaviate", url: "http://localhost:8080" },
    models: {
      embedding: "gemini-embedding-2",
      generation: "gemini-2.5-flash",
      dimensionality: 1536,
    },
  });
  mockEditorRagService.searchCode.mockResolvedValue([
    {
      content: "const editor = true;",
      filePath: "src/editor.ts",
      metadata: {},
      score: 0.8,
    },
  ]);
});

describe("editorRagRouter", () => {
  it("requires authentication for health", async () => {
    const response = await request(createApp()).get("/api/editor-rag/health");

    expect(response.status).toBe(401);
    expect(mockEditorRagService.health).not.toHaveBeenCalled();
  });

  it("returns backend-owned Weaviate and Gemini health for authenticated reads", async () => {
    const response = await request(createApp())
      .get("/api/editor-rag/health")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        gemini: "ready",
        models: expect.objectContaining({
          embedding: "gemini-embedding-2",
          generation: "gemini-2.5-flash",
        }),
      }),
    });
  });

  it("protects state-changing search requests with CSRF", async () => {
    const response = await request(createApp())
      .post("/api/editor-rag/search")
      .set("Authorization", "Bearer valid-token")
      .send({ query: "editor" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: "CSRF token missing",
      code: "CSRF_TOKEN_MISSING",
    });
    expect(mockEditorRagService.searchCode).not.toHaveBeenCalled();
  });

  it("passes authenticated CSRF-valid search requests to the service", async () => {
    const token = "matching-token";
    const response = await request(createApp())
      .post("/api/editor-rag/search")
      .set("Authorization", "Bearer valid-token")
      .set("Cookie", [csrfCookie(token)])
      .set("X-XSRF-TOKEN", token)
      .send({ query: "editor", limit: 3 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      count: 1,
      results: [
        expect.objectContaining({
          filePath: "src/editor.ts",
          score: 0.8,
        }),
      ],
    });
    expect(mockEditorRagService.searchCode).toHaveBeenCalledWith("editor", 3);
  });
});
