import { describe, expect, it } from "vitest";

import { shouldRenderMainShell } from "./layout-shell";

describe("main layout shell selection", () => {
  it("does not wrap BREAKAPP routes in the platform shell", () => {
    expect(shouldRenderMainShell("/BREAKAPP")).toBe(false);
    expect(shouldRenderMainShell("/BREAKAPP/login/qr")).toBe(false);
    expect(shouldRenderMainShell("/BREAKAPP/dashboard")).toBe(false);
  });

  it("keeps the platform shell for regular main app routes", () => {
    expect(shouldRenderMainShell("/analysis")).toBe(true);
    expect(shouldRenderMainShell("/development")).toBe(true);
  });

  it("keeps the editor route outside the platform shell", () => {
    expect(shouldRenderMainShell("/editor")).toBe(false);
    expect(shouldRenderMainShell("/editor/documents/123")).toBe(false);
  });

  it("keeps actor studio routes outside the platform shell", () => {
    expect(shouldRenderMainShell("/actorai-arabic")).toBe(false);
    expect(shouldRenderMainShell("/actorai-arabic?view=studio")).toBe(false);
    expect(shouldRenderMainShell("/actorai-arabic/self-tape-suite")).toBe(
      false
    );
  });

  it("does not exclude similarly named routes", () => {
    expect(shouldRenderMainShell("/BREAKAPP-preview")).toBe(true);
  });

  it("keeps the shell before the pathname is available", () => {
    expect(shouldRenderMainShell(null)).toBe(true);
  });
});
