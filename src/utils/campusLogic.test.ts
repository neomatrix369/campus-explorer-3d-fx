import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CAMPUS_BUILDINGS, UNIVERSITIES } from '../data/campusData.ts';
import {
  calculateSunState,
  computeHeatColor,
  computeTerrainVertexColor,
  DEMO_WALKTHROUGH_STEPS,
  filterStudySpaces,
  formatWalkthroughSpeechScript,
  getBuildingAggregateMetrics,
  getTerrainElevation,
  getTopographyInfo,
  getWalkthroughStep,
  parseBlueprintToBuilding,
  reserveStudySeat,
  SCENIC_3D_VANTAGE_POINTS,
} from './campusLogic.ts';
import { buildCampusVectorPdfBytes } from './pdfMapGenerator.ts';
import {
  LONDON_RIVERS_AND_STREAMS_3D,
  LONDON_THAMES_BRIDGES_3D,
} from './londonOsmGeojson.ts';
import {
  getGeminiTelemetrySnapshot,
  recordGeminiCallTelemetry,
} from './geminiTelemetryTracker.ts';

test('calculateSunState transitions accurately across solar day, golden hour, and nocturnal neon phases with tempered non-glaring brightness', () => {
  const midnight = calculateSunState(1.5);
  assert.equal(midnight.isNight, true);
  assert.equal(midnight.phaseLabel, 'Nocturnal Neon Cycle');
  assert.ok(midnight.windowGlowIntensity > 0.3 && midnight.windowGlowIntensity <= 0.7);
  assert.equal(midnight.fogColorHex, '#070b14');

  const noon = calculateSunState(13.0);
  assert.equal(noon.isNight, false);
  assert.equal(noon.isGoldenHour, false);
  assert.equal(noon.phaseLabel, 'Solar Daylight Cycle');
  assert.equal(noon.windowGlowIntensity, 0.0);
  assert.ok(noon.sunPosition[1] > 40);
  assert.equal(noon.fogColorHex, '#c7d9ec');
  assert.notEqual(noon.fogColorHex, midnight.fogColorHex);

  const dusk = calculateSunState(18.0);
  assert.equal(dusk.isGoldenHour, true);
  assert.equal(dusk.phaseLabel, 'Dusk Golden Hour');
  assert.equal(dusk.fogColorHex, '#2a1f2d');
});

test('computeHeatColor maps low noise/vacant to emerald and high noise/crowded to red with semantic labels', () => {
  const quietSpot = computeHeatColor(0.18, 27);
  assert.equal(quietSpot.hex, '#10b981');
  assert.equal(quietSpot.statusLabel, 'Vacant · Silent Sanctuary');

  const moderateSpot = computeHeatColor(0.55, 45);
  assert.equal(moderateSpot.hex, '#f59e0b');
  assert.equal(moderateSpot.statusLabel, 'Moderate · Whisper Study');

  const crowdedSpot = computeHeatColor(0.92, 62);
  assert.equal(crowdedSpot.hex, '#ef4444');
  assert.equal(crowdedSpot.statusLabel, 'Crowded · High Activity');
});

test('filterStudySpaces filters 24/7 quiet spaces by maxNoiseDba and ranks quietest first', () => {
  const results = filterStudySpaces(INITIAL_CAMPUS_BUILDINGS, {
    maxNoiseDba: 32,
    only24Hours: true,
    minAvailableSeats: 10,
    searchQuery: '',
  });

  assert.ok(results.length >= 3);
  for (const spot of results) {
    assert.equal(spot.open24Hours, true);
    assert.ok(spot.floor.noiseDba <= 32);
    assert.ok(spot.availableSeats >= 10);
  }

  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i - 1].quietScore >= results[i].quietScore);
  }
});

test('reserveStudySeat increments occupiedSeats and generates a deterministic pass code', () => {
  const targetBuilding = INITIAL_CAMPUS_BUILDINGS[0];
  const initialOccupied = targetBuilding.floors[0].occupiedSeats;

  const outcome = reserveStudySeat(INITIAL_CAMPUS_BUILDINGS, targetBuilding.id, 1);
  assert.equal(outcome.reserved, true);
  assert.ok(outcome.confirmationCode?.startsWith(`${targetBuilding.shortCode}-1F-`));

  const updatedBuilding = outcome.updatedBuildings.find((b) => b.id === targetBuilding.id)!;
  assert.equal(updatedBuilding.floors[0].occupiedSeats, initialOccupied + 1);
});

