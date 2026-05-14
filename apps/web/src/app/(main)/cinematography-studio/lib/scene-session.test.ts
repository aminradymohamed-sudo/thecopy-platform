import { beforeEach, describe, expect, it } from "vitest";

import {
  buildCineShareUrl,
  CINE_SCENE_DRAFT_KEY,
  createDefaultCineScene,
  LEGACY_CINE_SCENE_SESSION_KEYS,
  MAX_TEXT_LENGTH,
  readCineSceneSession,
  sanitizeCineExportFilename,
  sanitizeCineSceneSession,
  serializeCineSceneExport,
  validateCineSceneForSave,
} from "./scene-session";

describe("scene-session", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sanitizes restored scene data and strips heavy or unsafe fields", () => {
    const restored = sanitizeCineSceneSession({
      scene: {
        id: "scene-test",
        name: "<script>alert(1)</script>",
        description: "A".repeat(60_000),
        previewDataUrl: "data:image/png;base64,unsafe",
        lights: [
          {
            id: "key",
            label: "إضاءة رئيسية",
            kind: "key",
            intensity: 999,
            color: "#ffffff",
            position: [0, 2, 4],
          },
        ],
      },
      savedAt: "2026-04-30T00:00:00.000Z",
    });

    expect(restored.scene.name).toBe("<script>alert(1)</script>");
    expect(restored.scene.description.length).toBeLessThanOrEqual(
      MAX_TEXT_LENGTH
    );
    expect("previewDataUrl" in restored.scene).toBe(false);
    expect(restored.scene.lights[0]?.intensity).toBe(100);
  });

  it("validates scene descriptions before save and export", () => {
    const scene = createDefaultCineScene();

    expect(validateCineSceneForSave({ ...scene, description: "   " })).toEqual({
      isValid: false,
      message: "أدخل وصف مشهد لا يقل عن 10 أحرف قبل الحفظ.",
    });
    expect(
      validateCineSceneForSave({ ...scene, description: "قصير" }).isValid
    ).toBe(false);
    expect(validateCineSceneForSave(scene)).toEqual({
      isValid: true,
      message: null,
    });
  });

  it("sanitizes export filenames without path or control characters", () => {
    const filename = sanitizeCineExportFilename(
      "\u0000../danger\\scene:name?.json"
    );

    expect(filename).toBe("danger scene name");
    expect(
      Array.from(filename).every((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
    ).toBe(true);
    expect(sanitizeCineExportFilename("..")).toBe("cine-scene");
  });

  it("migrates legacy storage keys once and removes them", () => {
    const legacyScene = {
      version: 2,
      savedAt: "2026-05-04T00:00:00.000Z",
      scene: {
        ...createDefaultCineScene("2026-05-04T00:00:00.000Z"),
        name: "مشهد مرحل",
      },
    };
    localStorage.setItem(
      LEGACY_CINE_SCENE_SESSION_KEYS[0],
      JSON.stringify(legacyScene)
    );

    const restored = readCineSceneSession();

    expect(restored.scene.name).toBe("مشهد مرحل");
    expect(localStorage.getItem(CINE_SCENE_DRAFT_KEY)).toContain("مشهد مرحل");
    expect(localStorage.getItem(LEGACY_CINE_SCENE_SESSION_KEYS[0])).toBeNull();
  });

  it("does not consume legacy workspace storage as scene storage", () => {
    localStorage.setItem(
      LEGACY_CINE_SCENE_SESSION_KEYS[1],
      JSON.stringify({ phase: "post", view: "phases" })
    );

    const restored = readCineSceneSession();

    expect(restored.scene.name).toBe("مشهد تصوير جديد");
    expect(localStorage.getItem(LEGACY_CINE_SCENE_SESSION_KEYS[1])).toContain(
      "post"
    );
  });

  it("exports a stable payload without browser-only artifacts", () => {
    const scene = createDefaultCineScene();
    const json = serializeCineSceneExport(scene, "2026-04-30T00:00:00.000Z");
    const parsed = JSON.parse(json) as {
      exportedAt: string;
      scene: { name: string; lights: unknown[] };
    };

    expect(parsed.exportedAt).toBe("2026-04-30T00:00:00.000Z");
    expect(parsed.scene.name).toBe(scene.name);
    expect(parsed.scene.lights).toHaveLength(3);
    expect(json).not.toContain("previewDataUrl");
  });

  it("builds a share url that can carry the current scene snapshot", () => {
    const url = buildCineShareUrl(createDefaultCineScene(), {
      origin: "https://www.thecopy.app",
      path: "/cinematography-studio",
    });

    expect(url).toMatch(
      /^https:\/\/www\.thecopy\.app\/cinematography-studio\?share=/
    );
    expect(url).not.toMatch(/token|session|auth/i);
  });
});
