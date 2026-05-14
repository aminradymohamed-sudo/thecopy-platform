import { createHash } from "crypto";

import { logger } from "@/lib/logger";

import { embeddingGenerator } from "../../memory/embeddings/generator";
import { cacheService } from "../cache.service";

import type { EmbeddingProvider } from "@the-copy/core-memory";

const CACHE_TTL = 60 * 60 * 24 * 7;

interface EmbeddingServiceOptions {
  allowFallback?: boolean;
  cacheNamespace?: string;
}

function normalizeCacheNamespace(
  options: EmbeddingServiceOptions | undefined,
): string {
  const namespace =
    options?.cacheNamespace ??
    (options?.allowFallback === false
      ? "gemini-embedding-2.strict"
      : "default");
  return namespace.replace(/[^\w.-]/g, "_");
}

export class EmbeddingsService {
  private embeddingCache: Map<string, number[]>;

  constructor() {
    this.embeddingCache = new Map();
  }

  async getEmbedding(
    text: string,
    options: EmbeddingServiceOptions = {},
  ): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot generate embedding for empty text");
    }

    const cacheKey = `${normalizeCacheNamespace(options)}:${this.getCacheKey(text)}`;

    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      const cached = await cacheService.get<string>(`embedding:${cacheKey}`);
      if (cached) {
        const embedding = JSON.parse(cached) as number[];
        this.embeddingCache.set(cacheKey, embedding);
        return embedding;
      }
    } catch (error) {
      logger.warn("Redis cache lookup failed", { error });
    }

    try {
      const result = await embeddingGenerator.generateForDocumentation(
        text,
        { title: "Unified Memory Query" },
        {
          dimensionality: 1536,
          ...(options.allowFallback !== undefined
            ? { allowFallback: options.allowFallback }
            : {}),
        },
      );

      const embedding = result.embedding;
      this.embeddingCache.set(cacheKey, embedding);

      try {
        await cacheService.set(
          `embedding:${cacheKey}`,
          JSON.stringify(embedding),
          CACHE_TTL,
        );
      } catch (error) {
        logger.warn("Failed to cache embedding", { error });
      }

      return embedding;
    } catch (error) {
      logger.error("Failed to generate embedding", { error });
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Embedding generation failed: ${message}`);
    }
  }

  async getEmbeddingsBatch(
    texts: string[],
    options: EmbeddingServiceOptions = {},
  ): Promise<number[][]> {
    const validTexts = texts.filter((text) => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      return [];
    }

    if (options.allowFallback === false) {
      const embeddings: number[][] = [];
      for (const text of validTexts) {
        embeddings.push(await this.getEmbedding(text, options));
      }
      return embeddings;
    }

    return Promise.all(
      validTexts.map((text) => this.getEmbedding(text, options)),
    );
  }

  clearCache(): void {
    this.embeddingCache.clear();
  }

  getCacheStats(): { inMemoryCacheSize: number } {
    return {
      inMemoryCacheSize: this.embeddingCache.size,
    };
  }

  asProvider(): EmbeddingProvider {
    return (text: string) => this.getEmbedding(text);
  }

  private getCacheKey(text: string): string {
    const normalized = text.trim().toLowerCase();
    return createHash("sha256").update(normalized).digest("hex");
  }
}

export const embeddingsService = new EmbeddingsService();
export const backendEmbeddingProvider: EmbeddingProvider =
  embeddingsService.asProvider();
