import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { PromptStudioEmptyPanel } from "./PromptStudioEmptyPanel";
import { PromptStudioMetricSummary } from "./PromptStudioMetricSummary";

import type { PromptComparisonResult } from "../hooks/usePromptStudio";

interface PromptStudioCompareTabProps {
  comparePrompt1: string;
  setComparePrompt1: (value: string) => void;
  comparePrompt2: string;
  setComparePrompt2: (value: string) => void;
  comparisonResult: PromptComparisonResult | null;
  handleCompare: () => void;
}

export function PromptStudioCompareTab({
  comparePrompt1,
  setComparePrompt1,
  comparePrompt2,
  setComparePrompt2,
  comparisonResult,
  handleCompare,
}: PromptStudioCompareTabProps) {
  return (
    <>
      <Card className="border-purple-500/20 bg-black/10">
        <CardHeader>
          <CardTitle className="text-lg">مقارنة التوجيهات</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="compare-prompt-1">التوجيه الأول</Label>
            <Textarea
              id="compare-prompt-1"
              value={comparePrompt1}
              onChange={(event) => setComparePrompt1(event.target.value)}
              className="min-h-[180px] bg-black/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="compare-prompt-2">التوجيه الثاني</Label>
            <Textarea
              id="compare-prompt-2"
              value={comparePrompt2}
              onChange={(event) => setComparePrompt2(event.target.value)}
              className="min-h-[180px] bg-black/20"
            />
          </div>
          <div className="lg:col-span-2">
            <Button
              type="button"
              onClick={handleCompare}
              disabled={!comparePrompt1.trim() || !comparePrompt2.trim()}
            >
              قارن التوجيهين
            </Button>
          </div>
        </CardContent>
      </Card>

      {comparisonResult ? (
        <Card className="border-purple-500/20 bg-black/10">
          <CardHeader>
            <CardTitle className="text-lg">نتيجة المقارنة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge>
              {comparisonResult.winner === "tie"
                ? "تعادل"
                : `الفائز: التوجيه ${comparisonResult.winner}`}
            </Badge>
            <div className="grid gap-3 md:grid-cols-2">
              <PromptStudioMetricSummary
                title="التوجيه الأول"
                score={comparisonResult.prompt1.metrics.overallScore}
              />
              <PromptStudioMetricSummary
                title="التوجيه الثاني"
                score={comparisonResult.prompt2.metrics.overallScore}
              />
            </div>
            <div>
              <h3 className="mb-2 text-base font-semibold">الفروق</h3>
              <ul className="space-y-2 text-sm text-white/70">
                {comparisonResult.differences.map((difference) => (
                  <li key={difference}>{difference}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PromptStudioEmptyPanel text="أدخل توجيهين ثم اضغط زر المقارنة." />
      )}
    </>
  );
}
