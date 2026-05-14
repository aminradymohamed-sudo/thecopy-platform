import type { CameraRig, LensRig, LightingRig, Scene } from "../types";

export const CINE_SCENE_DRAFT_KEY = "cinematography-studio.draft.v3";
export const CINE_SCENE_SESSION_KEY = CINE_SCENE_DRAFT_KEY;
export const LEGACY_CINE_SCENE_SESSION_KEYS = [
  "cinematography-studio.session.v2",
  "cinematography-studio.session.v1",
] as const;
export const LEGACY_CINE_SCENE_SESSION_KEY = LEGACY_CINE_SCENE_SESSION_KEYS[1];
export const MAX_TEXT_LENGTH = 10000;
export const MIN_CINE_SCENE_DESCRIPTION_LENGTH = 10;
export const CINE_SCENE_VALIDATION_MESSAGE =
  "أدخل وصف مشهد لا يقل عن 10 أحرف قبل الحفظ.";
const RESERVED_WINDOWS_FILENAMES =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export interface CineSceneSession {
  scene: Scene;
  savedAt: string;
  version: 2;
}

export interface CineSceneValidationResult {
  isValid: boolean;
  message: string | null;
}

interface ShareUrlInput {
  origin: string;
  path: string;
}

const lensPresets: Record<LensRig["preset"], LensRig> = {
  spherical: {
    preset: "spherical",
    label: "Spherical",
    distortion: 8,
    breathing: 12,
  },
  anamorphic: {
    preset: "anamorphic",
    label: "Anamorphic",
    distortion: 34,
    breathing: 26,
  },
  vintage: {
    preset: "vintage",
    label: "Vintage",
    distortion: 18,
    breathing: 38,
  },
  macro: {
    preset: "macro",
    label: "Macro",
    distortion: 12,
    breathing: 44,
  },
};

export function resolveLensPreset(preset: string): LensRig {
  return lensPresets[preset as LensRig["preset"]] ?? lensPresets.spherical;
}

export function createDefaultCineScene(now = new Date().toISOString()): Scene {
  return {
    id: `scene-${Date.now()}`,
    name: "مشهد تصوير جديد",
    description: "لقطة داخلية قابلة للتعديل بإضاءة وكاميرا وعدسة.",
    updatedAt: now,
    camera: {
      focalLength: 35,
      aperture: 2.8,
      iso: 800,
      shutterAngle: 180,
      position: [0, 1.6, 6],
    },
    lens: lensPresets.spherical,
    lights: [
      {
        id: "key",
        label: "إضاءة رئيسية",
        kind: "key",
        intensity: 65,
        color: "#f8d28a",
        position: [-2.2, 3.2, 2.5],
      },
      {
        id: "fill",
        label: "إضاءة تعبئة",
        kind: "fill",
        intensity: 28,
        color: "#8fb9ff",
        position: [2.8, 2.2, 3],
      },
      {
        id: "back",
        label: "إضاءة خلفية",
        kind: "back",
        intensity: 42,
        color: "#ffd2a1",
        position: [0, 2.7, -3],
      },
    ],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value.slice(0, MAX_TEXT_LENGTH) : fallback;
}

function asNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback;
}

function asVector(
  value: unknown,
  fallback: [number, number, number]
): [number, number, number] {
  if (!Array.isArray(value) || value.length < 3) {
    return fallback;
  }
  return [
    asNumber(value[0], fallback[0], -20, 20),
    asNumber(value[1], fallback[1], -20, 20),
    asNumber(value[2], fallback[2], -20, 20),
  ];
}

function sanitizeLight(value: unknown, index: number): LightingRig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const defaults = createDefaultCineScene().lights[index] ?? {
    id: `light-${index + 1}`,
    label: `ضوء ${index + 1}`,
    kind: "practical" as const,
    intensity: 35,
    color: "#ffffff",
    position: [0, 2, 0] as [number, number, number],
  };

  const kindCandidate = candidate["kind"];
  const kind =
    kindCandidate === "key" ||
    kindCandidate === "fill" ||
    kindCandidate === "back" ||
    kindCandidate === "practical"
      ? kindCandidate
      : defaults.kind;

  const color = asString(candidate["color"], defaults.color);
  return {
    id: asString(candidate["id"], defaults.id),
    label: asString(candidate["label"], defaults.label),
    kind,
    intensity: asNumber(candidate["intensity"], defaults.intensity, 0, 100),
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : defaults.color,
    position: asVector(candidate["position"], defaults.position),
  };
}

function sanitizeCamera(value: unknown): CameraRig {
  const defaults = createDefaultCineScene().camera;
  if (!value || typeof value !== "object") {
    return defaults;
  }
  const candidate = value as Record<string, unknown>;
  return {
    focalLength: asNumber(
      candidate["focalLength"],
      defaults.focalLength,
      12,
      200
    ),
    aperture: asNumber(candidate["aperture"], defaults.aperture, 0.7, 22),
    iso: asNumber(candidate["iso"], defaults.iso, 100, 12800),
    shutterAngle: asNumber(
      candidate["shutterAngle"],
      defaults.shutterAngle,
      45,
      360
    ),
    position: asVector(candidate["position"], defaults.position),
  };
}

function sanitizeLens(value: unknown): LensRig {
  if (!value || typeof value !== "object") {
    return lensPresets.spherical;
  }
  const candidate = value as Record<string, unknown>;
  const preset = asString(candidate["preset"], "spherical");
  const resolved = resolveLensPreset(preset);
  return {
    ...resolved,
    distortion: asNumber(candidate["distortion"], resolved.distortion, 0, 100),
    breathing: asNumber(candidate["breathing"], resolved.breathing, 0, 100),
  };
}

