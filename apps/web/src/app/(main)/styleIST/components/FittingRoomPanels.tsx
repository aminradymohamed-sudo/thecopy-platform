"use client";

import { useEffect, useRef } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import {
  evaluateSafety,
  type FabricType,
  type SceneHazard,
} from "../services/rulesEngine";
import {
  generateFullTechPack,
  STYLEIST_PROJECT_YEAR_RANGE,
} from "../services/techPackService";

import { ChevronLeftIcon } from "./icons";
import { TechPackView } from "./TechPackView";

type ViewTab = "3d" | "data";

interface TopNavProps {
  projectName: string;
  activeSceneId: string;
  projectYear: number;
  yearError: string | null;
  shareStatus: string | null;
  activeTab: ViewTab;
  onBack: () => void;
  onYearChange: (value: string) => void;
  onTabChange: (tab: ViewTab) => void;
  onHelp: () => void;
  onSettings: () => void;
  onShare: () => void;
  onStartNew: () => void;
}

export function TopNav({
  projectName,
  activeSceneId,
  projectYear,
  yearError,
  shareStatus,
  activeTab,
  onBack,
  onYearChange,
  onTabChange,
  onHelp,
  onSettings,
  onShare,
  onStartNew,
}: TopNavProps) {
  return (
    <div className="min-h-14 border-b border-white/8 flex flex-wrap items-center gap-4 px-6 py-2 justify-between z-30 bg-black/14 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <button
          onClick={onBack}
          className="text-white/55 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeftIcon className="w-4 h-4" /> Exit
        </button>
        <div className="h-4 w-px bg-white/8"></div>
        <div>
          <h2 className="text-sm font-bold tracking-widest text-white">
            {projectName}
          </h2>
          <span className="text-[9px] text-[#d4b483] font-mono uppercase tracking-widest">
            Scene: {activeSceneId}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-col">
          <div className="flex items-center bg-black/14 rounded-[22px] border border-white/8 px-3 py-1 backdrop-blur-xl">
            <label
              htmlFor="styleist-project-year"
              className="text-[10px] font-bold text-white/68 mr-2 uppercase"
            >
              Era:
            </label>
            <input
              id="styleist-project-year"
              type="number"
              value={projectYear}
              min={STYLEIST_PROJECT_YEAR_RANGE.min}
              max={STYLEIST_PROJECT_YEAR_RANGE.max}
              aria-invalid={yearError ? "true" : "false"}
              aria-describedby={yearError ? "styleist-year-error" : undefined}
              onChange={(e) => onYearChange(e.target.value)}
              className="bg-transparent w-16 text-xs font-bold text-white outline-none text-right font-mono"
            />
          </div>
          {yearError && (
            <span
              id="styleist-year-error"
              role="alert"
              className="mt-1 text-[9px] font-bold text-red-200"
            >
              {yearError}
            </span>
          )}
        </div>
        <div className="flex bg-black/14 rounded-[22px] p-1 border border-white/8 backdrop-blur-xl">
          <button
            onClick={() => onTabChange("3d")}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-[18px] transition-all ${activeTab === "3d" ? "bg-white text-black" : "text-white/55 hover:text-white/85"}`}
          >
            Viewport
          </button>
          <button
            onClick={() => onTabChange("data")}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-[18px] transition-all ${activeTab === "data" ? "bg-white text-black" : "text-white/55 hover:text-white/85"}`}
          >
            Analysis
          </button>
        </div>
        <button
          type="button"
          onClick={onHelp}
          className="rounded-[18px] border border-white/8 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/68 hover:text-white hover:border-white/12"
        >
          Help
        </button>
        <button
          type="button"
          onClick={onSettings}
          className="rounded-[18px] border border-white/8 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/68 hover:text-white hover:border-white/12"
        >
          Settings
        </button>
        <button
          type="button"
          onClick={onShare}
          className="rounded-[18px] border border-white/8 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/68 hover:text-white hover:border-white/12"
        >
          Share
        </button>
        <button
          type="button"
          onClick={onStartNew}
          className="rounded-[18px] border border-white/8 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/68 hover:text-white hover:border-white/12"
        >
          Start New
        </button>
        {shareStatus && (
          <span role="status" className="text-[10px] font-bold text-green-200">
            {shareStatus}
          </span>
        )}
      </div>
    </div>
  );
}

interface InspectorPanelProps {
  selectedFabric: FabricType;
  hazards: SceneHazard[];
  query: string;
  safetyReport: ReturnType<typeof evaluateSafety>;
  onFabricChange: (fabric: FabricType) => void;
  onToggleHazard: (hazard: SceneHazard) => void;
  onQueryChange: (value: string) => void;
  onShowTechPack: () => void;
}

