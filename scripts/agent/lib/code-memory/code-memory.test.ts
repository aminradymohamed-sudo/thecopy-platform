import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  calculateCodeMemoryDiff,
  createFileHashes,
  discoverCodeMemoryChunks,
} from "./discovery";
import {
  CODE_MEMORY_DOCUMENT_MODEL,
  CODE_MEMORY_EMBEDDING_DIMENSION,
  CODE_MEMORY_LOCAL_FALLBACK_MODEL,
} from "./config";
import {
  buildOpenRouterEmbeddingRequestBody,
  buildOpenRouterQueryRequestBody,
  embedDocuments,
  isExternalEmbeddingPermissionError,
} from "./embedder";
import { collectCodeMemoryHealth } from "./status";
import {
  readAllCodeMemoryChunks,
  searchCodeMemory,
  writeCodeMemoryStore,
} from "./store";
import type { CodeMemoryChunk, CodeMemoryManifest } from "./types";

const ORIGINAL_CWD = process.cwd();
let currentTempRepo: string | null = null;
let originalGoogleKey: string | undefined;
let originalGeminiKey: string | undefined;
let originalOpenRouterKey: string | undefined;
let originalLanceDir: string | undefined;

async function createTempRepo(): Promise<string> {
  currentTempRepo = await mkdtemp(path.join(os.tmpdir(), "code-memory-"));
  process.env.AGENT_CODE_MEMORY_LANCE_DIR = path.join(
    currentTempRepo,
    ".agent-code-memory",
    "lancedb",
  );
  return currentTempRepo;
}

