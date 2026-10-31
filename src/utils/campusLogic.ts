import { CampusBuilding, FloorZone, BuildingArchetype, TerrainPreset } from '../data/campusData';

export interface SunEnvironmentState {
  hour: number;
  sunPosition: [number, number, number];
  sunIntensity: number;
  sunColorHex: string;
  hemiSkyHex: string;
  hemiGroundHex: string;
  hemiIntensity: number;
  fogColorHex: string;
  fogDensity: number;
  isNight: boolean;
  isGoldenHour: boolean;
  phaseLabel: string;
  windowGlowIntensity: number;
}

export interface HeatEvaluation {
  score: number; // 0 (vacant/quiet) to 1 (crowded/loud)
  rgb: [number, number, number];
  hex: string;
  statusLabel: string;
  shortTag: string;
}

export interface StudySpaceFilter {
  maxNoiseDba: number;
  only24Hours: boolean;
  minAvailableSeats: number;
  searchQuery: string;
}

export interface RankedStudySpot {
  buildingId: string;
  buildingName: string;
  shortCode: string;
  open24Hours: boolean;
  floor: FloorZone;
  availableSeats: number;
  occupancyPct: number;
  quietScore: number; // 0 to 100 higher is better
  heat: HeatEvaluation;
}

export interface WalkthroughHudChoreography {
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  dockCollapsed: boolean;
  choreographyLabel: string;
}

export interface WalkthroughStep {
  stepIndex: number;
  totalSteps: number;
  universityId: string;
  campusId: string;
  buildingId: string;
  floorNumber: number | null;
  solarHour: number;
  cameraPreset: 'overview' | 'focus-building' | 'street-level' | 'floor-cutaway';
  featureBadge: string;
  title: string;
  narration: string;
  hudState: WalkthroughHudChoreography;
  midStepHudState: WalkthroughHudChoreography;
}

