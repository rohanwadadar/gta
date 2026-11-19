import * as THREE from 'three';
import { DistrictStyle } from './mapGenerator';

export type SkyMode = 'sunrise' | 'day' | 'sunset' | 'night';

// Deterministic lightweight noise helper for procedural PBR maps
function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function createSkyDomeTexture(mode: SkyMode, overcast = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);

  if (overcast && mode !== 'night') {
    grad.addColorStop(0.0, '#334155');
    grad.addColorStop(0.32, '#475569');
    grad.addColorStop(0.58, '#64748b');
    grad.addColorStop(0.74, '#94a3b8');
    grad.addColorStop(1.0, '#64748b');
  } else if (mode === 'sunrise') {
    grad.addColorStop(0.0, '#1e3a5f');
    grad.addColorStop(0.28, '#5b6d92');
    grad.addColorStop(0.48, '#e8997b');
    grad.addColorStop(0.60, '#fbd1a2');
    grad.addColorStop(0.75, '#f6e3ba');
    grad.addColorStop(1.0, '#c2a684');
  } else if (mode === 'sunset') {
    grad.addColorStop(0.0, '#172554');
    grad.addColorStop(0.25, '#4c3575');
    grad.addColorStop(0.46, '#c95c66');
    grad.addColorStop(0.58, '#ee964b');
    grad.addColorStop(0.72, '#f4c983');
    grad.addColorStop(1.0, '#b9936c');
  } else if (mode === 'day') {
    grad.addColorStop(0.0, '#0369a1');
    grad.addColorStop(0.32, '#38bdf8');
    grad.addColorStop(0.56, '#bae6fd');
    grad.addColorStop(0.72, '#e2eef7');
    grad.addColorStop(1.0, '#cbd5e1');
  } else {
    grad.addColorStop(0.0, '#020617');
    grad.addColorStop(0.32, '#0f172a');
    grad.addColorStop(0.56, '#1e293b');
    grad.addColorStop(0.74, '#334155');
    grad.addColorStop(1.0, '#0f172a');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  if (mode === 'night' && !overcast) {
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < 48; i++) {
      ctx.globalAlpha = 0.35 + hash2d(i, 9) * 0.65;
      ctx.fillRect(hash2d(i, 1) * 64, hash2d(i, 2) * 116, 1.3, 1.3);
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRoadTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Semi-realistic dark weathered asphalt
  ctx.fillStyle = '#25272b';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4800; i++) {
    const x = hash2d(i, 11) * 512;
    const y = hash2d(i, 17) * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle tire wear lanes
  ctx.fillStyle = 'rgba(12,13,16,0.22)';
  ctx.fillRect(72, 0, 54, 512);
  ctx.fillRect(154, 0, 54, 512);
  ctx.fillRect(304, 0, 54, 512);
  ctx.fillRect(386, 0, 54, 512);

  // Subtle weathered hairline cracks & drain grate
  ctx.strokeStyle = 'rgba(10,10,12,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(45, 90);
  ctx.lineTo(68, 125);
  ctx.lineTo(58, 165);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(90,94,104,0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(140, 210, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Double amber median line + white lane dashes + shoulder edges
  ctx.fillStyle = '#eab308';
  ctx.fillRect(247, 0, 6, 512);
  ctx.fillRect(259, 0, 6, 512);

  ctx.fillStyle = 'rgba(241,245,249,0.72)';
  for (let y = 18; y < 512; y += 128) {
    ctx.fillRect(132, y, 6, 62);
    ctx.fillRect(374, y, 6, 62);
  }

  // Solid edge shoulder lines
  ctx.fillStyle = 'rgba(248,250,252,0.8)';
  ctx.fillRect(14, 0, 7, 512);
  ctx.fillRect(491, 0, 7, 512);

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  // Linear bump & roughness maps
  const bc = document.createElement('canvas');
  bc.width = 256;
  bc.height = 256;
  const bctx = bc.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);

  const rc = document.createElement('canvas');
  rc.width = 256;
  rc.height = 256;
  const rctx = rc.getContext('2d')!;
  rctx.fillStyle = '#d4d4d4';
  rctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4200; i++) {
    const x = hash2d(i, 23) * 256;
    const y = hash2d(i, 29) * 256;
    const v = 86 + Math.floor(hash2d(i, 31) * 86);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, 2, 2);

    const rv = 175 + Math.floor(hash2d(i, 37) * 65);
    rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
    rctx.fillRect(x, y, 3, 3);
  }
  // Tire track roughness polish
  rctx.fillStyle = 'rgba(130,130,130,0.45)';
  rctx.fillRect(38, 0, 26, 256);
  rctx.fillRect(190, 0, 26, 256);

  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = maxAnisotropy;

  const roughness = new THREE.CanvasTexture(rc);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.anisotropy = maxAnisotropy;

  return { map, bump, roughness };
}

