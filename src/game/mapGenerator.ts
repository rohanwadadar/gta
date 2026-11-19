import { DISTRICTS, WORLD_SIZE } from '../shared/types';

export type DistrictStyle =
  | 'downtown'
  | 'apartment'
  | 'residential'
  | 'market'
  | 'industrial'
  | 'park'
  | 'service'
  | 'temple';

export interface BuildingRect {
  x: number;
  y: number;
  w: number;
  h: number;
  roofColor: string;
  wallColor: string;
  awningColor: string;
  style: DistrictStyle;
  floors: number;
  hasBalconies?: boolean;
  hasHelipad?: boolean;
  label?: string;
  hasWaterTank?: boolean;
  isTemple?: boolean;
  seed: number;
}

export interface TreeProp {
  x: number;
  y: number;
  radius: number;
  kind: 'palm' | 'banyan' | 'neem';
}

export interface WorldPickup {
  id: string;
  x: number;
  y: number;
  kind: 'samosa' | 'cash' | 'chai';
  active: boolean;
  respawnTimer: number;
}

export interface GarageZone {
  x: number;
  y: number;
  radius: number;
}

export interface PetrolStationProp {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
}

export interface ParkingLotProp {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PuddleProp {
  x: number;
  y: number;
  rx: number;
  rz: number;
  rot: number;
}

export interface RoadSignProp {
  x: number;
  y: number;
  rot: number;
  kind: 'speed50' | 'stop' | 'crossing' | 'fuel';
}

export interface UtilityPoleProp {
  x: number;
  y: number;
  rot: number;
}

export interface BusStopProp {
  x: number;
  y: number;
  rot: number;
  name: string;
}

export interface GarbageBinProp {
  x: number;
  y: number;
}

export interface VendorCartProp {
  x: number;
  y: number;
  rot: number;
  color: string;
}

export interface BenchSpot {
  id: string;
  x: number;
  y: number;
  rot: number;
}

export type ObstacleCollider =
  | {
      kind: 'circle';
      x: number;
      y: number;
      r: number;
      tag?: string;
    }
  | {
      kind: 'box';
      x: number; // center x
      y: number; // center y
      hw: number; // half width along local X
      hd: number; // half depth along local Z
      rot: number; // Three.js rotation.y
      tag?: string;
    };

export interface RampSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  angle: number;
}

export interface CityMapData {
  worldSize: number;
  chunkSize: number;
  roadCenters: number[];
  roadWidth: number;
  buildings: BuildingRect[];
  trees: TreeProp[];
  pickups: WorldPickup[];
  garageZone: GarageZone;
  roundabout: { x: number; y: number; outerR: number; innerR: number };
  cricketField: { x: number; y: number; w: number; h: number };
  centralPark: { x: number; y: number; w: number; h: number };
  templePlaza: { x: number; y: number; w: number; h: number };
  petrolStations: PetrolStationProp[];
  parkingLots: ParkingLotProp[];
  puddles: PuddleProp[];
  roadSigns: RoadSignProp[];
  utilityPoles: UtilityPoleProp[];
  busStops: BusStopProp[];
  bins: GarbageBinProp[];
  vendorCarts: VendorCartProp[];
  benches: BenchSpot[];
  stuntRamps: RampSpec[];
  colliders: ObstacleCollider[];
}

export const CHUNK_SIZE = 800;
export const ROAD_CENTERS = [400, 1200, 2000, 2800, 3600, 4400, 5200];
export const ROAD_WIDTH = 170;

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROOF_PALETTE = [
  '#475569', // weathered concrete
  '#64748b', // slate concrete
  '#7c4a32', // muted terracotta
  '#334155', // charcoal bitumen
  '#57534e', // warm stone
  '#3f4d3a', // oxidized copper/moss
];

const RESIDENTIAL_WALLS = ['#e5dccb', '#d9cbb6', '#dfd3c3', '#c8b8a6', '#d6c3ad'];
const DOWNTOWN_WALLS = ['#334155', '#3b4a5e', '#475569', '#2b394a'];
const APARTMENT_WALLS = ['#dfd6c7', '#cbd5e1', '#d6ccc2', '#e2d9c8'];
const INDUSTRIAL_WALLS = ['#64748b', '#52525b', '#71717a', '#6b5b4e'];
const AWNING_PALETTE = ['#b45309', '#991b1b', '#0f766e', '#1d4ed8', '#9a3412', '#475569'];

const SHOP_LABELS = [
  'SHARMA SWEETS & CHAI',
  'METRO PHARMACY',
  'FURFURI SUPERMART',
  'DELHI HIGHWAY DHABA',
  'GUPTA HARDWARE',
  'ROYAL BAKERY & CAFE',
  'AUTO SPARES & TYRES',
  'BOMBAY TAILORS',
  'NAGRI ELECTRONICS',
  'FRESH MILK DAIRY',
  'KUMAR BOOK DEPOT',
  'GRAND CINEMA HALL',
];

