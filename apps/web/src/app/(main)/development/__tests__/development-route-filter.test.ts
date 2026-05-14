// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
const mockLoadRemoteAppState =
  vi.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPersistRemoteAppState =
  vi.fn<(...args: unknown[]) => Promise<unknown>>();

vi.stubGlobal("fetch", mockFetch);

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/ai/gemini-core", () => ({
  toText: (v: unknown) => String(v),
}));

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: (...args: unknown[]) => mockLoadRemoteAppState(...args),
  persistRemoteAppState: (...args: unknown[]) =>
    mockPersistRemoteAppState(...args),
}));

import { useCreativeDevelopment } from "../../../(main)/development/hooks/useCreativeDevelopment";

function primaryOk(text = "نتيجة تطوير مباشرة") {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        success: true,
        result: {
          finalDecision: text,
        },
      }),
  } as unknown as Response;
}

describe("development route filter compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockLoadRemoteAppState.mockResolvedValue(null);
    mockPersistRemoteAppState.mockResolvedValue(undefined);
  });

  it("selects the default tool and runs a valid catalog submission", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("نتيجة قابلة للقياس"));
    const { result } = renderHook(() => useCreativeDevelopment());

    act(() => {
      result.current.setTextInput("أ".repeat(120));
    });

    await waitFor(() => {
      expect(result.current.selectedCatalogTaskId).toBe("completion");
    });

    await act(async () => {
      await result.current.handleCatalogSubmit();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/development/execute",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.current.catalogResult?.text).toBe("نتيجة قابلة للقياس");
  });

  it("shows visible validation and does not fetch for short text", async () => {
    const { result } = renderHook(() => useCreativeDevelopment());

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

  it("clears input, result, and session draft", async () => {
    mockFetch.mockResolvedValueOnce(primaryOk("نتيجة قبل المسح"));
    const { result } = renderHook(() => useCreativeDevelopment());

    act(() => {
      result.current.setTextInput("أ".repeat(120));
      sessionStorage.setItem(
        "development_draft",
        JSON.stringify({ textInput: "draft", ts: Date.now() })
      );
    });

    await act(async () => {
      await result.current.handleCatalogSubmit();
    });

    expect(result.current.catalogResult).not.toBeNull();

    act(() => {
      result.current.clearAnalysisData();
    });

    expect(result.current.textInput).toBe("");
    expect(result.current.catalogResult).toBeNull();
    expect(sessionStorage.getItem("development_draft")).toBeNull();
  });
});
