import { describe, expect, test } from "vitest";

import { resolveTypecheckExitCode } from "./typecheck-contract-lib.mjs";

describe("typecheck contract exit status", () => {
  test("fails the quality gate when TypeScript errors were parsed", () => {
    expect(
      resolveTypecheckExitCode({
        fatal: false,
        parsedErrors: 1,
      }),
    ).toBe(1);
  });

  test("passes only when there are no fatal errors and no parsed errors", () => {
    expect(
      resolveTypecheckExitCode({
        fatal: false,
        parsedErrors: 0,
      }),
    ).toBe(0);
  });

  test("fails on fatal compiler output even when no TypeScript error was parsed", () => {
    expect(
      resolveTypecheckExitCode({
        fatal: true,
        parsedErrors: 0,
      }),
    ).toBe(1);
  });
});
