import fs from "node:fs";
import path from "node:path";

import {
  CODE_MEMORY_DOCUMENT_MODEL,
  CODE_MEMORY_EMBEDDING_DIMENSION,
  CODE_MEMORY_LOCAL_FALLBACK_MODEL,
  CODE_MEMORY_OPENROUTER_API_KEY_ENV,
} from "./config";
import { sha256Hex } from "./hashing";
import type { CodeMemoryChunk } from "./types";

interface LegacyIndexItem {
  path: string;
  chunkIndex?: number;
  embedding?: number[];
}

interface LegacyIndex {
  searchIndex?: LegacyIndexItem[];
}

interface OpenRouterEmbeddingTextContent {
  type: "text";
  text: string;
}

interface OpenRouterEmbeddingInput {
  content: OpenRouterEmbeddingTextContent[];
}

interface OpenRouterEmbeddingRequestBody {
  model: string;
  input: OpenRouterEmbeddingInput[];
  encodingFormat: "float";
  inputType: "passage" | "query";
}

interface OpenRouterEmbeddingResponseBody {
  data: Array<{
    embedding: number[] | string;
  }>;
}

type OpenRouterEmbeddingResponse = OpenRouterEmbeddingResponseBody | string;

interface OpenRouterClient {
  embeddings: {
    generate(request: {
      requestBody: OpenRouterEmbeddingRequestBody;
    }): Promise<OpenRouterEmbeddingResponse>;
  };
}

export interface CodeMemoryEmbedOptions {
  dryRun?: boolean;
  allowLegacyVectors?: boolean;
  previousVectors?: Map<string, number[]>;
  embedBatch?: (batch: CodeMemoryChunk[]) => Promise<number[][]>;
}

function findEnvFile(): string | null {
  let dir = __dirname;
  while (true) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  const fallback = path.join(process.cwd(), ".env");
  return fs.existsSync(fallback) ? fallback : null;
}

function loadEnvFile(): void {
  if (process.env["SKIP_ENV_FILE_DISCOVERY"] === "1") {
    return;
  }
  const envPath = findEnvFile();
  if (!envPath) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0 && !process.env[key]) {
      process.env[key] = rest.join("=").trim();
    }
  }
}

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0),
  );
  if (magnitude === 0) {
    return values;
  }
  return values.map((value) => value / magnitude);
}

function toSignedUnit(bytePair: string): number {
  const value = Number.parseInt(bytePair, 16);
  return Number(((value / 255) * 2 - 1).toFixed(6));
}

function createLocalDeterministicEmbedding(chunk: CodeMemoryChunk): number[] {
  const seed = sha256Hex(
    `${chunk.path}:${chunk.chunkIndex}:${chunk.chunkHash}:${chunk.content}`,
  );
  const values: number[] = [];

  for (let index = 0; index < CODE_MEMORY_EMBEDDING_DIMENSION; index += 1) {
    const start = (index * 2) % seed.length;
    values.push(toSignedUnit(seed.slice(start, start + 2)));
  }

  return normalizeVector(values);
}

function getApiKey(): string | null {
  loadEnvFile();
  return process.env[CODE_MEMORY_OPENROUTER_API_KEY_ENV] || null;
}

async function createClient(): Promise<OpenRouterClient> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      `Missing ${CODE_MEMORY_OPENROUTER_API_KEY_ENV}. Real code-memory embeddings require an OpenRouter API key.`,
    );
  }
  const { OpenRouter } = await import("@openrouter/sdk");
  return new OpenRouter({ apiKey });
}

function isExternalEmbeddingPermissionErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("403") ||
      normalized.includes("401") ||
      normalized.includes("permission_denied") ||
      normalized.includes("unauthenticated") ||
      normalized.includes("invalid authentication credentials") ||
      normalized.includes("access_token_type_unsupported") ||
      normalized.includes("denied access")) &&
    !normalized.includes("api key not valid")
  );
}

export function isExternalEmbeddingPermissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return isExternalEmbeddingPermissionErrorMessage(message);
}

function legacyKey(pathName: string, chunkIndex: number): string {
  return `${pathName}:${chunkIndex}`;
}

export function loadLegacyVectors(
  indexPath = "WORKSPACE-EMBEDDING-INDEX.json",
): Map<string, number[]> {
  const vectors = new Map<string, number[]>();
  if (!fs.existsSync(indexPath)) {
    return vectors;
  }

  const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as LegacyIndex;
  for (const item of parsed.searchIndex ?? []) {
    if (item.embedding && item.embedding.length > 0) {
      vectors.set(legacyKey(item.path, item.chunkIndex ?? 0), item.embedding);
    }
  }
  return vectors;
}

function chunkEmbeddingText(chunk: CodeMemoryChunk): string {
  return `${chunk.path}\n\n${chunk.content}`;
}

