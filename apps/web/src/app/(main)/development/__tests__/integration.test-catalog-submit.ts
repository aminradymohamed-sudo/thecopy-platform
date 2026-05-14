// @vitest-environment jsdom
/**
 * @fileoverview Integration tests for handleCatalogSubmit (T053)
 */

import { act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { primaryOk } from "./test-fixtures";
import { mountHook } from "./test-helpers";

// ---------------------------------------------------------------------------
// Global mocks (must be hoisted before module imports that use them)
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/ai/gemini-core", () => ({
  toText: (v: unknown) => String(v),
}));

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: vi.fn().mockResolvedValue(null),
}));

describe("T053: handleCatalogSubmit is exposed from hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("T053: handleCatalogSubmit is a function", async () => {
    const { result } = await mountHook();
    expect(typeof result.current.handleCatalogSubmit).toBe("function");
  });

  it("selects the default completion tool when valid text reaches the threshold", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(100));
    });

    await waitFor(() => {
      expect(result.current.selectedCatalogTaskId).toBe("completion");
    });
  });

  it("shows visible validation and does not fetch when catalog submit has short text", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("قصير");
    });

    await act(async () => {
      await result.current.handleCatalogSubmit();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/الحد الأدنى|أدخل نصًا/);
    expect(result.current.statusMessage).toBe(result.current.error);
  });

  it("runs the default completion tool from catalog submit", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("نتيجة افتراضية"));
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(120));
    });

    await act(async () => {
      await result.current.handleCatalogSubmit();
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(result.current.catalogResult?.text).toBe("نتيجة افتراضية");
  });
});
