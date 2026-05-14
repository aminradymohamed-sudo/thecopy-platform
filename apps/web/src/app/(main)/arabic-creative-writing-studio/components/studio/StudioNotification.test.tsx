import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StudioNotification } from "@/app/(main)/arabic-creative-writing-studio/components/studio/StudioNotification";

describe("StudioNotification", () => {
  it("renders as a non-blocking status instead of a modal layer", () => {
    const { rerender } = render(
      <StudioNotification
        notification={{ type: "success", message: "تم حفظ المشروع" }}
      />
    );

    expect(
      screen.getByRole("status", { name: "تنبيه الاستوديو" })
    ).toHaveTextContent("تم حفظ المشروع");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector(".fixed.inset-0")).not.toBeInTheDocument();

    rerender(<StudioNotification notification={null} />);

    expect(
      screen.queryByRole("status", { name: "تنبيه الاستوديو" })
    ).not.toBeInTheDocument();
  });
});
