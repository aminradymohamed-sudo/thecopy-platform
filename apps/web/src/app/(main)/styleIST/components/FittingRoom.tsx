"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { ProjectProvider, useProject } from "../contexts/ProjectContext";
import {
  evaluateSafety,
  FabricType,
  SceneHazard,
} from "../services/rulesEngine";
import { getSceneCostumes, assignSceneCostume } from "../services/styleistApi";
import {
  downloadTechPackDocument,
  generateFullTechPack,
  isValidProjectYear,
  STYLEIST_PROJECT_YEAR_RANGE,
} from "../services/techPackService";
import { WardrobeItem } from "../types";

import ContinuityTimeline, { SceneCardData } from "./ContinuityTimeline";
import {
  InfoPanel,
  InspectorPanel,
  TechPackModal,
  TopNav,
} from "./FittingRoomPanels";
import { PlusIcon } from "./icons";
import LightingStudio from "./LightingStudio";
import WardrobeModal from "./WardrobeSheet";
interface FittingRoomProps {
  onBack: () => void;
  initialGarmentUrl?: string;
  initialGarmentName?: string;
  initialWeather?: string;
  onStartNew?: () => void;
}

const Dashboard = React.lazy(() => import("./Dashboard"));

const INITIAL_SCENES: SceneCardData[] = [
  {
    id: "SC-1",
    sceneNumber: "SC-1",
    slugline: "INT. APARTMENT",
    time: "DAY",
    costumeId: "costume-a",
    isContinuous: false,
  },
  {
    id: "SC-2",
    sceneNumber: "SC-2",
    slugline: "EXT. STREET",
    time: "DAY",
    costumeId: "costume-a",
    isContinuous: true,
  },
  {
    id: "SC-3",
    sceneNumber: "SC-3",
    slugline: "INT. CAFE",
    time: "DAY",
    costumeId: "costume-a",
    isContinuous: true,
  },
  {
    id: "SC-4",
    sceneNumber: "SC-4",
    slugline: "EXT. ALLEY",
    time: "NIGHT",
    costumeId: null,
    isContinuous: true,
  },
  {
    id: "SC-5",
    sceneNumber: "SC-5",
    slugline: "INT. SAFEHOUSE",
    time: "NIGHT",
    costumeId: "costume-b",
    isContinuous: true,
  },
];

