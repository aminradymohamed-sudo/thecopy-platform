import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveBudgetToLocalStorage } from "../lib/budget-local-storage";

import { useBudgetRemoteState } from "./useBudgetRemoteState";

import type { BudgetPersistedState } from "../types";

const { loadRemoteAppState, persistRemoteAppState } = vi.hoisted(() => ({
  loadRemoteAppState: vi.fn(),
  persistRemoteAppState: vi.fn(),
}));

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState,
  persistRemoteAppState,
}));

const LOCAL_STATE: BudgetPersistedState = {
  title: "نسخة محلية",
  scenario: "سيناريو محلي",
  budget: null,
  analysis: null,
  meta: null,
  persistedAt: "2026-05-04T08:00:00.000Z",
};

const REMOTE_STATE: BudgetPersistedState = {
  title: "نسخة بعيدة",
  scenario: "سيناريو بعيد",
  budget: null,
  analysis: null,
  meta: null,
  persistedAt: "2026-05-04T09:00:00.000Z",
};

function mountBudgetRemoteState() {
  const setters = {
    setTitle: vi.fn(),
    setScenario: vi.fn(),
    setBudget: vi.fn(),
    setAnalysis: vi.fn(),
    setRuntimeMeta: vi.fn(),
  };

  const hook = renderHook(() => useBudgetRemoteState(setters));
  return { ...hook, setters };
}

describe("useBudgetRemoteState", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    localStorage.clear();
    loadRemoteAppState.mockResolvedValue(REMOTE_STATE);
    persistRemoteAppState.mockResolvedValue(REMOTE_STATE);
  });

  it("restores anonymous budget state from local storage without reading remote state", async () => {
    saveBudgetToLocalStorage(LOCAL_STATE);

    const { result, setters } = mountBudgetRemoteState();

    await waitFor(() => expect(result.current.restoringState).toBe(false));

    expect(loadRemoteAppState).not.toHaveBeenCalled();
    expect(setters.setTitle).toHaveBeenCalledWith("نسخة محلية");
    expect(setters.setScenario).toHaveBeenCalledWith("سيناريو محلي");
  });

  it("persists anonymous budget state locally without writing remote state", async () => {
    const { result } = mountBudgetRemoteState();
    await waitFor(() => expect(result.current.restoringState).toBe(false));

    await act(async () => {
      await result.current.persistBudgetState({
        title: "حفظ محلي",
        scenario: "نص محفوظ",
        budget: null,
        analysis: null,
        meta: null,
      });
    });

    expect(persistRemoteAppState).not.toHaveBeenCalled();
    expect(localStorage.getItem("the-copy__budget-studio")).toContain(
      "حفظ محلي"
    );
  });

  it("uses remote state only when the budget remote flag is enabled and no local state exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_BUDGET_REMOTE_STATE", "true");

    const { result, setters } = mountBudgetRemoteState();

    await waitFor(() => expect(result.current.restoringState).toBe(false));

    expect(loadRemoteAppState).toHaveBeenCalledWith("BUDGET");
    expect(setters.setTitle).toHaveBeenCalledWith("نسخة بعيدة");
    expect(setters.setScenario).toHaveBeenCalledWith("سيناريو بعيد");
  });
});
