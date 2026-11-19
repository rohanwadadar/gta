export type CharacterId = 'motu' | 'patlu' | 'oggy' | 'bheem' | 'chingum';

export type VehicleType = 'auto' | 'bullet' | 'ambassador' | 'truck' | 'thar' | 'police';

export type WeaponId = 'pistol' | 'smg' | 'shotgun' | 'ak47' | 'bat';

export type DecalId = 'none' | 'horn_ok' | 'marigold' | 'tricolor' | 'tiger' | 'nazar_battu';

export type HornType = 'classic' | 'auto_peepoo' | 'musical_truck' | 'bullet_thump' | 'police_chirp';

export type MissionType = 'delivery' | 'collect' | 'race' | 'takedown';

export type MissionDifficulty = 'Easy' | 'Medium' | 'Desi Chaos';

export type EmoteId =
  | 'wave'
  | 'greeting'
  | 'handshake'
  | 'high_five'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'point_forward'
  | 'point_object'
  | 'clap'
  | 'hands_hips'
  | 'facepalm'
  | 'laugh'
  | 'dance'
  | 'celebrate'
  | 'salute'
  | 'goodbye'
  | 'shrug'
  | 'sit';

export interface EmoteMeta {
  id: EmoteId;
  label: string;
  short: string;
  category: 'social' | 'express' | 'action';
  duration: number; // 0 = loops until moved/cancelled
}

export const EMOTE_LIST: EmoteMeta[] = [
  { id: 'wave', label: 'Wave Hello', short: 'Wave', category: 'social', duration: 2.6 },
  { id: 'greeting', label: 'Hi / Namaste', short: 'Namaste', category: 'social', duration: 2.5 },
  { id: 'handshake', label: 'Handshake', short: 'Shake', category: 'social', duration: 2.4 },
  { id: 'high_five', label: 'High Five', short: 'Hi-5', category: 'social', duration: 2.1 },
  { id: 'goodbye', label: 'Goodbye Wave', short: 'Bye', category: 'social', duration: 2.6 },
  { id: 'salute', label: 'Salute', short: 'Salute', category: 'social', duration: 2.4 },
  { id: 'thumbs_up', label: 'Thumbs Up', short: 'Nice!', category: 'express', duration: 2.2 },
  { id: 'thumbs_down', label: 'Thumbs Down', short: 'Nope', category: 'express', duration: 2.2 },
  { id: 'point_forward', label: 'Point Forward', short: 'Ahead', category: 'express', duration: 2.2 },
  { id: 'point_object', label: 'Point at Object', short: 'Look', category: 'express', duration: 2.3 },
  { id: 'clap', label: 'Clap Hands', short: 'Clap', category: 'express', duration: 3.0 },
  { id: 'shrug', label: 'Shrug', short: 'Shrug', category: 'express', duration: 2.1 },
  { id: 'hands_hips', label: 'Hands on Hips', short: 'Boss', category: 'action', duration: 0 },
  { id: 'facepalm', label: 'Facepalm', short: 'Bruh', category: 'action', duration: 2.4 },
  { id: 'laugh', label: 'Laughing', short: 'Haha', category: 'action', duration: 3.0 },
  { id: 'dance', label: 'Desi Dance', short: 'Dance', category: 'action', duration: 0 },
  { id: 'celebrate', label: 'Celebrate', short: 'Party', category: 'action', duration: 3.2 },
  { id: 'sit', label: 'Sit & Relax', short: 'Relax', category: 'action', duration: 0 },
];

export interface VehicleCustomConfig {
  paintId: string;
  decalId: DecalId;
  engineLevel: number; // 1..4
  handlingLevel: number; // 1..4
  armorLevel: number; // 1..4
  hornType: HornType;
}

export interface PlayerStats {
  distanceKm: number;
  missionsDone: number;
  samosasEaten: number;
  kills: number;
}

export interface PlayerProfile {
  uid: string;
  name: string;
  characterId: CharacterId;
  rupees: number;
  xp: number;
  level: number;
  ownedVehicles: VehicleType[];
  activeVehicleType: VehicleType;
  garageConfigs: Record<VehicleType, VehicleCustomConfig>;
  completedMissionIds: string[];
  stats: PlayerStats;
  updatedAt: number;
}

