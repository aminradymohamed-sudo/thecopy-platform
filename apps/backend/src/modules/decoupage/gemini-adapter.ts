/**
 * Decoupage Module — مهايئ @google/genai المباشر
 *
 * يُستخدم فقط لمسارين متخصّصين لا يدعمهما `geminiService` المركزي القائم
 * (الذي يستهلك `@google/generative-ai` السابق ويقبل prompt نصي فقط):
 *   1. تحليل يحوي صورًا (parts متعددة الوسائط).
 *   2. توليد صورة لـ Storyboard.
 *
 * المفتاح يُقرأ من نفس مصادر `gemini.service` (env.GEMINI_API_KEY أو env.GOOGLE_GENAI_API_KEY)
 * عبر `@/config/env` — لا يُعاد قراءته من ملف.
 */

import { GoogleGenAI } from "@google/genai";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";

import type { AspectRatio, ImageInput, ImageSize } from "./types";

const PRO_MODEL = "gemini-2.5-pro";
const IMAGE_MODEL = "imagen-3.0-generate-002";

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;
  const apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_GENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "GEMINI_API_KEY أو GOOGLE_GENAI_API_KEY غير محدد في البيئة",
    );
  }
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

interface MultimodalPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/**
 * يبني مصفوفة parts للـ generateContent من نص + صور base64.
 */
export function buildMultimodalParts(input: {
  text: string;
  images: readonly ImageInput[] | undefined;
}): MultimodalPart[] {
  const parts: MultimodalPart[] = [];
  if (input.images && input.images.length > 0) {
    for (const img of input.images) {
      parts.push({
        inlineData: { mimeType: img.mimeType, data: img.data },
      });
    }
  }
  parts.push({ text: input.text });
  return parts;
}

/**
 * يستدعي Gemini text+image generateContent مع نظام تعليمات وارجاع نص خام.
 */
export async function generateMultimodalText(input: {
  systemInstruction: string;
  parts: MultimodalPart[];
  responseMimeType: string | undefined;
}): Promise<string> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: PRO_MODEL,
    contents: { parts: input.parts },
    config: {
      systemInstruction: input.systemInstruction,
      ...(input.responseMimeType
        ? { responseMimeType: input.responseMimeType }
        : {}),
    },
  });

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini لم يُرجع أي مرشح للاستجابة");
  }
  const first = candidates[0];
  const collectedText: string[] = [];
  const partsResp = first?.content?.parts ?? [];
  for (const p of partsResp) {
    if (typeof p.text === "string") {
      collectedText.push(p.text);
    }
  }
  const text = collectedText.join("");
  if (!text.trim()) {
    throw new Error("Gemini لم يُرجع نصاً قابلاً للاستخدام");
  }
  return text;
}

/**
 * يولّد صورة عبر Imagen مع aspectRatio محدد.
 * يُرجع base64 + mimeType جاهزَين للحقن في data URI أو الإرسال للواجهة.
 */
export async function generateImage(input: {
  prompt: string;
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
}): Promise<{ mimeType: string; data: string }> {
  const client = getClient();
  try {
    const response = await client.models.generateImages({
      model: IMAGE_MODEL,
      prompt: input.prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: input.aspectRatio,
      },
    });

    const generated = response.generatedImages?.[0]?.image;
    if (!generated?.imageBytes) {
      throw new Error("Gemini لم يُرجع بيانات صورة");
    }
    return {
      mimeType: generated.mimeType ?? "image/png",
      data: generated.imageBytes,
    };
  } catch (error) {
    logger.error("decoupage.generateImage.failure", {
      message: error instanceof Error ? error.message : String(error),
      imageSize: input.imageSize,
    });
    throw error;
  }
}
