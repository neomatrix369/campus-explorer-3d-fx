/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FileDown,
  Mic,
  Mountain,
  ExternalLink,
  MapPin,
  Volume2,
  Compass,
} from 'lucide-react';
import {
  UNIVERSITIES,
  CampusBuilding,
  UniversityProfile,
  CampusProfile,
} from './data/campusData';
import {
  calculateSunState,
  DEMO_WALKTHROUGH_STEPS,
  getBuildingAggregateMetrics,
  getTopographyInfo,
  getWalkthroughStep,
  reserveStudySeat,
} from './utils/campusLogic';
import { triggerCampusPdfDownload } from './utils/pdfMapGenerator';
import { spatialAudio, SoundscapePreset } from './utils/spatialAudioEngine';
import { CampusScene3D, CameraViewPreset } from './components/CampusScene3D';
import { UnifiedControlDock } from './components/UnifiedControlDock';
import {
  OverlayPanels,
  ActiveModalType,
  speakNarrationText,
  stopNarrationSpeech,
} from './components/OverlayPanels';
import {
  exportCampusOsmGeoJson,
  getLondonInterUniversityRoutes,
  LONDON_3D_ICONIC_LANDMARKS,
  LONDON_UNIVERSITY_GEO_LOCATIONS,
} from './utils/londonOsmGeojson';
import {
  GEMINI_NEURAL_VOICES,
  GeminiNeuralVoiceName,
  isNeuralVoiceCurrentlyActive,
} from './utils/neuralVoiceClient';