export const DEMO_WALKTHROUGH_STEPS: Omit<WalkthroughStep, 'stepIndex' | 'totalSteps'>[] = [
  {
    universityId: 'ucl-london',
    campusId: 'ucl-bloomsbury',
    buildingId: 'ucl-wilkins-main-lib',
    floorNumber: null,
    solarHour: 16.5,
    cameraPreset: 'overview',
    featureBadge: 'Unified 3D London Map · 4 Universities',
    title: '4-University 3D Twin · UCL, KCL, Imperial & LSE',
    narration:
      'Welcome to our 3D London Digital Twin uniting four world-leading universities: University College London, King’s College London, Imperial College London, and the London School of Economics. Starting at UCL Bloomsbury’s Wilkins Portico, every campus sits on real 3D terrain with live acoustic and seat telemetry.',
    hudState: {
      leftCollapsed: false,
      rightCollapsed: false,
      dockCollapsed: false,
      choreographyLabel: 'Expand All · 4-University Command HUD',
    },
    midStepHudState: {
      leftCollapsed: false,
      rightCollapsed: true,
      dockCollapsed: true,
      choreographyLabel: 'Campus HUD Only · Spotlight 3D Portico',
    },
  },
  {
    universityId: 'ucl-london',
    campusId: 'ucl-bloomsbury',
    buildingId: 'ucl-student-centre',
    floorNumber: 1,
    solarHour: 21.5,
    cameraPreset: 'floor-cutaway',
    featureBadge: '3D Floor Cutaway & Live dBA Heatmap',
    title: 'University College London (UCL) · 3D Floor Cutaway',
    narration:
      'At University College London’s 24/7 Student Centre, our interactive 3D Floor-by-Floor Cutaway slices directly into the building to reveal real-time acoustic heatmaps, isolating over one hundred silent study seats at 26 decibels.',
    hudState: {
      leftCollapsed: true,
      rightCollapsed: false,
      dockCollapsed: true,
      choreographyLabel: 'Floor & Seat Telemetry Panel Expanded',
    },
    midStepHudState: {
      leftCollapsed: true,
      rightCollapsed: false,
      dockCollapsed: false,
      choreographyLabel: 'Telemetry Panel + 3D Heatmap Dock Expanded',
    },
  },
  {
    universityId: 'kcl-london',
    campusId: 'kcl-strand',
    buildingId: 'kcl-maughan-lib',
    floorNumber: 2,
    solarHour: 17.75,
    cameraPreset: 'focus-building',
    featureBadge: 'Solar Raycasting & 3D River Topography',
    title: 'King’s College London (KCL) · Strand & Maughan Library',
    narration:
      'Flying south to King’s College London on the Strand and the neo-Gothic Maughan Library, our real-time Solar and Golden Hour engine casts volumetric shadows across the River Thames embankment, Bush House, and the 25-decibel Dodecagonal Reading Room.',
    hudState: {
      leftCollapsed: true,
      rightCollapsed: true,
      dockCollapsed: false,
      choreographyLabel: 'Bottom 3D Solar & Terrain Dock Expanded',
    },
    midStepHudState: {
      leftCollapsed: true,
      rightCollapsed: true,
      dockCollapsed: true,
      choreographyLabel: 'Collapse All · Unobstructed Golden Hour 3D',
    },
  },
  {
    universityId: 'imperial-london',
    campusId: 'imperial-south-ken',
    buildingId: 'imp-queens-tower',
    floorNumber: null,
    solarHour: 14.5,
    cameraPreset: 'overview',
    featureBadge: 'Full-Bleed 3D Massing & Flow Radar FX',
    title: 'Imperial College London · South Kensington 3D Quad',
    narration:
      'At Imperial College London in South Kensington, all HUD controls collapse for a full-bleed 3D view of the 87-meter Queen’s Tower and the 24/7 Abdus Salam Library, showcasing live student flow particles and acoustic radar rings.',
    hudState: {
      leftCollapsed: true,
      rightCollapsed: true,
      dockCollapsed: true,
      choreographyLabel: 'Collapse All · Full-Bleed 3D Queen’s Lawn',
    },
    midStepHudState: {
      leftCollapsed: true,
      rightCollapsed: false,
      dockCollapsed: true,
      choreographyLabel: 'Right Telemetry & Transit Panel Expanded',
    },
  },
  {
    universityId: 'lse-london',
    campusId: 'lse-aldwych-holborn',
    buildingId: 'lse-mar-marshall',
    floorNumber: 2,
    solarHour: 18.25,
    cameraPreset: 'focus-building',
    featureBadge: 'Nocturnal Window Glow & Transit Corridors',
    title: 'London School of Economics (LSE) · Marshall Hub',
    narration:
      'Cruising to the London School of Economics in Holborn and Aldwych, our Nocturnal Neon shader illuminates the Marshall Building and Lionel Robbins Library while mapping real walking, cycling, and Tube routes linking LSE, King’s College London, UCL, and Imperial.',
    hudState: {
      leftCollapsed: true,
      rightCollapsed: false,
      dockCollapsed: false,
      choreographyLabel: 'Nocturnal FX Dock + Transit Routes Expanded',
    },
    midStepHudState: {
      leftCollapsed: false,
      rightCollapsed: true,
      dockCollapsed: true,
      choreographyLabel: 'Left University Switcher Expanded',
    },
  },
  {
    universityId: 'ucl-london',
    campusId: 'ucl-east',
    buildingId: 'ucl-marshgate',
    floorNumber: 3,
    solarHour: 19.0,
    cameraPreset: 'floor-cutaway',
    featureBadge: 'Expand All Controls · Vector PDF & GeoJSON',
    title: '4-University Finale · UCL East, KCL, Imperial & LSE',
    narration:
      'Completing our tour at UCL East Marshgate on the Olympic Park waterfront, all workspace controls expand together so you can compare University College London, King’s College London, Imperial College London, and the London School of Economics, or export vector PDFs.',
    hudState: {
      leftCollapsed: true,
      rightCollapsed: true,
      dockCollapsed: true,
      choreographyLabel: 'Collapse All · Olympic Park 3D Fly-In',
    },
    midStepHudState: {
      leftCollapsed: false,
      rightCollapsed: false,
      dockCollapsed: false,
      choreographyLabel: 'Expand All · Complete Hackathon Workspace',
    },
  },
];

export function getWalkthroughStep(index: number): WalkthroughStep {
  const total = DEMO_WALKTHROUGH_STEPS.length;
  const safeIdx = ((index % total) + total) % total;
  return {
    ...DEMO_WALKTHROUGH_STEPS[safeIdx],
    stepIndex: safeIdx,
    totalSteps: total,
  };
}

export function formatWalkthroughSpeechScript(step: WalkthroughStep): string {
  return `Stop ${step.stepIndex + 1} of ${step.totalSteps}: ${step.title}. ${step.narration}`;
}

/**
 * Computes real-time volumetric sun position, color temperature, fog, and neon window glow
 * from a 24-hour decimal time (0.0 to 24.0).
 */
