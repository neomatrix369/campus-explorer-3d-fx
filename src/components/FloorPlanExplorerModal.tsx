import React, { useState } from 'react';
import { X, Maximize2, Zap, Droplets, Volume2, Users, Armchair, Ban, Mic } from 'lucide-react';
import { CampusBuilding, FloorZone } from '../data/campusData';
import { computeHeatColor } from '../utils/campusLogic';

interface StackedBuilding3DPreviewProps {
  building: CampusBuilding;
  selectedFloorNumber: number | null;
  onSelectFloor: (floorNum: number) => void;
  onOpenFullExplorer: () => void;
}

/**
 * Renders the stacked 3D isometric floor cutaway preview (matching FindUCL Screenshots 2, 4, 6)
 * with individual 3D desks, chairs, glass pods, book stacks, lift shaft, and charging/water badges.
 */
export const StackedBuilding3DPreview: React.FC<StackedBuilding3DPreviewProps> = ({
  building,
  selectedFloorNumber,
  onSelectFloor,
  onOpenFullExplorer,
}) => {
  // Display floors from top to bottom
  const sortedFloors = [...building.floors].sort((a, b) => b.floorNumber - a.floorNumber);
  const activeFloorNum = selectedFloorNumber ?? sortedFloors[0]?.floorNumber ?? 1;

  return (
    <div
      className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
      data-testid="stacked-3d-floor-preview"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          3D Stacked Floor Cutaway ({sortedFloors.length} Levels)
        </span>
        <button
          type="button"
          onClick={onOpenFullExplorer}
          data-testid="expand-floor-explorer-btn"
          className="px-2.5 py-1 text-[11px] font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-md shadow flex items-center gap-1 transition-colors"
        >
          <Maximize2 className="w-3 h-3 text-indigo-600" />
          <span>Expand</span>
        </button>
      </div>

      {/* Isometric 3D Stacked Floor Slabs */}
      <div className="relative w-full py-2 flex flex-col items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 360 250"
          className="w-full h-52 select-none"
          aria-label={`Stacked 3D floor diagram for ${building.name}`}
        >
          {/* Central Vertical Lift & Stairs Core Shaft */}
          <polygon
            points="172,14 202,26 202,228 172,216"
            fill="rgba(148, 163, 184, 0.16)"
            stroke="rgba(148, 163, 184, 0.35)"
            strokeWidth="1"
          />
          <text
            x="186"
            y="13"
            textAnchor="middle"
            className="fill-slate-400 text-[8px] font-medium"
          >
            Lift & stairs
          </text>

          {sortedFloors.map((fl, idx) => {
            const occPct =
              fl.totalSeats > 0 ? Math.round((fl.occupiedSeats / fl.totalSeats) * 100) : 50;
            const isSelected = fl.floorNumber === activeFloorNum;
            const spacing = Math.min(44, Math.floor(195 / Math.max(1, sortedFloors.length)));
            const baseY = 26 + idx * spacing;

            const slabFill =
              occPct < 45
                ? isSelected
                  ? '#86efac'
                  : '#bbf7d0'
                : occPct <= 70
                  ? isSelected
                    ? '#fcd34d'
                    : '#fde68a'
                  : isSelected
                    ? '#fdba74'
                    : '#fed7aa';

            const slabSide =
              occPct < 45 ? '#4ade80' : occPct <= 70 ? '#f59e0b' : '#ea580c';

            return (
              <g
                key={fl.floorNumber}
                onClick={() => onSelectFloor(fl.floorNumber)}
                className="cursor-pointer transition-opacity"
                style={{ opacity: selectedFloorNumber && !isSelected ? 0.58 : 1 }}
              >
                {/* Isometric L-Shaped / Courtyard 3D Floor Slab */}
                <polygon
                  points={`95,${baseY + 12} 225,${baseY - 12} 295,${baseY + 14} 245,${baseY + 26} 215,${baseY + 15} 145,${baseY + 32}`}
                  fill={slabFill}
                  stroke={isSelected ? '#4f46e5' : '#475569'}
                  strokeWidth={isSelected ? '2.2' : '0.9'}
                />
                {/* Slab 3D Front Thickness Extrusion */}
                <polygon
                  points={`95,${baseY + 12} 145,${baseY + 32} 145,${baseY + 37} 95,${baseY + 17}`}
                  fill={slabSide}
                />
                <polygon
                  points={`145,${baseY + 32} 215,${baseY + 15} 215,${baseY + 20} 145,${baseY + 37}`}
                  fill="#94a3b8"
                />

                {/* 3D Miniature Study Desks, Chairs & Seated People on the Slab */}
                {[0, 1, 2, 3, 4, 5].map((dIdx) => {
                  const dx = 132 + dIdx * 17;
                  const dy = baseY + 16 - dIdx * 2.4;
                  return (
                    <g key={dIdx}>
                      {/* Desk surface */}
                      <polygon
                        points={`${dx},${dy} ${dx + 8},${dy - 2} ${dx + 11},${dy + 1} ${dx + 3},${dy + 3}`}
                        fill="#92400e"
                      />
                      {/* Chair / Student dot */}
                      <circle
                        cx={dx + 5}
                        cy={dy - 1.8}
                        r={2.1}
                        fill={dIdx % 2 === 0 ? '#1e293b' : '#2563eb'}
                      />
                    </g>
                  );
                })}

                {/* Bookable Glass Group Pods on right wing */}
                {[0, 1].map((pIdx) => {
                  const px = 232 + pIdx * 20;
                  const py = baseY + 6 + pIdx * 5;
                  return (
                    <polygon
                      key={pIdx}
                      points={`${px},${py} ${px + 14},${py - 3} ${px + 18},${py + 2} ${px + 4},${py + 5}`}
                      fill="rgba(56, 189, 248, 0.38)"
                      stroke="#0284c7"
                      strokeWidth="0.8"
                    />
                  );
                })}

                {/* Floor Pill Badge on Left (`3 60%`) */}
                <g transform={`translate(28, ${baseY + 4})`}>
                  <rect
                    x="0"
                    y="0"
                    width="54"
                    height="18"
                    rx="6"
                    fill="#ffffff"
                    stroke={isSelected ? '#4f46e5' : '#cbd5e1'}
                    strokeWidth={isSelected ? '1.8' : '1'}
                  />
                  <text
                    x="11"
                    y="12.5"
                    className="fill-slate-900 text-[10px] font-bold"
                  >
                    {fl.floorNumber}F
                  </text>
                  <text
                    x="27"
                    y="12.5"
                    className=" text-[10px] font-bold"
                    fill={occPct < 45 ? '#16a34a' : occPct <= 70 ? '#d97706' : '#dc2626'}
                  >
                    {occPct}%
                  </text>
                </g>

                {/* Water Refill & Charging Socket Badges on Slab */}
                <g transform={`translate(192, ${baseY + 8})`}>
                  <rect x="0" y="0" width="16" height="12" rx="6" fill="#ffffff" />
                  <circle cx="8" cy="6" r="3" fill="#3b82f6" />
                </g>
                <g transform={`translate(268, ${baseY - 4})`}>
                  <rect x="0" y="0" width="22" height="12" rx="6" fill="#ffffff" />
                  <text x="11" y="9" textAnchor="middle" className="fill-amber-500 text-[8px] font-bold">
                    ⚡⚡
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <button
        type="button"
        onClick={onOpenFullExplorer}
        data-testid="open-big-floor-explorer-btn"
        className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
      >
        <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
        <span>Open floor explorer: big 3D + floor plan</span>
      </button>
    </div>
  );
};

interface FloorPlanExplorerModalProps {
  building: CampusBuilding;
  selectedFloorNumber: number | null;
  onSelectFloor: (floorNum: number) => void;
  onReserveSeat: (buildingId: string, floorNum: number) => void;
  onClose: () => void;
}

/**
 * Full-screen Side-by-Side Big 3D Isometric Floor View + 2D Schematic Real-Outline Floor Plan
 * (Directly modeled after FindUCL Screenshot 3).
 */
export const FloorPlanExplorerModal: React.FC<FloorPlanExplorerModalProps> = ({
  building,
  selectedFloorNumber,
  onSelectFloor,
  onReserveSeat,
  onClose,
}) => {
  const sortedFloors = [...building.floors].sort((a, b) => b.floorNumber - a.floorNumber);
  const activeFloor: FloorZone =
    building.floors.find((f) => f.floorNumber === selectedFloorNumber) ||
    sortedFloors[0] ||
    building.floors[0];

  const [yawDeg, setYawDeg] = useState<number>(-28);
  const [crowdReportToast, setCrowdReportToast] = useState<string | null>(null);
  const [measuringNoise, setMeasuringNoise] = useState<boolean>(false);
  const [measuredDba, setMeasuredDba] = useState<number | null>(null);

  const occPct =
    activeFloor.totalSeats > 0
      ? Math.round((activeFloor.occupiedSeats / activeFloor.totalSeats) * 100)
      : 55;
  const vacantSeats = Math.max(0, activeFloor.totalSeats - activeFloor.occupiedSeats);
  const heat = computeHeatColor(occPct / 100, activeFloor.noiseDba);

  const handleReportStatus = (label: string) => {
    setCrowdReportToast(`Reported "${label}" on ${activeFloor.name} · Updated live model`);
    setTimeout(() => setCrowdReportToast(null), 4000);
  };

  const handleMeasureNoise4s = () => {
    if (measuringNoise) return;
    setMeasuringNoise(true);
    setTimeout(() => {
      setMeasuringNoise(false);
      setMeasuredDba(activeFloor.noiseDba);
      setCrowdReportToast(`Measured ~${activeFloor.noiseDba} dB on Floor ${activeFloor.floorNumber}`);
      setTimeout(() => setCrowdReportToast(null), 4000);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`3D and 2D Schematic Floor Plan Explorer for ${building.name}`}
      data-testid="floor-plan-explorer-modal"
    >
      <div className="w-full max-w-[1320px] max-h-[92vh] bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Top Header Bar with Floor Selector Pills (Matching Screenshot 3) */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {building.name}
            </h2>
            <p className="text-xs text-slate-500">
              {heat.statusLabel} ({occPct}% full) · Quietest {activeFloor.noiseDba} dB · now
            </p>
          </div>

          {/* Interactive Floor Selector Pills (`4 85% | 3 59% | 2 68% | 1 87%`) */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Floor Selector">
            {sortedFloors.map((fl) => {
              const fPct =
                fl.totalSeats > 0 ? Math.round((fl.occupiedSeats / fl.totalSeats) * 100) : 50;
              const isCurrent = fl.floorNumber === activeFloor.floorNumber;
              const dotColor =
                fPct < 45 ? '#22c55e' : fPct <= 70 ? '#f59e0b' : '#ef4444';

              return (
                <button
                  key={fl.floorNumber}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  onClick={() => onSelectFloor(fl.floorNumber)}
                  data-testid={`modal-floor-pill-${fl.floorNumber}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    isCurrent
                      ? 'bg-indigo-50 text-indigo-950 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="font-bold">{fl.floorNumber}</span>
                  <span className="text-slate-500 font-mono-tabular">{fPct}%</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Floor Explorer"
            data-testid="close-floor-explorer-modal"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Split View: Left = Big 3D Isometric Floor View | Right = 2D Real-Outline Schematic Floor Plan */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* LEFT PANE (7 cols): Interactive Big 3D Floor Cutaway with 3D Desks, Chairs, Glass Pods, Café & Ghosted Neighbour Floors */}
          <div className="lg:col-span-7 bg-[#f8fafc] p-5 flex flex-col justify-between relative min-h-[460px]">
            <div className="flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border-2 border-indigo-600 text-xs font-bold text-slate-900 shadow-sm">
                <span>Floor {activeFloor.floorNumber}</span>
                <span className="text-amber-600">{occPct}%</span>
              </span>

              <div className="flex items-center gap-2">
                <label htmlFor="iso-yaw-slider" className="text-xs text-slate-500 font-medium">
                  Rotate 3D View:
                </label>
                <input
                  id="iso-yaw-slider"
                  type="range"
                  min={-65}
                  max={25}
                  value={yawDeg}
                  onChange={(e) => setYawDeg(Number(e.target.value))}
                  className="w-28 accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Big 3D Isometric Floor Slab SVG with Real 3D Entities */}
            <div className="flex-1 flex items-center justify-center my-2">
              <svg
                viewBox="0 0 680 440"
                className="w-full h-full max-h-[410px] select-none"
                aria-label={`3D Isometric view of ${activeFloor.name}`}
              >
                <g transform={`translate(340, 225) rotate(${(yawDeg + 28) * 0.22}) translate(-340, -225)`}>
                  {/* Ghosted Upper Floor Slab (Translucent Rose/Amber) */}
                  <polygon
                    points="130,95 450,35 590,115 480,155 415,120 235,165"
                    fill="rgba(251, 146, 60, 0.12)"
                    stroke="rgba(251, 146, 60, 0.28)"
                    strokeWidth="1.2"
                  />

                  {/* Ghosted Lower Floor Slab */}
                  <polygon
                    points="130,305 450,245 590,325 480,365 415,330 235,375"
                    fill="rgba(248, 113, 113, 0.12)"
                    stroke="rgba(248, 113, 113, 0.25)"
                    strokeWidth="1.2"
                  />

                  {/* Central Vertical Lift & Stairs Core Tower */}
                  <polygon
                    points="265,65 325,52 325,365 265,378"
                    fill="rgba(148, 163, 184, 0.22)"
                    stroke="#94a3b8"
                    strokeWidth="1"
                  />
                  <text x="295" y="84" textAnchor="middle" className="fill-slate-600 text-[11px] font-semibold">
                    Lift & stairs
                  </text>

                  {/* ACTIVE 3D FLOOR SLAB (Warm Honey-Oak / Amber Architectural Slab) */}
                  {/* Slab 3D Extruded Side Walls */}
                  <polygon
                    points="90,225 235,288 235,306 90,243"
                    fill="#b48a4e"
                  />
                  <polygon
                    points="235,288 415,242 415,260 235,306"
                    fill="#9c7640"
                  />
                  <polygon
                    points="415,242 490,275 490,293 415,260"
                    fill="#b48a4e"
                  />
                  <polygon
                    points="490,275 610,238 610,256 490,293"
                    fill="#856232"
                  />

                  {/* Main L-Shaped / Courtyard Floor Top Surface */}
                  <polygon
                    points="90,225 445,135 610,238 490,275 415,242 235,288"
                    fill="#d9a75c"
                    stroke="#78552b"
                    strokeWidth="2"
                  />

                  {/* Café Zone Sub-Floor (Left Wing) */}
                  <polygon
                    points="96,223 228,190 286,222 232,282"
                    fill="#cbd5b0"
                    stroke="#94a3b8"
                    strokeWidth="1"
                  />

                  {/* Barista Café Counter (3D Dark Slate Block) */}
                  <polygon
                    points="125,186 168,174 176,184 133,196"
                    fill="#1e293b"
                  />
                  {/* Round Café Tables & Stools */}
                  {[
                    [128, 224],
                    [154, 216],
                    [180, 208],
                    [146, 240],
                    [174, 232],
                    [202, 224],
                    [168, 256],
                    [196, 248],
                  ].map(([cx, cy], idx) => (
                    <g key={idx}>
                      <ellipse cx={cx} cy={cy} rx="8" ry="5.5" fill="#f8fafc" stroke="#64748b" strokeWidth="1" />
                      <circle cx={cx - 9} cy={cy - 2} r="3.2" fill="#334155" />
                      <circle cx={cx + 9} cy={cy + 2} r="3.2" fill="#ca8a04" />
                    </g>
                  ))}
                  <text x="165" y="238" textAnchor="middle" className="fill-slate-900 text-[11px] font-bold">
                    Café · {Math.max(25, occPct - 14)}%
                  </text>

                  {/* Quiet Study (Bookable) Desks, Ergonomic Chairs & Seated Students (Center Wing) */}
                  {[0, 1, 2, 3].map((col) =>
                    [0, 1, 2, 3, 4].map((row) => {
                      const dx = 248 + col * 38 - row * 12;
                      const dy = 182 + col * 8 + row * 15;
                      const isOccupied = (col + row) % 3 !== 0;
                      return (
                        <g key={`${col}-${row}`}>
                          {/* 3D Oak Study Desk */}
                          <polygon
                            points={`${dx},${dy} ${dx + 18},${dy - 5} ${dx + 24},${dy + 2} ${dx + 6},${dy + 7}`}
                            fill="#854d0e"
                            stroke="#422006"
                            strokeWidth="0.7"
                          />
                          {/* Ergonomic Chair */}
                          <circle cx={dx + 8} cy={dy - 3} r="3.8" fill="#1e293b" />
                          {/* Seated Student Figure */}
                          {isOccupied && (
                            <circle
                              cx={dx + 15}
                              cy={dy + 4}
                              r="4.2"
                              fill={(col + row) % 2 === 0 ? '#2563eb' : '#0f172a'}
                            />
                          )}
                        </g>
                      );
                    })
                  )}

                  <text
                    x="325"
                    y="206"
                    textAnchor="middle"
                    className="fill-slate-950 text-[11px] font-bold"
                  >
                    Quiet study (bookable) · {occPct}%
                  </text>

                  {/* Group Study Glass Pods (Right Wing) */}
                  {[0, 1, 2, 3].map((podIdx) => {
                    const px = 445 + (podIdx % 2) * 44;
                    const py = 185 + Math.floor(podIdx / 2) * 34;
                    return (
                      <g key={podIdx}>
                        {/* Translucent Glass Pod Walls */}
                        <polygon
                          points={`${px},${py} ${px + 30},${py - 8} ${px + 40},${py + 6} ${px + 10},${py + 14}`}
                          fill="rgba(125, 211, 252, 0.35)"
                          stroke="#0284c7"
                          strokeWidth="1.2"
                        />
                        {/* Group Pod Table */}
                        <polygon
                          points={`${px + 8},${py + 2} ${px + 22},${py - 2} ${px + 26},${py + 4} ${px + 12},${py + 8}`}
                          fill="#78350f"
                        />
                        {/* 4 Pod Chairs */}
                        <circle cx={px + 11} cy={py - 1} r="2.8" fill="#1e293b" />
                        <circle cx={px + 21} cy={py - 3} r="2.8" fill="#2563eb" />
                        <circle cx={px + 15} cy={py + 8} r="2.8" fill="#1e293b" />
                        <circle cx={px + 25} cy={py + 5} r="2.8" fill="#1e293b" />
                      </g>
                    );
                  })}

                  <text
                    x="475"
                    y="238"
                    textAnchor="middle"
                    className="fill-slate-950 text-[11px] font-bold"
                  >
                    Group rooms · {Math.min(95, occPct - 2)}%
                  </text>

                  {/* Floating Water Refill & Charging Socket Badges in 3D */}
                  <g transform="translate(345, 194)">
                    <rect x="0" y="0" width="26" height="18" rx="9" fill="#ffffff" stroke="#cbd5e1" />
                    <text x="13" y="13" textAnchor="middle" className="text-[11px]">
                      💧
                    </text>
                  </g>
                  <g transform="translate(465, 148)">
                    <rect x="0" y="0" width="34" height="18" rx="9" fill="#ffffff" stroke="#cbd5e1" />
                    <text x="17" y="13" textAnchor="middle" className="text-[11px]">
                      ⚡⚡
                    </text>
                  </g>
                </g>
              </svg>
            </div>

            <div className="text-center text-xs text-slate-500">
              3D · Use rotation slider or click any floor tab above to inspect interior study furniture & zones
            </div>
          </div>

          {/* RIGHT PANE (5 cols): 2D Architectural Schematic Floor Plan (Real Outline) + KPIs + Crowd Reporting */}
          <div className="lg:col-span-5 p-6 bg-white flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Floor {activeFloor.floorNumber} · {activeFloor.name}
                </h3>
                <span className="text-xs text-slate-400">
                  Floor plan (schematic, real outline)
                </span>
              </div>

              {/* 2D Schematic Real-Outline Architectural Floor Plan SVG (Matching Screenshot 3 Right Pane) */}
              <div className="bg-[#f1f5f9] border border-slate-200 rounded-xl p-4 flex items-center justify-center">
                <svg
                  viewBox="0 0 420 270"
                  className="w-full h-56 select-none"
                  aria-label={`2D schematic floor plan of ${activeFloor.name}`}
                >
                  {/* Real L-Shaped Architectural Perimeter Wall Outline */}
                  <polygon
                    points="60,130 140,130 140,25 360,25 360,190 285,190 285,245 60,245"
                    fill="#f3e5c8"
                    stroke="#334155"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  />

                  {/* Internal Zone Partition Dashed Lines */}
                  <line
                    x1="155"
                    y1="25"
                    x2="155"
                    y2="245"
                    stroke="#64748b"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1="268"
                    y1="25"
                    x2="268"
                    y2="190"
                    stroke="#64748b"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />

                  {/* Central Lift & Stairs Core Box */}
                  <rect
                    x="198"
                    y="112"
                    width="34"
                    height="30"
                    fill="#e2e8f0"
                    stroke="#475569"
                    strokeWidth="1.5"
                  />
                  <line x1="198" y1="112" x2="232" y2="142" stroke="#64748b" strokeWidth="1" />
                  <line x1="232" y1="112" x2="198" y2="142" stroke="#64748b" strokeWidth="1" />
                  <text x="215" y="154" textAnchor="middle" className="fill-slate-600 text-[9px] font-medium">
                    Lift & stairs
                  </text>

                  {/* Quiet Study Desks Grid (Center Section) */}
                  {[0, 1, 2].map((col) =>
                    [0, 1, 2, 3, 4, 5].map((row) => {
                      const x = 168 + col * 32;
                      const y = 38 + row * 32;
                      if (x > 188 && x < 238 && y > 100 && y < 155) return null;
                      return (
                        <g key={`desk-${col}-${row}`}>
                          <rect
                            x={x}
                            y={y}
                            width="18"
                            height="10"
                            rx="1.5"
                            fill="#a1805b"
                          />
                          <circle
                            cx={x + 9}
                            cy={y - 3.5}
                            r="2.8"
                            fill={(col + row) % 2 === 0 ? '#1e293b' : '#ffffff'}
                            stroke="#334155"
                            strokeWidth="0.8"
                          />
                        </g>
                      );
                    })
                  )}

                  {/* Glass Group Pods (Right Wing) */}
                  {[0, 1].map((gCol) =>
                    [0, 1, 2, 3].map((gRow) => {
                      const gx = 278 + gCol * 38;
                      const gy = 34 + gRow * 36;
                      return (
                        <g key={`pod-${gCol}-${gRow}`}>
                          <rect
                            x={gx}
                            y={gy}
                            width="30"
                            height="28"
                            rx="2"
                            fill="rgba(186, 230, 253, 0.55)"
                            stroke="#0284c7"
                            strokeWidth="1.2"
                          />
                          <rect x={gx + 8} y={gy + 9} width="14" height="10" fill="#a1805b" />
                          <circle cx={gx + 11} cy={gy + 5} r="2.2" fill="#1e293b" />
                          <circle cx={gx + 19} cy={gy + 5} r="2.2" fill="#1e293b" />
                          <circle cx={gx + 11} cy={gy + 23} r="2.2" fill="#1e293b" />
                          <circle cx={gx + 19} cy={gy + 23} r="2.2" fill="#1e293b" />
                        </g>
                      );
                    })
                  )}

                  {/* Café Tables & Benches (Bottom-Left Wing) */}
                  {[0, 1, 2].map((cCol) =>
                    [0, 1, 2].map((cRow) => {
                      const cx = 78 + cCol * 24;
                      const cy = 156 + cRow * 26;
                      return (
                        <g key={`cafe-${cCol}-${cRow}`}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r="5"
                            fill="#ffffff"
                            stroke="#64748b"
                            strokeWidth="1"
                          />
                          <circle cx={cx - 7} cy={cy} r="2.2" fill="#1e293b" />
                          <circle cx={cx + 7} cy={cy} r="2.2" fill="#1e293b" />
                        </g>
                      );
                    })
                  )}

                  {/* Zone Title Overlays */}
                  <text
                    x="215"
                    y="98"
                    textAnchor="middle"
                    className="fill-slate-900 text-[12px] font-bold"
                  >
                    Quiet study (bookable)
                  </text>
                  <text
                    x="215"
                    y="112"
                    textAnchor="middle"
                    className="fill-slate-700 text-[10px] font-semibold"
                  >
                    {occPct}% · Desks
                  </text>

                  <text
                    x="312"
                    y="155"
                    textAnchor="middle"
                    className="fill-slate-900 text-[11px] font-bold"
                  >
                    Group rooms
                  </text>
                  <text
                    x="312"
                    y="168"
                    textAnchor="middle"
                    className="fill-slate-700 text-[10px] font-semibold"
                  >
                    {Math.max(30, occPct - 2)}% · Glass pods
                  </text>

                  <text
                    x="105"
                    y="206"
                    textAnchor="middle"
                    className="fill-slate-900 text-[11px] font-bold"
                  >
                    Café
                  </text>
                  <text
                    x="105"
                    y="219"
                    textAnchor="middle"
                    className="fill-slate-700 text-[10px] font-semibold"
                  >
                    {Math.max(25, occPct - 14)}% · Café
                  </text>

                  {/* Water & Charging Icons on 2D Plan */}
                  <text x="234" y="122" className="text-[12px]">
                    💧
                  </text>
                  <text x="332" y="54" className="text-[12px]">
                    ⚡⚡
                  </text>
                </svg>
              </div>

              {/* Architectural Legend Row */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2 rounded-xs bg-[#78350f]" /> Shelves
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2 rounded-xs bg-[#a1805b]" /> Desks/tables
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2 rounded-xs bg-sky-200 border border-sky-600" /> Glass pod
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-900" /> Person
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2 rounded-xs bg-slate-300 border border-slate-600" /> Lift & stairs
                </span>
                <span>⚡ Charging</span>
                <span>💧 Water</span>
              </div>
            </div>

            {/* 5 KPI Summary Cards (Matching Screenshot 3) */}
            <div className="grid grid-cols-5 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-100 text-center">
                <div className="text-sm font-bold text-amber-600 font-mono-tabular">
                  {occPct}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {occPct < 45 ? 'Quiet' : occPct <= 70 ? 'Moderate' : 'Busy'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-center">
                <div className="text-sm font-bold text-slate-900 font-mono-tabular">
                  ~{vacantSeats}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">seats free</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-center">
                <div className="text-sm font-bold text-slate-900 font-mono-tabular">
                  ~{measuredDba ?? activeFloor.noiseDba} dB
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {activeFloor.noiseDba <= 32 ? 'Silent' : 'Calm'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-center">
                <div className="text-sm font-bold text-amber-500">⚡⚡</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {activeFloor.powerOutletsPct}% sockets
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 text-center">
                <div className="text-sm font-bold text-sky-500">💧</div>
                <div className="text-[10px] text-slate-500 mt-0.5">water refill</div>
              </div>
            </div>

            {/* Live Student Crowd & Acoustic Report Buttons + Book Seat Action */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="text-[11px] text-slate-500 leading-relaxed">
                Seats: Time-of-day estimate + live student reports · Features:{' '}
                {activeFloor.features.join(', ')}.
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleReportStatus('Noisy here')}
                  className="py-2 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Noisy here</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleReportStatus('Quiet here')}
                  className="py-2 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Quiet here</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleReportStatus('Seats free')}
                  className="py-2 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1"
                >
                  <Armchair className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Seats free</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleReportStatus('Crowded')}
                  className="py-2 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-500" />
                  <span>Crowded</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMeasureNoise4s}
                  className="flex-1 py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {measuringNoise
                      ? 'Measuring ambient noise...'
                      : 'Measure the noise here (4 s)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onReserveSeat(building.id, activeFloor.floorNumber)}
                  disabled={vacantSeats === 0}
                  className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Book Seat on Floor {activeFloor.floorNumber}</span>
                </button>
              </div>

              {crowdReportToast && (
                <div className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  ✓ {crowdReportToast}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
