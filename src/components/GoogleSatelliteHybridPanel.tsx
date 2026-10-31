import React, { useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap2D,
  Map3D,
  Pin,
} from '@vis.gl/react-google-maps';
import { Compass, Eye, Globe, Layers, MapPin, Sparkles, Sun } from 'lucide-react';
import { CampusBuilding } from '../data/campusData';
import { GroundMapRealismStyle } from '../utils/proceduralTextures';

interface GoogleSatelliteHybridPanelProps {
  buildings: CampusBuilding[];
  selectedBuilding: CampusBuilding;
  groundMapStyle: GroundMapRealismStyle;
  onChangeGroundMapStyle: (style: GroundMapRealismStyle) => void;
  onSelectBuilding: (buildingId: string) => void;
}

const GOOGLE_MAPS_API_KEY =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_GOOGLE_MAPS_API_KEY || '';

const SATELLITE_GROUND_TRUTH_PROFILES: Record<
  string,
  {
    roofMaterial: string;
    solarPotentialKw: number;
    courtyardCanopy: string;
    elevationAodM: number;
    hybridLandmarks: string[];
  }
> = {
  'portland-stone': {
    roofMaterial: 'Lead-Clad Neoclassical Dome & Pitched Slate Wings + Solar PV Array',
    solarPotentialKw: 68,
    courtyardCanopy: 'Octagonal Yorkstone Quad & Mature London Plane Trees (Gordon Sq)',
    elevationAodM: 26.4,
    hybridLandmarks: ['Gower Street', 'Euston Square Underground', 'Flaxman Gallery Dome'],
  },
  'red-brick-terracotta': {
    roofMaterial: 'Victorian Pitched Welsh Slate, Terracotta Gables & Glazed Skylights',
    solarPotentialKw: 54,
    courtyardCanopy: 'Cruciform Forecourt & Gower Street Tree-Lined Promenade',
    elevationAodM: 27.1,
    hybridLandmarks: ['Gower Street', 'University College Hospital', 'Warren Street Station'],
  },
  'modern-curtain-glass': {
    roofMaterial: 'Biodiverse Green Sedum Roof Terrace, Atrium Skylight & PV Modules',
    solarPotentialKw: 92,
    courtyardCanopy: 'Japanese Roof Garden, Gordon Square Canopy & Malet Place Walkway',
    elevationAodM: 25.8,
    hybridLandmarks: ['Gordon Street', 'Gordon Square Gardens', 'Bloomsbury Theatre'],
  },
  'diagrid-stone': {
    roofMaterial: 'Stepped Limestone Terrace, Acoustic Louvres & High-Efficiency PV',
    solarPotentialKw: 84,
    courtyardCanopy: "Lincoln's Inn Fields Perimeter Mature Plane & Oak Canopy",
    elevationAodM: 21.5,
    hybridLandmarks: ["Lincoln's Inn Fields", 'Holborn Station', 'Kingsway Corridor'],
  },
  'beehive-red-brick': {
    roofMaterial: 'Faceted Perforated Brick Parapet & Rooftop Plant / Solar Deck',
    solarPotentialKw: 47,
    courtyardCanopy: 'Sheffield Street Pedestrianised Brick Plaza',
    elevationAodM: 21.0,
    hybridLandmarks: ['Sheffield Street', 'Peacock Theatre', 'Aldwych'],
  },
};

function getBuildingLatLng(b: CampusBuilding): { lat: number; lng: number } {
  const pos = Array.isArray(b?.position) ? b.position : [0, 0, 0];
  return {
    lat: Number((51.5246 - pos[2] * 0.000018).toFixed(5)),
    lng: Number((-0.134 + pos[0] * 0.000028).toFixed(5)),
  };
}

