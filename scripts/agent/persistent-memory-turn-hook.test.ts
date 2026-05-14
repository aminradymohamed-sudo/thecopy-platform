import { describe, expect, test } from "vitest";

import {
  readPromptFromHookInput,
  renderClaudeHookOutput,
} from "./persistent-memory-turn-hook";

describe("persistent memory Claude prompt hook", () => {
  test("extracts the submitted user prompt from hook stdin", () => {
    expect(
      readPromptFromHookInput(
        JSON.stringify({
          hook_event_name: "UserPromptSubmit",
          session_id: "session-1",
          prompt: "حل مشكلة الذاكرة",
        }),
      ),
    ).toBe("حل مشكلة الذاكرة");
  });

  test("emits additional context as hook specific output", () => {
    const output = JSON.parse(
      renderClaudeHookOutput("سياق ذاكرة السؤال الحي"),
    ) as {
      continue: boolean;
      suppressOutput: boolean;
      hookSpecificOutput?: {
        hookEventName: string;
        additionalContext: string;
      };
    };

    expect(output.continue).toBe(true);
    expect(output.suppressOutput).toBe(true);
    expect(output.hookSpecificOutput).toEqual({
      hookEventName: "UserPromptSubmit",
      additionalContext: "سياق ذاكرة السؤال الحي",
    });
  });
});
