import React from 'react';
import {
  Sun,
  Moon,
  Sunset,
  Flame,
  Sparkles,
  Radar,
  Wind,
  Mountain,
  Route,
  Trees,
  Building2,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CampusBuilding } from '../data/campusData';
import { calculateSunState, getBuildingAggregateMetrics } from '../utils/campusLogic';
import { SoundscapePreset } from '../utils/spatialAudioEngine';
import { CameraViewPreset } from './CampusScene3D';

interface UnifiedControlDockProps {
  buildings: CampusBuilding[];
  selectedBuildingId: string;
  onSelectBuilding: (id: string) => void;
  solarHour: number;
  onChangeSolarHour: (hour: number) => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showStudentFlow: boolean;
  onToggleStudentFlow: () => void;
  showRadarPulse: boolean;
  onToggleRadarPulse: () => void;
  showDustMotes: boolean;
  onToggleDustMotes: () => void;
  showTopoContours: boolean;
  onToggleTopoContours: () => void;
  showRoadsAndPaths: boolean;
  onToggleRoadsAndPaths: () => void;
  showFoliage: boolean;
  onToggleFoliage: () => void;
  showUrbanContext: boolean;
  onToggleUrbanContext: () => void;
  showBloomAndFog: boolean;
  onToggleBloomAndFog: () => void;
  onSetAllEffects: (enabled: boolean) => void;
  isDemoPlaying: boolean;
  onToggleDemo: () => void;
  isAutoReplay: boolean;
  onToggleAutoReplay: () => void;
  cameraPreset: CameraViewPreset;
  onChangeCameraPreset: (preset: CameraViewPreset) => void;
  soundPreset: SoundscapePreset;
  onChangeSoundPreset: (preset: SoundscapePreset) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenFloorInspector: () => void;
}

