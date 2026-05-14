import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../App", () => ({
  default: () => <div>تطبيق التفكيك الكامل</div>,
}));

vi.mock("../../breakdown-content", () => ({
  default: () => <div>تقرير التحليل النهائي</div>,
}));

import BreakdownPage from "../../page";

describe("BreakdownPage", () => {
  it("يعرض التطبيق الكامل افتراضيًا داخل المسار الحي", async () => {
    render(<BreakdownPage />);

    expect(
      screen.getByRole("heading", { name: "ScriptBreakdown AI" })
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /مساحة التفكيك/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(await screen.findByText("تطبيق التفكيك الكامل")).toBeInTheDocument();
  });

  it("يسمح بالتبديل إلى واجهة التقرير من نفس المسار", async () => {
    render(<BreakdownPage />);

    fireEvent.click(screen.getByRole("tab", { name: /التقرير/i }));

    expect(
      await screen.findByText("تقرير التحليل النهائي")
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /التقرير/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});
