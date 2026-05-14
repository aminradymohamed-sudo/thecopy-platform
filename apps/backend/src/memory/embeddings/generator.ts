/**
 * Gemini Embedding Generator
 * مولد التضمينات باستخدام Gemini Embedding 2
 */

import { createHash } from "node:crypto";

import { GoogleGenAI, type Part } from "@google/genai";

import { logger } from "@/lib/logger";

import type {
  DimensionSize,
  EmbeddingResult,
  MultimodalInput,
  TaskType,
} from "../types";

interface EmbeddingGenerationOptions {
  dimensionality?: DimensionSize;
  taskType?: TaskType;
  allowFallback?: boolean;
}

export class GeminiEmbeddingGenerator {
  private client: GoogleGenAI;
  private defaultModel = "gemini-embedding-2";
  private fallbackModel = "gemini-embedding-001";

  constructor() {
    this.client = new GoogleGenAI({
      apiKey:
        process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY ?? "",
    });
  }

  async probeDefaultModel(): Promise<void> {
    const response = await this.client.models.embedContent({
      model: this.defaultModel,
      contents: [
        { role: "user", parts: [{ text: "Editor RAG health probe" }] },
      ],
      config: {
        outputDimensionality: 1536,
      },
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding || embedding.length === 0) {
      throw new Error("Gemini embedding probe returned no vector.");
    }
  }

  /**
   * توليد تضمين للكود البرمجي
   */
  async generateForCode(
    code: string,
    filePath: string,
    options: EmbeddingGenerationOptions = {},
  ): Promise<EmbeddingResult> {
    const content = `task: code retrieval | ${this.buildCodePrompt(code, filePath)}`;

    try {
      const response = await this.client.models.embedContent({
        model: this.defaultModel,
        contents: [{ role: "user", parts: [{ text: content }] }],
        config: {
          outputDimensionality: options.dimensionality ?? 1536,
        },
      });

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error("Failed to generate embedding");
      }

      return {
        embedding,
        dimensionality: options.dimensionality ?? 1536,
        contentHash: this.hashContent(content),
      };
    } catch (error) {
      if (options.allowFallback === false) {
        throw error;
      }

      // Fallback to text-only model if multimodal fails
      logger.warn("Gemini Embedding 2 failed, trying fallback model", {
        error,
      });
      return this.generateWithFallback(content, options);
    }
  }