export function createIntersectionCrosswalkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#25272b';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(hash2d(i, 5) * 256, hash2d(i, 7) * 256, 2, 2);
  }

  // Crisp zebra crosswalk bars on all 4 sides of intersection box
  ctx.fillStyle = 'rgba(241,245,249,0.86)';
  for (let i = 28; i <= 216; i += 24) {
    ctx.fillRect(i, 6, 12, 28); // North
    ctx.fillRect(i, 222, 12, 28); // South
    ctx.fillRect(6, i, 28, 12); // West
    ctx.fillRect(222, i, 28, 12); // East
  }
  // Stop lines
  ctx.fillRect(26, 38, 96, 5);
  ctx.fillRect(134, 213, 96, 5);
  ctx.fillRect(38, 134, 5, 96);
  ctx.fillRect(213, 26, 5, 96);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSidewalkTexture(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b4ada3';
  ctx.fillRect(0, 0, 256, 256);

  // Interlocking concrete sidewalk pavers
  const step = 32;
  ctx.strokeStyle = 'rgba(65,60,54,0.35)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += step) {
    const offset = (y / step) % 2 === 0 ? 0 : step / 2;
    for (let x = -step; x < 256; x += step) {
      const shade = 168 + Math.floor(hash2d(x, y) * 18);
      ctx.fillStyle = `rgb(${shade}, ${shade - 4}, ${shade - 10})`;
      ctx.fillRect(x + offset + 1, y + 1, step - 2, step - 2);
      ctx.strokeRect(x + offset, y, step, step);
    }
  }

  // Painted black & yellow kerb edge hint along top/bottom
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = (x / 32) % 2 === 0 ? '#eab308' : '#1e293b';
    ctx.fillRect(x, 0, 32, 8);
    ctx.fillRect(x, 248, 32, 8);
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const bc = document.createElement('canvas');
  bc.width = 256;
  bc.height = 256;
  const bctx = bc.getContext('2d')!;
  bctx.fillStyle = '#b0b0b0';
  bctx.fillRect(0, 0, 256, 256);
  bctx.strokeStyle = '#555555';
  bctx.lineWidth = 2;
  for (let y = 0; y < 256; y += step) {
    const offset = (y / step) % 2 === 0 ? 0 : step / 2;
    for (let x = -step; x < 256; x += step) {
      bctx.strokeRect(x + offset, y, step, step);
    }
  }
  const bump = new THREE.CanvasTexture(bc);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = maxAnisotropy;

  return { map, bump };
}