export function calculateSunState(rawHour: number): SunEnvironmentState {
  const hour = ((rawHour % 24) + 24) % 24;
  const dayProgress = (hour - 6) / 12;
  const sunAngle = dayProgress * Math.PI;

  const radius = 65;
  const elevation = Math.sin(sunAngle) * radius;
  const horizontal = -Math.cos(sunAngle) * radius;
  const azimuthZ = Math.sin(sunAngle * 0.7) * 28 + 18;

  const isNight = hour < 6.0 || hour >= 19.2;
  const isGoldenHour =
    (hour >= 6.0 && hour <= 7.8) || (hour >= 17.0 && hour < 19.2);

  if (isNight) {
    return {
      hour,
      sunPosition: [horizontal * 0.5, 32, -25],
      sunIntensity: 0.36,
      sunColorHex: '#60a5fa',
      hemiSkyHex: '#1e293b',
      hemiGroundHex: '#090d16',
      hemiIntensity: 0.42,
      fogColorHex: '#070b14',
      fogDensity: 0.0022,
      isNight: true,
      isGoldenHour: false,
      phaseLabel: 'Nocturnal Neon Cycle',
      windowGlowIntensity: 0.58,
    };
  }

  if (isGoldenHour) {
    return {
      hour,
      sunPosition: [horizontal, Math.max(18, elevation), azimuthZ],
      sunIntensity: 1.15,
      sunColorHex: '#fb923c',
      hemiSkyHex: '#fdba74',
      hemiGroundHex: '#1e293b',
      hemiIntensity: 0.65,
      fogColorHex: '#2a1f2d',
      fogDensity: 0.0018,
      isNight: false,
      isGoldenHour: true,
      phaseLabel: hour < 12 ? 'Dawn Golden Hour' : 'Dusk Golden Hour',
      windowGlowIntensity: 0.25,
    };
  }

  return {
    hour,
    sunPosition: [horizontal, Math.max(34, elevation), azimuthZ],
    sunIntensity: 1.38,
    sunColorHex: '#fffbeb',
    hemiSkyHex: '#e2e8f0',
    hemiGroundHex: '#475569',
    hemiIntensity: 0.76,
    fogColorHex: '#c7d9ec',
    fogDensity: 0.0011,
    isNight: false,
    isGoldenHour: false,
    phaseLabel: 'Solar Daylight Cycle',
    windowGlowIntensity: 0.0,
  };
}

/**
 * Evaluates occupancy ratio (0..1) and noise level (dBA) into a volumetric heatmap color
 * and accessible semantic label (never conveying state by color alone).
 */
export function computeHeatColor(occupancyRatio: number, noiseDba: number): HeatEvaluation {
  const clampedOcc = Math.max(0, Math.min(1, occupancyRatio));
  const normalizedNoise = Math.max(0, Math.min(1, (noiseDba - 24) / 42));
  const score = Number((clampedOcc * 0.55 + normalizedNoise * 0.45).toFixed(3));

  if (score < 0.35) {
    return {
      score,
      rgb: [0.06, 0.72, 0.5],
      hex: '#10b981',
      statusLabel: 'Vacant · Silent Sanctuary',
      shortTag: 'Low Noise / Vacant',
    };
  }
  if (score < 0.65) {
    return {
      score,
      rgb: [0.96, 0.62, 0.04],
      hex: '#f59e0b',
      statusLabel: 'Moderate · Whisper Study',
      shortTag: 'Moderate Activity',
    };
  }
  return {
    score,
    rgb: [0.94, 0.27, 0.27],
    hex: '#ef4444',
    statusLabel: 'Crowded · High Activity',
    shortTag: 'Crowded / High Noise',
  };
}

export function getBuildingAggregateMetrics(building: CampusBuilding) {
  const totalSeats = building.floors.reduce((acc, f) => acc + (Number(f.totalSeats) || 0), 0);
  const occupiedSeats = building.floors.reduce((acc, f) => acc + (Number(f.occupiedSeats) || 0), 0);
  const availableSeats = Math.max(0, totalSeats - occupiedSeats);
  const occupancyRatio = totalSeats > 0 ? occupiedSeats / totalSeats : 0;
  const occupancyPct = Number.isFinite(occupancyRatio) ? Math.round(occupancyRatio * 100) : 0;
  const minNoiseDba = building.floors.reduce(
    (min, f) => Math.min(min, f.noiseDba),
    building.floors[0]?.noiseDba ?? 35
  );
  const avgNoiseDba = Math.round(
    building.floors.reduce((sum, f) => sum + f.noiseDba, 0) /
      Math.max(1, building.floors.length)
  );
  const heat = computeHeatColor(occupancyRatio, avgNoiseDba);

  return {
    totalSeats,
    occupiedSeats,
    availableSeats,
    occupancyRatio,
    occupancyPct,
    minNoiseDba,
    avgNoiseDba,
    heat,
  };
}

