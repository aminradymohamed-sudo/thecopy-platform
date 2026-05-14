"use client";

import { Loader2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { MODE_LABELS } from "../lib/types";

import type {
  AnalysisMode,
  PerspectiveParams,
  PromptBuilderParams,
  RhythmParams,
  SpatialParams,
} from "../lib/types";
import type { Dispatch, SetStateAction } from "react";

interface ModeSpecificControlsProps {
  mode: AnalysisMode;
  script: string;
  spatialParams: SpatialParams;
  setSpatialParams: Dispatch<SetStateAction<SpatialParams>>;
  promptBuilderParams: PromptBuilderParams;
  setPromptBuilderParams: Dispatch<SetStateAction<PromptBuilderParams>>;
  rhythmParams: RhythmParams;
  setRhythmParams: Dispatch<SetStateAction<RhythmParams>>;
  perspectiveParams: PerspectiveParams;
  setPerspectiveParams: Dispatch<SetStateAction<PerspectiveParams>>;
  onAutoDeduceSpatial: () => void;
  isDeducingSpatial: boolean;
}

function updateParam<T extends object, K extends keyof T>(
  setter: Dispatch<SetStateAction<T>>,
  key: K,
  value: T[K]
) {
  setter((current) => ({ ...current, [key]: value }));
}

export function ModeSpecificControls({
  mode,
  script,
  spatialParams,
  setSpatialParams,
  promptBuilderParams,
  setPromptBuilderParams,
  rhythmParams,
  setRhythmParams,
  perspectiveParams,
  setPerspectiveParams,
  onAutoDeduceSpatial,
  isDeducingSpatial,
}: ModeSpecificControlsProps) {
  if (mode === "space") {
    return (
      <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest">
            {MODE_LABELS[mode]}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>المعاملات المكانية</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onAutoDeduceSpatial}
              disabled={isDeducingSpatial || script.trim().length === 0}
            >
              {isDeducingSpatial ? (
                <Loader2 className="ml-1 h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="ml-1 h-3 w-3" />
              )}
              استنتاج تلقائي
            </Button>
          </div>
          <Textarea
            value={spatialParams.style}
            onChange={(event) =>
              updateParam(setSpatialParams, "style", event.target.value)
            }
            placeholder="الأسلوب البصري..."
            rows={2}
          />
          <Input
            value={spatialParams.colors}
            onChange={(event) =>
              updateParam(setSpatialParams, "colors", event.target.value)
            }
            placeholder="الألوان"
          />
          <Input
            value={spatialParams.lighting}
            onChange={(event) =>
              updateParam(setSpatialParams, "lighting", event.target.value)
            }
            placeholder="الإضاءة"
          />
          <Input
            value={spatialParams.setDressing}
            onChange={(event) =>
              updateParam(setSpatialParams, "setDressing", event.target.value)
            }
            placeholder="الديكور والإكسسوارات"
          />
          <Textarea
            value={spatialParams.details}
            onChange={(event) =>
              updateParam(setSpatialParams, "details", event.target.value)
            }
            placeholder="تفاصيل إضافية..."
            rows={2}
          />
        </CardContent>
      </Card>
    );
  }

  if (mode === "prompt_builder") {
    return (
      <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest">
            {MODE_LABELS[mode]}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3">
          <Input
            value={promptBuilderParams.genre}
            onChange={(event) =>
              updateParam(setPromptBuilderParams, "genre", event.target.value)
            }
            placeholder="النوع الدرامي"
          />
          <Textarea
            value={promptBuilderParams.sceneDescription}
            onChange={(event) =>
              updateParam(
                setPromptBuilderParams,
                "sceneDescription",
                event.target.value
              )
            }
            placeholder="وصف المشهد المطلوب تحويله إلى توجيه..."
            rows={3}
          />
        </CardContent>
      </Card>
    );
  }

  if (mode === "rhythm") {
    return (
      <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest">
            {MODE_LABELS[mode]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={rhythmParams.goal}
            onChange={(event) =>
              updateParam(setRhythmParams, "goal", event.target.value)
            }
            placeholder="هدف الإيقاع والتوتر..."
            rows={3}
          />
        </CardContent>
      </Card>
    );
  }

  if (mode === "perspective") {
    return (
      <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-widest">
            {MODE_LABELS[mode]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={perspectiveParams.cameraRule}
            onChange={(event) =>
              updateParam(
                setPerspectiveParams,
                "cameraRule",
                event.target.value
              )
            }
            placeholder="قاعدة الكاميرا"
          />
        </CardContent>
      </Card>
    );
  }

  return null;
}