test('parseBlueprintToBuilding converts valid JSON floorplan spec into a 3D CampusBuilding', () => {
  const rawSpec = JSON.stringify({
    name: 'West Quad Innovation Annex',
    shortCode: 'WQA',
    category: '24/7 Study Annex',
    archetype: 'cantilever-tech',
    open24Hours: true,
    footprintMeters: [14, 12, 11],
    coordinates: [-22, -16],
    floors: [
      { floorNumber: 1, name: '1F Quiet Commons', noiseDba: 31, occupiedSeats: 10, totalSeats: 50 },
      { floorNumber: 2, name: '2F Silent Vault', noiseDba: 26, occupiedSeats: 5, totalSeats: 40 },
    ],
  });

  const { building, error } = parseBlueprintToBuilding(rawSpec, 6);
  assert.equal(error, undefined);
  assert.ok(building);
  assert.equal(building.shortCode, 'WQA');
  assert.equal(building.floors.length, 2);
});

test('getTerrainElevation, computeTerrainVertexColor, and getTopographyInfo model all 4 real-world terrain presets', () => {
  const valleyCreek = getTerrainElevation(0, 5, 'river-valley');
  const northRidge = getTerrainElevation(0, -35, 'river-valley');
  assert.ok(valleyCreek < 0);
  assert.ok(northRidge > 3.5);

  const alpinePeak = getTerrainElevation(0, -32, 'alpine-ridge');
  assert.ok(alpinePeak > 3.0);

  const coastalCove = getTerrainElevation(0, 20, 'coastal-bluff');
  const coastalHeadland = getTerrainElevation(0, -16, 'coastal-bluff');
  assert.ok(coastalHeadland > coastalCove + 2.0);

  const gorgeChannel = getTerrainElevation(0, 0, 'canyon-gorge');
  const gorgeRim = getTerrainElevation(0, 22, 'canyon-gorge');
  assert.ok(gorgeRim > gorgeChannel + 2.0);

  const rgb = computeTerrainVertexColor(2.5, 10, 'river-valley', true);
  assert.equal(rgb.length, 3);

  const topo = getTopographyInfo(0, -12, 'river-valley', 28);
  assert.ok(topo.aslElevationM > 28);
});

test('UNIVERSITIES, DEMO_WALKTHROUGH_STEPS, and buildCampusVectorPdfBytes cover UCL, KCL, Imperial, and LSE', () => {
  assert.equal(UNIVERSITIES.length, 4);
  assert.ok(DEMO_WALKTHROUGH_STEPS.length >= 6);

  const wrapped = getWalkthroughStep(DEMO_WALKTHROUGH_STEPS.length);
  assert.equal(wrapped.stepIndex, 0);
  assert.equal(wrapped.universityId, 'ucl-london');

  // Verify every walkthrough step maps to a valid university, campus, building, synchronized narration script, and HUD choreography
  const combinedNarration = DEMO_WALKTHROUGH_STEPS.map((s) => `${s.title} ${s.narration}`).join(' ');
  assert.ok(combinedNarration.includes('University College London'));
  assert.ok(combinedNarration.includes('King’s College London'));
  assert.ok(combinedNarration.includes('Imperial College London'));
  assert.ok(combinedNarration.includes('London School of Economics'));

  let sawCollapseAll = false;
  let sawExpandAll = false;
  let sawSelectivePanel = false;

  for (let i = 0; i < DEMO_WALKTHROUGH_STEPS.length; i++) {
    const step = getWalkthroughStep(i);
    const script = formatWalkthroughSpeechScript(step);
    assert.ok(script.includes(`Stop ${i + 1} of ${DEMO_WALKTHROUGH_STEPS.length}`));
    assert.ok(script.includes(step.title));
    assert.ok(script.includes(step.narration));
    assert.ok(step.featureBadge.length > 5);

    for (const hud of [step.hudState, step.midStepHudState]) {
      assert.ok(hud.choreographyLabel.length > 3);
      if (hud.leftCollapsed && hud.rightCollapsed && hud.dockCollapsed) {
        sawCollapseAll = true;
      } else if (!hud.leftCollapsed && !hud.rightCollapsed && !hud.dockCollapsed) {
        sawExpandAll = true;
      } else {
        sawSelectivePanel = true;
      }
    }

    const uni = UNIVERSITIES.find((u) => u.id === step.universityId);
    assert.ok(uni, `Missing university ${step.universityId}`);
    const camp = uni.campuses.find((c) => c.id === step.campusId);
    assert.ok(camp, `Missing campus ${step.campusId}`);
    const bld = camp.buildings.find((b) => b.id === step.buildingId);
    assert.ok(bld, `Missing building ${step.buildingId}`);
  }

  assert.equal(sawCollapseAll, true, 'Expected walkthrough choreography to include Collapse All');
  assert.equal(sawExpandAll, true, 'Expected walkthrough choreography to include Expand All');
  assert.equal(
    sawSelectivePanel,
    true,
    'Expected walkthrough choreography to include selective individual control collapse/expand'
  );

  const ucl = UNIVERSITIES[0];
  const bloomsbury = ucl.campuses[0];
  const pdfBytes = buildCampusVectorPdfBytes(
    ucl,
    bloomsbury,
    bloomsbury.buildings,
    bloomsbury.pathways
  );
  const headerStr = new TextDecoder().decode(pdfBytes.slice(0, 8));
  assert.equal(headerStr, '%PDF-1.4');
  assert.ok(pdfBytes.byteLength > 1200);

  // Verify all 7 London campuses are located at distinct, non-overlapping geographic coordinates on the 3D Map of London
  const allCampuses = UNIVERSITIES.flatMap((u) => u.campuses);
  assert.equal(allCampuses.length, 7);
  const centroids = allCampuses.map((c) => {
    const avgX = c.buildings.reduce((s, b) => s + b.position[0], 0) / c.buildings.length;
    const avgZ = c.buildings.reduce((s, b) => s + b.position[2], 0) / c.buildings.length;
    return { id: c.id, avgX, avgZ };
  });

  for (let i = 0; i < centroids.length; i++) {
    for (let j = i + 1; j < centroids.length; j++) {
      const dist = Math.hypot(
        centroids[i].avgX - centroids[j].avgX,
        centroids[i].avgZ - centroids[j].avgZ
      );
      assert.ok(
        dist > 22,
        `Expected campuses ${centroids[i].id} and ${centroids[j].id} to be separated on the London map, got dist=${dist}`
      );
    }
  }
});

