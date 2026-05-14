"use client";

import { Download, Link2, Plus, Save, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  buildCineShareUrl,
  createAdditionalLight,
  readCineSceneSession,
  readSharedCineScene,
  resolveLensPreset,
  sanitizeCineExportFilename,
  serializeCineSceneExport,
  validateCineSceneForSave,
  writeCineSceneSession,
} from "../../lib/scene-session";
import { StudioMetricCell, StudioPanel } from "../studio-ui";

import type { CameraRig, LensRig, LightingRig, Scene } from "../../types";

interface SceneStudioPanelProps {
  forceWebGLUnavailable?: boolean;
}

interface ScenePreviewProps {
  forceWebGLUnavailable?: boolean;
  camera: CameraRig;
  lens: LensRig;
  lights: LightingRig[];
}

const ScenePreviewCanvas = dynamic(() => import("./ScenePreviewCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center bg-[#050505] text-sm text-[#b4aa92]">
      جاري تجهيز المعاينة البصرية.
    </div>
  ),
});

function canCreateWebGLContext(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  if (
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("jsdom")
  ) {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function ScenePreviewFallback() {
  return (
    <div className="flex min-h-[360px] items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(229,181,79,0.18),transparent_30%),linear-gradient(135deg,#080808,#111_52%,#050505)] p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto h-20 w-20 rounded-full border border-[#73572a] bg-[#130d05] shadow-[0_0_48px_rgba(229,181,79,0.16)]" />
        <p className="mt-5 text-lg font-semibold text-[#f6cf72]">
          العرض ثلاثي الأبعاد غير متاح في هذه الجلسة
        </p>
        <p className="mt-3 text-sm leading-7 text-[#b4aa92]">
          تستطيع متابعة تعديل الإضاءة والكاميرا والحفظ.
        </p>
      </div>
    </div>
  );
}

const ScenePreview = memo(function ScenePreview({
  camera,
  lens,
  lights,
  forceWebGLUnavailable,
}: ScenePreviewProps) {
  const webglAvailable = forceWebGLUnavailable
    ? false
    : canCreateWebGLContext();
  const keyLightIntensity = lights[0]?.intensity ?? 0;
  const previewScene = useMemo<Scene>(
    () => ({
      id: "preview",
      name: "preview",
      description: "preview",
      updatedAt: "preview",
      camera,
      lens,
      lights,
    }),
    [camera, lens, lights]
  );

  return (
    <div
      className="relative min-h-[360px] overflow-hidden rounded-[10px] border border-[#343434] bg-[#050505]"
      data-testid="cine-scene-preview"
    >
      {webglAvailable ? (
        <div className="h-[360px] w-full">
          <ScenePreviewCanvas scene={previewScene} />
        </div>
      ) : (
        <ScenePreviewFallback />
      )}

      <div className="pointer-events-none absolute inset-x-4 bottom-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-[8px] border border-[#343434] bg-black/72 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
            Key Light
          </p>
          <p className="mt-1 text-sm font-semibold text-[#f6cf72]">
            إضاءة رئيسية {keyLightIntensity}%
          </p>
        </div>
        <div className="rounded-[8px] border border-[#343434] bg-black/72 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
            Lens
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {camera.focalLength}mm
          </p>
        </div>
        <div className="rounded-[8px] border border-[#343434] bg-black/72 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#7f7b71]">
            Package
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{lens.label}</p>
        </div>
      </div>
    </div>
  );
});

function updateSceneTimestamp(scene: Scene): Scene {
  return { ...scene, updatedAt: new Date().toISOString() };
}

function updateCamera(scene: Scene, patch: Partial<CameraRig>): Scene {
  return updateSceneTimestamp({
    ...scene,
    camera: { ...scene.camera, ...patch },
  });
}

function updateLens(scene: Scene, preset: string): Scene {
  const lens = resolveLensPreset(preset);
  return updateSceneTimestamp({ ...scene, lens });
}

function updateLight(
  scene: Scene,
  lightId: string,
  patch: Partial<LightingRig>
): Scene {
  return updateSceneTimestamp({
    ...scene,
    lights: scene.lights.map((light) =>
      light.id === lightId ? { ...light, ...patch } : light
    ),
  });
}

function downloadJson(scene: Scene): void {
  const json = serializeCineSceneExport(scene);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeCineExportFilename(scene.name)}.json`;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

function SceneIdentityControls({
  scene,
  onSceneChange,
}: {
  scene: Scene;
  onSceneChange: (scene: Scene) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">اسم المشهد</span>
        <input
          aria-label="اسم المشهد"
          value={scene.name}
          onChange={(event) =>
            onSceneChange({ ...scene, name: event.target.value })
          }
          className="h-11 w-full rounded-[8px] border border-[#343434] bg-[#0d0d0d] px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
        />
      </label>
      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">وصف المشهد</span>
        <textarea
          aria-label="وصف المشهد"
          value={scene.description}
          maxLength={10000}
          onChange={(event) =>
            onSceneChange({
              ...scene,
              description: event.target.value.slice(0, 10000),
            })
          }
          className="min-h-[92px] w-full rounded-[8px] border border-[#343434] bg-[#0d0d0d] px-3 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
        />
      </label>
    </div>
  );
}

function CameraControls({
  scene,
  onSceneChange,
}: {
  scene: Scene;
  onSceneChange: (scene: Scene) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">حزمة العدسة</span>
        <select
          aria-label="حزمة العدسة"
          value={scene.lens.preset}
          onChange={(event) =>
            onSceneChange(updateLens(scene, event.target.value))
          }
          className="h-11 w-full rounded-[8px] border border-[#343434] bg-[#0d0d0d] px-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f]"
        >
          <option value="spherical">Spherical</option>
          <option value="anamorphic">Anamorphic</option>
          <option value="vintage">Vintage</option>
          <option value="macro">Macro</option>
        </select>
      </label>

      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">
          البعد البؤري {scene.camera.focalLength}mm
        </span>
        <input
          aria-label="البعد البؤري"
          type="range"
          min={12}
          max={200}
          value={scene.camera.focalLength}
          onChange={(event) =>
            onSceneChange(
              updateCamera(scene, { focalLength: Number(event.target.value) })
            )
          }
          className="w-full accent-[#e5b54f]"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">
          فتحة العدسة {scene.camera.aperture.toFixed(1)}
        </span>
        <input
          aria-label="فتحة العدسة"
          type="range"
          min={0.7}
          max={22}
          step={0.1}
          value={scene.camera.aperture}
          onChange={(event) =>
            onSceneChange(
              updateCamera(scene, { aperture: Number(event.target.value) })
            )
          }
          className="w-full accent-[#e5b54f]"
        />
      </label>

      <label className="space-y-2">
        <span className="text-sm text-[#ddd2b8]">
          حساسية الكاميرا {scene.camera.iso}
        </span>
        <input
          aria-label="حساسية الكاميرا"
          type="range"
          min={100}
          max={12800}
          step={100}
          value={scene.camera.iso}
          onChange={(event) =>
            onSceneChange(
              updateCamera(scene, { iso: Number(event.target.value) })
            )
          }
          className="w-full accent-[#e5b54f]"
        />
      </label>
    </div>
  );
}

function LightControls({
  scene,
  onSceneChange,
}: {
  scene: Scene;
  onSceneChange: (scene: Scene) => void;
}) {
  return (
    <div className="space-y-3">
      {scene.lights.map((light) => (
        <div
          key={light.id}
          data-testid="cine-light-row"
          className="rounded-[8px] border border-[#262626] bg-[#070707] p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">{light.label}</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#7f7b71]">
                {light.kind}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSceneChange(
                  updateSceneTimestamp({
                    ...scene,
                    lights: scene.lights.filter((item) => item.id !== light.id),
                  })
                )
              }
              disabled={scene.lights.length <= 1}
              aria-label={`حذف ${light.label}`}
              className="rounded-[8px] border border-[#343434] p-2 text-[#b4aa92] hover:text-[#f6cf72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b54f] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_90px]">
            <label className="space-y-2">
              <span className="text-xs text-[#ddd2b8]">
                {light.label === "إضاءة رئيسية"
                  ? "شدة الضوء الرئيسي"
                  : `شدة ${light.label}`}
              </span>
              <input
                aria-label={
                  light.label === "إضاءة رئيسية"
                    ? "شدة الضوء الرئيسي"
                    : `شدة ${light.label}`
                }
                type="range"
                min={0}
                max={100}
                value={light.intensity}
                onChange={(event) =>
                  onSceneChange(
                    updateLight(scene, light.id, {
                      intensity: Number(event.target.value),
                    })
                  )
                }
                className="w-full accent-[#e5b54f]"
              />
            </label>
            <input
              aria-label={`لون ${light.label}`}
              type="color"
              value={light.color}
              onChange={(event) =>
                onSceneChange(
                  updateLight(scene, light.id, { color: event.target.value })
                )
              }
              className="h-10 w-full rounded-[8px] border border-[#343434] bg-[#0d0d0d]"
            />
          </div>
          <p className="mt-2 text-xs text-[#b4aa92]">
            {light.intensity}% عند موضع {light.position.join(" / ")}
          </p>
        </div>
      ))}

      <Button
        type="button"
        onClick={() =>
          onSceneChange(
            updateSceneTimestamp({
              ...scene,
              lights: [
                ...scene.lights,
                createAdditionalLight(scene.lights.length + 1),
              ],
            })
          )
        }
        className="h-11 w-full border border-[#73572a] bg-[#120d06] text-[#f6cf72] hover:bg-[#23160a]"
      >
        <Plus className="mr-2 h-4 w-4" />
        إضافة مصدر ضوء
      </Button>
    </div>
  );
}

export function SceneStudioPanel({
  forceWebGLUnavailable = false,
}: SceneStudioPanelProps) {
  const [scene, setScene] = useState<Scene>(() => {
    if (typeof window === "undefined") {
      return readCineSceneSession().scene;
    }
    const shared = readSharedCineScene(window.location.search);
    return shared ?? readCineSceneSession().scene;
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSceneChange = useCallback((nextScene: Scene) => {
    setScene(nextScene);
  }, []);

  const saveScene = useCallback(() => {
    const validation = validateCineSceneForSave(scene);
    if (!validation.isValid) {
      setSavedAt(null);
      setStatusMessage(validation.message);
      return;
    }

    const session = writeCineSceneSession(scene);
    setSavedAt(session.savedAt);
    setStatusMessage(null);
  }, [scene]);

  const exportScene = useCallback(() => {
    const validation = validateCineSceneForSave(scene);
    if (!validation.isValid) {
      setSavedAt(null);
      setStatusMessage(validation.message);
      return;
    }

    downloadJson(scene);
  }, [scene]);

  const createShareLink = useCallback(async () => {
    const validation = validateCineSceneForSave(scene);
    if (!validation.isValid) {
      setSavedAt(null);
      setStatusMessage(validation.message);
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const path = "/cinematography-studio";
    const absoluteUrl = buildCineShareUrl(scene, { origin, path });
    const visibleUrl = absoluteUrl.replace(origin, "");
    setShareUrl(visibleUrl);
    writeCineSceneSession(scene);
    setStatusMessage("تم إنشاء رابط المشاركة.");

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(absoluteUrl);
        setStatusMessage("تم نسخ رابط المشاركة الكامل إلى الحافظة.");
      } catch {
        setStatusMessage("تم إنشاء رابط المشاركة، ويمكن نسخه من الواجهة.");
      }
    }
  }, [scene]);

  const summary = useMemo(() => {
    const totalLight = scene.lights.reduce(
      (sum, light) => sum + light.intensity,
      0
    );
    const averageLight = Math.round(
      totalLight / Math.max(1, scene.lights.length)
    );
    return {
      averageLight,
      lightCount: scene.lights.length,
      lensLabel: scene.lens.label,
    };
  }, [scene.lens.label, scene.lights]);

  const deferredCamera = useDeferredValue(scene.camera);
  const deferredLens = useDeferredValue(scene.lens);
  const deferredLights = useDeferredValue(scene.lights);
  const showStatus =
    savedAt !== null || shareUrl.length > 0 || statusMessage !== null;

  return (
    <StudioPanel
      title="Scene Studio"
      subtitle="مشهد تصوير كامل مع إضاءة وكاميرا وعدسات وحفظ وتصدير"
      headerRight={
        <span className="rounded-full border border-[#73572a] bg-[#120d06] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#f6cf72]">
          Production Ready Flow
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-4">
          <ScenePreview
            camera={deferredCamera}
            forceWebGLUnavailable={forceWebGLUnavailable}
            lens={deferredLens}
            lights={deferredLights}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <StudioMetricCell
              label="Lights"
              value={summary.lightCount}
              tone="white"
            />
            <StudioMetricCell
              label="Average Light"
              value={`${summary.averageLight}%`}
            />
            <StudioMetricCell
              label="Lens"
              value={summary.lensLabel}
              tone="white"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <SceneIdentityControls
              scene={scene}
              onSceneChange={handleSceneChange}
            />
          </div>

          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <p className="mb-4 text-[11px] uppercase tracking-[0.26em] text-[#e5b54f]">
              Camera And Lens
            </p>
            <CameraControls scene={scene} onSceneChange={handleSceneChange} />
          </div>

          <div className="rounded-[10px] border border-[#262626] bg-[#070707] p-4">
            <p className="mb-4 text-[11px] uppercase tracking-[0.26em] text-[#e5b54f]">
              Lighting Rig
            </p>
            <LightControls scene={scene} onSceneChange={handleSceneChange} />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              type="button"
              onClick={saveScene}
              className="h-11 border border-[#e5b54f] bg-[#20170a] text-[#f6cf72] hover:bg-[#2c1d0b]"
            >
              <Save className="mr-2 h-4 w-4" />
              حفظ تصميم التصوير
            </Button>
            <Button
              type="button"
              onClick={exportScene}
              className="h-11 border border-[#343434] bg-[#0d0d0d] text-[#ddd2b8] hover:bg-[#171717]"
            >
              <Download className="mr-2 h-4 w-4" />
              تصدير إعدادات التصوير
            </Button>
            <Button
              type="button"
              onClick={() => void createShareLink()}
              className="h-11 border border-[#343434] bg-[#0d0d0d] text-[#ddd2b8] hover:bg-[#171717]"
            >
              <Link2 className="mr-2 h-4 w-4" />
              إنشاء رابط مشاركة
            </Button>
          </div>

          <div
            className={cn(
              "rounded-[8px] border border-[#262626] bg-[#050505] px-3 py-3 text-sm leading-7 text-[#b4aa92]",
              showStatus ? "block" : "hidden"
            )}
            aria-live="polite"
          >
            {statusMessage ? <p>{statusMessage}</p> : null}
            {savedAt ? <p>تم حفظ آخر تصميم عند {savedAt}</p> : null}
            {shareUrl ? (
              <p className="break-all" data-testid="cine-share-link">
                {shareUrl}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </StudioPanel>
  );
}

export default SceneStudioPanel;
