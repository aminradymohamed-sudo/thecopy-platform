import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettingsPanel } from "@/app/(main)/arabic-creative-writing-studio/components/SettingsPanel";

import type { AppSettings } from "@/app/(main)/arabic-creative-writing-studio/types";

const DEFAULT_SETTINGS: AppSettings = {
  language: "ar",
  theme: "dark",
  textDirection: "rtl",
  fontSize: "medium",
  autoSave: true,
  autoSaveInterval: 30000,
  geminiApiKey: "test-key",
  geminiModel: "gemini-2.5-pro",
  geminiTemperature: 0.7,
  geminiMaxTokens: 8192,
};

describe("SettingsPanel accessibility", () => {
  it("gives the API key reveal button and auto-save switch clear accessible names", () => {
    render(
      <SettingsPanel
        settings={DEFAULT_SETTINGS}
        onSettingsUpdate={vi.fn()}
        onTestConnection={vi.fn().mockResolvedValue(undefined)}
      />
    );

    expect(
      screen.getByRole("button", { name: "إظهار مفتاح Gemini" })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("switch", { name: "تفعيل الحفظ التلقائي" })
    ).toBeChecked();
  });
});
