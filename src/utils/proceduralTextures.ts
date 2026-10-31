import * as THREE from 'three';
import { FacadeMaterialStyle } from '../data/campusData';

const facadeTextureCache = new Map<string, THREE.CanvasTexture>();
const satelliteTextureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Generates an authentic architectural facade texture tailored to each London university
 * building style (Neoclassical Portland stone, Victorian red-brick & terracotta,
 * modern curtain-wall glass, Grafton diagrid stone, or Saw Swee Hock beehive brick).
 */
export function createWindowFacadeTexture(
  renderer: THREE.WebGLRenderer,
  accentHex: string,
  isNight: boolean,
  facadeStyle: FacadeMaterialStyle = 'portland-stone'
): THREE.CanvasTexture {
  const cacheKey = `${accentHex}_${isNight ? 'night' : 'day'}_${facadeStyle}`;
  const cached = facadeTextureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base architectural wall material from London photo references
  if (facadeStyle === 'red-brick-terracotta' || facadeStyle === 'beehive-red-brick') {
    ctx.fillStyle = isNight ? '#4a1d1a' : '#7f2f29';
  } else if (facadeStyle === 'modern-curtain-glass') {
    ctx.fillStyle = isNight ? '#0f172a' : '#1e293b';
  } else if (facadeStyle === 'diagrid-stone') {
    ctx.fillStyle = isNight ? '#334155' : '#64748b';
  } else {
    // 'portland-stone' (Wilkins Building, Bush House, King's Building, Senate House)
    ctx.fillStyle = isNight ? '#475569' : '#cbd5e1';
  }
  ctx.fillRect(0, 0, 256, 256);

  // Subtle ashlar stone / brick coursework lines
  ctx.strokeStyle =
    facadeStyle === 'portland-stone'
      ? 'rgba(71, 85, 105, 0.35)'
      : 'rgba(15, 23, 42, 0.35)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Diagrid structural braces for Marshall Building / modern hubs
  if (facadeStyle === 'diagrid-stone') {
    ctx.strokeStyle = isNight ? '#94a3b8' : '#e2e8f0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(256, 256);
    ctx.moveTo(256, 0);
    ctx.lineTo(0, 256);
    ctx.stroke();
  }

  // Window grid
  const cols = facadeStyle === 'beehive-red-brick' ? 6 : 4;
  const rows = 4;
  const pad = facadeStyle === 'modern-curtain-glass' ? 6 : 11;
  const cellW = 256 / cols;
  const cellH = 256 / rows;

  ctx.strokeStyle = facadeStyle === 'portland-stone' ? '#64748b' : '#334155';
  ctx.lineWidth = 3;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (facadeStyle === 'beehive-red-brick' && (r + c) % 2 === 1) {
        continue; // Porous brick lattice pattern like Saw Swee Hock (SAW)
      }
      const seed = (r * 7 + c * 13) % 10;
      const lit = isNight ? seed < 7 : seed < 4;
      if (lit) {
        const grad = ctx.createLinearGradient(
          c * cellW,
          r * cellH,
          c * cellW,
          (r + 1) * cellH
        );
        grad.addColorStop(0, accentHex);
        grad.addColorStop(1, isNight ? '#fef08a' : '#e0f2fe');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = isNight ? '#0f172a' : '#1e293b';
      }
      ctx.fillRect(
        c * cellW + pad,
        r * cellH + pad,
        cellW - pad * 2,
        cellH - pad * 2
      );
      ctx.strokeRect(
        c * cellW + pad,
        r * cellH + pad,
        cellW - pad * 2,
        cellH - pad * 2
      );
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  facadeTextureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates realistic organic parkland turf, soil, and stone grain textures WITHOUT artificial grid lines,
 * so the outdoor landscape looks like real London garden squares and river embankments.
 */
export function createPlazaGroundTextures(renderer: THREE.WebGLRenderer): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // High-value neutral organic base so vertex biome colors (parkland lawn, Yorkstone terrace, embankment stone) multiply cleanly
  ctx.fillStyle = '#e5ece6';
  ctx.fillRect(0, 0, 512, 512);

  // Soft mottled botanical grass patches & organic earth variation
  for (let i = 0; i < 420; i++) {
    const cx = (i * 97) % 512;
    const cy = (i * 151) % 512;
    const radius = 10 + (i % 18);
    const tone = 212 + ((i * 17) % 34);
    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, radius);
    grad.addColorStop(0, `rgba(${tone - 8}, ${tone + 6}, ${tone - 10}, 0.35)`);
    grad.addColorStop(1, 'rgba(229, 236, 230, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine blades / turf & pebble grain
  for (let i = 0; i < 9000; i++) {
    const x = (i * 73) % 512;
    const y = (i * 137 + Math.floor(i / 512) * 29) % 512;
    const shade = 200 + ((i * 19) % 48);
    ctx.fillStyle = `rgb(${shade - 6}, ${shade + 4}, ${shade - 8})`;
    ctx.fillRect(x, y, 2, 3);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(24, 24);
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Grayscale organic turf & stone relief bump map (linear NoColorSpace)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4800; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    const v = 85 + ((i * 31) % 90);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(x, y, 2, 2);
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(28, 28);
  bumpMap.anisotropy = renderer.capabilities.getMaxAnisotropy();

  return { map, bumpMap };
}

/**
 * Generates an organic dappled leaf-cluster texture and bump map for realistic London Plane & Oak tree canopies.
 */
export function createFoliageCanopyTexture(renderer: THREE.WebGLRenderer): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#d8f3dc';
  ctx.fillRect(0, 0, 256, 256);

  // Overlapping leaf clusters with sunlit highlights and deep canopy shadows
  for (let i = 0; i < 1400; i++) {
    const x = (i * 47) % 256;
    const y = (i * 89) % 256;
    const r = 3 + (i % 6);
    const isHighlight = i % 3 === 0;
    ctx.fillStyle = isHighlight
      ? 'rgba(240, 253, 244, 0.55)'
      : i % 3 === 1
        ? 'rgba(187, 247, 208, 0.5)'
        : 'rgba(134, 239, 172, 0.45)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 3);
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 128;
  bumpCanvas.height = 128;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const x = (i * 37) % 128;
    const y = (i * 71) % 128;
    const v = 60 + ((i * 43) % 135);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.beginPath();
    bCtx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
    bCtx.fill();
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 4);

  return { map, bumpMap };
}

/**
 * Generates a soft radial contact shadow texture so buildings and trees sit grounded.
 */
export function createSoftRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.32)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates a soft glowing circular particle sprite texture for student flow & dust motes.
 */
