/**
 * Hook لإدارة الصور المحلية مع تحويل آمن إلى base64.
 * يفرض حدّي MAX_IMAGES و MAX_IMAGE_BYTES_BEFORE_BASE64.
 */

"use client";

import { useCallback, useRef, useState } from "react";

import {
  MAX_IMAGES,
  MAX_IMAGE_BYTES_BEFORE_BASE64,
  type ImagePreview,
} from "../lib/types";

interface UseImagesReturn {
  images: ImagePreview[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  openPicker: () => void;
  addFiles: (files: FileList | null) => Promise<{
    addedCount: number;
    rejectedReasons: string[];
  }>;
  removeImage: (id: string) => void;
  clearAll: () => void;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader returned non-string"));
        return;
      }
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error("فشل قراءة الصورة"));
    reader.readAsDataURL(file);
  });
}

export function useImages(): UseImagesReturn {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const addFiles = useCallback(
    async (
      fileList: FileList | null
    ): Promise<{ addedCount: number; rejectedReasons: string[] }> => {
      const rejectedReasons: string[] = [];
      if (!fileList || fileList.length === 0) {
        return { addedCount: 0, rejectedReasons };
      }
      const files = Array.from(fileList);
      const accepted: ImagePreview[] = [];
      let availableSlots = MAX_IMAGES - images.length;
      for (const file of files) {
        if (availableSlots <= 0) {
          rejectedReasons.push(
            `تجاوز الحد الأقصى للصور (${MAX_IMAGES}): ${file.name}`
          );
          continue;
        }
        if (!file.type.startsWith("image/")) {
          rejectedReasons.push(`ملف غير مصور: ${file.name}`);
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES_BEFORE_BASE64) {
          rejectedReasons.push(
            `حجم ${file.name} يتجاوز ${MAX_IMAGE_BYTES_BEFORE_BASE64 / 1024 / 1024}MB`
          );
          continue;
        }
        try {
          const data = await fileToBase64(file);
          accepted.push({
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            src: URL.createObjectURL(file),
            file,
            mimeType: file.type,
            data,
          });
          availableSlots -= 1;
        } catch (error) {
          rejectedReasons.push(
            `فشل تحميل ${file.name}: ${error instanceof Error ? error.message : "خطأ"}`
          );
        }
      }
      if (accepted.length > 0) {
        setImages((prev) => [...prev, ...accepted]);
      }
      return { addedCount: accepted.length, rejectedReasons };
    },
    [images.length]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.src);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setImages((prev) => {
      for (const p of prev) URL.revokeObjectURL(p.src);
      return [];
    });
  }, []);

  return { images, inputRef, openPicker, addFiles, removeImage, clearAll };
}
