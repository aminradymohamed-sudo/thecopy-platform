// @vitest-environment jsdom

import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadRemoteAppState =
  vi.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPersistRemoteAppState =
  vi.fn<(...args: unknown[]) => Promise<unknown>>();

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

import { mountHook } from "./test-helpers";

describe("development remote app persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockLoadRemoteAppState.mockResolvedValue(null);
    mockPersistRemoteAppState.mockResolvedValue(undefined);
  });

  it("does not restore a remote development draft for an anonymous browser context", async () => {
    mockLoadRemoteAppState.mockImplementation((appId) =>
      Promise.resolve(
        appId === "development"
          ? {
              textInput: "remote script draft",
              analysisReport: "remote analysis report",
              specialRequirements: "remote requirements",
              additionalInfo: "remote notes",
              ts: Date.now(),
            }
          : null
      )
    );

    let mounted: Awaited<ReturnType<typeof mountHook>> | null = null;
    await act(async () => {
      mounted = await mountHook();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const { result } = mounted!;

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.textInput).toBe("");
    expect(mockLoadRemoteAppState).not.toHaveBeenCalledWith("development");
  });

  it("restores a remote development draft only for the explicit browser owner", async () => {
    sessionStorage.setItem("development_draft_owner", "browser-a");
    mockLoadRemoteAppState.mockImplementation((appId) =>
      Promise.resolve(
        appId === "development"
          ? {
              textInput: "remote script draft",
              analysisReport: "remote analysis report",
              specialRequirements: "remote requirements",
              additionalInfo: "remote notes",
              ownerId: "browser-a",
              ts: Date.now(),
            }
          : null
      )
    );

    let mounted: Awaited<ReturnType<typeof mountHook>> | null = null;
    await act(async () => {
      mounted = await mountHook();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const { result } = mounted!;

    await waitFor(() => {
      expect(result.current.textInput).toBe("remote script draft");
    });
    expect(result.current.analysisReport).toBe("remote analysis report");
    expect(result.current.specialRequirements).toBe("remote requirements");
    expect(result.current.additionalInfo).toBe("remote notes");
    expect(mockLoadRemoteAppState).toHaveBeenCalledWith("development");
  });

  it("keeps anonymous draft persistence local to session storage", async () => {
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("new script draft");
      result.current.setAnalysisReport("new analysis report");
      result.current.setSpecialRequirements("new requirements");
      result.current.setAdditionalInfo("new notes");
    });

    await waitFor(() => {
      const raw = sessionStorage.getItem("development_draft");
      expect(raw).toContain("new script draft");
    });

    expect(mockPersistRemoteAppState).not.toHaveBeenCalledWith(
      "development",
      expect.anything()
    );
  });

  it("persists development draft changes remotely only with an explicit owner", async () => {
    sessionStorage.setItem("development_draft_owner", "browser-a");
    const { result } = await mountHook();

    act(() => {
      result.current.setTextInput("new script draft");
      result.current.setAnalysisReport("new analysis report");
      result.current.setSpecialRequirements("new requirements");
      result.current.setAdditionalInfo("new notes");
    });

    await waitFor(() => {
      expect(mockPersistRemoteAppState).toHaveBeenCalledWith(
        "development",
        expect.objectContaining({
          textInput: "new script draft",
          analysisReport: "new analysis report",
          specialRequirements: "new requirements",
          additionalInfo: "new notes",
          ownerId: "browser-a",
        })
      );
    });
  });
});
