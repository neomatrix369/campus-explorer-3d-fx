import * as THREE from 'three';
import { FacadeMaterialStyle } from '../data/campusData';

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
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
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
