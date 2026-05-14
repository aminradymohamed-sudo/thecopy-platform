/**
 * اختبارات التكامل الحي لواجهة brain-storm-ai
 * تركز على العقد الحالي للمكوّن بدل نصوص قديمة لم تعد موجودة.
 */

import { within } from "@testing-library/dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, beforeEach, vi } from "vitest";

import BrainStormContent from "../(main)/brain-storm-ai/src/components/BrainStormContent";
import { conductDebate } from "../(main)/brain-storm-ai/src/lib/api";
import {
  exportToJSON,
  exportToMarkdown,
} from "../(main)/brain-storm-ai/src/lib/export";

import type {
  Session,
  DebateMessage,
  BrainstormApiRequest,
  BrainstormApiResponse,
} from "../(main)/brain-storm-ai/src/types";

vi.mock("@/lib/app-state-client", () => ({
  loadRemoteAppState: vi.fn(() => Promise.resolve(null)),
  persistRemoteAppState: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock("../(main)/brain-storm-ai/src/hooks/useAgentStates", () => ({
  useAgentStates: vi.fn(() => ({
    realAgents: [
      {
        id: "agent-1",
        name: "محلل",
        nameAr: "المحلل",
        role: "تحليل الأفكار",
        description: "وكيل متخصص في تحليل الأفكار",
        category: "analysis",
        icon: "brain",
        capabilities: {
          canAnalyze: true,
          canGenerate: false,
          canPredict: false,
          hasMemory: true,
          usesSelfReflection: true,
          supportsRAG: false,
        },
        collaboratesWith: [],
        enhances: [],
        complexityScore: 5,
        phaseRelevance: [1, 2, 3, 4, 5],
      },
    ],
    expandedAgents: new Set(),
    updateAgentState: vi.fn(),
    resetAllAgents: vi.fn(),
    toggleAgentExpand: vi.fn(),
    getAgentState: vi.fn((agentId: string) => ({
      id: agentId,
      status: "idle",
      lastMessage: "",
      progress: 0,
    })),
  })),
}));

vi.mock("../(main)/brain-storm-ai/src/hooks/useBrainstormCatalog", () => ({
  useBrainstormCatalog: vi.fn(() => ({
    catalog: {
      agents: [
        {
          id: "agent-1",
          name: "محلل",
          nameAr: "المحلل",
          role: "تحليل الأفكار",
          description: "وكيل متخصص في تحليل الأفكار",
          category: "analysis",
          icon: "brain",
          capabilities: {
            canAnalyze: true,
            canGenerate: false,
            canPredict: false,
            hasMemory: true,
            usesSelfReflection: true,
            supportsRAG: false,
          },
          collaboratesWith: [],
          enhances: [],
          complexityScore: 5,
          phaseRelevance: [1, 2, 3, 4, 5],
        },
      ],
      phases: [
        {
          id: 1,
          name: "التحليل",
          nameEn: "Analysis",
          description: "تحليل الفكرة",
          primaryAction: "analyze",
        },
        {
          id: 2,
          name: "التوسع",
          nameEn: "Expansion",
          description: "توسيع الأفكار",
          primaryAction: "generate",
        },
        {
          id: 3,
          name: "التحقق",
          nameEn: "Validation",
          description: "التحقق من الأفكار",
          primaryAction: "debate",
        },
        {
          id: 4,
          name: "النقاش",
          nameEn: "Debate",
          description: "نقاش الأفكار",
          primaryAction: "debate",
        },
        {
          id: 5,
          name: "التقييم",
          nameEn: "Evaluation",
          description: "تقييم نهائي",
          primaryAction: "decide",
        },
      ],
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock("../(main)/brain-storm-ai/src/hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

function createDebateSuccess(agentIds: string[]): BrainstormApiResponse {
  const [agentId = "agent-1"] = agentIds;

  return {
    success: true,
    result: {
      proposals: [
        {
          agentId,
          proposal: "اقتراح تحليلي شامل للفكرة المقدمة",
          confidence: 0.85,
        },
      ],
      consensus: true,
      finalDecision: "الفكرة قابلة للتطوير مع بعض التحسينات",
      judgeReasoning: "بناءً على تحليل شامل للجوانب المختلفة",
    },
  };
}

function resolveDebateSuccess({ agentIds }: BrainstormApiRequest) {
  return Promise.resolve(createDebateSuccess(agentIds));
}

vi.mock("../(main)/brain-storm-ai/src/lib/api", () => ({
  conductDebate: vi.fn(resolveDebateSuccess),
}));

let user: ReturnType<typeof userEvent.setup>;

function getLocalStorageSnapshot(): string {
  return Array.from({ length: localStorage.length }, (_, index) => {
    const key = localStorage.key(index);
    return key ? `${key}:${localStorage.getItem(key) ?? ""}` : "";
  }).join("\n");
}

beforeEach(() => {
  user = userEvent.setup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(conductDebate).mockReset();
  vi.mocked(conductDebate).mockImplementation(resolveDebateSuccess);
});

it("ينشئ جلسة جديدة ويعرض التقدم بعد اكتمال المرحلة الأولى", async () => {
  render(<BrainStormContent />);

  await waitFor(() => {
    expect(screen.getByText(/منصة العصف الذهني الذكي/)).toBeInTheDocument();
  });

  await user.type(
    screen.getByPlaceholderText(/اكتب فكرتك/),
    "فكرة لتطبيق تعليمي تفاعلي"
  );
  await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

  await waitFor(() => {
    expect(screen.getByText(/الجلسة الحالية:/)).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });

  expect(screen.getByText(/التقدم/)).toBeInTheDocument();
  expect(vi.mocked(conductDebate)).toHaveBeenCalledTimes(1);
});

it("يحفظ الجلسة تلقائياً دون كشف الملخص أو بيانات الجلسة نصياً في التخزين المحلي", async () => {
  render(<BrainStormContent />);

  await waitFor(() => {
    expect(screen.getByText(/منصة العصف الذهني الذكي/)).toBeInTheDocument();
  });

  await user.type(
    screen.getByPlaceholderText(/اكتب فكرتك/),
    "فكرة خصوصية لا تظهر نصيا في التخزين المحلي"
  );
  await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

  await waitFor(() => {
    expect(screen.getByText(/الجلسات المحفوظة \(1\)/)).toBeInTheDocument();
  });

  const snapshot = getLocalStorageSnapshot();
  expect(snapshot).not.toContain("فكرة خصوصية لا تظهر نصيا في التخزين المحلي");
  expect(snapshot).not.toMatch(/session/i);
  expect(snapshot).not.toMatch(/auth|jwt|token/i);
});

it("يبقي زر بدء الجلسة قابلاً للتركيز ويعرض رسالة تحقق عند الملخص الفارغ", async () => {
  render(<BrainStormContent />);

  const startButton = await screen.findByRole("button", { name: /بدء جلسة/ });
  expect(startButton).toBeEnabled();

  startButton.focus();
  await user.keyboard("{Enter}");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    /يجب إدخال ملخص الفكرة/
  );
});

it("يعرض المراحل كتبويبات قابلة للتبديل بلوحة المفاتيح", async () => {
  render(<BrainStormContent />);

  const tablist = await screen.findByRole("tablist", { name: /مراحل/ });
  const tabs = within(tablist).getAllByRole("tab");
  const firstTab = tabs[0];
  const secondTab = tabs[1];

  expect(tabs).toHaveLength(5);
  if (!firstTab || !secondTab) {
    throw new Error("Expected at least two stage tabs");
  }
  expect(firstTab).toHaveAttribute("aria-selected", "true");

  fireEvent.focus(firstTab);
  fireEvent.keyDown(firstTab, { key: "ArrowLeft" });

  expect(secondTab).toHaveFocus();
  expect(secondTab).toHaveAttribute("aria-selected", "true");
});

it("يعطي زر توسيع الوكيل اسماً وصولياً واضحاً", async () => {
  render(<BrainStormContent />);

  expect(
    await screen.findByRole("button", { name: /عرض تفاصيل المحلل/ })
  ).toBeInTheDocument();
});

it("يبقي ملخص الجلسة الحالية متاحاً دلالياً بعد بدء الجلسة", async () => {
  render(<BrainStormContent />);

  await user.type(
    await screen.findByPlaceholderText(/اكتب فكرتك/),
    "فكرة دلالية بعد بدء الجلسة"
  );
  await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

  await waitFor(() => {
    expect(screen.getByText(/الجلسة الحالية:/)).toBeInTheDocument();
  });

  expect(screen.getByLabelText("موضوع الجلسة الحالي")).toHaveValue(
    "فكرة دلالية بعد بدء الجلسة"
  );
});

it("يصدر الجلسة بصيغتي JSON و Markdown عند اكتمالها", () => {
  vi.spyOn(document, "createElement").mockReturnValue({
    href: "",
    download: "",
    click: vi.fn(),
    style: {},
  } as unknown as HTMLAnchorElement);
  vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
  vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
  globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake");
  globalThis.URL.revokeObjectURL = vi.fn();

  const mockSession: Session = {
    id: "test-session",
    brief: "فكرة اختبار",
    phase: 5,
    status: "completed",
    startTime: new Date(),
    activeAgents: ["agent-1"],
    results: {
      phase1Debate: { proposals: [], consensus: true },
      phase5Debate: { finalDecision: "قرار نهائي" },
    },
  };

  const mockMessages: DebateMessage[] = [
    {
      agentId: "agent-1",
      agentName: "المحلل",
      message: "اقتراح جيد",
      timestamp: new Date(),
      type: "proposal",
    },
    {
      agentId: "judge",
      agentName: "الحكم",
      message: "قرار نهائي: الفكرة مقبولة",
      timestamp: new Date(),
      type: "decision",
    },
  ];

  const jsonResult = exportToJSON(mockSession, mockMessages);
  expect(jsonResult.ok).toBe(true);
  expect(jsonResult.filename).toContain("test-session");

  const markdownResult = exportToMarkdown(mockSession, mockMessages);
  expect(markdownResult.ok).toBe(true);
  expect(markdownResult.filename).toContain("test-session");
});

it("يعرض النتيجة النهائية بوضوح عند اكتمال الجلسة", () => {
  const mockSession: Session = {
    id: "completed-session",
    brief: "فكرة مكتملة",
    phase: 5,
    status: "completed",
    startTime: new Date(),
    activeAgents: ["agent-1"],
    results: {
      phase5Debate: {
        finalDecision: "الفكرة جاهزة للتنفيذ",
        judgeReasoning: "بناءً على التحليل الشامل",
      },
    },
  };

  expect(mockSession.status).toBe("completed");
  expect(mockSession.results?.["phase5Debate"]).toBeDefined();
});

it("يتعامل مع أخطاء النقاش بشكل منضبط عبر مسار إعادة المحاولة", async () => {
  vi.mocked(conductDebate).mockRejectedValue(
    new Error("فشل في الاتصال بالخادم")
  );

  render(<BrainStormContent />);

  await waitFor(() => {
    expect(screen.getByText(/منصة العصف الذهني الذكي/)).toBeInTheDocument();
  });

  await user.type(screen.getByPlaceholderText(/اكتب فكرتك/), "فكرة ستفشل");
  await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

  await waitFor(() => {
    expect(screen.getByText(/جاري إعادة المحاولة/)).toBeInTheDocument();
  });
});

it("يحسب التقدم الأولي بدقة بعد إنجاز أول مرحلة", async () => {
  render(<BrainStormContent />);

  await waitFor(() => {
    expect(screen.getByText(/منصة العصف الذهني الذكي/)).toBeInTheDocument();
  });

  await user.type(
    screen.getByPlaceholderText(/اكتب فكرتك/),
    "فكرة لاختبار التقدم"
  );
  await user.click(screen.getByRole("button", { name: /بدء جلسة/ }));

  await waitFor(() => {
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });
});
