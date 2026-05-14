/**
 * DecoupageWorkspace
 *
 * المكوّن الجذر لميزة Découpage داخل directors-studio.
 * يدير حالة كل المدخلات والإعدادات، ويقود pipeline من 11 مرحلة،
 * ويتواصل مع backend عبر `useAnalyzeMode` و siblings.
 */

"use client";

import { FileUp, Loader2, Play, Workflow } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import {
  useAnalyzeMode,
  useAuditContinuity,
  useDeduceSpatialParams,
  useGenerateScenarioMap,
} from "../hooks/useDecoupageAnalysis";
import { useImages } from "../hooks/useImages";
import { usePipeline } from "../hooks/usePipeline";
import { readAnyTextFile } from "../lib/file-readers";
import {
  ANALYSIS_MODES,
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_PERSPECTIVE_PARAMS,
  DEFAULT_PROMPT_BUILDER_PARAMS,
  DEFAULT_RHYTHM_PARAMS,
  DEFAULT_SPATIAL_PARAMS,
  MODE_LABELS,
  type AnalysisMode,
  type AnalysisRequestPayload,
  type AnalysisSettings,
  type ImageInput,
  type PerspectiveParams,
  type PromptBuilderParams,
  type RhythmParams,
  type ScenarioMap,
  type SpatialParams,
} from "../lib/types";

import { ImageUploadBar } from "./ImageUploadBar";
import { ModeDescription, ModeSelector } from "./ModeSelector";
import { ModeSpecificControls } from "./ModeSpecificControls";
import { OutputPanel } from "./OutputPanel";
import { PipelinePanel } from "./PipelinePanel";

interface AnalysisStatus {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  result: string | null;
}

const INITIAL_STATUS: AnalysisStatus = {
  status: "idle",
  message: "",
  result: null,
};

function buildAccumulatedContext(
  fullScenario: string,
  pipelineResults: readonly { mode: AnalysisMode; result: string | null }[],
  currentMode: AnalysisMode
): string {
  let acc = fullScenario;
  for (const stage of pipelineResults) {
    if (stage.mode === currentMode) continue;
    if (stage.result) {
      acc += `\n\n--- مخرجات ${MODE_LABELS[stage.mode]} ---\n${stage.result}`;
    }
  }
  return acc;
}

