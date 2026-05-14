"use client";

import {
  Copy,
  Download,
  FileText,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Settings,
  Share2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { SHELL_CARD } from "./creative-development-subcomponents";

const FileUpload = dynamic<{
  onFileContent: (content: string, filename: string) => void;
  onUploadError?: (message: string) => void;
}>(() => import("@/components/file-upload"), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  ),
});

function safeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\.\.+/g, ".")
    .replace(/^-+/, "")
    .trim();
  return cleaned || "development-export.txt";
}

function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content || "لا توجد بيانات بعد."], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

interface TextInputCardProps {
  textInput: string;
  analysisReport: string;
  specialRequirements: string;
  additionalInfo: string;
  isAnalysisComplete: boolean;
  fieldsLocked: boolean;
  unlockStatus: { minRequired: number };
  setTextInput: (v: string) => void;
  setAnalysisReport: (v: string) => void;
  setSpecialRequirements: (v: string) => void;
  setAdditionalInfo: (v: string) => void;
  handleFileContent: (content: string, filename: string) => void;
  handleFileError: (message: string) => void;
}

export function TextInputCard({
  textInput,
  analysisReport,
  specialRequirements,
  additionalInfo,
  isAnalysisComplete,
  fieldsLocked,
  unlockStatus,
  setTextInput,
  setAnalysisReport,
  setSpecialRequirements,
  setAdditionalInfo,
  handleFileContent,
  handleFileError,
}: TextInputCardProps) {
  return (
    <Card className={SHELL_CARD}>
      <CardHeader>
        <CardTitle>النص الدرامي</CardTitle>
        <CardDescription>
          أدخل النص الدرامي مباشرة أو حمِّله من ملف (100 حرف على الأقل لفتح
          أدوات التطوير)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileUpload
          onFileContent={handleFileContent}
          onUploadError={handleFileError}
        />
        <div>
          <Label htmlFor="screenplay">
            النص الدرامي
            {!isAnalysisComplete && textInput.trim().length > 0 ? (
              <span className="mr-2 text-sm text-amber-400">
                ({textInput.trim().length}/{unlockStatus.minRequired} حرف)
              </span>
            ) : isAnalysisComplete ? (
              <span className="mr-2 text-sm text-green-400">✓ جاهز</span>
            ) : null}
          </Label>
          <Textarea
            id="screenplay"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="min-h-40 border-white/10 bg-black/40 text-white placeholder:text-white/45"
            placeholder="أدخل النص الدرامي هنا (100 حرف على الأقل لفتح أدوات التطوير)..."
            disabled={fieldsLocked}
            data-testid="screenplay-input"
          />
          {fieldsLocked ? (
            <p className="mt-1 text-sm text-white/45">
              تم تحميل النص تلقائياً — اضغط &quot;تعديل يدوي&quot; للتعديل
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="analysisReport">
            تقرير التحليل السابق{" "}
            <span className="text-xs text-white/40">(اختياري)</span>
            {fieldsLocked ? (
              <span className="mr-2 text-sm text-green-400">
                ✓ محمل تلقائياً
              </span>
            ) : null}
          </Label>
          <Textarea
            id="analysisReport"
            value={analysisReport}
            onChange={(e) => setAnalysisReport(e.target.value)}
            className="min-h-24 border-white/10 bg-black/40 text-white placeholder:text-white/45"
            placeholder="أدخل تقرير تحليل سابق إن وجد (اختياري — يُحسِّن دقة المخرجات)..."
            disabled={fieldsLocked}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="specialRequirements">متطلبات خاصة</Label>
            <Textarea
              id="specialRequirements"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              placeholder="توجيهات خاصة للأداة..."
              className="min-h-20 border-white/10 bg-black/40 text-white placeholder:text-white/45"
            />
          </div>
          <div>
            <Label htmlFor="additionalInfo">معلومات إضافية</Label>
            <Textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="سياق أو معلومات داعمة..."
              className="min-h-20 border-white/10 bg-black/40 text-white placeholder:text-white/45"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DevelopmentActionBarProps {
  textInput: string;
  activeResultText: string | null;
  statusMessage: string | null;
  onPrimaryAction: () => void | Promise<void>;
  onClear: () => void;
  onStatus: (message: string) => void;
}

export function DevelopmentActionBar({
  textInput,
  activeResultText,
  statusMessage,
  onPrimaryAction,
  onClear,
  onStatus,
}: DevelopmentActionBarProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const exportDraft = useCallback(() => {
    downloadTextFile(textInput, "development-draft.txt");
    onStatus("تم تصدير المسودة كملف نصي");
  }, [onStatus, textInput]);

  const exportResult = useCallback(() => {
    downloadTextFile(
      activeResultText ?? "لا توجد نتيجة بعد.",
      "development-result.txt"
    );
    onStatus("تم تصدير نتيجة التطوير كملف نصي");
  }, [activeResultText, onStatus]);

  const copyResult = useCallback(() => {
    const content = activeResultText ?? textInput;
    if (!navigator.clipboard) {
      onStatus("النسخ الآلي غير متاح في هذا المتصفح");
      return;
    }
    void navigator.clipboard
      .writeText(content || "")
      .then(() => onStatus("تم نسخ المحتوى إلى الحافظة"))
      .catch(() => onStatus("تعذر النسخ الآلي، استخدم التصدير كبديل"));
  }, [activeResultText, onStatus, textInput]);

  const sharePage = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (!navigator.clipboard) {
      onStatus("رابط المشاركة لا يحتوي على رموز جلسة");
      return;
    }
    void navigator.clipboard
      .writeText(url)
      .then(() => onStatus("تم نسخ رابط المشاركة الآمن"))
      .catch(() => onStatus("رابط المشاركة لا يحتوي على رموز جلسة"));
  }, [onStatus]);

  return (
    <Card className={SHELL_CARD}>
      <CardContent className="flex flex-wrap items-center gap-2 p-3">
        <Button
          type="button"
          onClick={() => {
            void onPrimaryAction();
          }}
          className="min-h-10 min-w-0 whitespace-normal break-words bg-[var(--page-accent)] text-white hover:bg-[var(--page-accent)]/80"
        >
          <Lightbulb className="ml-2 h-4 w-4" />
          تحليل النص
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={exportDraft}
          className="min-h-10 min-w-0 whitespace-normal break-words"
        >
          <Download className="ml-2 h-4 w-4" />
          تصدير المسودة
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={exportResult}
          className="min-h-10 min-w-0 whitespace-normal break-words"
        >
          <FileText className="ml-2 h-4 w-4" />
          تقرير التطوير
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={copyResult}
          className="min-h-10 min-w-0 whitespace-normal break-words"
        >
          <Copy className="ml-2 h-4 w-4" />
          نسخ النتيجة
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={sharePage}
          className="min-h-10 min-w-0 whitespace-normal break-words"
        >
          <Share2 className="ml-2 h-4 w-4" />
          مشاركة
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClear}
          className="min-h-10 min-w-0 whitespace-normal break-words"
        >
          <RotateCcw className="ml-2 h-4 w-4" />
          مسح
        </Button>

        <Button
          type="button"
          variant="outline"
          aria-expanded={helpOpen}
          aria-controls="development-help-panel"
          onClick={() => {
            setHelpOpen((value) => !value);
            setSettingsOpen(false);
          }}
          className="min-h-10 min-w-0 whitespace-normal break-words"
        >
          <HelpCircle className="ml-2 h-4 w-4" />
          مساعدة
        </Button>

        <Button
          type="button"
          variant="outline"
          aria-expanded={settingsOpen}
          aria-controls="development-settings-panel"
          onClick={() => {
            setSettingsOpen((value) => !value);
            setHelpOpen(false);
          }}
          className="min-h-10 min-w-0 whitespace-normal break-words"
        >
          <Settings className="ml-2 h-4 w-4" />
          إعدادات
        </Button>
      </CardContent>
      {helpOpen ? (
        <CardContent id="development-help-panel" className="pt-0">
          <section
            aria-label="مساعدة مختبر التطوير"
            className="rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-7 text-white/82"
          >
            أدخل نصًا من 100 حرف على الأقل، ثم اختر أداة أو استخدم زر تحليل
            النص.
          </section>
        </CardContent>
      ) : null}
      {settingsOpen ? (
        <CardContent id="development-settings-panel" className="pt-0">
          <section
            aria-label="إعدادات مختبر التطوير"
            className="rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-7 text-white/82"
          >
            لا تعرض هذه اللوحة أي أسرار أو رموز جلسة. إعدادات التنفيذ المتقدمة
            تظهر داخل تبويب الأدوات عند اختيار مهمة.
          </section>
        </CardContent>
      ) : null}
      {statusMessage ? (
        <CardContent className="pt-0">
          <Alert role="status" className="border-cyan-400/30 bg-cyan-500/10">
            <AlertTitle className="text-cyan-100">حالة المختبر</AlertTitle>
            <AlertDescription className="text-cyan-50/85">
              {statusMessage}
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
    </Card>
  );
}