export function filterStudySpaces(
  buildings: CampusBuilding[],
  filter: StudySpaceFilter
): RankedStudySpot[] {
  const query = filter.searchQuery.trim().toLowerCase();
  const spots: RankedStudySpot[] = [];

  for (const b of buildings) {
    if (filter.only24Hours && !b.open24Hours) continue;

    for (const floor of b.floors) {
      const availableSeats = Math.max(0, floor.totalSeats - floor.occupiedSeats);
      if (floor.noiseDba > filter.maxNoiseDba) continue;
      if (availableSeats < filter.minAvailableSeats) continue;

      if (query) {
        const hay = `${b.name} ${b.shortCode} ${b.category} ${floor.name} ${floor.features.join(' ')}`.toLowerCase();
        if (!hay.includes(query)) continue;
      }

      const occupancyRatio = floor.totalSeats > 0 ? floor.occupiedSeats / floor.totalSeats : 0;
      const heat = computeHeatColor(occupancyRatio, floor.noiseDba);
      const quietScore = Math.max(
        1,
        Math.min(
          99,
          Math.round(
            (1 - heat.score) * 75 +
              (b.open24Hours ? 12 : 0) +
              (floor.powerOutletsPct / 100) * 13
          )
        )
      );

      spots.push({
        buildingId: b.id,
        buildingName: b.name,
        shortCode: b.shortCode,
        open24Hours: b.open24Hours,
        floor,
        availableSeats,
        occupancyPct: Math.round(occupancyRatio * 100),
        quietScore,
        heat,
      });
    }
  }

  return spots.sort((a, b) => b.quietScore - a.quietScore || a.floor.noiseDba - b.floor.noiseDba);
}

export function reserveStudySeat(
  buildings: CampusBuilding[],
  buildingId: string,
  floorNumber: number
): {
  updatedBuildings: CampusBuilding[];
  reserved: boolean;
  confirmationCode: string | null;
  error?: string;
} {
  let reserved = false;
  let error: string | undefined;

  const updatedBuildings = buildings.map((b) => {
    if (b.id !== buildingId) return b;
    const updatedFloors = b.floors.map((f) => {
      if (f.floorNumber !== floorNumber) return f;
      if (f.occupiedSeats >= f.totalSeats) {
        error = 'No vacant seats remaining on this floor.';
        return f;
      }
      reserved = true;
      return {
        ...f,
        occupiedSeats: f.occupiedSeats + 1,
      };
    });
    return { ...b, floors: updatedFloors };
  });

  if (!reserved) {
    return {
      updatedBuildings: buildings,
      reserved: false,
      confirmationCode: null,
      error: error || 'Target building or floor not found.',
    };
  }

  const targetBuilding = buildings.find((b) => b.id === buildingId);
  const code = `${targetBuilding?.shortCode || 'CMP'}-${floorNumber}F-${Math.floor(100 + ((buildingId.length * 37 + floorNumber * 19) % 899))}`;
  return {
    updatedBuildings,
    reserved: true,
    confirmationCode: code,
  };
}