export interface RemotePlayerState {
  uid: string;
  name: string;
  characterId: CharacterId;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  inVehicleType: VehicleType | null;
  vehicleConfig: VehicleCustomConfig | null;
  weaponId: WeaponId;
  specialActive: boolean;
  specialTimer: number;
  wantedLevel: number;
  hp: number;
  maxHp: number;
  emote?: EmoteId | null;
  emoteTime?: number;
  lastSeen: number;
}

export interface CommunityMission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  authorUid: string;
  authorName: string;
  districtId: string;
  targetDistrictId: string;
  reward: number;
  difficulty: MissionDifficulty;
  upvotes: number;
  completions: number;
  createdAt: number;
  isOfficial?: boolean;
}

export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  characterId: CharacterId;
  text: string;
  timestamp: number;
  system?: boolean;
}

export interface DistrictDef {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  color: string;
}

export const WORLD_SIZE = 5600;
export const SPAWN_X = 2800;
export const SPAWN_Y = 2980;

export const DISTRICTS: DistrictDef[] = [
  { id: 'chai_chowk', name: 'Chai Chowk', subtitle: 'Central Hub', x: 2800, y: 2800, color: '#f59e0b' },
  { id: 'downtown_commercial', name: 'Downtown Plaza', subtitle: 'Business Towers', x: 2400, y: 1600, color: '#38bdf8' },
  { id: 'furfuri_bazaar', name: 'Furfuri Bazaar', subtitle: 'Local Market', x: 1600, y: 1600, color: '#ef4444' },
  { id: 'raju_garage', name: "Raju's Garage", subtitle: 'Custom & Fuel', x: 3200, y: 1600, color: '#10b981' },
  { id: 'modern_apartments', name: 'Skyline Heights', subtitle: 'Modern Apartments', x: 4000, y: 2400, color: '#818cf8' },
  { id: 'bada_maidan', name: 'Bada Maidan', subtitle: 'Cricket Stadium', x: 1600, y: 3200, color: '#22c55e' },
  { id: 'police_thana', name: 'Police Thana', subtitle: 'Chingum HQ', x: 4000, y: 3200, color: '#3b82f6' },
  { id: 'dholakpur_highway', name: 'Ring Highway', subtitle: 'Outskirts & Drag', x: 2800, y: 680, color: '#f97316' },
  { id: 'temple_square', name: 'Temple Square', subtitle: 'Surya Mandir', x: 800, y: 2400, color: '#eab308' },
  { id: 'gali_colony', name: 'Shanti Vihar', subtitle: 'Residential Homes', x: 4800, y: 2400, color: '#ec4899' },
  { id: 'central_park', name: 'Central Park', subtitle: 'Green Gardens', x: 3200, y: 4000, color: '#4ade80' },
  { id: 'industrial_area', name: 'Loha Industrial', subtitle: 'Factories & Yard', x: 4800, y: 4400, color: '#94a3b8' },
  { id: 'petrol_plaza', name: 'Highway Petrol', subtitle: 'Fuel & Dhaba', x: 1200, y: 680, color: '#fb923c' },
  { id: 'clock_tower', name: 'Ghanta Ghar', subtitle: 'Old Heritage Town', x: 2400, y: 4800, color: '#a855f7' },
];

export function createDefaultVehicleConfig(type: VehicleType): VehicleCustomConfig {
  switch (type) {
    case 'auto':
      return { paintId: 'kaali_peeli', decalId: 'horn_ok', engineLevel: 1, handlingLevel: 1, armorLevel: 1, hornType: 'auto_peepoo' };
    case 'bullet':
      return { paintId: 'royal_maroon', decalId: 'tricolor', engineLevel: 1, handlingLevel: 1, armorLevel: 1, hornType: 'bullet_thump' };
    case 'ambassador':
      return { paintId: 'saffron_gold', decalId: 'marigold', engineLevel: 1, handlingLevel: 1, armorLevel: 1, hornType: 'classic' };
    case 'truck':
      return { paintId: 'rajasthani_pink', decalId: 'horn_ok', engineLevel: 1, handlingLevel: 1, armorLevel: 2, hornType: 'musical_truck' };
    case 'thar':
      return { paintId: 'midnight_desi', decalId: 'tiger', engineLevel: 1, handlingLevel: 1, armorLevel: 2, hornType: 'classic' };
    case 'police':
      return { paintId: 'police_khaki', decalId: 'none', engineLevel: 2, handlingLevel: 2, armorLevel: 2, hornType: 'police_chirp' };
  }
}