function getBlockStyle(bx: number, by: number): DistrictStyle {
  // Downtown commercial core around Chai Chowk & North-Center
  if ((bx === 2 && by === 1) || (bx === 2 && by === 2) || (bx === 3 && by === 2)) return 'downtown';
  // Modern apartments
  if ((bx === 4 && by === 2) || (bx === 4 && by === 1) || (bx === 3 && by === 0)) return 'apartment';
  // Local Indian Market (Furfuri Bazaar & Ghanta Ghar Old Market)
  if ((bx === 1 && by === 1) || (bx === 1 && by === 2) || (bx === 2 && by === 5) || (bx === 2 && by === 4))
    return 'market';
  // Industrial SE quadrant
  if (bx >= 4 && by >= 4) return 'industrial';
  // Residential neighborhoods (Shanti Vihar, South-West, North-West)
  return 'residential';
}

// ==================== FAST SPATIAL CHUNK HASH FOR COLLISIONS ====================
interface BuildingGrid {
  cellSize: number;
  cols: number;
  cells: BuildingRect[][];
}

const buildingGridCache = new WeakMap<BuildingRect[], BuildingGrid>();

function getBuildingGrid(buildings: BuildingRect[]): BuildingGrid {
  let grid = buildingGridCache.get(buildings);
  if (grid) return grid;

  const cellSize = 400;
  const cols = Math.ceil(WORLD_SIZE / cellSize) + 1;
  const cells: BuildingRect[][] = Array.from({ length: cols * cols }, () => []);

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    const minCx = Math.max(0, Math.floor((b.x - 32) / cellSize));
    const maxCx = Math.min(cols - 1, Math.floor((b.x + b.w + 32) / cellSize));
    const minCy = Math.max(0, Math.floor((b.y - 32) / cellSize));
    const maxCy = Math.min(cols - 1, Math.floor((b.y + b.h + 32) / cellSize));
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        cells[cy * cols + cx].push(b);
      }
    }
  }

  grid = { cellSize, cols, cells };
  buildingGridCache.set(buildings, grid);
  return grid;
}

