"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type RefObject,
} from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useApp } from "../../context/AppContext";
import { buildTakeInsights } from "../../lib/self-tape";
import { ACTING_METHODOLOGIES } from "../../types/constants";

import { PartnerTab, RecordingTab } from "./studio-sections";

import type { ChatMessage, Recording } from "../../types";

const EMPTY_SCRIPT_MESSAGE = "أدخل مشهدًا عربيًا أولًا";
const ANALYSIS_TIMEOUT_MS = 1500;

function buildLocalAnalysis(
  scriptText: string,
  selectedMethodology: string
): string {
  const methodology =
    ACTING_METHODOLOGIES.find((method) => method.id === selectedMethodology)
      ?.name ?? "منهجية الأداء";
  const sample = scriptText.trim().slice(0, 160);

  return [
    "تحليل أداء مبدئي",
    `المنهجية: ${methodology}`,
    `المشهد: ${sample}`,
    "الهدف الأدائي: حدد رغبة الشخصية في الجملة الأولى ثم ابن انتقالًا عاطفيًا واضحًا.",
    "اقتراح عملي: ابدأ بوقفة قصيرة، ثم ارفع الإيقاع في نقطة المواجهة، وأنهِ السطر بنية محددة.",
  ].join("\n");
}

// ─── Sub-components ───

interface ScriptAnalysisTabProps {
  selectedMethodology: string;
  setSelectedMethodology: (value: string) => void;
  analysisResult: string | null;
}

interface ScriptComposerProps {
  scriptText: string;
  setScriptText: (text: string) => void;
  scriptInputRef: RefObject<HTMLTextAreaElement | null>;
  selectedMethodology: string;
  setSelectedMethodology: (value: string) => void;
  analyzing: boolean;
  validationMessage: string | null;
  setValidationMessage: (message: string | null) => void;
  analyzeScript: () => void;
}

