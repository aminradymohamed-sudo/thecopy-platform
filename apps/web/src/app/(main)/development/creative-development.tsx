"use client";

/**
 * الصفحة: development / creative-development
 * الهوية: قلب استوديو التطوير الإبداعي داخل قشرة مختبرية داكنة موحدة
 */

import { Download, Eye, FileText, Search, Users } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

import { toText } from "@/ai/gemini-core";
import { AgentReportViewer } from "@/components/agent-report-viewer";
import { AgentReportsExporter } from "@/components/agent-reports-exporter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ClassicToolsCard } from "./creative-development-classic-tools";
import { ExecutionPanel } from "./creative-development-execution-panel";
import {
  DevelopmentActionBar,
  TextInputCard,
} from "./creative-development-input-actions";
import {
  CATEGORY_LABELS,
  CatalogTaskButtons,
  LoadedStateAlert,
  LockedStateAlert,
  SHELL_CARD,
} from "./creative-development-subcomponents";
import { useCreativeDevelopment } from "./hooks";
import { type AdvancedAISettings } from "./types";
import { DEVELOPMENT_TASKS, getTasksByCategory } from "./utils/task-catalog";

import type { UnlockStatus } from "./hooks/useCreativeDevelopment";

interface ToolCatalogCardProps {
  isAnalysisComplete: boolean;
  catalogByCategory: Record<string, ReturnType<typeof getTasksByCategory>>;
  selectedCatalogTaskId: string | null;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleCatalogTaskSelect: (id: string) => void;
}

