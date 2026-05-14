"use client";

/**
 * الصفحة: brain-storm-ai / ControlPanel
 * الهوية: لوحة تحكم داخلية بطابع شبكي/تحليلي متسق مع القشرة الداكنة الجديدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات الغلاف الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Cpu, Settings, Play, Rocket, RotateCcw, Loader2 } from "lucide-react";
import {
  useCallback,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import FileUpload from "@/components/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { EMPTY_BRIEF_ERROR } from "../../constants";

import type { Session, BrainstormPhase, PhaseDisplayInfo } from "../../types";

interface ControlPanelProps {
  phases: PhaseDisplayInfo[];
  activePhase: BrainstormPhase;
  setActivePhase: (phase: BrainstormPhase) => void;
  currentSession: Session | null;
  brief: string;
  setBrief: (value: string) => void;
  isLoading: boolean;
  isAdvancing: boolean;
  progressPercent: string;
  onStartSession: () => void;
  onStopSession: () => void;
  onAdvancePhase: () => void;
  onFileContent: (content: string) => void;
}

export default function ControlPanel({
  phases,
  activePhase,
  setActivePhase,
  currentSession,
  brief,
  setBrief,
  isLoading,
  isAdvancing,
  progressPercent,
  onStartSession,
  onStopSession,
  onAdvancePhase,
  onFileContent,
}: ControlPanelProps) {
  const [briefError, setBriefError] = useState<string | null>(null);
  const trimmedBrief = brief.trim();
  const validationMessage =
    trimmedBrief.length === 0
      ? EMPTY_BRIEF_ERROR
      : brief.length > 5000
        ? "تجاوز الملخص الحد الأقصى المسموح به"
        : null;
  const activePanelId = `brainstorm-phase-panel-${activePhase}`;

  const handleBriefChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setBrief(event.target.value);
      if (briefError) {
        setBriefError(null);
      }
    },
    [briefError, setBrief]
  );

  const handleStartClick = useCallback(() => {
    if (validationMessage) {
      setBriefError(validationMessage);
      return;
    }
    setBriefError(null);
    onStartSession();
  }, [onStartSession, validationMessage]);

  const handleStartKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      handleStartClick();
    },
    [handleStartClick]
  );

  const handlePhaseKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const lastIndex = phases.length - 1;
      let nextIndex: number | null = null;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const currentPhase = phases[index];
        if (currentPhase) {
          setActivePhase(currentPhase.id);
        }
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        nextIndex = index === lastIndex ? 0 : index + 1;
      } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        nextIndex = index === 0 ? lastIndex : index - 1;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = lastIndex;
      }

      if (nextIndex === null) {
        return;
      }

      event.preventDefault();
      const nextPhase = phases[nextIndex];
      if (!nextPhase) {
        return;
      }
      setActivePhase(nextPhase.id);
      document.getElementById(`brainstorm-phase-tab-${nextPhase.id}`)?.focus();
    },
    [phases, setActivePhase]
  );

  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/24 backdrop-blur-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <Cpu className="w-6 h-6 text-[var(--page-accent,#3b5bdb)]" />
          لوحة التحكم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-white">المراحل</h3>
          <div
            role="tablist"
            aria-label="مراحل العصف الذهني"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {phases.map((phase, index) => (
              <TooltipProvider key={phase.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      id={`brainstorm-phase-tab-${phase.id}`}
                      type="button"
                      role="tab"
                      aria-selected={activePhase === phase.id}
                      aria-controls={`brainstorm-phase-panel-${phase.id}`}
                      tabIndex={activePhase === phase.id ? 0 : -1}
                      variant={activePhase === phase.id ? "default" : "outline"}
                      className="p-4 h-auto"
                      onClick={() => setActivePhase(phase.id)}
                      onKeyDown={(event) => handlePhaseKeyDown(event, index)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {phase.icon}
                        <div className="text-left flex-1">
                          <p className="font-bold text-sm">{phase.name}</p>
                          <p className="text-xs opacity-75">{phase.nameEn}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {phase.agentCount}
                        </Badge>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{phase.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        <div
          id={activePanelId}
          role="tabpanel"
          aria-labelledby={`brainstorm-phase-tab-${activePhase}`}
          className="space-y-4"
        >
          {!currentSession ? (
            <>
              <div>
                <label
                  htmlFor="field-controlpanel-1"
                  className="block text-sm font-medium mb-2 text-white/82"
                >
                  ملخص الفكرة
                </label>
                <FileUpload onFileContent={onFileContent} className="mb-4" />
                <Textarea
                  id="field-controlpanel-1"
                  value={brief}
                  onChange={handleBriefChange}
                  placeholder="اكتب فكرتك..."
                  className="min-h-[120px] bg-black/20 border-white/10"
                  disabled={isLoading}
                  maxLength={5000}
                  aria-invalid={Boolean(briefError)}
                  aria-describedby={
                    briefError ? "brainstorm-brief-error" : undefined
                  }
                />
                {briefError ? (
                  <p
                    id="brainstorm-brief-error"
                    role="alert"
                    className="mt-2 rounded-md border border-red-400/35 bg-red-950/35 px-3 py-2 text-sm text-red-100"
                  >
                    {briefError}
                  </p>
                ) : null}
                <p
                  className={`mt-1 text-xs text-left tabular-nums ${brief.length >= 4800 ? "text-red-400" : "text-white/48"}`}
                >
                  {brief.length}/5000
                </p>
              </div>
              <Button
                type="button"
                onClick={handleStartClick}
                onKeyDown={handleStartKeyDown}
                disabled={isLoading}
                aria-describedby={
                  briefError ? "brainstorm-brief-error" : undefined
                }
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Settings className="w-5 h-5 mr-2 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    بدء جلسة
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                <h3 className="font-medium mb-2 text-white">الملخص</h3>
                <p className="text-sm leading-7 text-white/74">
                  {currentSession.brief}
                </p>
                <textarea
                  className="sr-only"
                  readOnly
                  aria-label="موضوع الجلسة الحالي"
                  value={currentSession.brief}
                />
              </div>
              {isLoading ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-2 rounded-xl border border-blue-400/25 bg-blue-950/30 px-3 py-2 text-sm text-blue-100"
                >
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  جاري توليد ردود الوكلاء...
                </div>
              ) : null}
              <div className="flex gap-3">
                <Button
                  onClick={onAdvancePhase}
                  disabled={activePhase >= 5 || isAdvancing}
                  className="flex-1"
                >
                  {isAdvancing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      جاري التقدم...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      التالي
                    </>
                  )}
                </Button>
                <Button
                  onClick={onStopSession}
                  variant="destructive"
                  disabled={isAdvancing}
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  إعادة
                </Button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/55">التقدم</span>
                  <span className="text-sm font-medium text-white">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </CardSpotlight>
  );
}