function ScriptComposer({
  scriptText,
  setScriptText,
  scriptInputRef,
  selectedMethodology,
  setSelectedMethodology,
  analyzing,
  validationMessage,
  setValidationMessage,
  analyzeScript,
}: ScriptComposerProps) {
  const emptyStateMessage =
    validationMessage ?? (scriptText.trim() ? null : EMPTY_SCRIPT_MESSAGE);

  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-white">تحليل النص</CardTitle>
          <CardDescription className="text-white/55">
            ارفع نصًا أو وصف شخصية للحصول على تحليل أداء مباشر.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="actorai-main-script" className="text-white">
              النص أو المشهد
            </Label>
            <Textarea
              id="actorai-main-script"
              ref={scriptInputRef}
              dir="rtl"
              placeholder="الصق مشهدًا عربيًا أو وصف شخصية هنا"
              className="min-h-[220px] bg-black/18 border-white/10 text-white placeholder:text-white/65 focus-visible:ring-2 focus-visible:ring-sky-300"
              value={scriptText}
              aria-invalid={Boolean(validationMessage)}
              aria-describedby={
                emptyStateMessage ? "actorai-main-script-error" : undefined
              }
              onChange={(e) => {
                setScriptText(e.target.value);
                if (e.target.value.trim()) {
                  setValidationMessage(null);
                }
              }}
            />
            {emptyStateMessage && (
              <p
                id="actorai-main-script-error"
                role={validationMessage ? "alert" : "status"}
                className="text-sm font-medium text-amber-200"
              >
                {emptyStateMessage}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-white">منهجية التمثيل</Label>
            <Select
              value={selectedMethodology}
              onValueChange={setSelectedMethodology}
            >
              <SelectTrigger
                aria-label="منهجية التمثيل"
                className="bg-black/18 border-white/8 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTING_METHODOLOGIES.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name} ({method.nameEn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full bg-sky-700 text-white hover:bg-sky-800"
            onClick={analyzeScript}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                جاري التحليل...
              </>
            ) : (
              "حلل الأداء"
            )}
          </Button>
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

function ScriptAnalysisTab({
  selectedMethodology,
  setSelectedMethodology,
  analysisResult,
}: ScriptAnalysisTabProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-white">إعدادات التحليل</CardTitle>
          <CardDescription className="text-white/55">
            اختر المنهجية ثم استخدم زر التحليل في المدخل الثابت أعلى الأقسام.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">منهجية التمثيل</Label>
            <Select
              value={selectedMethodology}
              onValueChange={setSelectedMethodology}
            >
              <SelectTrigger
                aria-label="منهجية التمثيل"
                className="bg-black/18 border-white/8 text-white"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTING_METHODOLOGIES.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name} ({method.nameEn})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {analysisResult && (
            <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 mt-6 backdrop-blur-xl">
              <Card className="bg-transparent border-0">
                <CardHeader>
                  <CardTitle className="text-white">🎯 نتائج التحليل</CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-white/85 whitespace-pre-wrap"
                  >
                    {analysisResult}
                  </p>
                </CardContent>
              </Card>
            </CardSpotlight>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

// ─── Main component ───

export function StudioView() {
  const { showNotification, addRecording } = useApp();

  const [scriptText, setScriptText] = useState("");
  const scriptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedMethodology, setSelectedMethodology] =
    useState("stanislavsky");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );

  const [rehearsing, setRehearsing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const scriptInput = scriptInputRef.current;
    if (!scriptInput) return;

    const syncScriptText = () => {
      const nextText = scriptInput.value;
      setScriptText(nextText);
      if (nextText.trim()) {
        setValidationMessage(null);
      }
    };

    scriptInput.addEventListener("input", syncScriptText);
    scriptInput.addEventListener("change", syncScriptText);

    return () => {
      scriptInput.removeEventListener("input", syncScriptText);
      scriptInput.removeEventListener("change", syncScriptText);
    };
  }, []);

  const analyzeScript = useCallback(async () => {
    const liveScriptText = scriptInputRef.current?.value ?? scriptText;
    const trimmedScript = liveScriptText.trim();
    if (!trimmedScript) {
      if (scriptText) {
        setScriptText("");
      }
      setValidationMessage(EMPTY_SCRIPT_MESSAGE);
      return;
    }

    if (liveScriptText !== scriptText) {
      setScriptText(liveScriptText);
    }
    setValidationMessage(null);
    setAnalyzing(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, ANALYSIS_TIMEOUT_MS);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmedScript,
          context: {
            type: "script-analysis",
            methodology: selectedMethodology,
          },
        }),
      });
      const payload = (await response.json()) as {
        data?: { response?: string };
      };
      const responseText = payload?.data?.response?.trim() ?? "";
      const text = responseText
        ? responseText
        : buildLocalAnalysis(trimmedScript, selectedMethodology);
      setAnalysisResult(text);
      showNotification("success", "تم تحليل الأداء بنجاح");
    } catch {
      setAnalysisResult(buildLocalAnalysis(trimmedScript, selectedMethodology));
      showNotification("info", "تم إنشاء تحليل محلي مبدئي");
    } finally {
      window.clearTimeout(timeoutId);
      setAnalyzing(false);
    }
  }, [scriptText, selectedMethodology, showNotification]);

  const startRehearsal = useCallback(() => {
    setRehearsing(true);
    setChatMessages([
      {
        role: "ai",
        text: "مرحباً! أنا شريكك في المشهد. سأقوم بدور ليلى. ابدأ بقول سطرك الأول...",
      },
    ]);
  }, []);

  const sendMessage = useCallback(() => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;
    const newMessage: ChatMessage = { role: "user", text: trimmedInput };
    setChatMessages((prev) => [
      ...prev,
      newMessage,
      { role: "ai", text: "...", typing: true },
    ]);
    setUserInput("");
    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmedInput,
        context: { previousMessages: chatMessages, character: "ليلى" },
      }),
    })
      .then((res) => res.json())
      .then((payload: { data?: { response?: string } }) => {
        const replyText =
          payload?.data?.response ?? "تعذر الاتصال بمساعد المشهد.";
        setChatMessages((prev) => {
          const withoutTyping = prev.filter((m) => !m.typing);
          return [...withoutTyping, { role: "ai", text: replyText }];
        });
      })
      .catch(() => {
        setChatMessages((prev) => {
          const withoutTyping = prev.filter((m) => !m.typing);
          return [
            ...withoutTyping,
            { role: "ai", text: "تعذر الاتصال بمساعد المشهد." },
          ];
        });
      });
  }, [chatMessages, userInput]);

  const endRehearsal = useCallback(() => {
    setRehearsing(false);
    setChatMessages([]);
    showNotification("success", "انتهت جلسة التدريب! أحسنت 👏");
  }, [showNotification]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordingTime(0);
    showNotification("info", "بدأ التسجيل... 🎥");
  }, [showNotification]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    const insights = buildTakeInsights({
      durationSeconds: recordingTime,
      scriptText: scriptText,
      teleprompterUsed: false,
      hadRetake: recordings.length > 0,
    });
    const newRecording: Recording = {
      id: Date.now().toString(),
      title: `تسجيل جديد - ${new Date().toLocaleDateString("ar-EG")}`,
      duration,
      date:
        new Date().toISOString().split("T")[0] ??
        new Date().toLocaleDateString(),
      score: insights.score,
    };
    setRecordings((prev) => [newRecording, ...prev]);
    addRecording(newRecording);
    showNotification(
      "success",
      `تم حفظ التسجيل! النتيجة: ${newRecording.score}/100`
    );
  }, [
    addRecording,
    recordingTime,
    recordings.length,
    scriptText,
    showNotification,
  ]);

  return (
    <div className="mx-auto max-w-6xl min-w-0 max-w-full py-8">
      <h2 className="text-3xl font-bold text-white mb-6">
        استوديو الممثل العربي
      </h2>
      <p className="mb-6 max-w-3xl text-white/72">
        مساحة تدريب فعلية لتحليل المشهد، اختبار الشريك، وتسجيل الأداء.
      </p>

      <div className="mb-6">
        <ScriptComposer
          scriptText={scriptText}
          setScriptText={(text) => {
            setScriptText(text);
            if (text.trim()) setValidationMessage(null);
          }}
          scriptInputRef={scriptInputRef}
          selectedMethodology={selectedMethodology}
          setSelectedMethodology={setSelectedMethodology}
          analyzing={analyzing}
          validationMessage={validationMessage}
          setValidationMessage={setValidationMessage}
          analyzeScript={analyzeScript}
        />
      </div>

      <Tabs defaultValue="analysis" dir="rtl" className="w-full min-w-0">
        <TabsList className="grid h-auto w-full min-w-0 grid-cols-1 gap-2 border border-white/8 bg-black/14 p-2 sm:grid-cols-3">
          <TabsTrigger
            value="analysis"
            className="whitespace-normal break-words"
          >
            تحليل النص
          </TabsTrigger>
          <TabsTrigger
            value="partner"
            className="whitespace-normal break-words"
          >
            شريك المشهد
          </TabsTrigger>
          <TabsTrigger
            value="recording"
            className="whitespace-normal break-words"
          >
            تسجيل الأداء
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="analysis"
          forceMount
          className="space-y-6 data-[state=inactive]:hidden"
        >
          <ScriptAnalysisTab
            selectedMethodology={selectedMethodology}
            setSelectedMethodology={setSelectedMethodology}
            analysisResult={analysisResult}
          />
        </TabsContent>

        <TabsContent
          value="partner"
          forceMount
          className="space-y-6 data-[state=inactive]:hidden"
        >
          <PartnerTab
            rehearsing={rehearsing}
            chatMessages={chatMessages}
            userInput={userInput}
            setUserInput={setUserInput}
            chatEndRef={chatEndRef}
            startRehearsal={startRehearsal}
            sendMessage={sendMessage}
            endRehearsal={endRehearsal}
          />
        </TabsContent>

        <TabsContent
          value="recording"
          forceMount
          className="space-y-6 data-[state=inactive]:hidden"
        >
          <RecordingTab
            isRecording={isRecording}
            recordingTime={recordingTime}
            recordings={recordings}
            startRecording={startRecording}
            stopRecording={stopRecording}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
