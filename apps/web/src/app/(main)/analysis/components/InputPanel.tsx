"use client";

import { Loader2, Play, X } from "lucide-react";
import { useEffect, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  hasText: boolean;
  resetToken: number;
  validationMessage: string | null;
  onTextInput: (value: string) => void;
  onStart: () => void;
  onReset: () => void;
  isRunning: boolean;
}

export function InputPanel({
  inputRef,
  hasText,
  resetToken,
  validationMessage,
  onTextInput,
  onStart,
  onReset,
  isRunning,
}: Props) {
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, [inputRef, resetToken]);

  return (
    <div className="space-y-4">
      <Textarea
        ref={inputRef}
        placeholder="ألصق النص الدرامي هنا لبدء التحليل ..."
        className="min-h-48 w-full rounded-[22px] border-2 border-white/16 bg-[#0b1020] p-4 text-white shadow-sm placeholder:text-white/48"
        defaultValue=""
        onChange={(e) => onTextInput(e.target.value)}
        disabled={isRunning}
        aria-invalid={Boolean(validationMessage)}
        aria-describedby={
          validationMessage ? "analysis-input-error" : undefined
        }
      />
      {validationMessage && (
        <p
          id="analysis-input-error"
          className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          role="alert"
        >
          {validationMessage}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onStart}
            disabled={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="ml-2 h-4 w-4" />
            )}
            {isRunning ? "جاري التحليل..." : "ابدأ التحليل"}
          </Button>
          {hasText && !isRunning && (
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              disabled={isRunning}
            >
              <X className="ml-2 h-4 w-4" />
              إعادة تعيين
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
