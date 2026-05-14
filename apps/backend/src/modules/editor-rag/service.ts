import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

import { contextBuilder } from "@/memory/retrieval/context-builder";
import { embeddingGenerator } from "@/memory/embeddings/generator";
import { weaviateIndexingService } from "@/memory/indexer/weaviate-indexing.service";
import { weaviateStore } from "@/memory/vector-store/client";
import { platformGenAIService } from "@/services/platform-genai.service";
import { definedProps } from "@/utils/defined-props";

import type { ContextResult, IndexingStats } from "@/memory/types";
import type { ContextBuilder } from "@/memory/retrieval/context-builder";
import type { GeminiEmbeddingGenerator } from "@/memory/embeddings/generator";
import type { WeaviateIndexingService } from "@/memory/indexer/weaviate-indexing.service";
import type {
  WeaviateMemoryStore,
  WeaviateRuntimeStatus,
} from "@/memory/vector-store/client";
import type { PlatformGenAIService } from "@/services/platform-genai.service";

export const EDITOR_RAG_EMBEDDING_MODEL = "gemini-embedding-2";
export const EDITOR_RAG_GENERATION_MODEL = "gemini-2.5-flash";
export const EDITOR_RAG_DIMENSIONALITY = 1536;

const EDITOR_RAG_COLLECTIONS = [
  "CodeChunks",
  "Documentation",
  "Decisions",
  "Architecture",
  "AdHocChunks",
] as const;

export interface EditorRagSource {
  filePath: string;
  snippet: string;
  score: number;
  startLine?: number;
  endLine?: number;
}

export interface EditorRagSearchResult {
  id?: string;
  content: string;
  filePath: string;
  score: number;
  metadata: Record<string, unknown>;
  startLine?: number;
  endLine?: number;
}

export interface EditorRagAnswer {
  answer: string;
  sources: EditorRagSource[];
}

export interface EditorRagStats {
  collections: Record<string, number>;
  totalDocuments: number;
  storage: {
    provider: "weaviate";
    url: string;
  };
  models: {
    embedding: string;
    generation: string;
    dimensionality: number;
  };
}

export interface EditorRagHealth {
  status: "healthy" | "degraded" | "disabled" | "unhealthy";
  gemini: "ready" | "configured-failing" | "missing";
  geminiError?: string;
  weaviate: WeaviateRuntimeStatus;
  models: EditorRagStats["models"];
}

interface EditorRagDependencies {
  contextBuilder: Pick<ContextBuilder, "quickSearch">;
  embeddingGenerator: Pick<GeminiEmbeddingGenerator, "probeDefaultModel">;
  genAIService: Pick<PlatformGenAIService, "generateText" | "probeHealth">;
  indexingService: Pick<WeaviateIndexingService, "indexRepository">;
  weaviateStore: Pick<
    WeaviateMemoryStore,
    "deleteCollection" | "getCollectionCount" | "getStatus" | "healthCheck"
  >;
}

export interface EditorRagServiceOptions {
  env?: Record<string, string | undefined>;
  cwd?: string;
}

export interface EditorRagIndexOptions {
  repoPath?: string;
  specificFiles?: string[];
  reset?: boolean;
  maxFiles?: number;
  allowOutsideWorkspace?: boolean;
}

function hasConfiguredGeminiKey(
  source: Record<string, string | undefined>,
): boolean {
  return Boolean(
    source["GEMINI_API_KEY"]?.trim() || source["GOOGLE_GENAI_API_KEY"]?.trim(),
  );
}

function findWorkspaceRoot(startPath: string): string {
  let current = resolve(startPath);

  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = resolve(current, "..");
    if (parent === current) {
      return resolve(startPath);
    }
    current = parent;
  }
}

export function getDefaultEditorRagRoot(startPath = process.cwd()): string {
  return join(
    findWorkspaceRoot(startPath),
    "apps",
    "web",
    "src",
    "app",
    "(main)",
    "editor",
  );
}

