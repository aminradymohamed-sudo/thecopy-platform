"use client";

import { Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { MAX_IMAGES, type ImagePreview } from "../lib/types";

interface ImageUploadBarProps {
  readonly images: ImagePreview[];
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
  readonly onOpenPicker: () => void;
  readonly onFilesChange: (files: FileList | null) => void;
  readonly onRemove: (id: string) => void;
}

/**
 * شريط رفع الصور المرجعية (1–3 صور). يُحدِّد على الـ backend عبر MAX_IMAGES.
 */
export function ImageUploadBar({
  images,
  inputRef,
  onOpenPicker,
  onFilesChange,
  onRemove,
}: ImageUploadBarProps) {
  return (
    <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-bold uppercase tracking-widest">
          صور مرجعية ({images.length}/{MAX_IMAGES})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={onOpenPicker}
              className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-[var(--app-border)] bg-[var(--app-surface)]/40 transition-colors hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)]/5"
              aria-label="رفع صور"
            >
              <ImageIcon className="h-5 w-5 text-[var(--app-text-muted)]" />
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => onFilesChange(e.target.files)}
          />
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative h-16 w-16 overflow-hidden rounded-md border border-[var(--app-border)]"
            >
              <Image
                src={img.src}
                alt="صورة مرجعية"
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                className="absolute right-0 top-0 hidden bg-rose-500 p-0.5 text-white group-hover:block"
                aria-label="حذف الصورة"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
