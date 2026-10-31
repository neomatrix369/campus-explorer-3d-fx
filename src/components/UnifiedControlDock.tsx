import React, { useState } from 'react';
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
  Waves,
  SlidersHorizontal,
  Globe,
} from 'lucide-react';
import { CampusBuilding } from '../data/campusData';
import { calculateSunState, getBuildingAggregateMetrics } from '../utils/campusLogic';
import { GroundMapRealismStyle } from '../utils/proceduralTextures';
import { SoundscapePreset } from '../utils/spatialAudioEngine';
import { CameraViewPreset } from './CampusScene3D';

interface UnifiedControlDockProps {
  buildings: CampusBuilding[];
  selectedBuildingId: string;
  onSelectBuilding: (id: string) => void;
  solarHour: number;
  onChangeSolarHour: (hour: number) => void;
  isAutoSolarCycle?: boolean;
  onToggleAutoSolarCycle?: () => void;
  groundMapStyle?: GroundMapRealismStyle;
  onChangeGroundMapStyle?: (style: GroundMapRealismStyle) => void;
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
  showRiversAndStreams?: boolean;
  onToggleRiversAndStreams?: () => void;
  waterLevelOffset?: number;
  onChangeWaterLevelOffset?: (offset: number) => void;
  foliageHueOffset?: number;
  onChangeFoliageHueOffset?: (offset: number) => void;
  bloomIntensity?: number;
  onChangeBloomIntensity?: (intensity: number) => void;
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
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  isAllCollapsed?: boolean;
  isAllExpanded?: boolean;
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
  isAutoSolarCycle = false,
  onToggleAutoSolarCycle,
  groundMapStyle = 'architectural',
  onChangeGroundMapStyle,
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
  showRiversAndStreams = true,
  onToggleRiversAndStreams,
  waterLevelOffset = 0,
  onChangeWaterLevelOffset,
  foliageHueOffset = 0,
  onChangeFoliageHueOffset,
  bloomIntensity = 0.28,
  onChangeBloomIntensity,
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
  onCollapseAll,
  onExpandAll,
  isAllCollapsed,
  isAllExpanded,
  onOpenFloorInspector,
}) => {
  const [showLayersDrawer, setShowLayersDrawer] = useState(true);
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
    showBloomAndFog &&
    showRiversAndStreams;

  return (
    <div
      className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-20 w-full max-w-[min(1260px,97vw)] pointer-events-auto transition-transform duration-200"
      data-testid="unified-control-dock"
      data-dock-collapsed={isCollapsed ? 'true' : 'false'}
    >
      {/* Top Handle Strip: Collapse Dock + Layers Toggle + Global Collapse/Expand All */}
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          data-testid="toggle-bottom-dock-btn"
          className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-slate-200 bg-[#0B0F19]/95 border border-slate-800 rounded-lg hover:bg-slate-900 hover:text-white transition-colors whitespace-nowrap shrink-0 shadow-md"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Expand 3D Controls & Solar Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Hide Bottom Dock</span>
            </>
          )}
        </button>

        {!isCollapsed && (
          <button
            type="button"
            onClick={() => setShowLayersDrawer((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 shadow-md ${
              showLayersDrawer
                ? 'bg-sky-500/20 text-sky-200 border-sky-500/40'
                : 'bg-[#0B0F19]/95 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3 text-sky-400" />
            <span>3D Layers & Buildings {showLayersDrawer ? '▾' : '▸'}</span>
          </button>
        )}

        {onCollapseAll && (
          <button
            type="button"
            onClick={onCollapseAll}
            disabled={isAllCollapsed}
            data-testid="dock-collapse-all-btn"
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 shadow-md ${
              isAllCollapsed
                ? 'bg-slate-900/60 text-slate-500 border-slate-800/60 cursor-default'
                : 'bg-[#0B0F19]/95 text-amber-300 border-slate-800 hover:border-amber-400/60 hover:bg-slate-900'
            }`}
          >
            Collapse All HUD
          </button>
        )}

        {onExpandAll && (
          <button
            type="button"
            onClick={onExpandAll}
            disabled={isAllExpanded}
            data-testid="dock-expand-all-btn"
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 shadow-md ${
              isAllExpanded
                ? 'bg-slate-900/60 text-slate-500 border-slate-800/60 cursor-default'
                : 'bg-[#0B0F19]/95 text-emerald-300 border-slate-800 hover:border-emerald-400/60 hover:bg-slate-900'
            }`}
          >
            Expand All HUD
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="bg-[#0B0F19]/95 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 shadow-2xl space-y-2">
          {showLayersDrawer && (
            <>
              {/* Row 1: Campus Landmark Selector Strip + Guided Tour Quick Actions */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80 overflow-x-auto">
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
                        <span className="text-slate-400 font-mono-tabular text-[10px]">
                          {metrics.occupancyPct}% · {metrics.minNoiseDba}dBA
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
                    className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 border ${
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
                    className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Inspect Floors
                  </button>
                </div>
              </div>

              {/* Row 2: Dedicated Visual Effects (VFX) & 3D World Feature Toggles */}
              <div
                className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80 overflow-x-auto"
                data-testid="vfx-feature-toggles"
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1 whitespace-nowrap">
                    3D Layers:
                  </span>

                  <button
                    type="button"
                    onClick={onToggleHeatmap}
                    aria-pressed={showHeatmap}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showHeatmap
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    <span>Heatmap</span>
                  </button>

                  {onToggleRiversAndStreams && (
                    <button
                      type="button"
                      onClick={onToggleRiversAndStreams}
                      aria-pressed={showRiversAndStreams}
                      data-testid="toggle-rivers-streams-btn"
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                        showRiversAndStreams
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <Waves className="w-3 h-3" />
                      <span>Thames & Rivers</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onToggleRoadsAndPaths}
                    aria-pressed={showRoadsAndPaths}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showRoadsAndPaths
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Route className="w-3 h-3" />
                    <span>Roads & Paths</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleFoliage}
                    aria-pressed={showFoliage}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showFoliage
                        ? 'bg-lime-500/20 text-lime-300 border-lime-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Trees className="w-3 h-3" />
                    <span>3D Trees</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleUrbanContext}
                    aria-pressed={showUrbanContext}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showUrbanContext
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    <span>City Blocks</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleTopoContours}
                    aria-pressed={showTopoContours}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showTopoContours
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Mountain className="w-3 h-3" />
                    <span>Topo Lines</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleStudentFlow}
                    aria-pressed={showStudentFlow}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showStudentFlow
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Wind className="w-3 h-3" />
                    <span>Student Flow</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleRadarPulse}
                    aria-pressed={showRadarPulse}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showRadarPulse
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Radar className="w-3 h-3" />
                    <span>Radar Pulse</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleDustMotes}
                    aria-pressed={showDustMotes}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showDustMotes
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Light Motes</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleBloomAndFog}
                    aria-pressed={showBloomAndFog}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border ${
                      showBloomAndFog
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Bloom & Fog</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSetAllEffects(!allEffectsActive)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap shrink-0"
                >
                  {allEffectsActive ? 'Disable All FX' : 'Enable All FX'}
                </button>
              </div>
            </>
          )}

          {/* Core Always-On Ergonomic Row: Solar Time & Day/Dusk/Night | Satellite/Hybrid Ground | Tempered Glow & Tide | Camera & Audio */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2">
            {/* 1. Day / Golden Hour / Night & Solar Time Control */}
            <div className="flex-1 min-w-[280px] bg-slate-900/90 border border-slate-800/90 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                  {sunState.isNight ? (
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  ) : sunState.isGoldenHour ? (
                    <Sunset className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span className="truncate">{sunState.phaseLabel}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono-tabular font-bold text-sky-300">
                    {formatSolarHour(solarHour)}
                  </span>
                  {onToggleAutoSolarCycle && (
                    <button
                      type="button"
                      onClick={onToggleAutoSolarCycle}
                      aria-pressed={isAutoSolarCycle}
                      data-testid="dock-auto-solar-btn"
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border transition-colors ${
                        isAutoSolarCycle
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                      title="Automatically animate 24h Day & Night solar cycle"
                    >
                      {isAutoSolarCycle ? '⟳ Auto ON' : '⟳ Auto'}
                    </button>
                  )}
                </div>
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
                <div
                  className="flex items-center gap-1 shrink-0"
                  role="group"
                  aria-label="Daylight and Night Mode Presets"
                >
                  <button
                    type="button"
                    data-testid="dock-mode-day-btn"
                    onClick={() => onChangeSolarHour(13.5)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                      !sunState.isNight && !sunState.isGoldenHour
                        ? 'bg-sky-500/25 text-white border-sky-400 shadow-sm'
                        : 'text-slate-300 hover:text-white bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-300" />
                    <span>Day</span>
                  </button>
                  <button
                    type="button"
                    data-testid="dock-mode-dusk-btn"
                    onClick={() => onChangeSolarHour(18.0)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                      sunState.isGoldenHour
                        ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-sm'
                        : 'text-slate-300 hover:text-white bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Sunset className="w-3 h-3 text-amber-400" />
                    <span>Dusk</span>
                  </button>
                  <button
                    type="button"
                    data-testid="dock-mode-night-btn"
                    onClick={() => onChangeSolarHour(22.5)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 ${
                      sunState.isNight
                        ? 'bg-indigo-500/30 text-indigo-200 border-indigo-400 shadow-sm'
                        : 'text-slate-300 hover:text-white bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Moon className="w-3 h-3 text-indigo-300" />
                    <span>Night</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Satellite / Hybrid / Architectural Ground Realism Switcher */}
            {onChangeGroundMapStyle && (
              <div
                className="flex items-center gap-1 bg-slate-900/90 border border-slate-800/90 rounded-lg px-2 py-1.5 shrink-0"
                role="group"
                aria-label="3D Ground Realism Style"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-0.5" />
                {(
                  [
                    { id: 'architectural', label: '3D Arch' },
                    { id: 'satellite', label: 'Satellite' },
                    { id: 'hybrid', label: 'Hybrid' },
                  ] as { id: GroundMapRealismStyle; label: string }[]
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    data-testid={`dock-ground-${mode.id}-btn`}
                    onClick={() => onChangeGroundMapStyle(mode.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      groundMapStyle === mode.id
                        ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/60'
                        : 'text-slate-400 hover:text-white bg-slate-800/70'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            )}

            {/* 3. Tempered Glow Slider, Thames Tide & Canopy Season */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800/90 rounded-lg px-2.5 py-1.5 shrink-0">
              {onChangeBloomIntensity && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-purple-300 font-medium whitespace-nowrap">
                    ✨ Glow ({Math.round((bloomIntensity / 0.85) * 100)}%):
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.04}
                    value={Math.min(0.85, bloomIntensity)}
                    aria-label="Window Illumination and Atmospheric Bloom Intensity"
                    onChange={(e) => onChangeBloomIntensity(parseFloat(e.target.value))}
                    className="w-16 accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              )}

              {onChangeWaterLevelOffset && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-sky-300 font-medium whitespace-nowrap">🌊 Tide:</span>
                  <input
                    type="range"
                    min={-1.2}
                    max={1.8}
                    step={0.1}
                    value={waterLevelOffset}
                    aria-label="Thames and London Rivers Tidal Water Level"
                    onChange={(e) => onChangeWaterLevelOffset(parseFloat(e.target.value))}
                    className="w-14 accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              )}

              {onChangeFoliageHueOffset && (
                <div className="flex items-center gap-1 text-[10px]">
                  {[
                    { label: 'Spring', offset: 0.03 },
                    { label: 'Summer', offset: 0 },
                    { label: 'Autumn', offset: -0.22 },
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => onChangeFoliageHueOffset(s.offset)}
                      className={`px-1.5 py-0.5 rounded border transition-colors ${
                        Math.abs(foliageHueOffset - s.offset) < 0.01
                          ? 'bg-lime-500/25 text-lime-200 border-lime-400/60 font-semibold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Camera View & Spatial Audio Controls */}
            <div className="flex items-center justify-between gap-1 bg-slate-900/90 border border-slate-800/90 rounded-lg p-1 shrink-0">
              <div className="flex items-center gap-0.5">
                <Camera className="w-3.5 h-3.5 text-slate-400 mx-1 shrink-0" />
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
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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
                    ? 'Mute'
                    : soundPreset === 'lofi-focus'
                      ? 'Lo-Fi'
                      : soundPreset === 'rain-library'
                        ? 'Rain'
                        : '3D Audio'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