function isWithin(parentPath: string, childPath: string): boolean {
  const pathDelta = relative(parentPath, childPath);
  return (
    pathDelta === "" || (!pathDelta.startsWith("..") && !isAbsolute(pathDelta))
  );
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function sourceFilePath(result: ContextResult): string {
  const metadataPath = result.metadata["filePath"];
  return typeof metadataPath === "string" && metadataPath.trim()
    ? metadataPath
    : result.source;
}

function toSearchResult(result: ContextResult): EditorRagSearchResult {
  const startLine = asNumber(result.metadata["startLine"]);
  const endLine = asNumber(result.metadata["endLine"]);

  return {
    content: result.content,
    filePath: sourceFilePath(result),
    score: result.relevance,
    metadata: result.metadata,
    ...definedProps({
      id: result.id,
      startLine,
      endLine,
    }),
  };
}

function toSource(result: EditorRagSearchResult): EditorRagSource {
  return {
    filePath: result.filePath,
    snippet:
      result.content.slice(0, 240) + (result.content.length > 240 ? "..." : ""),
    score: result.score,
    ...definedProps({
      startLine: result.startLine,
      endLine: result.endLine,
    }),
  };
}

export class EditorRagService {
  private readonly deps: EditorRagDependencies;
  private readonly envSource: Record<string, string | undefined>;
  private readonly cwd: string;

  constructor(
    deps: EditorRagDependencies = {
      contextBuilder,
      embeddingGenerator,
      genAIService: platformGenAIService,
      indexingService: weaviateIndexingService,
      weaviateStore,
    },
    options: EditorRagServiceOptions = {},
  ) {
    this.deps = deps;
    this.envSource = options.env ?? process.env;
    this.cwd = options.cwd ?? process.cwd();
  }

  async health(): Promise<EditorRagHealth> {
    const before = this.deps.weaviateStore.getStatus();
    let weaviate = before;

    if (before.enabled) {
      await this.deps.weaviateStore.healthCheck();
      weaviate = this.deps.weaviateStore.getStatus();
    }

    let gemini: EditorRagHealth["gemini"] = "missing";
    let geminiError: string | undefined;
    if (hasConfiguredGeminiKey(this.envSource)) {
      const providerHealth = await this.deps.genAIService.probeHealth();
      if (providerHealth.triState === "ready") {
        try {
          await this.deps.embeddingGenerator.probeDefaultModel();
          gemini = "ready";
        } catch (error) {
          gemini = "configured-failing";
          geminiError =
            error instanceof Error ? error.message : "Gemini embedding failed";
        }
      } else {
        gemini = "configured-failing";
        geminiError = providerHealth.error ?? providerHealth.message;
      }
    }

    const status = !weaviate.enabled
      ? "disabled"
      : weaviate.state === "connected" && gemini === "ready"
        ? "healthy"
        : weaviate.required || gemini !== "ready"
          ? "unhealthy"
          : "degraded";

    return {
      status,
      gemini,
      ...definedProps({ geminiError }),
      weaviate,
      models: this.models(),
    };
  }

  async stats(): Promise<EditorRagStats> {
    const counts = await Promise.all(
      EDITOR_RAG_COLLECTIONS.map(async (collection) => {
        try {
          return [
            collection,
            await this.deps.weaviateStore.getCollectionCount(collection),
          ] as const;
        } catch {
          return [collection, 0] as const;
        }
      }),
    );
    const collections = Object.fromEntries(counts) as Record<string, number>;

    return {
      collections,
      totalDocuments: Object.values(collections).reduce(
        (total, count) => total + count,
        0,
      ),
      storage: {
        provider: "weaviate",
        url: this.envSource["WEAVIATE_URL"] ?? "http://localhost:8080",
      },
      models: this.models(),
    };
  }

  async index(options: EditorRagIndexOptions = {}): Promise<{
    repoPath: string;
    stats: IndexingStats;
    models: EditorRagStats["models"];
  }> {
    this.requireGeminiKey();

    const repoPath = this.resolveRepositoryPath(options.repoPath, {
      allowOutsideWorkspace: options.allowOutsideWorkspace ?? false,
    });

    if (options.reset) {
      await Promise.all(
        EDITOR_RAG_COLLECTIONS.map((collection) =>
          this.deps.weaviateStore.deleteCollection(collection),
        ),
      );
    }

    const stats = await this.deps.indexingService.indexRepository({
      repoPath,
      maxFiles: options.maxFiles ?? 5000,
      allowEmbeddingFallback: false,
      embeddingCacheNamespace: "editor-rag",
      ...definedProps({
        specificFiles: options.specificFiles,
      }),
    });

    return {
      repoPath,
      stats,
      models: this.models(),
    };
  }

  async searchCode(query: string, limit = 5): Promise<EditorRagSearchResult[]> {
    this.requireGeminiKey();

    const results = await this.deps.contextBuilder.quickSearch(
      query,
      "CodeChunks",
      limit,
      {
        allowEmbeddingFallback: false,
        embeddingCacheNamespace: "editor-rag",
      },
    );
    return results.map(toSearchResult);
  }

  async askQuestion(question: string, limit = 5): Promise<EditorRagAnswer> {
    this.requireGeminiKey();

    const results = await this.searchCode(question, limit);
    if (results.length === 0) {
      return {
        answer: "لم أجد معلومات كافية في كود المحرر للإجابة على هذا السؤال.",
        sources: [],
      };
    }

    const prompt = this.buildPrompt(question, results);
    const answer = await this.deps.genAIService.generateText(prompt, {
      model: EDITOR_RAG_GENERATION_MODEL,
      temperature: 0.2,
      maxOutputTokens: 4096,
    });

    return {
      answer,
      sources: results.map(toSource),
    };
  }

  buildPrompt(question: string, results: EditorRagSearchResult[]): string {
    const context = results
      .map((result, index) => {
        const location =
          result.startLine && result.endLine
            ? `${result.filePath}:${result.startLine}-${result.endLine}`
            : result.filePath;
        return `[${index + 1}] من ${location}\n${result.content}`;
      })
      .join("\n\n---\n\n");

    return `أنت مساعد برمجي متخصص في كود محرر The Copy.
أجب باللغة العربية اعتمادًا على المقاطع المسترجعة فقط.
اذكر أسماء الملفات والأسطر أو الدوال عندما تكون متاحة.
إذا كان السياق غير كافٍ، قل ذلك بوضوح ولا تخترع تفاصيل.

السؤال:
${question}

السياق المسترجع من Weaviate:
${context}

الإجابة:`;
  }

  private models(): EditorRagStats["models"] {
    return {
      embedding: EDITOR_RAG_EMBEDDING_MODEL,
      generation: EDITOR_RAG_GENERATION_MODEL,
      dimensionality: EDITOR_RAG_DIMENSIONALITY,
    };
  }

  private requireGeminiKey(): void {
    if (!hasConfiguredGeminiKey(this.envSource)) {
      throw new Error(
        "GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is required for backend Editor RAG.",
      );
    }
  }

  private resolveRepositoryPath(
    requestedPath: string | undefined,
    options: { allowOutsideWorkspace: boolean },
  ): string {
    const workspaceRoot = findWorkspaceRoot(this.cwd);
    const defaultPath =
      this.envSource["EDITOR_RAG_REPO_PATH"] ??
      getDefaultEditorRagRoot(this.cwd);
    const resolvedPath = resolve(this.cwd, requestedPath ?? defaultPath);

    if (
      !options.allowOutsideWorkspace &&
      !isWithin(workspaceRoot, resolvedPath)
    ) {
      throw new Error(
        `Editor RAG indexing path must stay inside workspace root: ${workspaceRoot}`,
      );
    }

    return resolvedPath;
  }
}

export const editorRagService = new EditorRagService();
