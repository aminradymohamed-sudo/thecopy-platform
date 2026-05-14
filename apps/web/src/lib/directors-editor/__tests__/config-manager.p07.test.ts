// ============================================================================
// E2E-7 — directors-editor config-manager (P0-7 acceptance)
// ============================================================================
// يُثبت إصلاح P0-7:
//   - buildEditorUrl يُمرّر sceneId و shotId.
//   - buildLoginRedirectUrl يبني /login?redirect=/editor?... صحيحاً.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DirectorsEditorConfigManager } from "../config-manager";

beforeEach(() => {
  DirectorsEditorConfigManager.resetForTests();
});

afterEach(() => {
  DirectorsEditorConfigManager.resetForTests();
});

describe("DirectorsEditorConfigManager.buildEditorUrl — sceneId/shotId", () => {
  it("يبني URL أساسياً يحتوي projectId و source", () => {
    const url = DirectorsEditorConfigManager.buildEditorUrl("p_123");
    expect(url).toContain("/editor?");
    expect(url).toContain("projectId=p_123");
    expect(url).toContain("source=directors-studio");
  });

  it("يُمرّر sceneId عند تحديده", () => {
    const url = DirectorsEditorConfigManager.buildEditorUrl("p_1", {
      sceneId: "s_42",
    });
    expect(url).toContain("sceneId=s_42");
  });

  it("يُمرّر shotId عند تحديده", () => {
    const url = DirectorsEditorConfigManager.buildEditorUrl("p_1", {
      shotId: "shot_9",
    });
    expect(url).toContain("shotId=shot_9");
  });

  it("يُمرّر sceneId و shotId معاً مع importIntent", () => {
    const url = DirectorsEditorConfigManager.buildEditorUrl("p_1", {
      sceneId: "s_2",
      shotId: "sh_3",
      importIntent: true,
    });
    expect(url).toContain("sceneId=s_2");
    expect(url).toContain("shotId=sh_3");
    expect(url).toContain("intent=import");
  });

  it("لا يُضيف sceneId/shotId إذا كانا فارغين", () => {
    const url = DirectorsEditorConfigManager.buildEditorUrl("p_1", {
      sceneId: "",
      shotId: "",
    });
    expect(url).not.toContain("sceneId=");
    expect(url).not.toContain("shotId=");
  });
});

describe("DirectorsEditorConfigManager.buildLoginRedirectUrl", () => {
  it("يبني /login?redirect=/editor?... صحيحاً", () => {
    const url = DirectorsEditorConfigManager.buildLoginRedirectUrl("p_1");
    expect(url).toContain("/login?");
    expect(url).toContain("redirect=");
    // الـ redirect target يجب أن يحتوي /editor.
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("/editor");
    expect(decoded).toContain("projectId=p_1");
  });

  it("يحفظ sceneId/shotId داخل redirect target", () => {
    const url = DirectorsEditorConfigManager.buildLoginRedirectUrl("p_1", {
      sceneId: "s_5",
      shotId: "sh_7",
    });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("sceneId=s_5");
    expect(decoded).toContain("shotId=sh_7");
  });

  it("يحفظ importIntent داخل redirect target", () => {
    const url = DirectorsEditorConfigManager.buildLoginRedirectUrl("p_1", {
      importIntent: true,
    });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("intent=import");
  });

  it("يُولّد URL آمن (encoded) لاستخدامه في router.push", () => {
    const url = DirectorsEditorConfigManager.buildLoginRedirectUrl("p_demo", {
      sceneId: "scene 1 with spaces",
    });
    // يجب أن يكون encoded بشكل آمن — لا مسافة خام.
    expect(url).not.toContain("scene 1 with spaces");
    // URLSearchParams يستخدم x-www-form-urlencoded حيث المسافة → "+".
    // فك التشفير الصحيح يستعيد القيمة عبر URLSearchParams.get.
    const queryString = url.split("?")[1] ?? "";
    const params = new URLSearchParams(queryString);
    const redirectTarget = params.get("redirect") ?? "";
    const innerQuery = redirectTarget.split("?")[1] ?? "";
    const innerParams = new URLSearchParams(innerQuery);
    expect(innerParams.get("sceneId")).toBe("scene 1 with spaces");
  });
});