export default function App() {
  // Multi-University & Multi-Campus State (UCL, KCL, Imperial, LSE)
  const [selectedUniversityId, setSelectedUniversityId] = useState<string>(
    UNIVERSITIES[0].id
  );
  const [selectedCampusId, setSelectedCampusId] = useState<string>(
    UNIVERSITIES[0].campuses[0].id
  );

  // Store per-campus building lists so seat reservations & extruded 3D buildings persist per campus
  const [campusBuildingsMap, setCampusBuildingsMap] = useState<
    Record<string, CampusBuilding[]>
  >(() => {
    const initial: Record<string, CampusBuilding[]> = {};
    for (const uni of UNIVERSITIES) {
      for (const camp of uni.campuses) {
        initial[camp.id] = camp.buildings;
      }
    }
    return initial;
  });

  const activeUniversity: UniversityProfile =
    UNIVERSITIES.find((u) => u.id === selectedUniversityId) || UNIVERSITIES[0];
  const activeCampus: CampusProfile =
    activeUniversity.campuses.find((c) => c.id === selectedCampusId) ||
    activeUniversity.campuses[0];

  const buildings: CampusBuilding[] =
    campusBuildingsMap[activeCampus.id] || activeCampus.buildings;

  // Aggregate all 7 London campuses' buildings, roads, and pathways so they are simultaneously
  // rendered at their realistic geographic locations across the unified 3D Map of London
  const allLondonBuildings: CampusBuilding[] = UNIVERSITIES.flatMap((u) =>
    u.campuses.flatMap((c) => campusBuildingsMap[c.id] || c.buildings)
  );
  const allLondonRoads = UNIVERSITIES.flatMap((u) =>
    u.campuses.flatMap((c) => c.roads)
  );
  const allLondonPathways = UNIVERSITIES.flatMap((u) =>
    u.campuses.flatMap((c) => c.pathways)
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    buildings[0]?.id || 'ucl-wilkins-main-lib'
  );
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(null);

  // Default to atmospheric golden hour (17.25 = 17:15) so topography, trees, roads, and facades shine
  const [solarHour, setSolarHour] = useState<number>(17.25);

  // 9 Individual Visual Effects & 3D World Feature Toggles
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showStudentFlow, setShowStudentFlow] = useState<boolean>(true);
  const [showRadarPulse, setShowRadarPulse] = useState<boolean>(true);
  const [showDustMotes, setShowDustMotes] = useState<boolean>(true);
  const [showTopoContours, setShowTopoContours] = useState<boolean>(true);
  const [showRoadsAndPaths, setShowRoadsAndPaths] = useState<boolean>(true);
  const [showFoliage, setShowFoliage] = useState<boolean>(true);
  const [showUrbanContext, setShowUrbanContext] = useState<boolean>(true);
  const [showBloomAndFog, setShowBloomAndFog] = useState<boolean>(true);

  // City of London 3D Macro Map Toggle (Shows panoramic London 3D view + Distance Matrix)
  const [showLondonCityMap, setShowLondonCityMap] = useState<boolean>(false);

  // Argon + Gemini 3.8 Neural Voice Persona State (English Only, default aoede-real)
  const [selectedVoiceName, setSelectedVoiceName] =
    useState<GeminiNeuralVoiceName>('aoede-real');
  const [isSpeakingSample, setIsSpeakingSample] = useState<boolean>(false);

  const [bloomIntensity] = useState<number>(0.82);
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('overview');
  const [soundPreset, setSoundPreset] = useState<SoundscapePreset>('muted');

  // Guided Demo Walkthrough & Auto-Replay State (Strictly Mutually Exclusive — never run together)
  const [isDemoPlaying, setIsDemoPlaying] = useState<boolean>(false);
  const [isAutoReplay, setIsAutoReplay] = useState<boolean>(false);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);
  const [demoVoiceNarration, setDemoVoiceNarration] = useState<boolean>(true);

  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<ActiveModalType>('none');
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  const selectedBuilding =
    buildings.find((b) => b.id === selectedBuildingId) ||
    allLondonBuildings.find((b) => b.id === selectedBuildingId) ||
    buildings[0];
  const selectedMetrics = getBuildingAggregateMetrics(selectedBuilding);
  const sunState = calculateSunState(solarHour);
  const topoInfo = getTopographyInfo(
    selectedBuilding.position[0],
    selectedBuilding.position[2],
    activeCampus.terrainPreset,
    activeCampus.baseAslMeters
  );
  const currentWalkthroughStep = getWalkthroughStep(demoStepIndex);
  const interUniversityRoutes = getLondonInterUniversityRoutes();
  const activeGeoLoc =
    LONDON_UNIVERSITY_GEO_LOCATIONS.find((g) => g.campusId === activeCampus.id) ||
    LONDON_UNIVERSITY_GEO_LOCATIONS.find((g) => g.universityId === activeUniversity.id) ||
    LONDON_UNIVERSITY_GEO_LOCATIONS[0];

  const stepStartedAtRef = useRef<number>(Date.now());
  const voiceFinishedAtRef = useRef<number | null>(null);

  const applyWalkthroughStep = useCallback(
    (stepIdx: number) => {
      stopNarrationSpeech();
      const step = getWalkthroughStep(stepIdx);
      stepStartedAtRef.current = Date.now();
      setDemoStepIndex(step.stepIndex);
      setSelectedUniversityId(step.universityId);
      setSelectedCampusId(step.campusId);
      setSelectedBuildingId(step.buildingId);
      setSelectedFloorNumber(step.floorNumber);
      setSolarHour(step.solarHour);
      setCameraPreset(step.cameraPreset);
      if (demoVoiceNarration) {
        voiceFinishedAtRef.current = null;
        setIsSpeakingSample(true);
        speakNarrationText(
          `${step.title}. ${step.narration}`,
          () => {
            voiceFinishedAtRef.current = Date.now();
            setIsSpeakingSample(false);
          },
          selectedVoiceName
        );
      } else {
        voiceFinishedAtRef.current = Date.now();
        setIsSpeakingSample(false);
      }
    },
    [demoVoiceNarration, selectedVoiceName]
  );

  // Advance tour step ONLY after current voice narration has completely finished speaking
  // PLUS a calm 3.2-second post-speech dwell pause and a 10-second minimum stop duration
  useEffect(() => {
    if (!isDemoPlaying && !isAutoReplay) return;

    const interval = window.setInterval(() => {
      // Never advance while voice is still loading, decoding, or speaking
      if (isSpeakingSample || isNeuralVoiceCurrentlyActive()) {
        return;
      }

      const now = Date.now();
      const elapsedSinceStepStart = now - stepStartedAtRef.current;

      // Ensure at least 10 seconds total on each stop for camera flight & visual inspection
      if (elapsedSinceStepStart < 10000) {
        return;
      }

      // When voice narration is enabled, require voice completion + 3.2s calm post-speech dwell
      if (demoVoiceNarration) {
        if (voiceFinishedAtRef.current === null) {
          return;
        }
        if (now - voiceFinishedAtRef.current < 3200) {
          return;
        }
      }

      const nextIdx = demoStepIndex + 1;
      if (isDemoPlaying && nextIdx >= DEMO_WALKTHROUGH_STEPS.length) {
        setIsDemoPlaying(false);
        return;
      }
      applyWalkthroughStep(nextIdx);
    }, 350);

    return () => window.clearInterval(interval);
  }, [
    isDemoPlaying,
    isAutoReplay,
    isSpeakingSample,
    demoVoiceNarration,
    demoStepIndex,
    applyWalkthroughStep,
  ]);

  // Keyboard shortcuts: 'H' toggles Cinema/Zen mode dock, 'Escape' closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        setActiveModal('none');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectUniversityAndCampus = (
    uniId: string,
    campId?: string,
    closeCityMap = false
  ) => {
    const targetUni = UNIVERSITIES.find((u) => u.id === uniId);
    if (!targetUni) return;
    const targetCampus =
      (campId ? targetUni.campuses.find((c) => c.id === campId) : undefined) ||
      targetUni.campuses[0];
    const campBuildings = campusBuildingsMap[targetCampus.id] || targetCampus.buildings;
    setIsDemoPlaying(false);
    setSelectedUniversityId(targetUni.id);
    setSelectedCampusId(targetCampus.id);
    setSelectedBuildingId(campBuildings[0]?.id || '');
    setSelectedFloorNumber(null);
    if (closeCityMap) {
      setShowLondonCityMap(false);
    }
    setCameraPreset('overview');
    spatialAudio.playRadarPing(523.25);
  };

  const handleSelectUniversity = (uniId: string, closeCityMap = false) => {
    handleSelectUniversityAndCampus(uniId, undefined, closeCityMap);
  };

  const handleSelectCampus = (campId: string) => {
    const targetCamp = activeUniversity.campuses.find((c) => c.id === campId);
    if (!targetCamp) return;
    const campBuildings = campusBuildingsMap[targetCamp.id] || targetCamp.buildings;
    setIsDemoPlaying(false);
    setSelectedCampusId(targetCamp.id);
    setSelectedBuildingId(campBuildings[0]?.id || '');
    setSelectedFloorNumber(null);
    setShowLondonCityMap(false);
    setCameraPreset('overview');
    spatialAudio.playRadarPing(587.33);
  };

  const handleSelectBuilding = (buildingId: string) => {
    // If the clicked building belongs to another university/campus on the London 3D map, switch to it
    for (const uni of UNIVERSITIES) {
      for (const camp of uni.campuses) {
        const list = campusBuildingsMap[camp.id] || camp.buildings;
        if (list.some((b) => b.id === buildingId)) {
          if (uni.id !== selectedUniversityId) setSelectedUniversityId(uni.id);
          if (camp.id !== selectedCampusId) setSelectedCampusId(camp.id);
          break;
        }
      }
    }
    setSelectedBuildingId(buildingId);
    setSelectedFloorNumber(null);
    setCameraPreset('focus-building');
    spatialAudio.playRadarPing(523.25);
  };

  const handleSelectBuildingAndFloor = (
    buildingId: string,
    floorNumber: number | null
  ) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorNumber(floorNumber);
    setShowLondonCityMap(false);
    setCameraPreset(floorNumber !== null ? 'floor-cutaway' : 'focus-building');
    spatialAudio.playRadarPing(floorNumber ? 659.25 : 523.25);
  };

  const handleReserveSeat = (buildingId: string, floorNumber: number) => {
    const result = reserveStudySeat(buildings, buildingId, floorNumber);
    if (result.reserved) {
      setCampusBuildingsMap((prev) => ({
        ...prev,
        [activeCampus.id]: result.updatedBuildings,
      }));
      spatialAudio.playRadarPing(783.99);
    }
    return {
      reserved: result.reserved,
      confirmationCode: result.confirmationCode,
      error: result.error,
    };
  };

  const handleAddSynthesizedBuilding = (newBuilding: CampusBuilding) => {
    setCampusBuildingsMap((prev) => ({
      ...prev,
      [activeCampus.id]: [...(prev[activeCampus.id] || activeCampus.buildings), newBuilding],
    }));
    setSelectedBuildingId(newBuilding.id);
    setSelectedFloorNumber(null);
    setShowLondonCityMap(false);
    setCameraPreset('focus-building');
    spatialAudio.playRadarPing(698.46);
  };

  const handleSoundPresetChange = (preset: SoundscapePreset) => {
    setSoundPreset(preset);
    spatialAudio.setPreset(preset);
    if (preset === 'muted') {
      stopNarrationSpeech();
      setIsSpeakingSample(false);
    }
  };

  const handleSetAllEffects = (enabled: boolean) => {
    setShowHeatmap(enabled);
    setShowStudentFlow(enabled);
    setShowRadarPulse(enabled);
    setShowDustMotes(enabled);
    setShowTopoContours(enabled);
    setShowRoadsAndPaths(enabled);
    setShowFoliage(enabled);
    setShowUrbanContext(enabled);
    setShowBloomAndFog(enabled);
  };

  // Mutually exclusive Show Demo vs Auto-Replay handlers so they never run at the same time
  const handleToggleDemo = () => {
    if (isDemoPlaying) {
      setIsDemoPlaying(false);
      stopNarrationSpeech();
      setIsSpeakingSample(false);
    } else {
      // Turn off Auto-Replay so Show Demo and Auto-Replay never work at the same time
      setIsAutoReplay(false);
      stopNarrationSpeech();
      setShowLondonCityMap(false);
      setIsDemoPlaying(true);
      applyWalkthroughStep(demoStepIndex);
    }
  };

  const handleToggleAutoReplay = () => {
    if (isAutoReplay) {
      setIsAutoReplay(false);
      stopNarrationSpeech();
      setIsSpeakingSample(false);
    } else {
      // Turn off Show Demo so Show Demo and Auto-Replay never work at the same time
      setIsDemoPlaying(false);
      stopNarrationSpeech();
      setShowLondonCityMap(false);
      setIsAutoReplay(true);
      applyWalkthroughStep(demoStepIndex);
    }
  };

  const handleDownloadPdfNow = () => {
    const fname = triggerCampusPdfDownload(
      activeUniversity,
      activeCampus,
      buildings,
      activeCampus.pathways
    );
    setPdfToast(`Saved ${fname}`);
    setTimeout(() => setPdfToast(null), 4000);
  };

  const handlePlayNaturalVoiceSample = () => {
    // Ensure neither Show Demo nor Auto-Replay is active when playing manual voice sample
    setIsDemoPlaying(false);
    setIsAutoReplay(false);

    if (isSpeakingSample) {
      stopNarrationSpeech();
      setIsSpeakingSample(false);
      return;
    }
    setIsSpeakingSample(true);
    speakNarrationText(
      `Welcome to ${activeUniversity.name}, ${activeCampus.shortName} in ${activeGeoLoc.borough}. ${selectedBuilding.name} currently has ${selectedMetrics.availableSeats} open seats with a quietest floor of ${selectedMetrics.minNoiseDba} dBA.`,
      () => setIsSpeakingSample(false),
      selectedVoiceName
    );
  };

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#070a10] select-none"
      data-university={activeUniversity.id}
      data-campus={activeCampus.id}
      data-selected-building={selectedBuilding.id}
      data-heatmap={showHeatmap ? 'active' : 'off'}
      data-lighting-phase={sunState.phaseLabel}
      data-building-count={buildings.length}
      data-demo-playing={isDemoPlaying ? 'true' : 'false'}
      data-london-city-map={showLondonCityMap ? 'true' : 'false'}
    >
      {/* 1. Full-Viewport Three.js WebGL Digital Twin Canvas (Unified 3D Map of London with All 7 Campuses) */}
      <CampusScene3D
        buildings={allLondonBuildings}
        selectedBuildingId={selectedBuilding.id}
        selectedFloorNumber={selectedFloorNumber}
        activeCampusId={activeCampus.id}
        activeCampusHubXZ={activeGeoLoc.londonWorldXZ}
        solarHour={solarHour}
        showHeatmap={showHeatmap}
        showStudentFlow={showStudentFlow}
        showRadarPulse={showRadarPulse}
        showDustMotes={showDustMotes}
        showTopoContours={showTopoContours}
        showRoadsAndPaths={showRoadsAndPaths}
        showFoliage={showFoliage}
        showUrbanContext={showUrbanContext}
        showBloomAndFog={showBloomAndFog}
        showLondonCityMap={showLondonCityMap}
        terrainPreset={activeCampus.terrainPreset}
        waterLevelY={activeCampus.waterLevelY}
        foliageHue={activeCampus.foliageHue}
        roads={allLondonRoads}
        pathways={allLondonPathways}
        bloomIntensity={bloomIntensity}
        cameraPreset={cameraPreset}
        onSelectBuilding={handleSelectBuilding}
        onSelectUniversityFromCityMap={(uniId, campId) =>
          handleSelectUniversityAndCampus(uniId, campId, true)
        }
      />

      {/* 2. Top Navigation Bar (Strict 3-Zone Contract: Brand — Nav Links — Primary Actions) */}
      <header className="fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-4 px-6 py-3 bg-[#070a10]/95 border-b border-slate-800/90 pointer-events-auto">
        <a
          href="#viewport"
          onClick={(e) => {
            e.preventDefault();
            setActiveModal('none');
            setShowLondonCityMap(false);
            setCameraPreset('overview');
          }}
          className="text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
        >
          CampusExplorer 3D FX
        </a>

        <nav
          aria-label="Primary Workspace Modes"
          className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-300"
        >
          <a
            href="#viewport"
            onClick={(e) => {
              e.preventDefault();
              setActiveModal('none');
              setShowLondonCityMap(false);
              setCameraPreset('overview');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeModal === 'none' && !showLondonCityMap
                ? 'text-white border-b-2 border-sky-400'
                : 'hover:text-white'
            }`}
          >
            Campus 3D Twin
          </a>
          <a
            href="#london-city-map"
            data-testid="nav-london-city-map-btn"
            onClick={(e) => {
              e.preventDefault();
              setActiveModal('none');
              setShowLondonCityMap((prev) => !prev);
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1.5 ${
              showLondonCityMap
                ? 'text-sky-300 border-b-2 border-sky-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>London 3D City Map (OSM/OS)</span>
          </a>
          <a
            href="#quiet-finder"
            onClick={(e) => {
              e.preventDefault();
              setActiveModal(activeModal === 'quiet-finder' ? 'none' : 'quiet-finder');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeModal === 'quiet-finder'
                ? 'text-white border-b-2 border-sky-400'
                : 'hover:text-white'
            }`}
          >
            24/7 Quiet Finder
          </a>
          <a
            href="#ai-concierge"
            onClick={(e) => {
              e.preventDefault();
              setActiveModal(activeModal === 'ai-concierge' ? 'none' : 'ai-concierge');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1.5 ${
              activeModal === 'ai-concierge'
                ? 'text-white border-b-2 border-sky-400'
                : 'hover:text-white'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>Natural Voice & Text AI</span>
          </a>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveModal('none');
              setShowLondonCityMap((prev) => !prev);
            }}
            data-testid="header-london-map-btn"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              showLondonCityMap
                ? 'bg-sky-500/25 text-sky-200 border-sky-400'
                : 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>{showLondonCityMap ? 'Exit London Map' : 'London 3D Map'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleDemo}
            data-testid="header-show-demo-btn"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              isDemoPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isDemoPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Demo</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Show Demo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveModal(
                activeModal === 'blueprint-synthesizer'
                  ? 'none'
                  : 'blueprint-synthesizer'
              )
            }
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            PDF Maps & 3D Extrude
          </button>
        </div>
      </header>

      {/* 3. Top-Left University & Campus Selector + Guided Demo & Landmark Card */}
      {!isDockCollapsed && (
        <section
          aria-label="University, Campus, and Landmark Explorer"
          className="fixed top-16 left-6 z-10 w-full max-w-[410px] bg-[#0B0F19] border border-slate-800 rounded-xl p-3.5 shadow-2xl pointer-events-auto space-y-2.5"
        >
          {/* University Selector Strip (UCL | King's KCL | Imperial | LSE) */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                1. Select University
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveModal('none');
                  setShowLondonCityMap((prev) => !prev);
                }}
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 underline"
              >
                <Compass className="w-3 h-3" />
                <span>{showLondonCityMap ? 'Back to Campus 3D' : 'View All 4 on London 3D Map'}</span>
              </button>
            </div>
            <div
              className="grid grid-cols-4 gap-1"
              role="tablist"
              aria-label="Select University"
              data-testid="university-selector"
            >
              {UNIVERSITIES.map((uni) => {
                const isSelected = uni.id === activeUniversity.id;
                return (
                  <button
                    key={uni.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleSelectUniversity(uni.id, false)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate border ${
                      isSelected
                        ? 'bg-sky-500/20 text-white border-sky-400'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {uni.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campus Selector Strip within Active University */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                2. Select Campus ({activeUniversity.shortName})
              </span>
              <span className="font-mono-tabular text-emerald-400">
                {activeGeoLoc.postcode} · {activeCampus.baseAslMeters}m ASL
              </span>
            </div>
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Select Campus"
              data-testid="campus-selector"
            >
              {activeUniversity.campuses.map((camp) => {
                const isSelected = camp.id === activeCampus.id;
                return (
                  <button
                    key={camp.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => handleSelectCampus(camp.id)}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/70'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {camp.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guided Walkthrough, Auto-Replay & Natural Neural Voice Bar */}
          <div className="p-2.5 bg-slate-900/95 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleToggleDemo}
                  data-testid="hud-show-demo-btn"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                    isDemoPlaying
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                  }`}
                >
                  {isDemoPlaying ? (
                    <>
                      <Pause className="w-3 h-3" />
                      <span>Pause Demo</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Show Demo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleToggleAutoReplay}
                  data-testid="hud-auto-replay-btn"
                  aria-pressed={isAutoReplay}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors whitespace-nowrap ${
                    isAutoReplay
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isAutoReplay ? 'Stop Auto-Replay' : 'Auto-Replay'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyWalkthroughStep(demoStepIndex - 1)}
                  aria-label="Previous Walkthrough Stop"
                  className="p-1 text-slate-300 hover:text-white bg-slate-800 rounded"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono-tabular text-slate-400 px-1">
                  {currentWalkthroughStep.stepIndex + 1}/{currentWalkthroughStep.totalSteps}
                </span>
                <button
                  type="button"
                  onClick={() => applyWalkthroughStep(demoStepIndex + 1)}
                  aria-label="Next Walkthrough Stop"
                  className="p-1 text-slate-300 hover:text-white bg-slate-800 rounded"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handlePlayNaturalVoiceSample}
                  data-testid="hud-voice-btn"
                  title="Hear Argon + Gemini 3.8 Natural Neural Voice narration"
                  className={`px-2 py-1 text-[10px] font-semibold rounded border flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    isSpeakingSample
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50 hover:bg-indigo-500/30'
                  }`}
                >
                  <Volume2 className="w-3 h-3 shrink-0" />
                  <span>
                    {isSpeakingSample
                      ? 'Stop Voice'
                      : `Voice (${selectedVoiceName.split('-')[0]})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Direct 7-Voice English Argon + Neural Voice Selector */}
            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <label
                htmlFor="hud-voice-select"
                className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0"
              >
                Argon Voice (EN):
              </label>
              <select
                id="hud-voice-select"
                data-testid="hud-voice-select"
                value={selectedVoiceName}
                onChange={(e) => {
                  const nextVoice = e.target.value as GeminiNeuralVoiceName;
                  setIsDemoPlaying(false);
                  setIsAutoReplay(false);
                  setSelectedVoiceName(nextVoice);
                  setIsSpeakingSample(true);
                  speakNarrationText(
                    `Welcome to ${activeUniversity.shortName} ${activeCampus.shortName} in ${activeGeoLoc.borough}. ${selectedBuilding.name} has ${selectedMetrics.availableSeats} open seats at ${selectedMetrics.minNoiseDba} decibels.`,
                    () => setIsSpeakingSample(false),
                    nextVoice
                  );
                }}
                className="flex-1 min-w-0 bg-slate-950 text-sky-300 border border-slate-700 rounded px-2 py-1 text-[11px] font-medium focus:outline-none focus:border-sky-400"
              >
                {GEMINI_NEURAL_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.language} · {v.voiceName} — {v.styleLabel}
                  </option>
                ))}
              </select>
            </div>

            {(isDemoPlaying || isAutoReplay) && (
              <div className="text-[11px] text-amber-200/90 leading-snug pt-1 border-t border-slate-800/80">
                <span className="font-semibold text-amber-300">
                  Tour Stop {currentWalkthroughStep.stepIndex + 1}:
                </span>{' '}
                {currentWalkthroughStep.narration}
              </div>
            )}
          </div>

          {/* Active Landmark & Real-World Topography Telemetry */}
          <div className="pt-1 border-t border-slate-800/90">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono-tabular">
              <span>
                {selectedBuilding.shortCode} · {selectedBuilding.category}
              </span>
              <span className="flex items-center gap-1 text-teal-300">
                <Mountain className="w-3 h-3" />
                {topoInfo.aslElevationM}m ASL ({topoInfo.slopeDegrees}°)
              </span>
            </div>

            <h1 className="text-sm font-bold text-white mt-0.5 tracking-tight">
              {selectedBuilding.name}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono-tabular text-slate-300">
              <span className="text-emerald-400 font-semibold">
                {selectedMetrics.availableSeats} Open Seats
              </span>
              <span aria-hidden="true">·</span>
              <span>Quietest: {selectedMetrics.minNoiseDba} dBA</span>
              <span aria-hidden="true">·</span>
              <span style={{ color: selectedMetrics.heat.hex }}>
                {selectedMetrics.heat.shortTag}
              </span>
            </div>

            {/* Direct PDF Map Download & Action Row */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/90 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveModal('floor-inspector')}
                className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Inspect {selectedBuilding.floors.length} Floors
              </button>

              <button
                type="button"
                onClick={() => setActiveModal('ai-concierge')}
                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 border border-emerald-500/40 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
              >
                <Mic className="w-3 h-3" />
                <span>Natural Voice AI</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdfNow}
                data-testid="hud-download-pdf-btn"
                className="px-2.5 py-1.5 text-xs font-medium text-sky-300 hover:text-sky-200 bg-sky-950/60 border border-sky-500/30 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
                title="Download Printable Vector PDF Map of this Campus"
              >
                <FileDown className="w-3 h-3" />
                <span>Vector PDF</span>
              </button>

              {activeCampus.mapLinks[0] && (
                <a
                  href={activeCampus.mapLinks[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1"
                  title={activeCampus.mapLinks[0].label}
                >
                  <ExternalLink className="w-3 h-3 text-sky-400" />
                  <span>Official Map</span>
                </a>
              )}
            </div>

            {pdfToast && (
              <div className="mt-1.5 text-[11px] text-emerald-300 font-mono-tabular">
                ✓ {pdfToast}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3B. Floating City of London 3D Geospatial & Realistic Distance Matrix Panel (Top-Right when London 3D Map is active) */}
      {showLondonCityMap && activeModal === 'none' && (
        <aside
          aria-label="London 3D Geospatial Locations and Inter-University Distance Matrix"
          data-testid="london-city-map-panel"
          className="fixed top-16 right-6 z-10 w-full max-w-[395px] max-h-[calc(100vh-15rem)] overflow-y-auto bg-[#0B0F19]/95 border border-sky-500/40 rounded-xl p-3.5 shadow-2xl pointer-events-auto space-y-2.5 text-slate-100"
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                AccuCities London 2025 3D + Apple Maps 3D + OSM/OS
              </div>
              <h2 className="text-xs font-bold text-white mt-0.5">
                7 London Campuses & 8 Iconic 3D Landmarks Across London
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowLondonCityMap(false)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md whitespace-nowrap shrink-0"
            >
              Zoom to Campus
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[10px] bg-slate-900/90 border border-slate-800 rounded-md px-2.5 py-1.5">
            <span className="text-slate-300">
              3D Sources: <strong className="text-white">AccuCities 2025 CAD</strong> ·{' '}
              <strong className="text-white">Apple Maps 3D</strong>
            </span>
            <a
              href="https://accucities.com/free-3d-model-of-london-2025/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1 shrink-0"
            >
              <span>AccuCities 2025</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          {/* 7 London University Campuses Geospatial Cards (WGS84, OS National Grid EPSG:27700, OpenUPRN, London 3D World XZ) */}
          <div className="space-y-1.5">
            {LONDON_UNIVERSITY_GEO_LOCATIONS.map((geo) => {
              const isSelected = geo.campusId === activeCampus.id;
              return (
                <div
                  key={geo.campusId}
                  className={`p-2.5 rounded-lg border transition-colors ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-400'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: geo.accentColor }}
                      />
                      <span className="text-xs font-bold text-white truncate">
                        {geo.shortName}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                        {geo.postcode}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const geojson = exportCampusOsmGeoJson(geo);
                          const blob = new Blob([geojson], { type: 'application/geo+json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${geo.shortName.replace(/\s+/g, '_')}_OSM_3D.geojson`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(url), 3000);
                        }}
                        className="px-2 py-0.5 text-[10px] font-medium text-sky-300 bg-slate-950 border border-slate-700 hover:border-sky-400 rounded"
                        title="Download OpenStreetMap + Ordnance Survey 3D GeoJSON polygons"
                      >
                        OSM GeoJSON
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectUniversityAndCampus(geo.universityId, geo.campusId, true)
                        }
                        className="px-2 py-0.5 text-[10px] font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded"
                      >
                        Fly to Campus
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] font-mono-tabular text-slate-300">
                    <span>
                      WGS84: {geo.lat.toFixed(4)}°N, {Math.abs(geo.lng).toFixed(4)}°W
                    </span>
                    <span className="text-right text-emerald-300">
                      London 3D XZ: [{geo.londonWorldXZ[0]}, {geo.londonWorldXZ[1]}]
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400 font-mono-tabular">
                    <span>
                      OS Grid: E{geo.osEasting} N{geo.osNorthing}
                    </span>
                    <span>
                      UPRN: {geo.osOpenUprn} · {geo.elevationAodM}m AOD
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 8 AccuCities 2025 & Apple Maps 3D Iconic London Landmarks */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              AccuCities 2025 & Apple Maps 3D London Landmarks
            </div>
            <div className="grid grid-cols-2 gap-1">
              {LONDON_3D_ICONIC_LANDMARKS.map((lm) => {
                const nearGeo = LONDON_UNIVERSITY_GEO_LOCATIONS.find(
                  (g) => g.campusId === lm.nearCampusId
                );
                return (
                  <button
                    key={lm.id}
                    type="button"
                    onClick={() => {
                      if (nearGeo) {
                        handleSelectUniversityAndCampus(
                          nearGeo.universityId,
                          nearGeo.campusId,
                          true
                        );
                      }
                    }}
                    className="p-1.5 bg-slate-900/85 hover:bg-slate-800 border border-slate-800 rounded text-left transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] font-semibold text-white truncate">
                      <span className="truncate">★ {lm.shortLabel}</span>
                      <span className="text-amber-300 font-mono-tabular shrink-0">
                        {lm.accucitiesTileId}
                      </span>
                    </div>
                    <div className="text-[9px] font-mono-tabular text-slate-400 truncate">
                      {lm.postcode} · {lm.heightMeters}m · XZ [{lm.londonWorldXZ[0]},{' '}
                      {lm.londonWorldXZ[1]}]
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Realistic Inter-University Distances & Transit Corridors */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
              Real-World Distances Across London (Street & Tube)
            </div>
            <div className="space-y-1">
              {interUniversityRoutes.map((route) => (
                <div
                  key={`${route.fromCampusId}-${route.toCampusId}`}
                  className="p-2 bg-slate-900/80 border border-slate-800/90 rounded-md text-[11px]"
                >
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span>
                      {route.fromLabel} ↔ {route.toLabel}
                    </span>
                    <span className="font-mono-tabular text-emerald-300">
                      {route.distanceKm} km ({route.distanceMiles} mi)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 font-mono-tabular mt-0.5">
                    <span>Walk: {route.walkMinutes} min · Cycle: {route.cycleMinutes} min</span>
                    <span className="text-sky-300">Tube: {route.tubeMinutes} min</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {route.tubeLine} · {route.viaCorridor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* 4. Contextual Modal / Drawer Overlay */}
      <OverlayPanels
        activeModal={activeModal}
        onCloseModal={() => setActiveModal('none')}
        university={activeUniversity}
        campus={activeCampus}
        buildings={buildings}
        pathways={activeCampus.pathways}
        selectedBuildingId={selectedBuilding.id}
        selectedFloorNumber={selectedFloorNumber}
        onSelectBuildingAndFloor={handleSelectBuildingAndFloor}
        onReserveSeat={handleReserveSeat}
        onAddSynthesizedBuilding={handleAddSynthesizedBuilding}
        solarHour={solarHour}
        selectedVoiceName={selectedVoiceName}
        onChangeVoiceName={setSelectedVoiceName}
      />

      {/* 5. Unified Collapsible Bottom Control Dock */}
      <UnifiedControlDock
        buildings={buildings}
        selectedBuildingId={selectedBuilding.id}
        onSelectBuilding={handleSelectBuilding}
        solarHour={solarHour}
        onChangeSolarHour={setSolarHour}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
        showStudentFlow={showStudentFlow}
        onToggleStudentFlow={() => setShowStudentFlow((prev) => !prev)}
        showRadarPulse={showRadarPulse}
        onToggleRadarPulse={() => setShowRadarPulse((prev) => !prev)}
        showDustMotes={showDustMotes}
        onToggleDustMotes={() => setShowDustMotes((prev) => !prev)}
        showTopoContours={showTopoContours}
        onToggleTopoContours={() => setShowTopoContours((prev) => !prev)}
        showRoadsAndPaths={showRoadsAndPaths}
        onToggleRoadsAndPaths={() => setShowRoadsAndPaths((prev) => !prev)}
        showFoliage={showFoliage}
        onToggleFoliage={() => setShowFoliage((prev) => !prev)}
        showUrbanContext={showUrbanContext}
        onToggleUrbanContext={() => setShowUrbanContext((prev) => !prev)}
        showBloomAndFog={showBloomAndFog}
        onToggleBloomAndFog={() => setShowBloomAndFog((prev) => !prev)}
        onSetAllEffects={handleSetAllEffects}
        isDemoPlaying={isDemoPlaying}
        onToggleDemo={handleToggleDemo}
        isAutoReplay={isAutoReplay}
        onToggleAutoReplay={handleToggleAutoReplay}
        cameraPreset={cameraPreset}
        onChangeCameraPreset={setCameraPreset}
        soundPreset={soundPreset}
        onChangeSoundPreset={handleSoundPresetChange}
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => setIsDockCollapsed((prev) => !prev)}
        onOpenFloorInspector={() => setActiveModal('floor-inspector')}
      />
    </main>
  );
}
