import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CAMPUS_BUILDINGS, UNIVERSITIES } from '../data/campusData.ts';
import {
  calculateSunState,
  computeHeatColor,
  computeTerrainVertexColor,
  DEMO_WALKTHROUGH_STEPS,
  filterStudySpaces,
  getTerrainElevation,
  getTopographyInfo,
  getWalkthroughStep,
  parseBlueprintToBuilding,
  reserveStudySeat,
} from './campusLogic.ts';
import { buildCampusVectorPdfBytes } from './pdfMapGenerator.ts';

test('calculateSunState transitions accurately across solar day, golden hour, and nocturnal neon phases', () => {
  const midnight = calculateSunState(1.5);
  assert.equal(midnight.isNight, true);
  assert.equal(midnight.phaseLabel, 'Nocturnal Neon Cycle');
  assert.ok(midnight.windowGlowIntensity > 1.2);

  const noon = calculateSunState(13.0);
  assert.equal(noon.isNight, false);
  assert.equal(noon.isGoldenHour, false);
  assert.equal(noon.phaseLabel, 'Solar Daylight Cycle');
  assert.ok(noon.sunPosition[1] > 40);

  const dusk = calculateSunState(18.0);
  assert.equal(dusk.isGoldenHour, true);
  assert.equal(dusk.phaseLabel, 'Dusk Golden Hour');
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

