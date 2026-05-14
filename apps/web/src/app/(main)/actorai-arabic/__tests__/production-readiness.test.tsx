import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useApp } from "../context/AppContext";
import { StudioView } from "../features/demo";
import {
  APP_LEGACY_STORAGE_KEY,
  APP_PREFERENCES_STORAGE_KEY,
  APP_STORAGE_KEY,
} from "../lib/storage";
import {
  fireEvent,
  renderWithApp,
  screen,
  userEvent,
  waitFor,
} from "../test-utils";

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: vi.fn().mockResolvedValue(null),
  persistRemoteAppState: vi.fn().mockResolvedValue(undefined),
}));

function TestHarness() {
  const { currentView, theme, user, navigate, toggleTheme, handleRegister } =
    useApp();

  return (
    <div>
      <span data-testid="view">{currentView}</span>
      <span data-testid="theme">{theme}</span>
      <span data-testid="user">{user?.name ?? "guest"}</span>
      <button onClick={() => navigate("rhythm")}>goto-rhythm</button>
      <button onClick={toggleTheme}>toggle-theme</button>
      <button
        onClick={() =>
          handleRegister("سارة علي", "sara@example.com", "StrongPass123")
        }
      >
        register
      </button>
    </div>
  );
}

describe("جاهزية الإنتاج - حالة التطبيق", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, "", "/actorai-arabic");
    window.scrollTo = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: { response: "تحليل من الخادم" },
          }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("يعرض الاستوديو افتراضياً ويقبل العرض التعريفي عند طلبه صراحة", async () => {
    const { unmount } = renderWithApp(<TestHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("view")).toHaveTextContent("studio");
    });

    unmount();
    window.history.replaceState({}, "", "/actorai-arabic?view=home");

    renderWithApp(<TestHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("view")).toHaveTextContent("home");
    });
  });

  it("يفتح الاستوديو افتراضيًا من الرابط الأساسي", () => {
    renderWithApp(<TestHarness />);

    expect(screen.getByTestId("view")).toHaveTextContent("studio");
  });

  it("يقرأ العرض الحالي من عنوان الصفحة ثم يثبته عند التنقل", async () => {
    window.history.replaceState({}, "", "/actorai-arabic?view=webcam");

    renderWithApp(<TestHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("view")).toHaveTextContent("webcam");
    });

    fireEvent.click(screen.getByText("goto-rhythm"));

    await waitFor(() => {
      expect(screen.getByTestId("view")).toHaveTextContent("rhythm");
    });
    expect(new URLSearchParams(window.location.search).get("view")).toBe(
      "rhythm"
    );

    const stored = JSON.parse(
      localStorage.getItem(APP_PREFERENCES_STORAGE_KEY) ?? "{}"
    ) as { currentView?: string; user?: unknown };

    expect(stored.currentView).toBe("rhythm");
    expect(stored).not.toHaveProperty("user");
    expect(localStorage.getItem(APP_LEGACY_STORAGE_KEY)).toBeNull();
  });

  it("يحفظ السمة والعرض فقط ولا يخزن المستخدم أو النصوص أو التسجيلات", async () => {
    const { unmount } = renderWithApp(<TestHarness />);

    fireEvent.click(screen.getByText("toggle-theme"));
    fireEvent.click(screen.getByText("register"));

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("user")).toHaveTextContent("سارة علي");
    });

    const stored = JSON.parse(
      localStorage.getItem(APP_PREFERENCES_STORAGE_KEY) ?? "{}"
    ) as Record<string, unknown>;

    expect(APP_STORAGE_KEY).toBe("actorai-arabic.preferences.v1");
    expect(stored).toMatchObject({ currentView: "dashboard", theme: "dark" });
    expect(stored).not.toHaveProperty("user");
    expect(stored).not.toHaveProperty("scripts");
    expect(stored).not.toHaveProperty("recordings");
    expect(localStorage.getItem(APP_LEGACY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("sentryReplaySession")).toBeNull();
    expect(sessionStorage.getItem("sentryReplaySession")).toBeNull();

    unmount();

    renderWithApp(<TestHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("user")).toHaveTextContent("guest");
    });
  });

  it("يعرض هوية الاستوديو والمدخل والزر ورسالة الإدخال الفارغ", async () => {
    renderWithApp(<StudioView />);

    expect(
      screen.getByRole("heading", { name: /استوديو الممثل العربي/ })
    ).toBeInTheDocument();

    const input = screen.getByLabelText("النص أو المشهد");
    expect(input).toHaveAttribute(
      "placeholder",
      "الصق مشهدًا عربيًا أو وصف شخصية هنا"
    );

    const action = screen.getByRole("button", { name: /حلل الأداء/ });
    expect(action).toHaveClass("text-white");
    expect(action).not.toBeDisabled();

    fireEvent.click(action);

    expect(
      await screen.findByText("أدخل مشهدًا عربيًا أولًا")
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("يعرض الاستوديو التفاعلي من الرابط الأساسي مع رسالة تحقق فارغة", async () => {
    renderWithApp(<StudioView />);

    expect(
      await screen.findByRole("heading", { name: /استوديو الممثل العربي/ })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("النص أو المشهد")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("الصق مشهدًا عربيًا أو وصف شخصية هنا")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "حلل الأداء" }));

    expect(
      await screen.findByText("أدخل مشهدًا عربيًا أولًا")
    ).toBeInTheDocument();
  });

  it("يحافظ على قيمة مدخل التحليل عند تبديل التبويبات", async () => {
    const user = userEvent.setup();
    renderWithApp(<StudioView />);

    const input = screen.getByLabelText("النص أو المشهد");
    await user.type(input, "مشهد عربي طويل للاختبار");

    await user.click(screen.getByRole("tab", { name: /شريك المشهد/ }));
    await user.click(screen.getByRole("tab", { name: /تسجيل الأداء/ }));
    await user.click(screen.getByRole("tab", { name: /تحليل النص/ }));

    expect(screen.getByLabelText("النص أو المشهد")).toHaveValue(
      "مشهد عربي طويل للاختبار"
    );
  });

  it("يبقي نص المشهد عند التبديل بين تبويبات الاستوديو", async () => {
    renderWithApp(<StudioView />);

    const scriptInput = await screen.findByLabelText("النص أو المشهد");
    await userEvent.type(scriptInput, "مشهد عربي قصير للتدريب");
    await userEvent.click(screen.getByRole("tab", { name: "شريك المشهد" }));
    await userEvent.click(screen.getByRole("tab", { name: "تحليل النص" }));

    expect(screen.getByLabelText("النص أو المشهد")).toHaveValue(
      "مشهد عربي قصير للتدريب"
    );
  });

  it("يعطي نتيجة محلية عند فشل خادم التحليل دون تجمد", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const user = userEvent.setup();
    renderWithApp(<StudioView />);

    await user.type(
      screen.getByLabelText("النص أو المشهد"),
      "أريد مواجهة صامتة في مشهد عائلي"
    );

    await user.click(screen.getByRole("button", { name: /حلل الأداء/ }));

    await waitFor(() => {
      expect(screen.getByText(/تحليل أداء مبدئي/)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /حلل الأداء/ })
    ).not.toBeDisabled();
    expect(localStorage.getItem(APP_LEGACY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("sentryReplaySession")).toBeNull();
  });

  it("يعرض نتيجة منطقية عند بطء خادم التحليل", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("server unavailable"))
    );

    renderWithApp(<StudioView />);

    await userEvent.type(
      await screen.findByLabelText("النص أو المشهد"),
      "مشهد عربي يحتاج تحليلًا سريعًا"
    );
    await userEvent.click(screen.getByRole("button", { name: "حلل الأداء" }));

    expect(await screen.findByText(/تحليل أداء مبدئي/)).toBeInTheDocument();
  });

  it("يستخدم ألوان أزرار عالية التباين في أزرار الدعوة الرئيسية", async () => {
    renderWithApp(<StudioView />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "حلل الأداء" })).toHaveClass(
        "text-white"
      );
    });
  });
});
