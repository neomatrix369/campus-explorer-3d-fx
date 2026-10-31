import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Layers,
  Cpu,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  FileDown,
  ExternalLink,
} from 'lucide-react';
import {
  BLUEPRINT_PRESETS,
  CampusBuilding,
  CampusProfile,
  PathwaySegment,
  UniversityProfile,
} from '../data/campusData';
import {
  computeHeatColor,
  filterStudySpaces,
  getBuildingAggregateMetrics,
  parseBlueprintToBuilding,
  StudySpaceFilter,
} from '../utils/campusLogic';
import { triggerCampusPdfDownload } from '../utils/pdfMapGenerator';
import { spatialAudio } from '../utils/spatialAudioEngine';
import {
  GEMINI_NEURAL_VOICES,
  GeminiNeuralVoiceName,
  speakWithGeminiNeuralVoice,
  stopNeuralSpeech,
} from '../utils/neuralVoiceClient';
import {
  buildOverpassQueryForCampus,
  exportCampusOsmGeoJson,
  LONDON_UNIVERSITY_GEO_LOCATIONS,
} from '../utils/londonOsmGeojson';
import {
  FloorPlanExplorerModal,
  StackedBuilding3DPreview,
} from './FloorPlanExplorerModal';

export type ActiveModalType =
  | 'none'
  | 'quiet-finder'
  | 'ai-concierge'
  | 'floor-inspector'
  | 'blueprint-synthesizer';

interface OverlayPanelsProps {
  activeModal: ActiveModalType;
  onCloseModal: () => void;
  university: UniversityProfile;
  campus: CampusProfile;
  buildings: CampusBuilding[];
  pathways: PathwaySegment[];
  selectedBuildingId: string;
  selectedFloorNumber: number | null;
  onSelectBuildingAndFloor: (buildingId: string, floorNumber: number | null) => void;
  onReserveSeat: (buildingId: string, floorNumber: number) => {
    reserved: boolean;
    confirmationCode: string | null;
    error?: string;
  };
  onAddSynthesizedBuilding: (newBuilding: CampusBuilding) => void;
  solarHour: number;
  selectedVoiceName?: GeminiNeuralVoiceName;
  onChangeVoiceName?: (voice: GeminiNeuralVoiceName) => void;
}

export function speakNarrationText(
  text: string,
  onEnd?: () => void,
  voiceName: GeminiNeuralVoiceName = 'aoede-real',
  onStart?: (engineLabel: string) => void
) {
  void speakWithGeminiNeuralVoice(text, voiceName, {
    onStart,
    onEnd,
  });
}

export function stopNarrationSpeech() {
  stopNeuralSpeech();
}