export function formatSolarHour(decimalHour: number): string {
  const normalized = ((decimalHour % 24) + 24) % 24;
  const hrs = Math.floor(normalized);
  const mins = Math.round((normalized - hrs) * 60) % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export const UnifiedControlDock: React.FC<UnifiedControlDockProps> = ({
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  solarHour,
  onChangeSolarHour,
  showHeatmap,
  onToggleHeatmap,
  showStudentFlow,
  onToggleStudentFlow,
  showRadarPulse,
  onToggleRadarPulse,
  showDustMotes,
  onToggleDustMotes,
  showTopoContours,
  onToggleTopoContours,
  showRoadsAndPaths,
  onToggleRoadsAndPaths,
  showFoliage,
  onToggleFoliage,
  showUrbanContext,
  onToggleUrbanContext,
  showBloomAndFog,
  onToggleBloomAndFog,
  onSetAllEffects,
  isDemoPlaying,
  onToggleDemo,
  isAutoReplay,
  onToggleAutoReplay,
  cameraPreset,
  onChangeCameraPreset,
  soundPreset,
  onChangeSoundPreset,
  isCollapsed,
  onToggleCollapse,
  onOpenFloorInspector,
}) => {
  const sunState = calculateSunState(solarHour);
  const allEffectsActive =
    showHeatmap &&
    showStudentFlow &&
    showRadarPulse &&
    showDustMotes &&
    showTopoContours &&
    showRoadsAndPaths &&
    showFoliage &&
    showUrbanContext &&
    showBloomAndFog;

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 w-full max-w-[min(1260px,97vw)] pointer-events-auto transition-transform duration-200"
      data-testid="unified-control-dock"
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-center mb-1">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          className="flex items-center gap-2 px-4 py-1 text-xs font-medium text-slate-200 bg-[#0B0F19] border border-slate-800 rounded-lg hover:bg-slate-900 hover:text-white transition-colors whitespace-nowrap shrink-0 shadow-md"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Controls & FX Toggles (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="bg-[#0B0F19] border border-slate-800 rounded-xl p-3 shadow-2xl space-y-2">
          {/* Row 1: Campus Landmark Selector Strip + Guided Tour Quick Actions */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto">
            <div
              className="flex items-center gap-1"
              role="tablist"
              aria-label="Campus Study Buildings"
            >
              {buildings.map((b) => {
                const isSelected = b.id === selectedBuildingId;
                const metrics = getBuildingAggregateMetrics(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => onSelectBuilding(b.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-sky-500/15 text-white border-sky-400/60'
                        : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="font-semibold text-sky-400">{b.shortCode}</span>
                    <span>{b.name.split(' ')[0]}</span>
                    <span className="text-slate-400 font-mono-tabular text-[11px]">
                      {metrics.minNoiseDba}dBA
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onToggleDemo}
                aria-pressed={isDemoPlaying}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 border ${
                  isDemoPlaying
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
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
                onClick={onToggleAutoReplay}
                aria-pressed={isAutoReplay}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 border ${
                  isAutoReplay
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Automatically loop guided tour across all universities and campuses"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Auto-Replay</span>
              </button>

              <button
                type="button"
                onClick={onOpenFloorInspector}
                className="px-3 py-1 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Inspect Floors
              </button>
            </div>
          </div>

          {/* Row 2: Dedicated Visual Effects (VFX) & 3D World Feature Toggles */}
          <div
            className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 overflow-x-auto"
            data-testid="vfx-feature-toggles"
          >
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 whitespace-nowrap">
                3D FX & Features:
              </span>

              <button
                type="button"
                onClick={onToggleHeatmap}
                aria-pressed={showHeatmap}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showHeatmap
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Heatmap</span>
              </button>

              <button
                type="button"
                onClick={onToggleStudentFlow}
                aria-pressed={showStudentFlow}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showStudentFlow
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>Student Flow</span>
              </button>

              <button
                type="button"
                onClick={onToggleRadarPulse}
                aria-pressed={showRadarPulse}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showRadarPulse
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                <span>Radar Pulse</span>
              </button>

              <button
                type="button"
                onClick={onToggleDustMotes}
                aria-pressed={showDustMotes}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showDustMotes
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Light Motes</span>
              </button>

              <button
                type="button"
                onClick={onToggleBloomAndFog}
                aria-pressed={showBloomAndFog}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showBloomAndFog
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Bloom & Fog</span>
              </button>

              <button
                type="button"
                onClick={onToggleRoadsAndPaths}
                aria-pressed={showRoadsAndPaths}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showRoadsAndPaths
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>Roads & Paths</span>
              </button>

              <button
                type="button"
                onClick={onToggleFoliage}
                aria-pressed={showFoliage}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showFoliage
                    ? 'bg-lime-500/20 text-lime-300 border-lime-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Trees className="w-3.5 h-3.5" />
                <span>3D Trees</span>
              </button>

              <button
                type="button"
                onClick={onToggleUrbanContext}
                aria-pressed={showUrbanContext}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showUrbanContext
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>City Blocks</span>
              </button>

              <button
                type="button"
                onClick={onToggleTopoContours}
                aria-pressed={showTopoContours}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 border ${
                  showTopoContours
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Mountain className="w-3.5 h-3.5" />
                <span>Topo Lines</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSetAllEffects(!allEffectsActive)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap shrink-0"
            >
              {allEffectsActive ? 'Disable All FX' : 'Enable All FX'}
            </button>
          </div>

          {/* Row 3: Solar Time Slider | Camera Presets | Spatial Audio */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
            {/* Solar Cycle Control */}
            <div className="flex-1 min-w-[260px] bg-slate-900/90 border border-slate-800/90 rounded-lg px-3 py-1">
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  {sunState.isNight ? (
                    <Moon className="w-3.5 h-3.5 text-sky-400" />
                  ) : sunState.isGoldenHour ? (
                    <Sunset className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{sunState.phaseLabel}</span>
                </span>
                <span className="font-mono-tabular font-semibold text-sky-300">
                  {formatSolarHour(solarHour)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="solar-time-slider"
                  type="range"
                  min={0}
                  max={23.9}
                  step={0.25}
                  value={solarHour}
                  aria-label="Campus Solar Time of Day"
                  onChange={(e) => onChangeSolarHour(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onChangeSolarHour(13.0)}
                    className="px-2 py-0.5 text-[11px] text-slate-300 hover:text-white bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeSolarHour(18.0)}
                    className="px-2 py-0.5 text-[11px] text-slate-300 hover:text-white bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    Dusk
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeSolarHour(1.5)}
                    className="px-2 py-0.5 text-[11px] text-slate-300 hover:text-white bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
                  >
                    Night
                  </button>
                </div>
              </div>
            </div>

            {/* Camera View & Spatial Audio Controls */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-900/90 border border-slate-800/90 rounded-lg p-1 shrink-0">
              <div className="flex items-center gap-0.5">
                <Camera className="w-3.5 h-3.5 text-slate-400 mx-1.5 shrink-0" />
                {(
                  [
                    { id: 'overview', label: 'Aerial' },
                    { id: 'focus-building', label: 'Focus' },
                    { id: 'street-level', label: 'Street' },
                    { id: 'floor-cutaway', label: 'Cutaway' },
                  ] as { id: CameraViewPreset; label: string }[]
                ).map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onChangeCameraPreset(cam.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      cameraPreset === cam.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-slate-800 shrink-0" />

              <button
                type="button"
                onClick={() => {
                  const order: SoundscapePreset[] = [
                    'muted',
                    'lofi-focus',
                    'rain-library',
                    'spatial-campus',
                  ];
                  const next = order[(order.indexOf(soundPreset) + 1) % order.length];
                  onChangeSoundPreset(next);
                }}
                aria-label="Cycle Spatial Audio Soundscape"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  soundPreset !== 'muted'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {soundPreset === 'muted' ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {soundPreset === 'muted'
                    ? 'Audio Off'
                    : soundPreset === 'lofi-focus'
                      ? 'Lo-Fi Pad'
                      : soundPreset === 'rain-library'
                        ? 'Library Rain'
                        : '3D Spatial'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
