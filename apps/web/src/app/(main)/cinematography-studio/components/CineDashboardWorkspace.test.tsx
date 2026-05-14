import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PHASE_CARD } from "./cine-studio-config";
import { CineDashboardWorkspace } from "./CineDashboardWorkspace";

vi.mock("./scene/SceneStudioPanel", () => ({
  SceneStudioPanel: () => <div>Scene Studio</div>,
}));

function renderWorkspace(activeView: "dashboard" | "phases" = "dashboard") {
  return render(
    <CineDashboardWorkspace
      activeView={activeView}
      visualMood="noir"
      moodLabel="نوير"
      currentPhaseData={DEFAULT_PHASE_CARD}
      availableToolsCount={4}
      currentTabValue="pre-production"
      onMoodChange={() => undefined}
      onViewChange={() => undefined}
      onToolClick={() => undefined}
      onPhaseClick={() => undefined}
      onTabChange={() => undefined}
      phaseContent={<div>محتوى المرحلة</div>}
    />
  );
}

describe("CineDashboardWorkspace", () => {
  it("keeps the full scene studio mounted on the dashboard", () => {
    renderWorkspace("dashboard");

    expect(screen.getByText("Scene Studio")).toBeInTheDocument();
  });

  it("keeps the full scene studio mounted while phases are open", () => {
    renderWorkspace("phases");

    expect(screen.getByText("Scene Studio")).toBeInTheDocument();
    expect(screen.getByText("محتوى المرحلة")).toBeInTheDocument();
  });

  it("exposes the visual mood selector with an accessible name", () => {
    renderWorkspace("dashboard");

    expect(
      screen.getByRole("combobox", {
        name: "اختيار المزاج البصري للمشروع",
      })
    ).toBeInTheDocument();
  });
});
