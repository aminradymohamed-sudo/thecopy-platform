"use client";

import { type RefObject } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { formatTime } from "../../lib/utils";

import type { ChatMessage, Recording } from "../../types";

interface PartnerTabProps {
  rehearsing: boolean;
  chatMessages: ChatMessage[];
  userInput: string;
  setUserInput: (value: string) => void;
  chatEndRef: RefObject<HTMLDivElement | null>;
  startRehearsal: () => void;
  sendMessage: () => void;
  endRehearsal: () => void;
}

export function PartnerTab({
  rehearsing,
  chatMessages,
  userInput,
  setUserInput,
  chatEndRef,
  startRehearsal,
  sendMessage,
  endRehearsal,
}: PartnerTabProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-white">🎭 شريك المشهد الذكي</CardTitle>
          <CardDescription className="text-white/55">
            تدرب على مشاهدك مع شريك ذكي يستجيب لأدائك
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!rehearsing ? (
            <div className="text-center py-12">
              <div className="text-8xl mb-6">🎭</div>
              <h3 className="text-2xl font-semibold mb-4 text-white">
                مستعد للتدريب؟
              </h3>
              <p className="text-white/55 mb-6">
                سيقوم الذكاء الاصطناعي بدور الشخصية الأخرى في المشهد
              </p>
              <Button size="lg" onClick={startRehearsal}>
                🎬 ابدأ التدريب
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-white/8 rounded-[22px] p-4 h-[400px] overflow-y-auto bg-black/18">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-4 ${
                      msg.role === "user" ? "text-left" : "text-right"
                    }`}
                  >
                    <div
                      className={`inline-block p-4 rounded-lg max-w-[80%] ${
                        msg.role === "user"
                          ? "bg-white/8 text-white"
                          : "bg-white/12 text-white"
                      }`}
                    >
                      <p className="font-medium mb-1 text-white">
                        {msg.role === "user" ? "أنت (أحمد):" : "ليلى (AI):"}
                      </p>
                      <p className={msg.typing ? "animate-pulse" : ""}>
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2">
                <Textarea
                  placeholder="اكتب سطرك هنا..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 bg-black/18 border-white/8 text-white placeholder-white/45"
                />
                <div className="flex flex-col gap-2">
                  <Button onClick={sendMessage} disabled={!userInput.trim()}>
                    📤 إرسال
                  </Button>
                  <Button variant="outline" onClick={endRehearsal}>
                    ⏹️ إنهاء
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

interface RecordingTabProps {
  isRecording: boolean;
  recordingTime: number;
  recordings: Recording[];
  startRecording: () => void;
  stopRecording: () => void;
}

export function RecordingTab({
  isRecording,
  recordingTime,
  recordings,
  startRecording,
  stopRecording,
}: RecordingTabProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/14 border border-white/8 backdrop-blur-xl">
      <Card className="bg-transparent border-0">
        <CardHeader>
          <CardTitle className="text-white">🎥 تسجيل الأداء</CardTitle>
          <CardDescription className="text-white/55">
            سجل أداءك واحصل على ملاحظات مدعومة بالذكاء الاصطناعي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            {!isRecording ? (
              <>
                <div className="text-8xl mb-6">🎥</div>
                <h3 className="text-2xl font-semibold mb-4 text-white">
                  مستعد لتسجيل أدائك؟
                </h3>
                <Button size="lg" onClick={startRecording}>
                  ⏺️ ابدأ التسجيل
                </Button>
              </>
            ) : (
              <>
                <div className="text-8xl mb-6 animate-pulse">🔴</div>
                <h3 className="text-4xl font-mono font-bold text-red-600 mb-4">
                  {formatTime(recordingTime)}
                </h3>
                <p className="text-white/55 mb-6">جاري التسجيل...</p>
                <Button size="lg" variant="destructive" onClick={stopRecording}>
                  ⏹️ إيقاف التسجيل
                </Button>
              </>
            )}
          </div>

          {recordings.length > 0 && (
            <div className="mt-8">
              <h4 className="font-semibold mb-4 text-white">
                📚 تسجيلاتك السابقة:
              </h4>
              <div className="space-y-3">
                {recordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex justify-between items-center p-4 border border-white/8 rounded-[22px] hover:bg-white/4 bg-black/14"
                  >
                    <div>
                      <h5 className="font-medium text-white">{rec.title}</h5>
                      <p className="text-sm text-white/55">
                        المدة: {rec.duration} • {rec.date}
                      </p>
                    </div>
                    <Badge
                      className={
                        rec.score >= 80
                          ? "bg-green-600"
                          : rec.score >= 70
                            ? "bg-yellow-600"
                            : "bg-red-600"
                      }
                    >
                      النتيجة: {rec.score}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}
