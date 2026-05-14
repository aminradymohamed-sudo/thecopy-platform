import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BudgetItemsTable } from "./BudgetItemsTable";

import type { BudgetItemsEditorApi } from "../../hooks/useBudgetItemsEditor";
import type { BudgetDocument } from "../../types";

const budget: BudgetDocument = {
  currency: "USD",
  grandTotal: 300,
  sections: [
    {
      id: "atl",
      name: "Above The Line",
      total: 300,
      categories: [
        {
          code: "14-00",
          name: "Cast",
          total: 300,
          items: [
            {
              code: "14-01",
              description: "Lead actor",
              amount: 1,
              unit: "day",
              rate: 100,
              total: 100,
            },
            {
              code: "14-02",
              description: "Supporting actor",
              amount: 2,
              unit: "day",
              rate: 100,
              total: 200,
            },
          ],
        },
      ],
    },
  ],
};

const editor: BudgetItemsEditorApi = {
  editedBudget: budget,
  updateItemField: vi.fn(),
  addItem: vi.fn(),
  removeItem: vi.fn(),
  setCurrency: vi.fn(),
  resetToSourceBudget: vi.fn(),
  hasEdits: false,
};

describe("BudgetItemsTable", () => {
  it("collapses and restores a section through one user click", () => {
    render(<BudgetItemsTable budget={budget} editor={editor} />);

    expect(screen.getAllByLabelText(/^وصف البند/)).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /Above The Line/ }));

    expect(screen.queryAllByLabelText(/^وصف البند/)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /Above The Line/ }));

    expect(screen.getAllByLabelText(/^وصف البند/)).toHaveLength(2);
  });
});