export function parseBlueprintToBuilding(
  rawSpec: string,
  existingCount: number
): { building?: CampusBuilding; error?: string } {
  const trimmed = rawSpec.trim();
  if (!trimmed) {
    return { error: 'Please provide a vector JSON spec or building blueprint description.' };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed.name || typeof parsed.name !== 'string') {
      return { error: 'Blueprint JSON must include a valid "name" string.' };
    }
    const validArchetypes: BuildingArchetype[] = [
      'gothic-library',
      'cantilever-tech',
      'geodesic-dome',
      'observatory-tower',
      'timber-pavilion',
      'classical-cloister',
    ];
    const archetype: BuildingArchetype = validArchetypes.includes(parsed.archetype)
      ? parsed.archetype
      : 'cantilever-tech';

    const angle = (existingCount * 1.15) % (Math.PI * 2);
    const defaultPos: [number, number, number] = [
      Math.round(Math.cos(angle) * 28),
      0,
      Math.round(Math.sin(angle) * 24),
    ];

    const position: [number, number, number] =
      Array.isArray(parsed.position) && parsed.position.length === 3
        ? [Number(parsed.position[0]) || 0, 0, Number(parsed.position[2]) || 0]
        : defaultPos;

    const dimensions: [number, number, number] =
      Array.isArray(parsed.dimensions) && parsed.dimensions.length === 3
        ? [
            Math.max(8, Math.min(22, Number(parsed.dimensions[0]) || 13)),
            Math.max(7, Math.min(22, Number(parsed.dimensions[1]) || 12)),
            Math.max(8, Math.min(22, Number(parsed.dimensions[2]) || 11)),
          ]
        : [13, 12, 11];

    const floors: FloorZone[] =
      Array.isArray(parsed.floors) && parsed.floors.length > 0
        ? parsed.floors.map((f: Record<string, unknown>, idx: number) => ({
            floorNumber: Number(f.floorNumber) || idx + 1,
            name: String(f.name || `${idx + 1}F Synthesized Study Level`),
            noiseDba: Math.max(22, Math.min(75, Number(f.noiseDba) || 30)),
            occupiedSeats: Math.max(0, Number(f.occupiedSeats) || 8),
            totalSeats: Math.max(10, Number(f.totalSeats) || 40),
            powerOutletsPct: Math.max(50, Math.min(100, Number(f.powerOutletsPct) || 95)),
            ambientType: 'silent-vault',
            features: Array.isArray(f.features)
              ? f.features.map(String)
              : ['Synthesized 3D Floorplate', 'Acoustic Glazing', 'High-Speed Power Grid'],
          }))
        : [
            {
              floorNumber: 1,
              name: '1F Digital Twin Atrium',
              noiseDba: 34,
              occupiedSeats: 10,
              totalSeats: 45,
              powerOutletsPct: 95,
              ambientType: 'whisper-reading',
              features: ['Vector-Synthesized Geometry', 'Smart Occupancy Sensors'],
            },
            {
              floorNumber: 2,
              name: '2F Silent Sky Sanctuary',
              noiseDba: 27,
              occupiedSeats: 6,
              totalSeats: 38,
              powerOutletsPct: 100,
              ambientType: 'silent-vault',
              features: ['Zero-Noise Carrels', 'Daylight Harvesting Louvers'],
            },
          ];

    const id =
      parsed.id ||
      parsed.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
        '-' +
        (existingCount + 1);

    const shortCode =
      typeof parsed.shortCode === 'string' && parsed.shortCode.trim().length > 0
        ? parsed.shortCode.trim().toUpperCase().slice(0, 4)
        : parsed.name
            .split(/\s+/)
            .map((w: string) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 3) || 'SYN';

    return {
      building: {
        id,
        name: parsed.name.trim(),
        shortCode,
        category: String(parsed.category || 'Synthesized 3D Study Hub'),
        archetype,
        position,
        dimensions,
        open24Hours: parsed.open24Hours !== undefined ? Boolean(parsed.open24Hours) : true,
        hoursLabel: parsed.open24Hours === false ? 'Open 07:00 – 23:00' : 'Open 24/7 · Synthesized Twin',
        accentColor: typeof parsed.accentColor === 'string' ? parsed.accentColor : '#38bdf8',
        description:
          typeof parsed.description === 'string'
            ? parsed.description
            : 'Procedurally extruded 3D campus structure generated from vector map telemetry.',
        audioLandmarkFreq: 261.63 + (existingCount % 5) * 32,
        floors,
      },
    };
  } catch {
    return {
      error: 'Invalid JSON syntax. Please fix the JSON structure or choose a preset vector blueprint.',
    };
  }
}

export interface TopographyTelemetry {
  localElevationM: number;
  aslElevationM: number;
  slopeDegrees: number;
  landformLabel: string;
  biomeColorHex: string;
}

/**
 * Computes continuous real-world 3D topographic elevation (in meters) at world coordinate (x, z)
 * for any of the 4 campus geomorphology presets ('river-valley', 'alpine-ridge', 'coastal-bluff', 'canyon-gorge').
 */
