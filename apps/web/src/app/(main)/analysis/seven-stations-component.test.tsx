import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { initialState, type MachineState } from "./lib/state-machine";
import SevenStationsComponent from "./seven-stations-component";

import type { StationState } from "./lib/types";

interface MockMachine {
  state: MachineState;
  progress: number;
  isRunning: boolean;
  allCompleted: boolean;
  start: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
  retryStation: ReturnType<typeof vi.fn>;
  exportAs: ReturnType<typeof vi.fn>;
}

const controls = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
  machine: null as MockMachine | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: controls.push,
    replace: controls.replace,
  }),
  useSearchParams: () => controls.searchParams,
}));

vi.mock("./hooks/useAnalysisMachine", () => ({
  useAnalysisMachine: () => controls.machine,
}));

function buildMachine(
  state: Partial<MachineState> = {},
  machine: Partial<Omit<MockMachine, "state">> = {}
): MockMachine {
  const mergedState = { ...initialState, ...state };
  return {
    state: mergedState,
    progress: 0,
    isRunning: false,
    allCompleted: false,
    start: vi.fn(),
    reset: vi.fn(),
    retryStation: vi.fn(),
    exportAs: vi.fn(),
    ...machine,
  };
}

function completedStations(): StationState[] {
  return initialState.stations.map((station) => ({
    ...station,
    status: "completed" as const,
    output: { summary: `station-${station.id}` },
  }));
}

describe("SevenStationsComponent", () => {
  beforeEach(() => {
    controls.push.mockReset();
    controls.replace.mockReset();
    controls.searchParams = new URLSearchParams();
    controls.machine = buildMachine();
    window.history.replaceState({}, "", "/analysis");
  });

  it("resets text and removes the analysis id from the route", () => {
    controls.searchParams = new URLSearchParams("analysis=analysis-1");
    window.history.replaceState({}, "", "/analysis?analysis=analysis-1");
    const machine = buildMachine();
    controls.machine = machine;

    render(<SevenStationsComponent />);

    const textarea = screen.getByPlaceholderText(
      "ألصق النص الدرامي هنا لبدء التحليل ..."
    );
    fireEvent.change(textarea, { target: { value: "نص للاختبار" } });
    fireEvent.click(screen.getByRole("button", { name: /إعادة تعيين/ }));

    expect(machine.reset).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("");
    expect(controls.replace).toHaveBeenCalledWith("/analysis", {
      scroll: false,
    });
  });

  it("does not render export actions when analysis failed before completion", () => {
    controls.machine = buildMachine({
      analysisId: "analysis-1",
      status: "failed",
      fatalError: "خدمة التحليل غير متاحة الآن",
      capabilities: { exports: ["json", "docx"] },
    });

    render(<SevenStationsComponent />);

    expect(
      screen.queryByRole("button", { name: /تصدير/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("لا توجد نتائج مكتملة قابلة للتصدير بعد.")
    ).toBeInTheDocument();
  });

  it("renders seven clickable station tabs before analysis starts", () => {
    render(<SevenStationsComponent />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(7);
    expect(
      screen.getByRole("tab", { name: /التحليل المتقدم للحوار/ })
    ).toBeInTheDocument();
  });

  it("switches the selected station from the station tabs", () => {
    render(<SevenStationsComponent />);

    fireEvent.click(
      screen.getByRole("tab", { name: /التحليل المتقدم للحوار/ })
    );

    expect(screen.getByText("المحطة المختارة")).toBeInTheDocument();
    expect(
      screen.getByRole("tabpanel", { name: /التحليل المتقدم للحوار/ })
    ).toBeInTheDocument();
  });

  it("shows a validation alert when starting without text", () => {
    const machine = buildMachine();
    controls.machine = machine;

    render(<SevenStationsComponent />);

    fireEvent.click(screen.getByRole("button", { name: "ابدأ التحليل" }));

    expect(machine.start).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "ألصق نصًا دراميًا قبل بدء التحليل."
    );
  });

  it("starts analysis with the current textarea value", () => {
    const machine = buildMachine();
    controls.machine = machine;

    render(<SevenStationsComponent />);

    fireEvent.change(
      screen.getByPlaceholderText("ألصق النص الدرامي هنا لبدء التحليل ..."),
      { target: { value: "نص درامي طويل للتحليل" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "ابدأ التحليل" }));

    expect(machine.start).toHaveBeenCalledWith({
      text: "نص درامي طويل للتحليل",
    });
  });

  it("renders completed export controls and dispatches the requested format", () => {
    const machine = buildMachine(
      {
        analysisId: "analysis-1",
        status: "completed",
        stations: completedStations(),
        finalReport: "تقرير مكتمل",
        capabilities: { exports: ["json", "docx"] },
      },
      { allCompleted: true }
    );
    controls.machine = machine;

    render(<SevenStationsComponent />);

    fireEvent.click(screen.getByRole("button", { name: "تصدير JSON" }));

    expect(machine.exportAs).toHaveBeenCalledWith("json");
  });
});
