import { CharacterId, DecalId, HornType, VehicleType } from '../shared/types';

export const TITLE_KEY_ART_URL = '/src/assets/images/title_key_art_1795066928422.jpg';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  tagline: string;
  portraitUrl: string;
  primaryColor: string;
  secondaryColor: string;
  skinColor: string;
  accentColor: string;
  maxHp: number;
  footSpeed: number;
  specialName: string;
  specialDesc: string;
  specialCooldown: number; // seconds
  specialDuration: number; // seconds
  passiveTrait: string;
  quip: string;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  motu: {
    id: 'motu',
    name: 'Motu',
    tagline: 'Samosa Powerhouse',
    portraitUrl: '/src/assets/images/char_motu_1795066929915.jpg',
    primaryColor: '#dc2626',
    secondaryColor: '#1f2937',
    skinColor: '#d99662',
    accentColor: '#f59e0b',
    maxHp: 120,
    footSpeed: 188,
    specialName: 'Samosa Rage',
    specialDesc: '+55% Speed, +25 HP Heal & Heavy Smash Knockback for 6s',
    specialCooldown: 11,
    specialDuration: 6,
    passiveTrait: '2x Cash & Energy from Samosa Pickups',
    quip: 'Khali pet mere dimaag ki batti nahi jalti!',
  },
  patlu: {
    id: 'patlu',
    name: 'Patlu',
    tagline: 'Empty-Stomach Genius',
    portraitUrl: '/src/assets/images/char_patlu_1795066927099.jpg',
    primaryColor: '#eab308',
    secondaryColor: '#0f766e',
    skinColor: '#d4905c',
    accentColor: '#38bdf8',
    maxHp: 95,
    footSpeed: 205,
    specialName: 'Idea EMP Pulse',
    specialDesc: 'Stalls nearby Police & Traffic for 4.5s + Magnetizes Loot',
    specialCooldown: 10,
    specialDuration: 4.5,
    passiveTrait: '+25% Mission ₹ Payout & Extended Radar',
    quip: 'Idea! Mere paas ek zabardast plan hai!',
  },
  oggy: {
    id: 'oggy',
    name: 'Oggy',
    tagline: 'Desi Street Cat',
    portraitUrl: '/src/assets/images/char_oggy_1795066926284.jpg',
    primaryColor: '#38bdf8',
    secondaryColor: '#ef4444',
    skinColor: '#7dd3fc',
    accentColor: '#fb923c',
    maxHp: 100,
    footSpeed: 230,
    specialName: 'Swatter Dash',
    specialDesc: 'High-speed Invincible Dash + Giant Fly-Swatter Spinout Arc',
    specialCooldown: 6.5,
    specialDuration: 1.4,
    passiveTrait: 'Fastest Foot Sprint & Instant Vehicle Hijack',
    quip: 'Zai-zai-zai! Ab aayega mazaa!',
  },
  bheem: {
    id: 'bheem',
    name: 'Bheem',
    tagline: 'Dholakpur Strongman',
    portraitUrl: '/src/assets/images/char_bheem_1795066930288.jpg',
    primaryColor: '#f97316',
    secondaryColor: '#facc15',
    skinColor: '#c78350',
    accentColor: '#fbbf24',
    maxHp: 145,
    footSpeed: 198,
    specialName: 'Laddu Super Slam',
    specialDesc: 'Shockwave flips nearby cars + 60% Super Armor for 6s',
    specialCooldown: 12,
    specialDuration: 6,
    passiveTrait: 'Highest Max HP (145) & Heavy Ramming Force',
    quip: 'Laddu khaya, ab koi nahi rok sakta!',
  },
  chingum: {
    id: 'chingum',
    name: 'Chingum',
    tagline: 'Super Cop Inspector',
    portraitUrl: '/src/assets/images/char_chingum_1795066926536.jpg',
    primaryColor: '#bfa06b',
    secondaryColor: '#991b1b',
    skinColor: '#c98552',
    accentColor: '#60a5fa',
    maxHp: 115,
    footSpeed: 202,
    specialName: 'Chingum Whistle',
    specialDesc: 'Clears ALL Wanted Stars, Parts Traffic & 5s Siren Turbo',
    specialCooldown: 13,
    specialDuration: 5,
    passiveTrait: '50% Slower Wanted Buildup & Siren Priority',
    quip: 'Chingum ke chungul se bachna impossible!',
  },
};

export const CHARACTER_LIST: CharacterDef[] = [
  CHARACTERS.motu,
  CHARACTERS.patlu,
  CHARACTERS.oggy,
  CHARACTERS.bheem,
  CHARACTERS.chingum,
];

export interface VehicleSpec {
  type: VehicleType;
  name: string;
  subtitle: string;
  price: number;
  width: number;
  length: number;
  maxSpeed: number;
  accel: number;
  turnRate: number;
  maxHp: number;
  mass: number;
  driftGrip: number;
}