async function writeRepoFile(
  repoRoot: string,
  repoRelativePath: string,
  content: string,
): Promise<void> {
  const absolutePath = path.join(repoRoot, ...repoRelativePath.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

function withEmbedding(chunk: CodeMemoryChunk, value: number): CodeMemoryChunk {
  return { ...chunk, embedding: [value, value + 1, value + 2] };
}

function manifestFromChunks(chunks: CodeMemoryChunk[]): CodeMemoryManifest {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    storage: {
      local: "lancedb",
      qdrant: "not-configured",
    },
    model: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
    embeddingDimension: 3,
    totalFiles: new Set(chunks.map((chunk) => chunk.path)).size,
    totalChunks: chunks.length,
    embeddedChunks: chunks.length,
    chunkIds: chunks.map((chunk) => chunk.id),
    fileHashes: createFileHashes(chunks),
    diff: calculateCodeMemoryDiff(chunks, null),
  };
}

beforeEach(() => {
  originalGoogleKey = process.env.GOOGLE_GENAI_API_KEY;
  originalGeminiKey = process.env.GEMINI_API_KEY;
  originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  originalLanceDir = process.env.AGENT_CODE_MEMORY_LANCE_DIR;
});

afterEach(async () => {
  process.chdir(ORIGINAL_CWD);
  if (originalGoogleKey === undefined) {
    delete process.env.GOOGLE_GENAI_API_KEY;
  } else {
    process.env.GOOGLE_GENAI_API_KEY = originalGoogleKey;
  }
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
  if (originalOpenRouterKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  }
  if (originalLanceDir === undefined) {
    delete process.env.AGENT_CODE_MEMORY_LANCE_DIR;
  } else {
    process.env.AGENT_CODE_MEMORY_LANCE_DIR = originalLanceDir;
  }
  if (currentTempRepo) {
    await rm(currentTempRepo, { recursive: true, force: true });
    currentTempRepo = null;
  }
});

describe.sequential("code memory", () => {
  test("builds OpenRouter embedding requests with the governed model", () => {
    const chunk: CodeMemoryChunk = {
      id: "chunk-1",
      path: "scripts/openrouter.ts",
      type: "agent-scripts",
      chunkIndex: 0,
      totalChunks: 1,
      content: "export const provider = 'openrouter';\n",
      summary: "OpenRouter provider",
      fileHash: "file-hash",
      chunkHash: "chunk-hash",
      size: 39,
      extension: ".ts",
      discoveredAt: "2026-05-06T00:00:00.000Z",
    };

    expect(buildOpenRouterEmbeddingRequestBody([chunk])).toEqual({
      model: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
      input: [
        {
          content: [
            {
              type: "text",
              text: "scripts/openrouter.ts\n\nexport const provider = 'openrouter';\n",
            },
          ],
        },
      ],
      encodingFormat: "float",
      inputType: "passage",
    });
    expect(CODE_MEMORY_DOCUMENT_MODEL).toBe(
      "nvidia/llama-nemotron-embed-vl-1b-v2:free",
    );
  });

  test("builds OpenRouter query requests with query input type", () => {
    expect(buildOpenRouterQueryRequestBody("agent memory status")).toEqual({
      model: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
      input: [
        {
          content: [
            {
              type: "text",
              text: "agent memory status",
            },
          ],
        },
      ],
      encodingFormat: "float",
      inputType: "query",
    });
  });

  test("discovers code while ignoring heavy generated directories", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/main.ts",
      "export const marker = 'agent memory';\n",
    );
    await writeRepoFile(
      repoRoot,
      "scripts/node_modules/ignored.ts",
      "export const ignored = true;\n",
    );
    await writeRepoFile(
      repoRoot,
      "scripts/.next/ignored.ts",
      "export const ignored = true;\n",
    );
    await writeRepoFile(
      repoRoot,
      "scripts/dist/ignored.ts",
      "export const ignored = true;\n",
    );
    await writeRepoFile(
      repoRoot,
      "scripts/coverage/ignored.ts",
      "export const ignored = true;\n",
    );

    process.chdir(repoRoot);
    const chunks = await discoverCodeMemoryChunks();
    const paths = chunks.map((chunk) => chunk.path);

    expect(paths).toContain("scripts/main.ts");
    expect(paths.some((repoPath) => repoPath.includes("node_modules"))).toBe(
      false,
    );
    expect(paths.some((repoPath) => repoPath.includes(".next"))).toBe(false);
    expect(paths.some((repoPath) => repoPath.includes("dist"))).toBe(false);
    expect(paths.some((repoPath) => repoPath.includes("coverage"))).toBe(false);
  });

  test("keeps chunk identifiers stable when content is unchanged", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/stable.ts",
      "export const stable = 'same content';\n",
    );

    process.chdir(repoRoot);
    const first = await discoverCodeMemoryChunks();
    const second = await discoverCodeMemoryChunks();

    expect(first.map((chunk) => chunk.id)).toEqual(
      second.map((chunk) => chunk.id),
    );
  });

  test("reports deleted files and chunks before writing a new manifest", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/keep.ts",
      "export const keep = true;\n",
    );
    await writeRepoFile(
      repoRoot,
      "scripts/remove.ts",
      "export const remove = true;\n",
    );

    process.chdir(repoRoot);
    const previousChunks = await discoverCodeMemoryChunks();
    const previousManifest = manifestFromChunks(previousChunks);
    await unlink(path.join(repoRoot, "scripts", "remove.ts"));

    const currentChunks = await discoverCodeMemoryChunks();
    const diff = calculateCodeMemoryDiff(currentChunks, previousManifest);

    expect(diff.deletedFiles).toContain("scripts/remove.ts");
    expect(diff.deletedChunks.length).toBeGreaterThan(0);
  });

  test("reuses existing vectors and refuses fake embeddings without an API key", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/embed.ts",
      "export const embed = 'reuse';\n",
    );
    originalGoogleKey = process.env.GOOGLE_GENAI_API_KEY;
    originalGeminiKey = process.env.GEMINI_API_KEY;
    originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
    delete process.env.GOOGLE_GENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const originalSkipDiscovery = process.env.SKIP_ENV_FILE_DISCOVERY;
    process.env.SKIP_ENV_FILE_DISCOVERY = "1";

    try {
      process.chdir(repoRoot);
      const [chunk] = await discoverCodeMemoryChunks();
      const previousVectors = new Map([
        [`${chunk.path}:${chunk.chunkIndex}`, [1, 0, 0]],
      ]);
      const reused = await embedDocuments([chunk], { previousVectors });

      expect(reused[0].embedding).toEqual([1, 0, 0]);
      await expect(
        embedDocuments([chunk], { previousVectors: new Map() }),
      ).rejects.toThrow(/Missing OPENROUTER_API_KEY/);
    } finally {
      if (originalSkipDiscovery === undefined) {
        delete process.env.SKIP_ENV_FILE_DISCOVERY;
      } else {
        process.env.SKIP_ENV_FILE_DISCOVERY = originalSkipDiscovery;
      }
    }
  });

  test("uses governed local fallback embeddings when the external provider denies project access", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/denied.ts",
      "export const denied = 'external provider denied';\n",
    );
    process.env.OPENROUTER_API_KEY = "denied-key";

    process.chdir(repoRoot);
    const [chunk] = await discoverCodeMemoryChunks();
    const deniedError = new Error(
      "got status: 403 . PERMISSION_DENIED Your project has been denied access",
    );
    const embedded = await embedDocuments([chunk], {
      previousVectors: new Map(),
      embedBatch: async () => {
        throw deniedError;
      },
    });

    expect(isExternalEmbeddingPermissionError(deniedError)).toBe(true);
    expect(embedded[0].embedding).toHaveLength(CODE_MEMORY_EMBEDDING_DIMENSION);
    expect(embedded[0].embeddingModel).toBe(CODE_MEMORY_LOCAL_FALLBACK_MODEL);
    expect(embedded[0].embeddingModel).not.toBe(CODE_MEMORY_DOCUMENT_MODEL);
  });

  test("uses governed local fallback embeddings when the external provider rejects authentication", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/unauthenticated.ts",
      "export const unauthenticated = 'external provider rejected auth';\n",
    );
    process.env.OPENROUTER_API_KEY = "invalid-token-type";

    process.chdir(repoRoot);
    const [chunk] = await discoverCodeMemoryChunks();
    const unauthenticatedError = new Error(
      "got status: 401 . UNAUTHENTICATED Request had invalid authentication credentials ACCESS_TOKEN_TYPE_UNSUPPORTED",
    );
    const embedded = await embedDocuments([chunk], {
      previousVectors: new Map(),
      embedBatch: async () => {
        throw unauthenticatedError;
      },
    });

    expect(isExternalEmbeddingPermissionError(unauthenticatedError)).toBe(true);
    expect(embedded[0].embedding).toHaveLength(CODE_MEMORY_EMBEDDING_DIMENSION);
    expect(embedded[0].embeddingModel).toBe(CODE_MEMORY_LOCAL_FALLBACK_MODEL);
    expect(embedded[0].embeddingModel).not.toBe(CODE_MEMORY_DOCUMENT_MODEL);
  });

  test("uses governed local fallback embeddings when the external provider rejects the credential type", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/unsupported-credential.ts",
      "export const denied = 'external provider rejected credential type';\n",
    );
    process.env.OPENROUTER_API_KEY = "unsupported-credential";

    process.chdir(repoRoot);
    const [chunk] = await discoverCodeMemoryChunks();
    const deniedError = new Error(
      "got status: 401 . ACCESS_TOKEN_TYPE_UNSUPPORTED",
    );
    const embedded = await embedDocuments([chunk], {
      previousVectors: new Map(),
      embedBatch: async () => {
        throw deniedError;
      },
    });

    expect(isExternalEmbeddingPermissionError(deniedError)).toBe(true);
    expect(embedded[0].embedding).toHaveLength(CODE_MEMORY_EMBEDDING_DIMENSION);
    expect(embedded[0].embeddingModel).toBe(CODE_MEMORY_LOCAL_FALLBACK_MODEL);
    expect(embedded[0].embeddingModel).not.toBe(CODE_MEMORY_DOCUMENT_MODEL);
  });

  test("writes local memory, deletes removed chunks, and returns a text search result", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/search.ts",
      "export const bootstrapMemory = 'agent bootstrap verify memory';\n",
    );
    await writeRepoFile(
      repoRoot,
      "scripts/delete.ts",
      "export const deletionProbe = true;\n",
    );

    process.chdir(repoRoot);
    const initialChunks = (await discoverCodeMemoryChunks()).map(
      (chunk, index) => withEmbedding(chunk, index + 1),
    );
    const firstManifest = await writeCodeMemoryStore(
      initialChunks,
      null,
      "not-configured",
    );
    await unlink(path.join(repoRoot, "scripts", "delete.ts"));
    const nextChunks = (await discoverCodeMemoryChunks()).map((chunk, index) =>
      withEmbedding(chunk, index + 1),
    );
    const secondManifest = await writeCodeMemoryStore(
      nextChunks,
      firstManifest,
      "not-configured",
    );
    const storedChunks = await readAllCodeMemoryChunks();
    const results = await searchCodeMemory(
      "agent bootstrap verify memory",
      undefined,
      3,
    );
    const hybridResults = await searchCodeMemory(
      "agent bootstrap verify memory",
      [-1, -2, -3],
      3,
    );

    expect(secondManifest.diff.deletedFiles).toContain("scripts/delete.ts");
    expect(storedChunks.map((chunk) => chunk.path)).not.toContain(
      "scripts/delete.ts",
    );
    expect(results[0]?.path).toBe("scripts/search.ts");
    expect(hybridResults[0]?.path).toBe("scripts/search.ts");
  });

  test("marks memory stale when indexed code changes", async () => {
    const repoRoot = await createTempRepo();
    await writeRepoFile(
      repoRoot,
      "scripts/status.ts",
      "export const status = 'current';\n",
    );

    process.chdir(repoRoot);
    const chunks = (await discoverCodeMemoryChunks()).map((chunk, index) =>
      withEmbedding(chunk, index + 1),
    );
    await writeCodeMemoryStore(chunks, null, "not-configured");
    const currentHealth = await collectCodeMemoryHealth();
    await writeRepoFile(
      repoRoot,
      "scripts/status.ts",
      "export const status = 'changed';\n",
    );
    const staleHealth = await collectCodeMemoryHealth();

    expect(currentHealth.exists).toBe(true);
    expect(currentHealth.stale).toBe(false);
    expect(staleHealth.stale).toBe(true);
    expect(staleHealth.changedFiles).toBeGreaterThan(0);
  });
});
