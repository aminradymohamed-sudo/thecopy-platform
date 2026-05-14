import { CheckCircle, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { PromptStudioEmptyPanel } from "./PromptStudioEmptyPanel";

import type { PromptStudioLabResult } from "../types";

interface PromptStudioLabTabProps {
  prompt: string;
  labInput: string;
  setLabInput: (value: string) => void;
  labResult: PromptStudioLabResult | null;
  handleRunLab: () => void;
}

export function PromptStudioLabTab({
  prompt,
  labInput,
  setLabInput,
  labResult,
  handleRunLab,
}: PromptStudioLabTabProps) {
  return (
    <>
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
            <Play className="ml-2 h-4 w-4" aria-hidden="true" />
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
              {labResult.suggestions.slice(0, 4).map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <PromptStudioEmptyPanel text="شغّل اختبارًا لرؤية درجة الجودة والاقتراحات." />
      )}
    </>
  );
}