  /**
   * توليد تضمين للوثائق
   */
  async generateForDocumentation(
    text: string,
    metadata: { title?: string; section?: string },
    options: EmbeddingGenerationOptions = {},
  ): Promise<EmbeddingResult> {
    const content = `task: search result | ${this.buildDocPrompt(text, metadata)}`;

    try {
      const response = await this.client.models.embedContent({
        model: this.defaultModel,
        contents: [{ role: "user", parts: [{ text: content }] }],
        config: {
          outputDimensionality: options.dimensionality ?? 1536,
        },
      });

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error("Failed to generate embedding");
      }

      return {
        embedding,
        dimensionality: options.dimensionality ?? 1536,
        contentHash: this.hashContent(content),
      };
    } catch (error) {
      if (options.allowFallback === false) {
        throw error;
      }

      logger.warn("Gemini Embedding 2 failed, trying fallback model", {
        error,
      });
      return this.generateWithFallback(content, options);
    }
  }

  /**
   * توليد تضمين متعدد الوسائط
   */
  async generateMultimodal(
    input: MultimodalInput,
    options: EmbeddingGenerationOptions = {},
  ): Promise<EmbeddingResult> {
    const parts: Part[] = [];

    if (input.text) {
      parts.push({ text: input.text });
    }

    if (input.imageUri) {
      parts.push({
        fileData: {
          mimeType: this.getMimeType(input.imageUri),
          fileUri: input.imageUri,
        },
      });
    }

    if (input.videoUri) {
      parts.push({
        fileData: {
          mimeType: "video/mp4",
          fileUri: input.videoUri,
        },
      });
    }

    if (input.audioUri) {
      parts.push({
        fileData: {
          mimeType: "audio/mp3",
          fileUri: input.audioUri,
        },
      });
    }

    if (input.documentUri) {
      parts.push({
        fileData: {
          mimeType: "application/pdf",
          fileUri: input.documentUri,
        },
      });
    }

    try {
      const response = await this.client.models.embedContent({
        model: this.defaultModel,
        contents: [{ role: "user", parts }],
        config: {
          outputDimensionality: options.dimensionality ?? 3072,
        },
      });

      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) {
        throw new Error("Failed to generate multimodal embedding");
      }

      return {
        embedding,
        dimensionality: options.dimensionality ?? 3072,
        contentHash: this.hashContent(JSON.stringify(input)),
      };
    } catch (error) {
      // If multimodal fails and we have text, fallback to text-only
      if (input.text) {
        logger.warn("Multimodal failed, falling back to text-only", { error });
        return this.generateForDocumentation(input.text, {}, options);
      }
      throw error;
    }
  }

  /**
   * توليد تضمينات لدفعة من المحتوى
   */
  async generateBatch(
    contents: string[],
    options: EmbeddingGenerationOptions = {},
  ): Promise<EmbeddingResult[]> {
    try {
      const response = await this.client.models.embedContent({
        model: this.defaultModel,
        contents: contents.map((c) => ({ role: "user", parts: [{ text: c }] })),
        config: {
          outputDimensionality: options.dimensionality ?? 1536,
        },
      });

      return (
        response.embeddings?.flatMap((e, i) => {
          const embedding = e.values;
          const content = contents[i];
          if (!embedding || content === undefined) {
            return [];
          }

          return [
            {
              embedding,
              dimensionality: options.dimensionality ?? 1536,
              contentHash: this.hashContent(content),
            },
          ];
        }) ?? []
      );
    } catch (error) {
      if (options.allowFallback === false) {
        throw error;
      }

      // Process one by one if batch fails
      logger.warn("Batch embedding failed, processing individually", { error });
      const results: EmbeddingResult[] = [];
      for (const content of contents) {
        try {
          const result = await this.generateForDocumentation(
            content,
            {},
            options,
          );
          results.push(result);
        } catch (e) {
          logger.error("Failed to embed content", { error: e });
        }
      }
      return results;
    }
  }

  /**
   * Fallback generation using text-only model
   */
  private async generateWithFallback(
    content: string,
    options: EmbeddingGenerationOptions,
  ): Promise<EmbeddingResult> {
    const response = await this.client.models.embedContent({
      model: this.fallbackModel,
      contents: [{ role: "user", parts: [{ text: content }] }],
      config: {
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: options.dimensionality ?? 768,
      },
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error("Failed to generate embedding with fallback model");
    }

    return {
      embedding,
      dimensionality: options.dimensionality ?? 768,
      contentHash: this.hashContent(content),
    };
  }

  private buildCodePrompt(code: string, filePath: string): string {
    const extension = filePath.split(".").pop() ?? "";
    return `File: ${filePath}
Language: ${extension}

Code:
\`\`\`${extension}
${code}
\`\`\``;
  }

  private buildDocPrompt(
    text: string,
    metadata: { title?: string; section?: string },
  ): string {
    let prompt = "";
    if (metadata.title) prompt += `Title: ${metadata.title}\n`;
    if (metadata.section) prompt += `Section: ${metadata.section}\n`;
    prompt += `\n${text}`;
    return prompt;
  }

  private hashContent(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  private getMimeType(uri: string): string {
    const ext = uri.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      gif: "image/gif",
    };
    return mimeTypes[ext ?? ""] ?? "image/jpeg";
  }
}

export const embeddingGenerator = new GeminiEmbeddingGenerator();