export function generateCityMap(): CityMapData {
  const rand = mulberry32(202607);
  const buildings: BuildingRect[] = [];
  const trees: TreeProp[] = [];
  const pickups: WorldPickup[] = [];
  const petrolStations: PetrolStationProp[] = [];
  const parkingLots: ParkingLotProp[] = [];
  const puddles: PuddleProp[] = [];
  const roadSigns: RoadSignProp[] = [];
  const utilityPoles: UtilityPoleProp[] = [];
  const busStops: BusStopProp[] = [];
  const bins: GarbageBinProp[] = [];
  const vendorCarts: VendorCartProp[] = [];
  const colliders: ObstacleCollider[] = [];

  const roundabout = { x: 2800, y: 2800, outerR: 150, innerR: 62 };
  const garageZone: GarageZone = { x: 3200, y: 1730, radius: 82 };
  const cricketField = { x: 1365, y: 2965, w: 470, h: 470 };
  const centralPark = { x: 2945, y: 3745, w: 510, h: 510 };
  const templePlaza = { x: 545, y: 2145, w: 510, h: 510 };

  const benches: BenchSpot[] = [
    { id: 'bench-1', x: 2705, y: 2890, rot: Math.PI / 4 },
    { id: 'bench-2', x: 2895, y: 2890, rot: -Math.PI / 4 },
    { id: 'bench-3', x: 2705, y: 3015, rot: Math.PI * 0.75 },
    { id: 'bench-4', x: 2895, y: 3015, rot: -Math.PI * 0.75 },
    { id: 'bench-5', x: 1520, y: 3140, rot: 0 },
    { id: 'bench-6', x: 1520, y: 3280, rot: Math.PI },
    { id: 'bench-7', x: 3140, y: 3960, rot: 0 },
    { id: 'bench-8', x: 3260, y: 4040, rot: Math.PI },
  ];

  const stuntRamps: RampSpec[] = [
    { id: 'ramp-chowk-s', label: 'Chai Chowk Stunt', x: 2800, y: 3130, angle: Math.PI / 2 },
    { id: 'ramp-chowk-e', label: 'Skyline Bridge Jump', x: 3060, y: 2800, angle: 0 },
    { id: 'ramp-bazaar', label: 'Downtown Sky Ramp', x: 2800, y: 2320, angle: -Math.PI / 2 },
    { id: 'ramp-highway', label: 'Ring Highway Launch', x: 2440, y: 2800, angle: Math.PI },
    { id: 'ramp-maidan', label: 'Bada Maidan Mega Jump', x: 1600, y: 2910, angle: Math.PI / 2 },
    { id: 'ramp-park', label: 'Central Park Flyover', x: 3200, y: 3650, angle: 0 },
    { id: 'ramp-industrial', label: 'Industrial Yard Jump', x: 4400, y: 4160, angle: Math.PI / 2 },
    { id: 'ramp-temple', label: 'Surya Mandir Leap', x: 1120, y: 2000, angle: 0 },
  ];

  const halfRoad = ROAD_WIDTH / 2 + 28; // road + raised sidewalk clearance

  // Iterate over the 6x6 city blocks bounded by ROAD_CENTERS
  for (let bx = 0; bx < ROAD_CENTERS.length - 1; bx++) {
    for (let by = 0; by < ROAD_CENTERS.length - 1; by++) {
      const left = ROAD_CENTERS[bx] + halfRoad;
      const right = ROAD_CENTERS[bx + 1] - halfRoad;
      const top = ROAD_CENTERS[by] + halfRoad;
      const bottom = ROAD_CENTERS[by + 1] - halfRoad;
      const blockW = right - left;
      const blockH = bottom - top;

      // 1. Bada Maidan Cricket Stadium (bx=1, by=3)
      if (bx === 1 && by === 3) {
        buildings.push({
          x: left + 140,
          y: top + 14,
          w: 290,
          h: 66,
          roofColor: '#166534',
          wallColor: '#e2e8f0',
          awningColor: '#d97706',
          style: 'service',
          floors: 2,
          label: 'BADA MAIDAN PAVILION',
          seed: bx * 31 + by,
        });
        for (let i = 0; i < 8; i++) {
          trees.push({
            x: left + 26 + (i % 2) * (blockW - 52),
            y: top + 110 + Math.floor(i / 2) * 135,
            radius: 26,
            kind: i % 3 === 0 ? 'banyan' : 'neem',
          });
        }
        continue;
      }

      // 2. Central Park & Recreational Area (bx=3, by=4)
      if (bx === 3 && by === 4) {
        buildings.push({
          x: left + blockW * 0.5 - 55,
          y: top + 20,
          w: 110,
          h: 52,
          roofColor: '#7c4a32',
          wallColor: '#e5dccb',
          awningColor: '#15803d',
          style: 'park',
          floors: 1,
          label: 'PARK CAFE',
          seed: 901,
        });
        for (let i = 0; i < 14; i++) {
          const tx = left + 40 + (rand() * (blockW - 80));
          const ty = top + 95 + (rand() * (blockH - 135));
          if (Math.hypot(tx - (left + blockW * 0.5), ty - (top + blockH * 0.54)) > 95) {
            trees.push({
              x: tx,
              y: ty,
              radius: 24,
              kind: i % 3 === 0 ? 'banyan' : 'neem',
            });
          }
        }
        continue;
      }

      // 3. Raju's Desi Garage & Service Workshop (bx=3, by=1)
      if (bx === 3 && by === 1) {
        buildings.push({
          x: left + 24,
          y: top + 18,
          w: blockW - 48,
          h: 138,
          roofColor: '#065f46',
          wallColor: '#e5dccb',
          awningColor: '#d97706',
          style: 'service',
          floors: 2,
          label: "RAJU'S DESI GARAGE",
          hasWaterTank: true,
          seed: 311,
        });
        parkingLots.push({ x: left + 45, y: top + 180, w: blockW - 90, h: 120 });
        trees.push({ x: left + 30, y: bottom - 30, radius: 22, kind: 'palm' });
        trees.push({ x: right - 30, y: bottom - 30, radius: 22, kind: 'palm' });
        continue;
      }

      // 4. Police Thana HQ (bx=4, by=3)
      if (bx === 4 && by === 3) {
        buildings.push({
          x: left + 52,
          y: top + 40,
          w: blockW - 104,
          h: 195,
          roofColor: '#1e3a8a',
          wallColor: '#e5dccb',
          awningColor: '#b91c1c',
          style: 'service',
          floors: 3,
          label: 'FURFURI POLICE HQ',
          hasWaterTank: true,
          hasHelipad: true,
          seed: 403,
        });
        parkingLots.push({ x: left + 52, y: top + 270, w: blockW - 104, h: 150 });
        trees.push({ x: left + 32, y: bottom - 34, radius: 24, kind: 'neem' });
        trees.push({ x: right - 32, y: bottom - 34, radius: 24, kind: 'neem' });
        continue;
      }

      // 5. Temple Square — Surya Mandir (bx=0, by=2)
      if (bx === 0 && by === 2) {
        buildings.push({
          x: left + 165,
          y: top + 150,
          w: 220,
          h: 190,
          roofColor: '#c2410c',
          wallColor: '#f3dfb6',
          awningColor: '#d97706',
          style: 'temple',
          floors: 2,
          label: 'SURYA MANDIR',
          isTemple: true,
          seed: 200,
        });
        trees.push({ x: left + 42, y: top + 42, radius: 26, kind: 'banyan' });
        trees.push({ x: right - 42, y: top + 42, radius: 26, kind: 'banyan' });
        trees.push({ x: left + 42, y: bottom - 42, radius: 24, kind: 'neem' });
        trees.push({ x: right - 42, y: bottom - 42, radius: 24, kind: 'neem' });
        continue;
      }

      // 6. Highway Petrol Station #1 (bx=1, by=0) & Industrial Fuel Plaza #2 (bx=4, by=5)
      if ((bx === 1 && by === 0) || (bx === 4 && by === 5)) {
        const isNorth = by === 0;
        buildings.push({
          x: left + 28,
          y: top + 24,
          w: blockW - 56,
          h: 115,
          roofColor: '#1e293b',
          wallColor: '#e2e8f0',
          awningColor: isNorth ? '#ea580c' : '#0284c7',
          style: 'service',
          floors: 1,
          label: isNorth ? 'HIGHWAY FUEL MART' : 'INDUSTRIAL PETROL BAY',
          seed: isNorth ? 101 : 405,
        });
        petrolStations.push({
          id: isNorth ? 'fuel-north' : 'fuel-south',
          name: isNorth ? 'Dholakpur Petrol Pump' : 'Industrial Fuel Station',
          x: left + blockW * 0.5,
          y: top + 275,
          angle: 0,
        });
        parkingLots.push({ x: left + 55, y: bottom - 150, w: blockW - 110, h: 120 });
        trees.push({ x: left + 28, y: bottom - 28, radius: 22, kind: 'palm' });
        trees.push({ x: right - 28, y: bottom - 28, radius: 22, kind: 'palm' });
        continue;
      }

      // 7. Zoned Urban & Outskirt Blocks (Downtown, Apartments, Market, Industrial, Residential)
      const style = getBlockStyle(bx, by);
      const isOutskirts = bx === 0 || by === 0 || bx === 5 || by === 5;
      const subGap = style === 'market' ? 46 : 54; // generous walkable alleys & side lanes
      const subW = (blockW - subGap) / 2;
      const subH = (blockH - subGap) / 2;

      for (let sx = 0; sx < 2; sx++) {
        for (let sy = 0; sy < 2; sy++) {
          const insetX = rand() * 24 + (isOutskirts ? 14 : 6);
          const insetY = rand() * 24 + (isOutskirts ? 14 : 6);
          const x = left + sx * (subW + subGap) + insetX * 0.5;
          const y = top + sy * (subH + subGap) + insetY * 0.5;
          const w = subW - insetX;
          const h = subH - insetY;

          // Keep Chai Chowk central plaza corner clear for roundabout + pedestrian promenade
          const cx = x + w / 2;
          const cy = y + h / 2;
          if (Math.hypot(cx - roundabout.x, cy - roundabout.y) < 280) {
            trees.push({ x: cx, y: cy, radius: 22, kind: 'palm' });
            continue;
          }

          // Leave occasional open parking lot inside Downtown & Market blocks
          if ((style === 'downtown' || style === 'market') && sx === 1 && sy === 1 && rand() > 0.55) {
            parkingLots.push({ x: x + 12, y: y + 12, w: w - 24, h: h - 24 });
            trees.push({ x: x + 22, y: y + 22, radius: 20, kind: 'neem' });
            continue;
          }

          // Outskirts sparse natural clearings
          if (isOutskirts && rand() > 0.72) {
            trees.push({ x: cx - 35, y: cy - 25, radius: 24, kind: 'banyan' });
            trees.push({ x: cx + 45, y: cy + 35, radius: 22, kind: 'neem' });
            continue;
          }

          const floors =
            style === 'downtown'
              ? 5 + Math.floor(rand() * 5) // 5..9 story office towers
              : style === 'apartment'
              ? 4 + Math.floor(rand() * 4) // 4..7 story apartments
              : style === 'industrial'
              ? 1 + Math.floor(rand() * 2) // 1..2 tall warehouse bays
              : style === 'market'
              ? 2 + Math.floor(rand() * 2) // 2..3 story shophouses
              : 2 + Math.floor(rand() * 2); // 2..3 story residential homes

          const wallPool =
            style === 'downtown'
              ? DOWNTOWN_WALLS
              : style === 'apartment'
              ? APARTMENT_WALLS
              : style === 'industrial'
              ? INDUSTRIAL_WALLS
              : RESIDENTIAL_WALLS;

          const wallColor = wallPool[Math.floor(rand() * wallPool.length)];
          const roofColor = ROOF_PALETTE[Math.floor(rand() * ROOF_PALETTE.length)];
          const awningColor = AWNING_PALETTE[Math.floor(rand() * AWNING_PALETTE.length)];
          const hasLabel = (style === 'market' && rand() > 0.25) || (style === 'downtown' && rand() > 0.65);
          const label = hasLabel ? SHOP_LABELS[Math.floor(rand() * SHOP_LABELS.length)] : undefined;

          buildings.push({
            x,
            y,
            w,
            h,
            roofColor,
            wallColor,
            awningColor,
            style,
            floors,
            hasBalconies: style === 'apartment' || (style === 'residential' && floors >= 2 && rand() > 0.35),
            hasHelipad: style === 'downtown' && floors >= 8,
            label,
            hasWaterTank: style !== 'downtown' && rand() > 0.42,
            seed: Math.floor(rand() * 99999),
          });

          // Market street vendor carts & bins
          if (style === 'market' && rand() > 0.45) {
            vendorCarts.push({
              x: sx === 0 ? x - 18 : x + w + 18,
              y: cy,
              rot: sx === 0 ? 0 : Math.PI,
              color: awningColor,
            });
          }
        }
      }

      // Natural trees lining block sidewalks
      const treeKind: TreeProp['kind'] =
        style === 'downtown' || style === 'apartment'
          ? 'palm'
          : style === 'residential'
          ? rand() > 0.4
            ? 'neem'
            : 'banyan'
          : 'neem';
      trees.push({ x: left + blockW * 0.5, y: top + 14, radius: 19, kind: treeKind });
      trees.push({ x: left + blockW * 0.5, y: bottom - 14, radius: 19, kind: treeKind });
      if (isOutskirts || style === 'residential') {
        trees.push({ x: left + 14, y: top + blockH * 0.5, radius: 20, kind: 'banyan' });
      }
      bins.push({ x: left + 18, y: top + 18 });
    }
  }

  // Road Signs, Utility Poles & Bus Stops along main avenues
  for (let xi = 0; xi < ROAD_CENTERS.length; xi++) {
    for (let zi = 0; zi < ROAD_CENTERS.length; zi++) {
      const rx = ROAD_CENTERS[xi];
      const rz = ROAD_CENTERS[zi];

      if (xi > 0 && xi < ROAD_CENTERS.length - 1 && zi > 0 && zi < ROAD_CENTERS.length - 1) {
        const signKinds: RoadSignProp['kind'][] = ['speed50', 'stop', 'crossing', 'fuel'];
        roadSigns.push({
          x: rx + 98,
          y: rz - 102,
          rot: 0,
          kind: signKinds[(xi + zi) % signKinds.length],
        });
      }

      // Utility poles along outer & residential avenues
      if (xi === 0 || xi >= 4 || zi === 0 || zi >= 4) {
        if (xi < ROAD_CENTERS.length - 1) {
          utilityPoles.push({ x: rx + 400, y: rz - 98, rot: 0 });
        }
      }

      // Bus shelters near major inner intersections
      if ((xi === 1 || xi === 3 || xi === 4) && (zi === 2 || zi === 3)) {
        const nearD = getNearestDistrict(rx, rz);
        busStops.push({
          x: rx + 260,
          y: rz + 98,
          rot: Math.PI,
          name: `${nearD.name} Bus Stop`,
        });
      }
    }
  }

  // Asphalt Road Puddles (glisten and splash during rain!)
  for (let i = 0; i < 42; i++) {
    const road = ROAD_CENTERS[i % ROAD_CENTERS.length];
    const horiz = i % 2 === 0;
    const along = 520 + ((i * 373) % (WORLD_SIZE - 1040));
    const laneJitter = (i % 3 === 0 ? 1 : -1) * (18 + (i % 4) * 9);
    const px = horiz ? along : road + laneJitter;
    const py = horiz ? road + laneJitter : along;
    if (Math.hypot(px - roundabout.x, py - roundabout.y) > 210) {
      puddles.push({
        x: px,
        y: py,
        rx: 2.2 + (i % 3) * 0.9,
        rz: 1.5 + (i % 2) * 0.7,
        rot: rand() * Math.PI,
      });
    }
  }

  // Outer Perimeter Outskirts Trees
  for (let i = 200; i < WORLD_SIZE - 180; i += 280) {
    trees.push({ x: 140, y: i, radius: 26, kind: i % 560 === 0 ? 'banyan' : 'neem' });
    trees.push({ x: WORLD_SIZE - 140, y: i, radius: 26, kind: i % 560 === 0 ? 'banyan' : 'neem' });
    trees.push({ x: i, y: 140, radius: 26, kind: 'palm' });
    trees.push({ x: i, y: WORLD_SIZE - 140, radius: 26, kind: 'neem' });
  }

  // Spawn Collectible Samosas, Chai Cups, and Cash Bundles across all 14 districts
  let pid = 1;
  for (const d of DISTRICTS) {
    for (let k = 0; k < 3; k++) {
      const angle = (k / 3) * Math.PI * 2 + rand() * 0.8;
      const dist = 75 + rand() * 145;
      const px = Math.max(220, Math.min(WORLD_SIZE - 220, d.x + Math.cos(angle) * dist));
      const py = Math.max(220, Math.min(WORLD_SIZE - 220, d.y + Math.sin(angle) * dist));
      if (!pointHitsBuilding(px, py, 20, buildings)) {
        pickups.push({
          id: `pk-${pid++}`,
          x: px,
          y: py,
          kind: k === 0 ? 'samosa' : k === 1 ? 'cash' : 'chai',
          active: true,
          respawnTimer: 0,
        });
      }
    }
  }

  // Build tightly-fitted environmental colliders matching visible 3D geometry
  // 1. Chai Chowk Fountain outer basin (r = 62 -> 6.2m)
  colliders.push({ kind: 'circle', x: roundabout.x, y: roundabout.y, r: 62, tag: 'fountain' });

  // 2. Central Park Gazebo 6 support posts + Pond rim
  const parkCx = centralPark.x + centralPark.w * 0.5;
  const parkCy = centralPark.y + centralPark.h * 0.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    colliders.push({ kind: 'circle', x: parkCx + Math.cos(a) * 36, y: parkCy + Math.sin(a) * 36, r: 2.2, tag: 'gazebo_post' });
  }
  colliders.push({ kind: 'circle', x: parkCx + 105, y: parkCy + 105, r: 62, tag: 'pond' });

  // 3. Street Benches (2.1m x 0.65m seat + backrest)
  for (const b of benches) {
    colliders.push({ kind: 'box', x: b.x, y: b.y, hw: 10.6, hd: 3.6, rot: b.rot, tag: 'bench' });
  }

  // 4. Petrol Station Canopy Columns (4) + Fuel Pump Islands (2)
  for (const ps of petrolStations) {
    for (const px of [-42, 42]) {
      for (const pz of [-24, 24]) {
        colliders.push({ kind: 'circle', x: ps.x + px, y: ps.y + pz, r: 3.2, tag: 'petrol_col' });
      }
      colliders.push({ kind: 'box', x: ps.x + px, y: ps.y, hw: 13.5, hd: 6.2, rot: ps.angle, tag: 'petrol_island' });
    }
  }

  // 5. Tree Trunks (tight to visible bark radius, not canopy leaves)
  for (const t of trees) {
    const trunkR = t.kind === 'banyan' ? 5.2 : t.kind === 'neem' ? 3.5 : 2.6;
    colliders.push({ kind: 'circle', x: t.x, y: t.y, r: trunkR, tag: 'tree' });
  }

  // 6. Road Signs, Utility Poles, Garbage Bins, Bus Shelters, Market Vendor Carts
  for (const rs of roadSigns) {
    colliders.push({ kind: 'circle', x: rs.x, y: rs.y, r: 1.8, tag: 'sign' });
  }
  for (const up of utilityPoles) {
    colliders.push({ kind: 'circle', x: up.x, y: up.y, r: 2.2, tag: 'pole' });
  }
  for (const bin of bins) {
    colliders.push({ kind: 'circle', x: bin.x, y: bin.y, r: 4.0, tag: 'bin' });
  }
  for (const bs of busStops) {
    // Back glass + bench strip offset toward -Z in local frame
    const offset = -6.5;
    const wx = bs.x + offset * Math.sin(bs.rot);
    const wy = bs.y + offset * Math.cos(bs.rot);
    colliders.push({ kind: 'box', x: wx, y: wy, hw: 25.0, hd: 4.5, rot: bs.rot, tag: 'bus_stop' });
  }
  for (const vc of vendorCarts) {
    colliders.push({ kind: 'box', x: vc.x, y: vc.y, hw: 11.5, hd: 6.5, rot: vc.rot, tag: 'cart' });
  }

  // 7. Street Lamps & Traffic Lights
  for (let xi = 0; xi < ROAD_CENTERS.length; xi++) {
    for (let zi = 0; zi < ROAD_CENTERS.length; zi++) {
      const rx2d = ROAD_CENTERS[xi];
      const rz2d = ROAD_CENTERS[zi];
      if ((xi + zi) % 2 === 0) {
        colliders.push({ kind: 'circle', x: rx2d + 94, y: rz2d + 94, r: 2.0, tag: 'lamp' });
      }
      if (xi >= 1 && xi <= 5 && zi >= 1 && zi <= 5 && !(xi === 3 && zi === 3)) {
        colliders.push({ kind: 'circle', x: rx2d - 92, y: rz2d - 92, r: 2.2, tag: 'traffic_light' });
      }
    }
  }

  return {
    worldSize: WORLD_SIZE,
    chunkSize: CHUNK_SIZE,
    roadCenters: ROAD_CENTERS,
    roadWidth: ROAD_WIDTH,
    buildings,
    trees,
    pickups,
    garageZone,
    roundabout,
    cricketField,
    centralPark,
    templePlaza,
    petrolStations,
    parkingLots,
    puddles,
    roadSigns,
    utilityPoles,
    busStops,
    bins,
    vendorCarts,
    benches,
    stuntRamps,
    colliders,
  };
}