export function getTerrainElevation(
  x: number,
  z: number,
  preset: TerrainPreset = 'river-valley'
): number {
  const macroWave =
    Math.sin(x * 0.032) * Math.cos(z * 0.028) * 2.2 +
    Math.sin((x + z) * 0.055) * 1.05 +
    Math.cos(x * 0.09 - z * 0.07) * 0.42;

  const distFromCenter = Math.sqrt(x * x + z * z);

  if (preset === 'alpine-ridge') {
    // High mountain saddle with dramatic northern & lateral peaks and central glacial tarn
    const northPeak = z < -12 ? Math.pow(Math.min(65, -12 - z) / 18, 1.55) * 8.2 : 0;
    const lateralCrags =
      Math.abs(x) > 20 ? Math.pow(Math.min(60, Math.abs(x) - 20) / 22, 1.45) * 5.8 : 0;
    const tarnCarve = -2.6 * Math.exp(-(x * x + (z - 2) * (z - 2)) / 58);
    const summitMound = 3.4 * Math.exp(-(x * x + (z + 15) * (z + 15)) / 120);
    return Number((1.4 + macroWave * 0.9 + northPeak + lateralCrags + summitMound + tarnCarve).toFixed(3));
  }

  if (preset === 'coastal-bluff') {
    // Stepped marine terraces high in the north/west, sloping down to a southern/southeastern tidal bay cove
    const bluffSlope = (18 - z) * 0.14 + Math.atan((10 - z) * 0.15) * 2.1;
    const headlandWest = x < -10 ? Math.exp(-((x + 22) * (x + 22) + (z - 2) * (z - 2)) / 180) * 3.8 : 0;
    const bayCoveCarve =
      z > 4 ? -3.2 * Math.exp(-((x - 4) * (x - 4) + (z - 16) * (z - 16)) / 240) : 0;
    const lagoonCarve = -1.7 * Math.exp(-(x * x + (z - 2) * (z - 2)) / 65);
    return Number((0.6 + bluffSlope + headlandWest + bayCoveCarve + lagoonCarve + macroWave * 0.45).toFixed(3));
  }

  if (preset === 'canyon-gorge') {
    // Deep forested canyon carved along x = sin(z * 0.06) * 5, with high east & west canyon rims
    const gorgeCenterX = Math.sin(z * 0.065) * 5.5;
    const distToGorge = Math.abs(x - gorgeCenterX);
    const gorgeCarve = -3.1 * Math.exp(-(distToGorge * distToGorge) / 26);
    const canyonWalls = Math.pow(Math.min(55, distToGorge) / 19, 1.35) * 4.6;
    const outerMountains =
      distFromCenter > 34 ? Math.pow(Math.min(70, distFromCenter - 34) / 26, 1.4) * 5.0 : 0;
    return Number((1.2 + gorgeCarve + canyonWalls + outerMountains + macroWave * 0.65).toFixed(3));
  }

  // Default: 'river-valley'
  const northRidge = z < -18 ? Math.pow(Math.min(60, -18 - z) / 22, 1.65) * 6.5 : 0;
  const outerRimHills =
    distFromCenter > 36
      ? Math.pow(Math.min(70, distFromCenter - 36) / 28, 1.5) *
        5.2 *
        (0.65 + 0.35 * Math.sin(x * 0.05 + z * 0.04))
      : 0;

  const dxKepler = x - -16;
  const dzKepler = z - 18;
  const keplerKnoll = 3.2 * Math.exp(-(dxKepler * dxKepler + dzKepler * dzKepler) / 140);

  const dxLib = x - 0;
  const dzLib = z - -14;
  const libTerrace = 2.4 * Math.exp(-(dxLib * dxLib + dzLib * dzLib) / 180);

  const dxBot = x - 24;
  const dzBot = z - -3;
  const botanicalHill = 2.1 * Math.exp(-(dxBot * dxBot + dzBot * dzBot) / 160);

  const riverCenterZ = 5.0 + Math.sin(x * 0.065) * 6.5;
  const distToRiver = Math.abs(z - riverCenterZ);
  const riverCarve = -2.35 * Math.exp(-(distToRiver * distToRiver) / 18);

  const dxLagoon = x - 0;
  const dzLagoon = z - 2;
  const lagoonCarve = -1.4 * Math.exp(-(dxLagoon * dxLagoon + dzLagoon * dzLagoon) / 55);

  const rawElevation =
    0.85 +
    macroWave * 0.65 +
    northRidge +
    outerRimHills +
    keplerKnoll +
    libTerrace +
    botanicalHill +
    riverCarve +
    lagoonCarve;

  return Number(rawElevation.toFixed(3));
}

/**
 * Computes RGB vertex color [r, g, b] (0..1) for the 3D terrain mesh based on elevation,
 * slope, campus biome preset, and optional topographic contour isolines.
 */
