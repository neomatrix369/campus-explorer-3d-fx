/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Layers,
  Clock,
  Sun,
  Moon,
  Sunset,
  Waves,
  Camera,
  Download,
  CheckSquare,
  Square,
  Trash2,
  Globe,
  Cpu,
  BookOpen,
} from 'lucide-react';
import {
  UNIVERSITIES,
  CampusBuilding,
  UniversityProfile,
  CampusProfile,
} from './data/campusData';
import {
  calculateSunState,
  Captured3DPhoto,
  DEMO_WALKTHROUGH_STEPS,
  formatWalkthroughSpeechScript,
  getBuildingAggregateMetrics,
  getTopographyInfo,
  getWalkthroughStep,
  reserveStudySeat,
  SCENIC_3D_VANTAGE_POINTS,
  Scenic3DVantagePoint,
} from './utils/campusLogic';
import { triggerCampusPdfDownload } from './utils/pdfMapGenerator';
import { spatialAudio, SoundscapePreset } from './utils/spatialAudioEngine';
import { CampusScene3D, CameraViewPreset } from './components/CampusScene3D';
import { UnifiedControlDock, formatSolarHour } from './components/UnifiedControlDock';
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
  LONDON_RIVERS_AND_STREAMS_3D,
  LONDON_THAMES_BRIDGES_3D,
  LONDON_UNIVERSITY_GEO_LOCATIONS,
} from './utils/londonOsmGeojson';
import {
  GEMINI_NEURAL_VOICES,
  GeminiNeuralVoiceName,
  isNeuralVoiceCurrentlyActive,
  prefetchGeminiNeuralVoice,
} from './utils/neuralVoiceClient';
import { GroundMapRealismStyle } from './utils/proceduralTextures';
import { GoogleSatelliteHybridPanel } from './components/GoogleSatelliteHybridPanel';
import {
  getGeminiTelemetrySnapshot,
  resetGeminiTelemetry,
  subscribeGeminiTelemetry,
} from './utils/geminiTelemetryTracker';

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

  // Memoize 7-campus London buildings, roads, and pathways so React re-renders never trigger 3D scene rebuilds/flicker
  const allLondonBuildings: CampusBuilding[] = useMemo(
    () =>
      UNIVERSITIES.flatMap((u) =>
        u.campuses.flatMap((c) => campusBuildingsMap[c.id] || c.buildings)
      ),
    [campusBuildingsMap]
  );
  const allLondonRoads = useMemo(
    () => UNIVERSITIES.flatMap((u) => u.campuses.flatMap((c) => c.roads)),
    []
  );
  const allLondonPathways = useMemo(
    () => UNIVERSITIES.flatMap((u) => u.campuses.flatMap((c) => c.pathways)),
    []
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    buildings[0]?.id || 'ucl-wilkins-main-lib'
  );
  const [selectedFloorNumber, setSelectedFloorNumber] = useState<number | null>(null);

  // Default to atmospheric golden hour (17.25 = 17:15) so topography, trees, roads, and facades shine
  const [solarHour, setSolarHour] = useState<number>(17.25);
  const [isAutoSolarCycle, setIsAutoSolarCycle] = useState<boolean>(false);

  // 10 Individual Visual Effects & 3D World Feature Toggles (including River Thames & London Rivers/Streams)
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showStudentFlow, setShowStudentFlow] = useState<boolean>(true);
  const [showRadarPulse, setShowRadarPulse] = useState<boolean>(true);
  const [showDustMotes, setShowDustMotes] = useState<boolean>(true);
  const [showTopoContours, setShowTopoContours] = useState<boolean>(true);
  const [showRoadsAndPaths, setShowRoadsAndPaths] = useState<boolean>(true);
  const [showFoliage, setShowFoliage] = useState<boolean>(true);
  const [showUrbanContext, setShowUrbanContext] = useState<boolean>(true);
  const [showBloomAndFog, setShowBloomAndFog] = useState<boolean>(true);
  const [showRiversAndStreams, setShowRiversAndStreams] = useState<boolean>(true);
  const [focusedRiverId, setFocusedRiverId] = useState<string | null>(null);
  const [groundMapStyle, setGroundMapStyle] =
    useState<GroundMapRealismStyle>('architectural');

  // Interactive Environment Offsets (Tempered default bloomIntensity = 0.28 for crisp day & night clarity)
  const [waterLevelOffset, setWaterLevelOffset] = useState<number>(0);
  const [foliageHueOffset, setFoliageHueOffset] = useState<number>(0);
  const [bloomIntensity, setBloomIntensity] = useState<number>(0.28);

  // Ergonomic Right Inspector Tab ('floors' | 'rivers' | 'satellite' | 'ai-telemetry') & Docs Modal
  const [rightPanelTab, setRightPanelTab] = useState<
    'floors' | 'rivers' | 'satellite' | 'ai-telemetry'
  >('floors');
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [geminiTelemetry, setGeminiTelemetry] = useState(() =>
    getGeminiTelemetrySnapshot()
  );

  useEffect(() => {
    return subscribeGeminiTelemetry(() => {
      setGeminiTelemetry(getGeminiTelemetrySnapshot());
    });
  }, []);

  // 3D Photo Studio & Multi-Angle Batch Capture State (Take 3-5 Pictures at a time & download 1 or more)
  const [isPhotoStudioOpen, setIsPhotoStudioOpen] = useState<boolean>(false);
  const [selectedVantageId, setSelectedVantageId] = useState<string>(
    SCENIC_3D_VANTAGE_POINTS[1].id
  );
  const [photoBatchSize, setPhotoBatchSize] = useState<number>(4);
  const [photoIncludeLightingCycle, setPhotoIncludeLightingCycle] =
    useState<boolean>(true);
  const [capturedPhotos, setCapturedPhotos] = useState<Captured3DPhoto[]>([]);
  const photoCaptureFnRef = useRef<
    | ((options: {
        vantage: Scenic3DVantagePoint;
        count: number;
        includeLightingCycle: boolean;
      }) => Captured3DPhoto[])
    | null
  >(null);

  // City of London 3D Macro Map Toggle (Shows panoramic London 3D view + Distance Matrix)
  const [showLondonCityMap, setShowLondonCityMap] = useState<boolean>(false);

  // Argon + Gemini 3.8 Neural Voice Persona State (English Only, default aoede-real)
  const [selectedVoiceName, setSelectedVoiceName] =
    useState<GeminiNeuralVoiceName>('aoede-real');
  const [isSpeakingSample, setIsSpeakingSample] = useState<boolean>(false);

  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('overview');
  const [soundPreset, setSoundPreset] = useState<SoundscapePreset>('muted');

  // Guided Demo Walkthrough & Auto-Replay State (Strictly Mutually Exclusive — never run together)
  const [isDemoPlaying, setIsDemoPlaying] = useState<boolean>(false);
  const [isAutoReplay, setIsAutoReplay] = useState<boolean>(false);
  const [demoStepIndex, setDemoStepIndex] = useState<number>(0);
  const [demoVoiceNarration, setDemoVoiceNarration] = useState<boolean>(true);

  // Independent Collapsible HUD Panels: Left Campus HUD, Right Telemetry/Routes HUD, Bottom 3D FX Dock
  const [isLeftHudCollapsed, setIsLeftHudCollapsed] = useState<boolean>(false);
  const [isRightHudCollapsed, setIsRightHudCollapsed] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [autoCollapseIdle, setAutoCollapseIdle] = useState<boolean>(true);
  const [hudChoreographyLabel, setHudChoreographyLabel] = useState<string>(
    'All Controls Expanded'
  );
  const [quickReserveNotice, setQuickReserveNotice] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<ActiveModalType>('none');
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  const isAllHudCollapsed =
    isLeftHudCollapsed && isRightHudCollapsed && isDockCollapsed;
  const isAllHudExpanded =
    !isLeftHudCollapsed && !isRightHudCollapsed && !isDockCollapsed;

  const lastHudInteractionRef = useRef<number>(Date.now());
  const isHoveringHudRef = useRef<boolean>(false);
  const midStepHudAppliedRef = useRef<boolean>(false);

  const markHudInteraction = useCallback(() => {
    lastHudInteractionRef.current = Date.now();
  }, []);

  const handleCollapseAllControls = useCallback(() => {
    markHudInteraction();
    setIsLeftHudCollapsed(true);
    setIsRightHudCollapsed(true);
    setIsDockCollapsed(true);
    setHudChoreographyLabel('Collapse All · Full 3D Viewport');
  }, [markHudInteraction]);

  const handleExpandAllControls = useCallback(() => {
    markHudInteraction();
    setIsLeftHudCollapsed(false);
    setIsRightHudCollapsed(false);
    setIsDockCollapsed(false);
    setHudChoreographyLabel('Expand All · Full Command Workspace');
  }, [markHudInteraction]);

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
  const voiceStartedAtRef = useRef<number | null>(null);
  const voiceDurationMsRef = useRef<number>(6500);
  const voiceFinishedAtRef = useRef<number | null>(null);
  const [voiceSyncPhase, setVoiceSyncPhase] = useState<
    'idle' | 'synthesizing' | 'speaking' | 'dwelling'
  >('idle');
  const [voiceProgressPct, setVoiceProgressPct] = useState<number>(0);

  // Pre-warm current and next walkthrough steps in the background when voice changes or on mount
  useEffect(() => {
    const step0 = getWalkthroughStep(demoStepIndex);
    const step1 = getWalkthroughStep(demoStepIndex + 1);
    void prefetchGeminiNeuralVoice(
      formatWalkthroughSpeechScript(step0),
      selectedVoiceName,
      true
    );
    void prefetchGeminiNeuralVoice(
      formatWalkthroughSpeechScript(step1),
      selectedVoiceName,
      true
    );
  }, [selectedVoiceName, demoStepIndex]);

  const applyWalkthroughStep = useCallback(
    (
      stepIdx: number,
      overrideVoiceName?: GeminiNeuralVoiceName,
      forceSpeak?: boolean,
      applyHudChoreography = true
    ) => {
      stopNarrationSpeech();
      const step = getWalkthroughStep(stepIdx);
      const activeVoice = overrideVoiceName || selectedVoiceName;
      const shouldSpeak = forceSpeak !== undefined ? forceSpeak : demoVoiceNarration;

      stepStartedAtRef.current = Date.now();
      voiceStartedAtRef.current = null;
      voiceFinishedAtRef.current = null;
      midStepHudAppliedRef.current = false;
      setVoiceProgressPct(0);

      setDemoStepIndex(step.stepIndex);
      setSelectedUniversityId(step.universityId);
      setSelectedCampusId(step.campusId);
      setSelectedBuildingId(step.buildingId);
      setSelectedFloorNumber(step.floorNumber);
      setSolarHour(step.solarHour);
      setShowLondonCityMap(false);
      setCameraPreset(step.cameraPreset);

      // Choreograph HUD controls automatically during the walkthrough:
      // Each step starts with its tailored HUD layout (individual panel, Collapse All, or Expand All)
      if (applyHudChoreography) {
        setIsLeftHudCollapsed(step.hudState.leftCollapsed);
        setIsRightHudCollapsed(step.hudState.rightCollapsed);
        setIsDockCollapsed(step.hudState.dockCollapsed);
        setHudChoreographyLabel(step.hudState.choreographyLabel);
      }

      // Immediately pre-fetch the upcoming two walkthrough stops in the background so transitions have zero lag
      const nextStep1 = getWalkthroughStep(step.stepIndex + 1);
      const nextStep2 = getWalkthroughStep(step.stepIndex + 2);
      void prefetchGeminiNeuralVoice(
        formatWalkthroughSpeechScript(nextStep1),
        activeVoice,
        true
      );
      void prefetchGeminiNeuralVoice(
        formatWalkthroughSpeechScript(nextStep2),
        activeVoice,
        true
      );

      if (shouldSpeak) {
        setIsSpeakingSample(true);
        setVoiceSyncPhase('synthesizing');
        speakNarrationText(
          formatWalkthroughSpeechScript(step),
          () => {
            voiceFinishedAtRef.current = Date.now();
            setIsSpeakingSample(false);
            setVoiceProgressPct(100);
            setVoiceSyncPhase('dwelling');
          },
          activeVoice,
          (_engineLabel, durationMs) => {
            voiceStartedAtRef.current = Date.now();
            voiceDurationMsRef.current = Math.max(2500, durationMs);
            setVoiceSyncPhase('speaking');
          },
          true
        );
      } else {
        voiceFinishedAtRef.current = Date.now();
        setIsSpeakingSample(false);
        setVoiceSyncPhase('idle');
      }
    },
    [demoVoiceNarration, selectedVoiceName]
  );

  // Keep Voice Progress Bar, Mid-Step HUD Choreography & Walkthrough Step Advancement locked in sync:
  useEffect(() => {
    if (!isDemoPlaying && !isAutoReplay && !isSpeakingSample) {
      return;
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsedSinceStepStart = now - stepStartedAtRef.current;

      // Update live synchronized progress bar while voice is actively speaking
      let currentPct = voiceProgressPct;
      if (isSpeakingSample && voiceStartedAtRef.current !== null) {
        const elapsedVoice = now - voiceStartedAtRef.current;
        currentPct = Math.min(
          98,
          Math.max(4, Math.round((elapsedVoice / voiceDurationMsRef.current) * 100))
        );
        setVoiceProgressPct(currentPct);
      }

      // Mid-step HUD Choreography: ~52% through the spoken narration (or after 3.2s when muted),
      // transition the HUD controls (e.g. expanding a specific panel, Collapse All, or Expand All)
      if ((isDemoPlaying || isAutoReplay) && !midStepHudAppliedRef.current) {
        const shouldApplyMidStep = demoVoiceNarration
          ? currentPct >= 52 || elapsedSinceStepStart >= 4800
          : elapsedSinceStepStart >= 3200;

        if (shouldApplyMidStep) {
          midStepHudAppliedRef.current = true;
          const activeStep = getWalkthroughStep(demoStepIndex);
          setIsLeftHudCollapsed(activeStep.midStepHudState.leftCollapsed);
          setIsRightHudCollapsed(activeStep.midStepHudState.rightCollapsed);
          setIsDockCollapsed(activeStep.midStepHudState.dockCollapsed);
          setHudChoreographyLabel(activeStep.midStepHudState.choreographyLabel);
        }
      }

      if (!isDemoPlaying && !isAutoReplay) return;

      // Never advance while voice is still loading, decoding, or speaking
      if (isSpeakingSample || isNeuralVoiceCurrentlyActive()) {
        return;
      }

      if (demoVoiceNarration) {
        // Require voice completion + a natural 1.1s breathing pause (and 4.5s minimum camera flight floor)
        if (voiceFinishedAtRef.current === null) {
          return;
        }
        if (now - voiceFinishedAtRef.current < 1100 || elapsedSinceStepStart < 4500) {
          return;
        }
      } else {
        // When voice narration is muted, dwell 6.5s per stop for camera flight & inspection
        if (elapsedSinceStepStart < 6500) {
          return;
        }
      }

      const nextIdx = demoStepIndex + 1;
      if (isDemoPlaying && nextIdx >= DEMO_WALKTHROUGH_STEPS.length) {
        setIsDemoPlaying(false);
        setVoiceSyncPhase('idle');
        setVoiceProgressPct(0);
        // Expand all controls at the end of the hackathon demo so judges have full interactive access
        setIsLeftHudCollapsed(false);
        setIsRightHudCollapsed(false);
        setIsDockCollapsed(false);
        setHudChoreographyLabel('Expand All · Walkthrough Complete');
        return;
      }
      applyWalkthroughStep(nextIdx);
    }, 180);

    return () => window.clearInterval(interval);
  }, [
    isDemoPlaying,
    isAutoReplay,
    isSpeakingSample,
    demoVoiceNarration,
    demoStepIndex,
    voiceProgressPct,
    applyWalkthroughStep,
  ]);

  // Auto-collapse unused controls after 15 seconds of inactivity (when not in a modal or active walkthrough)
  useEffect(() => {
    if (!autoCollapseIdle || isDemoPlaying || isAutoReplay || activeModal !== 'none') {
      return;
    }

    const idleTimer = window.setInterval(() => {
      if (isHoveringHudRef.current) {
        lastHudInteractionRef.current = Date.now();
        return;
      }
      const idleMs = Date.now() - lastHudInteractionRef.current;
      if (idleMs >= 15000 && !isAllHudCollapsed) {
        setIsLeftHudCollapsed(true);
        setIsRightHudCollapsed(true);
        setIsDockCollapsed(true);
        setHudChoreographyLabel('Auto-Collapsed (Idle · Click to Expand)');
      }
    }, 1500);

    return () => window.clearInterval(idleTimer);
  }, [
    autoCollapseIdle,
    isDemoPlaying,
    isAutoReplay,
    activeModal,
    isAllHudCollapsed,
  ]);

  // Keyboard shortcuts: 'H' toggles Collapse All / Expand All, 'Escape' closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        if (isAllHudCollapsed) {
          handleExpandAllControls();
        } else {
          handleCollapseAllControls();
        }
      } else if (e.key === 'Escape') {
        setActiveModal('none');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAllHudCollapsed, handleExpandAllControls, handleCollapseAllControls]);

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

  // Automatic 24-Hour Day / Dusk / Night Solar Cycle Timer when isAutoSolarCycle is enabled
  useEffect(() => {
    if (!isAutoSolarCycle) return;
    const timer = window.setInterval(() => {
      setSolarHour((prev) => Number(((prev + 0.15) % 24).toFixed(2)));
    }, 180);
    return () => window.clearInterval(timer);
  }, [isAutoSolarCycle]);

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
    setShowRiversAndStreams(enabled);
  };

  const handleSelectRiver = useCallback(
    (riverId: string) => {
      markHudInteraction();
      setShowRiversAndStreams(true);
      setFocusedRiverId((prev) => (prev === riverId ? null : riverId));
      const river = LONDON_RIVERS_AND_STREAMS_3D.find((r) => r.id === riverId);
      if (river && river.nearCampusIds.length > 0) {
        const nearGeo = LONDON_UNIVERSITY_GEO_LOCATIONS.find(
          (g) => g.campusId === river.nearCampusIds[0]
        );
        if (nearGeo) {
          setSelectedUniversityId(nearGeo.universityId);
          setSelectedCampusId(nearGeo.campusId);
        }
      }
      spatialAudio.playRadarPing(587.33);
    },
    [markHudInteraction]
  );

  const handleFlyToVantagePoint = useCallback(
    (vantage: Scenic3DVantagePoint) => {
      markHudInteraction();
      setSelectedVantageId(vantage.id);
      if (vantage.id === 'vantage-london-macro-rivers') {
        setShowLondonCityMap(true);
        setShowRiversAndStreams(true);
        setFocusedRiverId(null);
        return;
      }
      setShowLondonCityMap(false);
      if (vantage.riverId) {
        setShowRiversAndStreams(true);
        setFocusedRiverId(vantage.riverId);
      } else {
        setFocusedRiverId(null);
      }
      if (vantage.universityId && vantage.campusId) {
        setSelectedUniversityId(vantage.universityId);
        setSelectedCampusId(vantage.campusId);
      }
      if (vantage.buildingId) {
        setSelectedBuildingId(vantage.buildingId);
        setCameraPreset('focus-building');
      } else {
        setCameraPreset('overview');
      }
      spatialAudio.playRadarPing(659.25);
    },
    [markHudInteraction]
  );

  const handleTakeBatch3DPhotos = useCallback(() => {
    markHudInteraction();
    const vantage =
      SCENIC_3D_VANTAGE_POINTS.find((v) => v.id === selectedVantageId) ||
      SCENIC_3D_VANTAGE_POINTS[0];
    if (!photoCaptureFnRef.current) return;
    const newBatch = photoCaptureFnRef.current({
      vantage,
      count: photoBatchSize,
      includeLightingCycle: photoIncludeLightingCycle,
    });
    if (newBatch.length > 0) {
      setCapturedPhotos((prev) => [...newBatch, ...prev]);
      setPdfToast(`Captured ${newBatch.length} 3D Pictures at ${vantage.title}`);
      setTimeout(() => setPdfToast(null), 4000);
      spatialAudio.playRadarPing(880);
    }
  }, [
    markHudInteraction,
    selectedVantageId,
    photoBatchSize,
    photoIncludeLightingCycle,
  ]);

  const handleDownloadSinglePhoto = useCallback((photo: Captured3DPhoto) => {
    const a = document.createElement('a');
    a.href = photo.dataUrl;
    a.download = photo.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setPdfToast(`Downloaded ${photo.filename}`);
    setTimeout(() => setPdfToast(null), 3500);
  }, []);

  const handleDownloadSelectedPhotos = useCallback(() => {
    const selectedList = capturedPhotos.filter((p) => p.selected);
    if (selectedList.length === 0) return;
    selectedList.forEach((photo, idx) => {
      window.setTimeout(() => {
        const a = document.createElement('a');
        a.href = photo.dataUrl;
        a.download = photo.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, idx * 180);
    });
    setPdfToast(
      `Downloading ${selectedList.length} Selected 3D ${
        selectedList.length === 1 ? 'Picture' : 'Pictures'
      }...`
    );
    setTimeout(() => setPdfToast(null), 4000);
  }, [capturedPhotos]);

  const handleDownloadContactSheet = useCallback(async () => {
    const selectedList = capturedPhotos.filter((p) => p.selected);
    if (selectedList.length === 0) return;
    const cols = selectedList.length <= 3 ? selectedList.length : 2;
    const rows = Math.ceil(selectedList.length / cols);
    const cellW = 640;
    const cellH = 380;
    const pad = 20;
    const headerH = 58;
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = cols * cellW + (cols + 1) * pad;
    sheetCanvas.height = headerH + rows * cellH + (rows + 1) * pad;
    const ctx = sheetCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px Inter, system-ui, sans-serif';
    ctx.fillText(
      `CampusExplorer 3D FX — London 4-University Multi-Shot 3D Contact Sheet (${selectedList.length} Captures)`,
      pad,
      36
    );

    await Promise.all(
      selectedList.map(
        (photo, idx) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const x = pad + col * (cellW + pad);
              const y = headerH + pad + row * (cellH + pad);
              ctx.drawImage(img, x, y, cellW, cellH);
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, cellW, cellH);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = photo.dataUrl;
          })
      )
    );

    const sheetUrl = sheetCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = sheetUrl;
    a.download = `London3D_MultiShot_ContactSheet_${selectedList.length}Photos.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setPdfToast(`Downloaded ${selectedList.length}-Photo Contact Sheet PNG`);
    setTimeout(() => setPdfToast(null), 4000);
  }, [capturedPhotos]);

  // Mutually exclusive Show Demo vs Auto-Replay handlers so they never run at the same time
  const handleToggleDemo = () => {
    if (isDemoPlaying) {
      setIsDemoPlaying(false);
      stopNarrationSpeech();
      setIsSpeakingSample(false);
      setVoiceSyncPhase('idle');
      setVoiceProgressPct(0);
    } else {
      // Turn off Auto-Replay so Show Demo and Auto-Replay never work at the same time
      setIsAutoReplay(false);
      stopNarrationSpeech();
      setShowLondonCityMap(false);
      setDemoVoiceNarration(true);
      setIsDemoPlaying(true);
      applyWalkthroughStep(demoStepIndex, selectedVoiceName, true);
    }
  };

  const handleToggleAutoReplay = () => {
    if (isAutoReplay) {
      setIsAutoReplay(false);
      stopNarrationSpeech();
      setIsSpeakingSample(false);
      setVoiceSyncPhase('idle');
      setVoiceProgressPct(0);
    } else {
      // Turn off Show Demo so Show Demo and Auto-Replay never work at the same time
      setIsDemoPlaying(false);
      stopNarrationSpeech();
      setShowLondonCityMap(false);
      setDemoVoiceNarration(true);
      setIsAutoReplay(true);
      applyWalkthroughStep(demoStepIndex, selectedVoiceName, true);
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
    // If a walkthrough is currently active, keep it running and toggle/replay synchronized step narration
    if (isDemoPlaying || isAutoReplay) {
      if (isSpeakingSample) {
        stopNarrationSpeech();
        setIsSpeakingSample(false);
        setDemoVoiceNarration(false);
        voiceFinishedAtRef.current = Date.now();
        setVoiceSyncPhase('idle');
        setVoiceProgressPct(0);
      } else {
        setDemoVoiceNarration(true);
        applyWalkthroughStep(demoStepIndex, selectedVoiceName, true);
      }
      return;
    }

    if (isSpeakingSample) {
      stopNarrationSpeech();
      setIsSpeakingSample(false);
      setVoiceSyncPhase('idle');
      setVoiceProgressPct(0);
      return;
    }

    // When not in demo mode, synchronize the 3D view & walkthrough step with the spoken narration
    const matchingStepIdx = DEMO_WALKTHROUGH_STEPS.findIndex(
      (s) => s.buildingId === selectedBuilding.id
    );
    if (matchingStepIdx >= 0) {
      applyWalkthroughStep(matchingStepIdx, selectedVoiceName, true);
      return;
    }

    setShowLondonCityMap(false);
    setCameraPreset(selectedFloorNumber !== null ? 'floor-cutaway' : 'focus-building');
    setIsSpeakingSample(true);
    setVoiceSyncPhase('synthesizing');
    setVoiceProgressPct(0);
    speakNarrationText(
      `Welcome to ${activeUniversity.name}, ${activeCampus.shortName} in ${activeGeoLoc.borough}. ${selectedBuilding.name} currently has ${selectedMetrics.availableSeats} open seats with a quietest floor of ${selectedMetrics.minNoiseDba} dBA.`,
      () => {
        voiceFinishedAtRef.current = Date.now();
        setIsSpeakingSample(false);
        setVoiceProgressPct(100);
        setVoiceSyncPhase('idle');
      },
      selectedVoiceName,
      (_engineLabel, durationMs) => {
        voiceStartedAtRef.current = Date.now();
        voiceDurationMsRef.current = Math.max(2500, durationMs);
        setVoiceSyncPhase('speaking');
      },
      true
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
      {/* 1. Full-Viewport Three.js WebGL Digital Twin Canvas (Unified 3D Map of London with All 7 Campuses & 12 London Rivers/Streams) */}
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
        showRiversAndStreams={showRiversAndStreams}
        focusedRiverId={focusedRiverId}
        groundMapStyle={groundMapStyle}
        terrainPreset={activeCampus.terrainPreset}
        waterLevelY={activeCampus.waterLevelY + waterLevelOffset}
        foliageHue={activeCampus.foliageHue + foliageHueOffset}
        roads={allLondonRoads}
        pathways={allLondonPathways}
        bloomIntensity={bloomIntensity}
        cameraPreset={cameraPreset}
        walkthroughStepIndex={demoStepIndex}
        isWalkthroughActive={isDemoPlaying || isAutoReplay || isSpeakingSample}
        onSelectBuilding={(bId) => {
          setFocusedRiverId(null);
          handleSelectBuilding(bId);
        }}
        onSelectUniversityFromCityMap={(uniId, campId) => {
          setFocusedRiverId(null);
          handleSelectUniversityAndCampus(uniId, campId, true);
        }}
        onSelectRiver={handleSelectRiver}
        onRegisterPhotoCapture={(fn) => {
          photoCaptureFnRef.current = fn;
        }}
      />

      {/* 2. Ergonomic Top Navigation Bar (1440px-Safe, Zero Horizontal Overflow) */}
      <header
        onMouseEnter={() => {
          isHoveringHudRef.current = true;
          markHudInteraction();
        }}
        onMouseLeave={() => {
          isHoveringHudRef.current = false;
        }}
        className="fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-3 lg:px-4 py-2 bg-[#070a10]/95 border-b border-slate-800/90 pointer-events-auto"
      >
        {/* Brand + University Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="#viewport"
            onClick={(e) => {
              e.preventDefault();
              markHudInteraction();
              setActiveModal('none');
              setShowLondonCityMap(false);
              setCameraPreset('overview');
            }}
            className="text-sm lg:text-base font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
          >
            CampusExplorer 3D FX
          </a>
          <span className="hidden 2xl:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono-tabular font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded">
            UCL · KCL · Imperial · LSE
          </span>
        </div>

        {/* Center Ergonomic Mode Switcher */}
        <nav
          aria-label="Primary Workspace Modes"
          className="hidden lg:flex items-center gap-2 text-[11px] font-medium text-slate-300"
        >
          <a
            href="#viewport"
            onClick={(e) => {
              e.preventDefault();
              markHudInteraction();
              setActiveModal('none');
              setShowLondonCityMap(false);
              setCameraPreset('overview');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeModal === 'none' && !showLondonCityMap
                ? 'text-white border-b-2 border-sky-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            Campus 3D
          </a>
          <a
            href="#london-city-map"
            data-testid="nav-london-city-map-btn"
            onClick={(e) => {
              e.preventDefault();
              markHudInteraction();
              setActiveModal('none');
              setShowLondonCityMap((prev) => {
                const next = !prev;
                if (next) setIsRightHudCollapsed(false);
                return next;
              });
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1 ${
              showLondonCityMap
                ? 'text-sky-300 border-b-2 border-sky-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            <Compass className="w-3 h-3 text-sky-400" />
            <span>London Map</span>
          </a>
          <button
            type="button"
            data-testid="header-satellite-mode-btn"
            onClick={() => {
              markHudInteraction();
              setIsRightHudCollapsed(false);
              setShowLondonCityMap(false);
              setRightPanelTab('satellite');
              setGroundMapStyle((prev) =>
                prev === 'architectural'
                  ? 'hybrid'
                  : prev === 'hybrid'
                    ? 'satellite'
                    : 'architectural'
              );
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1 ${
              groundMapStyle !== 'architectural' || rightPanelTab === 'satellite'
                ? 'text-emerald-300 border-b-2 border-emerald-400 font-semibold'
                : 'hover:text-white'
            }`}
            title="Cycle Architectural 3D, Google Hybrid (Satellite + Labels), and Satellite ground truth"
          >
            <Globe className="w-3 h-3 text-emerald-400" />
            <span>
              {groundMapStyle === 'hybrid'
                ? 'Hybrid'
                : groundMapStyle === 'satellite'
                  ? 'Satellite'
                  : 'Satellite/Hybrid'}
            </span>
          </button>
          <a
            href="#quiet-finder"
            onClick={(e) => {
              e.preventDefault();
              markHudInteraction();
              setActiveModal(activeModal === 'quiet-finder' ? 'none' : 'quiet-finder');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeModal === 'quiet-finder'
                ? 'text-white border-b-2 border-sky-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            Quiet Finder
          </a>
          <a
            href="#ai-concierge"
            onClick={(e) => {
              e.preventDefault();
              markHudInteraction();
              setActiveModal(activeModal === 'ai-concierge' ? 'none' : 'ai-concierge');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1 ${
              activeModal === 'ai-concierge'
                ? 'text-white border-b-2 border-sky-400 font-semibold'
                : 'hover:text-white'
            }`}
          >
            <Mic className="w-3 h-3 text-emerald-400" />
            <span>Voice & AI</span>
          </a>
          <button
            type="button"
            data-testid="header-ai-telemetry-btn"
            onClick={() => {
              markHudInteraction();
              setIsRightHudCollapsed(false);
              setShowLondonCityMap(false);
              setRightPanelTab('ai-telemetry');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1 ${
              rightPanelTab === 'ai-telemetry'
                ? 'text-amber-300 border-b-2 border-amber-400 font-semibold'
                : 'hover:text-white'
            }`}
            title="Inspect Gemini Input/Output Tokens, Latency (ms) & Cost ($ USD)"
          >
            <Cpu className="w-3 h-3 text-amber-400" />
            <span>AI Cost</span>
          </button>
        </nav>

        {/* Right Compact Controls Group */}
        <div className="flex items-center gap-1 shrink-0">
          {/* HUD Panel Toggles */}
          <div
            className="hidden sm:flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5"
            role="group"
            aria-label="HUD Panel Collapse and Expand Controls"
            data-testid="header-hud-controls"
          >
            <button
              type="button"
              onClick={() => {
                markHudInteraction();
                setIsLeftHudCollapsed((prev) => !prev);
                setHudChoreographyLabel('Custom HUD Layout');
              }}
              data-testid="header-toggle-left-hud-btn"
              title="Toggle Left Campus HUD"
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
                !isLeftHudCollapsed
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Campus
            </button>

            <button
              type="button"
              onClick={() => {
                markHudInteraction();
                setIsRightHudCollapsed((prev) => !prev);
                setHudChoreographyLabel('Custom HUD Layout');
              }}
              data-testid="header-toggle-right-hud-btn"
              title="Toggle Right Inspector Panel"
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
                !isRightHudCollapsed
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Inspector
            </button>

            <button
              type="button"
              onClick={() => {
                markHudInteraction();
                setIsDockCollapsed((prev) => !prev);
                setHudChoreographyLabel('Custom HUD Layout');
              }}
              data-testid="header-toggle-dock-btn"
              title="Toggle Bottom 3D FX Dock"
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors whitespace-nowrap ${
                !isDockCollapsed
                  ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dock
            </button>

            <button
              type="button"
              onClick={handleCollapseAllControls}
              disabled={isAllHudCollapsed}
              data-testid="header-collapse-all-btn"
              title="Collapse all HUD controls (Shortcut: H)"
              className={`flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-semibold rounded transition-colors whitespace-nowrap ${
                isAllHudCollapsed
                  ? 'text-slate-600 cursor-default'
                  : 'text-amber-300 hover:bg-amber-500/15'
              }`}
            >
              <Minimize2 className="w-3 h-3" />
              <span className="hidden 2xl:inline">Hide All</span>
            </button>

            <button
              type="button"
              onClick={handleExpandAllControls}
              disabled={isAllHudExpanded}
              data-testid="header-expand-all-btn"
              title="Expand all HUD controls (Shortcut: H)"
              className={`flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-semibold rounded transition-colors whitespace-nowrap ${
                isAllHudExpanded
                  ? 'text-slate-600 cursor-default'
                  : 'text-emerald-300 hover:bg-emerald-500/15'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden 2xl:inline">Show All</span>
            </button>

            <button
              type="button"
              onClick={() => {
                markHudInteraction();
                setAutoCollapseIdle((prev) => !prev);
              }}
              data-testid="header-auto-collapse-idle-btn"
              aria-pressed={autoCollapseIdle}
              title="Automatically collapse controls when idle for 15 seconds"
              className={`flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-mono-tabular rounded transition-colors whitespace-nowrap ${
                autoCollapseIdle
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Day / Dusk / Night Quick Presets */}
          <div
            className="hidden md:flex items-center gap-0.5 bg-slate-900/95 border border-slate-800 rounded-lg px-1 py-0.5"
            role="group"
            aria-label="Day and Night Lighting Switcher"
            data-testid="header-daylight-controls"
          >
            <button
              type="button"
              data-testid="header-mode-day-btn"
              onClick={() => {
                markHudInteraction();
                setIsAutoSolarCycle(false);
                setSolarHour(13.5);
              }}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                !sunState.isNight && !sunState.isGoldenHour
                  ? 'bg-sky-500/30 text-white border border-sky-400/70'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Tempered Architectural Daylight (13:30)"
            >
              <Sun className="w-3 h-3 text-amber-300" />
              <span>Day</span>
            </button>

            <button
              type="button"
              data-testid="header-mode-dusk-btn"
              onClick={() => {
                markHudInteraction();
                setIsAutoSolarCycle(false);
                setSolarHour(18.0);
              }}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                sunState.isGoldenHour
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/70'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Golden Hour Sunset (18:00)"
            >
              <Sunset className="w-3 h-3 text-amber-400" />
              <span>Dusk</span>
            </button>

            <button
              type="button"
              data-testid="header-mode-night-btn"
              onClick={() => {
                markHudInteraction();
                setIsAutoSolarCycle(false);
                setSolarHour(22.5);
              }}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                sunState.isNight
                  ? 'bg-indigo-500/35 text-indigo-200 border border-indigo-400/70'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Switch to Tempered Night Mode (22:30)"
            >
              <Moon className="w-3 h-3 text-indigo-300" />
              <span>Night</span>
            </button>
          </div>

          {/* 3D Photo Studio Button */}
          <button
            type="button"
            onClick={() => {
              markHudInteraction();
              setIsPhotoStudioOpen((prev) => !prev);
            }}
            data-testid="header-photo-studio-btn"
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              isPhotoStudioOpen
                ? 'bg-fuchsia-500/25 text-fuchsia-200 border-fuchsia-400'
                : 'bg-slate-900 text-fuchsia-200 border-fuchsia-500/40 hover:bg-slate-800'
            }`}
            title="Select interesting 3D positions and take 3–5 pictures at a time to download"
          >
            <Camera className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Photo Studio</span>
            {capturedPhotos.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-fuchsia-500 text-slate-950 text-[10px] font-bold">
                {capturedPhotos.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleDemo}
            data-testid="header-show-demo-btn"
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              isDemoPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/60'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isDemoPlaying ? (
              <>
                <Pause className="w-3 h-3" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>Demo</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              markHudInteraction();
              setActiveModal(
                activeModal === 'blueprint-synthesizer'
                  ? 'none'
                  : 'blueprint-synthesizer'
              );
            }}
            className="px-2 py-1 text-[11px] font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            PDF & 3D
          </button>

          <button
            type="button"
            data-testid="header-docs-btn"
            onClick={() => {
              markHudInteraction();
              setIsDocsModalOpen((prev) => !prev);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-semibold text-slate-200 hover:text-white hover:border-sky-400 transition-colors shrink-0"
            title="View README.md & Technical Architecture Docs with Visual Evidence"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Docs</span>
          </button>
        </div>
      </header>

      {/* 2B. Floating 3D Photo Studio & Multi-Angle Batch Capture Drawer (Select Interesting 3D Positions & Take 3-5 Pictures at a Time) */}
      {isPhotoStudioOpen && (
        <section
          aria-label="3D Photo Studio and Multi-Shot Batch Capture"
          data-testid="photo-studio-drawer"
          onMouseEnter={() => {
            isHoveringHudRef.current = true;
            markHudInteraction();
          }}
          onMouseLeave={() => {
            isHoveringHudRef.current = false;
          }}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-30 w-full max-w-[min(980px,95vw)] max-h-[calc(100vh-8rem)] overflow-y-auto bg-[#0B0F19]/95 border border-fuchsia-500/50 rounded-2xl p-4 shadow-2xl pointer-events-auto text-slate-100 space-y-3 backdrop-blur-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-mono-tabular font-bold uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 rounded">
                  3D Multi-Angle Photo Studio
                </span>
                <span className="text-[11px] font-mono-tabular text-sky-300">
                  Take 3–5 Pictures at a Time · Download 1 or More PNGs
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                Select Interesting 3D Vantage Positions Across UCL, KCL, Imperial, LSE & River Thames
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTakeBatch3DPhotos}
                data-testid="capture-batch-photos-btn"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-fuchsia-400 hover:bg-fuchsia-300 shadow-lg transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Take {photoBatchSize} Pictures Now</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPhotoStudioOpen(false)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-700 hover:text-white"
              >
                Close Studio
              </button>
            </div>
          </div>

          {/* Step 1: Select Interesting 3D Position & Batch Options (3, 4, or 5 Pictures) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                1. Choose Interesting Position in 3D Space (Click to Fly Camera & Frame):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {SCENIC_3D_VANTAGE_POINTS.map((vp) => {
                  const isSel = vp.id === selectedVantageId;
                  return (
                    <button
                      key={vp.id}
                      type="button"
                      data-testid={`vantage-option-${vp.id}`}
                      onClick={() => handleFlyToVantagePoint(vp)}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        isSel
                          ? 'bg-fuchsia-950/50 border-fuchsia-400 text-white ring-1 ring-fuchsia-400/40'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{vp.title}</div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {vp.subtitle}
                      </div>
                      <div className="text-[9px] font-mono-tabular text-fuchsia-300 mt-0.5">
                        3D Target XZ: [{vp.targetXZ[0]}, {vp.targetXZ[1]}] · Orbit R={vp.baseRadius}m
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  2. Multi-Shot Burst Settings (3–5 Pictures):
                </div>
                <div className="flex items-center gap-1.5">
                  {[3, 4, 5].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      data-testid={`batch-count-${cnt}-btn`}
                      onClick={() => setPhotoBatchSize(cnt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        photoBatchSize === cnt
                          ? 'bg-sky-500/25 text-sky-200 border-sky-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {cnt} Pictures
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={photoIncludeLightingCycle}
                    onChange={(e) => setPhotoIncludeLightingCycle(e.target.checked)}
                    className="rounded accent-fuchsia-400"
                  />
                  <span>Capture across Day, Golden Hour & Night lighting</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="text-[10px] text-slate-400">
                  Captures Hero Front, 45° Isometric Orbit, Street-Level, High Drone & Skyline angles simultaneously.
                </div>
                <button
                  type="button"
                  onClick={handleTakeBatch3DPhotos}
                  className="w-full py-2 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture {photoBatchSize}-Shot 3D Burst</span>
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Captured 3D Pictures Gallery & Multi-Photo Download Bar */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Captured 3D Gallery ({capturedPhotos.length} Pictures)</span>
                {capturedPhotos.length > 0 && (
                  <span className="text-[11px] font-mono-tabular text-emerald-300">
                    ({capturedPhotos.filter((p) => p.selected).length} selected for download)
                  </span>
                )}
              </div>

              {capturedPhotos.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCapturedPhotos((prev) =>
                        prev.map((p) => ({ ...p, selected: true }))
                      )
                    }
                    className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 border border-slate-700 text-slate-200 hover:text-white"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCapturedPhotos((prev) =>
                        prev.map((p) => ({ ...p, selected: false }))
                      )
                    }
                    className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    data-testid="download-selected-photos-btn"
                    disabled={capturedPhotos.every((p) => !p.selected)}
                    onClick={handleDownloadSelectedPhotos}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      Download Selected ({capturedPhotos.filter((p) => p.selected).length})
                    </span>
                  </button>
                  <button
                    type="button"
                    data-testid="download-contact-sheet-btn"
                    disabled={capturedPhotos.every((p) => !p.selected)}
                    onClick={handleDownloadContactSheet}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-fuchsia-200 bg-fuchsia-500/20 border border-fuchsia-400/50 hover:bg-fuchsia-500/30 disabled:opacity-40 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Contact Sheet PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCapturedPhotos([])}
                    className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
                    title="Clear captured gallery"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {capturedPhotos.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <div className="text-xs text-slate-300 font-medium">
                  No 3D pictures captured yet. Pick any interesting 3D vantage position above and click{' '}
                  <strong className="text-fuchsia-300">Take {photoBatchSize} Pictures Now</strong>!
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {capturedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    data-testid={`captured-photo-card-${photo.shotNumber}`}
                    className={`rounded-xl border overflow-hidden bg-slate-950/90 transition-colors flex flex-col justify-between ${
                      photo.selected
                        ? 'border-sky-400 ring-1 ring-sky-400/40'
                        : 'border-slate-800 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="relative aspect-video bg-slate-900 overflow-hidden">
                        <img
                          src={photo.dataUrl}
                          alt={`${photo.vantageTitle} — ${photo.angleLabel}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setCapturedPhotos((prev) =>
                              prev.map((p) =>
                                p.id === photo.id ? { ...p, selected: !p.selected } : p
                              )
                            )
                          }
                          className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-[10px] font-semibold text-white flex items-center gap-1"
                        >
                          {photo.selected ? (
                            <CheckSquare className="w-3 h-3 text-sky-400" />
                          ) : (
                            <Square className="w-3 h-3 text-slate-400" />
                          )}
                          <span>
                            Shot {photo.shotNumber}/{photo.totalInBatch}
                          </span>
                        </button>
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/85 text-[9px] font-mono-tabular text-amber-300">
                          {photo.lightingLabel}
                        </span>
                      </div>

                      <div className="p-2 space-y-0.5">
                        <div className="text-[11px] font-bold text-white truncate">
                          {photo.angleLabel}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {photo.vantageTitle}
                        </div>
                        <div className="text-[9px] font-mono-tabular text-slate-500">
                          XYZ [{photo.cameraCoords.join(', ')}] · {photo.capturedAt}
                        </div>
                      </div>
                    </div>

                    <div className="px-2 pb-2 pt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadSinglePhoto(photo)}
                        className="flex-1 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-[10px] font-semibold flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download PNG</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3A. Collapsed Left HUD Quick-Expand & Live Walkthrough Banner (Visible when Left Campus HUD is collapsed) */}
      {isLeftHudCollapsed && (
        <div
          onMouseEnter={() => {
            isHoveringHudRef.current = true;
            markHudInteraction();
          }}
          onMouseLeave={() => {
            isHoveringHudRef.current = false;
          }}
          data-testid="collapsed-left-hud-bar"
          className="fixed top-14 left-6 z-10 w-full max-w-[430px] bg-[#0B0F19]/95 border border-slate-800 rounded-xl p-2.5 shadow-2xl pointer-events-auto space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                markHudInteraction();
                setIsLeftHudCollapsed(false);
                setHudChoreographyLabel('Left Campus HUD Expanded');
              }}
              data-testid="expand-left-hud-btn"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-sky-200 bg-sky-500/20 border border-sky-400/50 hover:bg-sky-500/30 rounded-lg transition-colors whitespace-nowrap"
            >
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Expand Campus HUD ({activeUniversity.shortName})</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleDemo}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  isDemoPlaying
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                }`}
              >
                {isDemoPlaying ? (
                  <>
                    <Pause className="w-3 h-3" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Demo</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  applyWalkthroughStep(demoStepIndex - 1, selectedVoiceName, true)
                }
                aria-label="Previous Walkthrough Stop"
                className="p-1 text-slate-300 hover:text-white bg-slate-800 rounded"
              >
                <SkipBack className="w-3 h-3" />
              </button>
              <span className="text-[11px] font-mono-tabular text-slate-300 px-0.5">
                {currentWalkthroughStep.stepIndex + 1}/{currentWalkthroughStep.totalSteps}
              </span>
              <button
                type="button"
                onClick={() =>
                  applyWalkthroughStep(demoStepIndex + 1, selectedVoiceName, true)
                }
                aria-label="Next Walkthrough Stop"
                className="p-1 text-slate-300 hover:text-white bg-slate-800 rounded"
              >
                <SkipForward className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={handleExpandAllControls}
                className="px-2 py-1 text-[10px] font-semibold text-emerald-300 bg-slate-900 border border-slate-700 hover:border-emerald-400 rounded whitespace-nowrap"
              >
                Expand All
              </button>
            </div>
          </div>

          {/* Live Synchronized Walkthrough Caption & HUD Choreography Badge */}
          <div
            className="p-2 bg-slate-900/95 border border-slate-800 rounded-lg space-y-1 text-[11px]"
            data-testid="walkthrough-voice-sync-banner"
            data-sync-phase={voiceSyncPhase}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded truncate">
                {currentWalkthroughStep.featureBadge}
              </span>
              <span className="text-[10px] font-mono-tabular text-amber-300 truncate">
                {hudChoreographyLabel}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="font-bold text-white truncate">
                Stop {currentWalkthroughStep.stepIndex + 1}/{currentWalkthroughStep.totalSteps}:{' '}
                {currentWalkthroughStep.title}
              </span>
              <span className="text-[10px] font-mono-tabular text-emerald-300 shrink-0">
                {voiceSyncPhase === 'speaking'
                  ? `Voice ${voiceProgressPct}%`
                  : voiceSyncPhase === 'synthesizing'
                    ? 'Syncing…'
                    : 'Synced'}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-snug">
              {currentWalkthroughStep.narration}
            </p>

            {(isDemoPlaying || isAutoReplay || isSpeakingSample) && (
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 transition-all duration-150"
                  style={{
                    width: `${
                      voiceSyncPhase === 'synthesizing' ? 12 : voiceProgressPct
                    }%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3B. Expanded Top-Left University & Campus Selector + Guided Demo & Landmark Card */}
      {!isLeftHudCollapsed && (
        <section
          aria-label="University, Campus, and Landmark Explorer"
          data-testid="left-campus-hud"
          onMouseEnter={() => {
            isHoveringHudRef.current = true;
            markHudInteraction();
          }}
          onMouseLeave={() => {
            isHoveringHudRef.current = false;
          }}
          className="fixed top-14 left-6 z-10 w-full max-w-[420px] bg-[#0B0F19]/95 border border-slate-800 rounded-xl p-3.5 shadow-2xl pointer-events-auto space-y-2.5"
        >
          {/* Panel Header with Individual Collapse + Collapse All / Expand All */}
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/90">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 truncate">
                4-University 3D Command HUD
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleCollapseAllControls}
                className="px-2 py-0.5 text-[10px] font-semibold text-amber-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded"
                title="Collapse all HUD controls (H)"
              >
                Collapse All
              </button>
              <button
                type="button"
                onClick={() => {
                  markHudInteraction();
                  setIsLeftHudCollapsed(true);
                  setHudChoreographyLabel('Left Campus HUD Collapsed');
                }}
                data-testid="collapse-left-hud-btn"
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded"
                title="Collapse this Campus HUD panel"
              >
                <ChevronUp className="w-3 h-3 text-sky-400" />
                <span>Collapse</span>
              </button>
            </div>
          </div>

          {/* University Selector Strip (UCL | King's KCL | Imperial | LSE) */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                1. Select University (4 across London)
              </span>
              <button
                type="button"
                onClick={() => {
                  markHudInteraction();
                  setActiveModal('none');
                  setShowLondonCityMap((prev) => {
                    const next = !prev;
                    if (next) setIsRightHudCollapsed(false);
                    return next;
                  });
                }}
                className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 underline"
              >
                <Compass className="w-3 h-3" />
                <span>
                  {showLondonCityMap
                    ? 'Back to Campus 3D'
                    : 'View All 4 on London 3D Map'}
                </span>
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
                    onClick={() => {
                      markHudInteraction();
                      handleSelectUniversity(uni.id, false);
                    }}
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
                    onClick={() => {
                      markHudInteraction();
                      handleSelectCampus(camp.id);
                    }}
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
                  onClick={() =>
                    applyWalkthroughStep(demoStepIndex - 1, selectedVoiceName, true)
                  }
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
                  onClick={() =>
                    applyWalkthroughStep(demoStepIndex + 1, selectedVoiceName, true)
                  }
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
                  markHudInteraction();
                  const nextVoice = e.target.value as GeminiNeuralVoiceName;
                  setSelectedVoiceName(nextVoice);
                  setDemoVoiceNarration(true);
                  applyWalkthroughStep(demoStepIndex, nextVoice, true, false);
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

            {/* Synchronized Tour Stop Caption, 3D Feature Badge, HUD Choreography & Live Voice Progress Bar */}
            <div
              className="text-[11px] leading-snug pt-1.5 border-t border-slate-800/80 space-y-1"
              data-testid="walkthrough-voice-sync-banner"
              data-sync-phase={voiceSyncPhase}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded truncate">
                  {currentWalkthroughStep.featureBadge}
                </span>
                <span className="text-[10px] font-mono-tabular text-teal-300 truncate">
                  {hudChoreographyLabel}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-amber-300 truncate">
                  Stop {currentWalkthroughStep.stepIndex + 1}/{currentWalkthroughStep.totalSteps}:{' '}
                  {currentWalkthroughStep.title}
                </span>
                <span
                  className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded shrink-0 ${
                    voiceSyncPhase === 'speaking'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : voiceSyncPhase === 'synthesizing'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : isDemoPlaying || isAutoReplay
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {voiceSyncPhase === 'speaking'
                    ? `Speaking · ${voiceProgressPct}%`
                    : voiceSyncPhase === 'synthesizing'
                      ? 'Syncing Audio…'
                      : isDemoPlaying || isAutoReplay
                        ? 'Next Stop…'
                        : 'Synced'}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-snug">
                {currentWalkthroughStep.narration}
              </p>
              {(isDemoPlaying || isAutoReplay || isSpeakingSample) && (
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 transition-all duration-150"
                    style={{
                      width: `${
                        voiceSyncPhase === 'synthesizing' ? 12 : voiceProgressPct
                      }%`,
                    }}
                  />
                </div>
              )}
            </div>
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
                onClick={() => {
                  markHudInteraction();
                  setActiveModal('floor-inspector');
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Inspect {selectedBuilding.floors.length} Floors
              </button>

              <button
                type="button"
                onClick={() => {
                  markHudInteraction();
                  setActiveModal('ai-concierge');
                }}
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

      {/* 3C. Collapsed Right HUD Quick-Expand Pill (Visible when Right Telemetry/Routes HUD is collapsed) */}
      {isRightHudCollapsed && activeModal === 'none' && (
        <div
          onMouseEnter={() => {
            isHoveringHudRef.current = true;
            markHudInteraction();
          }}
          onMouseLeave={() => {
            isHoveringHudRef.current = false;
          }}
          data-testid="collapsed-right-hud-bar"
          className="fixed top-14 right-6 z-10 flex items-center gap-1.5 bg-[#0B0F19]/95 border border-slate-800 rounded-xl px-3 py-2 shadow-2xl pointer-events-auto"
        >
          <button
            type="button"
            onClick={() => {
              markHudInteraction();
              setIsRightHudCollapsed(false);
              setHudChoreographyLabel('Right Telemetry & Routes Expanded');
            }}
            data-testid="expand-right-hud-btn"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Expand {showLondonCityMap ? 'London 3D Geodata' : '3D Floors & 4-Uni Routes'}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3D. Ergonomic 4-Tab Right Inspector Panel (Floors & Seats | 12 Rivers | Satellite & Hybrid | Gemini Tokens & Cost) */}
      {!isRightHudCollapsed && !showLondonCityMap && activeModal === 'none' && (
        <aside
          aria-label="3D Floor Cutaway Inspector, 12 Rivers, Satellite Realism, and Gemini Telemetry"
          data-testid="right-telemetry-panel"
          onMouseEnter={() => {
            isHoveringHudRef.current = true;
            markHudInteraction();
          }}
          onMouseLeave={() => {
            isHoveringHudRef.current = false;
          }}
          className="fixed top-14 right-4 z-10 w-full max-w-[385px] max-h-[calc(100vh-14.5rem)] overflow-y-auto bg-[#0B0F19]/95 border border-slate-800 rounded-xl p-3 shadow-2xl pointer-events-auto space-y-2.5 text-slate-100"
        >
          {/* Header + Collapse Button */}
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Ergonomic 3D Inspector & Telemetry
              </div>
              <h2 className="text-xs font-bold text-white truncate">
                {selectedBuilding.name} ({selectedMetrics.occupancyPct}% Occupied)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                markHudInteraction();
                setIsRightHudCollapsed(true);
                setHudChoreographyLabel('Right Telemetry Panel Collapsed');
              }}
              data-testid="collapse-right-hud-btn"
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded shrink-0"
              title="Collapse Right Telemetry & Routes Panel"
            >
              <ChevronUp className="w-3 h-3 text-emerald-400" />
              <span>Collapse</span>
            </button>
          </div>

          {/* 4 Ergonomic Inspector Tabs */}
          <div
            className="grid grid-cols-4 gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800"
            role="tablist"
            aria-label="Right Inspector Tabs"
          >
            {(
              [
                { id: 'floors', label: '🏢 Floors' },
                { id: 'rivers', label: '🌊 12 Rivers' },
                { id: 'satellite', label: '🛰️ Satellite' },
                { id: 'ai-telemetry', label: '🤖 AI Cost' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-testid={`right-tab-${tab.id}`}
                aria-selected={rightPanelTab === tab.id}
                onClick={() => {
                  markHudInteraction();
                  setRightPanelTab(tab.id);
                }}
                className={`py-1 px-1.5 rounded text-[10px] font-bold transition-colors truncate ${
                  rightPanelTab === tab.id
                    ? 'bg-sky-500/25 text-white border border-sky-400/60 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: 3D Floor Cutaway & Seat Booking + 4-University Quick Jump */}
          {rightPanelTab === 'floors' && (
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">
                    Slice 3D Floor Level ({selectedBuilding.floors.length} Floors):
                  </span>
                  {selectedFloorNumber !== null && (
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectBuildingAndFloor(selectedBuilding.id, null)
                      }
                      className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline"
                    >
                      Show Full Building
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  {selectedBuilding.floors.map((fl) => {
                    const freeSeats = Math.max(0, fl.totalSeats - fl.occupiedSeats);
                    const occPct = Math.round(
                      (fl.occupiedSeats / Math.max(1, fl.totalSeats)) * 100
                    );
                    const isFloorSelected = selectedFloorNumber === fl.floorNumber;
                    return (
                      <div
                        key={fl.floorNumber}
                        className={`p-2 rounded-lg border transition-colors ${
                          isFloorSelected
                            ? 'bg-sky-950/50 border-sky-400'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              markHudInteraction();
                              handleSelectBuildingAndFloor(
                                selectedBuilding.id,
                                isFloorSelected ? null : fl.floorNumber
                              );
                            }}
                            className="text-left flex-1 min-w-0"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular font-bold bg-slate-800 text-sky-300 rounded">
                                {fl.floorNumber}F
                              </span>
                              <span className="text-xs font-semibold text-white truncate">
                                {fl.name}
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              markHudInteraction();
                              const res = handleReserveSeat(
                                selectedBuilding.id,
                                fl.floorNumber
                              );
                              if (res.reserved && res.confirmationCode) {
                                setQuickReserveNotice(
                                  `Booked ${res.confirmationCode} (${fl.name})`
                                );
                                setTimeout(() => setQuickReserveNotice(null), 4000);
                              }
                            }}
                            disabled={freeSeats === 0}
                            className="px-2 py-0.5 text-[10px] font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 rounded shrink-0"
                          >
                            Book Seat
                          </button>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[10px] font-mono-tabular text-slate-300">
                          <span className="text-emerald-300">{freeSeats} seats free</span>
                          <span>Noise: {fl.noiseDba} dBA</span>
                          <span>{occPct}% full</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {quickReserveNotice && (
                  <div className="px-2.5 py-1.5 bg-emerald-950/70 border border-emerald-500/50 rounded text-[11px] font-mono-tabular text-emerald-200">
                    ✓ {quickReserveNotice}
                  </div>
                )}
              </div>

              {/* 4-University Quick Jump */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                  <span>4 Universities Across London 3D Map</span>
                  <button
                    type="button"
                    onClick={() => {
                      markHudInteraction();
                      setShowLondonCityMap(true);
                    }}
                    className="underline hover:text-sky-300"
                  >
                    Full Matrix
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {UNIVERSITIES.map((u) => {
                    const isCurr = u.id === activeUniversity.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          markHudInteraction();
                          handleSelectUniversity(u.id, false);
                        }}
                        className={`p-1.5 rounded border text-left transition-colors ${
                          isCurr
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="text-[11px] font-bold truncate">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono-tabular">
                          {u.campuses.length}{' '}
                          {u.campuses.length === 1 ? 'Campus' : 'Campuses'} · 3D Twin
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: River Thames & All 12 London Rivers, Canals & Subterranean Lost Rivers Explorer */}
          {rightPanelTab === 'rivers' && (
            <div
              className="space-y-1.5"
              data-testid="right-hud-rivers-section"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <Waves className="w-3 h-3 text-cyan-400" />
                  <span>River Thames & 12 London Rivers / Streams</span>
                </span>
                <div className="flex items-center gap-1">
                  {focusedRiverId && (
                    <button
                      type="button"
                      onClick={() => setFocusedRiverId(null)}
                      className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-800 text-slate-300 hover:text-white"
                    >
                      Reset Camera
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowRiversAndStreams((prev) => !prev)}
                    className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border ${
                      showRiversAndStreams
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {showRiversAndStreams ? '3D Rivers ON' : '3D Rivers OFF'}
                  </button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5">
                {LONDON_RIVERS_AND_STREAMS_3D.map((river) => {
                  const isFocused = focusedRiverId === river.id;
                  return (
                    <button
                      key={river.id}
                      type="button"
                      data-testid={`river-card-${river.id}`}
                      onClick={() => handleSelectRiver(river.id)}
                      className={`w-full p-2 rounded-lg border text-left transition-colors ${
                        isFocused
                          ? 'bg-sky-950/60 border-cyan-400 text-white'
                          : 'bg-slate-900/85 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold truncate">
                          {river.shortLabel}
                        </span>
                        <span className="text-[9px] font-mono-tabular text-cyan-300 shrink-0">
                          {river.statusLabel} · {river.realLengthKm} km
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-400 truncate mt-0.5">
                        Flow: {river.flowDirection}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Google Maps / Earth Satellite & Hybrid Realism Panel */}
          {rightPanelTab === 'satellite' && (
            <GoogleSatelliteHybridPanel
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              groundMapStyle={groundMapStyle}
              onChangeGroundMapStyle={setGroundMapStyle}
              onSelectBuilding={handleSelectBuilding}
            />
          )}

          {/* TAB 4: Gemini Models Telemetry (Input/Output Tokens, Latency & Cost) */}
          {rightPanelTab === 'ai-telemetry' && (
            <div className="space-y-2.5" data-testid="gemini-telemetry-panel">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-[9px] font-mono-tabular uppercase text-slate-400">
                    Total In / Out
                  </div>
                  <div className="text-xs font-bold font-mono-tabular text-sky-300 mt-0.5">
                    {geminiTelemetry.totals.totalInputTokens} /{' '}
                    {geminiTelemetry.totals.totalOutputTokens}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono-tabular">
                    {geminiTelemetry.totals.totalTokens} tok
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-[9px] font-mono-tabular uppercase text-slate-400">
                    Avg Latency
                  </div>
                  <div className="text-xs font-bold font-mono-tabular text-amber-300 mt-0.5">
                    {geminiTelemetry.totals.avgLatencyMs} ms
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono-tabular">
                    {geminiTelemetry.totals.totalCalls} calls
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  <div className="text-[9px] font-mono-tabular uppercase text-slate-400">
                    Total Cost
                  </div>
                  <div className="text-xs font-bold font-mono-tabular text-emerald-300 mt-0.5">
                    ${geminiTelemetry.totals.totalCostUsd.toFixed(5)}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono-tabular">
                    USD est.
                  </div>
                </div>
              </div>

              {/* Per-Model Breakdown Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">
                    Gemini Models (Tokens, Latency & Cost)
                  </span>
                  <button
                    type="button"
                    onClick={() => resetGeminiTelemetry()}
                    className="text-[9px] font-mono-tabular text-slate-400 hover:text-white underline"
                  >
                    Reset Stats
                  </button>
                </div>

                {geminiTelemetry.byModel.map((st) => (
                  <div
                    key={st.model.id}
                    data-testid={`telemetry-model-${st.model.id}`}
                    className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/90 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-white font-mono-tabular truncate">
                        {st.model.id}
                      </span>
                      <span className="text-[9px] font-mono-tabular px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        ${st.totalCostUsd.toFixed(6)}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400">{st.model.role}</div>
                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-800/80 text-[9px] font-mono-tabular">
                      <div>
                        <span className="text-slate-400">In/Out: </span>
                        <span className="text-sky-300 font-semibold">
                          {st.inputTokens}/{st.outputTokens}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Latency: </span>
                        <span className="text-amber-300 font-semibold">
                          {st.avgLatencyMs}ms
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">Rate: </span>
                        <span className="text-slate-300">
                          ${st.model.inputRatePer1M}/${st.model.outputRatePer1M} /1M
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* 3D-Docs: Interactive README & Architecture Guide Modal with Visual Evidence */}
      {isDocsModalOpen && (
        <section
          aria-label="Project README and Technical Documentation"
          data-testid="docs-readme-modal"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-30 w-full max-w-[min(960px,95vw)] max-h-[calc(100vh-8rem)] overflow-y-auto bg-[#0B0F19]/95 border border-sky-500/50 rounded-2xl p-4 shadow-2xl pointer-events-auto text-slate-100 space-y-4 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono-tabular uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Repository Documentation & Visual Evidence
              </span>
              <h2 className="text-sm font-bold text-white mt-1">
                /README.md & /docs/ARCHITECTURE_AND_USER_GUIDE.md
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsDocsModalOpen(false)}
              className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Close Docs
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="font-bold text-sky-300 font-mono-tabular">/README.md</div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Complete overview of the 4 London Universities (UCL, Imperial, LSE, KCL), 7
                campuses, 12 London rivers & subterranean streams, Google Maps/Earth
                Satellite & Hybrid realism modes, 3D Multi-Angle Photo Studio, and Gemini
                token/latency/cost telemetry — evidenced with live 3D captures.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <div className="font-bold text-emerald-300 font-mono-tabular">
                /docs/ARCHITECTURE_AND_USER_GUIDE.md
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Technical deep-dive into the Three.js WebGL2 anti-flicker pipeline, ACES
                Filmic tempered exposure & bloom calibration, Satellite/Hybrid procedural &
                @vis.gl/react-google-maps integration, and Gemini model pricing formulas.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-fuchsia-300 font-mono-tabular">
              Visual Evidence Gallery (Captured from Live 3D WebGL2 & Photo Studio)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {[
                {
                  src: '/docs/images/campus-overview-day.png',
                  title: '1. Calibrated Daylight & Ergonomic HUD',
                  desc: '4-University 3D Twin with valid occupancy % badges and zero-flicker lighting.',
                },
                {
                  src: '/docs/images/campus-hybrid-satellite.png',
                  title: '2. Google Satellite & Hybrid Realism',
                  desc: 'Hybrid aerial ground with London street/Tube labels & live Google Earth 3D inspector.',
                },
                {
                  src: '/docs/images/campus-night-tempered-glow.png',
                  title: '3. Tempered Night Window Glow (22:30)',
                  desc: 'Warm 2900K interior window illumination with calibrated ACES Filmic bloom (0.28).',
                },
                {
                  src: '/docs/images/campus-subterranean-rivers.png',
                  title: '4. 12 Hidden London Rivers X-Ray',
                  desc: 'Subterranean River Fleet, Tyburn, Westbourne & Walbrook conduits beneath London.',
                },
                {
                  src: '/docs/images/photo-studio-batch-capture.png',
                  title: '5. 3D Photo Studio (3–5 Batch Shots)',
                  desc: 'Multi-angle 3D camera capture with individual PNG & contact-sheet downloads.',
                },
                {
                  src: '/docs/images/gemini-telemetry-cost.png',
                  title: '6. Gemini AI Tokens, Latency & Cost',
                  desc: 'Live input/output token counts, latency (ms) & USD cost per Gemini model.',
                },
              ].map((item) => (
                <div
                  key={item.src}
                  className="rounded-xl bg-slate-900/90 border border-slate-800 overflow-hidden flex flex-col"
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full aspect-video object-cover bg-slate-950"
                  />
                  <div className="p-2 space-y-0.5">
                    <div className="text-[11px] font-bold text-white">{item.title}</div>
                    <div className="text-[10px] text-slate-400 leading-snug">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 uppercase tracking-wider font-mono-tabular">
                Gemini Models, SDK Version & Runtime Settings (@google/genai v1.29.0)
              </span>
              <span className="text-[10px] font-mono-tabular text-slate-400">
                24kHz PCM-to-WAV · JSON Schema · ThinkingLevel.LOW
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                <div className="font-mono-tabular font-bold text-sky-300">
                  gemini-4-argon ($1.25 / $5.00 per 1M)
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Spatial Study Concierge (JSON Schema output) & Stage-1 Conversational Tour Script Rewrite (ThinkingLevel.LOW, 1100ms timeout budget).
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                <div className="font-mono-tabular font-bold text-emerald-300">
                  gemini-3.8-flash-lite-tts ($0.10 / $0.40 per 1M)
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Primary 24kHz 16-bit mono neural voice TTS (responseModalities: [&apos;AUDIO&apos;], 11 prebuilt voices including Aoede, Sulafat, Achernar).
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                <div className="font-mono-tabular font-bold text-purple-300">
                  gemini-3.8-flash-tts ($0.30 / $1.20 per 1M)
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  Expressive multi-persona voice synthesis with speechMetadata.style direction & 60-clip LRU audio cache.
                </div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                <div className="font-mono-tabular font-bold text-amber-300">
                  gemini-3.8-flash ($0.15 / $0.60 per 1M)
                </div>
                <div className="text-[10px] text-slate-300 mt-0.5">
                  2D Map-to-3D Digital Twin Blueprint Extruder (responseMimeType: &apos;application/json&apos;, 2–4 floor volumetric schema).
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3E. Floating City of London 3D Geospatial & Realistic Distance Matrix Panel (Top-Right when London 3D Map is active and not collapsed) */}
      {showLondonCityMap && !isRightHudCollapsed && activeModal === 'none' && (
        <aside
          aria-label="London 3D Geospatial Locations and Inter-University Distance Matrix"
          data-testid="london-city-map-panel"
          onMouseEnter={() => {
            isHoveringHudRef.current = true;
            markHudInteraction();
          }}
          onMouseLeave={() => {
            isHoveringHudRef.current = false;
          }}
          className="fixed top-14 right-6 z-10 w-full max-w-[395px] max-h-[calc(100vh-14.5rem)] overflow-y-auto bg-[#0B0F19]/95 border border-sky-500/40 rounded-xl p-3.5 shadow-2xl pointer-events-auto space-y-2.5 text-slate-100"
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
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  markHudInteraction();
                  setIsRightHudCollapsed(true);
                }}
                className="px-2 py-1 text-[10px] font-semibold text-slate-300 bg-slate-900 border border-slate-700 rounded hover:text-white"
              >
                Collapse
              </button>
              <button
                type="button"
                onClick={() => setShowLondonCityMap(false)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md whitespace-nowrap shrink-0"
              >
                Zoom to Campus
              </button>
            </div>
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

          {/* River Thames (7 Bridges) & All 12 London Rivers, Canals & Subterranean Streams */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                🌊 River Thames, 7 Bridges & 12 London Rivers/Streams
              </span>
              <span className="text-[10px] font-mono-tabular text-slate-400">
                {LONDON_THAMES_BRIDGES_3D.length} Thames Bridges
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1 max-h-44 overflow-y-auto pr-0.5">
              {LONDON_RIVERS_AND_STREAMS_3D.map((river) => {
                const isFocused = focusedRiverId === river.id;
                return (
                  <button
                    key={river.id}
                    type="button"
                    onClick={() => handleSelectRiver(river.id)}
                    className={`p-2 rounded border text-left transition-colors ${
                      isFocused
                        ? 'bg-sky-950/60 border-cyan-400 text-white'
                        : 'bg-slate-900/85 border-slate-800 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{river.shortLabel}</span>
                      <span className="text-[10px] font-mono-tabular text-cyan-300">
                        {river.statusLabel} ({river.realLengthKm} km)
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      {river.flowDirection}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-2">
                      {river.description}
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
        onSelectBuilding={(id) => {
          markHudInteraction();
          setFocusedRiverId(null);
          handleSelectBuilding(id);
        }}
        solarHour={solarHour}
        onChangeSolarHour={(hr) => {
          markHudInteraction();
          setIsAutoSolarCycle(false);
          setSolarHour(hr);
        }}
        isAutoSolarCycle={isAutoSolarCycle}
        onToggleAutoSolarCycle={() => {
          markHudInteraction();
          setIsAutoSolarCycle((prev) => !prev);
        }}
        groundMapStyle={groundMapStyle}
        onChangeGroundMapStyle={(style) => {
          markHudInteraction();
          setGroundMapStyle(style);
        }}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => {
          markHudInteraction();
          setShowHeatmap((prev) => !prev);
        }}
        showStudentFlow={showStudentFlow}
        onToggleStudentFlow={() => {
          markHudInteraction();
          setShowStudentFlow((prev) => !prev);
        }}
        showRadarPulse={showRadarPulse}
        onToggleRadarPulse={() => {
          markHudInteraction();
          setShowRadarPulse((prev) => !prev);
        }}
        showDustMotes={showDustMotes}
        onToggleDustMotes={() => {
          markHudInteraction();
          setShowDustMotes((prev) => !prev);
        }}
        showTopoContours={showTopoContours}
        onToggleTopoContours={() => {
          markHudInteraction();
          setShowTopoContours((prev) => !prev);
        }}
        showRoadsAndPaths={showRoadsAndPaths}
        onToggleRoadsAndPaths={() => {
          markHudInteraction();
          setShowRoadsAndPaths((prev) => !prev);
        }}
        showFoliage={showFoliage}
        onToggleFoliage={() => {
          markHudInteraction();
          setShowFoliage((prev) => !prev);
        }}
        showUrbanContext={showUrbanContext}
        onToggleUrbanContext={() => {
          markHudInteraction();
          setShowUrbanContext((prev) => !prev);
        }}
        showBloomAndFog={showBloomAndFog}
        onToggleBloomAndFog={() => {
          markHudInteraction();
          setShowBloomAndFog((prev) => !prev);
        }}
        showRiversAndStreams={showRiversAndStreams}
        onToggleRiversAndStreams={() => {
          markHudInteraction();
          setShowRiversAndStreams((prev) => !prev);
        }}
        waterLevelOffset={waterLevelOffset}
        onChangeWaterLevelOffset={(val) => {
          markHudInteraction();
          setWaterLevelOffset(val);
        }}
        foliageHueOffset={foliageHueOffset}
        onChangeFoliageHueOffset={(val) => {
          markHudInteraction();
          setFoliageHueOffset(val);
        }}
        bloomIntensity={bloomIntensity}
        onChangeBloomIntensity={(val) => {
          markHudInteraction();
          setBloomIntensity(val);
        }}
        onSetAllEffects={(enabled) => {
          markHudInteraction();
          handleSetAllEffects(enabled);
        }}
        isDemoPlaying={isDemoPlaying}
        onToggleDemo={handleToggleDemo}
        isAutoReplay={isAutoReplay}
        onToggleAutoReplay={handleToggleAutoReplay}
        cameraPreset={cameraPreset}
        onChangeCameraPreset={(preset) => {
          markHudInteraction();
          setCameraPreset(preset);
        }}
        soundPreset={soundPreset}
        onChangeSoundPreset={handleSoundPresetChange}
        isCollapsed={isDockCollapsed}
        onToggleCollapse={() => {
          markHudInteraction();
          setIsDockCollapsed((prev) => !prev);
          setHudChoreographyLabel('Custom HUD Layout');
        }}
        onCollapseAll={handleCollapseAllControls}
        onExpandAll={handleExpandAllControls}
        isAllCollapsed={isAllHudCollapsed}
        isAllExpanded={isAllHudExpanded}
        onOpenFloorInspector={() => {
          markHudInteraction();
          setActiveModal('floor-inspector');
        }}
      />
    </main>
  );
}