export function pointHitsBuilding(x: number, y: number, r: number, buildings: BuildingRect[]): boolean {
  const grid = getBuildingGrid(buildings);
  const minCx = Math.max(0, Math.floor((x - r) / grid.cellSize));
  const maxCx = Math.min(grid.cols - 1, Math.floor((x + r) / grid.cellSize));
  const minCy = Math.max(0, Math.floor((y - r) / grid.cellSize));
  const maxCy = Math.min(grid.cols - 1, Math.floor((y + r) / grid.cellSize));

  const rSq = r * r;
  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const bucket = grid.cells[cy * grid.cols + cx];
      for (let i = 0; i < bucket.length; i++) {
        const b = bucket[i];
        const nearestX = Math.max(b.x, Math.min(x, b.x + b.w));
        const nearestY = Math.max(b.y, Math.min(y, b.y + b.h));
        const dx = x - nearestX;
        const dy = y - nearestY;
        if (dx * dx + dy * dy < rSq) return true;
      }
    }
  }
  return false;
}

// ==================== FAST OBSTACLE COLLIDER SPATIAL GRID ====================
interface ColliderGrid {
  cellSize: number;
  cols: number;
  cells: ObstacleCollider[][];
}

const colliderGridCache = new WeakMap<ObstacleCollider[], ColliderGrid>();