export function DecoupageWorkspace() {
  const { toast } = useToast();
  const [mode, setMode] = useState<AnalysisMode>("scene");
  const [script, setScript] = useState<string>("");
  const [intent, setIntent] = useState<string>("");
  const [directorIntent, setDirectorIntent] = useState<string>("");
  const [fullScenario, setFullScenario] = useState<string>("");
  const [scenarioMap, setScenarioMap] = useState<ScenarioMap | null>(null);
  const [spatialParams, setSpatialParams] = useState<SpatialParams>(
    DEFAULT_SPATIAL_PARAMS
  );
  const [promptBuilderParams, setPromptBuilderParams] =
    useState<PromptBuilderParams>(DEFAULT_PROMPT_BUILDER_PARAMS);
  const [rhythmParams, setRhythmParams] = useState<RhythmParams>(
    DEFAULT_RHYTHM_PARAMS
  );
  const [perspectiveParams, setPerspectiveParams] = useState<PerspectiveParams>(
    DEFAULT_PERSPECTIVE_PARAMS
  );
  const [settings] = useState<AnalysisSettings>(DEFAULT_ANALYSIS_SETTINGS);
  const [analysisStatus, setAnalysisStatus] =
    useState<AnalysisStatus>(INITIAL_STATUS);
  const pipelineExecutionRef = useRef<string | null>(null);
  const scenarioFileInputRef = useRef<HTMLInputElement | null>(null);

  const analyzeMutation = useAnalyzeMode();
  const scenarioMapMutation = useGenerateScenarioMap();
  const spatialDeductionMutation = useDeduceSpatialParams();
  const auditMutation = useAuditContinuity();
  const imageState = useImages();

  const {
    pipeline,
    pipelineOrder,
    startPipeline,
    stopPipeline,
    updateStageStatus,
    advancePipeline,
    resetStage,
    setCurrentStage,
  } = usePipeline();

  const canAnalyze = script.trim().length > 0 || imageState.images.length > 0;

  const buildPayload = useCallback(
    (
      targetMode: AnalysisMode,
      contextOverride?: string
    ): AnalysisRequestPayload => {
      const payload: AnalysisRequestPayload = {
        mode: targetMode,
        script,
        intent,
        fullScenario: contextOverride ?? fullScenario,
        settings,
        spatialParams,
      };
      if (directorIntent.length > 0) {
        payload.directorIntent = directorIntent;
      }
      if (scenarioMap) {
        payload.scenarioMap = scenarioMap;
      }
      if (targetMode === "prompt_builder") {
        payload.promptBuilderParams = promptBuilderParams;
      }
      if (targetMode === "rhythm") {
        payload.rhythmParams = rhythmParams;
      }
      if (targetMode === "perspective") {
        payload.perspectiveParams = perspectiveParams;
      }
      if (imageState.images.length > 0) {
        const imagesPayload: ImageInput[] = imageState.images.map((img) => ({
          mimeType: img.mimeType,
          data: img.data,
        }));
        payload.images = imagesPayload;
      }
      return payload;
    },
    [
      script,
      intent,
      directorIntent,
      fullScenario,
      scenarioMap,
      settings,
      spatialParams,
      promptBuilderParams,
      rhythmParams,
      perspectiveParams,
      imageState.images,
    ]
  );

  const handleSingleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;
    setAnalysisStatus({
      status: "loading",
      message: `جاري تحليل ${MODE_LABELS[mode]}...`,
      result: null,
    });
    try {
      const data = await analyzeMutation.mutateAsync(buildPayload(mode));
      setAnalysisStatus({ status: "success", message: "", result: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "فشل التحليل";
      setAnalysisStatus({
        status: "error",
        message,
        result: `## خطأ\n${message}`,
      });
      toast({
        title: "تعذّر إكمال التحليل",
        description: message,
        variant: "destructive",
      });
    }
  }, [analyzeMutation, buildPayload, canAnalyze, mode, toast]);

  const handleStartPipeline = useCallback(() => {
    pipelineExecutionRef.current = null;
    startPipeline();
  }, [startPipeline]);

  const handleApproveStage = useCallback(
    (stageMode: AnalysisMode): void => {
      updateStageStatus(stageMode, "success");
      advancePipeline();
    },
    [updateStageStatus, advancePipeline]
  );

  const handleRestartStage = useCallback(
    (stageMode: AnalysisMode): void => {
      pipelineExecutionRef.current = null;
      resetStage(stageMode);
      setCurrentStage(stageMode);
    },
    [resetStage, setCurrentStage]
  );

  const handleAutoDeduceSpatial = useCallback(async () => {
    if (script.trim().length === 0) return;
    try {
      const params = await spatialDeductionMutation.mutateAsync({
        script,
        intent,
      });
      setSpatialParams(params);
      toast({ title: "تم استنتاج المعاملات المكانية" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "فشل الاستنتاج التلقائي";
      toast({
        title: "تعذر الاستنتاج",
        description: message,
        variant: "destructive",
      });
    }
  }, [intent, script, spatialDeductionMutation, toast]);

  const handleGenerateScenarioMap = useCallback(async () => {
    if (fullScenario.trim().length === 0) return;
    try {
      const map = await scenarioMapMutation.mutateAsync({ fullScenario });
      setScenarioMap(map);
      toast({ title: "تم استخراج خريطة الاستمرارية" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "فشل استخراج الخريطة";
      toast({
        title: "تعذر استخراج الخريطة",
        description: message,
        variant: "destructive",
      });
    }
  }, [fullScenario, scenarioMapMutation, toast]);

  const handleAuditContinuity = useCallback(async () => {
    if (!scenarioMap) {
      toast({
        title: "لا توجد خريطة استمرارية",
        description: "ولّد خريطة الاستمرارية أولًا من السيناريو الكامل.",
        variant: "destructive",
      });
      return;
    }
    const currentResult =
      pipeline.isActive && pipeline.currentStage
        ? pipeline.stages[pipeline.currentStage].result
        : analysisStatus.result;
    if (!currentResult) {
      toast({
        title: "لا نتائج لفحصها",
        description: "شغّل تحليلًا واحدًا على الأقل قبل فحص الاستمرارية.",
        variant: "destructive",
      });
      return;
    }
    try {
      const report = await auditMutation.mutateAsync({
        scenarioMap,
        pipelineResults: currentResult,
        script,
      });
      const combined = `### CONTINUITY AUDIT REPORT\n\n${report}\n\n---\n\n${currentResult}`;
      if (pipeline.isActive && pipeline.currentStage) {
        updateStageStatus(
          pipeline.currentStage,
          pipeline.stages[pipeline.currentStage].status,
          combined
        );
      } else {
        setAnalysisStatus({
          status: "success",
          message: "",
          result: combined,
        });
      }
      toast({ title: "تم فحص الاستمرارية" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "فشل فحص الاستمرارية";
      toast({
        title: "تعذر الفحص",
        description: message,
        variant: "destructive",
      });
    }
  }, [
    analysisStatus.result,
    auditMutation,
    pipeline.currentStage,
    pipeline.isActive,
    pipeline.stages,
    scenarioMap,
    script,
    toast,
    updateStageStatus,
  ]);

  const handleScenarioFile = useCallback(
    async (file: File) => {
      const result = await readAnyTextFile(file);
      if (result.success) {
        setFullScenario(result.content);
        toast({
          title: "تم تحميل السيناريو",
          description: `${result.content.length} حرف`,
        });
      } else {
        toast({
          title: "فشل قراءة الملف",
          description: result.error ?? "خطأ غير معروف",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleImageFiles = useCallback(
    async (files: FileList | null) => {
      const { addedCount, rejectedReasons } = await imageState.addFiles(files);
      if (addedCount > 0) {
        toast({ title: `تمت إضافة ${addedCount} صورة` });
      }
      for (const reason of rejectedReasons) {
        toast({
          title: "صورة مرفوضة",
          description: reason,
          variant: "destructive",
        });
      }
    },
    [imageState, toast]
  );

  // Pipeline orchestration: عند تنشيط مرحلة pending نشغّل التحليل تلقائيًا
  useEffect(() => {
    if (!pipeline.isActive || !pipeline.currentStage) return;
    const currentMode = pipeline.currentStage;
    const stage = pipeline.stages[currentMode];
    if (stage.status !== "pending") return;
    if (pipelineExecutionRef.current === currentMode) return;

    pipelineExecutionRef.current = currentMode;
    updateStageStatus(currentMode, "loading");

    const stageEntries = pipelineOrder.map((m) => ({
      mode: m,
      result: pipeline.stages[m].result,
    }));
    const accumulatedContext = buildAccumulatedContext(
      fullScenario,
      stageEntries,
      currentMode
    );

    const payload = buildPayload(currentMode, accumulatedContext);

    void (async () => {
      try {
        const data = await analyzeMutation.mutateAsync(payload);
        if (settings.pipelineAutoAdvance) {
          updateStageStatus(currentMode, "success", data);
          pipelineExecutionRef.current = null;
          advancePipeline();
        } else {
          updateStageStatus(currentMode, "needs_review", data);
          pipelineExecutionRef.current = null;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "فشل تحليل المرحلة";
        updateStageStatus(currentMode, "error", undefined, message);
        pipelineExecutionRef.current = null;
        toast({
          title: `فشل المرحلة: ${MODE_LABELS[currentMode]}`,
          description: message,
          variant: "destructive",
        });
      }
    })();
  }, [
    advancePipeline,
    analyzeMutation,
    buildPayload,
    fullScenario,
    pipeline.currentStage,
    pipeline.isActive,
    pipeline.stages,
    pipelineOrder,
    settings.pipelineAutoAdvance,
    toast,
    updateStageStatus,
  ]);

  const outputResult =
    pipeline.isActive && pipeline.currentStage
      ? (pipeline.stages[pipeline.currentStage].result ?? analysisStatus.result)
      : analysisStatus.result;
  const outputMode =
    pipeline.isActive && pipeline.currentStage ? pipeline.currentStage : mode;
  const outputStatus =
    analyzeMutation.isPending || pipeline.isActive
      ? "loading"
      : analysisStatus.status;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold uppercase tracking-tighter text-[var(--app-text)]">
          DÉCOUPAGE
        </h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          محرّك المنطق الإخراجي — 11 مرحلة من الزمن الدرامي إلى مولّد التوجيه.
        </p>
      </div>

      <ModeSelector currentMode={mode} onModeChange={setMode} />
      <ModeDescription mode={mode} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-widest text-[var(--app-accent)]">
              النص المصدر / التوجيه
            </Label>
            <Textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="أدخل النص الدرامي أو وصف المشهد..."
              rows={8}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-widest text-[var(--app-accent)]">
              نية المخرج / التعديلات
            </Label>
            <Textarea
              value={directorIntent}
              onChange={(e) => setDirectorIntent(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase tracking-widest text-[var(--app-accent)]">
              السياق العام (اختياري)
            </Label>
            <Textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={3}
              placeholder="معلومات إضافية تستفيد منها كل المراحل..."
            />
          </div>

          <ModeSpecificControls
            mode={mode}
            script={script}
            spatialParams={spatialParams}
            setSpatialParams={setSpatialParams}
            promptBuilderParams={promptBuilderParams}
            setPromptBuilderParams={setPromptBuilderParams}
            rhythmParams={rhythmParams}
            setRhythmParams={setRhythmParams}
            perspectiveParams={perspectiveParams}
            setPerspectiveParams={setPerspectiveParams}
            onAutoDeduceSpatial={handleAutoDeduceSpatial}
            isDeducingSpatial={spatialDeductionMutation.isPending}
          />

          <ImageUploadBar
            images={imageState.images}
            inputRef={imageState.inputRef}
            onOpenPicker={imageState.openPicker}
            onFilesChange={handleImageFiles}
            onRemove={imageState.removeImage}
          />

          <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest">
                السيناريو الكامل (سياق مستمر)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => scenarioFileInputRef.current?.click()}
                >
                  <FileUp className="ml-1 h-3 w-3" />
                  رفع ملف (txt/md/docx)
                </Button>
                <input
                  ref={scenarioFileInputRef}
                  type="file"
                  accept=".txt,.md,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      void handleScenarioFile(f);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateScenarioMap}
                  disabled={
                    scenarioMapMutation.isPending ||
                    fullScenario.trim().length === 0
                  }
                >
                  {scenarioMapMutation.isPending && (
                    <Loader2 className="ml-1 h-3 w-3 animate-spin" />
                  )}
                  خريطة استمرارية
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={fullScenario}
                onChange={(e) => setFullScenario(e.target.value)}
                rows={4}
                placeholder="الصق السيناريو الكامل لتفعيل سياق متعدد المراحل..."
              />
              {scenarioMap && (
                <p className="mt-2 text-[10px] text-[var(--app-text-muted)]">
                  خريطة جاهزة: {scenarioMap.characters.length} شخصية،{" "}
                  {scenarioMap.locations.length} موقع،{" "}
                  {scenarioMap.motifs.length} رمز.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSingleAnalyze}
              disabled={
                !canAnalyze || analyzeMutation.isPending || pipeline.isActive
              }
              variant="outline"
              className="h-11 w-full"
            >
              {analyzeMutation.isPending && !pipeline.isActive ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Play className="ml-2 h-4 w-4" />
                  تشغيل مرحلة {MODE_LABELS[mode]} فقط
                </>
              )}
            </Button>
            <Button
              onClick={handleStartPipeline}
              disabled={!canAnalyze || pipeline.isActive}
              className="h-12 w-full"
            >
              <Workflow className="ml-2 h-5 w-5" />
              {pipeline.isActive ? "السيرفر يعمل" : "بدء سير عمل DÉCOUPAGE"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-7">
          {pipeline.isActive && (
            <PipelinePanel
              pipeline={pipeline}
              pipelineOrder={pipelineOrder}
              onStopPipeline={stopPipeline}
              onApproveStage={handleApproveStage}
              onRestartStage={handleRestartStage}
            />
          )}
          <OutputPanel
            status={outputStatus}
            loadingMessage={analysisStatus.message}
            result={outputResult}
            mode={outputMode}
            canAuditContinuity={Boolean(scenarioMap) && outputResult !== null}
            onAuditContinuity={handleAuditContinuity}
            pipeline={pipeline}
            pipelineOrder={pipelineOrder}
            script={script}
          />
        </div>
      </div>

      <div className="border-t border-[var(--app-border)] pt-4 text-[10px] text-[var(--app-text-muted)]">
        مراحل التحليل: {ANALYSIS_MODES.length} · المخرجات تأتي بصيغة JSON منظَّم
        وتُعرض كـ markdown.
      </div>
    </div>
  );
}
