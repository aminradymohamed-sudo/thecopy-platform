import { describe, expect, it } from "vitest";

import { ApiError } from "@the-copy/api-client";

import {
  NonEmptyString,
  ProjectTitle,
  clampText,
  escapeHtml,
  parseOrThrow,
  sanitizeForExcel,
  sanitizeRowForExcel,
} from "./index";

describe("excel sanitization", () => {
  it("prefixes formula-like cells and preserves safe strings", () => {
    expect(sanitizeForExcel("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(sanitizeForExcel("+cmd")).toBe("'+cmd");
    expect(sanitizeForExcel("plain text")).toBe("plain text");
  });

  it("sanitizes only string values in row exports", () => {
    expect(
      sanitizeRowForExcel({
        name: "@danger",
        count: 3,
        empty: null,
      }),
    ).toEqual({
      name: "'@danger",
      count: 3,
      empty: null,
    });
  });
});

describe("validation helpers", () => {
  it("escapes HTML export text", () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it("returns parsed data or raises ApiError with validation details", () => {
    expect(parseOrThrow(ProjectTitle, "  valid title  ")).toBe("valid title");

    expect(() => parseOrThrow(NonEmptyString, "   ")).toThrow(ApiError);
  });

  it("clamps by unicode characters instead of raw code units", () => {
    expect(clampText("A😀B", 2)).toBe("A😀");
  });
});
