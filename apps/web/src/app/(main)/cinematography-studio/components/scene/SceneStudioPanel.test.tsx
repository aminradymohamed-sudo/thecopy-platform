import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultCineScene } from "../../lib/scene-session";

import { SceneStudioPanel } from "./SceneStudioPanel";

const storageKey = "cinematography-studio.draft.v3";
const legacyStorageKey = "cinematography-studio.session.v2";
const legacyStorageKeys = [
  "cinematography-studio.session.v2",
  "cinematography-studio.session.v1",
];

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("SceneStudioPanel", () => {
  it("blocks saving when the scene description is too short", async () => {
    const user = userEvent.setup();
    render(<SceneStudioPanel />);

    await user.clear(screen.getByLabelText("وصف المشهد"));
    await user.click(screen.getByRole("button", { name: "حفظ تصميم التصوير" }));

    expect(
      screen.getByText("أدخل وصف مشهد لا يقل عن 10 أحرف قبل الحفظ.")
    ).toBeInTheDocument();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("blocks saving a scene without a usable description", async () => {
    const user = userEvent.setup();
    render(<SceneStudioPanel />);

    await user.clear(screen.getByLabelText("وصف المشهد"));
    await user.type(screen.getByLabelText("وصف المشهد"), "قصير");
    await user.click(screen.getByRole("button", { name: "حفظ تصميم التصوير" }));

    expect(
      await screen.findByText("أدخل وصف مشهد لا يقل عن 10 أحرف قبل الحفظ.")
    ).toBeInTheDocument();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("creates, edits, saves, and restores a cinematography scene", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<SceneStudioPanel />);

    await user.clear(screen.getByLabelText("اسم المشهد"));
    await user.type(screen.getByLabelText("اسم المشهد"), "مشهد اختبار الإضاءة");
    await user.clear(screen.getByLabelText("وصف المشهد"));
    await user.type(
      screen.getByLabelText("وصف المشهد"),
      "لقطة داخلية بضوء رئيسي حاد وحافة خلفية دافئة."
    );
    await user.click(screen.getByRole("button", { name: "إضافة مصدر ضوء" }));
    await user.click(screen.getByRole("button", { name: "حفظ تصميم التصوير" }));

    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as {
      scene?: { name?: string; description?: string; lights?: unknown[] };
    };
    expect(stored.scene?.name).toBe("مشهد اختبار الإضاءة");
    expect(stored.scene?.description).toContain("لقطة داخلية");
    expect(stored.scene?.lights).toHaveLength(4);
    for (const legacyKey of legacyStorageKeys) {
      expect(localStorage.getItem(legacyKey)).toBeNull();
    }

    unmount();
    render(<SceneStudioPanel />);

    expect(screen.getByDisplayValue("مشهد اختبار الإضاءة")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/لقطة داخلية/)).toBeInTheDocument();
    expect(screen.getAllByTestId("cine-light-row")).toHaveLength(4);
  });

  it("migrates old scene storage keys into the new draft key", () => {
    const scene = createDefaultCineScene("2026-05-04T00:00:00.000Z");
    localStorage.setItem(
      legacyStorageKey,
      JSON.stringify({
        version: 2,
        savedAt: "2026-05-04T00:00:00.000Z",
        scene: {
          ...scene,
          name: "مشهد قديم",
        },
      })
    );

    render(<SceneStudioPanel />);

    expect(screen.getByDisplayValue("مشهد قديم")).toBeInTheDocument();
    expect(localStorage.getItem(storageKey)).toContain("مشهد قديم");
    expect(localStorage.getItem(legacyStorageKey)).toBeNull();
  });

  it("migrates old scene storage keys once without keeping session-named keys", () => {
    const legacyScene = {
      scene: {
        ...createDefaultCineScene("2026-05-04T00:00:00.000Z"),
        name: "مشهد محفوظ قديم",
      },
      savedAt: "2026-05-04T00:00:00.000Z",
      version: 2,
    };
    localStorage.setItem(
      "cinematography-studio.session.v2",
      JSON.stringify(legacyScene)
    );

    render(<SceneStudioPanel />);

    expect(screen.getByDisplayValue("مشهد محفوظ قديم")).toBeInTheDocument();
    expect(localStorage.getItem(storageKey)).toContain("مشهد محفوظ قديم");
    for (const legacyKey of legacyStorageKeys) {
      expect(localStorage.getItem(legacyKey)).toBeNull();
    }
  });

  it("updates the preview metrics when light, camera, and lens controls change", async () => {
    const user = userEvent.setup();
    render(<SceneStudioPanel />);

    const preview = screen.getByTestId("cine-scene-preview");
    expect(within(preview).getByText("إضاءة رئيسية 65%")).toBeInTheDocument();
    expect(within(preview).getByText("35mm")).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("حزمة العدسة"),
      "anamorphic"
    );
    fireEvent.change(screen.getByLabelText("شدة الضوء الرئيسي"), {
      target: { value: "82" },
    });
    fireEvent.change(screen.getByLabelText("البعد البؤري"), {
      target: { value: "65" },
    });

    expect(within(preview).getByText("إضاءة رئيسية 82%")).toBeInTheDocument();
    expect(within(preview).getByText("65mm")).toBeInTheDocument();
    expect(within(preview).getByText("Anamorphic")).toBeInTheDocument();
  });

  it("exports a safe JSON file and copies a full share link", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWrite },
    });

    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:cinematography-export");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    const anchor = document.createElement("a");
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName.toLowerCase() === "a") {
        return anchor;
      }
      return originalCreateElement(tagName);
    });

    render(<SceneStudioPanel />);
    await user.clear(screen.getByLabelText("اسم المشهد"));
    await user.type(
      screen.getByLabelText("اسم المشهد"),
      "../Export:Scene?.json"
    );
    await user.click(
      screen.getByRole("button", { name: "تصدير إعدادات التصوير" })
    );

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:cinematography-export");
    expect(anchor.download).toBe("Export Scene.json");

    await user.click(screen.getByRole("button", { name: "إنشاء رابط مشاركة" }));

    const shareLink = screen.getByTestId("cine-share-link");
    expect(shareLink).toHaveTextContent("/cinematography-studio?share=");
    await waitFor(() =>
      expect(clipboardWrite).toHaveBeenCalledWith(
        expect.stringMatching(
          /^http:\/\/localhost:3000\/cinematography-studio\?share=/
        )
      )
    );
    expect(clipboardWrite.mock.calls[0]?.[0]).not.toMatch(
      /token|session|auth/i
    );
  });

  it("exports a JSON file and builds a share link from the saved scene", async () => {
    const user = userEvent.setup();
    const createObjectUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:cinematography-export");
    const revokeObjectUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<SceneStudioPanel />);
    await user.clear(screen.getByLabelText("اسم المشهد"));
    await user.type(screen.getByLabelText("اسم المشهد"), "Export Scene");
    await user.click(screen.getByRole("button", { name: "حفظ تصميم التصوير" }));
    await user.click(
      screen.getByRole("button", { name: "تصدير إعدادات التصوير" })
    );

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:cinematography-export");

    await user.click(screen.getByRole("button", { name: "إنشاء رابط مشاركة" }));

    const shareLink = screen.getByTestId("cine-share-link");
    expect(shareLink).toHaveTextContent("/cinematography-studio?share=");
    expect(localStorage.getItem(storageKey)).toContain("Export Scene");
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]?.[0]).toContain(
      "/cinematography-studio?share="
    );
    expect(writeText.mock.calls[0]?.[0]).not.toMatch(/token|session/i);
    expect(shareLink.textContent).not.toMatch(/token|session/i);
  });

  it("shows a clear fallback when WebGL is not available", () => {
    render(<SceneStudioPanel forceWebGLUnavailable />);

    expect(
      screen.getByText("العرض ثلاثي الأبعاد غير متاح في هذه الجلسة")
    ).toBeInTheDocument();
    expect(
      screen.getByText("تستطيع متابعة تعديل الإضاءة والكاميرا والحفظ.")
    ).toBeInTheDocument();
  });
});