export function computeTerrainVertexColor(
  elevation: number,
  slopeDegrees: number,
  preset: TerrainPreset,
  showContours = true
): [number, number, number] {
  let r = 0.16;
  let g = 0.36;
  let b = 0.24;

  if (preset === 'coastal-bluff') {
    if (elevation < 0.25) {
      // Wet tidal sand & cove shoal
      r = 0.56;
      g = 0.49;
      b = 0.36;
    } else if (slopeDegrees > 22) {
      // Golden sandstone sea cliff
      r = 0.62;
      g = 0.48;
      b = 0.34;
    } else {
      // Coastal chaparral & bluff meadow
      r = 0.24;
      g = 0.46;
      b = 0.29;
    }
  } else if (preset === 'alpine-ridge') {
    if (elevation < -0.1) {
      // Glacial tarn slate bed
      r = 0.18;
      g = 0.29;
      b = 0.38;
    } else if (elevation > 6.2) {
      // High snow-dusted alpine granite crest
      r = 0.82;
      g = 0.87;
      b = 0.93;
    } else if (slopeDegrees > 20 || elevation > 3.6) {
      // Exposed gneiss & granite rock face
      r = 0.43;
      g = 0.46;
      b = 0.51;
    } else {
      // Alpine tundra & larch meadow
      r = 0.19;
      g = 0.41;
      b = 0.31;
    }
  } else if (preset === 'canyon-gorge') {
    if (elevation < 0.0) {
      // Mossy creek bed stone
      r = 0.16;
      g = 0.31;
      b = 0.29;
    } else if (slopeDegrees > 22) {
      // Dark canyon shale & redwood bark earth
      r = 0.35;
      g = 0.28;
      b = 0.24;
    } else {
      // Rich redwood fern forest floor
      r = 0.15;
      g = 0.42;
      b = 0.26;
    }
  } else {
    // 'river-valley'
    if (elevation < 0.05) {
      // Riparian creek bank gravel & silt
      r = 0.32;
      g = 0.37;
      b = 0.35;
    } else if (elevation > 6.5) {
      // High northern escarpment granite ridge
      r = 0.52;
      g = 0.54;
      b = 0.58;
    } else if (slopeDegrees > 21) {
      // Exposed traprock / stone slope
      r = 0.42;
      g = 0.43;
      b = 0.46;
    } else if (elevation < 2.2) {
      // Lush valley fescue lawn
      r = 0.18;
      g = 0.45;
      b = 0.28;
    } else {
      // Upland academic terrace turf
      r = 0.23;
      g = 0.49;
      b = 0.31;
    }
  }

  // Subtle 1.5m topographic elevation contour isolines
  if (showContours && elevation > -0.2) {
    const contourInterval = 1.5;
    const mod = Math.abs(((elevation % contourInterval) + contourInterval) % contourInterval);
    if (mod < 0.09 || mod > contourInterval - 0.09) {
      r = Math.min(1, r * 1.28 + 0.06);
      g = Math.min(1, g * 1.28 + 0.08);
      b = Math.min(1, b * 1.28 + 0.08);
    }
  }

  return [r, g, b];
}

export function getTopographyInfo(
  x: number,
  z: number,
  preset: TerrainPreset = 'river-valley',
  baseAsl = 138
): TopographyTelemetry {
  const h = getTerrainElevation(x, z, preset);
  const eps = 0.5;
  const hx = (getTerrainElevation(x + eps, z, preset) - getTerrainElevation(x - eps, z, preset)) / (2 * eps);
  const hz = (getTerrainElevation(x, z + eps, preset) - getTerrainElevation(x, z - eps, preset)) / (2 * eps);
  const gradientMag = Math.sqrt(hx * hx + hz * hz);
  const slopeDegrees = Number(((Math.atan(gradientMag) * 180) / Math.PI).toFixed(1));
  const aslElevationM = Number((baseAsl + h).toFixed(1));

  if (h < -0.25) {
    return {
      localElevationM: h,
      aslElevationM,
      slopeDegrees,
      landformLabel: preset === 'coastal-bluff' ? 'Pacific Tidal Cove' : 'Riparian Creek & Basin',
      biomeColorHex: '#0ea5e9',
    };
  }
  if (h < 1.5) {
    return {
      localElevationM: h,
      aslElevationM,
      slopeDegrees,
      landformLabel:
        preset === 'coastal-bluff'
          ? 'Lower Sandstone Terrace'
          : preset === 'canyon-gorge'
            ? 'Fern Canyon Floor'
            : 'Alluvial Meadow & Quad',
      biomeColorHex: '#10b981',
    };
  }
  if (h < 3.6) {
    return {
      localElevationM: h,
      aslElevationM,
      slopeDegrees,
      landformLabel:
        preset === 'coastal-bluff'
          ? 'Ocean Headland Bluff'
          : preset === 'alpine-ridge'
            ? 'Sub-Alpine Saddle'
            : 'Upland Academic Terrace',
      biomeColorHex: '#34d399',
    };
  }
  return {
    localElevationM: h,
    aslElevationM,
    slopeDegrees,
    landformLabel:
      preset === 'alpine-ridge'
        ? 'High Granite Crag & Summit'
        : 'Granite Escarpment & Ridge',
    biomeColorHex: '#a8a29e',
  };
}

export interface Scenic3DVantagePoint {
  id: string;
  title: string;
  subtitle: string;
  universityId: string;
  campusId: string;
  buildingId?: string;
  riverId?: string;
  targetXZ: [number, number];
  targetYOffset: number;
  baseRadius: number;
  baseHeight: number;
}

