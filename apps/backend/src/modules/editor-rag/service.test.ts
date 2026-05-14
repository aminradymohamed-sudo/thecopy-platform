import { readFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditorRagService, EDITOR_RAG_GENERATION_MODEL } from "./service";

import type { ContextResult } from "@/memory/types";

const connectedWeaviateStatus = {
  enabled: true,
  required: true,
  state: "connected" as const,
  host: "http://localhost:8080",
};

function buildResult(overrides: Partial<ContextResult> = {}): ContextResult {
  return {
    id: "hit-1",
    content: "export function createEditor() { return true; }",
    source: "src/editor.ts",
    type: "code",
    collection: "CodeChunks",
    relevance: 0.91,
    rank: 1,
    lastModified: new Date("2026-05-01T00:00:00.000Z"),
    metadata: {
      filePath: "src/editor.ts",
      startLine: 10,
      endLine: 12,
    },
    ...overrides,
  };
}

function buildService(
  env: Record<string, string | undefined> = {
    GEMINI_API_KEY: "test-key",
  },
): {
  service: EditorRagService;
  deps: {
    quickSearch: ReturnType<typeof vi.fn>;
    generateText: ReturnType<typeof vi.fn>;
    indexRepository: ReturnType<typeof vi.fn>;
    probeDefaultModel: ReturnType<typeof vi.fn>;
    probeHealth: ReturnType<typeof vi.fn>;
  };
} {
  const deps = {
    quickSearch: vi.fn(),
    generateText: vi.fn(),
    indexRepository: vi.fn(),
    probeDefaultModel: vi.fn().mockResolvedValue(undefined),
    probeHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      triState: "ready",
      responseTime: 1,
    }),
  };

  const service = new EditorRagService(
    {
      contextBuilder: {
        quickSearch: deps.quickSearch,
      },
      embeddingGenerator: {
        probeDefaultModel: deps.probeDefaultModel,
      },
      genAIService: {
        generateText: deps.generateText,
        probeHealth: deps.probeHealth,
      },
      indexingService: {
        indexRepository: deps.indexRepository,
      },
      weaviateStore: {
        deleteCollection: vi.fn(),
        getCollectionCount: vi.fn().mockResolvedValue(3),
        getStatus: vi.fn(() => connectedWeaviateStatus),
        healthCheck: vi.fn().mockResolvedValue(true),
      },
    },
    {
      env,
      cwd: process.cwd(),
    },
  );

  return { service, deps };
}

describe("EditorRagService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects RAG operations when no Gemini key is configured", async () => {
    const { service } = buildService({});

    await expect(service.askQuestion("ما نقطة دخول المحرر؟")).rejects.toThrow(
      /GEMINI_API_KEY or GOOGLE_GENAI_API_KEY/,
    );
  });

  it("searches only the backend CodeChunks collection", async () => {
    const { service, deps } = buildService();
    deps.quickSearch.mockResolvedValue([buildResult()]);

    const results = await service.searchCode("editor entry", 7);

    expect(deps.quickSearch).toHaveBeenCalledWith(
      "editor entry",
      "CodeChunks",
      7,
      {
        allowEmbeddingFallback: false,
        embeddingCacheNamespace: "editor-rag",
      },
    );
    expect(results).toEqual([
      expect.objectContaining({
        filePath: "src/editor.ts",
        score: 0.91,
        startLine: 10,
        endLine: 12,
      }),
    ]);
  });

  it("reports invalid Gemini credentials before indexing work starts", async () => {
    const { service, deps } = buildService();
    deps.probeHealth.mockResolvedValue({
      status: "unhealthy",
      triState: "configured-failing",
      responseTime: 2,
      error: "API key is invalid",
    });

    const health = await service.health();

    expect(health).toEqual(
      expect.objectContaining({
        status: "unhealthy",
        gemini: "configured-failing",
        geminiError: "API key is invalid",
      }),
    );
  });

  it("reports embedding model failures even when generation is ready", async () => {
    const { service, deps } = buildService();
    deps.probeDefaultModel.mockRejectedValue(
      new Error("Gemini embedding denied"),
    );

    const health = await service.health();

    expect(health).toEqual(
      expect.objectContaining({
        status: "unhealthy",
        gemini: "configured-failing",
        geminiError: "Gemini embedding denied",
      }),
    );
  });

  it("builds an Arabic grounded prompt with source file lines", async () => {
    const { service, deps } = buildService();
    deps.quickSearch.mockResolvedValue([buildResult()]);
    deps.generateText.mockResolvedValue("الإجابة من السياق.");

    const answer = await service.askQuestion("كيف يبدأ المحرر؟", 1);

    expect(deps.generateText).toHaveBeenCalledWith(
      expect.stringContaining("أجب باللغة العربية"),
      expect.objectContaining({
        model: EDITOR_RAG_GENERATION_MODEL,
        temperature: 0.2,
      }),
    );
    const prompt = deps.generateText.mock.calls[0]?.[0] as string;
    expect(prompt).toContain("src/editor.ts:10-12");
    expect(prompt).toContain("السؤال:");
    expect(answer.sources[0]).toEqual(
      expect.objectContaining({
        filePath: "src/editor.ts",
        score: 0.91,
      }),
    );
  });

  it("indexes through Gemini embedding 2 without model fallback", async () => {
    const { service, deps } = buildService();
    deps.indexRepository.mockResolvedValue({
      filesProcessed: 1,
      chunksIndexed: 2,
      collections: { CodeChunks: 2 },
    });

    await service.index({
      repoPath: process.cwd(),
      allowOutsideWorkspace: true,
      maxFiles: 1,
    });

    expect(deps.indexRepository).toHaveBeenCalledWith(
      expect.objectContaining({
        allowEmbeddingFallback: false,
        embeddingCacheNamespace: "editor-rag",
      }),
    );
  });

  it("does not import or instantiate Qdrant in the backend Editor RAG service", () => {
    const source = readFileSync(
      __filename.replace(/\.test\.ts$/, ".ts"),
      "utf8",
    );

    expect(source).not.toMatch(/qdrant/i);
    expect(source).not.toMatch(/OPENROUTER_API_KEY/);
  });
});