export function sanitizeCineSceneSession(value: unknown): CineSceneSession {
  const defaults = createDefaultCineScene();
  const root =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const rawScene =
    root["scene"] && typeof root["scene"] === "object"
      ? (root["scene"] as Record<string, unknown>)
      : {};
  const lightsRaw = Array.isArray(rawScene["lights"])
    ? rawScene["lights"]
    : defaults.lights;
  const lights = lightsRaw
    .slice(0, 12)
    .map((light, index) => sanitizeLight(light, index))
    .filter((light): light is LightingRig => Boolean(light));

  const savedAt = asString(root["savedAt"], new Date().toISOString());
  return {
    version: 2,
    savedAt,
    scene: {
      id: asString(rawScene["id"], defaults.id),
      name: asString(rawScene["name"], defaults.name),
      description: asString(rawScene["description"], defaults.description),
      updatedAt: asString(rawScene["updatedAt"], savedAt),
      camera: sanitizeCamera(rawScene["camera"]),
      lens: sanitizeLens(rawScene["lens"]),
      lights: lights.length > 0 ? lights : defaults.lights,
    },
  };
}

function parseStoredCineSceneSession(raw: string): CineSceneSession | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("scene" in parsed)) {
      return null;
    }

    const rawScene = (parsed as Record<string, unknown>)["scene"];
    if (!rawScene || typeof rawScene !== "object") {
      return null;
    }

    return sanitizeCineSceneSession(parsed);
  } catch {
    return null;
  }
}

function removeLegacyCineSceneSessions(): void {
  for (const key of LEGACY_CINE_SCENE_SESSION_KEYS) {
    window.localStorage.removeItem(key);
  }
}

function persistMigratedCineSceneSession(session: CineSceneSession): void {
  window.localStorage.setItem(CINE_SCENE_DRAFT_KEY, JSON.stringify(session));
  removeLegacyCineSceneSessions();
}

function stripControlCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
}

export function validateCineSceneForSave(
  scene: Scene
): CineSceneValidationResult {
  if (scene.description.trim().length < MIN_CINE_SCENE_DESCRIPTION_LENGTH) {
    return {
      isValid: false,
      message: CINE_SCENE_VALIDATION_MESSAGE,
    };
  }

  return {
    isValid: true,
    message: null,
  };
}

export function sanitizeCineExportFilename(name: string): string {
  const cleaned = stripControlCharacters(name.normalize("NFKC"))
    .replace(/[<>:"/\\|?*]+/g, " ")
    .replace(/\.\.+/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .replace(/\s*\.json$/i, "")
    .trim()
    .slice(0, 80)
    .trim();

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return "cine-scene";
  }

  return RESERVED_WINDOWS_FILENAMES.test(cleaned)
    ? `${cleaned}-export`
    : cleaned;
}

export function readCineSceneSession(): CineSceneSession {
  if (typeof window === "undefined") {
    return sanitizeCineSceneSession(null);
  }

  const currentRaw = window.localStorage.getItem(CINE_SCENE_DRAFT_KEY);
  if (currentRaw) {
    const currentSession = parseStoredCineSceneSession(currentRaw);
    if (currentSession) {
      return currentSession;
    }
  }

  for (const legacyKey of LEGACY_CINE_SCENE_SESSION_KEYS) {
    const legacyRaw = window.localStorage.getItem(legacyKey);
    if (!legacyRaw) continue;

    const legacySession = parseStoredCineSceneSession(legacyRaw);
    if (legacySession) {
      persistMigratedCineSceneSession(legacySession);
      return legacySession;
    }
  }

  return sanitizeCineSceneSession(null);
}

export function writeCineSceneSession(scene: Scene): CineSceneSession {
  const session = sanitizeCineSceneSession({
    scene: {
      ...scene,
      updatedAt: new Date().toISOString(),
    },
    savedAt: new Date().toISOString(),
    version: 2,
  });

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CINE_SCENE_DRAFT_KEY, JSON.stringify(session));
    removeLegacyCineSceneSessions();
  }

  return session;
}

export function serializeCineSceneExport(
  scene: Scene,
  exportedAt = new Date().toISOString()
): string {
  const safeSession = sanitizeCineSceneSession({
    scene,
    savedAt: exportedAt,
    version: 2,
  });
  return JSON.stringify(
    {
      exportedAt,
      version: 2,
      scene: safeSession.scene,
    },
    null,
    2
  );
}

export function buildCineShareUrl(scene: Scene, input: ShareUrlInput): string {
  const payload = {
    version: 2,
    sharedAt: new Date().toISOString(),
    scene: sanitizeCineSceneSession({ scene }).scene,
  };
  const encoded = encodeURIComponent(
    btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
  );
  return `${input.origin}${input.path}?share=${encoded}`;
}

export function readSharedCineScene(search: string): Scene | null {
  const params = new URLSearchParams(search);
  const encoded = params.get("share");
  if (!encoded) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(encoded);
    const json = decodeURIComponent(escape(atob(decoded)));
    return sanitizeCineSceneSession(JSON.parse(json)).scene;
  } catch {
    return null;
  }
}

export function createAdditionalLight(index: number): LightingRig {
  return {
    id: `practical-${Date.now()}-${index}`,
    label: `ضوء عملي ${index}`,
    kind: "practical",
    intensity: 36,
    color: "#f4b86a",
    position: [index % 2 === 0 ? 2.6 : -2.6, 1.5 + (index % 3), -0.8],
  };
}
