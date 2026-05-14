"use client";

import { useRef } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import type { ExportFormat } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import type { CreativeTone } from "@/app/(main)/arabic-creative-writing-studio/types";

interface WorkspaceHeaderProps {
  title: string;
  autoSaveEnabled: boolean;
  creativeTone: CreativeTone;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  onImportFile: (file: File | null) => void;
  onResetDraft: () => void;
  onSave: () => void;
  onShare: () => void;
  onTitleChange: (value: string) => void;
  onToneChange: (value: CreativeTone) => void;
}

export function WorkspaceHeader({
  title,
  autoSaveEnabled,
  creativeTone,
  isAnalyzing,
  onAnalyze,
  onExport,
  onImportFile,
  onResetDraft,
  onSave,
  onShare,
  onTitleChange,
  onToneChange,
}: WorkspaceHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <CardSpotlight className="mb-6 rounded-[22px] p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 items-center space-x-4 space-x-reverse">
          <Input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="text-xl font-bold"
            placeholder="عنوان المشروع..."
          />
          {autoSaveEnabled ? (
            <span className="text-sm text-green-600">💾 حفظ تلقائي مفعل</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="creative-tone-select" className="sr-only">
              النبرة الإبداعية
            </label>
            <select
              id="creative-tone-select"
              aria-label="النبرة الإبداعية"
              value={creativeTone}
              onChange={(event) =>
                onToneChange(event.target.value as CreativeTone)
              }
              className="h-10 rounded-md border border-white/10 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-pink-300"
            >
              <option value="balanced">متوازنة</option>
              <option value="dramatic">درامية</option>
              <option value="poetic">شاعرية</option>
              <option value="cinematic">سينمائية</option>
            </select>
          </div>

          <Button onClick={onAnalyze} disabled={isAnalyzing} variant="default">
            {isAnalyzing ? "🔄 جاري التحليل..." : "🔍 تحليل النص"}
          </Button>

          <Button onClick={onSave} variant="default">
            💾 حفظ
          </Button>

          <Button onClick={onResetDraft} variant="outline">
            بدء جديد
          </Button>

          <input
            ref={fileInputRef}
            aria-label="استيراد ملف نصي"
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="sr-only"
            onChange={(event) => {
              onImportFile(event.target.files?.[0] ?? null);
              event.currentTarget.value = "";
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            استيراد
          </Button>

          <Button onClick={onShare} type="button" variant="outline">
            مشاركة
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default">📤 تصدير</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void onExport("txt")}>
                📄 نص خالص
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("html")}>
                🌐 صفحة ويب
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("json")}>
                📋 بيانات منظمة
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void onExport("rtf")}>
                📝 نص غني
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </CardSpotlight>
  );
}
