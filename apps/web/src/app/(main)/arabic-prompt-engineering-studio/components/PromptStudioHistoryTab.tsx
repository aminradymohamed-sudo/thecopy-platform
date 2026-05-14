import { ClipboardCopy, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { PromptHistoryEntry } from "../types";

interface PromptStudioHistoryTabProps {
  promptHistory: PromptHistoryEntry[];
  handleCopy: (text: string) => void;
  handleRestoreHistoryEntry: (entry: PromptHistoryEntry) => void;
}

export function PromptStudioHistoryTab({
  promptHistory,
  handleCopy,
  handleRestoreHistoryEntry,
}: PromptStudioHistoryTabProps) {
  return (
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
                    تاريخ التحليل: {entry.timestamp.toLocaleString("ar-EG")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary">{entry.score}/100</Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRestoreHistoryEntry(entry)}
                  >
                    <RotateCcw className="ml-1 h-4 w-4" aria-hidden="true" />
                    استعادة
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(entry.prompt)}
                  >
                    <ClipboardCopy
                      className="ml-1 h-4 w-4"
                      aria-hidden="true"
                    />
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
  );
}