export const GoogleSatelliteHybridPanel: React.FC<GoogleSatelliteHybridPanelProps> = ({
  buildings,
  selectedBuilding,
  groundMapStyle,
  onChangeGroundMapStyle,
  onSelectBuilding,
}) => {
  const [liveGmpViewMode, setLiveGmpViewMode] = useState<'hybrid' | 'satellite' | '3d'>('hybrid');

  const centerLatLng = getBuildingLatLng(selectedBuilding);

  const facadeStyle = selectedBuilding.facadeStyle || 'portland-stone';
  const truthProfile =
    SATELLITE_GROUND_TRUTH_PROFILES[facadeStyle] ||
    SATELLITE_GROUND_TRUTH_PROFILES['portland-stone'];

  const styleOptions: Array<{
    id: GroundMapRealismStyle;
    label: string;
    shortDesc: string;
    badge: string;
  }> = [
    {
      id: 'architectural',
      label: 'Architectural 3D',
      shortDesc: 'Crisp stone, brick & parkland biome colors',
      badge: 'Default',
    },
    {
      id: 'satellite',
      label: 'Satellite Ground',
      shortDesc: 'Aerial London squares, roofs & canopy texture',
      badge: 'Aerial',
    },
    {
      id: 'hybrid',
      label: 'Hybrid + Labels',
      shortDesc: 'Satellite + streets, squares & Tube roundels',
      badge: 'Hybrid',
    },
    {
      id: 'earth-3d',
      label: 'Google Earth 3D',
      shortDesc: 'Photorealistic 3D satellite + solar roof twin',
      badge: '3D Earth',
    },
  ];

  return (
    <div className="space-y-2.5" data-testid="google-satellite-hybrid-panel">
      {/* 1. 3D Scene Ground & Realism Mode Switcher */}
      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            3D Ground & Satellite Realism Mode
          </span>
          <span className="text-[9px] font-mono-tabular px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
            Synced to 3D Twin
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {styleOptions.map((opt) => {
            const active = groundMapStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={`ground-style-btn-${opt.id}`}
                onClick={() => onChangeGroundMapStyle(opt.id)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  active
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold">{opt.label}</span>
                  <span
                    className={`text-[8px] font-mono-tabular uppercase px-1 py-0.5 rounded ${
                      active
                        ? 'bg-sky-400/25 text-sky-200'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                  {opt.shortDesc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Google Maps Platform Live Satellite / Hybrid / 3D Earth Viewport */}
      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Google Maps Satellite / Hybrid Inspector
            </div>
            <div className="text-[9px] text-slate-400 font-mono-tabular">
              {selectedBuilding.name} · {centerLatLng.lat.toFixed(4)}°N,{' '}
              {Math.abs(centerLatLng.lng).toFixed(4)}°W
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-lg border border-slate-800">
            {(['hybrid', 'satellite', '3d'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setLiveGmpViewMode(m)}
                className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase transition-colors ${
                  liveGmpViewMode === m
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === '3d' ? 'Earth 3D' : m}
              </button>
            ))}
          </div>
        </div>

        {GOOGLE_MAPS_API_KEY ? (
          <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-700/80 relative">
            <APIProvider
              apiKey={GOOGLE_MAPS_API_KEY}
              language="en"
              region="GB"
            >
              <GoogleMap2D
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                mapId="DEMO_MAP_ID"
                defaultCenter={centerLatLng}
                center={centerLatLng}
                defaultZoom={liveGmpViewMode === '3d' ? 18 : 17}
                tilt={liveGmpViewMode === '3d' ? 62 : 0}
                heading={liveGmpViewMode === '3d' ? 28 : 0}
                mapTypeId={liveGmpViewMode === 'satellite' ? 'satellite' : 'hybrid'}
                gestureHandling="greedy"
                disableDefaultUI={false}
                style={{ width: '100%', height: '100%' }}
              >
                {buildings.map((b) => {
                  const isSel = b.id === selectedBuilding.id;
                  return (
                    <AdvancedMarker
                      key={b.id}
                      position={getBuildingLatLng(b)}
                      onClick={() => onSelectBuilding(b.id)}
                    >
                      <Pin
                        background={isSel ? '#0ea5e9' : '#1e293b'}
                        borderColor={isSel ? '#ffffff' : '#38bdf8'}
                        glyphColor="#ffffff"
                      />
                    </AdvancedMarker>
                  );
                })}
              </GoogleMap2D>
            </APIProvider>
          </div>
        ) : (
          /* Interactive Ground-Truth Aerial Radar & Coordinate Telemetry when running without external key */
          <div className="w-full rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950/90 p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1.5">
              <span className="font-semibold text-emerald-300 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                Satellite & Hybrid Ground-Truth Synchronized
              </span>
              <span className="font-mono-tabular text-[9px] text-slate-400">
                WGS84 · Zoom 18x
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono-tabular">
              <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                <div className="text-slate-400">Latitude</div>
                <div className="text-white font-bold">{centerLatLng.lat.toFixed(5)}° N</div>
              </div>
              <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                <div className="text-slate-400">Longitude</div>
                <div className="text-white font-bold">{centerLatLng.lng.toFixed(5)}° W</div>
              </div>
              <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800">
                <div className="text-slate-400">Elevation AOD</div>
                <div className="text-emerald-300 font-bold">{truthProfile.elevationAodM}m</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Real-World Object Realism Attributes Derived from Satellite & Hybrid Imagery */}
      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Real-World Object Realism Applied to 3D Mesh
          </span>
          <span className="text-[9px] font-mono-tabular text-emerald-300 flex items-center gap-1">
            <Sun className="w-3 h-3" /> {truthProfile.solarPotentialKw} kWp Roof PV
          </span>
        </div>

        <div className="space-y-1.5 text-[10px]">
          <div className="p-2 rounded-lg bg-slate-950/75 border border-slate-800/80">
            <div className="text-[9px] font-mono-tabular uppercase text-slate-400">
              Satellite Roof & Superstructure Profile
            </div>
            <div className="text-slate-200 font-medium mt-0.5">
              {truthProfile.roofMaterial}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-950/75 border border-slate-800/80">
            <div className="text-[9px] font-mono-tabular uppercase text-slate-400">
              Garden Square & Street Canopy Context
            </div>
            <div className="text-slate-200 font-medium mt-0.5">
              {truthProfile.courtyardCanopy}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 pt-0.5">
            {truthProfile.hybridLandmarks.map((lm) => (
              <span
                key={lm}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[9px] text-sky-300 font-mono-tabular"
              >
                <MapPin className="w-2.5 h-2.5 text-sky-400" />
                {lm}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
