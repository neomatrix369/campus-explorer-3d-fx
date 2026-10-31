import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  CampusBuilding,
  PathwaySegment,
  RoadSegment,
  TerrainPreset,
} from '../data/campusData';
import {
  calculateSunState,
  Captured3DPhoto,
  computeHeatColor,
  computeTerrainVertexColor,
  getBuildingAggregateMetrics,
  getTerrainElevation,
  Scenic3DVantagePoint,
} from '../utils/campusLogic';
import {
  createFoliageCanopyTexture,
  createGlowingParticleTexture,
  createPlazaGroundTextures,
  createSatelliteHybridGroundTexture,
  createSoftRadialShadowTexture,
  createWindowFacadeTexture,
  GroundMapRealismStyle,
} from '../utils/proceduralTextures';
import { spatialAudio } from '../utils/spatialAudioEngine';
import {
  getLondonInterUniversityRoutes,
  LONDON_3D_ICONIC_LANDMARKS,
  LONDON_RIVERS_AND_STREAMS_3D,
  LONDON_ROYAL_PARKS_3D,
  LONDON_THAMES_BRIDGES_3D,
  LONDON_UNIVERSITY_GEO_LOCATIONS,
} from '../utils/londonOsmGeojson';

export type CameraViewPreset = 'overview' | 'focus-building' | 'street-level' | 'floor-cutaway';

interface CampusScene3DProps {
  buildings: CampusBuilding[];
  selectedBuildingId: string;
  selectedFloorNumber: number | null;
  activeCampusId?: string;
  activeCampusHubXZ?: [number, number];
  solarHour: number;
  showHeatmap: boolean;
  showStudentFlow: boolean;
  showRadarPulse: boolean;
  showDustMotes: boolean;
  showTopoContours: boolean;
  showRoadsAndPaths: boolean;
  showFoliage: boolean;
  showUrbanContext: boolean;
  showBloomAndFog: boolean;
  showLondonCityMap?: boolean;
  showRiversAndStreams?: boolean;
  focusedRiverId?: string | null;
  groundMapStyle?: GroundMapRealismStyle;
  terrainPreset: TerrainPreset;
  waterLevelY: number;
  foliageHue: number;
  roads: RoadSegment[];
  pathways: PathwaySegment[];
  bloomIntensity: number;
  cameraPreset: CameraViewPreset;
  walkthroughStepIndex?: number;
  isWalkthroughActive?: boolean;
  onSelectBuilding: (buildingId: string) => void;
  onSelectUniversityFromCityMap?: (universityId: string, campusId: string) => void;
  onSelectRiver?: (riverId: string) => void;
  onRegisterPhotoCapture?: (
    captureFn: (options: {
      vantage: Scenic3DVantagePoint;
      count: number;
      includeLightingCycle: boolean;
    }) => Captured3DPhoto[]
  ) => void;
}

// Pre-allocated math scratch objects outside the render loop (Zero GC)
const _targetCameraPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _mouseVec = new THREE.Vector2();
const _tempColor = new THREE.Color();
const _dummyMat = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();

/**
 * Creates an organically sculpted, non-conical foliage cloud geometry by perturbing
 * vertices of an Icosahedron so tree crowns look like real billowy London Plane / Oak canopies.
 */
function createOrganicCrownGeometry(radius: number, detail = 2): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const wave =
      1.0 +
      0.16 * Math.sin(vx * 2.3 + vy * 1.9) +
      0.12 * Math.cos(vz * 2.7 - vx * 1.7) +
      0.08 * Math.sin(vy * 3.5 + vz * 2.1);
    const yFlatten = vy < 0 ? 0.72 : 0.92;
    pos.setXYZ(i, vx * wave * 1.12, vy * wave * yFlatten, vz * wave * 1.12);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a 3D raised roadbed/walkway ribbon geometry along a 3D CatmullRomCurve3
 * sampling terrain across its full width (left, center, right) with +Y upward normals
 * so that roads, sidewalks, and pathways sit cleanly above sloped terrain.
 */
function createTerrainRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  width: number,
  thickness: number,
  terrainPreset: TerrainPreset,
  waterLevelY: number
): THREE.BufferGeometry {
  const halfW = width * 0.5;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const len = Math.hypot(tangent.x, tangent.z) || 1;
    const px = (-tangent.z / len) * halfW;
    const pz = (tangent.x / len) * halfW;

    const lx = pt.x - px;
    const lz = pt.z - pz;
    const rx = pt.x + px;
    const rz = pt.z + pz;

    const elevL = getTerrainElevation(lx, lz, terrainPreset);
    const elevC = getTerrainElevation(pt.x, pt.z, terrainPreset);
    const elevR = getTerrainElevation(rx, rz, terrainPreset);
    const topY = Math.max(waterLevelY + 0.42, elevL, elevC, elevR) + thickness;
    const botY = Math.min(elevL, elevC, elevR) - 0.65;

    // 0: Top-Left, 1: Top-Right, 2: Bottom-Left, 3: Bottom-Right
    positions.push(lx, topY, lz);
    positions.push(rx, topY, rz);
    positions.push(pt.x - px * 1.08, botY, pt.z - pz * 1.08);
    positions.push(pt.x + px * 1.08, botY, pt.z + pz * 1.08);

    if (i < segments) {
      const b = i * 4;
      // Top surface (+Y normal)
      indices.push(b, b + 1, b + 4, b + 1, b + 5, b + 4);
      // Left curb
      indices.push(b + 2, b, b + 6, b, b + 4, b + 6);
      // Right curb
      indices.push(b + 1, b + 3, b + 5, b + 3, b + 7, b + 5);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export const CampusScene3D: React.FC<CampusScene3DProps> = ({
  buildings,
  selectedBuildingId,
  selectedFloorNumber,
  activeCampusId = 'ucl-bloomsbury',
  activeCampusHubXZ = [10, -48],
  solarHour,
  showHeatmap,
  showStudentFlow,
  showRadarPulse,
  showDustMotes,
  showTopoContours,
  showRoadsAndPaths,
  showFoliage,
  showUrbanContext,
  showBloomAndFog,
  showLondonCityMap = false,
  showRiversAndStreams = true,
  focusedRiverId = null,
  groundMapStyle = 'architectural',
  terrainPreset,
  waterLevelY,
  foliageHue,
  roads,
  pathways,
  bloomIntensity,
  cameraPreset,
  walkthroughStepIndex = 0,
  isWalkthroughActive = false,
  onSelectBuilding,
  onSelectUniversityFromCityMap,
  onSelectRiver,
  onRegisterPhotoCapture,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const pinElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const landmarkPinElementsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const buildingPinElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const riverPinElementsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  const propsRef = useRef({
    buildings,
    selectedBuildingId,
    selectedFloorNumber,
    activeCampusId,
    activeCampusHubXZ,
    solarHour,
    showHeatmap,
    showStudentFlow,
    showRadarPulse,
    showDustMotes,
    showTopoContours,
    showRoadsAndPaths,
    showFoliage,
    showUrbanContext,
    showBloomAndFog,
    showLondonCityMap,
    showRiversAndStreams,
    focusedRiverId,
    groundMapStyle,
    terrainPreset,
    waterLevelY,
    foliageHue,
    roads,
    pathways,
    bloomIntensity,
    cameraPreset,
    walkthroughStepIndex,
    isWalkthroughActive,
    onSelectBuilding,
    onSelectUniversityFromCityMap,
    onSelectRiver,
    onRegisterPhotoCapture,
  });

  useEffect(() => {
    propsRef.current = {
      buildings,
      selectedBuildingId,
      selectedFloorNumber,
      activeCampusId,
      activeCampusHubXZ,
      solarHour,
      showHeatmap,
      showStudentFlow,
      showRadarPulse,
      showDustMotes,
      showTopoContours,
      showRoadsAndPaths,
      showFoliage,
      showUrbanContext,
      showBloomAndFog,
      showLondonCityMap,
      showRiversAndStreams,
      focusedRiverId,
      groundMapStyle,
      terrainPreset,
      waterLevelY,
      foliageHue,
      roads,
      pathways,
      bloomIntensity,
      cameraPreset,
      walkthroughStepIndex,
      isWalkthroughActive,
      onSelectBuilding,
      onSelectUniversityFromCityMap,
      onSelectRiver,
      onRegisterPhotoCapture,
    };
  }, [
    buildings,
    selectedBuildingId,
    selectedFloorNumber,
    activeCampusId,
    activeCampusHubXZ,
    solarHour,
    showHeatmap,
    showStudentFlow,
    showRadarPulse,
    showDustMotes,
    showTopoContours,
    showRoadsAndPaths,
    showFoliage,
    showUrbanContext,
    showBloomAndFog,
    showLondonCityMap,
    showRiversAndStreams,
    focusedRiverId,
    groundMapStyle,
    terrainPreset,
    waterLevelY,
    foliageHue,
    roads,
    pathways,
    bloomIntensity,
    cameraPreset,
    walkthroughStepIndex,
    isWalkthroughActive,
    onSelectBuilding,
    onSelectUniversityFromCityMap,
    onSelectRiver,
    onRegisterPhotoCapture,
  ]);

  const rebuildBuildingsRef = useRef<(() => void) | null>(null);
  const rebuildTerrainRef = useRef<(() => void) | null>(null);
  const rebuildMacroMapRef = useRef<(() => void) | null>(null);
  const updateCameraTargetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    rebuildTerrainRef.current?.();
    rebuildMacroMapRef.current?.();
    rebuildBuildingsRef.current?.();
  }, [
    terrainPreset,
    waterLevelY,
    foliageHue,
    roads,
    pathways,
    showTopoContours,
    showRoadsAndPaths,
    showFoliage,
    showUrbanContext,
    showBloomAndFog,
    showLondonCityMap,
    showRiversAndStreams,
    focusedRiverId,
    groundMapStyle,
    activeCampusId,
  ]);

  const isNightPhase = calculateSunState(solarHour).isNight;

  useEffect(() => {
    rebuildBuildingsRef.current?.();
  }, [
    buildings,
    showHeatmap,
    selectedBuildingId,
    selectedFloorNumber,
    showBloomAndFog,
    isNightPhase,
  ]);

  useEffect(() => {
    updateCameraTargetRef.current?.();
  }, [
    selectedBuildingId,
    selectedFloorNumber,
    cameraPreset,
    terrainPreset,
    showLondonCityMap,
    focusedRiverId,
    activeCampusId,
    walkthroughStepIndex,
    isWalkthroughActive,
  ]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL Guard (Three.js r160+)
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = false;
    renderer.domElement.setAttribute('data-testid', 'campus-webgl-canvas');

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const sceneBgColor = new THREE.Color('#0f172a');
    scene.background = sceneBgColor;
    scene.fog = new THREE.FogExp2('#0f172a', 0.0016);

    // 3. Camera & OrbitControls (near=1.5 eliminates WebGL depth-buffer Z-fighting flicker)
    const camera = new THREE.PerspectiveCamera(46, width / height, 1.5, 520);
    camera.position.set(-6, 98, 126);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 8;
    controls.maxDistance = 260;
    controls.target.set(6, 2, 4);
    controls.update();

    let cameraTransitionActive = false;
    controls.addEventListener('start', () => {
      cameraTransitionActive = false;
    });

    // 4. Balanced 3-Point Studio & Solar Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#1e293b', 0.98);
    hemiLight.position.set(0, 75, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight('#fffbeb', 1.65);
    sunLight.position.set(35, 55, 25);
    sunLight.castShadow = false;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight('#38bdf8', 0.55);
    rimLight.position.set(-45, 32, -38);
    scene.add(rimLight);

    // 5. Sculpted 3D Real-World Topographic Terrain Mesh + Biome / Satellite / Hybrid Ground Textures
    const { map: groundMap, bumpMap: groundBump } = createPlazaGroundTextures(renderer);
    const satelliteGroundMap = createSatelliteHybridGroundTexture(renderer, 'satellite');
    const hybridGroundMap = createSatelliteHybridGroundTexture(renderer, 'hybrid');
    const { map: foliageMap, bumpMap: foliageBump } = createFoliageCanopyTexture(renderer);
    const shadowTex = createSoftRadialShadowTexture();
    const particleTex = createGlowingParticleTexture();

    const terrainSegments = 96;
    const terrainGeo = new THREE.PlaneGeometry(340, 340, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const vertexCount = terrainGeo.attributes.position.count;
    const terrainColors = new Float32Array(vertexCount * 3);
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      map: groundMap,
      bumpMap: groundBump,
      bumpScale: 0.2,
      roughness: 0.85,
      metalness: 0.06,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Continuous Reflective Water Plane
    const waterGeo = new THREE.PlaneGeometry(340, 340);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0369a1',
      roughness: 0.14,
      metalness: 0.82,
      transparent: true,
      opacity: 0.88,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = propsRef.current.waterLevelY;
    scene.add(waterMesh);

    // Central Campus Paved Quad & Sundial Monument
    const plazaGroup = new THREE.Group();

    const outerBasin = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.8, 2.6, 28),
      new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.72, metalness: 0.15 })
    );
    outerBasin.position.y = -0.85;
    outerBasin.receiveShadow = true;
    plazaGroup.add(outerBasin);

    const waterSurface = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 28),
      new THREE.MeshStandardMaterial({
        color: '#0284c7',
        roughness: 0.1,
        metalness: 0.85,
      })
    );
    waterSurface.rotation.x = -Math.PI / 2;
    waterSurface.position.y = 0.48;
    plazaGroup.add(waterSurface);

    const monumentPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.35, 1.8, 16),
      new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.55, metalness: 0.25 })
    );
    monumentPedestal.position.y = 0.9;
    plazaGroup.add(monumentPedestal);

    const monumentSpire = new THREE.Mesh(
      new THREE.ConeGeometry(0.62, 3.8, 8),
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        roughness: 0.2,
        metalness: 0.88,
        emissive: '#0284c7',
        emissiveIntensity: 0.35,
      })
    );
    monumentSpire.position.y = 3.5;
    plazaGroup.add(monumentSpire);

    const monumentHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.08, 12, 32),
      new THREE.MeshStandardMaterial({
        color: '#e0f2fe',
        roughness: 0.15,
        metalness: 0.9,
        emissive: '#38bdf8',
        emissiveIntensity: 0.55,
      })
    );
    monumentHalo.rotation.x = Math.PI / 2;
    monumentHalo.position.y = 2.9;
    plazaGroup.add(monumentHalo);
    scene.add(plazaGroup);

    // Dynamic Roads, Sidewalks, Crosswalks, Pedestrian Pathways Group
    const roadAndPathwayGroup = new THREE.Group();
    scene.add(roadAndPathwayGroup);

    const asphaltMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.78,
      metalness: 0.12,
      side: THREE.DoubleSide,
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const pedestrianStreetMat = new THREE.MeshStandardMaterial({
      color: '#d6d3d1',
      roughness: 0.68,
      metalness: 0.12,
      side: THREE.DoubleSide,
    });
    const laneStripeMat = new THREE.MeshBasicMaterial({
      color: '#f8fafc',
      side: THREE.DoubleSide,
    });
    const walkwayStoneMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.62,
      metalness: 0.14,
      side: THREE.DoubleSide,
    });
    const walkwayBorderMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.72,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const lampPostMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.4,
      metalness: 0.8,
    });
    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 1.4,
    });

    // 6. Realistic Organic Multi-Crown London Plane & Parkland Trees + Hedgerow Shrubs
    const foliageGroup = new THREE.Group();
    scene.add(foliageGroup);

    const treeCount = 72;
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.36, 3.0, 8);
    const branchLeftGeo = new THREE.CylinderGeometry(0.1, 0.18, 1.8, 6);
    branchLeftGeo.rotateZ(0.55);
    branchLeftGeo.translate(-0.55, 1.1, 0);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: '#4a3525',
      roughness: 0.92,
      metalness: 0.04,
    });
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const branchInst = new THREE.InstancedMesh(branchLeftGeo, trunkMat, treeCount);

    const crownCenterGeo = createOrganicCrownGeometry(1.85, 2);
    const crownLobeGeo = createOrganicCrownGeometry(1.38, 2);

    const foliageMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: foliageMap,
      bumpMap: foliageBump,
      bumpScale: 0.18,
      roughness: 0.78,
      metalness: 0.04,
    });

    const crownCenterInst = new THREE.InstancedMesh(crownCenterGeo, foliageMat, treeCount);
    const crownLeftInst = new THREE.InstancedMesh(crownLobeGeo, foliageMat, treeCount);
    const crownRightInst = new THREE.InstancedMesh(crownLobeGeo, foliageMat, treeCount);

    const shrubCount = 48;
    const shrubGeo = createOrganicCrownGeometry(0.85, 1);
    const shrubInst = new THREE.InstancedMesh(shrubGeo, foliageMat, shrubCount);

    foliageGroup.add(
      trunkInst,
      branchInst,
      crownCenterInst,
      crownLeftInst,
      crownRightInst,
      shrubInst
    );

    // Contextual Surrounding London Georgian/Victorian Street Blocks
    const contextBlockCount = 24;
    const contextBlockGeo = new THREE.BoxGeometry(14, 10, 10);
    const contextBlockMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.82,
      metalness: 0.12,
    });
    const contextBlockInst = new THREE.InstancedMesh(
      contextBlockGeo,
      contextBlockMat,
      contextBlockCount
    );
    scene.add(contextBlockInst);

    const rebuildTerrainAndEnvironment = () => {
      const {
        terrainPreset: activePreset,
        waterLevelY: activeWaterY,
        foliageHue: activeHue,
        roads: activeRoads,
        pathways: activePathways,
        buildings: activeBuildings,
        showTopoContours: contoursOn,
        showRoadsAndPaths: roadsOn,
        showFoliage: foliageOn,
        showUrbanContext: cityOn,
      } = propsRef.current;

      roadAndPathwayGroup.visible = roadsOn;
      foliageGroup.visible = foliageOn;
      contextBlockInst.visible = cityOn;

      // 5A. Update 3D Terrain Elevation & Biome Vertex Colors
      const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
      const colAttr = terrainGeo.attributes.color as THREE.BufferAttribute;
      const eps = 1.2;

      const activeMapStyle = propsRef.current.groundMapStyle || 'architectural';
      if (activeMapStyle === 'hybrid') {
        terrainMat.map = hybridGroundMap;
        terrainMat.vertexColors = false;
      } else if (activeMapStyle === 'satellite' || activeMapStyle === 'earth-3d') {
        terrainMat.map = satelliteGroundMap;
        terrainMat.vertexColors = false;
      } else {
        terrainMat.map = groundMap;
        terrainMat.vertexColors = true;
      }
      terrainMat.needsUpdate = true;

      for (let i = 0; i < posAttr.count; i++) {
        const wx = posAttr.getX(i);
        const wz = posAttr.getZ(i);
        const elev = getTerrainElevation(wx, wz, activePreset);
        posAttr.setY(i, elev);

        const hx =
          (getTerrainElevation(wx + eps, wz, activePreset) -
            getTerrainElevation(wx - eps, wz, activePreset)) /
          (2 * eps);
        const hz =
          (getTerrainElevation(wx, wz + eps, activePreset) -
            getTerrainElevation(wx, wz - eps, activePreset)) /
          (2 * eps);
        const slopeDeg = (Math.atan(Math.sqrt(hx * hx + hz * hz)) * 180) / Math.PI;

        const [r, g, b] = computeTerrainVertexColor(elev, slopeDeg, activePreset, contoursOn);
        colAttr.setXYZ(i, r, g, b);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      terrainGeo.computeVertexNormals();

      // 5B. Update Water Level & Plaza Elevation at Active Campus Hub
      waterMesh.position.y = activeWaterY;
      const [hubX, hubZ] = propsRef.current.activeCampusHubXZ || [10, -48];
      const plazaGroundY = Math.max(
        activeWaterY + 0.08,
        getTerrainElevation(hubX, hubZ + 2, activePreset)
      );
      plazaGroup.position.set(hubX, plazaGroundY, hubZ + 2);

      // 5C. Rebuild Arterial London Roads, Sidewalks, Lane Markings & Pedestrian Pathways
      while (roadAndPathwayGroup.children.length > 0) {
        const c = roadAndPathwayGroup.children[0] as THREE.Mesh;
        c.geometry?.dispose();
        roadAndPathwayGroup.remove(c);
      }

      activeRoads.forEach((road, rIdx) => {
        if (road.points.length < 2) return;
        const baseCurve = new THREE.CatmullRomCurve3(
          road.points.map((p) => new THREE.Vector3(p[0], 0, p[2]))
        );
        const samples = 36;
        const sidewalkPts: THREE.Vector3[] = [];
        const roadPts: THREE.Vector3[] = [];

        for (let s = 0; s <= samples; s++) {
          const pt = baseCurve.getPoint(s / samples);
          const groundH = Math.max(
            activeWaterY + 0.35,
            getTerrainElevation(pt.x, pt.z, activePreset)
          );
          sidewalkPts.push(new THREE.Vector3(pt.x, groundH + 0.08 + rIdx * 0.004, pt.z));
          roadPts.push(new THREE.Vector3(pt.x, groundH + 0.14 + rIdx * 0.004, pt.z));
        }

        const swCurve = new THREE.CatmullRomCurve3(sidewalkPts);
        const swGeo = createTerrainRibbonGeometry(
          swCurve,
          44,
          road.width * 1.42,
          0.22 + rIdx * 0.005,
          activePreset,
          activeWaterY
        );
        const swMesh = new THREE.Mesh(swGeo, sidewalkMat);
        swMesh.receiveShadow = true;
        roadAndPathwayGroup.add(swMesh);

        const rdCurve = new THREE.CatmullRomCurve3(roadPts);
        const rdGeo = createTerrainRibbonGeometry(
          rdCurve,
          44,
          road.width,
          0.28 + rIdx * 0.005,
          activePreset,
          activeWaterY
        );
        const rdMesh = new THREE.Mesh(
          rdGeo,
          road.isPedestrianised ? pedestrianStreetMat : asphaltMat
        );
        rdMesh.receiveShadow = true;
        roadAndPathwayGroup.add(rdMesh);

        for (let s = 2; s < samples; s += 2) {
          const pt = rdCurve.getPoint(s / samples);
          const tangent = rdCurve.getTangent(s / samples);
          const len = Math.hypot(tangent.x, tangent.z) || 1;
          const px = (-tangent.z / len) * (road.width * 0.5);
          const pz = (tangent.x / len) * (road.width * 0.5);
          const maxRoadY = Math.max(
            activeWaterY + 0.42,
            getTerrainElevation(pt.x - px, pt.z - pz, activePreset),
            getTerrainElevation(pt.x, pt.z, activePreset),
            getTerrainElevation(pt.x + px, pt.z + pz, activePreset)
          );
          const angleY = Math.atan2(tangent.x, tangent.z);

          if (!road.isPedestrianised) {
            const dashGeo = new THREE.BoxGeometry(0.36, 0.08, 2.2);
            const dashMesh = new THREE.Mesh(dashGeo, laneStripeMat);
            dashMesh.position.set(pt.x, maxRoadY + 0.34, pt.z);
            dashMesh.rotation.y = angleY;
            roadAndPathwayGroup.add(dashMesh);
          }

          if (s % 6 === 2) {
            const perpX = (-tangent.z / len) * (road.width * 0.64);
            const perpZ = (tangent.x / len) * (road.width * 0.64);
            const lx = pt.x + perpX;
            const lz = pt.z + perpZ;
            const ly = Math.max(maxRoadY, getTerrainElevation(lx, lz, activePreset));

            const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 3.8, 6);
            const poleMesh = new THREE.Mesh(poleGeo, lampPostMat);
            poleMesh.position.set(lx, ly + 1.9, lz);
            roadAndPathwayGroup.add(poleMesh);

            const bulbGeo = new THREE.SphereGeometry(0.28, 8, 8);
            const bulbMesh = new THREE.Mesh(bulbGeo, lampBulbMat);
            bulbMesh.position.set(lx, ly + 3.9, lz);
            roadAndPathwayGroup.add(bulbMesh);
          }
        }
      });

      activePathways.forEach((path, idx) => {
        const rawPts = path.points;
        if (rawPts.length < 2) return;
        const baseCurve = new THREE.CatmullRomCurve3(
          rawPts.map((p) => new THREE.Vector3(p[0], 0, p[2]))
        );
        const borderPts: THREE.Vector3[] = [];
        const stonePts: THREE.Vector3[] = [];
        const samples = 28;
        for (let s = 0; s <= samples; s++) {
          const pt = baseCurve.getPoint(s / samples);
          const groundH = getTerrainElevation(pt.x, pt.z, activePreset);
          const bridgeH = Math.max(activeWaterY + 0.42, groundH + 0.14) + idx * 0.005;
          borderPts.push(new THREE.Vector3(pt.x, bridgeH, pt.z));
          stonePts.push(new THREE.Vector3(pt.x, bridgeH + 0.05, pt.z));
        }

        const borderCurve = new THREE.CatmullRomCurve3(borderPts);
        const borderGeo = createTerrainRibbonGeometry(
          borderCurve,
          36,
          3.1,
          0.32 + idx * 0.006,
          activePreset,
          activeWaterY
        );
        const borderMesh = new THREE.Mesh(borderGeo, walkwayBorderMat);
        borderMesh.receiveShadow = true;
        roadAndPathwayGroup.add(borderMesh);

        const stoneCurve = new THREE.CatmullRomCurve3(stonePts);
        const stoneGeo = createTerrainRibbonGeometry(
          stoneCurve,
          36,
          2.35,
          0.37 + idx * 0.006,
          activePreset,
          activeWaterY
        );
        const stoneMesh = new THREE.Mesh(stoneGeo, walkwayStoneMat);
        stoneMesh.receiveShadow = true;
        roadAndPathwayGroup.add(stoneMesh);
      });

      activeBuildings.forEach((b, bIdx) => {
        const [bx, , bz] = b.position;
        const [bw, , bd] = b.dimensions;
        const groundY = getTerrainElevation(bx, bz, activePreset);

        const apronGeo = new THREE.BoxGeometry(bw + 4.8, 0.55, bd + 4.8);
        const apronMesh = new THREE.Mesh(apronGeo, walkwayStoneMat);
        apronMesh.position.set(bx, groundY + 0.22, bz);
        apronMesh.receiveShadow = true;
        roadAndPathwayGroup.add(apronMesh);

        // Connect building entrance spur toward its own nearest campus center in London
        let nearestHubX = 10;
        let nearestHubZ = -48;
        let minHubDist = Infinity;
        for (const g of LONDON_UNIVERSITY_GEO_LOCATIONS) {
          const d = Math.hypot(bx - g.londonWorldXZ[0], bz - g.londonWorldXZ[1]);
          if (d < minHubDist) {
            minHubDist = d;
            nearestHubX = g.londonWorldXZ[0];
            nearestHubZ = g.londonWorldXZ[1];
          }
        }
        const targetRoadX = bx + (nearestHubX - bx) * 0.45;
        const targetRoadZ = bz + (nearestHubZ - bz) * 0.45;
        const spurPts = [
          new THREE.Vector3(bx, groundY + 0.2, bz),
          new THREE.Vector3((bx + targetRoadX) * 0.5, groundY + 0.2, (bz + targetRoadZ) * 0.5),
          new THREE.Vector3(targetRoadX, groundY + 0.2, targetRoadZ),
        ];
        const spurCurve = new THREE.CatmullRomCurve3(spurPts);
        const spurGeo = createTerrainRibbonGeometry(
          spurCurve,
          16,
          2.2,
          0.35 + (bIdx % 12) * 0.004,
          activePreset,
          activeWaterY
        );
        const spurMesh = new THREE.Mesh(spurGeo, walkwayStoneMat);
        spurMesh.receiveShadow = true;
        roadAndPathwayGroup.add(spurMesh);
      });

      // 5D. Position Organic Multi-Crown London Plane & Oak Trees Across All 7 London Campuses
      for (let i = 0; i < treeCount; i++) {
        const campusGeo =
          LONDON_UNIVERSITY_GEO_LOCATIONS[i % LONDON_UNIVERSITY_GEO_LOCATIONS.length];
        const [cxHub, czHub] = campusGeo.londonWorldXZ;
        const localIdx = Math.floor(i / LONDON_UNIVERSITY_GEO_LOCATIONS.length);
        const angle = localIdx * 2.39996 + (i % 5) * 0.4;
        const radius = 14 + (localIdx % 6) * 4.5;
        let tx = cxHub + Math.cos(angle) * radius;
        let tz = czHub + Math.sin(angle) * radius;

        for (const b of activeBuildings) {
          const dx = tx - b.position[0];
          const dz = tz - b.position[2];
          const minClearX = b.dimensions[0] * 0.5 + 3.2;
          const minClearZ = b.dimensions[2] * 0.5 + 3.2;
          if (Math.abs(dx) < minClearX && Math.abs(dz) < minClearZ) {
            tx += dx >= 0 ? minClearX : -minClearX;
            tz += dz >= 0 ? minClearZ : -minClearZ;
          }
        }

        let groundY = getTerrainElevation(tx, tz, activePreset);
        if (groundY < activeWaterY + 0.35) {
          tx += 5.5;
          tz -= 4.5;
          groundY = Math.max(activeWaterY + 0.35, getTerrainElevation(tx, tz, activePreset));
        }

        const s = 0.82 + ((i * 17) % 42) / 100;
        const rotY = (i * 1.13) % (Math.PI * 2);
        _dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        _dummyScale.set(s, s, s);

        _dummyPos.set(tx, groundY + 1.4 * s, tz);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        trunkInst.setMatrixAt(i, _dummyMat);
        branchInst.setMatrixAt(i, _dummyMat);

        _dummyPos.set(tx, groundY + 3.6 * s, tz);
        _dummyScale.set(s * 1.15, s * 0.95, s * 1.15);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        crownCenterInst.setMatrixAt(i, _dummyMat);

        const offLx = Math.cos(rotY) * 1.05 * s;
        const offLz = Math.sin(rotY) * 1.05 * s;
        _dummyPos.set(tx + offLx, groundY + 2.85 * s, tz + offLz);
        _dummyScale.set(s * 0.95, s * 0.82, s * 0.95);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        crownLeftInst.setMatrixAt(i, _dummyMat);

        _dummyPos.set(tx - offLx * 0.85, groundY + 3.25 * s, tz - offLz * 0.85);
        _dummyScale.set(s * 0.9, s * 0.85, s * 0.92);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        crownRightInst.setMatrixAt(i, _dummyMat);

        const hueShift = ((i % 7) - 3) * 0.014;
        _tempColor.setHSL(activeHue + hueShift, 0.54, 0.34 + (i % 4) * 0.035);
        crownCenterInst.setColorAt(i, _tempColor);
        _tempColor.setHSL(activeHue + hueShift - 0.01, 0.52, 0.28 + (i % 3) * 0.03);
        crownLeftInst.setColorAt(i, _tempColor);
        _tempColor.setHSL(activeHue + hueShift + 0.015, 0.58, 0.38 + (i % 3) * 0.03);
        crownRightInst.setColorAt(i, _tempColor);
      }

      trunkInst.instanceMatrix.needsUpdate = true;
      branchInst.instanceMatrix.needsUpdate = true;
      crownCenterInst.instanceMatrix.needsUpdate = true;
      crownLeftInst.instanceMatrix.needsUpdate = true;
      crownRightInst.instanceMatrix.needsUpdate = true;
      if (crownCenterInst.instanceColor) crownCenterInst.instanceColor.needsUpdate = true;
      if (crownLeftInst.instanceColor) crownLeftInst.instanceColor.needsUpdate = true;
      if (crownRightInst.instanceColor) crownRightInst.instanceColor.needsUpdate = true;
      trunkInst.computeBoundingSphere();
      branchInst.computeBoundingSphere();
      crownCenterInst.computeBoundingSphere();
      crownLeftInst.computeBoundingSphere();
      crownRightInst.computeBoundingSphere();

      // 5E. Position Parkland Hedgerow Shrubs Across Campuses
      for (let i = 0; i < shrubCount; i++) {
        const campusGeo =
          LONDON_UNIVERSITY_GEO_LOCATIONS[i % LONDON_UNIVERSITY_GEO_LOCATIONS.length];
        const [cxHub, czHub] = campusGeo.londonWorldXZ;
        const angle = i * 2.39996 + 0.4;
        const radius = 9 + (i % 7) * 2.6;
        const sx = cxHub + Math.cos(angle) * radius;
        const sz = czHub + Math.sin(angle) * radius;
        const sy = Math.max(activeWaterY + 0.3, getTerrainElevation(sx, sz, activePreset));

        _dummyPos.set(sx, sy + 0.35, sz);
        _dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.8);
        _dummyScale.set(1.1 + (i % 3) * 0.2, 0.65, 0.95 + (i % 2) * 0.25);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        shrubInst.setMatrixAt(i, _dummyMat);

        _tempColor.setHSL(activeHue + 0.01, 0.56, 0.3 + (i % 3) * 0.03);
        shrubInst.setColorAt(i, _tempColor);
      }
      shrubInst.instanceMatrix.needsUpdate = true;
      if (shrubInst.instanceColor) shrubInst.instanceColor.needsUpdate = true;
      shrubInst.computeBoundingSphere();

      // 5F. Position Contextual Georgian / Victorian London Street Blocks Across London
      for (let i = 0; i < contextBlockCount; i++) {
        const campusGeo =
          LONDON_UNIVERSITY_GEO_LOCATIONS[i % LONDON_UNIVERSITY_GEO_LOCATIONS.length];
        const [cxHub, czHub] = campusGeo.londonWorldXZ;
        const side = i % 4;
        const dist = 26 + (i % 2) * 6;
        let cx = cxHub;
        let cz = czHub;
        let rot = 0;
        if (side === 0) {
          cx = cxHub - dist;
          cz = czHub - 6;
          rot = Math.PI / 2;
        } else if (side === 1) {
          cx = cxHub + dist;
          cz = czHub + 6;
          rot = Math.PI / 2;
        } else if (side === 2) {
          cx = cxHub + 6;
          cz = czHub - dist;
          rot = 0;
        } else {
          cx = cxHub - 6;
          cz = czHub + dist;
          rot = 0;
        }
        const cy = Math.max(activeWaterY + 0.2, getTerrainElevation(cx, cz, activePreset));
        const hScale = 0.65 + (i % 4) * 0.18;

        _dummyPos.set(cx, cy + 3.8 * hScale, cz);
        _dummyQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        _dummyScale.set(0.85, hScale, 0.8);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        contextBlockInst.setMatrixAt(i, _dummyMat);

        if (i % 3 === 0) {
          _tempColor.set('#64748b');
        } else if (i % 3 === 1) {
          _tempColor.set('#5c3a32');
        } else {
          _tempColor.set('#57534e');
        }
        contextBlockInst.setColorAt(i, _tempColor);
      }
      contextBlockInst.instanceMatrix.needsUpdate = true;
      if (contextBlockInst.instanceColor) contextBlockInst.instanceColor.needsUpdate = true;
      contextBlockInst.computeBoundingSphere();
    };

    // 7. Dynamic Campus Buildings Group & Clickable Proxies
    const buildingsRoot = new THREE.Group();
    scene.add(buildingsRoot);
    const interactableMeshes: THREE.Object3D[] = [];

    const sharedShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const sharedPlinthMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.84,
      metalness: 0.1,
    });
    const sharedSelectedPlinthMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      roughness: 0.84,
      metalness: 0.1,
    });
    const sharedSolarArrayMat = new THREE.MeshStandardMaterial({
      color: '#1e3a8a',
      roughness: 0.22,
      metalness: 0.78,
    });
    const sharedDeskMat = new THREE.MeshStandardMaterial({
      color: '#a16207',
      roughness: 0.7,
    });
    const sharedPodMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.42,
      roughness: 0.15,
    });

    const buildSceneBuildings = () => {
      while (buildingsRoot.children.length > 0) {
        const child = buildingsRoot.children[0];
        buildingsRoot.remove(child);
      }
      interactableMeshes.length = 0;

      const {
        buildings: currentBuildings,
        selectedBuildingId: activeId,
        selectedFloorNumber: activeFloor,
        showHeatmap: heatmapOn,
        showBloomAndFog: bloomOn,
        solarHour: currentHour,
        terrainPreset: activePreset,
        cameraPreset: activeCamPreset,
      } = propsRef.current;

      const sunState = calculateSunState(currentHour);

      currentBuildings.forEach((b) => {
        const isSelected = b.id === activeId;
        const isCutawayInspect =
          isSelected && (activeFloor !== null || activeCamPreset === 'floor-cutaway');
        const bGroup = new THREE.Group();
        const groundY = getTerrainElevation(b.position[0], b.position[2], activePreset);
        bGroup.position.set(b.position[0], groundY, b.position[2]);

        const [w, h, d] = b.dimensions;
        const metrics = getBuildingAggregateMetrics(b);
        const facadeTex = createWindowFacadeTexture(
          renderer,
          b.accentColor,
          sunState.isNight,
          b.facadeStyle || 'portland-stone'
        );

        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 1.65, d * 1.65),
          sharedShadowMat
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.12;
        bGroup.add(shadowPlane);

        const plinthTop = 0.8;
        const foundationDepth = 5.5;
        const totalPlinthH = plinthTop + foundationDepth;
        const plinthMesh = new THREE.Mesh(
          new THREE.BoxGeometry(w + 1.4, totalPlinthH, d + 1.4),
          isSelected ? sharedSelectedPlinthMat : sharedPlinthMat
        );
        plinthMesh.position.y = (plinthTop - foundationDepth) / 2;
        bGroup.add(plinthMesh);

        const hullH = h - plinthTop;
        const hullGeo =
          b.archetype === 'observatory-tower' || b.archetype === 'geodesic-dome'
            ? new THREE.CylinderGeometry(w * 0.48, w * 0.52, hullH, 24)
            : new THREE.BoxGeometry(w, hullH, d);

        const hullMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: facadeTex,
          roughness: 0.62,
          metalness: 0.18,
          emissive: new THREE.Color(sunState.isNight ? '#fde68a' : b.accentColor),
          emissiveMap: facadeTex,
          emissiveIntensity:
            (bloomOn ? 0.45 : 0.2) * sunState.windowGlowIntensity,
          transparent: isCutawayInspect,
          opacity: isCutawayInspect ? 0.32 : 1.0,
          depthWrite: !isCutawayInspect,
        });

        const hullMesh = new THREE.Mesh(hullGeo, hullMat);
        hullMesh.position.y = plinthTop + hullH / 2;
        hullMesh.castShadow = !isSoftwareGl;
        hullMesh.receiveShadow = true;
        hullMesh.userData = { buildingId: b.id };
        bGroup.add(hullMesh);
        interactableMeshes.push(hullMesh);

        const floorCount = Math.max(1, b.floors.length);
        const floorStep = hullH / floorCount;

        b.floors.forEach((floor, fIdx) => {
          const occRatio = floor.totalSeats > 0 ? floor.occupiedSeats / floor.totalSeats : 0;
          const floorHeat = computeHeatColor(occRatio, floor.noiseDba);
          const isFloorFocused = isSelected && activeFloor === floor.floorNumber;

          const slabY = plinthTop + fIdx * floorStep + floorStep * 0.5;
          const slabH = isCutawayInspect || isFloorFocused ? floorStep * 0.68 : 0.18;

          const slabGeo =
            b.archetype === 'observatory-tower' || b.archetype === 'geodesic-dome'
              ? new THREE.CylinderGeometry(w * 0.495, w * 0.495, slabH, 24)
              : new THREE.BoxGeometry(w + 0.12, slabH, d + 0.12);

          const slabColor = heatmapOn || isFloorFocused ? floorHeat.hex : b.accentColor;
          const slabMat = new THREE.MeshStandardMaterial({
            color: slabColor,
            roughness: 0.45,
            metalness: 0.35,
            emissive: slabColor,
            emissiveIntensity: isFloorFocused
              ? 0.48
              : isCutawayInspect
                ? 0.28
                : heatmapOn
                  ? 0.16
                  : 0.06,
            transparent: isCutawayInspect || isFloorFocused,
            opacity: isFloorFocused ? 0.88 : isCutawayInspect ? 0.72 : 1.0,
            depthWrite: !(isCutawayInspect || isFloorFocused),
          });

          const slabMesh = new THREE.Mesh(slabGeo, slabMat);
          slabMesh.position.y =
            isCutawayInspect || isFloorFocused ? slabY : plinthTop + (fIdx + 1) * floorStep;
          slabMesh.userData = { buildingId: b.id, floorNumber: floor.floorNumber };
          bGroup.add(slabMesh);
          interactableMeshes.push(slabMesh);

          // Real-world 3D Interior Entities on each floor (Study Desks, Chairs & Glass Group Pods)
          if (isSelected) {
            const deskGroup = new THREE.Group();
            deskGroup.position.y = plinthTop + fIdx * floorStep + 0.25;

            for (let dx = -w * 0.3; dx <= w * 0.15; dx += w * 0.22) {
              for (let dz = -d * 0.28; dz <= d * 0.28; dz += d * 0.28) {
                const deskMesh = new THREE.Mesh(
                  new THREE.BoxGeometry(1.4, 0.22, 0.85),
                  sharedDeskMat
                );
                deskMesh.position.set(dx, 0.25, dz);
                deskGroup.add(deskMesh);
              }
            }
            const podMesh = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.22, floorStep * 0.65, d * 0.38),
              sharedPodMat
            );
            podMesh.position.set(w * 0.28, floorStep * 0.32, 0);
            deskGroup.add(podMesh);
            bGroup.add(deskGroup);
          }
        });

        // Glowing Indigo Ground Selection Halo Ring (Matching FindUCL Screenshot 6)
        if (isSelected) {
          const selHalo = new THREE.Mesh(
            new THREE.RingGeometry(
              Math.max(w, d) * 0.66,
              Math.max(w, d) * 0.78,
              48
            ),
            new THREE.MeshBasicMaterial({
              color: '#6366f1',
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.65,
            })
          );
          selHalo.rotation.x = -Math.PI / 2;
          selHalo.position.y = 0.22;
          bGroup.add(selHalo);
        }

        const roofY = plinthTop + hullH;
        if (b.archetype === 'classical-cloister') {
          // Wilkins Building: Warm Terracotta-Ochre Pitched Roof + Central Copper Drum Dome + Portico + 2 Observatory Domes
          const ochreRoof = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.96, 0.75, d * 0.96),
            new THREE.MeshStandardMaterial({
              color: '#d98a3c',
              roughness: 0.65,
              metalness: 0.15,
            })
          );
          ochreRoof.position.y = roofY + 0.38;
          bGroup.add(ochreRoof);

          // U-Shaped North & South Courtyard Wings
          [-w * 0.38, w * 0.38].forEach((wingX) => {
            const wingMesh = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.24, hullH * 0.88, d * 0.55),
              new THREE.MeshStandardMaterial({
                color: '#dfd8cc',
                roughness: 0.75,
              })
            );
            wingMesh.position.set(wingX, plinthTop + hullH * 0.44, d * 0.42);
            bGroup.add(wingMesh);

            const wingGreenRoof = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.22, 0.35, d * 0.52),
              new THREE.MeshStandardMaterial({ color: '#7bc058', roughness: 0.8 })
            );
            wingGreenRoof.position.set(wingX, plinthTop + hullH * 0.88 + 0.18, d * 0.42);
            bGroup.add(wingGreenRoof);
          });

          // Central Drum + Iconic Copper/Ochre Wilkins Dome
          const drumMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(w * 0.19, w * 0.21, 2.4, 24),
            new THREE.MeshStandardMaterial({ color: '#dfd8cc', roughness: 0.65 })
          );
          drumMesh.position.y = roofY + 1.2;
          bGroup.add(drumMesh);

          const porticoDome = new THREE.Mesh(
            new THREE.SphereGeometry(w * 0.19, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({
              color: '#d48744',
              roughness: 0.38,
              metalness: 0.45,
            })
          );
          porticoDome.position.y = roofY + 2.35;
          bGroup.add(porticoDome);

          // Lantern Cupola Finial
          const cupola = new THREE.Mesh(
            new THREE.CylinderGeometry(0.45, 0.55, 1.4, 12),
            new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.4 })
          );
          cupola.position.y = roofY + 2.35 + w * 0.19;
          bGroup.add(cupola);

          // Classical Portico Pediment & 6 Fluted Columns + Grand Steps
          const pediment = new THREE.Mesh(
            new THREE.ConeGeometry(w * 0.3, 2.2, 4),
            new THREE.MeshStandardMaterial({ color: '#e2dcd0', roughness: 0.55 })
          );
          pediment.rotation.y = Math.PI / 4;
          pediment.position.set(0, roofY - 0.5, d * 0.56);
          bGroup.add(pediment);

          for (let c = -2.5; c <= 2.5; c += 1) {
            const colMesh = new THREE.Mesh(
              new THREE.CylinderGeometry(0.26, 0.3, hullH * 0.85, 12),
              new THREE.MeshStandardMaterial({ color: '#ece7dc', roughness: 0.55 })
            );
            colMesh.position.set(c * (w * 0.095), plinthTop + hullH * 0.42, d * 0.56);
            bGroup.add(colMesh);
          }

          // Twin Main Quad Observatory Domes
          [-w * 0.28, w * 0.28].forEach((obsX) => {
            const obsCyl = new THREE.Mesh(
              new THREE.CylinderGeometry(1.1, 1.15, 2.0, 16),
              new THREE.MeshStandardMaterial({ color: '#d6d0c4', roughness: 0.7 })
            );
            obsCyl.position.set(obsX, plinthTop + 1.0, d * 0.75);
            bGroup.add(obsCyl);
            const obsDome = new THREE.Mesh(
              new THREE.SphereGeometry(1.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
              new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.45 })
            );
            obsDome.position.set(obsX, plinthTop + 2.0, d * 0.75);
            bGroup.add(obsDome);
          });
        } else if (b.archetype === 'gothic-library') {
          // Cruciform Hub / Science Library: Diagonal 4-Arm Red-Brick Terracotta Cross + Central Spire
          const isTerracotta = b.facadeStyle === 'red-brick-terracotta';
          const wingColor = isTerracotta ? '#c25e35' : '#cbd5e1';
          const roofColor = isTerracotta ? '#d97736' : '#7bc058';

          if (b.id.includes('cruciform')) {
            // 4 Diagonal X-Shaped Cruciform Wings (Matching FindUCL Screenshot 1 bottom-left)
            [Math.PI / 4, -Math.PI / 4].forEach((diagAngle) => {
              const armMesh = new THREE.Mesh(
                new THREE.BoxGeometry(w * 1.18, hullH * 0.94, d * 0.34),
                new THREE.MeshStandardMaterial({ color: wingColor, roughness: 0.7 })
              );
              armMesh.position.y = plinthTop + hullH * 0.47;
              armMesh.rotation.y = diagAngle;
              bGroup.add(armMesh);

              const armRoof = new THREE.Mesh(
                new THREE.BoxGeometry(w * 1.2, 0.65, d * 0.36),
                new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.6 })
              );
              armRoof.position.y = roofY + 0.15;
              armRoof.rotation.y = diagAngle;
              bGroup.add(armRoof);
            });
          } else {
            // Green Sedum & Ochre Stepped Roofs (Matching Science Library in Screenshot 1)
            const greenSedum = new THREE.Mesh(
              new THREE.BoxGeometry(w * 0.96, 0.55, d * 0.96),
              new THREE.MeshStandardMaterial({ color: '#7bc058', roughness: 0.75 })
            );
            greenSedum.position.y = roofY + 0.28;
            bGroup.add(greenSedum);
          }

          const vaultMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(w * 0.16, w * 0.2, 3.2, 8),
            new THREE.MeshStandardMaterial({
              color: wingColor,
              roughness: 0.45,
              metalness: 0.35,
            })
          );
          vaultMesh.position.y = roofY + 1.5;
          bGroup.add(vaultMesh);

          const centralSpire = new THREE.Mesh(
            new THREE.ConeGeometry(w * 0.17, 3.8, 8),
            new THREE.MeshStandardMaterial({
              color: '#334155',
              roughness: 0.35,
              metalness: 0.55,
            })
          );
          centralSpire.position.y = roofY + 4.9;
          bGroup.add(centralSpire);
        } else if (b.archetype === 'cantilever-tech') {
          // UCL Student Centre / IOE: Curtain-Wall Glass Cube + Warm Terracotta Setback + Green Sedum Roof Terraces
          const greenTerrace = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.98, 0.5, d * 0.98),
            new THREE.MeshStandardMaterial({ color: '#7bc058', roughness: 0.78 })
          );
          greenTerrace.position.y = roofY + 0.25;
          bGroup.add(greenTerrace);

          const upperBrickVolume = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.62, 2.8, d * 0.76),
            new THREE.MeshStandardMaterial({
              color: '#c87d44',
              roughness: 0.65,
              metalness: 0.2,
            })
          );
          upperBrickVolume.position.set(w * 0.14, roofY + 1.5, 0);
          bGroup.add(upperBrickVolume);

          const glassCube = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.54, hullH * 0.72, d * 0.45),
            new THREE.MeshStandardMaterial({
              color: '#475b6d',
              roughness: 0.15,
              metalness: 0.82,
            })
          );
          glassCube.position.set(-w * 0.18, plinthTop + hullH * 0.38, d * 0.36);
          bGroup.add(glassCube);
        } else if (b.archetype === 'geodesic-dome' || b.archetype === 'observatory-tower') {
          // Stepped Senate House / Roberts Tower with Warm Ochre/Green Roof Decks
          const steppedTier1 = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.72, 3.2, d * 0.72),
            new THREE.MeshStandardMaterial({ color: '#dfd8cc', roughness: 0.6 })
          );
          steppedTier1.position.y = roofY + 1.6;
          bGroup.add(steppedTier1);

          const yellowRoof = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.74, 0.45, d * 0.74),
            new THREE.MeshStandardMaterial({ color: '#cbb854', roughness: 0.7 })
          );
          yellowRoof.position.y = roofY + 3.3;
          bGroup.add(yellowRoof);
        } else {
          // Green Sedum Roof + Clerestory Studio Lantern (Bartlett 22 Gordon St)
          const sedumRoof = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.96, 0.5, d * 0.96),
            new THREE.MeshStandardMaterial({ color: '#7bc058', roughness: 0.75 })
          );
          sedumRoof.position.y = roofY + 0.25;
          bGroup.add(sedumRoof);

          const lantern = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.68, 2.1, d * 0.68),
            new THREE.MeshStandardMaterial({
              color: '#d88c42',
              roughness: 0.45,
              metalness: 0.3,
            })
          );
          lantern.position.y = roofY + 1.25;
          bGroup.add(lantern);
        }

        // Satellite-Derived Real-World Rooftop Details (Solar PV Arrays)
        for (let pv = -1; pv <= 1; pv += 2) {
          const pvPanel = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.28, 0.14, d * 0.18),
            sharedSolarArrayMat
          );
          pvPanel.position.set(pv * (w * 0.24), roofY + 0.62, -d * 0.22);
          pvPanel.rotation.x = 0.18;
          bGroup.add(pvPanel);
        }

        const beaconColor = heatmapOn ? metrics.heat.hex : b.accentColor;
        const beaconMesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(isSelected ? 1.05 : 0.72, 0),
          new THREE.MeshStandardMaterial({
            color: beaconColor,
            roughness: 0.1,
            metalness: 0.9,
            emissive: beaconColor,
            emissiveIntensity: isSelected ? 1.2 : 0.65,
          })
        );
        beaconMesh.position.y = roofY + 5.8;
        beaconMesh.userData = { buildingId: b.id, isBeacon: true };
        bGroup.add(beaconMesh);
        interactableMeshes.push(beaconMesh);

        buildingsRoot.add(bGroup);
      });

      // Synchronize solar lighting & sky background before immediate render so Day/Dusk/Night transitions never flash
      sunLight.position.set(...sunState.sunPosition);
      sunLight.intensity = sunState.sunIntensity;
      sunLight.color.set(sunState.sunColorHex);
      hemiLight.color.set(sunState.hemiSkyHex);
      hemiLight.groundColor.set(sunState.hemiGroundHex);
      hemiLight.intensity = sunState.hemiIntensity;
      renderer.toneMappingExposure = sunState.isNight
        ? 0.68
        : sunState.isGoldenHour
          ? 0.76
          : 0.82;
      sceneBgColor.set(sunState.fogColorHex);
      scene.background = sceneBgColor;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(sceneBgColor);
        scene.fog.density = propsRef.current.showBloomAndFog ? sunState.fogDensity : 0.0004;
      }

      renderer.render(scene, camera);
    };

    rebuildTerrainRef.current = rebuildTerrainAndEnvironment;
    rebuildBuildingsRef.current = buildSceneBuildings;
    rebuildTerrainAndEnvironment();
    buildSceneBuildings();

    // 8. Particle System 1: Student Flow Energy Streams along Campus Pathways
    const flowParticleCount = 210;
    const flowPositions = new Float32Array(flowParticleCount * 3);
    const flowColors = new Float32Array(flowParticleCount * 3);
    const flowGeo = new THREE.BufferGeometry();
    flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPositions, 3));
    flowGeo.setAttribute('color', new THREE.BufferAttribute(flowColors, 3));

    for (let i = 0; i < flowParticleCount; i++) {
      _tempColor.setHSL(0.52 + (i % 7) * 0.03, 0.95, 0.65);
      flowColors[i * 3] = _tempColor.r;
      flowColors[i * 3 + 1] = _tempColor.g;
      flowColors[i * 3 + 2] = _tempColor.b;
    }

    const flowMat = new THREE.PointsMaterial({
      size: 1.35,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flowPoints = new THREE.Points(flowGeo, flowMat);
    scene.add(flowPoints);

    // 9. Particle System 2: Floating Ambient Dust / Light Motes around Selected Study Hub
    const moteCount = 90;
    const motePositions = new Float32Array(moteCount * 3);
    const moteGeo = new THREE.BufferGeometry();
    for (let i = 0; i < moteCount; i++) {
      motePositions[i * 3] = (Math.random() - 0.5) * 18;
      motePositions[i * 3 + 1] = 1 + Math.random() * 18;
      motePositions[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
    const moteMat = new THREE.PointsMaterial({
      color: '#fef08a',
      size: 0.95,
      map: particleTex,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dustMotesGroup = new THREE.Points(moteGeo, moteMat);
    scene.add(dustMotesGroup);

    // 10. Particle System 3: Radar Pulse Waves on Selected Study Spot
    const radarGroup = new THREE.Group();
    const radarRings: THREE.Mesh[] = [];
    for (let r = 0; r < 3; r++) {
      const ringGeo = new THREE.RingGeometry(0.9, 1.25, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = r * 0.02;
      radarGroup.add(ringMesh);
      radarRings.push(ringMesh);
    }
    scene.add(radarGroup);

    // 10B. City of London 3D Macro Map Group (River Thames, 7 Bridges, All 12 London Rivers/Canals/Lost Rivers, Inter-University Corridors & Campus Boundary Rings)
    const londonCityMacroGroup = new THREE.Group();
    const londonRiversGroup = new THREE.Group();
    scene.add(londonRiversGroup);
    const cityMapInteractables: THREE.Object3D[] = [];

    // Dedicated 3D Hydrology Flow Current Particle System (shows live directional flow along River Thames & all London rivers/streams)
    const riverParticleCount = 320;
    const riverParticlePositions = new Float32Array(riverParticleCount * 3);
    const riverParticleColors = new Float32Array(riverParticleCount * 3);
    const riverParticleGeo = new THREE.BufferGeometry();
    riverParticleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(riverParticlePositions, 3)
    );
    riverParticleGeo.setAttribute(
      'color',
      new THREE.BufferAttribute(riverParticleColors, 3)
    );
    for (let i = 0; i < riverParticleCount; i++) {
      const waterway =
        LONDON_RIVERS_AND_STREAMS_3D[i % LONDON_RIVERS_AND_STREAMS_3D.length];
      _tempColor.set(waterway.id === 'river-thames' ? '#38bdf8' : waterway.colorHex);
      riverParticleColors[i * 3] = _tempColor.r;
      riverParticleColors[i * 3 + 1] = _tempColor.g;
      riverParticleColors[i * 3 + 2] = _tempColor.b;
    }
    const riverParticleMat = new THREE.PointsMaterial({
      size: 1.55,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const riverFlowPoints = new THREE.Points(riverParticleGeo, riverParticleMat);
    scene.add(riverFlowPoints);

    const buildLondonCityMacroMap = () => {
      while (londonCityMacroGroup.children.length > 0) {
        const c = londonCityMacroGroup.children[0] as THREE.Mesh;
        c.geometry?.dispose();
        londonCityMacroGroup.remove(c);
      }
      while (londonRiversGroup.children.length > 0) {
        const c = londonRiversGroup.children[0] as THREE.Mesh;
        c.geometry?.dispose();
        londonRiversGroup.remove(c);
      }
      cityMapInteractables.length = 0;

      const activePreset = propsRef.current.terrainPreset;
      const activeWaterY = propsRef.current.waterLevelY;
      const activeFocusedRiver = propsRef.current.focusedRiverId;

      // A. All 12 London Waterways: River Thames, Surface Rivers (Lea, Westbourne/Serpentine, Wandle, Ravensbourne), Regent's Canal & Subterranean Lost Rivers (Fleet, Tyburn, Walbrook, Counter's Creek, Effra, Neckinger)
      LONDON_RIVERS_AND_STREAMS_3D.forEach((waterway, wIdx) => {
        const isFocused = activeFocusedRiver === waterway.id;
        const isThames = waterway.id === 'river-thames';
        const isSubterranean = waterway.type === 'subterranean-stream';

        const curvePts = waterway.pathXZ.map(([wx, wz]) => {
          const groundY = Math.max(
            activeWaterY + 0.25,
            getTerrainElevation(wx, wz, activePreset)
          );
          return new THREE.Vector3(wx, groundY + 0.12 + wIdx * 0.005, wz);
        });
        const riverCurve = new THREE.CatmullRomCurve3(curvePts);

        if (isThames) {
          // 1. Wide Victoria / South Bank Stone Embankment Walls along the River Thames
          const embankmentGeo = createTerrainRibbonGeometry(
            riverCurve,
            84,
            waterway.widthSceneUnits + 3.4,
            0.22,
            activePreset,
            activeWaterY
          );
          const embankmentMesh = new THREE.Mesh(embankmentGeo, sidewalkMat);
          londonRiversGroup.add(embankmentMesh);

          // 2. Reflective Sapphire River Thames Main Channel
          const thamesWaterGeo = createTerrainRibbonGeometry(
            riverCurve,
            84,
            waterway.widthSceneUnits,
            0.35,
            activePreset,
            activeWaterY
          );
          const thamesWaterMat = new THREE.MeshStandardMaterial({
            color: isFocused ? '#38bdf8' : waterway.colorHex,
            roughness: 0.1,
            metalness: 0.86,
            emissive: isFocused ? '#0ea5e9' : waterway.emissiveHex,
            emissiveIntensity: isFocused ? 0.65 : 0.34,
            side: THREE.DoubleSide,
          });
          const thamesWaterMesh = new THREE.Mesh(thamesWaterGeo, thamesWaterMat);
          thamesWaterMesh.userData = { riverId: waterway.id };
          londonRiversGroup.add(thamesWaterMesh);
          cityMapInteractables.push(thamesWaterMesh);

          // 3. Directional Flow Chevron Markers along the River Thames (showing West -> East tidal flow)
          for (let f = 0.08; f <= 0.92; f += 0.1) {
            const pt = riverCurve.getPoint(f);
            const tangent = riverCurve.getTangent(f);
            const angleY = Math.atan2(tangent.x, tangent.z);
            const wy = Math.max(
              activeWaterY + 0.48,
              getTerrainElevation(pt.x, pt.z, activePreset) + 0.42
            );
            const arrowCone = new THREE.Mesh(
              new THREE.ConeGeometry(1.15, 2.8, 4),
              new THREE.MeshBasicMaterial({
                color: '#7dd3fc',
                transparent: true,
                opacity: 0.78,
              })
            );
            arrowCone.position.set(pt.x, wy, pt.z);
            arrowCone.rotation.x = Math.PI / 2;
            arrowCone.rotation.z = -angleY;
            londonRiversGroup.add(arrowCone);
          }

          // 4. 7 Iconic London Bridges across the River Thames (Chelsea, Vauxhall, Westminster, Waterloo, Blackfriars, London Bridge, Tower Bridge)
          LONDON_THAMES_BRIDGES_3D.forEach((bridge) => {
            const pt = riverCurve.getPoint(bridge.curveFraction);
            const tangent = riverCurve.getTangent(bridge.curveFraction);
            const angleY = Math.atan2(tangent.x, tangent.z);
            const bridgeH = Math.max(
              activeWaterY + 0.5,
              getTerrainElevation(pt.x, pt.z, activePreset)
            );
            const bridgeDeck = new THREE.Mesh(
              new THREE.BoxGeometry(19.2, 0.85, 3.4),
              walkwayStoneMat
            );
            bridgeDeck.position.set(pt.x, bridgeH + 0.98, pt.z);
            bridgeDeck.rotation.y = angleY;
            londonRiversGroup.add(bridgeDeck);

            if (bridge.id === 'tower-bridge') {
              // Iconic Twin Gothic Bascule Towers on Tower Bridge
              [-4.2, 4.2].forEach((offsetAcross) => {
                const towerMesh = new THREE.Mesh(
                  new THREE.BoxGeometry(1.6, 5.4, 1.8),
                  walkwayStoneMat
                );
                towerMesh.position.set(
                  pt.x + Math.cos(angleY) * offsetAcross,
                  bridgeH + 3.4,
                  pt.z - Math.sin(angleY) * offsetAcross
                );
                towerMesh.rotation.y = angleY;
                londonRiversGroup.add(towerMesh);
              });
            }
          });
        } else if (isSubterranean) {
          // Subterranean "Lost Rivers of London" (River Fleet, Tyburn, Walbrook, Counter's Creek, Effra, Neckinger)
          // Rendered as glowing translucent aqua culvert ribbons + dashed surface hydrological trace markers
          const subGeo = createTerrainRibbonGeometry(
            riverCurve,
            48,
            waterway.widthSceneUnits * (isFocused ? 1.35 : 1.0),
            0.29 + wIdx * 0.004,
            activePreset,
            activeWaterY
          );
          const subMat = new THREE.MeshStandardMaterial({
            color: waterway.colorHex,
            roughness: 0.18,
            metalness: 0.78,
            emissive: waterway.emissiveHex,
            emissiveIntensity: isFocused ? 0.95 : 0.52,
            transparent: true,
            opacity: isFocused ? 0.92 : 0.68,
            side: THREE.DoubleSide,
          });
          const subMesh = new THREE.Mesh(subGeo, subMat);
          subMesh.userData = { riverId: waterway.id };
          londonRiversGroup.add(subMesh);
          cityMapInteractables.push(subMesh);

          // Glowing culvert inspection/flow nodes along the underground stream path
          const nodeCount = 12;
          for (let n = 1; n < nodeCount; n++) {
            const pt = riverCurve.getPoint(n / nodeCount);
            const ny = Math.max(
              activeWaterY + 0.45,
              getTerrainElevation(pt.x, pt.z, activePreset) + 0.38
            );
            const nodeRing = new THREE.Mesh(
              new THREE.CylinderGeometry(0.55, 0.55, 0.18, 12),
              new THREE.MeshBasicMaterial({
                color: waterway.colorHex,
                transparent: true,
                opacity: 0.85,
              })
            );
            nodeRing.position.set(pt.x, ny, pt.z);
            londonRiversGroup.add(nodeRing);
          }
        } else {
          // Surface Rivers & Canals (River Lea & Waterworks at UCL East, Regent's Canal, River Westbourne & Serpentine, Wandle, Ravensbourne)
          const bankGeo = createTerrainRibbonGeometry(
            riverCurve,
            56,
            waterway.widthSceneUnits + 1.5,
            0.2 + wIdx * 0.004,
            activePreset,
            activeWaterY
          );
          const bankMesh = new THREE.Mesh(bankGeo, sidewalkMat);
          londonRiversGroup.add(bankMesh);

          const surfaceRiverGeo = createTerrainRibbonGeometry(
            riverCurve,
            56,
            waterway.widthSceneUnits * (isFocused ? 1.3 : 1.0),
            0.31 + wIdx * 0.004,
            activePreset,
            activeWaterY
          );
          const surfaceRiverMat = new THREE.MeshStandardMaterial({
            color: waterway.colorHex,
            roughness: 0.12,
            metalness: 0.84,
            emissive: waterway.emissiveHex,
            emissiveIntensity: isFocused ? 0.85 : 0.38,
            side: THREE.DoubleSide,
          });
          const surfaceRiverMesh = new THREE.Mesh(surfaceRiverGeo, surfaceRiverMat);
          surfaceRiverMesh.userData = { riverId: waterway.id };
          londonRiversGroup.add(surfaceRiverMesh);
          cityMapInteractables.push(surfaceRiverMesh);
        }

        // Highlight beacon ring at focused waterway's label position
        if (isFocused) {
          const [lx, lz] = waterway.labelXZ;
          const ly = Math.max(
            activeWaterY + 0.5,
            getTerrainElevation(lx, lz, activePreset) + 0.48
          );
          const focusRing = new THREE.Mesh(
            new THREE.RingGeometry(4.2, 5.4, 36),
            new THREE.MeshBasicMaterial({
              color: waterway.colorHex,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.9,
            })
          );
          focusRing.rotation.x = -Math.PI / 2;
          focusRing.position.set(lx, ly, lz);
          londonRiversGroup.add(focusRing);
        }
      });

      // B. Geodesic Inter-University Distance Corridors & Glowing Sky Arcs across London
      const routes = getLondonInterUniversityRoutes();
      routes.forEach((route, rIdx) => {
        const g1 = LONDON_UNIVERSITY_GEO_LOCATIONS.find((g) => g.campusId === route.fromCampusId);
        const g2 = LONDON_UNIVERSITY_GEO_LOCATIONS.find((g) => g.campusId === route.toCampusId);
        if (!g1 || !g2) return;

        const [x1, z1] = g1.londonWorldXZ;
        const [x2, z2] = g2.londonWorldXZ;
        const y1 = Math.max(activeWaterY + 0.5, getTerrainElevation(x1, z1, activePreset)) + 0.25;
        const y2 = Math.max(activeWaterY + 0.5, getTerrainElevation(x2, z2, activePreset)) + 0.25;
        const midX = (x1 + x2) * 0.5;
        const midZ = (z1 + z2) * 0.5;
        const midGroundY = Math.max(
          activeWaterY + 0.5,
          getTerrainElevation(midX, midZ, activePreset)
        );

        // Ground arterial road connecting the universities across London
        const groundRoadCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x1, y1, z1),
          new THREE.Vector3(midX, midGroundY + 0.25, midZ),
          new THREE.Vector3(x2, y2, z2),
        ]);
        const groundRoadGeo = createTerrainRibbonGeometry(
          groundRoadCurve,
          40,
          3.2,
          0.26 + rIdx * 0.004,
          activePreset,
          activeWaterY
        );
        const groundRoadMesh = new THREE.Mesh(groundRoadGeo, asphaltMat);
        londonCityMacroGroup.add(groundRoadMesh);

        // Elevated glowing geodesic distance arc (Only visible in Macro London 3D City Map mode so it never slices through close-up campus buildings)
        if (propsRef.current.showLondonCityMap) {
          const arcPeakY = Math.max(y1, y2) + 14.5 + route.distanceKm * 1.6;
          const skyArcCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(x1, y1 + 8.5, z1),
            new THREE.Vector3(midX, arcPeakY, midZ),
            new THREE.Vector3(x2, y2 + 8.5, z2),
          ]);
          const skyArcGeo = new THREE.TubeGeometry(skyArcCurve, 36, 0.22, 8, false);
          const skyArcMat = new THREE.MeshBasicMaterial({
            color: g1.accentColor,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
          });
          const skyArcMesh = new THREE.Mesh(skyArcGeo, skyArcMat);
          londonCityMacroGroup.add(skyArcMesh);
        }
      });

      // C. Campus Boundary Rings & OSM Extruded Context Pads at all 7 London Campus Locations
      LONDON_UNIVERSITY_GEO_LOCATIONS.forEach((geo) => {
        const [hubX, hubZ] = geo.londonWorldXZ;
        const hubGroundY = Math.max(
          activeWaterY + 0.35,
          getTerrainElevation(hubX, hubZ, activePreset)
        );

        const uniHubGroup = new THREE.Group();
        uniHubGroup.position.set(hubX, hubGroundY, hubZ);

        // Subtle University Campus Boundary Ring
        const ringHalo = new THREE.Mesh(
          new THREE.RingGeometry(24.5, 25.8, 48),
          new THREE.MeshBasicMaterial({
            color: geo.accentColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.48,
            depthWrite: false,
          })
        );
        ringHalo.rotation.x = -Math.PI / 2;
        ringHalo.position.y = 0.42;
        ringHalo.userData = { universityId: geo.universityId, campusId: geo.campusId };
        uniHubGroup.add(ringHalo);
        cityMapInteractables.push(ringHalo);

        if (propsRef.current.showLondonCityMap) {
          const beaconDiamond = new THREE.Mesh(
            new THREE.OctahedronGeometry(1.35, 0),
            new THREE.MeshStandardMaterial({
              color: '#ffffff',
              emissive: geo.accentColor,
              emissiveIntensity: 0.55,
              roughness: 0.2,
              metalness: 0.8,
            })
          );
          beaconDiamond.position.y = 22.5;
          beaconDiamond.userData = {
            universityId: geo.universityId,
            campusId: geo.campusId,
            isBeacon: true,
          };
          uniHubGroup.add(beaconDiamond);
          cityMapInteractables.push(beaconDiamond);
        }

        londonCityMacroGroup.add(uniHubGroup);
      });

      // D. Apple Maps 3D Mode Royal Parks & London Squares (Hyde Park, Regent's Park, Russell Sq, Lincoln's Inn, Olympic Park)
      const parkLawnMat = new THREE.MeshStandardMaterial({
        color: '#15803d',
        roughness: 0.85,
        metalness: 0.05,
        emissive: '#14532d',
        emissiveIntensity: 0.18,
      });
      const parkBorderMat = new THREE.MeshStandardMaterial({
        color: '#86efac',
        roughness: 0.6,
        metalness: 0.1,
      });
      LONDON_ROYAL_PARKS_3D.forEach((park) => {
        const [px, pz] = park.londonWorldXZ;
        const [pw, pd] = park.sizeXZ;
        const py = Math.max(
          activeWaterY + 0.32,
          getTerrainElevation(px, pz, activePreset)
        );
        const parkBase = new THREE.Mesh(
          new THREE.BoxGeometry(pw, 0.36, pd),
          parkLawnMat
        );
        parkBase.position.set(px, py + 0.16, pz);
        parkBase.receiveShadow = true;
        londonCityMacroGroup.add(parkBase);

        const parkPath = new THREE.Mesh(
          new THREE.BoxGeometry(pw * 0.92, 0.4, 1.3),
          parkBorderMat
        );
        parkPath.position.set(px, py + 0.18, pz);
        londonCityMacroGroup.add(parkPath);
      });

      // E. AccuCities 2025 London Level-3 3D Landmarks & Apple Maps 3D Detailed City Monuments
      const alabasterStoneMat = new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        roughness: 0.38,
        metalness: 0.25,
      });
      const glassLandmarkMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        roughness: 0.14,
        metalness: 0.88,
        emissive: '#0284c7',
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.86,
      });
      const terracottaLandmarkMat = new THREE.MeshStandardMaterial({
        color: '#b45309',
        roughness: 0.45,
        metalness: 0.25,
        emissive: '#f59e0b',
        emissiveIntensity: 0.22,
      });

      LONDON_3D_ICONIC_LANDMARKS.forEach((lm) => {
        const [lx, lz] = lm.londonWorldXZ;
        const ly = Math.max(
          activeWaterY + 0.38,
          getTerrainElevation(lx, lz, activePreset)
        );
        const lmGroup = new THREE.Group();
        lmGroup.position.set(lx, ly, lz);

        if (lm.archetype === 'shard-spire') {
          // The Shard (310m pyramidal glass spire at London Bridge)
          const shardMesh = new THREE.Mesh(
            new THREE.ConeGeometry(4.6, 26.5, 4),
            glassLandmarkMat
          );
          shardMesh.position.y = 13.25;
          shardMesh.rotation.y = Math.PI / 4;
          shardMesh.castShadow = true;
          lmGroup.add(shardMesh);
        } else if (lm.archetype === 'bt-tower') {
          // BT Tower (Fitzrovia cylindrical communications tower near UCL)
          const shaft = new THREE.Mesh(
            new THREE.CylinderGeometry(1.35, 1.5, 18.5, 16),
            alabasterStoneMat
          );
          shaft.position.y = 9.25;
          lmGroup.add(shaft);
          const drum = new THREE.Mesh(
            new THREE.CylinderGeometry(2.3, 2.3, 2.8, 20),
            glassLandmarkMat
          );
          drum.position.y = 16.2;
          lmGroup.add(drum);
          const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.3, 4.2, 8),
            alabasterStoneMat
          );
          mast.position.y = 20.2;
          lmGroup.add(mast);
        } else if (lm.archetype === 'london-eye') {
          // London Eye (South Bank cantilevered observation wheel near KCL Waterloo)
          const wheel = new THREE.Mesh(
            new THREE.TorusGeometry(6.8, 0.32, 12, 36),
            new THREE.MeshStandardMaterial({
              color: '#f8fafc',
              emissive: '#f43f5e',
              emissiveIntensity: 0.55,
              roughness: 0.2,
              metalness: 0.85,
            })
          );
          wheel.position.y = 8.2;
          wheel.rotation.y = 0.25;
          lmGroup.add(wheel);
          const aFrame = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 2.6, 8.5, 4),
            alabasterStoneMat
          );
          aFrame.position.y = 4.2;
          lmGroup.add(aFrame);
        } else if (lm.archetype === 'st-pauls-dome') {
          // St Paul's Cathedral (Baroque nave + colonnade drum + dome + golden cross)
          const nave = new THREE.Mesh(
            new THREE.BoxGeometry(8.8, 4.6, 5.2),
            alabasterStoneMat
          );
          nave.position.y = 2.3;
          lmGroup.add(nave);
          const drum = new THREE.Mesh(
            new THREE.CylinderGeometry(2.6, 2.8, 3.6, 20),
            alabasterStoneMat
          );
          drum.position.y = 6.2;
          lmGroup.add(drum);
          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(2.55, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({
              color: '#475569',
              roughness: 0.35,
              metalness: 0.65,
              emissive: '#eab308',
              emissiveIntensity: 0.25,
            })
          );
          dome.position.y = 8.0;
          lmGroup.add(dome);
        } else if (lm.archetype === 'albert-hall') {
          // Royal Albert Hall (Victorian elliptical terracotta rotunda & glass dome at Imperial)
          const rotunda = new THREE.Mesh(
            new THREE.CylinderGeometry(4.8, 5.1, 5.2, 24),
            terracottaLandmarkMat
          );
          rotunda.position.y = 2.6;
          lmGroup.add(rotunda);
          const glassDome = new THREE.Mesh(
            new THREE.SphereGeometry(4.65, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            glassLandmarkMat
          );
          glassDome.scale.set(1, 0.48, 1);
          glassDome.position.y = 5.2;
          lmGroup.add(glassDome);
        } else if (lm.archetype === 'gherkin') {
          // 30 St Mary Axe (The Gherkin diagrid glass bullet tower)
          const gherkinBody = new THREE.Mesh(
            new THREE.SphereGeometry(3.4, 20, 18),
            glassLandmarkMat
          );
          gherkinBody.scale.set(1.0, 3.6, 1.0);
          gherkinBody.position.y = 10.5;
          lmGroup.add(gherkinBody);
        } else if (lm.archetype === 'british-museum') {
          // British Museum neoclassical colonnade + Great Court dome
          const court = new THREE.Mesh(
            new THREE.BoxGeometry(9.2, 3.8, 7.6),
            alabasterStoneMat
          );
          court.position.y = 1.9;
          lmGroup.add(court);
          const readingDome = new THREE.Mesh(
            new THREE.SphereGeometry(2.4, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
            glassLandmarkMat
          );
          readingDome.position.y = 3.8;
          lmGroup.add(readingDome);
        } else {
          // Olympic Park Orbit & Stadium
          const stadiumRing = new THREE.Mesh(
            new THREE.TorusGeometry(4.8, 1.1, 10, 28),
            alabasterStoneMat
          );
          stadiumRing.rotation.x = Math.PI / 2;
          stadiumRing.position.y = 1.4;
          lmGroup.add(stadiumRing);
          const orbitSpire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.4, 1.5, 13.5, 10),
            new THREE.MeshStandardMaterial({
              color: '#e11d48',
              emissive: '#ec4899',
              emissiveIntensity: 0.45,
              roughness: 0.25,
              metalness: 0.75,
            })
          );
          orbitSpire.position.set(3.2, 6.75, -2.0);
          lmGroup.add(orbitSpire);
        }

        londonCityMacroGroup.add(lmGroup);
      });

      // F. AccuCities 2025 / Apple Maps 3D Alabaster City of London Massing Blocks across the London Grid
      const cityMassingMat = new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        roughness: 0.65,
        metalness: 0.18,
      });
      for (let gx = -125; gx <= 125; gx += 18) {
        for (let gz = -78; gz <= 78; gz += 18) {
          // Skip river channel (around z = 36..68 depending on x)
          const riverZ = gx < -30 ? 70 : gx < 20 ? 50 : 40;
          if (Math.abs(gz - riverZ) < 13) continue;

          // Skip inside any of the 7 university campus rings
          let insideCampus = false;
          for (const g of LONDON_UNIVERSITY_GEO_LOCATIONS) {
            if (Math.hypot(gx - g.londonWorldXZ[0], gz - g.londonWorldXZ[1]) < 27) {
              insideCampus = true;
              break;
            }
          }
          if (insideCampus) continue;

          // Skip inside Royal Parks
          let insidePark = false;
          for (const p of LONDON_ROYAL_PARKS_3D) {
            if (
              Math.abs(gx - p.londonWorldXZ[0]) < p.sizeXZ[0] * 0.6 &&
              Math.abs(gz - p.londonWorldXZ[1]) < p.sizeXZ[1] * 0.6
            ) {
              insidePark = true;
              break;
            }
          }
          if (insidePark) continue;

          const hash = Math.abs((gx * 37 + gz * 17) % 11);
          if (hash < 4) continue;

          const bw = 5.5 + (hash % 4) * 1.4;
          const bd = 5.0 + ((hash * 3) % 4) * 1.3;
          const bh = 2.6 + (hash % 5) * 1.45;
          const gy = Math.max(
            activeWaterY + 0.25,
            getTerrainElevation(gx, gz, activePreset)
          );
          const blockMesh = new THREE.Mesh(
            new THREE.BoxGeometry(bw, bh, bd),
            cityMassingMat
          );
          blockMesh.position.set(gx, gy + bh * 0.5, gz);
          blockMesh.receiveShadow = true;
          londonCityMacroGroup.add(blockMesh);
        }
      }
    };

    rebuildMacroMapRef.current = buildLondonCityMacroMap;
    buildLondonCityMacroMap();
    scene.add(londonCityMacroGroup);

    // 11. Camera Target Transition Calculation (Supports Full London 3D Map, Focused London River/Stream & Individual Campus Geographic Locations)
    const updateCameraTarget = () => {
      const {
        buildings: currentBuildings,
        selectedBuildingId: activeId,
        selectedFloorNumber: activeFloor,
        activeCampusHubXZ: hubXZ,
        cameraPreset: preset,
        terrainPreset: activeTerrain,
        showLondonCityMap: cityMapOn,
        focusedRiverId: activeRiverId,
      } = propsRef.current;

      if (activeRiverId) {
        const targetRiver = LONDON_RIVERS_AND_STREAMS_3D.find(
          (r) => r.id === activeRiverId
        );
        if (targetRiver) {
          const [rx, rz] = targetRiver.labelXZ;
          const ry = getTerrainElevation(rx, rz, activeTerrain);
          if (targetRiver.id === 'river-thames') {
            _targetCameraPos.set(22, 108, 128);
            _targetLookAt.set(28, ry + 2, 42);
          } else {
            _targetCameraPos.set(rx - 14, ry + 54, rz + 58);
            _targetLookAt.set(rx, ry + 2, rz);
          }
          if (isSoftwareGl) {
            camera.position.copy(_targetCameraPos);
            controls.target.copy(_targetLookAt);
            controls.update();
            cameraTransitionActive = false;
          } else {
            cameraTransitionActive = true;
          }
          return;
        }
      }

      if (cityMapOn) {
        // High panoramic AccuCities 2025 / Apple Maps 3D London view framing all 7 campuses & 8 London Landmarks in center
        _targetCameraPos.set(0, 198, 224);
        _targetLookAt.set(2, 0, -4);
        if (isSoftwareGl) {
          camera.position.copy(_targetCameraPos);
          controls.target.copy(_targetLookAt);
          controls.update();
          cameraTransitionActive = false;
        } else {
          cameraTransitionActive = true;
        }
        return;
      }

      const targetBuilding =
        currentBuildings.find((b) => b.id === activeId) || currentBuildings[0];
      const [hubX, hubZ] = hubXZ || [10, -48];
      const [bx, , bz] = targetBuilding ? targetBuilding.position : [hubX, 0, hubZ];
      const bh = targetBuilding ? targetBuilding.dimensions[1] : 12;
      const groundY = getTerrainElevation(bx, bz, activeTerrain);
      const hubGroundY = getTerrainElevation(hubX, hubZ, activeTerrain);

      if (preset === 'overview') {
        // Fly directly to the active campus's real geographic location on the 3D Map of London
        _targetCameraPos.set(hubX - 6, hubGroundY + 36, hubZ + 44);
        _targetLookAt.set(hubX, hubGroundY + 2, hubZ);
      } else if (preset === 'street-level') {
        _targetCameraPos.set(bx - 6, groundY + 5.5, bz + 18);
        _targetLookAt.set(bx, groundY + bh * 0.45, bz);
      } else if (preset === 'floor-cutaway') {
        const floorY = groundY + (activeFloor ? activeFloor * 3.2 : bh * 0.6);
        _targetCameraPos.set(bx + 15, floorY + 5.5, bz + 15);
        _targetLookAt.set(bx, floorY, bz);
      } else {
        _targetCameraPos.set(bx + 18, groundY + bh + 9, bz + 20);
        _targetLookAt.set(bx, floorYOrHalf(groundY, bh), bz);
      }
      if (isSoftwareGl) {
        camera.position.copy(_targetCameraPos);
        controls.target.copy(_targetLookAt);
        controls.update();
        cameraTransitionActive = false;
      } else {
        cameraTransitionActive = true;
      }
    };
    function floorYOrHalf(groundY: number, bh: number) {
      return groundY + bh * 0.5;
    }
    updateCameraTargetRef.current = updateCameraTarget;
    updateCameraTarget();

    const raycaster = new THREE.Raycaster();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx > 6 || dy > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      _mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(_mouseVec, camera);

      const hits = raycaster.intersectObjects(interactableMeshes, false);
      if (hits.length > 0) {
        const hitBuildingId = hits[0].object.userData?.buildingId;
        if (hitBuildingId) {
          propsRef.current.onSelectBuilding(hitBuildingId);
          return;
        }
      }

      const cityHits = raycaster.intersectObjects(cityMapInteractables, false);
      if (cityHits.length > 0) {
        const { universityId, campusId, riverId } = cityHits[0].object.userData || {};
        if (riverId) {
          propsRef.current.onSelectRiver?.(riverId);
          return;
        }
        if (universityId && campusId) {
          propsRef.current.onSelectUniversityFromCityMap?.(universityId, campusId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const activeKeys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      activeKeys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const currentProps = propsRef.current;

      const sunState = calculateSunState(currentProps.solarHour);
      sunLight.position.set(...sunState.sunPosition);
      sunLight.intensity = sunState.sunIntensity;
      sunLight.color.set(sunState.sunColorHex);
      hemiLight.color.set(sunState.hemiSkyHex);
      hemiLight.groundColor.set(sunState.hemiGroundHex);
      hemiLight.intensity = sunState.hemiIntensity;

      // Tempered Day / Golden Hour / Night toneMapping exposure, environment reflection, streetlamps & water color
      renderer.toneMappingExposure = sunState.isNight
        ? 0.68
        : sunState.isGoldenHour
          ? 0.76
          : 0.82;
      scene.environmentIntensity = sunState.isNight
        ? 0.14
        : sunState.isGoldenHour
          ? 0.22
          : 0.28;
      lampBulbMat.emissiveIntensity = sunState.isNight
        ? 1.15
        : sunState.isGoldenHour
          ? 0.55
          : 0.02;
      waterMat.color.set(
        sunState.isNight ? '#082f49' : sunState.isGoldenHour ? '#0369a1' : '#0284c7'
      );

      // Update building facade window glow intensity in real time with tempered, non-glaring brightness
      buildingsRoot.children.forEach((bGroup) => {
        const hullMesh = bGroup.children[2] as THREE.Mesh | undefined;
        if (hullMesh && hullMesh.material instanceof THREE.MeshStandardMaterial) {
          hullMesh.material.emissiveIntensity =
            (currentProps.showBloomAndFog ? currentProps.bloomIntensity * 0.45 : 0.18) *
            sunState.windowGlowIntensity;
        }
      });

      sceneBgColor.set(sunState.fogColorHex);
      scene.background = sceneBgColor;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(sceneBgColor);
        scene.fog.density = currentProps.showBloomAndFog ? sunState.fogDensity : 0.0004;
      }

      // Keep River Thames, Bridges, all 12 London Rivers/Streams, and all 7 London Campuses visible on the unified 3D Map of London
      londonCityMacroGroup.visible = true;
      londonRiversGroup.visible = currentProps.showRiversAndStreams ?? true;
      riverFlowPoints.visible = currentProps.showRiversAndStreams ?? true;
      buildingsRoot.visible = true;
      plazaGroup.visible = true;
      roadAndPathwayGroup.visible = currentProps.showRoadsAndPaths;
      foliageGroup.visible = currentProps.showFoliage;
      contextBlockInst.visible = currentProps.showUrbanContext;

      // Animate Directional River & Stream Flow Current Particles along the River Thames and all 11 London Tributaries/Canals/Lost Rivers
      if (londonRiversGroup.visible) {
        const rPos = riverParticleGeo.attributes.position as THREE.BufferAttribute;
        const waterwayCount = LONDON_RIVERS_AND_STREAMS_3D.length;
        for (let i = 0; i < riverParticleCount; i++) {
          const waterway = LONDON_RIVERS_AND_STREAMS_3D[i % waterwayCount];
          const pts = waterway.pathXZ;
          const speed = waterway.id === 'river-thames' ? 0.11 : 0.16;
          const t = (elapsed * speed + (i / riverParticleCount) * 4.3) % 1;
          const segCount = pts.length - 1;
          const segFloat = t * segCount;
          const segIdx = Math.min(segCount - 1, Math.floor(segFloat));
          const segT = segFloat - segIdx;

          const p0 = pts[segIdx];
          const p1 = pts[segIdx + 1];
          const spread = waterway.widthSceneUnits * 0.28;
          const lateralOffset = Math.sin(i * 1.7 + elapsed * 1.5) * spread;
          const px = p0[0] + (p1[0] - p0[0]) * segT + lateralOffset * 0.35;
          const pz = p0[1] + (p1[1] - p0[1]) * segT + lateralOffset * 0.65;
          const groundH = Math.max(
            currentProps.waterLevelY + 0.42,
            getTerrainElevation(px, pz, currentProps.terrainPreset)
          );
          rPos.setXYZ(i, px, groundH + 0.62, pz);
        }
        rPos.needsUpdate = true;
      }

      const panSpeed = 26 * delta;
      let manualMove = false;
      if (activeKeys['KeyW'] || activeKeys['ArrowUp']) {
        camera.position.z -= panSpeed;
        controls.target.z -= panSpeed;
        manualMove = true;
      }
      if (activeKeys['KeyS'] || activeKeys['ArrowDown']) {
        camera.position.z += panSpeed;
        controls.target.z += panSpeed;
        manualMove = true;
      }
      if (activeKeys['KeyA'] || activeKeys['ArrowLeft']) {
        camera.position.x -= panSpeed;
        controls.target.x -= panSpeed;
        manualMove = true;
      }
      if (activeKeys['KeyD'] || activeKeys['ArrowRight']) {
        camera.position.x += panSpeed;
        controls.target.x += panSpeed;
        manualMove = true;
      }
      if (manualMove) cameraTransitionActive = false;

      if (cameraTransitionActive) {
        const dampFactor = 4.2;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _targetCameraPos.x,
          dampFactor,
          delta
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _targetCameraPos.y,
          dampFactor,
          delta
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _targetCameraPos.z,
          dampFactor,
          delta
        );

        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _targetLookAt.x,
          dampFactor,
          delta
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _targetLookAt.y,
          dampFactor,
          delta
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _targetLookAt.z,
          dampFactor,
          delta
        );

        if (camera.position.distanceToSquared(_targetCameraPos) < 0.25) {
          cameraTransitionActive = false;
        }
      } else if (currentProps.isWalkthroughActive && !isSoftwareGl && !manualMove) {
        // Gentle synchronized cinematic orbit around active tour stop while voice narration speaks
        const dx = camera.position.x - controls.target.x;
        const dz = camera.position.z - controls.target.z;
        const angle = 0.08 * delta;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        camera.position.x = controls.target.x + dx * cosA - dz * sinA;
        camera.position.z = controls.target.z + dx * sinA + dz * cosA;
      }

      controls.update();

      // Update 3D-to-2D Projected Campus Pins, London Rivers & Streams Pins, and Iconic London 3D Landmarks
      const viewW = renderer.domElement.clientWidth || window.innerWidth;
      const viewH = renderer.domElement.clientHeight || window.innerHeight;
      for (const geo of LONDON_UNIVERSITY_GEO_LOCATIONS) {
        const pinEl = pinElementsRef.current[geo.campusId];
        if (!pinEl) continue;
        const [hx, hz] = geo.londonWorldXZ;
        const hy =
          Math.max(
            currentProps.waterLevelY + 0.5,
            getTerrainElevation(hx, hz, currentProps.terrainPreset)
          ) + 24.5;
        _dummyPos.set(hx, hy, hz);
        _dummyPos.project(camera);

        if (
          _dummyPos.z > 1.0 ||
          _dummyPos.x < -1.08 ||
          _dummyPos.x > 1.08 ||
          _dummyPos.y < -1.08 ||
          _dummyPos.y > 1.08
        ) {
          pinEl.style.opacity = '0';
          pinEl.style.pointerEvents = 'none';
        } else {
          const sx = (_dummyPos.x * 0.5 + 0.5) * viewW;
          const sy = (-_dummyPos.y * 0.5 + 0.5) * viewH;
          pinEl.style.opacity = '1';
          pinEl.style.pointerEvents = 'auto';
          pinEl.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;
        }
      }

      // Project 3D Floating Badges for River Thames & All London Rivers, Canals, and Subterranean Lost Rivers
      for (const waterway of LONDON_RIVERS_AND_STREAMS_3D) {
        const rEl = riverPinElementsRef.current[waterway.id];
        if (!rEl) continue;
        if (!(currentProps.showRiversAndStreams ?? true)) {
          rEl.style.opacity = '0';
          rEl.style.pointerEvents = 'none';
          continue;
        }
        const [rx, rz] = waterway.labelXZ;
        const ry =
          Math.max(
            currentProps.waterLevelY + 0.5,
            getTerrainElevation(rx, rz, currentProps.terrainPreset)
          ) + (waterway.id === 'river-thames' ? 6.5 : 4.2);
        _dummyPos.set(rx, ry, rz);
        _dummyPos.project(camera);

        if (
          _dummyPos.z > 1.0 ||
          _dummyPos.x < -1.05 ||
          _dummyPos.x > 1.05 ||
          _dummyPos.y < -1.05 ||
          _dummyPos.y > 1.05
        ) {
          rEl.style.opacity = '0';
          rEl.style.pointerEvents = 'none';
        } else {
          const sx = (_dummyPos.x * 0.5 + 0.5) * viewW;
          const sy = (-_dummyPos.y * 0.5 + 0.5) * viewH;
          rEl.style.opacity =
            currentProps.focusedRiverId === waterway.id || waterway.id === 'river-thames'
              ? '1'
              : '0.92';
          rEl.style.pointerEvents = 'auto';
          rEl.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;
        }
      }

      for (const lm of LONDON_3D_ICONIC_LANDMARKS) {
        const lmEl = landmarkPinElementsRef.current[lm.id];
        if (!lmEl) continue;
        if (!currentProps.showLondonCityMap) {
          lmEl.style.opacity = '0';
          continue;
        }
        const [lx, lz] = lm.londonWorldXZ;
        const ly =
          Math.max(
            currentProps.waterLevelY + 0.5,
            getTerrainElevation(lx, lz, currentProps.terrainPreset)
          ) + 14.5;
        _dummyPos.set(lx, ly, lz);
        _dummyPos.project(camera);

        if (
          _dummyPos.z > 1.0 ||
          _dummyPos.x < -1.05 ||
          _dummyPos.x > 1.05 ||
          _dummyPos.y < -1.05 ||
          _dummyPos.y > 1.05
        ) {
          lmEl.style.opacity = '0';
        } else {
          const sx = (_dummyPos.x * 0.5 + 0.5) * viewW;
          const sy = (-_dummyPos.y * 0.5 + 0.5) * viewH;
          lmEl.style.opacity = '0.92';
          lmEl.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;
        }
      }

      // Project FindUCL-style Floating White Building Occupancy Pills above active campus buildings
      const [hubX, hubZ] = currentProps.activeCampusHubXZ || [10, -48];
      for (const b of currentProps.buildings) {
        const bEl = buildingPinElementsRef.current[b.id];
        if (!bEl) continue;
        if (currentProps.showLondonCityMap) {
          bEl.style.opacity = '0';
          bEl.style.pointerEvents = 'none';
          continue;
        }
        const distFromActiveHub = Math.hypot(b.position[0] - hubX, b.position[2] - hubZ);
        if (distFromActiveHub > 52) {
          bEl.style.opacity = '0';
          bEl.style.pointerEvents = 'none';
          continue;
        }
        const by =
          getTerrainElevation(b.position[0], b.position[2], currentProps.terrainPreset) +
          b.dimensions[1] +
          3.2;
        _dummyPos.set(b.position[0], by, b.position[2]);
        _dummyPos.project(camera);

        if (
          _dummyPos.z > 1.0 ||
          _dummyPos.x < -0.95 ||
          _dummyPos.x > 0.95 ||
          _dummyPos.y < -0.95 ||
          _dummyPos.y > 0.95
        ) {
          bEl.style.opacity = '0';
          bEl.style.pointerEvents = 'none';
        } else {
          const sx = (_dummyPos.x * 0.5 + 0.5) * viewW;
          const sy = (-_dummyPos.y * 0.5 + 0.5) * viewH;
          bEl.style.opacity = '1';
          bEl.style.pointerEvents = 'auto';
          bEl.style.transform = `translate3d(${Math.round(sx)}px, ${Math.round(sy)}px, 0) translate(-50%, -100%)`;
        }
      }

      const selectedBuilding =
        currentProps.buildings.find((b) => b.id === currentProps.selectedBuildingId) ||
        currentProps.buildings[0];

      if (selectedBuilding) {
        const [bx, , bz] = selectedBuilding.position;
        const groundY = getTerrainElevation(bx, bz, currentProps.terrainPreset);

        spatialAudio.updateSpatialListener(
          camera.position.x,
          camera.position.z,
          bx,
          bz,
          selectedBuilding.audioLandmarkFreq
        );

        radarGroup.visible = currentProps.showRadarPulse;
        radarGroup.position.set(bx, groundY + 0.48, bz);
        radarRings.forEach((ring, idx) => {
          const phase = (elapsed * 0.65 + idx * 0.33) % 1;
          const scale = 1.5 + phase * (selectedBuilding.dimensions[0] * 0.95);
          ring.scale.set(scale, scale, 1);
          const mat = ring.material as THREE.MeshBasicMaterial;
          mat.color.set(selectedBuilding.accentColor);
          mat.opacity = (1 - phase) * 0.75;
        });

        dustMotesGroup.visible = currentProps.showDustMotes;
        dustMotesGroup.position.set(bx, groundY, bz);
        const mPos = moteGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < moteCount; i++) {
          let my = mPos.getY(i) + delta * (0.6 + (i % 4) * 0.2);
          if (my > selectedBuilding.dimensions[1] + 4) my = 1.0;
          mPos.setY(i, my);
        }
        mPos.needsUpdate = true;
      }

      const activePaths = currentProps.pathways;
      flowPoints.visible = currentProps.showStudentFlow && activePaths.length > 0;
      if (currentProps.showStudentFlow && activePaths.length > 0) {
        const fPos = flowGeo.attributes.position as THREE.BufferAttribute;
        const pathCount = activePaths.length;
        for (let i = 0; i < flowParticleCount; i++) {
          const path = activePaths[i % pathCount];
          const pts = path.points;
          const t = (elapsed * 0.18 * path.flowIntensity + (i / flowParticleCount) * 3.7) % 1;
          const segCount = pts.length - 1;
          const segFloat = t * segCount;
          const segIdx = Math.min(segCount - 1, Math.floor(segFloat));
          const segT = segFloat - segIdx;

          const p0 = pts[segIdx];
          const p1 = pts[segIdx + 1];
          const px = p0[0] + (p1[0] - p0[0]) * segT + Math.sin(i + elapsed * 2) * 0.35;
          const pz = p0[2] + (p1[2] - p0[2]) * segT + Math.cos(i + elapsed * 2) * 0.35;
          const groundH = Math.max(
            currentProps.waterLevelY + 0.45,
            getTerrainElevation(px, pz, currentProps.terrainPreset)
          );
          const py = groundH + 0.55 + Math.abs(Math.sin(elapsed * 3 + i)) * 0.35;
          fPos.setXYZ(i, px, py, pz);
        }
        fPos.needsUpdate = true;
      }

      monumentHalo.rotation.z = elapsed * 0.5;
      buildingsRoot.children.forEach((bGroup) => {
        const beacon = bGroup.children[bGroup.children.length - 1];
        if (beacon && beacon.userData?.isBeacon) {
          beacon.rotation.y = elapsed * 1.2;
        }
      });

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    // Register Multi-Angle 3D Photo Studio Burst Capture (Captures 3 to 5 high-res 3D screenshots at once)
    const captureBatch3DPhotos = (options: {
      vantage: Scenic3DVantagePoint;
      count: number;
      includeLightingCycle: boolean;
    }): Captured3DPhoto[] => {
      const clampedCount = Math.max(3, Math.min(5, Math.round(options.count)));
      const currentProps = propsRef.current;
      const { vantage, includeLightingCycle } = options;

      // Determine center 3D focus point & orbit radius
      let tx = vantage.targetXZ[0];
      let tz = vantage.targetXZ[1];
      let ty =
        getTerrainElevation(tx, tz, currentProps.terrainPreset) + vantage.targetYOffset;
      let baseRadius = vantage.baseRadius;
      let baseHeight = vantage.baseHeight;
      let startYaw = 0.25;

      if (vantage.id === 'vantage-current') {
        tx = controls.target.x;
        ty = controls.target.y;
        tz = controls.target.z;
        const dx = camera.position.x - tx;
        const dz = camera.position.z - tz;
        baseRadius = Math.max(28, Math.min(145, Math.hypot(dx, dz)));
        baseHeight = Math.max(16, Math.min(110, camera.position.y - ty));
        startYaw = Math.atan2(dx, dz);
      }

      const angleConfigs = [
        {
          label: 'Front Hero Architectural View',
          yawOffset: 0.0,
          radiusMult: 1.05,
          heightMult: 0.96,
          cycleHour: 13.5,
        },
        {
          label: '45° Isometric Quad & Roofline Orbit',
          yawOffset: 0.78,
          radiusMult: 1.15,
          heightMult: 1.22,
          cycleHour: 17.75,
        },
        {
          label: 'Nocturnal Architectural Perspective',
          yawOffset: -0.58,
          radiusMult: 1.12,
          heightMult: 0.88,
          cycleHour: 22.5,
        },
        {
          label: 'High Drone Topographic Overview',
          yawOffset: 1.52,
          radiusMult: 1.36,
          heightMult: 1.68,
          cycleHour: 15.25,
        },
        {
          label: 'Reverse Skyline & River Horizon',
          yawOffset: -1.55,
          radiusMult: 1.22,
          heightMult: 1.18,
          cycleHour: 18.25,
        },
      ];

      const savedCamPos = camera.position.clone();
      const savedTarget = controls.target.clone();
      const captured: Captured3DPhoto[] = [];

      const srcW = renderer.domElement.width || 1280;
      const srcH = renderer.domElement.height || 720;
      const outCanvas = document.createElement('canvas');
      outCanvas.width = srcW;
      outCanvas.height = srcH;
      const ctx = outCanvas.getContext('2d');

      for (let i = 0; i < clampedCount; i++) {
        const cfg = angleConfigs[i % angleConfigs.length];
        const shotHour = includeLightingCycle ? cfg.cycleHour : currentProps.solarHour;
        const shotSun = calculateSunState(shotHour);

        // Apply shot lighting with dedicated sceneBgColor
        sunLight.position.set(...shotSun.sunPosition);
        sunLight.intensity = shotSun.sunIntensity;
        sunLight.color.set(shotSun.sunColorHex);
        hemiLight.color.set(shotSun.hemiSkyHex);
        hemiLight.groundColor.set(shotSun.hemiGroundHex);
        hemiLight.intensity = shotSun.hemiIntensity;
        renderer.toneMappingExposure = shotSun.isNight
          ? 0.68
          : shotSun.isGoldenHour
            ? 0.76
            : 0.82;
        lampBulbMat.emissiveIntensity = shotSun.isNight
          ? 1.15
          : shotSun.isGoldenHour
            ? 0.55
            : 0.02;
        buildingsRoot.children.forEach((bGroup) => {
          const hullMesh = bGroup.children[2] as THREE.Mesh | undefined;
          if (hullMesh && hullMesh.material instanceof THREE.MeshStandardMaterial) {
            hullMesh.material.emissiveIntensity =
              (currentProps.showBloomAndFog ? currentProps.bloomIntensity * 0.45 : 0.18) *
              shotSun.windowGlowIntensity;
          }
        });
        sceneBgColor.set(shotSun.fogColorHex);
        scene.background = sceneBgColor;
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(sceneBgColor);
          scene.fog.density = currentProps.showBloomAndFog ? shotSun.fogDensity : 0.0004;
        }

        const yaw = startYaw + cfg.yawOffset;
        const r = baseRadius * cfg.radiusMult;
        const cx = Number((tx + Math.sin(yaw) * r).toFixed(1));
        const cz = Number((tz + Math.cos(yaw) * r).toFixed(1));
        const minGroundY =
          getTerrainElevation(cx, cz, currentProps.terrainPreset) + 4.5;
        const cy = Number(Math.max(minGroundY, ty + baseHeight * cfg.heightMult).toFixed(1));

        camera.position.set(cx, cy, cz);
        controls.target.set(tx, ty, tz);
        camera.lookAt(tx, ty, tz);
        camera.updateMatrixWorld();

        renderer.render(scene, camera);

        let dataUrl = '';
        if (ctx) {
          ctx.clearRect(0, 0, srcW, srcH);
          ctx.drawImage(renderer.domElement, 0, 0, srcW, srcH);

          // Draw clean architectural metadata footer bar on the captured photo
          const barH = Math.max(38, Math.round(srcH * 0.065));
          ctx.fillStyle = 'rgba(7, 10, 16, 0.84)';
          ctx.fillRect(0, srcH - barH, srcW, barH);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(0, srcH - barH, srcW, 2);

          const fontSizeTitle = Math.max(12, Math.round(barH * 0.36));
          const fontSizeSub = Math.max(10, Math.round(barH * 0.28));
          ctx.font = `bold ${fontSizeTitle}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(
            `${vantage.title} — Shot ${i + 1}/${clampedCount}: ${cfg.label}`,
            16,
            srcH - barH + Math.round(barH * 0.46)
          );

          ctx.font = `${fontSizeSub}px JetBrains Mono, monospace`;
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(
            `${shotSun.phaseLabel} (${shotHour.toFixed(2)}h) · 3D Camera XYZ [${cx}, ${cy}, ${cz}] · Target [${tx.toFixed(1)}, ${ty.toFixed(1)}, ${tz.toFixed(1)}]`,
            16,
            srcH - barH + Math.round(barH * 0.82)
          );

          dataUrl = outCanvas.toDataURL('image/png');
        } else {
          dataUrl = renderer.domElement.toDataURL('image/png');
        }

        const safeSlug = vantage.id.replace(/[^a-z0-9-_]/gi, '_');
        captured.push({
          id: `photo-${Date.now()}-${i + 1}`,
          vantageId: vantage.id,
          vantageTitle: vantage.title,
          shotNumber: i + 1,
          totalInBatch: clampedCount,
          angleLabel: cfg.label,
          lightingLabel: shotSun.phaseLabel,
          solarHour: shotHour,
          cameraCoords: [cx, cy, cz],
          targetCoords: [
            Number(tx.toFixed(1)),
            Number(ty.toFixed(1)),
            Number(tz.toFixed(1)),
          ],
          dataUrl,
          filename: `London3D_${safeSlug}_Shot${i + 1}of${clampedCount}.png`,
          selected: true,
          capturedAt: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        });
      }

      // Restore active solarHour lighting and transition camera to the selected vantage hero angle
      const activeSun = calculateSunState(currentProps.solarHour);
      sunLight.position.set(...activeSun.sunPosition);
      sunLight.intensity = activeSun.sunIntensity;
      sunLight.color.set(activeSun.sunColorHex);
      hemiLight.color.set(activeSun.hemiSkyHex);
      hemiLight.groundColor.set(activeSun.hemiGroundHex);
      hemiLight.intensity = activeSun.hemiIntensity;
      renderer.toneMappingExposure = activeSun.isNight
        ? 0.68
        : activeSun.isGoldenHour
          ? 0.76
          : 0.82;
      sceneBgColor.set(activeSun.fogColorHex);
      scene.background = sceneBgColor;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(sceneBgColor);
        scene.fog.density = currentProps.showBloomAndFog ? activeSun.fogDensity : 0.0004;
      }

      if (vantage.id === 'vantage-current') {
        camera.position.copy(savedCamPos);
        controls.target.copy(savedTarget);
        controls.update();
      } else {
        const heroCfg = angleConfigs[0];
        const heroYaw = startYaw + heroCfg.yawOffset;
        const hr = baseRadius * heroCfg.radiusMult;
        _targetCameraPos.set(
          tx + Math.sin(heroYaw) * hr,
          ty + baseHeight * heroCfg.heightMult,
          tz + Math.cos(heroYaw) * hr
        );
        _targetLookAt.set(tx, ty, tz);
        cameraTransitionActive = !isSoftwareGl;
        if (isSoftwareGl) {
          camera.position.copy(_targetCameraPos);
          controls.target.copy(_targetLookAt);
          controls.update();
        }
      }

      renderer.render(scene, camera);

      return captured;
    };

    propsRef.current.onRegisterPhotoCapture?.(captureBatch3DPhotos);

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-0 bg-[#070a10]">
      <div
        ref={canvasMountRef}
        className="w-full h-full"
        aria-label="Interactive 3D Campus Digital Twin Viewport"
      />

      {/* 7 Real-Time 3D-Projected Floating Campus Pins + Building Occupancy Pills + 8 AccuCities/Apple Maps 3D London Landmarks */}
      <div
        className="fixed inset-0 pointer-events-none z-[5] overflow-hidden"
        aria-label="London 3D Campus Location Pins"
      >
        {/* FindUCL-Style Floating White Building Occupancy Pills (`Main Library (Wilkins) 63%`) */}
        {buildings.map((b) => {
          const isSelected = b.id === selectedBuildingId;
          const metrics = getBuildingAggregateMetrics(b);
          const occPct = Number.isFinite(metrics.occupancyPct)
            ? metrics.occupancyPct
            : Math.round((metrics.occupancyRatio || 0) * 100);
          const dotColor =
            occPct < 45 ? '#22c55e' : occPct <= 70 ? '#f59e0b' : '#ea580c';
          const cleanTitle = b.name.split('(')[0].trim();

          return (
            <button
              key={b.id}
              ref={(el) => {
                buildingPinElementsRef.current[b.id] = el;
              }}
              type="button"
              data-testid={`building-pill-${b.id}`}
              onClick={() => onSelectBuilding(b.id)}
              style={{
                left: 0,
                top: 0,
                opacity: 0,
              }}
              className={`absolute transition-opacity duration-150 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${
                isSelected
                  ? 'bg-white text-slate-950 border-2 border-indigo-600 ring-2 ring-indigo-500/30 z-10'
                  : 'bg-white/95 text-slate-900 border border-slate-300 hover:border-indigo-500'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: dotColor }}
              />
              <span className="font-bold">{cleanTitle}</span>
              <span className="text-slate-500 font-mono-tabular">{occPct}%</span>
            </button>
          );
        })}

        {LONDON_3D_ICONIC_LANDMARKS.map((lm) => (
          <div
            key={lm.id}
            ref={(el) => {
              landmarkPinElementsRef.current[lm.id] = el;
            }}
            data-testid={`london-landmark-pin-${lm.id}`}
            style={{
              left: 0,
              top: 0,
              opacity: 0,
            }}
            className="absolute transition-opacity duration-150 px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-600/70 text-[10px] font-medium text-slate-200 whitespace-nowrap shadow-md"
          >
            <span className="text-amber-300 font-semibold">★ {lm.shortLabel}</span>{' '}
            <span className="text-slate-400 font-mono-tabular">({lm.accucitiesTileId})</span>
          </div>
        ))}

        {/* Interactive 3D-Projected Badges for River Thames & All 11 Other London Rivers, Canals & Subterranean Streams */}
        {LONDON_RIVERS_AND_STREAMS_3D.map((waterway) => {
          const isFocused = focusedRiverId === waterway.id;
          const isThames = waterway.id === 'river-thames';
          return (
            <button
              key={waterway.id}
              ref={(el) => {
                riverPinElementsRef.current[waterway.id] = el;
              }}
              type="button"
              data-testid={`london-river-pin-${waterway.id}`}
              onClick={() => onSelectRiver?.(waterway.id)}
              style={{
                left: 0,
                top: 0,
                opacity: 0,
              }}
              className={`absolute transition-opacity duration-150 px-2 py-0.5 rounded-md border shadow-lg backdrop-blur-md text-left flex items-center gap-1.5 whitespace-nowrap ${
                isFocused
                  ? 'bg-sky-950/95 border-cyan-300 text-white ring-2 ring-cyan-400/50 z-20'
                  : isThames
                    ? 'bg-sky-950/90 border-sky-400/80 text-sky-100 hover:border-cyan-300 z-10'
                    : waterway.type === 'subterranean-stream'
                      ? 'bg-slate-950/85 border-cyan-500/50 text-cyan-200 hover:border-cyan-300'
                      : 'bg-slate-950/85 border-teal-500/60 text-teal-100 hover:border-teal-300'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: waterway.colorHex }}
              />
              <div>
                <div className="text-[10px] font-bold leading-tight">
                  {waterway.shortLabel}
                </div>
                <div className="text-[8px] font-mono-tabular text-slate-300 leading-tight">
                  {waterway.statusLabel} · {waterway.realLengthKm} km
                </div>
              </div>
            </button>
          );
        })}

        {LONDON_UNIVERSITY_GEO_LOCATIONS.map((geo) => {
          const isCurrentCampus = geo.campusId === activeCampusId;
          return (
            <button
              key={geo.campusId}
              ref={(el) => {
                pinElementsRef.current[geo.campusId] = el;
              }}
              type="button"
              data-testid={`london-map-pin-${geo.campusId}`}
              onClick={() =>
                onSelectUniversityFromCityMap?.(geo.universityId, geo.campusId)
              }
              style={{
                left: 0,
                top: 0,
                opacity: 0,
              }}
              className={`absolute transition-opacity duration-150 px-2.5 py-1 rounded-lg border shadow-xl backdrop-blur-md text-left flex items-center gap-1.5 whitespace-nowrap ${
                isCurrentCampus
                  ? 'bg-slate-950/95 border-sky-400 text-white ring-2 ring-sky-400/40'
                  : 'bg-slate-950/85 border-slate-700/90 text-slate-200 hover:border-sky-400 hover:text-white'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: geo.accentColor }}
              />
              <div>
                <div className="text-[11px] font-bold leading-tight">{geo.shortName}</div>
                <div className="text-[9px] font-mono-tabular text-slate-400 leading-tight">
                  {geo.postcode} · [{geo.londonWorldXZ[0]}, {geo.londonWorldXZ[1]}]
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