export function buildOpenRouterEmbeddingRequestBody(
  chunks: CodeMemoryChunk[],
): OpenRouterEmbeddingRequestBody {
  return {
    model: CODE_MEMORY_DOCUMENT_MODEL,
    input: chunks.map((chunk) => ({
      content: [
        {
          type: "text",
          text: chunkEmbeddingText(chunk),
        },
      ],
    })),
    encodingFormat: "float",
    inputType: "passage",
  };
}

export function buildOpenRouterQueryRequestBody(
  query: string,
): OpenRouterEmbeddingRequestBody {
  return {
    model: CODE_MEMORY_DOCUMENT_MODEL,
    input: [
      {
        content: [
          {
            type: "text",
            text: query,
          },
        ],
      },
    ],
    encodingFormat: "float",
    inputType: "query",
  };
}

function readOpenRouterEmbeddingVectors(
  response: OpenRouterEmbeddingResponse,
  expectedCount: number,
): number[][] {
  if (typeof response === "string") {
    throw new Error("OpenRouter embeddings response was not structured data.");
  }

  if (response.data.length !== expectedCount) {
    throw new Error(
      `OpenRouter embeddings response count mismatch: expected ${expectedCount}, received ${response.data.length}.`,
    );
  }

  return response.data.map((item, index) => {
    if (!Array.isArray(item.embedding)) {
      throw new Error(
        `OpenRouter embedding ${index} was not returned as a float array.`,
      );
    }
    const values = item.embedding.map(Number).filter(Number.isFinite);
    if (values.length === 0) {
      throw new Error(`OpenRouter embedding ${index} was empty.`);
    }
    return values;
  });
}

async function generateOpenRouterEmbeddings(
  openrouter: OpenRouterClient,
  batch: CodeMemoryChunk[],
): Promise<number[][]> {
  const response = await openrouter.embeddings.generate({
    requestBody: buildOpenRouterEmbeddingRequestBody(batch),
  });
  return readOpenRouterEmbeddingVectors(response, batch.length);
}

async function generateOpenRouterQueryEmbedding(
  openrouter: OpenRouterClient,
  query: string,
): Promise<number[]> {
  const response = await openrouter.embeddings.generate({
    requestBody: buildOpenRouterQueryRequestBody(query),
  });
  return readOpenRouterEmbeddingVectors(response, 1)[0];
}

export async function embedDocuments(
  chunks: CodeMemoryChunk[],
  options: CodeMemoryEmbedOptions = {},
): Promise<CodeMemoryChunk[]> {
  if (options.dryRun) {
    return chunks;
  }

  const previousVectors =
    options.previousVectors ?? new Map<string, number[]>();
  const chunksNeedingEmbeddings = chunks.filter(
    (chunk) => !previousVectors.has(legacyKey(chunk.path, chunk.chunkIndex)),
  );
  const embeddedChunks = chunks.map((chunk) => {
    const existingVector = previousVectors.get(
      legacyKey(chunk.path, chunk.chunkIndex),
    );
    return existingVector ? { ...chunk, embedding: existingVector } : chunk;
  });

  if (chunksNeedingEmbeddings.length === 0) {
    return embeddedChunks;
  }

  const openrouter = options.embedBatch ? null : await createClient();
  const batchSize = 10;
  const vectorById = new Map<string, number[]>();
  const modelById = new Map<string, string>();

  for (
    let start = 0;
    start < chunksNeedingEmbeddings.length;
    start += batchSize
  ) {
    const batch = chunksNeedingEmbeddings.slice(start, start + batchSize);
    try {
      const embeddings = options.embedBatch
        ? await options.embedBatch(batch)
        : await generateOpenRouterEmbeddings(openrouter!, batch);

      embeddings.forEach((embedding, index) => {
        const chunk = batch[index];
        vectorById.set(chunk.id, normalizeVector(embedding));
        modelById.set(chunk.id, CODE_MEMORY_DOCUMENT_MODEL);
      });
    } catch (error) {
      if (!isExternalEmbeddingPermissionError(error)) {
        throw error;
      }

      for (const chunk of batch) {
        vectorById.set(chunk.id, createLocalDeterministicEmbedding(chunk));
        modelById.set(chunk.id, CODE_MEMORY_LOCAL_FALLBACK_MODEL);
      }
    }
  }

  return embeddedChunks.map((chunk) => {
    if (chunk.embedding) {
      return chunk;
    }
    const embedding = vectorById.get(chunk.id);
    if (!embedding) {
      throw new Error(
        `Missing generated embedding for ${chunk.path}:${chunk.chunkIndex}`,
      );
    }
    return {
      ...chunk,
      embedding,
      embeddingModel: modelById.get(chunk.id) ?? CODE_MEMORY_DOCUMENT_MODEL,
    };
  });
}

export async function embedQuery(query: string): Promise<number[]> {
  const openrouter = await createClient();
  return normalizeVector(
    await generateOpenRouterQueryEmbedding(openrouter, query),
  );
}