export function createDefaultProfile(uid: string, name?: string, characterId: CharacterId = 'motu'): PlayerProfile {
  const cleanUid = uid.trim().toUpperCase().slice(0, 16) || `IND-${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    uid: cleanUid,
    name: (name?.trim() || `Hero_${cleanUid.slice(-4)}`).slice(0, 18),
    characterId,
    rupees: 2000,
    xp: 0,
    level: 1,
    ownedVehicles: ['auto', 'bullet'],
    activeVehicleType: 'auto',
    garageConfigs: {
      auto: createDefaultVehicleConfig('auto'),
      bullet: createDefaultVehicleConfig('bullet'),
      ambassador: createDefaultVehicleConfig('ambassador'),
      truck: createDefaultVehicleConfig('truck'),
      thar: createDefaultVehicleConfig('thar'),
      police: createDefaultVehicleConfig('police'),
    },
    completedMissionIds: [],
    stats: {
      distanceKm: 0,
      missionsDone: 0,
      samosasEaten: 0,
      kills: 0,
    },
    updatedAt: Date.now(),
  };
}

export const INITIAL_OFFICIAL_MISSIONS: CommunityMission[] = [
  {
    id: 'mis-john-don-chase',
    title: 'Take Down John the Don',
    description: 'John stole Motu\'s lunch box. Wreak comedic chaos on 2 rogue getaway cars!',
    type: 'takedown',
    authorUid: 'FURFURI-HQ',
    authorName: 'Inspector Chingum',
    districtId: 'clock_tower',
    targetDistrictId: 'police_thana',
    reward: 1500,
    difficulty: 'Desi Chaos',
    upvotes: 64,
    completions: 49,
    createdAt: 1735700400000,
    isOfficial: true,
  },
  {
    id: 'mis-chai-express',
    title: 'Cutting Chai Express',
    description: 'Deliver boiling masala chai before it turns into iced tea. Traffic rules optional.',
    type: 'delivery',
    authorUid: 'FURFURI-HQ',
    authorName: 'Chaiwala Uncle',
    districtId: 'chai_chowk',
    targetDistrictId: 'furfuri_bazaar',
    reward: 700,
    difficulty: 'Easy',
    upvotes: 42,
    completions: 128,
    createdAt: 1735689600000,
    isOfficial: true,
  },
  {
    id: 'mis-samosa-hunt',
    title: 'Golden Samosa Stash',
    description: 'Grab 6 secret crispy samosa stashes before the street cows find them first.',
    type: 'collect',
    authorUid: 'FURFURI-HQ',
    authorName: 'Motu Bhai',
    districtId: 'furfuri_bazaar',
    targetDistrictId: 'furfuri_bazaar',
    reward: 850,
    difficulty: 'Easy',
    upvotes: 58,
    completions: 94,
    createdAt: 1735693200000,
    isOfficial: true,
  },
  {
    id: 'mis-auto-grand-prix',
    title: 'Highway Auto GP',
    description: 'Prove a 3-wheeled auto-rickshaw belongs in Formula 1 across 5 checkpoints.',
    type: 'race',
    authorUid: 'FURFURI-HQ',
    authorName: 'Raju Mechanic',
    districtId: 'dholakpur_highway',
    targetDistrictId: 'raju_garage',
    reward: 1150,
    difficulty: 'Medium',
    upvotes: 37,
    completions: 61,
    createdAt: 1735696800000,
    isOfficial: true,
  },
  {
    id: 'mis-laddu-supply',
    title: 'Emergency Laddu Airlift',
    description: 'Bheem is hangry! Rush emergency festive laddus to Bada Maidan immediately.',
    type: 'delivery',
    authorUid: 'FURFURI-HQ',
    authorName: 'Tun Tun Mausi',
    districtId: 'temple_square',
    targetDistrictId: 'bada_maidan',
    reward: 800,
    difficulty: 'Easy',
    upvotes: 31,
    completions: 77,
    createdAt: 1735704000000,
    isOfficial: true,
  },
  {
    id: 'mis-midnight-stunt-tour',
    title: 'Chai Chowk Stunt Tour',
    description: 'Blast through 5 city stunt checkpoints. Your driving license may not survive.',
    type: 'race',
    authorUid: 'FURFURI-HQ',
    authorName: 'Oggy Stuntman',
    districtId: 'chai_chowk',
    targetDistrictId: 'bada_maidan',
    reward: 1250,
    difficulty: 'Medium',
    upvotes: 49,
    completions: 53,
    createdAt: 1735708000000,
    isOfficial: true,
  },
];