export function createGlowingParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.35, 'rgba(186, 230, 253, 0.75)');
  grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export type GroundMapRealismStyle = 'architectural' | 'satellite' | 'hybrid' | 'earth-3d';

/**
 * Generates a high-resolution aerial Satellite or Hybrid (Satellite + Vector Street/Tube Labels)
 * ground texture mapped across the 340x340 London 3D terrain plane so real-world objects,
 * garden squares (Gordon Sq, Tavistock Sq, Russell Sq), arterial streets, and the River Thames
 * look grounded in satellite earth observation.
 */
export function createSatelliteHybridGroundTexture(
  renderer: THREE.WebGLRenderer,
  style: GroundMapRealismStyle
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep aerial urban London slate/earth base
  ctx.fillStyle = '#2d3830';
  ctx.fillRect(0, 0, 1024, 1024);

  // 2. Aerial mottled urban block & garden canopy patches
  for (let i = 0; i < 650; i++) {
    const x = (i * 173) % 1024;
    const y = (i * 257) % 1024;
    const r = 16 + (i % 38);
    const isPark = i % 3 !== 0;
    const grad = ctx.createRadialGradient(x, y, 2, x, y, r);
    if (isPark) {
      grad.addColorStop(0, 'rgba(54, 92, 56, 0.55)');
      grad.addColorStop(1, 'rgba(45, 56, 48, 0)');
    } else {
      grad.addColorStop(0, 'rgba(72, 78, 84, 0.45)');
      grad.addColorStop(1, 'rgba(45, 56, 48, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Bloomsbury & London Historic Garden Squares (Gordon Sq, Tavistock Sq, Russell Sq, Lincoln's Inn Fields, Hyde Park)
  const gardenSquares = [
    { name: 'Gordon Square', x: 520, y: 365, w: 86, h: 86 },
    { name: 'Tavistock Square', x: 565, y: 295, w: 82, h: 82 },
    { name: 'Russell Square', x: 585, y: 425, w: 112, h: 112 },
    { name: "Lincoln's Inn Fields", x: 645, y: 505, w: 108, h: 88 },
    { name: "Regent's Park", x: 380, y: 240, w: 165, h: 135 },
    { name: 'Hyde Park & Kensington Gdns', x: 210, y: 555, w: 195, h: 145 },
  ];

  gardenSquares.forEach((sq) => {
    ctx.fillStyle = '#2f5e35';
    ctx.fillRect(sq.x - sq.w / 2, sq.y - sq.h / 2, sq.w, sq.h);
    ctx.strokeStyle = '#84a98c';
    ctx.lineWidth = 2;
    ctx.strokeRect(sq.x - sq.w / 2 + 4, sq.y - sq.h / 2 + 4, sq.w - 8, sq.h - 8);
    // Diagonal gravel garden paths visible in satellite view
    ctx.strokeStyle = 'rgba(214, 211, 209, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sq.x - sq.w / 2 + 6, sq.y - sq.h / 2 + 6);
    ctx.lineTo(sq.x + sq.w / 2 - 6, sq.y + sq.h / 2 - 6);
    ctx.moveTo(sq.x + sq.w / 2 - 6, sq.y - sq.h / 2 + 6);
    ctx.lineTo(sq.x - sq.w / 2 + 6, sq.y + sq.h / 2 - 6);
    ctx.stroke();
  });

  // 4. Arterial London Road Grid (Gower St, Euston Rd, Tottenham Court Rd, Strand, Victoria Embankment, Exhibition Rd)
  const arterialCorridors = [
    { x1: 470, y1: 120, x2: 510, y2: 680, width: 12, label: 'Gower St / Bloomsbury' },
    { x1: 160, y1: 270, x2: 880, y2: 240, width: 15, label: 'Euston Rd (A501)' },
    { x1: 425, y1: 390, x2: 710, y2: 390, width: 10, label: 'Torrington Pl / Malet Pl' },
    { x1: 450, y1: 595, x2: 740, y2: 545, width: 13, label: 'The Strand / Aldwych' },
    { x1: 245, y1: 500, x2: 245, y2: 790, width: 12, label: 'Exhibition Rd (South Ken)' },
  ];

  arterialCorridors.forEach((rd) => {
    ctx.strokeStyle = style === 'hybrid' ? '#475569' : '#334155';
    ctx.lineWidth = rd.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rd.x1, rd.y1);
    ctx.lineTo(rd.x2, rd.y2);
    ctx.stroke();

    if (style === 'hybrid') {
      // Google Hybrid yellow/white casing highlight
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rd.x1, rd.y1);
      ctx.lineTo(rd.x2, rd.y2);
      ctx.stroke();
    }
  });

  // 5. Hybrid Mode Vector Labels (Streets, Squares & London Underground Station Roundels)
  if (style === 'hybrid') {
    ctx.font = 'bold 15px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';

    gardenSquares.forEach((sq) => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.fillRect(sq.x - 62, sq.y - 10, 124, 20);
      ctx.fillStyle = '#86efac';
      ctx.fillText(sq.name, sq.x, sq.y + 5);
    });

    const tubeStations = [
      { name: 'Euston Square  Underground', x: 482, y: 288 },
      { name: 'Russell Square Station', x: 600, y: 405 },
      { name: 'Holborn / LSE', x: 635, y: 495 },
      { name: 'Temple / Strand (KCL)', x: 635, y: 585 },
      { name: 'South Kensington (Imperial)', x: 255, y: 705 },
      { name: 'Stratford (UCL East)', x: 865, y: 315 },
    ];

    tubeStations.forEach((st) => {
      // Iconic red-and-blue Underground roundel + high-contrast Hybrid pill
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(st.x - 86, st.y - 12, 172, 24);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(st.x - 86, st.y - 12, 172, 24);

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(st.x - 72, st.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(st.x - 79, st.y - 2, 14, 4);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillText(st.name, st.x + 8, st.y + 4);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