export const SCENIC_3D_VANTAGE_POINTS: Scenic3DVantagePoint[] = [
  {
    id: 'vantage-current',
    title: 'Current 3D Camera Position (Active View)',
    subtitle: 'Captures 3–5 multi-angle shots around your current 3D viewport focus',
    universityId: 'ucl-london',
    campusId: 'ucl-bloomsbury',
    targetXZ: [10, -48],
    targetYOffset: 6,
    baseRadius: 38,
    baseHeight: 26,
  },
  {
    id: 'vantage-ucl-wilkins',
    title: 'UCL Bloomsbury · Wilkins Portico & Copper Dome Quad',
    subtitle: 'Neoclassical Corinthian Portico, Observatory Domes & Main Quad',
    universityId: 'ucl-london',
    campusId: 'ucl-bloomsbury',
    buildingId: 'ucl-wilkins-main-lib',
    targetXZ: [10, -48],
    targetYOffset: 7,
    baseRadius: 38,
    baseHeight: 26,
  },
  {
    id: 'vantage-ucl-student-cruciform',
    title: 'UCL Student Centre & Red-Brick Cruciform Hub',
    subtitle: '3D Floor Cutaway, Rooftop Terrace & Waterhouse Terracotta Cross',
    universityId: 'ucl-london',
    campusId: 'ucl-bloomsbury',
    buildingId: 'ucl-student-centre',
    targetXZ: [14, -40],
    targetYOffset: 8,
    baseRadius: 36,
    baseHeight: 25,
  },
  {
    id: 'vantage-thames-kcl-strand',
    title: 'River Thames Embankment, Waterloo Bridge & KCL Strand',
    subtitle: 'Tidal River Thames W→E Flow, Somerset House, London Eye & Shard',
    universityId: 'kcl-london',
    campusId: 'kcl-strand',
    buildingId: 'kcl-bush-house',
    riverId: 'river-thames',
    targetXZ: [44, 34],
    targetYOffset: 6,
    baseRadius: 44,
    baseHeight: 28,
  },
  {
    id: 'vantage-kcl-maughan-fleet',
    title: 'KCL Maughan Neo-Gothic Spire & Subterranean River Fleet',
    subtitle: 'Dodecagonal Reading Room, Chancery Lane & Underground River Fleet',
    universityId: 'kcl-london',
    campusId: 'kcl-strand',
    buildingId: 'kcl-maughan-lib',
    riverId: 'river-fleet',
    targetXZ: [46, 16],
    targetYOffset: 8,
    baseRadius: 36,
    baseHeight: 24,
  },
  {
    id: 'vantage-imperial-albert-serpentine',
    title: 'Imperial Queen’s Tower, Royal Albert Hall & Hyde Park Serpentine',
    subtitle: '87m Albertopolis Bell Tower, Victorian Rotunda & River Westbourne Lake',
    universityId: 'imperial-london',
    campusId: 'imperial-south-ken',
    buildingId: 'imp-queens-tower',
    riverId: 'river-westbourne-serpentine',
    targetXZ: [-64, 24],
    targetYOffset: 9,
    baseRadius: 40,
    baseHeight: 26,
  },
  {
    id: 'vantage-lse-marshall-holborn',
    title: 'LSE Marshall Diagrid Hub & Lincoln’s Inn Fields',
    subtitle: 'Grafton Architects Rotated Concrete Frame & Lionel Robbins Dome',
    universityId: 'lse-london',
    campusId: 'lse-aldwych-holborn',
    buildingId: 'lse-mar-marshall',
    targetXZ: [42, -6],
    targetYOffset: 8,
    baseRadius: 36,
    baseHeight: 24,
  },
  {
    id: 'vantage-ucl-east-river-lea',
    title: 'UCL East Marshgate, River Lea & Olympic Park Orbit',
    subtitle: 'Stratford Waterfront, Waterworks River & ArcelorMittal Orbit Spire',
    universityId: 'ucl-london',
    campusId: 'ucl-east',
    buildingId: 'ucl-marshgate',
    riverId: 'river-lea-waterworks',
    targetXZ: [98, -52],
    targetYOffset: 8,
    baseRadius: 38,
    baseHeight: 26,
  },
  {
    id: 'vantage-london-macro-rivers',
    title: 'Full 3D London Panorama · 4 Universities & 12 London Rivers',
    subtitle: 'Macro Digital Twin spanning UCL, KCL, Imperial, LSE & River Thames Basin',
    universityId: 'ucl-london',
    campusId: 'ucl-bloomsbury',
    riverId: 'river-thames',
    targetXZ: [18, 6],
    targetYOffset: 4,
    baseRadius: 145,
    baseHeight: 102,
  },
];

export interface Captured3DPhoto {
  id: string;
  vantageId: string;
  vantageTitle: string;
  shotNumber: number;
  totalInBatch: number;
  angleLabel: string;
  lightingLabel: string;
  solarHour: number;
  cameraCoords: [number, number, number];
  targetCoords: [number, number, number];
  dataUrl: string;
  filename: string;
  selected: boolean;
  capturedAt: string;
}