function getColliderGrid(colliders: ObstacleCollider[]): ColliderGrid {
  let grid = colliderGridCache.get(colliders);
  if (grid) return grid;

  const cellSize = 200;
  const cols = Math.ceil(WORLD_SIZE / cellSize) + 1;
  const cells: ObstacleCollider[][] = Array.from({ length: cols * cols }, () => []);

  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const extent = c.kind === 'circle' ? c.r + 12 : Math.hypot(c.hw, c.hd) + 12;
    const minCx = Math.max(0, Math.floor((c.x - extent) / cellSize));
    const maxCx = Math.min(cols - 1, Math.floor((c.x + extent) / cellSize));
    const minCy = Math.max(0, Math.floor((c.y - extent) / cellSize));
    const maxCy = Math.min(cols - 1, Math.floor((c.y + extent) / cellSize));
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        cells[cy * cols + cx].push(c);
      }
    }
  }

  grid = { cellSize, cols, cells };
  colliderGridCache.set(colliders, grid);
  return grid;
}

/**
 * Resolves 2D capsule/circle collision against all buildings and static environmental colliders.
 * Pushes (x, y) cleanly along shortest penetration axis so characters & NPCs slide smoothly along walls,
 * benches, fountain rims, trees, stalls, ATMs, and poles without ever clipping or sinking inside!
 */
