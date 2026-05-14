import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";
import StartScreen from "./components/StartScreen";
import NewPage from "./page";
import {
  downloadTechPackDocument,
  generateFullTechPack,
  isValidProjectYear,
  sanitizeTechPackFilename,
} from "./services/techPackService";

const geminiMocks = vi.hoisted(() => ({
  analyzeVideoContent: vi.fn(),
  transcribeAudio: vi.fn(),
}));

vi.mock("./services/geminiService", () => geminiMocks);

// Mock dynamic imports to return a simple component
vi.mock("next/dynamic", () => ({
  default: (_fn: unknown, _options: unknown) => {
    const Component = () => (
      <div data-testid="new-feature">New Feature Component</div>
    );
    Component.displayName = "NewFeature";
    return Component;
  },
}));

beforeEach(() => {
  localStorage.clear();
  geminiMocks.analyzeVideoContent.mockReset();
  geminiMocks.transcribeAudio.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("New Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<NewPage />);
    expect(container).toBeDefined();
  });

  it("renders the new feature component", () => {
    render(<NewPage />);
    const component = screen.getByTestId("new-feature");
    expect(component).toBeInTheDocument();
  });

  it("displays the correct component text", () => {
    render(<NewPage />);
    expect(screen.getByText("New Feature Component")).toBeInTheDocument();
  });
});

describe("StyleIST intake", () => {
  it("shows the reason the next phase is blocked on an empty step", () => {
    render(<StartScreen onComplete={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      /add era and atmosphere details/i
    );
  });

  it("persists and restores the design brief draft", async () => {
    const { unmount } = render(<StartScreen onComplete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/era & visual texture/i), {
      target: { value: "Cyberpunk noir" },
    });
    fireEvent.change(screen.getByLabelText(/atmosphere & lighting/i), {
      target: { value: "Rainy neon streets with hard shadows" },
    });

    await waitFor(() => {
      expect(localStorage.getItem("styleist.designBrief.v1")).toContain(
        "Cyberpunk noir"
      );
    });

    unmount();
    render(<StartScreen onComplete={vi.fn()} />);

    expect(screen.getByLabelText(/era & visual texture/i)).toHaveValue(
      "Cyberpunk noir"
    );
    expect(screen.getByLabelText(/atmosphere & lighting/i)).toHaveValue(
      "Rainy neon streets with hard shadows"
    );
  });

  it("rejects unsupported reference files before media analysis", async () => {
    const { container } = render(<StartScreen onComplete={vi.fn()} />);
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(["not media"], "malicious.exe", {
      type: "application/x-msdownload",
    });

    expect(input).not.toBeNull();
    fireEvent.change(input!, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(geminiMocks.analyzeVideoContent).not.toHaveBeenCalled();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      /only image and video references are supported/i
    );
  });
});

describe("StyleIST tech pack safeguards", () => {
  it("rejects invalid production years", () => {
    expect(isValidProjectYear(1888)).toBe(true);
    expect(isValidProjectYear(2100)).toBe(true);
    expect(isValidProjectYear(-1)).toBe(false);
    expect(isValidProjectYear(999999)).toBe(false);
    expect(isValidProjectYear(Number.NaN)).toBe(false);
  });

  it("sanitizes export filenames", () => {
    const filename = sanitizeTechPackFilename("../malicious.exe");

    expect(filename).toMatch(/\.html$/);
    expect(filename).not.toContain("..");
    expect(filename).not.toContain("/");
    expect(filename).not.toContain("\\");
    expect(filename).not.toContain(".exe");
  });

  it("creates a real downloadable tech pack document", () => {
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:styleist-tech-pack");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {
        /* noop */
      });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {
        /* noop */
      });

    downloadTechPackDocument({
      techPack: generateFullTechPack("silk", "coat", 2024, "black"),
      fabricName: "silk",
      projectName: "../malicious.exe",
    });

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:styleist-tech-pack");
  });
});
