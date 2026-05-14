// @vitest-environment jsdom

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import FileUpload from "@/components/file-upload";

import { mountHook } from "./test-helpers";

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

describe("development page repaired flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockFetch.mockReset();
    mockLoadRemoteAppState.mockResolvedValue(null);
    mockPersistRemoteAppState.mockResolvedValue(undefined);
  });

  it("selects the default catalog task when direct text reaches the threshold", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(120));
    });

    await waitFor(() => {
      expect(result.current.selectedCatalogTaskId).toBe("completion");
    });
  });

  it("blocks short catalog submit without a request and shows a visible status", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("قصير");
    });

    await act(async () => {
      await result.current.handleCatalogSubmit();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.statusMessage).toContain("100 حرف");
    expect(result.current.error).toContain("100 حرف");
  });

  it("clears text, result state, and browser draft storage", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("أ".repeat(120));
      sessionStorage.setItem(
        "development_draft",
        JSON.stringify({ textInput: "أ".repeat(120), ts: Date.now() })
      );
      sessionStorage.setItem("originalText", "أ".repeat(120));
      result.current.clearAnalysisData();
    });

    expect(sessionStorage.getItem("development_draft")).toBeNull();
    expect(sessionStorage.getItem("originalText")).toBeNull();
    expect(result.current.textInput).toBe("");
    expect(result.current.catalogResult).toBeNull();
    expect(result.current.aiResponse).toBeNull();
  });

  it("keeps anonymous drafts in session storage without remote persistence", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("anonymous local draft");
    });

    await waitFor(() => {
      expect(sessionStorage.getItem("development_draft")).toContain(
        "anonymous local draft"
      );
    });

    expect(mockPersistRemoteAppState).not.toHaveBeenCalledWith(
      "development",
      expect.anything()
    );
  });

  it("rejects unsupported files with an inline measurable message", () => {
    const onFileContent = vi.fn();
    const onUploadError = vi.fn();

    render(
      React.createElement(FileUpload, {
        onFileContent,
        onUploadError,
      })
    );

    const input = document.getElementById("file-upload") as HTMLInputElement;
    const unsupportedFile = new File(["bad"], "payload.exe", {
      type: "application/x-msdownload",
    });

    fireEvent.change(input, {
      target: { files: [unsupportedFile] },
    });

    expect(onFileContent).not.toHaveBeenCalled();
    expect(onUploadError).toHaveBeenCalledWith(
      expect.stringContaining("غير مدعوم")
    );
    expect(screen.getByRole("alert").textContent).toContain("غير مدعوم");
  });
});