export const VEHICLE_SPECS: Record<VehicleType, VehicleSpec> = {
  auto: {
    type: 'auto',
    name: 'Bajaj Auto-Rickshaw',
    subtitle: 'Nimble 3-Wheeler King of Bazaar',
    price: 0,
    width: 28,
    length: 44,
    maxSpeed: 370,
    accel: 340,
    turnRate: 3.5,
    maxHp: 110,
    mass: 1.0,
    driftGrip: 0.91,
  },
  bullet: {
    type: 'bullet',
    name: 'Desi Bullet 350',
    subtitle: 'Thumping Classic Cruiser Bike',
    price: 0,
    width: 18,
    length: 40,
    maxSpeed: 470,
    accel: 460,
    turnRate: 4.1,
    maxHp: 85,
    mass: 0.65,
    driftGrip: 0.94,
  },
  ambassador: {
    type: 'ambassador',
    name: 'Kaali-Peeli Ambassador',
    subtitle: 'Iconic Heritage Street Taxi',
    price: 1800,
    width: 34,
    length: 58,
    maxSpeed: 420,
    accel: 320,
    turnRate: 2.9,
    maxHp: 165,
    mass: 1.6,
    driftGrip: 0.89,
  },
  thar: {
    type: 'thar',
    name: 'Desi Thar 4x4',
    subtitle: 'Open-Top Offroad Drift Beast',
    price: 3200,
    width: 36,
    length: 60,
    maxSpeed: 460,
    accel: 390,
    turnRate: 3.2,
    maxHp: 210,
    mass: 2.1,
    driftGrip: 0.86,
  },
  truck: {
    type: 'truck',
    name: 'Horn OK Please Truck',
    subtitle: 'Decorated Highway Juggernaut',
    price: 4500,
    width: 44,
    length: 84,
    maxSpeed: 355,
    accel: 230,
    turnRate: 2.1,
    maxHp: 340,
    mass: 3.8,
    driftGrip: 0.92,
  },
  police: {
    type: 'police',
    name: 'Chingum Gypsy 4x4',
    subtitle: 'High-Speed Thana Interceptor',
    price: 5500,
    width: 34,
    length: 58,
    maxSpeed: 495,
    accel: 430,
    turnRate: 3.3,
    maxHp: 230,
    mass: 2.0,
    driftGrip: 0.9,
  },
};

export interface PaintJob {
  id: string;
  name: string;
  body: string;
  roof: string;
  trim: string;
  price: number;
}

export const PAINT_JOBS: PaintJob[] = [
  { id: 'kaali_peeli', name: 'Kaali-Peeli Classic', body: '#1f2937', roof: '#facc15', trim: '#f59e0b', price: 0 },
  { id: 'delhi_green', name: 'Delhi Auto Green', body: '#15803d', roof: '#facc15', trim: '#fde047', price: 250 },
  { id: 'saffron_gold', name: 'Saffron Marigold', body: '#ea580c', roof: '#fbbf24', trim: '#fef08a', price: 350 },
  { id: 'rajasthani_pink', name: 'Jaipur Pink Art', body: '#db2777', roof: '#fde047', trim: '#22d3ee', price: 450 },
  { id: 'royal_maroon', name: 'Royal Bullet Maroon', body: '#881337', roof: '#f59e0b', trim: '#e2e8f0', price: 400 },
  { id: 'midnight_desi', name: 'Midnight Stealth', body: '#0f172a', roof: '#334155', trim: '#f97316', price: 600 },
  { id: 'police_khaki', name: 'Thana Khaki White', body: '#f8fafc', roof: '#1d4ed8', trim: '#dc2626', price: 500 },
];

export interface DecalOption {
  id: DecalId;
  name: string;
  tagline: string;
  price: number;
}

export const DECAL_OPTIONS: DecalOption[] = [
  { id: 'none', name: 'Clean Factory', tagline: 'No extra street art', price: 0 },
  { id: 'horn_ok', name: 'HORN OK PLEASE', tagline: 'Classic painted rear & roof banner', price: 200 },
  { id: 'marigold', name: 'Marigold Garland', tagline: 'Fresh orange-yellow hood mala', price: 300 },
  { id: 'tricolor', name: 'Tiranga Stripes', tagline: 'Saffron, white & green racing stripes', price: 350 },
  { id: 'tiger', name: 'Royal Bengal Claw', tagline: 'Bold golden street decals', price: 500 },
  { id: 'nazar_battu', name: 'Nimbu-Mirchi Charm', tagline: 'Buri Nazar Wale Tera Muh Kala bumper', price: 400 },
];

export interface HornOption {
  id: HornType;
  name: string;
  price: number;
}

export const HORN_OPTIONS: HornOption[] = [
  { id: 'auto_peepoo', name: 'Auto Pee-Poo', price: 0 },
  { id: 'classic', name: 'Ambassador Bulb', price: 150 },
  { id: 'bullet_thump', name: 'Bullet Dug-Dug Rev', price: 250 },
  { id: 'musical_truck', name: 'Desi Musical Truck', price: 450 },
  { id: 'police_chirp', name: 'Chingum Siren Chirp', price: 600 },
];

export const QUICK_CHAT_PHRASES = [
  'Samosa lao bhai!',
  'Horn OK Please!',
  'Meet at Chai Chowk!',
  'Race on Highway?',
  'Chingum aa raha hai!',
  'Check my new ride at Garage!',
];

export function getPaintJob(id?: string): PaintJob {
  return PAINT_JOBS.find((p) => p.id === id) || PAINT_JOBS[0];
}