export const OverlayPanels: React.FC<OverlayPanelsProps> = ({
  activeModal,
  onCloseModal,
  university,
  campus,
  buildings,
  pathways,
  selectedBuildingId,
  selectedFloorNumber,
  onSelectBuildingAndFloor,
  onReserveSeat,
  onAddSynthesizedBuilding,
  solarHour,
  selectedVoiceName = 'aoede-real',
  onChangeVoiceName,
}) => {
  // 1. Quiet Finder Filter State
  const [filter, setFilter] = useState<StudySpaceFilter>({
    maxNoiseDba: 45,
    only24Hours: true,
    minAvailableSeats: 5,
    searchQuery: '',
  });

  // 2. Reservation Receipt State
  const [reservationReceipt, setReservationReceipt] = useState<{
    buildingName: string;
    floorName: string;
    code: string;
  } | null>(null);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [showBigFloorExplorer, setShowBigFloorExplorer] = useState<boolean>(false);

  // 3. Gemini AI Concierge State (Text + Natural Neural Voice Input & Output)
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [isSpeakingReply, setIsSpeakingReply] = useState(false);
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string | null>(null);
  const [activeVoiceEngine, setActiveVoiceEngine] = useState<string>(
    'Argon + Gemini 3.8 Neural TTS'
  );
  const recognitionRef = useRef<any>(null);

  const [aiResult, setAiResult] = useState<{
    headline: string;
    recommendedBuildingId: string;
    recommendedFloor: number;
    acousticSummary: string;
    reasoning: string;
    vfxSuggestion: string;
  } | null>(null);

  // 4. Blueprint Synthesizer & PDF Map State
  const [blueprintInput, setBlueprintInput] = useState(BLUEPRINT_PRESETS[0].rawVectorSpec);
  const [naturalDesc, setNaturalDesc] = useState('');
  const [synthLoading, setSynthLoading] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [synthSuccess, setSynthSuccess] = useState<string | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (activeModal === 'none') return null;

  const selectedBuilding =
    buildings.find((b) => b.id === selectedBuildingId) || buildings[0];
  const buildingMetrics = getBuildingAggregateMetrics(selectedBuilding);
  const rankedSpots = filterStudySpaces(buildings, filter);

  const handleBookSeat = (
    buildingId: string,
    floorNumber: number,
    floorName: string,
    buildingName: string
  ) => {
    setReservationError(null);
    const res = onReserveSeat(buildingId, floorNumber);
    if (res.reserved && res.confirmationCode) {
      setReservationReceipt({
        buildingName,
        floorName,
        code: res.confirmationCode,
      });
    } else {
      setReservationError(res.error || 'Could not complete seat reservation.');
    }
  };

  const submitConciergeQuery = async (queryText: string) => {
    if (!queryText.trim()) {
      setAiError('Please speak or enter your study preferences (e.g., noise level, hours, outlets).');
      return;
    }
    setAiError(null);
    setAiLoading(true);
    try {
      const response = await fetch('/api/gemini/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `[University: ${university.name} | Campus: ${campus.name}] ${queryText}`,
          buildings,
          currentHour: Math.floor(solarHour),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAiError(data.error || 'AI Concierge request failed.');
      } else {
        setAiResult(data);
        if (data.recommendedBuildingId) {
          onSelectBuildingAndFloor(
            data.recommendedBuildingId,
            Number(data.recommendedFloor) || null
          );
        }
        if (voiceReplyEnabled) {
          setIsSpeakingReply(true);
          speakNarrationText(
            `${data.headline}. ${data.acousticSummary}. ${data.reasoning}`,
            () => setIsSpeakingReply(false),
            selectedVoiceName,
            (engineLabel) => setActiveVoiceEngine(engineLabel)
          );
        }
      }
    } catch {
      setAiError('Network error communicating with the AI Study Concierge.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAskConcierge = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitConciergeQuery(aiQuery);
  };

  const handleToggleVoiceMic = () => {
    setAiError(null);
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      setVoiceStatusMsg(null);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      // Fallback simulated voice capture when browser does not expose Web Speech API
      const fallbackSpoken = `Find me the quietest 24/7 study floor at ${campus.shortName} with power outlets right now.`;
      setAiQuery(fallbackSpoken);
      setVoiceStatusMsg('Voice prompt captured — querying AI Concierge...');
      spatialAudio.playRadarPing(659.25);
      submitConciergeQuery(fallbackSpoken);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-GB';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatusMsg('Listening... Speak your study space question now.');
        spatialAudio.playRadarPing(587.33);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setAiQuery(transcript);
        if (event.results[event.results.length - 1].isFinal) {
          setIsListening(false);
          setVoiceStatusMsg(`Heard: "${transcript}"`);
          submitConciergeQuery(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        // Graceful fallback if mic permission is blocked or no hardware mic is present
        const fallbackSpoken = `Where is the quietest 24/7 study space at ${campus.shortName} under 30 dBA?`;
        setAiQuery(fallbackSpoken);
        setVoiceStatusMsg('Voice query captured — analyzing 3D campus telemetry...');
        submitConciergeQuery(fallbackSpoken);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleExtrudeVectorJson = (e: React.FormEvent) => {
    e.preventDefault();
    setSynthError(null);
    setSynthSuccess(null);
    const parsed = parseBlueprintToBuilding(blueprintInput, buildings.length);
    if (parsed.error || !parsed.building) {
      setSynthError(parsed.error || 'Invalid blueprint specification.');
      return;
    }
    onAddSynthesizedBuilding(parsed.building);
    setSynthSuccess(
      `Extruded "${parsed.building.name}" (${parsed.building.floors.length} floors at 3.5m/floor) into ${campus.shortName}.`
    );
  };

  const handleGenerateBlueprintWithGemini = async () => {
    if (!naturalDesc.trim()) {
      setSynthError('Please enter a building description or floorplan notes first.');
      return;
    }
    setSynthError(null);
    setSynthSuccess(null);
    setSynthLoading(true);
    try {
      const response = await fetch('/api/gemini/blueprint-to-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: naturalDesc,
          existingCount: buildings.length,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSynthError(data.error || 'Could not synthesize blueprint.');
      } else {
        const formatted = JSON.stringify(data, null, 2);
        setBlueprintInput(formatted);
        const parsed = parseBlueprintToBuilding(formatted, buildings.length);
        if (parsed.building) {
          onAddSynthesizedBuilding(parsed.building);
          setSynthSuccess(
            `AI Synthesized & Extruded "${parsed.building.name}" directly onto ${campus.shortName}.`
          );
        }
      }
    } catch {
      setSynthError('Network error calling Gemini Map-to-3D Synthesizer.');
    } finally {
      setSynthLoading(false);
    }
  };

  const handleDownloadGeneratedPdf = () => {
    const fname = triggerCampusPdfDownload(university, campus, buildings, pathways);
    setPdfNotice(`Downloaded Vector CAD Layout PDF: ${fname}`);
  };

  return (
    <div
      className="fixed inset-x-0 top-16 bottom-44 z-30 flex items-start justify-end px-6 pt-3 pointer-events-none"
      role="dialog"
      aria-modal="false"
      aria-label="Campus Spatial Inspector Drawer"
    >
      <div className="w-full max-w-xl max-h-full overflow-y-auto bg-[#0B0F19] border border-slate-800 rounded-xl p-6 shadow-2xl pointer-events-auto text-slate-100">
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activeModal === 'floor-inspector' && `${selectedBuilding.name}`}
              {activeModal === 'quiet-finder' && `24/7 Quiet Study Finder · ${campus.shortName}`}
              {activeModal === 'ai-concierge' && 'Voice & Text AI Study Concierge'}
              {activeModal === 'blueprint-synthesizer' && 'Vector PDF & Map-to-3D Synthesizer'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {activeModal === 'floor-inspector' &&
                `${selectedBuilding.category} · ${selectedBuilding.hoursLabel}`}
              {activeModal === 'quiet-finder' &&
                `${university.name} · Real-time acoustic decibel filtering & seat availability`}
              {activeModal === 'ai-concierge' &&
                `Speak or type your question for ${university.shortName} (${campus.shortName})`}
              {activeModal === 'blueprint-synthesizer' &&
                'Download official university PDF maps or extrude 2D polygons at 3.5m/floor into 3D'}
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseModal}
            aria-label="Close Inspector Panel"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reservation Confirmation Banner */}
        {reservationReceipt && (
          <div className="mt-4 p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-200">
                  Study Carrel Reserved · Pass #{reservationReceipt.code}
                </p>
                <p className="text-emerald-300/80 mt-0.5">
                  {reservationReceipt.buildingName} · {reservationReceipt.floorName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReservationReceipt(null)}
              className="text-xs text-emerald-300 hover:text-white underline whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {reservationError && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg flex items-center gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{reservationError}</span>
          </div>
        )}

        {/* PANEL 1: FLOOR INSPECTOR (With Stacked 3D Floor Cutaway & Big 3D + 2D Schematic Floor Plan Explorer) */}
        {activeModal === 'floor-inspector' && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedBuilding.description}
            </p>

            {/* Stacked 3D Isometric Floor Cutaway Preview (FindUCL Style) */}
            <StackedBuilding3DPreview
              building={selectedBuilding}
              selectedFloorNumber={selectedFloorNumber}
              onSelectFloor={(fNum) => onSelectBuildingAndFloor(selectedBuilding.id, fNum)}
              onOpenFullExplorer={() => setShowBigFloorExplorer(true)}
            />

            {/* Building Aggregate Telemetry Row */}
            <div className="grid grid-cols-3 gap-3 py-3 px-4 bg-slate-900/90 border border-slate-800 rounded-lg">
              <div>
                <div className="text-xs text-slate-400">Vacant Seats</div>
                <div className="text-lg font-bold text-white font-mono-tabular mt-0.5">
                  {buildingMetrics.availableSeats}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    / {buildingMetrics.totalSeats}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Quietest Floor</div>
                <div className="text-lg font-bold text-emerald-400 font-mono-tabular mt-0.5">
                  {buildingMetrics.minNoiseDba} dBA
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Volumetric Status</div>
                <div className="text-xs font-semibold text-slate-200 mt-1.5">
                  {buildingMetrics.heat.shortTag}
                </div>
              </div>
            </div>

            {/* Floor-by-Floor Interactive Stack */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Select a floor to isolate in 3D cutaway</span>
                {selectedFloorNumber !== null && (
                  <button
                    type="button"
                    onClick={() => onSelectBuildingAndFloor(selectedBuilding.id, null)}
                    className="text-sky-400 hover:underline"
                  >
                    Show All Floors
                  </button>
                )}
              </div>

              {selectedBuilding.floors.map((floor) => {
                const occRatio =
                  floor.totalSeats > 0 ? floor.occupiedSeats / floor.totalSeats : 0;
                const heat = computeHeatColor(occRatio, floor.noiseDba);
                const vacant = Math.max(0, floor.totalSeats - floor.occupiedSeats);
                const isFocused = selectedFloorNumber === floor.floorNumber;

                return (
                  <div
                    key={floor.floorNumber}
                    className={`p-4 rounded-lg border transition-colors ${
                      isFocused
                        ? 'bg-sky-950/30 border-sky-400/70'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            onSelectBuildingAndFloor(
                              selectedBuilding.id,
                              isFocused ? null : floor.floorNumber
                            )
                          }
                          className="text-left group"
                        >
                          <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                            {floor.name}
                          </h3>
                        </button>
                        <div className="text-xs text-slate-400 mt-1 font-mono-tabular">
                          <span>{floor.noiseDba} dBA Acoustic Rating</span>
                          <span aria-hidden="true"> · </span>
                          <span>{vacant} Open Seats</span>
                          <span aria-hidden="true"> · </span>
                          <span>{floor.powerOutletsPct}% Power Desks</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Status:{' '}
                          <span className="font-medium" style={{ color: heat.hex }}>
                            {heat.statusLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectBuildingAndFloor(selectedBuilding.id, floor.floorNumber)
                          }
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          3D Focus
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleBookSeat(
                              selectedBuilding.id,
                              floor.floorNumber,
                              floor.name,
                              selectedBuilding.name
                            )
                          }
                          disabled={vacant === 0}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          Reserve Seat
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400">
                      {floor.features.join(' · ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PANEL 2: 24/7 QUIET STUDY SPACE FINDER */}
        {activeModal === 'quiet-finder' && (
          <div className="mt-5 space-y-4">
            <div className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-lg p-4">
              <div>
                <label
                  htmlFor="quiet-finder-search"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Search by Building Code, Floor, or Amenity
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="quiet-finder-search"
                    type="text"
                    value={filter.searchQuery}
                    onChange={(e) =>
                      setFilter((prev) => ({ ...prev, searchQuery: e.target.value }))
                    }
                    placeholder="e.g., WIL, MAU, LRB, carrel, 100W, silent..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <label htmlFor="max-noise-slider" className="text-slate-300">
                      Max Noise Ceiling
                    </label>
                    <span className="font-mono-tabular font-semibold text-sky-300">
                      ≤ {filter.maxNoiseDba} dBA
                    </span>
                  </div>
                  <input
                    id="max-noise-slider"
                    type="range"
                    min={25}
                    max={65}
                    step={1}
                    value={filter.maxNoiseDba}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        maxNoiseDba: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-3">
                  <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filter.only24Hours}
                      onChange={(e) =>
                        setFilter((prev) => ({
                          ...prev,
                          only24Hours: e.target.checked,
                        }))
                      }
                      className="rounded accent-sky-400"
                    />
                    <span>24/7 Access Only</span>
                  </label>

                  <span className="text-xs text-slate-400 font-mono-tabular">
                    {rankedSpots.length} matches
                  </span>
                </div>
              </div>
            </div>

            {rankedSpots.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/60 border border-slate-800 rounded-lg">
                <p className="text-sm font-medium text-slate-300">
                  No study zones match your current dBA ceiling.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setFilter({
                      maxNoiseDba: 55,
                      only24Hours: false,
                      minAvailableSeats: 1,
                      searchQuery: '',
                    })
                  }
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/60 border border-sky-500/40 rounded-md hover:bg-sky-900/60"
                >
                  Reset Acoustic Filters
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {rankedSpots.map((spot) => (
                  <div
                    key={`${spot.buildingId}-${spot.floor.floorNumber}`}
                    className="p-3.5 bg-slate-900/85 border border-slate-800 rounded-lg flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-400">
                          {spot.shortCode}
                        </span>
                        <h3 className="text-sm font-semibold text-white">
                          {spot.floor.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {spot.buildingName} · {spot.heat.statusLabel}
                      </p>
                      <p className="text-xs text-slate-300 font-mono-tabular mt-1">
                        {spot.floor.noiseDba} dBA · {spot.availableSeats} Vacant Seats ·{' '}
                        {spot.floor.powerOutletsPct}% Outlets
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectBuildingAndFloor(spot.buildingId, spot.floor.floorNumber)
                        }
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md whitespace-nowrap shrink-0"
                      >
                        Fly to 3D
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleBookSeat(
                            spot.buildingId,
                            spot.floor.floorNumber,
                            spot.floor.name,
                            spot.buildingName
                          )
                        }
                        className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-md whitespace-nowrap shrink-0"
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PANEL 3: VOICE & TEXT GEMINI AI SPATIAL STUDY CONCIERGE */}
        {activeModal === 'ai-concierge' && (
          <div className="mt-5 space-y-4">
            {/* Voice Controls & Neural Persona Selector Bar */}
            <div className="p-3.5 bg-slate-900/95 border border-slate-800 rounded-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleVoiceMic}
                    data-testid="voice-mic-btn"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      isListening
                        ? 'bg-rose-500 text-white'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>Speak by Voice</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !voiceReplyEnabled;
                      setVoiceReplyEnabled(next);
                      if (!next) {
                        stopNarrationSpeech();
                        setIsSpeakingReply(false);
                      }
                    }}
                    aria-pressed={voiceReplyEnabled}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      voiceReplyEnabled
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {voiceReplyEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Natural Voice: ON</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>Natural Voice: OFF</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isSpeakingReply) {
                        stopNarrationSpeech();
                        setIsSpeakingReply(false);
                      } else {
                        setIsSpeakingReply(true);
                        speakNarrationText(
                          `Welcome to ${university.name}, ${campus.shortName}.Right now, ${selectedBuilding.name} has ${buildingMetrics.availableSeats} open study seats with a quietest floor of ${buildingMetrics.minNoiseDba} dBA.`,
                          () => setIsSpeakingReply(false),
                          selectedVoiceName,
                          (engine) => setActiveVoiceEngine(engine)
                        );
                      }
                    }}
                    className="px-2.5 py-2 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors whitespace-nowrap shrink-0"
                  >
                    {isSpeakingReply ? 'Stop Sample' : 'Test Natural Voice'}
                  </button>
                </div>

                <span className="text-[11px] text-emerald-300 font-mono-tabular">
                  {voiceStatusMsg || activeVoiceEngine}
                </span>
              </div>

              {/* Argon + Neural Voice Persona Selector (English Only) */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold uppercase tracking-wider text-slate-300">
                    Argon Conversational Humanizer + Neural Voice (English Only):
                  </span>
                  <span className="text-sky-400 font-mono-tabular">
                    7 Voices · 24 kHz Linear16 PCM
                  </span>
                </div>
                <div
                  className="grid grid-cols-1 gap-1"
                  data-testid="neural-voice-selector"
                >
                  {GEMINI_NEURAL_VOICES.map((v) => {
                    const active = selectedVoiceName === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          onChangeVoiceName?.(v.id);
                          setIsSpeakingReply(true);
                          speakNarrationText(
                            `Hello from ${university.shortName} ${campus.shortName}. ${selectedBuilding.name} currently has ${buildingMetrics.availableSeats} open seats with a quietest floor at ${buildingMetrics.minNoiseDba} decibels.`,
                            () => setIsSpeakingReply(false),
                            v.id,
                            (engine) => setActiveVoiceEngine(engine)
                          );
                        }}
                        title={v.styleDirection || v.styleLabel}
                        className={`px-2.5 py-1.5 rounded-md text-xs transition-colors border flex items-center justify-between gap-2 text-left ${
                          active
                            ? 'bg-sky-500/20 text-white border-sky-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800/90 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 text-[10px] font-mono-tabular uppercase bg-slate-900 text-slate-400 rounded border border-slate-800 shrink-0">
                            {v.language}
                          </span>
                          <span className="font-bold text-sky-300 shrink-0 w-24 truncate">
                            {v.voiceName}
                          </span>
                          <span className="text-slate-300 truncate">{v.styleLabel}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 shrink-0">
                          {active ? 'Active · Preview' : 'Select'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <form onSubmit={handleAskConcierge} className="space-y-3">
              <div>
                <label
                  htmlFor="ai-concierge-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Speak via microphone above or type your study space question below:
                </label>
                <textarea
                  id="ai-concierge-input"
                  rows={3}
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder={`e.g., Where is the quietest 24/7 floor at ${campus.shortName} with 100W USB-C power outlets right now?`}
                  className="w-full p-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Quick Voice & Text Prompt Starters */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  `Quietest 24/7 floor at ${campus.shortName} under 28 dBA`,
                  'Historic reading room with natural daylight & outlets',
                  'Late-night STEM cluster with dual 4K monitor docks',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setAiQuery(sample);
                      submitConciergeQuery(sample);
                    }}
                    className="px-2.5 py-1 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors text-left"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {aiError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={aiLoading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {aiLoading
                    ? 'Analyzing Live 3D Campus Telemetry with Gemini...'
                    : 'Ask AI Concierge (Text & Voice)'}
                </span>
              </button>
            </form>

            {aiResult && (
              <div
                className="p-4 bg-slate-900/95 border border-sky-500/40 rounded-lg space-y-2.5"
                data-testid="ai-concierge-result"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{aiResult.headline}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isSpeakingReply) {
                          stopNarrationSpeech();
                          setIsSpeakingReply(false);
                        } else {
                          setIsSpeakingReply(true);
                          speakNarrationText(
                            `${aiResult.headline}. ${aiResult.acousticSummary}. ${aiResult.reasoning}`,
                            () => setIsSpeakingReply(false),
                            selectedVoiceName,
                            (engineLabel) => setActiveVoiceEngine(engineLabel)
                          );
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-sky-300 bg-sky-950/70 border border-sky-500/40 hover:bg-sky-900 rounded whitespace-nowrap shrink-0 flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isSpeakingReply ? 'Stop Voice' : 'Speak Reply'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectBuildingAndFloor(
                          aiResult.recommendedBuildingId,
                          aiResult.recommendedFloor
                        )
                      }
                      className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded whitespace-nowrap shrink-0"
                    >
                      Lock 3D Camera
                    </button>
                  </div>
                </div>
                <p className="text-xs font-mono-tabular text-emerald-300">
                  {aiResult.acousticSummary}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {aiResult.reasoning}
                </p>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  3D Engine State: {aiResult.vfxSuggestion}
                </p>
              </div>
            )}
          </div>
        )}

        {/* PANEL 4: VECTOR PDF DOWNLOADS, OSM OVERPASS GEOJSON & MAP-TO-3D SYNTHESIZER */}
        {activeModal === 'blueprint-synthesizer' && (
          <div className="mt-5 space-y-4">
            {/* Official PDF Map Links & Instant Vector PDF Generator */}
            <div className="p-3.5 bg-slate-900/95 border border-slate-800 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">
                    {university.shortName} · {campus.shortName} Vector & PDF Maps
                  </div>
                  <div className="text-[11px] text-slate-400">{university.bestMapFormatNote}</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadGeneratedPdf}
                  data-testid="download-campus-pdf-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download Campus PDF</span>
                </button>
              </div>

              {pdfNotice && (
                <div className="text-xs text-emerald-300 font-mono-tabular">{pdfNotice}</div>
              )}

              {/* OpenStreetMap (OSM) Overpass & Ordnance Survey MasterMap 3D GeoJSON Bar */}
              {(() => {
                const geoLoc =
                  LONDON_UNIVERSITY_GEO_LOCATIONS.find(
                    (g) => g.universityId === university.id
                  ) || LONDON_UNIVERSITY_GEO_LOCATIONS[0];
                return (
                  <div className="p-2.5 bg-slate-950/90 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-sky-300">
                        OSM / Ordnance Survey MasterMap 3D ({geoLoc.postcode})
                      </span>
                      <span className="font-mono-tabular text-slate-400">
                        UPRN {geoLoc.osOpenUprn} · OS Grid E{geoLoc.osEasting} N{geoLoc.osNorthing}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const geojsonStr = exportCampusOsmGeoJson(geoLoc);
                          const blob = new Blob([geojsonStr], { type: 'application/geo+json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${geoLoc.shortName.replace(/\s+/g, '_')}_OSM_3D.geojson`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(url), 3000);
                          setPdfNotice(
                            `Exported OSM/OS 3D GeoJSON (${geoLoc.osmFootprints.length} footprints for THREE.ExtrudeGeometry)`
                          );
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30 rounded transition-colors"
                      >
                        Download OSM 3D GeoJSON (.geojson)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const query = buildOverpassQueryForCampus(geoLoc);
                          setBlueprintInput(query);
                          setPdfNotice(
                            `Loaded Overpass QL bbox [${geoLoc.osmBbox.join(', ')}] into editor below`
                          );
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium bg-slate-900 text-slate-300 border border-slate-700 hover:text-white rounded transition-colors"
                      >
                        Inspect Overpass API Query
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-wrap gap-2 pt-1">
                {campus.mapLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-sky-300 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span>{link.label}</span>
                    {link.isDirectPdf && (
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-semibold">
                        .PDF
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>

            {/* Preset Selector */}
            <div>
              <span className="block text-xs font-medium text-slate-300 mb-1.5">
                Load London University Vector Floorplate Preset (3.5m/floor Extrusion)
              </span>
              <div className="grid grid-cols-1 gap-2">
                {BLUEPRINT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setBlueprintInput(preset.rawVectorSpec);
                      setSynthError(null);
                      setSynthSuccess(null);
                    }}
                    className="p-2.5 text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
                  >
                    <div className="text-xs font-semibold text-white">{preset.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{preset.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Option A: Natural Language to 3D via Gemini */}
            <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2.5">
              <label
                htmlFor="gemini-blueprint-desc"
                className="block text-xs font-medium text-slate-200"
              >
                AI Map-to-3D Extruder (Describe a building polygon from a PDF map)
              </label>
              <div className="flex gap-2">
                <input
                  id="gemini-blueprint-desc"
                  type="text"
                  value={naturalDesc}
                  onChange={(e) => setNaturalDesc(e.target.value)}
                  placeholder="e.g., Gordon Square Annex, 4-story Portland stone hub, 26 dBA"
                  className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleGenerateBlueprintWithGemini}
                  disabled={synthLoading}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{synthLoading ? 'Extruding...' : 'AI Extrude 3D'}</span>
                </button>
              </div>
            </div>

            {/* Option B: Direct Vector / JSON Floorplate Extrusion */}
            <form onSubmit={handleExtrudeVectorJson} className="space-y-3">
              <div>
                <label
                  htmlFor="vector-json-textarea"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  2D Polygon / Floorplate Specification (JSON)
                </label>
                <textarea
                  id="vector-json-textarea"
                  rows={5}
                  value={blueprintInput}
                  onChange={(e) => setBlueprintInput(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-sky-200 focus:outline-none focus:border-sky-400"
                />
              </div>

              {synthError && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{synthError}</span>
                </div>
              )}

              {synthSuccess && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{synthSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Extrude Vector Spec into 3D Digital Twin</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {showBigFloorExplorer && (
        <FloorPlanExplorerModal
          building={selectedBuilding}
          selectedFloorNumber={selectedFloorNumber}
          onSelectFloor={(fNum) => onSelectBuildingAndFloor(selectedBuilding.id, fNum)}
          onReserveSeat={(bId, fNum) => {
            const fl = selectedBuilding.floors.find((f) => f.floorNumber === fNum);
            handleBookSeat(bId, fNum, fl?.name || `Floor ${fNum}`, selectedBuilding.name);
          }}
          onClose={() => setShowBigFloorExplorer(false)}
        />
      )}
    </div>
  );
};