export function resolveCapsuleCollision(
  x: number,
  y: number,
  r: number,
  buildings: BuildingRect[],
  colliders: ObstacleCollider[],
  out: { x: number; y: number; hit: boolean; hitBuilding: boolean }
): void {
  let px = Math.max(40, Math.min(WORLD_SIZE - 40, x));
  let py = Math.max(40, Math.min(WORLD_SIZE - 40, y));
  let hit = false;
  let hitBuilding = false;

  const bGrid = getBuildingGrid(buildings);
  const cGrid = getColliderGrid(colliders);

  for (let pass = 0; pass < 2; pass++) {
    const minCx = Math.max(0, Math.floor((px - r - 10) / bGrid.cellSize));
    const maxCx = Math.min(bGrid.cols - 1, Math.floor((px + r + 10) / bGrid.cellSize));
    const minCy = Math.max(0, Math.floor((py - r - 10) / bGrid.cellSize));
    const maxCy = Math.min(bGrid.cols - 1, Math.floor((py + r + 10) / bGrid.cellSize));

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = bGrid.cells[cy * bGrid.cols + cx];
        for (let i = 0; i < bucket.length; i++) {
          const b = bucket[i];
          const nx = Math.max(b.x, Math.min(px, b.x + b.w));
          const ny = Math.max(b.y, Math.min(py, b.y + b.h));
          const dx = px - nx;
          const dy = py - ny;
          const distSq = dx * dx + dy * dy;
          if (distSq < r * r) {
            hit = true;
            hitBuilding = true;
            if (distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const push = r - dist;
              px += (dx / dist) * push;
              py += (dy / dist) * push;
            } else {
              // Deep inside building: push to nearest edge
              const dl = px - b.x;
              const dr = b.x + b.w - px;
              const dt = py - b.y;
              const db = b.y + b.h - py;
              const m = Math.min(dl, dr, dt, db);
              if (m === dl) px = b.x - r;
              else if (m === dr) px = b.x + b.w + r;
              else if (m === dt) py = b.y - r;
              else py = b.y + b.h + r;
            }
          }
        }
      }
    }

    const cMinX = Math.max(0, Math.floor((px - r - 10) / cGrid.cellSize));
    const cMaxX = Math.min(cGrid.cols - 1, Math.floor((px + r + 10) / cGrid.cellSize));
    const cMinY = Math.max(0, Math.floor((py - r - 10) / cGrid.cellSize));
    const cMaxY = Math.min(cGrid.cols - 1, Math.floor((py + r + 10) / cGrid.cellSize));

    for (let cy = cMinY; cy <= cMaxY; cy++) {
      for (let cx = cMinX; cx <= cMaxX; cx++) {
        const bucket = cGrid.cells[cy * cGrid.cols + cx];
        for (let i = 0; i < bucket.length; i++) {
          const c = bucket[i];
          if (c.kind === 'circle') {
            const dx = px - c.x;
            const dy = py - c.y;
            const minR = c.r + r;
            const distSq = dx * dx + dy * dy;
            if (distSq < minR * minR) {
              hit = true;
              const dist = Math.sqrt(distSq);
              if (dist > 0.001) {
                const push = minR - dist;
                px += (dx / dist) * push;
                py += (dy / dist) * push;
              } else {
                px += minR;
              }
            }
          } else {
            // Oriented box collider (rot = Three.js rotation.y)
            const dx = px - c.x;
            const dy = py - c.y;
            const cos = Math.cos(c.rot);
            const sin = Math.sin(c.rot);
            // Local coordinates aligned with box
            const lx = dx * cos - dy * sin;
            const ly = dx * sin + dy * cos;
            const clx = Math.max(-c.hw, Math.min(lx, c.hw));
            const cly = Math.max(-c.hd, Math.min(ly, c.hd));
            const ldx = lx - clx;
            const ldy = ly - cly;
            const distSq = ldx * ldx + ldy * ldy;
            if (distSq < r * r) {
              hit = true;
              let pushLx = 0;
              let pushLy = 0;
              if (distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const push = r - dist;
                pushLx = (ldx / dist) * push;
                pushLy = (ldy / dist) * push;
              } else {
                const ox = c.hw - Math.abs(lx) + r;
                const oy = c.hd - Math.abs(ly) + r;
                if (ox < oy) pushLx = lx >= 0 ? ox : -ox;
                else pushLy = ly >= 0 ? oy : -oy;
              }
              // Transform local push back to world X,Y
              px += pushLx * cos + pushLy * sin;
              py += -pushLx * sin + pushLy * cos;
            }
          }
        }
      }
    }
  }

  out.x = Math.max(40, Math.min(WORLD_SIZE - 40, px));
  out.y = Math.max(40, Math.min(WORLD_SIZE - 40, py));
  out.hit = hit;
  out.hitBuilding = hitBuilding;
}