export function InspectorPanel({
  selectedFabric,
  hazards,
  query,
  safetyReport,
  onFabricChange,
  onToggleHazard,
  onQueryChange,
  onShowTechPack,
}: InspectorPanelProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const fabrics: FabricType[] = [
    "cotton",
    "polyester",
    "silk",
    "wool",
    "leather",
  ];
  const visibleFabrics = normalizedQuery
    ? fabrics.filter((fabric) => fabric.includes(normalizedQuery))
    : fabrics;
  const sceneHazards: SceneHazard[] = ["fire", "water", "stunt"];
  const visibleHazards = normalizedQuery
    ? sceneHazards.filter((hazard) => hazard.includes(normalizedQuery))
    : sceneHazards;

  return (
    <CardSpotlight className="absolute top-6 right-6 bottom-40 w-72 rounded-[22px] overflow-hidden z-10">
      <div className="absolute top-6 right-6 bottom-40 w-72 bg-black/14 backdrop-blur-xl border border-white/8 rounded-[22px] flex flex-col z-10 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/8 bg-black/22">
          <h3 className="text-[10px] font-bold text-white/45 uppercase tracking-[0.2em]">
            Inspector
          </h3>
        </div>
        <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar">
          <div>
            <label
              htmlFor="styleist-inspector-search"
              className="block text-[10px] font-bold text-[#d4b483] uppercase mb-2"
            >
              Search
            </label>
            <input
              id="styleist-inspector-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Filter materials or hazards"
              className="w-full bg-black/14 border border-white/8 text-xs text-white p-2 rounded-[18px] focus:border-[#d4b483] outline-none backdrop-blur-xl placeholder:text-white/45"
            />
          </div>
          <div>
            <label
              htmlFor="field-fittingroom-1"
              className="block text-[10px] font-bold text-[#d4b483] uppercase mb-2"
            >
              Material Physics
            </label>
            <select
              id="field-fittingroom-1"
              value={selectedFabric}
              onChange={(e) => onFabricChange(e.target.value as FabricType)}
              className="w-full bg-black/14 border border-white/8 text-xs text-white p-2 rounded-[22px] focus:border-[#d4b483] outline-none backdrop-blur-xl"
            >
              {visibleFabrics.map((fabric) => (
                <option key={fabric} value={fabric}>
                  {fabric.charAt(0).toUpperCase()}
                  {fabric.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="block text-[10px] font-bold text-[#d4b483] uppercase mb-2">
              Scene Hazards
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleHazards.map((hazard) => (
                <button
                  key={hazard}
                  onClick={() => onToggleHazard(hazard)}
                  className={`px-2 py-1 text-[9px] font-bold uppercase rounded-[18px] border transition-colors ${hazards.includes(hazard) ? "bg-red-900/50 text-red-200 border-red-500" : "bg-transparent text-white/55 border-white/8 hover:border-white/12"}`}
                >
                  {hazard}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 bg-black/14 rounded-[22px] border border-white/8 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-white/55 uppercase">
                Safety Score
              </span>
              <span
                className={`text-lg font-mono font-bold ${safetyReport.score > 80 ? "text-green-500" : "text-red-500"}`}
              >
                {safetyReport.score}%
              </span>
            </div>
            {safetyReport.issues.map((issue: string, i: number) => (
              <div
                key={i}
                className="text-[9px] text-red-300 border-l-2 border-red-500 pl-2 py-1 mb-1 leading-tight"
              >
                {issue}
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-white/8 bg-black/22 mt-auto">
          <button
            onClick={onShowTechPack}
            className="w-full bg-white text-black py-3 rounded-[22px] text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#d4b483] transition-colors"
          >
            Generate Tech Pack
          </button>
        </div>
      </div>
    </CardSpotlight>
  );
}

interface TechPackModalProps {
  techPack: ReturnType<typeof generateFullTechPack>;
  selectedFabric: FabricType;
  onClose: () => void;
  onDownload: () => void;
}

export function TechPackModal({
  techPack,
  selectedFabric,
  onClose,
  onDownload,
}: TechPackModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const elements = Array.from(
      dialog.querySelectorAll<HTMLElement>(focusable)
    );
    const first = elements[0];
    const last = elements[elements.length - 1];

    if (first) first.focus();

    function trapTab(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !first || !last) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    dialog.addEventListener("keydown", trapTab);
    return () => dialog.removeEventListener("keydown", trapTab);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close tech pack modal"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <CardSpotlight className="relative z-10 rounded-[22px] overflow-hidden">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="techpack-modal-title"
          className="bg-white text-black p-0 w-full max-w-md shadow-2xl rounded-[22px] overflow-hidden border border-white/8"
        >
          <div className="bg-black/14 text-white p-4 flex justify-between items-center border-b border-white/8">
            <h3
              id="techpack-modal-title"
              className="font-serif text-lg tracking-wider"
            >
              TECH PACK GENERATOR
            </h3>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="text-white/55 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="p-6">
            <TechPackView data={techPack} fabricName={selectedFabric} />
            <button
              onClick={onDownload}
              className="w-full mt-4 border-2 border-black/14 text-black font-bold py-2 hover:bg-black/14 hover:text-white transition-colors text-xs uppercase tracking-widest rounded-[22px]"
            >
              Download Tech Pack
            </button>
          </div>
        </div>
      </CardSpotlight>
    </div>
  );
}

interface InfoPanelProps {
  title: string;
  lines: string[];
  onClose: () => void;
}

export function InfoPanel({ title, lines, onClose }: InfoPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="styleist-info-panel-title"
        className="relative z-10 w-full max-w-md rounded-[22px] border border-white/8 bg-black/80 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3
            id="styleist-info-panel-title"
            className="text-sm font-bold uppercase tracking-[0.2em] text-white"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold uppercase tracking-widest text-white/55 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="space-y-3">
          {lines.map((line) => (
            <p key={line} className="text-sm leading-6 text-white/75">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