function ToolCatalogCard({
  isAnalysisComplete,
  catalogByCategory,
  selectedCatalogTaskId,
  searchTerm,
  setSearchTerm,
  handleCatalogTaskSelect,
}: ToolCatalogCardProps) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredByCategory = useMemo(() => {
    const nextByCategory: ToolCatalogCardProps["catalogByCategory"] = {};
    for (const [category, tasks] of Object.entries(catalogByCategory)) {
      nextByCategory[category] = normalizedSearch
        ? tasks.filter((task) =>
            `${task.nameAr} ${task.description} ${task.id}`
              .toLowerCase()
              .includes(normalizedSearch)
          )
        : tasks;
    }
    return nextByCategory;
  }, [catalogByCategory, normalizedSearch]);

  return (
    <Card className={SHELL_CARD} data-testid="tool-catalog">
      <CardHeader>
        <CardTitle>كتالوج أدوات التطوير الإبداعي</CardTitle>
        <CardDescription>
          {isAnalysisComplete
            ? "اختر الأداة المناسبة ثم شغّل التدفق للحصول على مخرجات فعلية"
            : "أدخل 100 حرف على الأقل من النص الدرامي لتفعيل الكتالوج"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="block space-y-2">
          <label
            htmlFor="tool-search-input"
            className="text-sm font-medium text-white/75"
          >
            بحث الأدوات
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <Input
              id="tool-search-input"
              type="search"
              aria-label="بحث الأدوات"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ابحث باسم الأداة أو وصفها"
              className="border-white/10 bg-black/45 pr-10 text-white placeholder:text-white/45"
            />
          </div>
        </div>

        {(
          ["core", "analysis", "creative", "predictive", "advanced"] as const
        ).map((category) => (
          <section key={category} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-normal text-white/62">
              {CATEGORY_LABELS[category]}
            </h3>
            <CatalogTaskButtons
              tasks={filteredByCategory[category] ?? []}
              selectedTaskId={selectedCatalogTaskId}
              onTaskSelect={handleCatalogTaskSelect}
              disabled={!isAnalysisComplete}
            />
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function AIResultCard({
  title,
  body,
  showReport,
  exportReport,
}: {
  title: string;
  body: string;
  showReport: () => void;
  exportReport: () => void;
}) {
  return (
    <Card className={SHELL_CARD}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span>{title}</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={showReport}>
              <Eye className="ml-2 h-4 w-4" />
              التقرير الكامل
            </Button>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="ml-2 h-4 w-4" />
              تصدير
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-white/10 bg-zinc-950/82">
          <FileText className="h-4 w-4 text-cyan-200" />
          <AlertTitle className="text-white">المخرجات</AlertTitle>
          <AlertDescription className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-white/88">
            {body}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

interface AnalysisStatusSectionProps {
  unlockStatus: UnlockStatus;
  analysisId: string | null;
  isManualMode: boolean;
  isAnalysisComplete: boolean;
  enableManualMode: () => void;
  clearAnalysisData: () => void;
}

function AnalysisStatusSection({
  unlockStatus,
  analysisId,
  isManualMode,
  isAnalysisComplete,
  enableManualMode,
  clearAnalysisData,
}: AnalysisStatusSectionProps) {
  return (
    <>
      {unlockStatus.locked ? <LockedStateAlert status={unlockStatus} /> : null}
      {isAnalysisComplete && analysisId && !isManualMode ? (
        <LoadedStateAlert />
      ) : null}

      {analysisId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-zinc-950/78 p-3 text-sm text-white/72">
          <span className="min-w-0 break-words">
            {isManualMode
              ? "الوضع اليدوي متاح ويمكن تعديل جميع الحقول"
              : `تم تحميل نتائج تحليل المحطات السبع تلقائيًا: ${analysisId.slice(0, 8)}`}
          </span>
          <div className="flex flex-wrap gap-2">
            {!isManualMode ? (
              <Button variant="outline" size="sm" onClick={enableManualMode}>
                تعديل يدوي
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={clearAnalysisData}>
              مسح البيانات
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

const TAB_ITEMS = [
  ["tools", "الأدوات"],
  ["results", "النتائج"],
  ["tasks", "المهام"],
  ["agents", "الوكلاء"],
  ["reports", "التقارير"],
] as const;

const DramaAnalystApp: React.FC = () => {
  const [activeTab, setActiveTab] =
    useState<(typeof TAB_ITEMS)[number][0]>("tools");
  const [searchTerm, setSearchTerm] = useState("");
  const {
    textInput,
    selectedTask,
    selectedCatalogTaskId,
    specialRequirements,
    additionalInfo,
    completionScope,
    selectedCompletionEnhancements,
    analysisReport,
    isAnalysisComplete,
    isManualMode,
    taskResults,
    showReportModal,
    analysisId,
    advancedSettings,
    aiResponse,
    catalogResult,
    error,
    statusMessage,
    isLoading,
    creativeTasks,
    tasksRequiringScope,
    completionEnhancements,
    unlockStatus,
    setTextInput,
    setSpecialRequirements,
    setAdditionalInfo,
    setCompletionScope,
    setAnalysisReport,
    setStatusMessage,
    handleTaskSelect,
    handleCatalogTaskSelect,
    handleCatalogSubmit,
    handleToggleEnhancement,
    handleSubmit,
    handleFileContent,
    handleFileError,
    clearAnalysisData,
    enableManualMode,
    updateAdvancedSettings,
    exportReport,
    showReport,
    getAgentReport,
  } = useCreativeDevelopment();

  const fieldsLocked = Boolean(analysisId) && !isManualMode;

  const catalogByCategory = useMemo(
    () => ({
      core: getTasksByCategory("core"),
      analysis: getTasksByCategory("analysis"),
      creative: getTasksByCategory("creative"),
      predictive: getTasksByCategory("predictive"),
      advanced: getTasksByCategory("advanced"),
    }),
    []
  );

  const handleSettingChange = useCallback(
    (key: keyof AdvancedAISettings, value: boolean) => {
      updateAdvancedSettings({ [key]: value });
    },
    [updateAdvancedSettings]
  );

  const handlePrimaryAction = useCallback(async () => {
    const wasRunnable = textInput.trim().length >= 100;
    await handleCatalogSubmit();
    if (wasRunnable) {
      setActiveTab("results");
    }
  }, [handleCatalogSubmit, textInput]);

  const agentReport = useMemo(() => getAgentReport(), [getAgentReport]);

  const selectedCatalogTask = useMemo(
    () =>
      selectedCatalogTaskId
        ? DEVELOPMENT_TASKS.find((task) => task.id === selectedCatalogTaskId)
        : null,
    [selectedCatalogTaskId]
  );

  const activeResult = catalogResult ?? aiResponse;
  const activeResultText = activeResult
    ? toText(activeResult.raw ?? activeResult.text)
    : null;

  return (
    <div
      dir="rtl"
      className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden p-3 text-white md:p-6"
    >
      <Card className={SHELL_CARD}>
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            مختبر تطوير النصوص الدرامية
          </CardTitle>
          <CardDescription className="text-center text-white/68">
            أدخل نصًا أو حمّل ملفًا، ثم شغّل أداة تطوير قابلة للقياس داخل
            الصفحة.
          </CardDescription>
        </CardHeader>
      </Card>

      <AnalysisStatusSection
        unlockStatus={unlockStatus}
        analysisId={analysisId}
        isManualMode={isManualMode}
        isAnalysisComplete={isAnalysisComplete}
        enableManualMode={enableManualMode}
        clearAnalysisData={clearAnalysisData}
      />

      <TextInputCard
        textInput={textInput}
        analysisReport={analysisReport}
        specialRequirements={specialRequirements}
        additionalInfo={additionalInfo}
        isAnalysisComplete={isAnalysisComplete}
        fieldsLocked={fieldsLocked}
        unlockStatus={unlockStatus}
        setTextInput={setTextInput}
        setAnalysisReport={setAnalysisReport}
        setSpecialRequirements={setSpecialRequirements}
        setAdditionalInfo={setAdditionalInfo}
        handleFileContent={handleFileContent}
        handleFileError={handleFileError}
      />

      <DevelopmentActionBar
        textInput={textInput}
        activeResultText={activeResultText}
        statusMessage={statusMessage}
        onPrimaryAction={handlePrimaryAction}
        onClear={clearAnalysisData}
        onStatus={setStatusMessage}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-lg border border-white/10 bg-zinc-950/85 p-2">
          {TAB_ITEMS.map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="min-h-10 flex-1 basis-[130px] whitespace-normal rounded-md text-white/72 data-[state=active]:bg-[var(--page-accent)] data-[state=active]:text-white"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <ToolCatalogCard
            isAnalysisComplete={isAnalysisComplete}
            catalogByCategory={catalogByCategory}
            selectedCatalogTaskId={selectedCatalogTaskId}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleCatalogTaskSelect={handleCatalogTaskSelect}
          />

          {isAnalysisComplete && selectedCatalogTask ? (
            <ExecutionPanel
              selectedCatalogTask={selectedCatalogTask}
              textInput={textInput}
              isLoading={isLoading}
              error={error}
              activeResultText={activeResultText}
              hasCatalogResult={Boolean(catalogResult)}
              onSubmit={handleCatalogSubmit}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {activeResultText ? (
            <AIResultCard
              title="نتائج التطوير الإبداعي"
              body={activeResultText}
              showReport={showReport}
              exportReport={exportReport}
            />
          ) : (
            <Alert className="border-white/10 bg-zinc-950/82">
              <AlertTitle className="text-white">لا توجد نتيجة بعد</AlertTitle>
              <AlertDescription className="text-white/72">
                شغّل أداة تطوير من تبويب الأدوات لإظهار النتيجة هنا.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <ClassicToolsCard
            creativeTasks={creativeTasks}
            selectedTask={selectedTask}
            onTaskSelect={handleTaskSelect}
            completionEnhancements={completionEnhancements}
            selectedCompletionEnhancements={selectedCompletionEnhancements}
            onToggleEnhancement={handleToggleEnhancement}
            tasksRequiringScope={tasksRequiringScope}
            completionScope={completionScope}
            onCompletionScopeChange={setCompletionScope}
            advancedSettings={advancedSettings}
            onSettingChange={handleSettingChange}
            isLoading={isLoading}
            textInput={textInput}
            onSubmit={handleSubmit}
          />
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card className={SHELL_CARD}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                الوكلاء المنفذون
              </CardTitle>
              <CardDescription>
                تعرض هذه اللوحة الوكلاء الذين أنتجوا نتائج داخل الجلسة الحالية.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {Object.keys(taskResults).length > 0 ? (
                Object.values(taskResults).map((result) => (
                  <div
                    key={result.agentId}
                    className="rounded-lg border border-white/10 bg-zinc-950/82 p-4"
                  >
                    <p className="font-semibold text-white">
                      {result.agentName}
                    </p>
                    <p className="mt-1 text-sm text-white/62">
                      الثقة {Math.round(result.confidence * 100)}%
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/65">
                  لا توجد نتائج وكلاء بعد.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className={SHELL_CARD}>
            <CardHeader>
              <CardTitle>التقارير المجمعة</CardTitle>
              <CardDescription>
                تم إنجاز {Object.keys(taskResults).length} مهمة في هذه الجلسة.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentReportsExporter
                reports={taskResults}
                originalText={textInput}
                onExport={() => setStatusMessage("تم تجهيز تقرير التصدير")}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error ? (
        <Alert
          variant="destructive"
          className="border-red-400/30 bg-red-950/45"
        >
          <AlertTitle>رسالة تحقق</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {showReportModal && agentReport ? (
        <AgentReportViewer report={agentReport} />
      ) : null}
    </div>
  );
};

export default DramaAnalystApp;
