"use client";

import { defaultPromptTemplates } from "@the-copy/prompt-engineering";
import {
  ArrowUpDown,
  BookOpen,
  CheckCircle,
  ClipboardCopy,
  FlaskConical,
  History,
  PenTool,
  Play,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";

import { PromptAnalysisResult } from "./components/PromptAnalysisResult";
import { PromptEditor } from "./components/PromptEditor";
import { CATEGORY_LABELS } from "./constants";
import { usePromptStudio } from "./hooks/usePromptStudio";

export default function ArabicPromptEngineeringStudioPage() {
  useEffect(() => {
    const responsiveClass = "arabic-prompt-studio-responsive-page";
    document.documentElement.classList.add(responsiveClass);
    document.body.classList.add(responsiveClass);

    return () => {
      document.documentElement.classList.remove(responsiveClass);
      document.body.classList.remove(responsiveClass);
    };
  }, []);

  const {
    prompt,
    setPrompt,
    analysis,
    isAnalyzing,
    activeTab,
    setActiveTab,
    selectedTemplate,
    setSelectedTemplate,
    templateVariables,
    setTemplateVariables,
    promptHistory,
    comparePrompt1,
    setComparePrompt1,
    comparePrompt2,
    setComparePrompt2,
    comparisonResult,
    labInput,
    setLabInput,
    labResult,
    suggestions,
    handleAnalyze,
    handleCopy,
    handleApplyTemplate,
    handleCompare,
    handleRestoreHistoryEntry,
    handleClearStudio,
    handleRunLab,
  } = usePromptStudio();

  return (
    <TooltipProvider>
      <section
        dir="rtl"
        aria-labelledby="prompt-studio-title"
        className="relative isolate min-h-screen overflow-x-clip bg-[var(--background,oklch(0.145_0_0))]"
        style={{
          ["--page-accent" as string]: "var(--accent-technical, #3b5bdb)",
          ["--page-accent-2" as string]: "var(--accent-creative, #c2255c)",
          ["--page-border" as string]: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(59,91,219,0.14),transparent_34%),linear-gradient(315deg,rgba(194,37,92,0.12),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:44px_44px]" />

        <div className="relative z-10 mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4 md:px-6 md:py-6">
          <div className="space-y-6">
            <header className="overflow-hidden rounded-2xl border border-[var(--page-border)] bg-black/30 px-5 py-7 text-white shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur md:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-3 shadow-lg">
                    <Wand2 className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.28em] text-white/50">
                      مختبر هندسة التوجيهات
                    </p>
                    <h1
                      id="prompt-studio-title"
                      className="mt-2 text-3xl font-bold md:text-4xl"
                    >
                      استوديو هندسة التوجيهات العربي
                    </h1>
                    <p className="mt-2 max-w-3xl leading-7 text-white/66">
                      حرر التوجيهات وحللها وقارنها وابن قوالب قابلة لإعادة
                      الاستخدام داخل واجهة واحدة.
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit border-purple-400/50 text-purple-200"
                >
                  <Sparkles className="ml-1 h-3 w-3" aria-hidden="true" />
                  مدعوم بالذكاء الاصطناعي
                </Badge>
              </div>
            </header>

            <section
              aria-labelledby="prompt-studio-workspace-title"
              className="overflow-x-clip rounded-2xl border border-[var(--page-border)] bg-black/24 p-3 shadow-[0_20px_80px_rgba(0,0,0,0.2)] backdrop-blur md:p-6"
            >
              <h2 id="prompt-studio-workspace-title" className="sr-only">
                مساحة عمل استوديو التوجيهات
              </h2>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
              >
                <TabsList className="mx-auto flex h-auto w-full max-w-4xl flex-wrap gap-2 bg-white/6 p-1">
                  <TabsTrigger
                    value="editor"
                    className="min-w-[7rem] flex-1 gap-2"
                  >
                    <PenTool className="h-4 w-4" aria-hidden="true" />
                    المحرر
                  </TabsTrigger>
                  <TabsTrigger
                    value="templates"
                    className="min-w-[7rem] flex-1 gap-2"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    القوالب
                  </TabsTrigger>
                  <TabsTrigger
                    value="compare"
                    className="min-w-[7rem] flex-1 gap-2"
                  >
                    <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                    المقارنة
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="min-w-[7rem] flex-1 gap-2"
                  >
                    <History className="h-4 w-4" aria-hidden="true" />
                    السجل
                  </TabsTrigger>
                  <TabsTrigger
                    value="lab"
                    className="min-w-[7rem] flex-1 gap-2"
                  >
                    <FlaskConical className="h-4 w-4" aria-hidden="true" />
                    المختبر
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="editor" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <PromptEditor
                      prompt={prompt}
                      setPrompt={setPrompt}
                      isAnalyzing={isAnalyzing}
                      handleAnalyze={handleAnalyze}
                      handleCopy={handleCopy}
                      handleClearStudio={handleClearStudio}
                      suggestions={suggestions}
                    />
                    <div className="space-y-4">
                      <PromptAnalysisResult analysis={analysis} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="grid gap-3 md:grid-cols-2">
                      {defaultPromptTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="border-purple-500/20 bg-black/10"
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {template.name}
                            </CardTitle>
                            <p className="text-sm leading-6 text-white/60">
                              {template.description}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                {CATEGORY_LABELS[template.category]}
                              </Badge>
                              {template.tags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setTemplateVariables({});
                              }}
                              aria-label={`استخدام قالب ${template.name}`}
                            >
                              استخدام قالب {template.name}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Card className="border-purple-500/20 bg-black/10">
                      <CardHeader>
                        <CardTitle className="text-lg">إعداد القالب</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedTemplate ? (
                          <>
                            <p className="text-sm leading-6 text-white/65">
                              {selectedTemplate.description}
                            </p>
                            {selectedTemplate.variables.map((variable) => {
                              const inputId = `template-${variable.name}`;
                              return (
                                <div key={variable.name} className="space-y-2">
                                  <Label htmlFor={inputId}>
                                    {variable.description}
                                  </Label>
                                  <Input
                                    id={inputId}
                                    value={
                                      templateVariables[variable.name] ??
                                      variable.defaultValue ??
                                      ""
                                    }
                                    onChange={(event) =>
                                      setTemplateVariables({
                                        ...templateVariables,
                                        [variable.name]: event.target.value,
                                      })
                                    }
                                  />
                                </div>
                              );
                            })}
                            <Button type="button" onClick={handleApplyTemplate}>
                              تطبيق القالب
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm leading-6 text-white/60">
                            اختر قالبًا من القائمة لتظهر متغيراته هنا.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="compare" className="space-y-6">
                  <Card className="border-purple-500/20 bg-black/10">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        مقارنة التوجيهات
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="compare-prompt-1">التوجيه الأول</Label>
                        <Textarea
                          id="compare-prompt-1"
                          value={comparePrompt1}
                          onChange={(event) =>
                            setComparePrompt1(event.target.value)
                          }
                          className="min-h-[180px] bg-black/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="compare-prompt-2">التوجيه الثاني</Label>
                        <Textarea
                          id="compare-prompt-2"
                          value={comparePrompt2}
                          onChange={(event) =>
                            setComparePrompt2(event.target.value)
                          }
                          className="min-h-[180px] bg-black/20"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <Button
                          type="button"
                          onClick={handleCompare}
                          disabled={
                            !comparePrompt1.trim() || !comparePrompt2.trim()
                          }
                        >
                          قارن التوجيهين
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {comparisonResult ? (
                    <Card className="border-purple-500/20 bg-black/10">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          نتيجة المقارنة
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Badge>
                          {comparisonResult.winner === "tie"
                            ? "تعادل"
                            : `الفائز: التوجيه ${comparisonResult.winner}`}
                        </Badge>
                        <div className="grid gap-3 md:grid-cols-2">
                          <MetricSummary
                            title="التوجيه الأول"
                            score={
                              comparisonResult.prompt1.metrics.overallScore
                            }
                          />
                          <MetricSummary
                            title="التوجيه الثاني"
                            score={
                              comparisonResult.prompt2.metrics.overallScore
                            }
                          />
                        </div>
                        <div>
                          <h3 className="mb-2 text-base font-semibold">
                            الفروق
                          </h3>
                          <ul className="space-y-2 text-sm text-white/70">
                            {comparisonResult.differences.map((difference) => (
                              <li key={difference}>{difference}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyPanel text="أدخل توجيهين ثم اضغط زر المقارنة." />
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card className="border-purple-500/20 bg-black/10">
                    <CardHeader>
                      <CardTitle className="text-lg">آخر التحليلات</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {promptHistory.length ? (
                        promptHistory.map((entry) => (
                          <div
                            key={`${entry.timestamp.toISOString()}-${entry.score}`}
                            className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0 space-y-1">
                                <p className="line-clamp-2 text-sm text-white/75">
                                  {entry.prompt}
                                </p>
                                <p className="text-xs text-white/45">
                                  تاريخ التحليل:{" "}
                                  {entry.timestamp.toLocaleString("ar-EG")}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge variant="secondary">
                                  {entry.score}/100
                                </Badge>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    handleRestoreHistoryEntry(entry)
                                  }
                                >
                                  <RotateCcw className="ml-1 h-4 w-4" />
                                  استعادة
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopy(entry.prompt)}
                                >
                                  <ClipboardCopy className="ml-1 h-4 w-4" />
                                  نسخ
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-white/60">
                          لا يوجد سجل بعد. حلل توجيهًا ليظهر هنا.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="lab" className="space-y-4">
                  <Card className="border-purple-500/20 bg-black/10">
                    <CardHeader>
                      <CardTitle className="text-lg">مختبر التوجيهات</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="lab-input">نص الاختبار</Label>
                        <Textarea
                          id="lab-input"
                          value={labInput}
                          onChange={(event) => setLabInput(event.target.value)}
                          placeholder="اكتب توجيهًا للاختبار أو اتركه فارغًا لاستخدام نص المحرر"
                          className="min-h-[160px] bg-black/20"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleRunLab}
                        disabled={!labInput.trim() && !prompt.trim()}
                      >
                        <Play className="ml-2 h-4 w-4" />
                        تشغيل الاختبار
                      </Button>
                    </CardContent>
                  </Card>

                  {labResult ? (
                    <Card className="border-green-500/20 bg-green-500/5">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          نتيجة المختبر
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Badge>
                          درجة الجودة: {labResult.analysis.metrics.overallScore}
                        </Badge>
                        <p className="text-sm leading-6 text-white/65">
                          تم تحليل نص الاختبار وإنتاج اقتراحات قابلة للتطبيق.
                        </p>
                        <ul className="space-y-2 text-sm text-white/70">
                          {labResult.suggestions
                            .slice(0, 4)
                            .map((suggestion) => (
                              <li key={suggestion}>{suggestion}</li>
                            ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ) : (
                    <EmptyPanel text="شغّل اختبارًا لرؤية درجة الجودة والاقتراحات." />
                  )}
                </TabsContent>
              </Tabs>
            </section>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <Card className="border-dashed border-purple-500/20 bg-black/10">
      <CardContent className="p-6 text-center text-sm text-white/60">
        {text}
      </CardContent>
    </Card>
  );
}

function MetricSummary({ title, score }: { title: string; score: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-white/55">{title}</p>
      <p className="mt-1 text-2xl font-bold text-white">{score}/100</p>
    </div>
  );
}