/**
 * Exact 3D surface elevation in meters for characters & vehicles so shoes and tires
 * rest flush on asphalt roads (0.11m), concrete sidewalks (0.08m), forecourts (0.16m),
 * parks (0.06m), and stunt ramp slopes without ever sinking below ground planes.
 */
export function getGroundHeightAt(x: number, y: number, map: CityMapData, currentH = 0): number {
  let h = 0.0;

  // Petrol station elevated concrete forecourts (15.5m x 10.5m -> 155 x 105)
  for (let i = 0; i < map.petrolStations.length; i++) {
    const ps = map.petrolStations[i];
    if (Math.abs(x - ps.x) <= 78 && Math.abs(y - ps.y) <= 53) {
      h = Math.max(h, 0.16);
    }
  }

  // Asphalt roads & raised sidewalks
  const halfRoad = map.roadWidth * 0.5;
  const halfSw = halfRoad + 19;
  for (let i = 0; i < map.roadCenters.length; i++) {
    const rc = map.roadCenters[i];
    const dx = Math.abs(x - rc);
    const dy = Math.abs(y - rc);
    if (dx <= halfRoad || dy <= halfRoad) {
      h = Math.max(h, 0.11);
      break;
    } else if (dx <= halfSw || dy <= halfSw) {
      h = Math.max(h, 0.08);
    }
  }

  // Roundabout outer ring apron
  const rbDist = Math.hypot(x - map.roundabout.x, y - map.roundabout.y);
  if (rbDist <= map.roundabout.outerR) {
    h = Math.max(h, 0.12);
  }

  // Parks, cricket ground & temple courtyard
  const cp = map.centralPark;
  if (x >= cp.x && x <= cp.x + cp.w && y >= cp.y && y <= cp.y + cp.h) {
    const parkCx = cp.x + cp.w * 0.5;
    const parkCy = cp.y + cp.h * 0.5;
    if (Math.hypot(x - parkCx, y - parkCy) <= 45) {
      h = Math.max(h, 0.55); // Gazebo stone plinth
    } else {
      h = Math.max(h, 0.07);
    }
  }
  const cf = map.cricketField;
  if (x >= cf.x && x <= cf.x + cf.w && y >= cf.y && y <= cf.y + cf.h) {
    h = Math.max(h, 0.06);
  }
  const tp = map.templePlaza;
  if (x >= tp.x && x <= tp.x + tp.w && y >= tp.y && y <= tp.y + tp.h) {
    h = Math.max(h, 0.06);
  }

  // Walkable / drivable Stunt Ramp slope (length 8.0m = 80 units, width 4.4m = 44 units)
  for (let i = 0; i < map.stuntRamps.length; i++) {
    const rm = map.stuntRamps[i];
    const dx = x - rm.x;
    const dy = y - rm.y;
    if (dx * dx + dy * dy > 3200) continue;
    const cos = Math.cos(rm.angle);
    const sin = Math.sin(rm.angle);
    // Project onto ramp forward & lateral axes
    const along = dx * cos + dy * sin; // -40 (bottom) to +40 (lip)
    const side = -dx * sin + dy * cos; // -22 to +22
    if (along >= -40 && along <= 40 && Math.abs(side) <= 22) {
      const t = (along + 40) / 80;
      const rampH = 0.14 + t * 2.26;
      if (currentH >= rampH - 0.85) {
        h = Math.max(h, rampH);
      }
    }
  }

  return h;
}

export function clampCameraRayBuildings(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  camHeightM: number,
  buildings: BuildingRect[]
): number {
  const steps = 10;
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const sx = x1 + (x2 - x1) * t;
    const sy = y1 + (y2 - y1) * t;
    const grid = getBuildingGrid(buildings);
    const cx = Math.max(0, Math.min(grid.cols - 1, Math.floor(sx / grid.cellSize)));
    const cy = Math.max(0, Math.min(grid.cols - 1, Math.floor(sy / grid.cellSize)));
    const bucket = grid.cells[cy * grid.cols + cx];
    for (let i = 0; i < bucket.length; i++) {
      const b = bucket[i];
      const bHeightM = b.floors * 3.8 + 1.2;
      if (camHeightM > bHeightM) continue;
      if (sx >= b.x - 10 && sx <= b.x + b.w + 10 && sy >= b.y - 10 && sy <= b.y + b.h + 10) {
        return Math.max(0.24, (s - 1) / steps);
      }
    }
  }
  return 1;
}

export function getNearestDistrict(x: number, y: number) {
  let best = DISTRICTS[0];
  let bestDist = Infinity;
  for (const d of DISTRICTS) {
    const dist = (d.x - x) ** 2 + (d.y - y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return best;
}