const EngineeringWorkspace: React.FC<FittingRoomProps> = ({
  onBack,
  initialGarmentUrl,
  onStartNew,
}) => {
  const { projectId, projectName, addNotification } = useProject();

  const [textureUrl, setTextureUrl] = useState<string | null>(
    initialGarmentUrl ?? null
  );
  const [selectedFabric, setSelectedFabric] = useState<FabricType>("cotton");
  const [hazards, setHazards] = useState<SceneHazard[]>([]);
  const [activeTab, setActiveTab] = useState<"3d" | "data">("3d");
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const [projectYear, setProjectYear] = useState<number>(2024);
  const [yearError, setYearError] = useState<string | null>(null);
  const [showTechPackModal, setShowTechPackModal] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [inspectorQuery, setInspectorQuery] = useState("");
  const safetyReport = useMemo(
    () => evaluateSafety(selectedFabric, hazards),
    [hazards, selectedFabric]
  );
  const techPack = useMemo(
    () => generateFullTechPack(selectedFabric, "coat", projectYear, "black"),
    [projectYear, selectedFabric]
  );
  const [activeSceneId, setActiveSceneId] = useState("SC-4");
  const [scenes, setScenes] = useState<SceneCardData[]>(INITIAL_SCENES);

  useEffect(() => {
    if (!projectId) return;
    getSceneCostumes(projectId)
      .then((rows) => {
        if (rows.length === 0) return;
        setScenes((prev) =>
          prev.map((scene) => {
            const match = rows.find((r) => r.sceneId === scene.id);
            return match
              ? {
                  ...scene,
                  costumeId:
                    match.wardrobeItemId ??
                    match.costumeDesignId ??
                    scene.costumeId,
                  isContinuous: match.isContinuous,
                }
              : scene;
          })
        );
      })
      .catch(() => {
        /* empty */
      });
  }, [projectId]);

  useEffect(() => {
    if (safetyReport.status === "critical")
      addNotification(`تنبيه سلامة: ${safetyReport.issues[0]}`);
    if (techPack.historicalWarning) addNotification(techPack.historicalWarning);
  }, [safetyReport, techPack, addNotification]);

  const toggleHazard = (h: SceneHazard) =>
    setHazards((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );

  const handleYearChange = (value: string) => {
    const nextYear = Number.parseInt(value, 10);

    if (!isValidProjectYear(nextYear)) {
      setYearError(
        `Use a year from ${STYLEIST_PROJECT_YEAR_RANGE.min} to ${STYLEIST_PROJECT_YEAR_RANGE.max}.`
      );
      return;
    }

    setYearError(null);
    setProjectYear(nextYear);
  };

  const handleDownloadTechPack = () => {
    const filename = downloadTechPackDocument({
      techPack,
      fabricName: selectedFabric,
      projectName,
    });
    addNotification(`Tech pack downloaded: ${filename}`);
  };

  const handleShowTechPack = () => {
    setShowTechPackModal(true);
    handleDownloadTechPack();
  };

  const handleShare = async () => {
    const safeUrl = `${window.location.origin}/styleIST`;

    try {
      await navigator.clipboard?.writeText(safeUrl);
      setShareStatus("Safe link copied");
    } catch {
      setShareStatus(safeUrl);
    }
  };

  const handleStartNew = () => {
    onStartNew?.();
    onBack();
  };

  const handleGarmentSelect = (file: File, item: WardrobeItem) => {
    const url = URL.createObjectURL(file);
    setTextureUrl(url);
    setIsWardrobeOpen(false);
    setScenes((prev) =>
      prev.map((s) =>
        s.id === activeSceneId ? { ...s, costumeId: item.id } : s
      )
    );
    addNotification("Scene costume updated. Checking continuity...");
    assignSceneCostume({
      projectId,
      sceneId: activeSceneId,
      wardrobeItemId: item.id,
    }).catch(() => {
      /* empty */
    });
  };

  const handleFixContinuity = (
    targetSceneId: string,
    sourceOutfitId: string
  ) => {
    setScenes((prev) =>
      prev.map((s) =>
        s.id === targetSceneId ? { ...s, costumeId: sourceOutfitId } : s
      )
    );
    addNotification(`Continuity fixed for ${targetSceneId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-black/8 text-white overflow-hidden font-sans">
      <TopNav
        projectName={projectName}
        activeSceneId={activeSceneId}
        projectYear={projectYear}
        yearError={yearError}
        shareStatus={shareStatus}
        activeTab={activeTab}
        onBack={onBack}
        onYearChange={handleYearChange}
        onTabChange={setActiveTab}
        onHelp={() => setShowHelpPanel(true)}
        onSettings={() => setShowSettingsPanel(true)}
        onShare={() => {
          void handleShare();
        }}
        onStartNew={handleStartNew}
      />

      <div className="flex-grow flex overflow-hidden relative">
        <div className="flex-grow relative flex flex-col">
          {activeTab === "3d" ? (
            <div className="w-full h-full relative">
              <LightingStudio {...(textureUrl ? { textureUrl } : {})} />
              <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                <CardSpotlight className="rounded-full backdrop-blur-xl">
                  <button
                    onClick={() => setIsWardrobeOpen(true)}
                    aria-label="Change outfit"
                    className="bg-black/14 backdrop-blur-xl border border-white/8 text-white p-3 rounded-full hover:bg-[#d4b483] hover:text-black transition-colors shadow-xl"
                    title="Change Outfit"
                  >
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </CardSpotlight>
              </div>
              {techPack?.historicalWarning && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-yellow-900/90 text-yellow-100 px-6 py-3 rounded-[22px] border border-yellow-600 shadow-2xl z-30 flex items-center gap-3 backdrop-blur-xl">
                  <span className="text-xl">⚠️</span>
                  <p className="text-xs font-bold uppercase tracking-wide">
                    {techPack.historicalWarning}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <React.Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-widest text-white/68">
                  Loading Analysis
                </div>
              }
            >
              <Dashboard />
            </React.Suspense>
          )}
          <div className="absolute bottom-0 left-0 w-full z-20">
            <ContinuityTimeline
              scenes={scenes}
              activeSceneId={activeSceneId}
              onSceneSelect={setActiveSceneId}
              onFixContinuity={handleFixContinuity}
            />
          </div>
        </div>

        <InspectorPanel
          selectedFabric={selectedFabric}
          hazards={hazards}
          query={inspectorQuery}
          safetyReport={safetyReport}
          onFabricChange={setSelectedFabric}
          onToggleHazard={toggleHazard}
          onQueryChange={setInspectorQuery}
          onShowTechPack={handleShowTechPack}
        />
      </div>

      {showTechPackModal && techPack && (
        <TechPackModal
          techPack={techPack}
          selectedFabric={selectedFabric}
          onClose={() => setShowTechPackModal(false)}
          onDownload={handleDownloadTechPack}
        />
      )}

      {showHelpPanel && (
        <InfoPanel
          title="Help"
          onClose={() => setShowHelpPanel(false)}
          lines={[
            "Use the analysis tab to review material stress data.",
            "Use search to narrow materials and scene hazards.",
            "Generate Tech Pack downloads the current production sheet.",
          ]}
        />
      )}

      {showSettingsPanel && (
        <InfoPanel
          title="Settings & Privacy"
          onClose={() => setShowSettingsPanel(false)}
          lines={[
            "Display units are local to this browser.",
            "No account tokens or private session values are shown here.",
            "Shared links use the public studio route only.",
          ]}
        />
      )}

      <WardrobeModal
        isOpen={isWardrobeOpen}
        onClose={() => setIsWardrobeOpen(false)}
        onGarmentSelect={handleGarmentSelect}
        activeGarmentIds={[]}
        isLoading={false}
        projectId={projectId}
      />
    </div>
  );
};

const FittingRoom: React.FC<FittingRoomProps> = (props) => {
  return (
    <ProjectProvider>
      <EngineeringWorkspace {...props} />
    </ProjectProvider>
  );
};

export default FittingRoom;
