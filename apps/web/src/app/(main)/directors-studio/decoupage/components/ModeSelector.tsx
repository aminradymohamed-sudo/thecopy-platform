"use client";

import { Button } from "@/components/ui/button";

import {
  ANALYSIS_MODES,
  MODE_DESCRIPTIONS,
  MODE_LABELS,
  type AnalysisMode,
} from "../lib/types";

interface ModeSelectorProps {
  readonly currentMode: AnalysisMode;
  readonly onModeChange: (mode: AnalysisMode) => void;
}

/**
 * شريط أفقي لاختيار وضع التحليل من بين 11 وضعًا.
 */
export function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ANALYSIS_MODES.map((mode, index) => {
        const isActive = mode === currentMode;
        return (
          <Button
            key={mode}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onModeChange(mode)}
            aria-pressed={isActive}
            className="text-xs"
          >
            <span className="ml-1 opacity-70">
              {String(index + 1).padStart(2, "0")}
            </span>
            {MODE_LABELS[mode]}
          </Button>
        );
      })}
    </div>
  );
}

interface ModeDescriptionProps {
  readonly mode: AnalysisMode;
}

export function ModeDescription({ mode }: ModeDescriptionProps) {
  return (
    <div className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm text-[var(--app-text)]">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--app-accent)]">
        المرحلة النشطة — {MODE_LABELS[mode]}
      </p>
      <p className="text-[var(--app-text-muted)]">{MODE_DESCRIPTIONS[mode]}</p>
    </div>
  );
}
