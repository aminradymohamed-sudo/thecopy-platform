import { beforeEach, describe, expect, it, vi } from "vitest";

import { exportProjectDocument } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";

import type { CreativeProject } from "@/app/(main)/arabic-creative-writing-studio/types";

function makeProject(title: string): CreativeProject {
  return {
    id: "project-1",
    title,
    content: "نص صالح للتصدير",
    promptId: "",
    genre: "cross_genre",
    creativeTone: "balanced",
    wordCount: 3,
    characterCount: 15,
    paragraphCount: 1,
    createdAt: new Date("2026-05-04T08:00:00.000Z"),
    updatedAt: new Date("2026-05-04T08:00:00.000Z"),
    tags: [],
    isCompleted: false,
  };
}

describe("exportProjectDocument", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:test-url"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      /* empty */
    });
  });

  it("falls back to a safe filename when the title looks like a path", () => {
    const result = exportProjectDocument(
      makeProject("../../../etc/passwd"),
      "txt"
    );

    expect(result.success).toBe(true);
    expect(result.filename).toBe("creative-writing-project.txt");
  });
});