export function createGroundTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8b836b'; // natural sun-baked Indian soil & concrete earth base
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1600; i++) {
    const x = hash2d(i, 41) * 256;
    const y = hash2d(i, 43) * 256;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(110,120,82,0.14)' : i % 2 === 0 ? 'rgba(255,244,224,0.06)' : 'rgba(65,52,38,0.1)';
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + hash2d(i, 47) * 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(74, 74);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGrassTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3f6234'; // grounded natural olive-green grass
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2400; i++) {
    const x = hash2d(i, 61) * 256;
    const y = hash2d(i, 67) * 256;
    ctx.fillStyle = i % 3 === 0 ? '#4d733f' : i % 2 === 0 ? '#324f29' : '#587846';
    ctx.fillRect(x, y, 2, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createParkingLotTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#2d3036';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(hash2d(i, 81) * 256, hash2d(i, 82) * 256, 2, 2);
  }

  ctx.fillStyle = 'rgba(248,250,252,0.75)';
  for (let x = 24; x <= 232; x += 44) {
    ctx.fillRect(x, 14, 4, 72);
    ctx.fillRect(x, 170, 4, 72);
  }
  ctx.fillRect(24, 126, 208, 4);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPuddleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 12, 64, 64, 58);
  grad.addColorStop(0.0, 'rgba(180,205,225,0.88)');
  grad.addColorStop(0.62, 'rgba(130,158,182,0.62)');
  grad.addColorStop(1.0, 'rgba(100,120,140,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(64, 64, 56, 44, 0.3, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBarkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#4e3928';
  ctx.fillRect(0, 0, 128, 256);

  for (let i = 0; i < 160; i++) {
    const x = hash2d(i, 91) * 128;
    const y = hash2d(i, 93) * 256;
    const h = 16 + hash2d(i, 95) * 44;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(30,20,12,0.45)' : 'rgba(110,84,60,0.28)';
    ctx.fillRect(x, y, 3, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createLeafClusterTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Draw dense organic overlapping leaf blades with dark interior depth
  for (let i = 0; i < 88; i++) {
    const ang = hash2d(i, 101) * Math.PI * 2;
    const dist = Math.sqrt(hash2d(i, 103)) * 96;
    const lx = 128 + Math.cos(ang) * dist;
    const ly = 128 + Math.sin(ang) * dist;
    const r = 14 + hash2d(i, 105) * 18;
    const shade = dist < 48 ? '#23421f' : i % 3 === 0 ? '#3a6b2e' : i % 2 === 0 ? '#2f5925' : '#4a7c3a';
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(lx, ly, r, r * 0.58, ang + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

const clothCache = new Map<string, THREE.CanvasTexture>();

export function createClothTexture(hexColor: string, pattern: 'cotton' | 'denim' | 'khaki' = 'cotton'): THREE.CanvasTexture {
  const key = `${hexColor}-${pattern}`;
  const cached = clothCache.get(key);
  if (cached) return cached;

  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 128, 128);

  // Fine woven textile cross-threads
  for (let y = 0; y < 128; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, y, 128, 1);
  }
  for (let x = 0; x < 128; x += 3) {
    ctx.fillStyle = pattern === 'denim' ? 'rgba(20,30,55,0.08)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(x, 0, 1, 128);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  clothCache.set(key, tex);
  return tex;
}

const facadeCache = new Map<string, THREE.CanvasTexture>();

export function createBuildingPbrTexture(
  style: DistrictStyle,
  wallHex: string,
  awningHex: string,
  floors: number,
  label: string | undefined,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const key = `${style}|${wallHex}|${awningHex}|${Math.min(floors, 6)}|${label || ''}`;
  const existing = facadeCache.get(key);
  if (existing) return existing;

  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Base surface
  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 512, 512);

  if (style === 'downtown') {
    // Sleek glass curtain wall & dark aluminum mullions
    const glassGrad = ctx.createLinearGradient(0, 0, 512, 512);
    glassGrad.addColorStop(0, '#1e3a5f');
    glassGrad.addColorStop(0.5, '#2b5278');
    glassGrad.addColorStop(1, '#14263d');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(0, 0, 512, 430);

    const rows = Math.max(4, Math.min(7, floors));
    const rowH = 420 / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      // Concrete spandrel floor band
      ctx.fillStyle = wallHex;
      ctx.fillRect(0, y, 512, rowH * 0.24);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, y + rowH * 0.24, 512, 4);

      // Glass window bays with sky reflection & subtle lit office interiors
      for (let col = 0; col < 6; col++) {
        const x = 14 + col * 82;
        const w = 68;
        const h = rowH * 0.66;
        const wy = y + rowH * 0.28;
        const lit = hash2d(r * 7 + col, 19) > 0.62;
        const wg = ctx.createLinearGradient(x, wy, x + w, wy + h);
        wg.addColorStop(0, lit ? '#eab308' : '#38bdf8');
        wg.addColorStop(0.4, lit ? '#92400e' : '#1e3a5f');
        wg.addColorStop(1, '#0f172a');
        ctx.fillStyle = wg;
        ctx.fillRect(x, wy, w, h);

        // Diagonal specular reflection glint
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.beginPath();
        ctx.moveTo(x, wy);
        ctx.lineTo(x + w * 0.55, wy);
        ctx.lineTo(x, wy + h * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Modern lobby glass entrance
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 428, 512, 84);
    ctx.fillStyle = 'rgba(253,224,71,0.22)';
    ctx.fillRect(36, 440, 440, 64);
  } else if (style === 'industrial') {
    // Weathered corrugated steel panels + hazard strip + loading bay
    for (let x = 0; x < 512; x += 14) {
      ctx.fillStyle = (x / 14) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, 0, 7, 512);
    }
    // Rust & grime streaks
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = 'rgba(92,50,24,0.18)';
      ctx.fillRect(hash2d(i, 3) * 490, hash2d(i, 4) * 400, 12, 70);
    }
    // Clerestory factory windows near top
    for (let col = 0; col < 5; col++) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(28 + col * 96, 46, 68, 42);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(34 + col * 96, 52, 56, 30);
    }
    // Steel rolling shutter loading bay
    ctx.fillStyle = '#27272a';
    ctx.fillRect(110, 300, 292, 212);
    for (let sy = 314; sy < 512; sy += 16) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(118, sy, 276, 4);
    }
    // Yellow-black hazard safety band
    for (let hx = 0; hx < 512; hx += 32) {
      ctx.fillStyle = (hx / 32) % 2 === 0 ? '#eab308' : '#18181b';
      ctx.fillRect(hx, 268, 32, 16);
    }
  } else {
    // Apartment / Residential / Market / Service: Realistic masonry/stucco + framed windows
    for (let i = 0; i < 1100; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.04)';
      ctx.fillRect(hash2d(i, 51) * 512, hash2d(i, 53) * 512, 3, 3);
    }

    if (style === 'residential') {
      // Subtle horizontal brick courses
      ctx.fillStyle = 'rgba(110,68,46,0.12)';
      for (let y = 0; y < 512; y += 18) {
        ctx.fillRect(0, y, 512, 2);
      }
    }

    const upperFloors = style === 'apartment' ? 3 : 2;
    const floorH = style === 'market' ? 155 : 138;

    for (let row = 0; row < upperFloors; row++) {
      const yBase = 24 + row * floorH;
      // Architectural concrete floor ledge + AO shadow below
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(0, yBase + floorH - 12, 512, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, yBase + floorH - 6, 512, 6);

      for (let col = 0; col < 4; col++) {
        const wx = 30 + col * 120;
        const wy = yBase + 16;
        // Concrete lintel & sill
        ctx.fillStyle = '#334155';
        ctx.fillRect(wx - 4, wy - 6, 78, 8);
        ctx.fillRect(wx - 4, wy + 86, 78, 7);

        // Dark window recess
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(wx, wy, 70, 86);

        // Semi-realistic reflective/warm interior glass
        const lit = hash2d(row * 11 + col, 77) > 0.58;
        const wg = ctx.createLinearGradient(wx, wy, wx, wy + 86);
        wg.addColorStop(0, lit ? '#f59e0b' : '#38bdf8');
        wg.addColorStop(0.55, lit ? '#92400e' : '#1e293b');
        wg.addColorStop(1, '#0f172a');
        ctx.fillStyle = wg;
        ctx.fillRect(wx + 5, wy + 5, 60, 76);

        // Window frame dividers
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(wx + 33, wy + 5, 4, 76);
        ctx.fillRect(wx + 5, wy + 42, 60, 4);

        // AC unit beside alternating windows
        if ((row + col) % 3 === 1) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(wx + 76, wy + 48, 26, 20);
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(wx + 87, wy + 58, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (style === 'market' || style === 'service') {
      // Ground floor commercial storefront + awning + shop signboard
      ctx.fillStyle = '#18181b';
      ctx.fillRect(22, 388, 468, 124);
      const sg = ctx.createLinearGradient(0, 392, 0, 506);
      sg.addColorStop(0, 'rgba(253, 224, 71, 0.25)');
      sg.addColorStop(1, 'rgba(234, 88, 12, 0.14)');
      ctx.fillStyle = sg;
      ctx.fillRect(36, 400, 440, 102);

      // Corrugated/striped awning
      for (let s = 0; s < 12; s++) {
        ctx.fillStyle = s % 2 === 0 ? awningHex : '#e2e8f0';
        ctx.fillRect(s * (512 / 12), 348, 512 / 12, 42);
      }

      if (label) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(28, 288, 456, 54);
        ctx.strokeStyle = awningHex;
        ctx.lineWidth = 4;
        ctx.strokeRect(28, 288, 456, 54);
        ctx.fillStyle = '#fef3c7';
        ctx.font = '800 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label.slice(0, 21), 256, 325);
      }
    } else {
      // Ground floor residential entrance / garage shutter
      ctx.fillStyle = '#292524';
      ctx.fillRect(204, 412, 104, 100);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(212, 420, 88, 92);
    }
  }

  // Ground-contact Ambient Occlusion + subtle roof-overhang AO
  const bottomAo = ctx.createLinearGradient(0, 445, 0, 512);
  bottomAo.addColorStop(0, 'rgba(0,0,0,0)');
  bottomAo.addColorStop(1, 'rgba(10,8,6,0.45)');
  ctx.fillStyle = bottomAo;
  ctx.fillRect(0, 445, 512, 67);

  const topAo = ctx.createLinearGradient(0, 0, 0, 28);
  topAo.addColorStop(0, 'rgba(10,8,6,0.34)');
  topAo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topAo;
  ctx.fillRect(0, 0, 512, 28);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  facadeCache.set(key, tex);
  return tex;
}