test('LONDON_RIVERS_AND_STREAMS_3D, LONDON_THAMES_BRIDGES_3D, and SCENIC_3D_VANTAGE_POINTS cover the River Thames, 11 tributaries/canals/lost rivers, and 9 3D photo vantage positions', () => {
  assert.equal(LONDON_RIVERS_AND_STREAMS_3D.length, 12);
  assert.equal(LONDON_THAMES_BRIDGES_3D.length, 7);

  const thames = LONDON_RIVERS_AND_STREAMS_3D.find((w) => w.id === 'river-thames');
  assert.ok(thames);
  assert.equal(thames.type, 'tidal-river');
  assert.ok(thames.pathXZ.length >= 9);
  assert.ok(thames.widthSceneUnits >= 12);
  assert.ok(thames.realLengthKm > 30);

  const expectedWaterwayIds = [
    'river-thames',
    'river-lea-waterworks',
    'regents-canal',
    'river-westbourne-serpentine',
    'river-wandle',
    'river-ravensbourne',
    'river-fleet',
    'river-tyburn',
    'river-walbrook',
    'counters-creek',
    'river-effra',
    'river-neckinger',
  ];
  for (const id of expectedWaterwayIds) {
    const found = LONDON_RIVERS_AND_STREAMS_3D.find((w) => w.id === id);
    assert.ok(found, `Missing London waterway ${id}`);
    assert.ok(found.pathXZ.length >= 4);
    assert.ok(found.flowDirection.includes('→'));
  }

  assert.equal(SCENIC_3D_VANTAGE_POINTS.length, 9);
  for (const vp of SCENIC_3D_VANTAGE_POINTS) {
    assert.equal(vp.targetXZ.length, 2);
    assert.ok(vp.baseRadius > 10);
    assert.ok(vp.baseHeight > 10);
  }
});

test('getBuildingAggregateMetrics returns finite occupancyPct and occupancyRatio (never NaN) and Gemini Telemetry tracks tokens, latency, and cost', () => {
  for (const uni of UNIVERSITIES) {
    for (const camp of uni.campuses) {
      for (const b of camp.buildings) {
        const m = getBuildingAggregateMetrics(b);
        assert.equal(Number.isFinite(m.occupancyPct), true, `occupancyPct NaN on ${b.id}`);
        assert.equal(Number.isFinite(m.occupancyRatio), true, `occupancyRatio NaN on ${b.id}`);
        assert.ok(m.occupancyPct >= 0 && m.occupancyPct <= 100);
      }
    }
  }

  recordGeminiCallTelemetry({
    model: 'gemini-4-argon',
    task: 'Unit Test Prosody Polish',
    inputTokens: 120,
    outputTokens: 60,
    latencyMs: 245,
  });

  const snap = getGeminiTelemetrySnapshot();
  assert.equal(snap.byModel.length, 4);
  assert.ok(snap.totals.totalInputTokens > 0);
  assert.ok(snap.totals.totalOutputTokens > 0);
  assert.ok(snap.totals.avgLatencyMs > 0);
  assert.ok(snap.totals.totalCostUsd > 0);
});



