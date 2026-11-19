import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CharacterId,
  CommunityMission,
  DISTRICTS,
  EMOTE_LIST,
  EmoteId,
  PlayerProfile,
  RemotePlayerState,
  SPAWN_X,
  SPAWN_Y,
  VehicleCustomConfig,
  VehicleType,
  WORLD_SIZE,
  WeaponId,
  createDefaultVehicleConfig,
} from '../shared/types';
import { soundEngine } from './audio';
import { CHARACTERS, VEHICLE_SPECS } from './constants';
import { NpcSocialBehavior, animateHumanRig } from './animation';
import {
  BenchSpot,
  CHUNK_SIZE,
  CityMapData,
  ROAD_CENTERS,
  ROAD_WIDTH,
  clampCameraRayBuildings,
  generateCityMap,
  getGroundHeightAt,
  getNearestDistrict,
  pointHitsBuilding,
  resolveCapsuleCollision,
} from './mapGenerator';
import {
  CharacterRig3D,
  PropKind,
  TrafficLight3D,
  VehicleMesh3D,
  WORLD_SCALE,
  createAtmMachine3D,
  createBench3D,
  createBuilding3D,
  createBusShelter3D,
  createCharacter3D,
  createCloudCluster3D,
  createDroppedWeapon3D,
  createEasterEgg3D,
  createGarbageBin3D,
  createGrabbableProp3D,
  createMuzzleFlash3D,
  createNameplateSprite,
  createParkGazebo3D,
  createPetrolStation3D,
  createPickup3D,
  createRoadSign3D,
  createStreetLamp3D,
  createStreetStall3D,
  createStuntRamp3D,
  createSunsetSkyDome,
  createTrafficLight3D,
  createTree3D,
  createUtilityPole3D,
  createVehicle3D,
  createVendorCart3D,
  setRigWeaponVisual,
} from './models3d';
import {
  createGrassTexture,
  createGroundTexture,
  createIntersectionCrosswalkTexture,
  createParkingLotTexture,
  createPuddleTexture,
  createRoadTextures,
  createSidewalkTexture,
} from './textures3d';
import { TimeOfDay, WeatherSystem, WeatherType } from './weather';
import {
  EASTER_EGG_SECRETS,
  RandomCityEventDef,
  randomCityEvent,
  randomCowLine,
  randomCrashLine,
  randomHonkReaction,
  randomKoLine,
  randomMissionQuip,
  randomNpcBanter,
  randomStuntLanding,
  randomStuntLaunch,
  randomWantedLine,
  randomWastedSubtitle,
} from './comedy';

export type { TimeOfDay, WeatherType };
export type MapStationKind = 'atm' | 'chai' | 'arms';
export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface MapPoiData {
  garage: { x: number; y: number };
  stations: { id: string; kind: MapStationKind; name: string; x: number; y: number }[];
  ramps: { id: string; label: string; x: number; y: number }[];
  easterEggs: { id: string; x: number; y: number; found: boolean }[];
  player: { x: number; y: number; angle: number };
  waypoint: { x: number; y: number; label: string } | null;
  activeMissionTarget: { x: number; y: number; label: string } | null;
}

export interface ActiveMissionRuntime {
  mission: CommunityMission;
  stage: 'pickup' | 'deliver' | 'collect' | 'race' | 'takedown';
  objectiveText: string;
  targetX: number;
  targetY: number;
  timeLeft: number;
  progress: number;
  total: number;
  checkpoints: { x: number; y: number; done: boolean }[];
}

export interface ContextAction {
  kind: 'ride' | 'loot' | 'disarm' | 'grab' | 'throw' | 'garage' | 'atm' | 'chai' | 'arms' | 'talk' | 'sit';
  label: string;
  keyHint: string;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  rupees: number;
  xp: number;
  level: number;
  kills: number;
  wantedLevel: number;
  speedKmh: number;
  inVehicleType: VehicleType | null;
  vehicleHp: number;
  vehicleMaxHp: number;
  vehicleName: string | null;
  nearVehicleName: string | null;
  nearGarage: boolean;
  districtName: string;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  graphicsQuality: GraphicsQuality;
  playerX: number;
  playerY: number;
  waypoint: { x: number; y: number; label: string } | null;
  weaponId: WeaponId;
  ownedWeapons: Record<WeaponId, boolean>;
  weaponAmmo: Record<WeaponId, number>;
  magAmmo: number;
  magSize: number;
  reloading: boolean;
  easterEggsFound: number;
  easterEggsTotal: number;
  activeEvent: { title: string; subtitle: string; timeLeft: number } | null;
  cameraMode: number;
  aiming: boolean;
  crouching: boolean;
  holdingProp: PropKind | null;
  activeEmote: EmoteId | null;
  sittingBench: boolean;
  hitMarker: boolean;
  pointerLocked: boolean;
  contextAction: ContextAction | null;
  specialCooldown: number;
  specialMaxCooldown: number;
  specialActive: boolean;
  specialTimer: number;
  activeMission: {
    title: string;
    objectiveText: string;
    timeLeft: number;
    progress: number;
    total: number;
    distanceM: number;
  } | null;
  killFeed: string | null;
  wasted: boolean;
  wastedSubtitle: string;
}

interface MapStation {
  id: string;
  kind: MapStationKind;
  name: string;
  x: number;
  y: number;
  angle: number;
  cooldown: number;
}

interface StuntRamp {
  id: string;
  label: string;
  x: number;
  y: number;
  angle: number;
}

interface WorldVehicle {
  id: string;
  type: VehicleType;
  x: number;
  y: number;
  h: number;
  vh: number;
  inAir: boolean;
  airTime: number;
  rampCooldown: number;
  angle: number;
  speed: number;
  vx: number;
  vy: number;
  steerSmooth: number;
  bodyRoll: number;
  bodyPitch: number;
  hp: number;
  maxHp: number;
  config: VehicleCustomConfig;
  isTraffic: boolean;
  isPolice: boolean;
  isMissionTarget: boolean;
  isPlayerPersonal: boolean;
  stalledTimer: number;
  laneAxis: 'x' | 'y';
  laneDir: 1 | -1;
  laneLine: number;
  hitFlash: number;
  mesh: VehicleMesh3D;
}

interface WorldNpc {
  id: string;
  role: 'ped' | 'gangster' | 'police' | 'cow';
  carriedWeapon: WeaponId | null;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  fallTimer: number;
  fallDirX: number;
  fallDirZ: number;
  scaredTimer: number;
  shootCooldown: number;
  walkCycle: number;
  behavior: NpcSocialBehavior;
  behaviorTimer: number;
  benchId: string | null;
  rig: CharacterRig3D;
}

interface WorldProp {
  id: string;
  kind: PropKind;
  x: number;
  y: number;
  h: number;
  vx: number;
  vy: number;
  vh: number;
  spin: number;
  state: 'idle' | 'held' | 'thrown' | 'respawning';
  respawnTimer: number;
  originX: number;
  originY: number;
  mesh: THREE.Group;
}

interface DroppedWeapon {
  id: string;
  weaponId: WeaponId;
  ammo: number;
  x: number;
  y: number;
  life: number;
  mesh: THREE.Group;
}

interface Projectile3D {
  active: boolean;
  x: number;
  y: number;
  h: number;
  vx: number;
  vy: number;
  vh: number;
  life: number;
  damage: number;
  fromPlayer: boolean;
  fromNpc: boolean;
  ownerUid: string;
  mesh: THREE.Mesh;
}

interface Particle3D {
  active: boolean;
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  gravity: number;
  isRing?: boolean;
}

interface EasterEggSpot {
  id: string;
  x: number;
  y: number;
  secretIndex: number;
  found: boolean;
  mesh: THREE.Group;
}

interface InterpolatedRemote {
  uid: string;
  name: string;
  characterId: CharacterId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  targetAngle: number;
  inVehicleType: VehicleType | null;
  vehicleConfig: VehicleCustomConfig | null;
  weaponId: WeaponId;
  specialActive: boolean;
  wantedLevel: number;
  hp: number;
  lastUpdate: number;
  emote: EmoteId | null;
  emoteTime: number;
  rig: CharacterRig3D;
  vehMesh: VehicleMesh3D | null;
  vehKey: string;
  label: THREE.Sprite;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onProfileMutated: (profile: PlayerProfile) => void;
  onSendNetState: (state: Omit<RemotePlayerState, 'uid' | 'lastSeen'>) => void;
  onSendSpecial: (charId: CharacterId, x: number, y: number) => void;
  onSendShoot: (weaponId: WeaponId, x: number, y: number, angle: number) => void;
  onSendPvpHit: (targetUid: string, damage: number) => void;
  onSendHorn: (hornType: string, x: number, y: number) => void;
  onMissionFinished: (mission: CommunityMission, bonusRupees: number) => void;
  onMissionFailed: (mission: CommunityMission, reason: string) => void;
  onOpenGarageRequested: () => void;
}

const WEAPON_LABELS: Record<WeaponId, string> = {
  bat: 'Bat',
  pistol: 'Pistol',
  smg: 'SMG',
  shotgun: 'Shotgun',
  ak47: 'AK-47',
};

const PROP_LABELS: Record<PropKind, string> = {
  barrel: 'Gas Barrel',
  crate: 'Chai Crate',
  cone: 'Cone',
  tire: 'Tire',
};

const WEAPON_AMMO_GRANT: Record<WeaponId, number> = {
  bat: 999,
  pistol: 999,
  smg: 60,
  shotgun: 18,
  ak47: 45,
};

const WEAPON_MAG_SIZE: Record<WeaponId, number> = {
  bat: 999,
  pistol: 12,
  smg: 30,
  shotgun: 6,
  ak47: 25,
};

const PARTICLE_POOL_SIZE = 72;
const RING_POOL_SIZE = 14;
const PROJECTILE_POOL_SIZE = 32;

// Reusable temp vectors & collider scratch (Zero GC inside render loop)
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _colOut = { x: 0, y: 0, hit: false, hitBuilding: false };
const _projGeo = new THREE.SphereGeometry(0.14, 8, 8);
const _partGeo = new THREE.SphereGeometry(0.22, 8, 8);
const _ringGeo = new THREE.RingGeometry(0.7, 1.0, 28);
_ringGeo.rotateX(-Math.PI / 2);

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class FurfuriGameEngine {
  private mountEl: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private hemiLight!: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private skyDome!: THREE.Mesh;
  private weatherSystem!: WeatherSystem;
  private isSoftwareGl: boolean;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;

  private map: CityMapData;
  private callbacks: EngineCallbacks;
  private profile: PlayerProfile;

  // Loop & State
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private destroyed = false;
  public paused = false;
  public ecoMode = false;
  public graphicsQuality: GraphicsQuality = 'medium';
  public titlePreviewMode = true;

  // Player state (2D world coords x,y map cleanly to 3D X = x*0.1, Z = y*0.1)
  private px = SPAWN_X;
  private py = SPAWN_Y;
  private pHeight = 0; // vertical jump height in 3D meters
  private pVelY = 0;
  private pAngle = -Math.PI / 2;
  private pvx = 0;
  private pvy = 0;
  private crouching = false;
  private sittingBenchId: string | null = null;
  private activeEmote: EmoteId | null = null;
  private emoteTimer = 0;
  private emoteElapsed = 0;
  private vehicleEnterTransition: { target: WorldVehicle; t: number; startX: number; startY: number } | null = null;
  private hp = 120;
  private maxHp = 120;
  private armor = 50;
  private maxArmor = 100;
  private stumbleTimer = 0;
  private wantedLevel = 0;
  private wantedDecayTimer = 0;
  private currentVehicle: WorldVehicle | null = null;
  private walkCycle = 0;
  private wasted = false;
  private wastedTimer = 0;
  private wastedSubtitle = 'Chai Chowk doctors prescribed two hot samosas.';

  // Combat, Weapons, Reloading & Interactive Sandbox
  private weaponId: WeaponId = 'pistol';
  private ownedWeapons: Record<WeaponId, boolean> = {
    bat: true,
    pistol: true,
    smg: false,
    shotgun: false,
    ak47: false,
  };
  private weaponAmmo: Record<WeaponId, number> = {
    bat: 999,
    pistol: 999,
    smg: 0,
    shotgun: 0,
    ak47: 0,
  };
  private magAmmo: Record<WeaponId, number> = {
    bat: 999,
    pistol: 12,
    smg: 30,
    shotgun: 6,
    ak47: 25,
  };
  private reloadTimer = 0;
  private recoilKick = 0;
  private muzzleFlash!: THREE.Group;
  private muzzleFlashTimer = 0;
  private heldProp: WorldProp | null = null;
  private attackCooldown = 0;
  private attackSwingTimer = 0;
  private hitMarkerTimer = 0;
  private specialCooldown = 0;
  private specialActiveTimer = 0;
  private oggyDashAngle = 0;
  private killFeedText: string | null = null;
  private killFeedTimer = 0;
  private crashQuipCooldown = 0;
  private vehicleSmokeAccum = 0;

  // Unexpected Funny City Events & Hidden Easter Eggs
  private activeCityEvent: { def: RandomCityEventDef; timeLeft: number } | null = null;
  private nextCityEventTimer = 26;
  private easterEggs: EasterEggSpot[] = [];

  // Smooth 360° Free-Look & BGMI ADS Camera
  private camYaw = Math.PI;
  private camPitch = 0.24; // vertical tilt radians (-0.22 look up to 0.72 look down)
  private freeLookYaw = 0;
  private freeLookPitch = 0;
  private freeLookActive = false;
  private aiming = false;
  private camMode = 0; // 0 = BGMI Over-Shoulder, 1 = GTA Close, 2 = Wide Cruise
  private pointerLocked = false;
  private pointerDownPos = { x: 0, y: 0, time: 0, button: -1 };
  private draggingCam = false;
  private didDrag = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private shakeTime = 0;
  private shakeMag = 0;
  private hitstopTimer = 0;

  // 3D Entities & Pre-Allocated Object Pools (Zero GC)
  private playerRig!: CharacterRig3D;
  private vehicles: WorldVehicle[] = [];
  private npcs: WorldNpc[] = [];
  private props: WorldProp[] = [];
  private droppedWeapons: DroppedWeapon[] = [];
  private pickupMeshes: { pkIndex: number; group: THREE.Group }[] = [];
  private projectiles: Projectile3D[] = [];
  private particles: Particle3D[] = [];
  private rings: Particle3D[] = [];
  private remotes = new Map<string, InterpolatedRemote>();
  private chunkGroups: THREE.Group[][] = [];
  private chunkCols = Math.ceil(WORLD_SIZE / CHUNK_SIZE);
  private animatedTrees: { mesh: THREE.Group; phase: number }[] = [];
  private puddleSplashCooldown = 0;
  private camZoomOffset = 0;
  private camDistSmooth = 6.4;
  private trafficLights: { light: TrafficLight3D; phaseOffset: number }[] = [];
  private clouds: { mesh: THREE.Group; speed: number }[] = [];
  private stations: MapStation[] = [];
  private benches: (BenchSpot & { occupiedBy: string | null })[] = [];
  private stuntRamps: StuntRamp[] = [];
  private waypoint: { x: number; y: number; label: string } | null = null;
  private waypointBeacon!: THREE.Group;
  private fountainSprayAccum = 0;
  private playerRampCooldown = 0;
  private missionBeacon: THREE.Group;
  private missionArrow: THREE.Mesh;

  // Active Mission
  private activeMission: ActiveMissionRuntime | null = null;

  // Inputs (PC + Android BGMI Dual-Mode)
  private heldKeys = new Set<string>();
  private touchMoveX = 0;
  private touchMoveY = 0;
  private touchDrift = false;
  private touchVehSteer = 0; // -1, 0, 1
  private touchVehThrottle = 0; // 0, 1
  private touchVehBrake = 0; // 0, 1
  private firingHeld = false;
  private hudEmitAccum = 0;
  private netEmitAccum = 0;
  private distanceAccum = 0;
  private profileSaveAccum = 0;

  constructor(mountEl: HTMLElement, initialProfile: PlayerProfile, callbacks: EngineCallbacks) {
    this.mountEl = mountEl;
    this.profile = { ...initialProfile, stats: { ...initialProfile.stats, kills: initialProfile.stats.kills || 0 } };
    this.callbacks = callbacks;
    this.map = generateCityMap();
    this.isSoftwareGl = detectSoftwareGl();

    const charDef = CHARACTERS[this.profile.characterId];
    this.maxHp = charDef.maxHp;
    this.hp = this.maxHp;

    // 1. Setup Three.js WebGLRenderer with ACESFilmic & SRGBColorSpace
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.mountEl.innerHTML = '';
    this.mountEl.appendChild(this.renderer.domElement);

    // 2. Vice City Sunset Scene, Smooth Gradient Sky Dome & IBL Reflections
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe89c72);
    this.scene.fog = new THREE.FogExp2(0xe89c72, 0.0034);

    this.skyDome = createSunsetSkyDome();
    this.scene.add(this.skyDome);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3. Perspective Camera (Extended Far Plane for 560m Open City)
    const rect = this.mountEl.getBoundingClientRect();
    this.camera = new THREE.PerspectiveCamera(62, Math.max(1, rect.width) / Math.max(1, rect.height), 0.3, 580);
    this.camera.position.set(SPAWN_X * WORLD_SCALE, 12, (SPAWN_Y + 140) * WORLD_SCALE);

    // 4. Natural Outdoor Sky + Sunlight
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x8c7b65, 0.95);
    hemi.position.set(0, 80, 0);
    this.hemiLight = hemi;
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.45);
    this.sunLight.position.set(280, 96, 298);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 260;
    const d = 66;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.04;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 4b. Dynamic Weather & Time-of-Day Controller
    this.weatherSystem = new WeatherSystem(this.scene, this.renderer, this.sunLight, this.hemiLight, this.skyDome);

    // 5. Build 3D Furfuri Nagri City & Landmarks (Chunked 7x7 Grid)
    this.buildCity3D();

    // 6. Build Mission 3D Sky Beacon, Custom Cyan GPS Waypoint Beacon & Floating Arrow
    this.missionBeacon = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 2.2, 42, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 21;
    const baseRing = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.4, 28),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    );
    baseRing.rotation.x = -Math.PI / 2;
    baseRing.position.y = 0.14;
    this.missionBeacon.add(beam, baseRing);
    this.missionBeacon.visible = false;
    this.scene.add(this.missionBeacon);

    this.waypointBeacon = new THREE.Group();
    const wpBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.8, 46, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
    );
    wpBeam.position.y = 23;
    const wpRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.0, 28),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    wpRing.rotation.x = -Math.PI / 2;
    wpRing.position.y = 0.16;
    this.waypointBeacon.add(wpBeam, wpRing);
    this.waypointBeacon.visible = false;
    this.scene.add(this.waypointBeacon);

    this.missionArrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.25, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 0.7 })
    );
    this.missionArrow.rotation.x = Math.PI / 2;
    this.missionArrow.visible = false;
    this.scene.add(this.missionArrow);

    // 7. Build Pre-Allocated Object Pools, Muzzle Flash, Player Rig & City Entities
    this.initPools();
    this.muzzleFlash = createMuzzleFlash3D();
    this.scene.add(this.muzzleFlash);
    this.rebuildPlayerRig();
    this.initEntities();
    this.bindEvents();
    this.handleResize();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.startLoop();
  }

  private initPools(): void {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(_partGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({ active: false, mesh, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, gravity: 18 });
    }
    for (let i = 0; i < RING_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(_ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.rings.push({ active: false, mesh, vx: 1, vy: 0, vz: 0, life: 0, maxLife: 0.38, gravity: 0, isRing: true });
    }
    for (let i = 0; i < PROJECTILE_POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const mesh = new THREE.Mesh(_projGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        x: 0,
        y: 0,
        h: 1.4,
        vx: 0,
        vy: 0,
        vh: 0,
        life: 0,
        damage: 0,
        fromPlayer: false,
        fromNpc: false,
        ownerUid: '',
        mesh,
      });
    }
  }

  private addToChunk(worldX: number, worldY: number, obj: THREE.Object3D): void {
    const cx = Math.max(0, Math.min(this.chunkCols - 1, Math.floor(worldX / CHUNK_SIZE)));
    const cz = Math.max(0, Math.min(this.chunkCols - 1, Math.floor(worldY / CHUNK_SIZE)));
    this.chunkGroups[cx][cz].add(obj);
  }

  private updateChunkStreaming(): void {
    const pCx = Math.floor(this.px / CHUNK_SIZE);
    const pCz = Math.floor(this.py / CHUNK_SIZE);
    const maxChunkDist = this.graphicsQuality === 'low' ? 2 : this.graphicsQuality === 'medium' ? 3 : 4;
    for (let cx = 0; cx < this.chunkCols; cx++) {
      for (let cz = 0; cz < this.chunkCols; cz++) {
        const dist = Math.max(Math.abs(cx - pCx), Math.abs(cz - pCz));
        this.chunkGroups[cx][cz].visible = dist <= maxChunkDist;
      }
    }
  }

  private buildCity3D(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const worldM = WORLD_SIZE * WORLD_SCALE; // 560m x 560m

    // 7x7 Chunk Groups for lightweight streaming visibility culling
    this.chunkGroups = Array.from({ length: this.chunkCols }, () =>
      Array.from({ length: this.chunkCols }, () => {
        const g = new THREE.Group();
        this.scene.add(g);
        return g;
      })
    );

    // Extended Earth Ground Plane
    const groundTex = createGroundTexture(maxAniso);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1260, 1260),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.92, metalness: 0.02 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(worldM / 2, 0, worldM / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Distant Perimeter Outskirt Hills (340m - 440m ring around the 560m city)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x6f7359, roughness: 0.96 });
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      const dist = 370 + (i % 3) * 34;
      const hill = new THREE.Mesh(new THREE.SphereGeometry(62 + (i % 4) * 16, 12, 9), hillMat);
      hill.scale.set(1.25, 0.42, 1.25);
      hill.position.set(worldM / 2 + Math.cos(ang) * dist, -6, worldM / 2 + Math.sin(ang) * dist);
      this.scene.add(hill);
    }

    // Concrete Paver Sidewalks + Micro-Grained PBR Asphalt Roads
    const { map: swMap, bump: swBump } = createSidewalkTexture(maxAniso);
    swMap.repeat.set(64, 1);
    swBump.repeat.set(64, 1);
    const sidewalkMatX = new THREE.MeshStandardMaterial({ map: swMap, bumpMap: swBump, bumpScale: 0.05, roughness: 0.88 });
    const swMapZ = swMap.clone();
    swMapZ.needsUpdate = true;
    swMapZ.repeat.set(1, 64);
    const swBumpZ = swBump.clone();
    swBumpZ.needsUpdate = true;
    swBumpZ.repeat.set(1, 64);
    const sidewalkMatZ = new THREE.MeshStandardMaterial({ map: swMapZ, bumpMap: swBumpZ, bumpScale: 0.05, roughness: 0.88 });

    const { map: roadTex, bump: roadBump, roughness: roadRough } = createRoadTextures(maxAniso);
    const roadW = ROAD_WIDTH * WORLD_SCALE;

    const texX = roadTex.clone();
    texX.needsUpdate = true;
    texX.repeat.set(1, 38);
    const bumpX = roadBump.clone();
    bumpX.needsUpdate = true;
    bumpX.repeat.set(1, 38);
    const roughX = roadRough.clone();
    roughX.needsUpdate = true;
    roughX.repeat.set(1, 38);
    const roadMatX = new THREE.MeshStandardMaterial({
      map: texX,
      bumpMap: bumpX,
      bumpScale: 0.07,
      roughnessMap: roughX,
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.65,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    this.weatherSystem.registerRoadMaterial(roadMatX);

    const texZ = roadTex.clone();
    texZ.needsUpdate = true;
    texZ.repeat.set(1, 38);
    const bumpZ = roadBump.clone();
    bumpZ.needsUpdate = true;
    bumpZ.repeat.set(1, 38);
    const roughZ = roadRough.clone();
    roughZ.needsUpdate = true;
    roughZ.repeat.set(1, 38);
    const roadMatZ = new THREE.MeshStandardMaterial({
      map: texZ,
      bumpMap: bumpZ,
      bumpScale: 0.07,
      roughnessMap: roughZ,
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.65,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.weatherSystem.registerRoadMaterial(roadMatZ);

    for (const r of ROAD_CENTERS) {
      const rm = r * WORLD_SCALE;

      const swX = new THREE.Mesh(new THREE.BoxGeometry(worldM, 0.08, roadW + 3.8), sidewalkMatX);
      swX.position.set(worldM / 2, 0.04, rm);
      swX.receiveShadow = true;
      this.scene.add(swX);

      const swZ = new THREE.Mesh(new THREE.BoxGeometry(roadW + 3.8, 0.08, worldM), sidewalkMatZ);
      swZ.position.set(rm, 0.04, worldM / 2);
      swZ.receiveShadow = true;
      this.scene.add(swZ);

      const rX = new THREE.Mesh(new THREE.PlaneGeometry(roadW, worldM), roadMatX);
      rX.rotation.x = -Math.PI / 2;
      rX.rotation.z = Math.PI / 2;
      rX.position.set(worldM / 2, 0.1, rm);
      rX.receiveShadow = true;
      this.scene.add(rX);

      const rZ = new THREE.Mesh(new THREE.PlaneGeometry(roadW, worldM), roadMatZ);
      rZ.rotation.x = -Math.PI / 2;
      rZ.position.set(rm, 0.11, worldM / 2);
      rZ.receiveShadow = true;
      this.scene.add(rZ);
    }

    // Zebra Crosswalk Intersection Boxes (InstancedMesh, 1 draw call!)
    const crossTex = createIntersectionCrosswalkTexture(maxAniso);
    const crossMat = new THREE.MeshStandardMaterial({
      map: crossTex,
      roughness: 0.86,
      metalness: 0.02,
      envMapIntensity: 0.65,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    this.weatherSystem.registerRoadMaterial(crossMat);
    const crossGeo = new THREE.PlaneGeometry(roadW + 0.6, roadW + 0.6);
    crossGeo.rotateX(-Math.PI / 2);
    const crossCount = ROAD_CENTERS.length * ROAD_CENTERS.length - 1;
    const crossInst = new THREE.InstancedMesh(crossGeo, crossMat, crossCount);
    crossInst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let cIdx = 0;
    for (let xi = 0; xi < ROAD_CENTERS.length; xi++) {
      for (let zi = 0; zi < ROAD_CENTERS.length; zi++) {
        if (xi === 3 && zi === 3) continue; // Chai Chowk Roundabout
        dummy.position.set(ROAD_CENTERS[xi] * WORLD_SCALE, 0.125, ROAD_CENTERS[zi] * WORLD_SCALE);
        dummy.updateMatrix();
        crossInst.setMatrixAt(cIdx++, dummy.matrix);
      }
    }
    crossInst.instanceMatrix.needsUpdate = true;
    crossInst.computeBoundingSphere();
    this.scene.add(crossInst);

    // Rain Puddles (InstancedMesh, 1 draw call, shines & splashes during rain!)
    if (this.map.puddles.length > 0) {
      const puddleTex = createPuddleTexture();
      const puddleMat = new THREE.MeshStandardMaterial({
        map: puddleTex,
        color: 0xb8d4ea,
        roughness: 0.06,
        metalness: 0.4,
        envMapIntensity: 1.9,
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      });
      this.weatherSystem.registerPuddleMaterial(puddleMat);
      const puddleGeo = new THREE.PlaneGeometry(1, 1);
      puddleGeo.rotateX(-Math.PI / 2);
      const puddleInst = new THREE.InstancedMesh(puddleGeo, puddleMat, this.map.puddles.length);
      this.map.puddles.forEach((pd, idx) => {
        dummy.position.set(pd.x * WORLD_SCALE, 0.135, pd.y * WORLD_SCALE);
        dummy.rotation.set(0, pd.rot, 0);
        dummy.scale.set(pd.rx * 2, 1, pd.rz * 2);
        dummy.updateMatrix();
        puddleInst.setMatrixAt(idx, dummy.matrix);
      });
      puddleInst.instanceMatrix.needsUpdate = true;
      puddleInst.computeBoundingSphere();
      this.scene.add(puddleInst);
    }

    // Glowing Street Lamps + Cycling Traffic Lights
    for (let xi = 0; xi < ROAD_CENTERS.length; xi++) {
      for (let zi = 0; zi < ROAD_CENTERS.length; zi++) {
        const rx2d = ROAD_CENTERS[xi];
        const rz2d = ROAD_CENTERS[zi];
        const rx = rx2d * WORLD_SCALE;
        const rz = rz2d * WORLD_SCALE;
        if ((xi + zi) % 2 === 0) {
          const { group: lamp, bulbMat } = createStreetLamp3D();
          lamp.position.set(rx + 9.4, 0, rz + 9.4);
          lamp.rotation.y = -Math.PI * 0.75;
          this.addToChunk(rx2d, rz2d, lamp);
          this.weatherSystem.registerLampMaterial(bulbMat);
        }
        if (xi >= 1 && xi <= 5 && zi >= 1 && zi <= 5 && !(xi === 3 && zi === 3)) {
          const tl = createTrafficLight3D();
          tl.group.position.set(rx - 9.2, 0, rz - 9.2);
          tl.group.rotation.y = Math.PI * 0.25;
          this.addToChunk(rx2d, rz2d, tl.group);
          this.trafficLights.push({ light: tl, phaseOffset: (xi + zi) * 2.1 });
        }
      }
    }

    // Parking Lots (Paved Asphalt + Bays)
    const lotTex = createParkingLotTexture(maxAniso);
    const lotMat = new THREE.MeshStandardMaterial({ map: lotTex, roughness: 0.85 });
    for (const pl of this.map.parkingLots) {
      const lotMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(pl.w * WORLD_SCALE, pl.h * WORLD_SCALE),
        lotMat
      );
      lotMesh.rotation.x = -Math.PI / 2;
      lotMesh.position.set((pl.x + pl.w / 2) * WORLD_SCALE, 0.05, (pl.y + pl.h / 2) * WORLD_SCALE);
      lotMesh.receiveShadow = true;
      this.addToChunk(pl.x + pl.w / 2, pl.y + pl.h / 2, lotMesh);
    }

    // Petrol Pumps & Forecourts
    for (const ps of this.map.petrolStations) {
      const pumpG = createPetrolStation3D(ps.name);
      pumpG.position.set(ps.x * WORLD_SCALE, 0.05, ps.y * WORLD_SCALE);
      pumpG.rotation.y = ps.angle;
      this.addToChunk(ps.x, ps.y, pumpG);
    }

    // Central Park (Natural Grass, Pathways, Pond & Gazebo)
    const cp = this.map.centralPark;
    const parkGrassTex = createGrassTexture(maxAniso);
    const parkGround = new THREE.Mesh(
      new THREE.PlaneGeometry(cp.w * WORLD_SCALE, cp.h * WORLD_SCALE),
      new THREE.MeshStandardMaterial({ map: parkGrassTex, roughness: 0.92 })
    );
    parkGround.rotation.x = -Math.PI / 2;
    const parkCx = (cp.x + cp.w / 2) * WORLD_SCALE;
    const parkCz = (cp.y + cp.h / 2) * WORLD_SCALE;
    parkGround.position.set(parkCx, 0.05, parkCz);
    parkGround.receiveShadow = true;
    const walkMat = new THREE.MeshStandardMaterial({ color: 0xc2b29b, roughness: 0.88 });
    const pathA = new THREE.Mesh(new THREE.PlaneGeometry(cp.w * WORLD_SCALE * 0.86, 2.4), walkMat);
    pathA.rotation.x = -Math.PI / 2;
    pathA.position.set(parkCx, 0.07, parkCz);
    const pathB = new THREE.Mesh(new THREE.PlaneGeometry(2.4, cp.h * WORLD_SCALE * 0.86), walkMat);
    pathB.rotation.x = -Math.PI / 2;
    pathB.position.set(parkCx, 0.07, parkCz);
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(6.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.12, metalness: 0.35 })
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(parkCx + 10.5, 0.08, parkCz + 10.5);
    const gazebo = createParkGazebo3D();
    gazebo.position.set(parkCx, 0.07, parkCz);
    this.addToChunk(cp.x + cp.w / 2, cp.y + cp.h / 2, parkGround);
    this.addToChunk(cp.x + cp.w / 2, cp.y + cp.h / 2, pathA);
    this.addToChunk(cp.x + cp.w / 2, cp.y + cp.h / 2, pathB);
    this.addToChunk(cp.x + cp.w / 2, cp.y + cp.h / 2, pond);
    this.addToChunk(cp.x + cp.w / 2, cp.y + cp.h / 2, gazebo);

    // Street Benches (Chai Chowk Plaza, Central Park & Bada Maidan) — shared with colliders & sit system
    this.benches = [];
    for (const b of this.map.benches) {
      this.benches.push({ ...b, occupiedBy: null });
      const bench = createBench3D();
      bench.position.set(b.x * WORLD_SCALE, 0.08, b.y * WORLD_SCALE);
      bench.rotation.y = b.rot;
      this.addToChunk(b.x, b.y, bench);
    }

    // Road Signs, Utility Poles, Bus Shelters, Garbage Bins & Market Vendor Carts
    for (const rs of this.map.roadSigns) {
      const sign = createRoadSign3D(rs.kind);
      sign.position.set(rs.x * WORLD_SCALE, 0.08, rs.y * WORLD_SCALE);
      sign.rotation.y = rs.rot;
      this.addToChunk(rs.x, rs.y, sign);
    }
    for (const up of this.map.utilityPoles) {
      const pole = createUtilityPole3D();
      pole.position.set(up.x * WORLD_SCALE, 0.08, up.y * WORLD_SCALE);
      pole.rotation.y = up.rot;
      this.addToChunk(up.x, up.y, pole);
    }
    for (const bs of this.map.busStops) {
      const shelter = createBusShelter3D();
      shelter.position.set(bs.x * WORLD_SCALE, 0.08, bs.y * WORLD_SCALE);
      shelter.rotation.y = bs.rot;
      this.addToChunk(bs.x, bs.y, shelter);
    }
    for (const bin of this.map.bins) {
      const bMesh = createGarbageBin3D();
      bMesh.position.set(bin.x * WORLD_SCALE, 0.08, bin.y * WORLD_SCALE);
      this.addToChunk(bin.x, bin.y, bMesh);
    }
    for (const vc of this.map.vendorCarts) {
      const cart = createVendorCart3D(vc.color);
      cart.position.set(vc.x * WORLD_SCALE, 0.08, vc.y * WORLD_SCALE);
      cart.rotation.y = vc.rot;
      this.addToChunk(vc.x, vc.y, cart);
    }

    // Drifting High-Altitude 3D Sky Clouds
    for (let i = 0; i < 16; i++) {
      const { group: cloud, mat } = createCloudCluster3D();
      cloud.position.set(
        (i * 41) % 560,
        44 + (i % 4) * 6.5,
        24 + ((i * 79) % 510)
      );
      const s = 0.95 + (i % 3) * 0.4;
      cloud.scale.set(s, s * 0.72, s);
      this.scene.add(cloud);
      this.weatherSystem.registerCloudMaterial(mat);
      this.clouds.push({ mesh: cloud, speed: 1.5 + (i % 4) * 0.55 });
    }

    // 8 Functional 3D Stunt Jump Ramps across the 560m City (shared with ground elevation!)
    for (const rs of this.map.stuntRamps) {
      this.stuntRamps.push(rs);
      const rMesh = createStuntRamp3D();
      rMesh.position.set(rs.x * WORLD_SCALE, 0.08, rs.y * WORLD_SCALE);
      rMesh.rotation.y = Math.PI / 2 - rs.angle;
      this.addToChunk(rs.x, rs.y, rMesh);

      const sign = createNameplateSprite('STUNT RAMP', '#facc15');
      sign.position.set(rs.x * WORLD_SCALE, 3.6, rs.y * WORLD_SCALE);
      sign.scale.set(3.2, 0.75, 1);
      this.addToChunk(rs.x, rs.y, sign);
    }

    // 14 Interactive Street Stations: ATMs, Chai & Samosa Stalls, Arms Gun Shops + Colliders
    const stationSpecs: Omit<MapStation, 'cooldown'>[] = [
      { id: 'atm-chowk', kind: 'atm', name: 'Chai Chowk ATM', x: 2695, y: 2935, angle: 0 },
      { id: 'atm-bazaar', kind: 'atm', name: 'Furfuri Bazaar ATM', x: 1715, y: 1785, angle: 0 },
      { id: 'atm-thana', kind: 'atm', name: 'Police Thana ATM', x: 3870, y: 3145, angle: Math.PI / 2 },
      { id: 'atm-garage', kind: 'atm', name: 'Garage ATM', x: 3095, y: 1880, angle: -Math.PI / 2 },
      { id: 'atm-industrial', kind: 'atm', name: 'Industrial Bay ATM', x: 4510, y: 4420, angle: 0 },
      { id: 'chai-chowk', kind: 'chai', name: 'Chai & Samosa Stall', x: 2915, y: 2935, angle: Math.PI },
      { id: 'chai-maidan', kind: 'chai', name: 'Maidan Chai Tapri', x: 1485, y: 2915, angle: -Math.PI / 2 },
      { id: 'chai-temple', kind: 'chai', name: 'Temple Prasad Chai', x: 1065, y: 2345, angle: Math.PI },
      { id: 'chai-park', kind: 'chai', name: 'Central Park Chai', x: 3090, y: 3735, angle: 0 },
      { id: 'chai-petrol', kind: 'chai', name: 'Highway Petrol Dhaba', x: 1180, y: 905, angle: 0 },
      { id: 'arms-chowk', kind: 'arms', name: 'Desi Arms Shop', x: 2690, y: 3050, angle: 0 },
      { id: 'arms-highway', kind: 'arms', name: 'North Highway Gun Depot', x: 2165, y: 1105, angle: Math.PI / 2 },
      { id: 'arms-apartments', kind: 'arms', name: 'Skyline Armory', x: 4085, y: 2120, angle: Math.PI },
      { id: 'arms-clock', kind: 'arms', name: 'Ghanta Ghar Gun Shop', x: 2290, y: 4690, angle: 0 },
    ];
    for (const st of stationSpecs) {
      this.stations.push({ ...st, cooldown: 0 });
      const meshRot = Math.PI / 2 - st.angle;
      const mesh = st.kind === 'atm' ? createAtmMachine3D() : createStreetStall3D(st.kind);
      mesh.position.set(st.x * WORLD_SCALE, 0.08, st.y * WORLD_SCALE);
      mesh.rotation.y = meshRot;
      this.addToChunk(st.x, st.y, mesh);

      // Register solid collision geometry for every ATM & street stall
      this.map.colliders.push({
        kind: 'box',
        x: st.x,
        y: st.y,
        hw: st.kind === 'atm' ? 7 : 16.5,
        hd: st.kind === 'atm' ? 6 : 8.5,
        rot: meshRot,
        tag: st.kind,
      });

      const ringColor = st.kind === 'atm' ? 0x10b981 : st.kind === 'chai' ? 0xf59e0b : 0x38bdf8;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.7, 2.2, 24),
        new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(st.x * WORLD_SCALE, 0.13, st.y * WORLD_SCALE);
      this.addToChunk(st.x, st.y, ring);

      const labelText =
        st.kind === 'atm' ? 'ATM +₹500 (E)' : st.kind === 'chai' ? 'CHAI HEAL ₹50 (E)' : 'GUN SHOP ₹250 (E)';
      const labelHex = st.kind === 'atm' ? '#34d399' : st.kind === 'chai' ? '#fbbf24' : '#38bdf8';
      const sprite = createNameplateSprite(labelText, labelHex);
      sprite.position.set(st.x * WORLD_SCALE, 3.8, st.y * WORLD_SCALE);
      sprite.scale.set(3.4, 0.78, 1);
      this.addToChunk(st.x, st.y, sprite);
    }

    // 5 Hidden Golden Easter Egg Secrets across Expanded Furfuri Nagri
    const eggCoords: [number, number][] = [
      [2660, 2665], // Hidden plaza corner near Chai Chowk
      [1780, 3360], // Bada Maidan cricket ground corner
      [3040, 1510], // Behind Raju's Garage workshop
      [620, 2240], // Surya Mandir temple secret alcove
      [3380, 4120], // Central Park lakeside gazebo corner
    ];
    eggCoords.forEach(([ex, ey], idx) => {
      const mesh = createEasterEgg3D();
      mesh.position.set(ex * WORLD_SCALE, 0.08, ey * WORLD_SCALE);
      this.scene.add(mesh);
      this.easterEggs.push({ id: `egg-${idx}`, x: ex, y: ey, secretIndex: idx, found: false, mesh });
    });

    // Chai Chowk 3D Multi-Tier Marigold Fountain
    const rb = this.map.roundabout;
    const fountainG = new THREE.Group();
    fountainG.position.set(rb.x * WORLD_SCALE, 0, rb.y * WORLD_SCALE);
    const outerRing = new THREE.Mesh(
      new THREE.CylinderGeometry(rb.outerR * WORLD_SCALE, rb.outerR * WORLD_SCALE, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x2d2b2a, roughness: 0.84 })
    );
    outerRing.position.y = 0.07;
    outerRing.receiveShadow = true;
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 6.2, 0.9, 24),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 })
    );
    basin.position.y = 0.45;
    basin.castShadow = true;
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(4.8, 4.8, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.35 })
    );
    water.position.y = 0.88;
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.4, 3.8, 16),
      new THREE.MeshStandardMaterial({ color: 0xe7dfd1, roughness: 0.5 })
    );
    spire.position.y = 2.4;
    spire.castShadow = true;
    const topCup = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 16, 14),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.78 })
    );
    topCup.position.y = 4.6;
    fountainG.add(outerRing, basin, water, spire, topCup);
    this.addToChunk(rb.x, rb.y, fountainG);

    // Bada Maidan 3D Cricket Ground
    const cf = this.map.cricketField;
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(cf.w * WORLD_SCALE, cf.h * WORLD_SCALE),
      new THREE.MeshStandardMaterial({ map: parkGrassTex, roughness: 0.9 })
    );
    field.rotation.x = -Math.PI / 2;
    field.position.set((cf.x + cf.w / 2) * WORLD_SCALE, 0.06, (cf.y + cf.h / 2) * WORLD_SCALE);
    field.receiveShadow = true;
    const pitch = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 12.5),
      new THREE.MeshStandardMaterial({ color: 0xd4b483, roughness: 0.88 })
    );
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set((cf.x + cf.w / 2) * WORLD_SCALE, 0.09, (cf.y + cf.h / 2) * WORLD_SCALE);
    this.addToChunk(cf.x + cf.w / 2, cf.y + cf.h / 2, field);
    this.addToChunk(cf.x + cf.w / 2, cf.y + cf.h / 2, pitch);

    // Temple Square Sandstone Courtyard
    const tp = this.map.templePlaza;
    const templeFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(tp.w * WORLD_SCALE, tp.h * WORLD_SCALE),
      new THREE.MeshStandardMaterial({ color: 0xd6bfa0, roughness: 0.86 })
    );
    templeFloor.rotation.x = -Math.PI / 2;
    templeFloor.position.set((tp.x + tp.w / 2) * WORLD_SCALE, 0.05, (tp.y + tp.h / 2) * WORLD_SCALE);
    templeFloor.receiveShadow = true;
    this.addToChunk(tp.x + tp.w / 2, tp.y + tp.h / 2, templeFloor);

    // Raju's Desi Garage Holographic Pad
    const gz = this.map.garageZone;
    const garageRing = new THREE.Mesh(
      new THREE.RingGeometry(4.5, 6.2, 32),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
    );
    garageRing.rotation.x = -Math.PI / 2;
    garageRing.position.set(gz.x * WORLD_SCALE, 0.14, gz.y * WORLD_SCALE);
    const garageSign = createNameplateSprite("RAJU'S GARAGE (B)", '#34d399');
    garageSign.position.set(gz.x * WORLD_SCALE, 5.2, gz.y * WORLD_SCALE);
    this.addToChunk(gz.x, gz.y, garageRing);
    this.addToChunk(gz.x, gz.y, garageSign);

    // Semi-Realistic Architectural Buildings across All Districts (Chunked!)
    for (const b of this.map.buildings) {
      const bGroup = createBuilding3D(b, maxAniso);
      this.addToChunk(b.x + b.w / 2, b.y + b.h / 2, bGroup);
    }

    // Realistic Branching Trees (Bark + Layered Leaf Canopies + Wind Sway)
    this.map.trees.forEach((t, idx) => {
      const scaleVar = 0.88 + ((idx * 19) % 24) * 0.01;
      const tree = createTree3D(t.kind, scaleVar, maxAniso);
      tree.position.set(t.x * WORLD_SCALE, 0, t.y * WORLD_SCALE);
      this.addToChunk(t.x, t.y, tree);
      this.animatedTrees.push({ mesh: tree, phase: idx * 0.7 });
    });

    // 3D Collectible Pickups (Samosas, Cash, Chai)
    this.map.pickups.forEach((pk, idx) => {
      const g = createPickup3D(pk.kind);
      g.position.set(pk.x * WORLD_SCALE, 0, pk.y * WORLD_SCALE);
      this.scene.add(g);
      this.pickupMeshes.push({ pkIndex: idx, group: g });
    });

    this.updateChunkStreaming();
  }

  private rebuildPlayerRig(): void {
    const prevProp = this.heldProp;
    if (this.playerRig) {
      if (prevProp) this.playerRig.holdAnchor.remove(prevProp.mesh);
      this.scene.remove(this.playerRig.group);
    }
    this.playerRig = createCharacter3D(this.profile.characterId, 'hero');
    setRigWeaponVisual(this.playerRig, this.weaponId);
    this.playerRig.group.position.set(this.px * WORLD_SCALE, 0, this.py * WORLD_SCALE);
    if (prevProp) this.playerRig.holdAnchor.add(prevProp.mesh);
    this.scene.add(this.playerRig.group);
  }

  private initEntities(): void {
    // Player's customized starter ride right near spawn
    const starterType = this.profile.activeVehicleType;
    const starterCfg = this.profile.garageConfigs[starterType] || createDefaultVehicleConfig(starterType);
    this.spawnWorldVehicle(starterType, SPAWN_X + 65, SPAWN_Y + 10, -Math.PI / 2, starterCfg, false, starterType === 'police', false, true);

    // Extra parked rides near Chai Chowk so player can test hijacking instantly
    const parkedAuto = createDefaultVehicleConfig('auto');
    parkedAuto.paintId = 'kaali_peeli';
    this.spawnWorldVehicle('auto', SPAWN_X - 75, SPAWN_Y - 15, 0.35, parkedAuto, false, false, false, false);

    const parkedBullet = createDefaultVehicleConfig('bullet');
    parkedBullet.paintId = 'royal_maroon';
    this.spawnWorldVehicle('bullet', SPAWN_X + 40, SPAWN_Y - 60, -1.2, parkedBullet, false, false, false, false);

    // 30 Roaming 3D Indian Traffic Vehicles (Autos, Cars, SUVs, Trucks & City Buses)
    const trafficPool: VehicleType[] = ['auto', 'auto', 'auto', 'bullet', 'ambassador', 'ambassador', 'truck', 'thar', 'police'];
    const paints = ['kaali_peeli', 'delhi_green', 'saffron_gold', 'rajasthani_pink', 'royal_maroon'];
    for (let i = 0; i < 30; i++) {
      const type = trafficPool[i % trafficPool.length];
      const isCityBus = type === 'truck' && i % 2 === 0;
      const laneAxis: 'x' | 'y' = i % 2 === 0 ? 'x' : 'y';
      const laneDir: 1 | -1 = i % 4 < 2 ? 1 : -1;
      const roadLine = ROAD_CENTERS[i % ROAD_CENTERS.length];
      const laneOffset = laneDir === 1 ? 34 : -34;
      const along = 360 + ((i * 373) % (WORLD_SIZE - 720));
      const x = laneAxis === 'x' ? along : roadLine + laneOffset;
      const y = laneAxis === 'y' ? along : roadLine + laneOffset;
      const cfg = createDefaultVehicleConfig(type);
      if (type !== 'police') cfg.paintId = paints[i % paints.length];
      const angle = laneAxis === 'x' ? (laneDir === 1 ? 0 : Math.PI) : laneDir === 1 ? Math.PI / 2 : -Math.PI / 2;

      const v = this.spawnWorldVehicle(type, x, y, angle, cfg, true, type === 'police', false, false, isCityBus);
      v.laneAxis = laneAxis;
      v.laneDir = laneDir;
      v.laneLine = roadLine + laneOffset;
      v.speed = 115 + (i % 4) * 20;
    }

    // 46 Killable & Disarmable 3D Street NPCs across the expanded city
    const pedColors = ['#b45309', '#be185d', '#0f766e', '#a16207', '#4338ca', '#991b1b', '#334155'];
    const gangsterGuns: WeaponId[] = ['smg', 'ak47', 'shotgun', 'pistol'];
    for (let i = 0; i < 46; i++) {
      const road = ROAD_CENTERS[i % ROAD_CENTERS.length];
      const along = 320 + ((i * 257) % (WORLD_SIZE - 640));
      const role: WorldNpc['role'] =
        i < 4 ? 'cow' : i < 18 ? 'gangster' : i < 27 ? 'police' : 'ped';
      const nearCenter = i >= 4 && i < 13;
      const x = nearCenter
        ? SPAWN_X - 90 + ((i * 59) % 210)
        : role === 'cow'
        ? 2680 + i * 95
        : i % 2 === 0
        ? along
        : road + 96;
      const y = nearCenter
        ? SPAWN_Y - 120 + ((i * 49) % 190)
        : role === 'cow'
        ? 2720 + i * 65
        : i % 2 === 0
        ? road + 96
        : along;

      // Ensure NPC doesn't spawn inside buildings or fountain
      resolveCapsuleCollision(x, y, 14, this.map.buildings, this.map.colliders, _colOut);
      const sx = _colOut.x;
      const sy = _colOut.y;

      // Seat 3 friendly pedestrians naturally on benches
      let behavior: NpcSocialBehavior = 'wander';
      let benchId: string | null = null;
      let finalX = sx;
      let finalY = sy;
      let initAng = Math.random() * Math.PI * 2;
      if (role === 'ped' && (i === 30 || i === 31 || i === 32)) {
        const bIdx = i === 30 ? 1 : i === 31 ? 4 : 6;
        const b = this.benches[bIdx];
        if (b && !b.occupiedBy) {
          b.occupiedBy = `npc-${i}`;
          benchId = b.id;
          behavior = 'sit';
          finalX = b.x + Math.sin(b.rot) * 1.4;
          finalY = b.y + Math.cos(b.rot) * 1.4;
          initAng = Math.PI / 2 - b.rot;
        }
      }

      const rig = createCharacter3D('motu', role, pedColors[i % pedColors.length]);
      const carriedWeapon: WeaponId | null =
        role === 'gangster'
          ? gangsterGuns[i % gangsterGuns.length]
          : role === 'police'
          ? i % 2 === 0
            ? 'shotgun'
            : 'pistol'
          : null;
      if (carriedWeapon) {
        setRigWeaponVisual(rig, carriedWeapon);
      } else {
        (Object.keys(rig.weapons) as WeaponId[]).forEach((k) => {
          rig.weapons[k].visible = false;
        });
      }

      const groundY = getGroundHeightAt(finalX, finalY, this.map, 0);
      rig.group.position.set(finalX * WORLD_SCALE, groundY, finalY * WORLD_SCALE);
      rig.group.rotation.y = Math.PI / 2 - initAng;
      this.scene.add(rig.group);

      const maxHp = role === 'gangster' ? 85 : role === 'police' ? 95 : role === 'cow' ? 120 : 50;
      this.npcs.push({
        id: `npc-${i}`,
        role,
        carriedWeapon,
        x: finalX,
        y: finalY,
        angle: initAng,
        vx: 0,
        vy: 0,
        hp: maxHp,
        maxHp,
        alive: true,
        respawnTimer: 0,
        fallTimer: 0,
        fallDirX: 0,
        fallDirZ: 0,
        scaredTimer: 0,
        shootCooldown: 0.9 + Math.random() * 1.2,
        walkCycle: Math.random() * 6,
        behavior,
        behaviorTimer: 2 + Math.random() * 4,
        benchId,
        rig,
      });
    }

    // 48 Interactive Grabbable & Throwable 3D Street Props (Explosive Barrels, Crates, Cones, Tires)
    const propKinds: PropKind[] = ['barrel', 'crate', 'cone', 'tire'];
    const spawnSpots: { x: number; y: number; kind: PropKind }[] = [
      { x: SPAWN_X - 25, y: SPAWN_Y - 25, kind: 'barrel' },
      { x: SPAWN_X + 25, y: SPAWN_Y - 25, kind: 'crate' },
      { x: SPAWN_X - 35, y: SPAWN_Y + 25, kind: 'cone' },
      { x: SPAWN_X + 35, y: SPAWN_Y + 35, kind: 'tire' },
      { x: SPAWN_X - 55, y: SPAWN_Y - 65, kind: 'barrel' },
      { x: SPAWN_X + 65, y: SPAWN_Y - 35, kind: 'barrel' },
      { x: SPAWN_X - 5, y: SPAWN_Y - 90, kind: 'crate' },
      { x: SPAWN_X + 15, y: SPAWN_Y + 55, kind: 'barrel' },
    ];
    for (let i = 0; i < 40; i++) {
      const road = ROAD_CENTERS[i % ROAD_CENTERS.length];
      const along = 360 + ((i * 313) % (WORLD_SIZE - 720));
      const x = i % 2 === 0 ? along : road + (i % 4 === 1 ? 82 : -82);
      const y = i % 2 === 0 ? road + (i % 4 === 0 ? 82 : -82) : along;
      spawnSpots.push({ x, y, kind: propKinds[i % propKinds.length] });
    }

    spawnSpots.forEach((sp, idx) => {
      const mesh = createGrabbableProp3D(sp.kind);
      mesh.position.set(sp.x * WORLD_SCALE, 0, sp.y * WORLD_SCALE);
      this.scene.add(mesh);
      this.props.push({
        id: `prop-${idx}`,
        kind: sp.kind,
        x: sp.x,
        y: sp.y,
        h: 0,
        vx: 0,
        vy: 0,
        vh: 0,
        spin: 0,
        state: 'idle',
        respawnTimer: 0,
        originX: sp.x,
        originY: sp.y,
        mesh,
      });
    });

    // Starter Street Gun Pickups near Chai Chowk
    this.spawnDroppedWeapon('smg', SPAWN_X - 45, SPAWN_Y + 5, 60);
    this.spawnDroppedWeapon('ak47', SPAWN_X + 45, SPAWN_Y - 15, 45);
    this.spawnDroppedWeapon('shotgun', SPAWN_X - 10, SPAWN_Y - 50, 18);
  }

  private spawnDroppedWeapon(weaponId: WeaponId, x: number, y: number, ammo: number): void {
    const mesh = createDroppedWeapon3D(weaponId);
    mesh.position.set(x * WORLD_SCALE, 0, y * WORLD_SCALE);
    this.scene.add(mesh);
    this.droppedWeapons.push({
      id: `gun-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      weaponId,
      ammo,
      x,
      y,
      life: 90,
      mesh,
    });
  }

  private spawnWorldVehicle(
    type: VehicleType,
    x: number,
    y: number,
    angle: number,
    config: VehicleCustomConfig,
    isTraffic: boolean,
    isPolice: boolean,
    isMissionTarget: boolean,
    isPlayerPersonal: boolean,
    isCityBus = false
  ): WorldVehicle {
    const spec = VEHICLE_SPECS[type];
    const maxHp = spec.maxHp + (config.armorLevel - 1) * 45;
    const mesh = createVehicle3D(type, config, isCityBus);
    if (mesh.headlightBeam) mesh.headlightBeam.visible = this.weatherSystem.isHeadlightsActive();
    mesh.group.position.set(x * WORLD_SCALE, 0, y * WORLD_SCALE);
    mesh.group.rotation.y = Math.PI / 2 - angle;
    this.scene.add(mesh.group);

    const v: WorldVehicle = {
      id: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      x,
      y,
      h: 0,
      vh: 0,
      inAir: false,
      airTime: 0,
      rampCooldown: 0,
      angle,
      speed: 0,
      vx: 0,
      vy: 0,
      steerSmooth: 0,
      bodyRoll: 0,
      bodyPitch: 0,
      hp: maxHp,
      maxHp,
      config: { ...config },
      isTraffic,
      isPolice,
      isMissionTarget,
      isPlayerPersonal,
      stalledTimer: 0,
      laneAxis: 'x',
      laneDir: 1,
      laneLine: ROAD_CENTERS[3],
      hitFlash: 0,
      mesh,
    };
    this.vehicles.push(v);
    return v;
  }

  // ==================== PUBLIC CONTROLS (WINDOWS + ANDROID BGMI) ====================

  public setMinimapCanvas(el: HTMLCanvasElement | null): void {
    this.minimapCanvas = el;
    this.minimapCtx = el ? el.getContext('2d') : null;
  }

  public setProfile(profile: PlayerProfile, respawnVehicle = false): void {
    const prevChar = this.profile.characterId;
    this.profile = { ...profile, stats: { ...profile.stats, kills: profile.stats.kills || 0 } };
    const charDef = CHARACTERS[profile.characterId];
    this.maxHp = charDef.maxHp;

    if (prevChar !== profile.characterId) {
      this.hp = this.maxHp;
      this.specialCooldown = 0;
      this.specialActiveTimer = 0;
      this.rebuildPlayerRig();
      this.showFeed(`${charDef.name}: ${charDef.specialName} Ready!`);
    }

    const activeType = profile.activeVehicleType;
    const activeCfg = profile.garageConfigs[activeType] || createDefaultVehicleConfig(activeType);
    if (this.currentVehicle && this.currentVehicle.isPlayerPersonal) {
      this.scene.remove(this.currentVehicle.mesh.group);
      this.currentVehicle.type = activeType;
      this.currentVehicle.config = { ...activeCfg };
      this.currentVehicle.mesh = createVehicle3D(activeType, activeCfg);
      this.currentVehicle.mesh.group.position.set(this.currentVehicle.x * WORLD_SCALE, 0, this.currentVehicle.y * WORLD_SCALE);
      this.scene.add(this.currentVehicle.mesh.group);
      this.currentVehicle.maxHp = VEHICLE_SPECS[activeType].maxHp + (activeCfg.armorLevel - 1) * 45;
      this.currentVehicle.hp = this.currentVehicle.maxHp;
    }

    if (respawnVehicle) {
      this.spawnOrEnterPersonalVehicle();
    }
  }

  public setTitlePreviewMode(preview: boolean): void {
    this.titlePreviewMode = preview;
    if (!preview) {
      this.camYaw = Math.PI;
      this.camPitch = 0.24;
    }
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    this.graphicsQuality = quality;
    this.ecoMode = quality === 'low';
    const dpr = window.devicePixelRatio || 1;
    if (this.isSoftwareGl || quality === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1);
    } else if (quality === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(Math.min(dpr, 1.35));
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.setPixelRatio(Math.min(dpr, 1.75));
    }
    this.weatherSystem?.setQuality(quality);
    this.updateChunkStreaming();
    this.showFeed(`Graphics: ${quality.toUpperCase()}`);
    this.emitHud();
  }

  public setEcoMode(eco: boolean): void {
    this.setGraphicsQuality(eco ? 'low' : 'medium');
  }

  public requestPointerLock(): void {
    if (this.paused || this.titlePreviewMode) return;
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    } else {
      this.renderer.domElement.requestPointerLock?.();
    }
  }

  public addCameraOrbit(dx: number, dy: number, freeLookOnly = false): void {
    if (this.paused || this.titlePreviewMode) return;
    const sens = this.aiming ? 0.0038 : 0.0056;
    if (freeLookOnly) {
      this.freeLookActive = true;
      this.freeLookYaw -= dx * sens;
      this.freeLookPitch = Math.max(-0.35, Math.min(0.65, this.freeLookPitch + dy * sens));
    } else {
      this.camYaw -= dx * sens;
      this.camPitch = Math.max(-0.22, Math.min(0.72, this.camPitch + dy * sens));
    }
  }

  public releaseFreeLook(): void {
    this.freeLookActive = false;
  }

  public setAiming(active: boolean): void {
    if (this.currentVehicle) {
      this.aiming = false;
      return;
    }
    this.aiming = active;
  }

  public toggleAiming(): void {
    this.setAiming(!this.aiming);
  }

  public triggerJump(): void {
    if (this.paused || this.wasted || this.titlePreviewMode) return;
    if (this.currentVehicle || this.vehicleEnterTransition) return;
    if (this.sittingBenchId) {
      this.standUpFromBench();
    }
    this.cancelEmote();
    if (this.pHeight <= 0.05) {
      this.crouching = false;
      // Parkour Vault boost when jumping right beside a car or street prop!
      const nearObstacle = this.findNearestProp(46) !== null || this.findNearestVehicle() !== null;
      if (nearObstacle) {
        this.pVelY = 12.8;
        soundEngine.playCartoonBoing();
      } else {
        this.pVelY = 10.6;
        soundEngine.playVehicleDoor();
      }
    }
  }

  public playEmote(emoteId: EmoteId): void {
    if (this.paused || this.wasted || this.titlePreviewMode) return;
    if (this.currentVehicle || this.vehicleEnterTransition) {
      this.showFeed('Exit vehicle first to perform gestures!');
      return;
    }
    if (this.heldProp) {
      this.showFeed('Throw or drop held object first!');
      return;
    }
    const meta = EMOTE_LIST.find((e) => e.id === emoteId);
    if (!meta) return;
    this.aiming = false;
    this.crouching = false;
    this.activeEmote = emoteId;
    this.emoteElapsed = 0;
    this.emoteTimer = meta.duration;
    soundEngine.playPickup(false);
    this.showFeed(`Gesture: ${meta.label}`);
    this.emitHud();
  }

  public cancelEmote(): void {
    if (!this.activeEmote) return;
    this.activeEmote = null;
    this.emoteTimer = 0;
    this.emoteElapsed = 0;
  }

  public standUpFromBench(): void {
    if (!this.sittingBenchId) return;
    const b = this.benches.find((bench) => bench.id === this.sittingBenchId);
    if (b) {
      b.occupiedBy = null;
      this.px = b.x + Math.sin(b.rot) * 9.5;
      this.py = b.y + Math.cos(b.rot) * 9.5;
    }
    this.sittingBenchId = null;
  }

  public triggerReload(): void {
    if (this.paused || this.wasted || this.titlePreviewMode || this.currentVehicle) return;
    if (this.weaponId === 'bat' || this.reloadTimer > 0) return;
    const maxMag = WEAPON_MAG_SIZE[this.weaponId];
    if (this.magAmmo[this.weaponId] >= maxMag) return;
    if (this.weaponId !== 'pistol' && (this.weaponAmmo[this.weaponId] || 0) <= 0) {
      this.showFeed('No reserve ammo! Visit Gun Shop');
      return;
    }
    this.reloadTimer = 0.92;
    soundEngine.playReload();
    this.showFeed(`Reloading ${WEAPON_LABELS[this.weaponId]}...`);
  }

  public toggleCrouch(): void {
    if (this.paused || this.wasted || this.titlePreviewMode) return;
    if (this.currentVehicle) {
      this.cycleCameraMode();
      return;
    }
    this.crouching = !this.crouching;
  }

  public cycleCameraMode(): void {
    this.camMode = (this.camMode + 1) % 3;
    const names = ['BGMI Action Cam', 'Close Vice Cam', 'Wide Street Cam'];
    this.showFeed(names[this.camMode]);
  }

  public setWeapon(w: WeaponId): void {
    if (!this.ownedWeapons[w]) {
      this.showFeed(`Loot ${WEAPON_LABELS[w]} from enemies!`);
      return;
    }
    this.weaponId = w;
    setRigWeaponVisual(this.playerRig, w);
    soundEngine.playVehicleDoor();
  }

  public cycleWeapon(): void {
    const order: WeaponId[] = ['bat', 'pistol', 'smg', 'shotgun', 'ak47'].filter((w) => this.ownedWeapons[w as WeaponId]) as WeaponId[];
    if (order.length <= 1) return;
    const idx = (order.indexOf(this.weaponId) + 1) % order.length;
    this.setWeapon(order[idx]);
  }

  public setTouchJoystick(nx: number, ny: number): void {
    this.touchMoveX = Math.max(-1, Math.min(1, nx));
    this.touchMoveY = Math.max(-1, Math.min(1, ny));
  }

  public setVehicleControls(ctrl: { steer?: number; throttle?: number; brake?: number }): void {
    if (ctrl.steer !== undefined) this.touchVehSteer = ctrl.steer;
    if (ctrl.throttle !== undefined) this.touchVehThrottle = ctrl.throttle;
    if (ctrl.brake !== undefined) this.touchVehBrake = ctrl.brake;
  }

  public setTouchDrift(active: boolean): void {
    this.touchDrift = active;
  }

  public setTouchFire(active: boolean): void {
    this.firingHeld = active;
    if (active) this.triggerAttack();
  }

  public teleportTo(x: number, y: number, label?: string): void {
    const safeX = Math.max(120, Math.min(WORLD_SIZE - 120, x + 28));
    const safeY = Math.max(120, Math.min(WORLD_SIZE - 120, y + 28));
    if (this.currentVehicle) {
      this.currentVehicle.x = safeX;
      this.currentVehicle.y = safeY;
      this.currentVehicle.h = 0;
      this.currentVehicle.vh = 0;
      this.currentVehicle.inAir = false;
      this.currentVehicle.speed = 0;
    }
    this.px = safeX;
    this.py = safeY;
    this.pHeight = 0;
    this.pVelY = 0;
    this.spawnRing3D(safeX, safeY, 0x38bdf8, 4);
    soundEngine.playPickup(true);
    if (label) this.showFeed(`Warped to ${label}!`);
  }

  public cycleTimeOfDay(): void {
    const order: TimeOfDay[] = ['sunrise', 'day', 'sunset', 'night'];
    const next = order[(order.indexOf(this.weatherSystem.timeOfDay) + 1) % order.length];
    this.weatherSystem.setTimeOfDay(next);

    const headlightsOn = this.weatherSystem.isHeadlightsActive();
    for (const v of this.vehicles) {
      if (v.mesh.headlightBeam) v.mesh.headlightBeam.visible = headlightsOn;
    }
    for (const r of this.remotes.values()) {
      if (r.vehMesh?.headlightBeam) r.vehMesh.headlightBeam.visible = headlightsOn;
    }

    const names: Record<TimeOfDay, string> = {
      sunrise: 'Morning Sunrise',
      day: 'Sunny Furfuri Day',
      sunset: 'Golden Evening Sunset',
      night: 'City Night Lights',
    };
    this.showFeed(names[next]);
    this.emitHud();
  }

  public cycleWeather(): void {
    const order: WeatherType[] = ['clear', 'rain', 'fog'];
    const next = order[(order.indexOf(this.weatherSystem.weather) + 1) % order.length];
    this.setWeather(next);
  }

  public setWeather(w: WeatherType): void {
    this.weatherSystem.setWeather(w);
    const headlightsOn = this.weatherSystem.isHeadlightsActive();
    for (const v of this.vehicles) {
      if (v.mesh.headlightBeam) v.mesh.headlightBeam.visible = headlightsOn;
    }
    for (const r of this.remotes.values()) {
      if (r.vehMesh?.headlightBeam) r.vehMesh.headlightBeam.visible = headlightsOn;
    }
    const labels: Record<WeatherType, string> = {
      clear: 'Clear Weather',
      rain: 'Monsoon Rain Showers',
      fog: 'Dense Morning Fog',
    };
    this.showFeed(labels[w]);
    this.emitHud();
  }

  public setWaypoint(x: number, y: number, label = 'GPS Pin'): void {
    const cx = Math.max(80, Math.min(WORLD_SIZE - 80, x));
    const cy = Math.max(80, Math.min(WORLD_SIZE - 80, y));
    this.waypoint = { x: cx, y: cy, label };
    this.waypointBeacon.visible = true;
    this.waypointBeacon.position.set(cx * WORLD_SCALE, 0, cy * WORLD_SCALE);
    soundEngine.playPickup(false);
    this.showFeed(`GPS Pin: ${label}`);
    this.emitHud();
  }

  public clearWaypoint(): void {
    this.waypoint = null;
    this.waypointBeacon.visible = false;
    this.emitHud();
  }

  public getMapPoiData(): MapPoiData {
    return {
      garage: { x: this.map.garageZone.x, y: this.map.garageZone.y },
      stations: this.stations.map((s) => ({ id: s.id, kind: s.kind, name: s.name, x: s.x, y: s.y })),
      ramps: this.stuntRamps.map((r) => ({ id: r.id, label: r.label, x: r.x, y: r.y })),
      easterEggs: this.easterEggs.map((e) => ({ id: e.id, x: e.x, y: e.y, found: e.found })),
      player: { x: this.px, y: this.py, angle: this.pAngle },
      waypoint: this.waypoint ? { ...this.waypoint } : null,
      activeMissionTarget: this.activeMission
        ? { x: this.activeMission.targetX, y: this.activeMission.targetY, label: this.activeMission.objectiveText }
        : null,
    };
  }

  // ==================== GRAB & THROW ANY 3D OBJECT ====================

  public triggerGrabOrThrow(): void {
    if (this.paused || this.wasted || this.titlePreviewMode || this.currentVehicle) return;
    soundEngine.unlock();

    if (this.heldProp) {
      this.throwHeldProp();
      return;
    }

    // Find nearest grabbable prop
    let best: WorldProp | null = null;
    let bestD = 58;
    for (const p of this.props) {
      if (p.state !== 'idle') continue;
      const d = Math.hypot(p.x - this.px, p.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }

    if (best) {
      best.state = 'held';
      this.heldProp = best;
      this.crouching = false;
      this.scene.remove(best.mesh);
      best.mesh.position.set(0, 0, 0);
      best.mesh.rotation.set(0, 0, 0);
      this.playerRig.holdAnchor.add(best.mesh);
      soundEngine.playPickup(false);
      this.showFeed(`Grabbed ${PROP_LABELS[best.kind]}! Fire to Throw`);
    } else {
      this.showFeed('Walk near a Barrel, Crate, Cone or Tire!');
    }
  }

  private throwHeldProp(): void {
    const p = this.heldProp;
    if (!p) return;
    this.heldProp = null;

    // Detach back into world space above hero
    this.playerRig.holdAnchor.remove(p.mesh);
    this.scene.add(p.mesh);

    const throwAng = this.getCameraForwardAngle();
    this.pAngle = throwAng;
    const isBheemOrMotu = this.profile.characterId === 'bheem' || this.profile.characterId === 'motu';
    const power = isBheemOrMotu ? 420 : 320;

    p.x = this.px + Math.cos(throwAng) * 16;
    p.y = this.py + Math.sin(throwAng) * 16;
    p.h = 2.4 + this.pHeight;
    p.vx = Math.cos(throwAng) * power;
    p.vy = Math.sin(throwAng) * power;
    p.vh = 6.2 - this.camPitch * 4.5;
    p.spin = 9.5;
    p.state = 'thrown';
    p.mesh.position.set(p.x * WORLD_SCALE, p.h, p.y * WORLD_SCALE);

    this.attackSwingTimer = 0.28;
    soundEngine.playMelee();
    this.addShake(0.08, 0.28);
  }

  // ==================== SMART INTERACT: LOOT GUNS / DISARM / RIDE CAR ====================

  public triggerSmartInteract(): void {
    if (this.paused || this.wasted || this.titlePreviewMode) return;
    soundEngine.unlock();

    if (this.sittingBenchId) {
      this.standUpFromBench();
      return;
    }

    // 1. If in vehicle, exit vehicle
    if (this.currentVehicle) {
      this.triggerVehicleToggle();
      return;
    }

    // 2. Loot nearby dropped weapon on street
    const nearDrop = this.findNearestDroppedWeapon(58);
    if (nearDrop) {
      this.collectDroppedWeapon(nearDrop);
      return;
    }

    // 3. Take gun straight from a close-range armed NPC! (Disarm!)
    const nearArmedNpc = this.findNearestArmedNpc(54);
    if (nearArmedNpc && nearArmedNpc.carriedWeapon) {
      const stolen = nearArmedNpc.carriedWeapon;
      nearArmedNpc.carriedWeapon = null;
      (Object.keys(nearArmedNpc.rig.weapons) as WeaponId[]).forEach((k) => {
        nearArmedNpc.rig.weapons[k].visible = false;
      });
      nearArmedNpc.scaredTimer = 4.0;
      const knockAng = Math.atan2(nearArmedNpc.y - this.py, nearArmedNpc.x - this.px);
      nearArmedNpc.vx = Math.cos(knockAng) * 130;
      nearArmedNpc.vy = Math.sin(knockAng) * 130;

      this.grantWeapon(stolen, WEAPON_AMMO_GRANT[stolen]);
      this.spawnRing3D(nearArmedNpc.x, nearArmedNpc.y, 0x38bdf8, 3.0);
      this.showFeed(`Took ${WEAPON_LABELS[stolen]} from Enemy!`);
      return;
    }

    // 4. Interactive Map Stations (ATM Cash, Chai & Samosa Heal, Desi Arms Gun Shop)
    const nearStation = this.findNearestStation(68);
    if (nearStation) {
      this.interactWithStation(nearStation);
      return;
    }

    // 5. Ride / Hijack nearby vehicle
    const nearVeh = this.findNearestVehicle();
    if (nearVeh) {
      this.triggerVehicleToggle();
      return;
    }

    // 6. Sit on nearby unoccupied street/park bench!
    const nearBench = this.findNearestFreeBench(38);
    if (nearBench) {
      this.cancelEmote();
      this.crouching = false;
      this.aiming = false;
      if (this.heldProp) this.throwHeldProp();
      nearBench.occupiedBy = this.profile.uid;
      this.sittingBenchId = nearBench.id;
      this.px = nearBench.x + Math.sin(nearBench.rot) * 1.4;
      this.py = nearBench.y + Math.cos(nearBench.rot) * 1.4;
      this.pAngle = Math.PI / 2 - nearBench.rot;
      this.pvx = 0;
      this.pvy = 0;
      soundEngine.playVehicleDoor();
      this.showFeed('Relaxing on Bench · Move or press E to stand');
      return;
    }

    // 7. Chat / Funny Banter with a nearby friendly NPC or Cow!
    const nearFriendly = this.findNearestFriendlyNpc(52);
    if (nearFriendly) {
      if (nearFriendly.role === 'cow') {
        soundEngine.playCowMoo();
        this.showFeed(randomCowLine());
      } else {
        soundEngine.playCartoonBoing();
        nearFriendly.behavior = 'wave';
        nearFriendly.behaviorTimer = 2.6;
        this.awardProgress(50, 10);
        this.spawnBurst3D(nearFriendly.x, nearFriendly.y, 1.8, 0xfacc15, 6);
        this.showFeed(`${randomNpcBanter()} (+₹50 tip!)`);
      }
      return;
    }

    // 8. Grab nearby prop if no car nearby
    const nearProp = this.findNearestProp(56);
    if (nearProp) {
      this.triggerGrabOrThrow();
      return;
    }

    // 9. Open Garage if inside Raju's Garage pad
    if (this.isNearGarage()) {
      this.callbacks.onOpenGarageRequested();
      return;
    }

    // Fallback: summon personal ride
    this.spawnOrEnterPersonalVehicle();
  }

  private interactWithStation(st: MapStation): void {
    if (st.kind === 'atm') {
      if (st.cooldown > 0) {
        this.showFeed(`ATM Recharging (${Math.ceil(st.cooldown)}s)`);
        return;
      }
      st.cooldown = 18;
      this.awardProgress(500, 35);
      soundEngine.playPickup(true);
      this.spawnRing3D(st.x, st.y, 0x10b981, 4.5);
      this.spawnBurst3D(st.x, st.y, 1.4, 0x34d399, 14);
      this.showFeed('ATM Cash +₹500! Financial freedom unlocked.');
      return;
    }

    if (st.kind === 'chai') {
      const cost = this.profile.rupees >= 50 ? 50 : 0;
      if (cost > 0) {
        this.profile.rupees -= cost;
        this.profile.updatedAt = Date.now();
        this.callbacks.onProfileMutated({ ...this.profile });
      }
      this.hp = this.maxHp;
      this.armor = Math.min(this.maxArmor, this.armor + 35);
      this.specialCooldown = 0;
      soundEngine.playPickup(true);
      this.spawnRing3D(st.x, st.y, 0xf59e0b, 4.5);
      this.spawnBurst3D(st.x, st.y, 1.4, 0xfbbf24, 14);
      this.showFeed(cost > 0 ? 'Hot Chai! Full HP + Armor (-₹50)' : 'Free Cutting Chai! Full HP!');
      return;
    }

    // Desi Arms Gun Shop
    if (this.profile.rupees < 250) {
      this.showFeed('Need ₹250! Visit an ATM first');
      return;
    }
    this.profile.rupees -= 250;
    this.profile.updatedAt = Date.now();
    this.callbacks.onProfileMutated({ ...this.profile });
    this.ownedWeapons.smg = true;
    this.ownedWeapons.shotgun = true;
    this.ownedWeapons.ak47 = true;
    this.weaponAmmo.smg = Math.min(180, (this.weaponAmmo.smg || 0) + 60);
    this.weaponAmmo.shotgun = Math.min(90, (this.weaponAmmo.shotgun || 0) + 18);
    this.weaponAmmo.ak47 = Math.min(180, (this.weaponAmmo.ak47 || 0) + 45);
    this.magAmmo.smg = WEAPON_MAG_SIZE.smg;
    this.magAmmo.shotgun = WEAPON_MAG_SIZE.shotgun;
    this.magAmmo.ak47 = WEAPON_MAG_SIZE.ak47;
    this.armor = Math.min(this.maxArmor, this.armor + 50);
    this.weaponId = 'ak47';
    setRigWeaponVisual(this.playerRig, 'ak47');
    soundEngine.playPickup(true);
    this.spawnRing3D(st.x, st.y, 0x38bdf8, 5.0);
    this.spawnBurst3D(st.x, st.y, 1.5, 0x38bdf8, 16);
    this.showFeed('Full Arsenal + Vest Restocked! (+50 Armor)');
  }

  private grantWeapon(w: WeaponId, ammo: number): void {
    this.ownedWeapons[w] = true;
    if (w !== 'bat' && w !== 'pistol') {
      this.weaponAmmo[w] = Math.min(180, (this.weaponAmmo[w] || 0) + ammo);
      this.magAmmo[w] = Math.min(WEAPON_MAG_SIZE[w], this.weaponAmmo[w]);
    } else {
      this.magAmmo[w] = WEAPON_MAG_SIZE[w];
    }
    this.reloadTimer = 0;
    this.weaponId = w;
    setRigWeaponVisual(this.playerRig, w);
    soundEngine.playPickup(true);
  }

  private collectDroppedWeapon(dw: DroppedWeapon): void {
    const idx = this.droppedWeapons.indexOf(dw);
    if (idx >= 0) {
      this.scene.remove(dw.mesh);
      this.droppedWeapons.splice(idx, 1);
    }
    this.grantWeapon(dw.weaponId, dw.ammo);
    this.spawnBurst3D(dw.x, dw.y, 0.9, 0x38bdf8, 8);
    this.showFeed(`Equipped ${WEAPON_LABELS[dw.weaponId]} (+${dw.ammo})`);
  }

  // ==================== COMBAT & SHOOTING (5 WEAPONS + HITMARKER) ====================

  private getCameraForwardAngle(): number {
    // Camera looks toward (-sin(camYaw), -cos(camYaw)) in (X, Z)
    return Math.atan2(-Math.cos(this.camYaw), -Math.sin(this.camYaw));
  }

  public triggerAttack(): void {
    if (this.paused || this.wasted || this.titlePreviewMode) return;
    if (this.heldProp && !this.currentVehicle) {
      this.throwHeldProp();
      return;
    }
    if (this.attackCooldown > 0 || this.reloadTimer > 0) return;

    soundEngine.unlock();
    const ox = this.currentVehicle ? this.currentVehicle.x : this.px;
    const oy = this.currentVehicle ? this.currentVehicle.y : this.py;

    // Magazine check & automatic reload for firearms!
    if (this.weaponId !== 'bat' && !this.currentVehicle) {
      if ((this.magAmmo[this.weaponId] || 0) <= 0) {
        if (this.weaponId !== 'pistol' && (this.weaponAmmo[this.weaponId] || 0) <= 0) {
          this.showFeed(`${WEAPON_LABELS[this.weaponId]} Empty! Switched to Pistol`);
          this.setWeapon('pistol');
          return;
        }
        this.triggerReload();
        return;
      }
      this.magAmmo[this.weaponId] -= 1;
      if (this.weaponId !== 'pistol' && (this.weaponAmmo[this.weaponId] || 0) > 0) {
        this.weaponAmmo[this.weaponId] -= 1;
      }
    }

    // Aim along 360° camera look vector (just like BGMI/GTA) with subtle aim-assist!
    let aimAngle = this.getCameraForwardAngle();
    let bestScore = Infinity;
    const autoRange = this.weaponId === 'bat' ? 58 : 300;
    const assistCone = this.aiming ? 0.24 : 0.42;

    for (const npc of this.npcs) {
      if (!npc.alive) continue;
      const d = Math.hypot(npc.x - ox, npc.y - oy);
      if (d > autoRange) continue;
      const ang = Math.atan2(npc.y - oy, npc.x - ox);
      let diff = Math.abs(ang - aimAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < assistCone && d < bestScore) {
        bestScore = d;
        aimAngle = ang;
      }
    }
    for (const r of this.remotes.values()) {
      const d = Math.hypot(r.x - ox, r.y - oy);
      if (d > autoRange) continue;
      const ang = Math.atan2(r.y - oy, r.x - ox);
      let diff = Math.abs(ang - aimAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < assistCone && d < bestScore) {
        bestScore = d;
        aimAngle = ang;
      }
    }

    if (!this.currentVehicle) {
      this.pAngle = aimAngle;
    }
    this.attackSwingTimer = 0.2;
    this.callbacks.onSendShoot(this.weaponId, ox, oy, aimAngle);

    const spreadMult = this.aiming ? 0.35 : this.crouching ? 0.6 : 1.0;

    if (this.weaponId === 'bat' && !this.currentVehicle) {
      this.attackCooldown = 0.32;
      soundEngine.playMelee();
      this.addShake(0.1, 0.32);
      this.spawnRing3D(ox + Math.cos(aimAngle) * 18, oy + Math.sin(aimAngle) * 18, 0xf97316, 2.2);

      for (const npc of this.npcs) {
        if (!npc.alive) continue;
        if (Math.hypot(npc.x - ox, npc.y - oy) < 48) {
          this.damageNpc(npc, 50, Math.cos(aimAngle), Math.sin(aimAngle));
        }
      }
      for (const r of this.remotes.values()) {
        if (Math.hypot(r.x - ox, r.y - oy) < 48) {
          this.hitMarkerTimer = 0.18;
          soundEngine.playHitConfirm();
          this.callbacks.onSendPvpHit(r.uid, 35);
          this.spawnBurst3D(r.x, r.y, 1.4, 0xf97316, 8);
          this.showFeed(`Smacked ${r.name}!`);
        }
      }
      for (const v of this.vehicles) {
        if (v !== this.currentVehicle && Math.hypot(v.x - ox, v.y - oy) < 58) {
          this.damageVehicle(v, 36);
        }
      }
      return;
    }

    // Trigger lightweight muzzle flash + tactile gun recoil kick!
    this.triggerMuzzleFlash(ox, oy, aimAngle);

    if (this.weaponId === 'shotgun' && !this.currentVehicle) {
      this.attackCooldown = 0.54;
      this.recoilKick = 0.42;
      soundEngine.playShoot(true);
      this.addShake(0.14, 0.52);
      for (let p = -2; p <= 2; p++) {
        const spread = aimAngle + p * 0.085 * spreadMult;
        this.spawnProjectile(ox, oy, spread, 580, 28, true, false, this.profile.uid, 0xf97316);
      }
      return;
    }

    if (this.weaponId === 'smg' && !this.currentVehicle) {
      this.attackCooldown = 0.095;
      this.recoilKick = 0.16;
      soundEngine.playShoot(false);
      this.addShake(0.04, 0.14);
      const jitter = (Math.random() - 0.5) * 0.07 * spreadMult;
      this.spawnProjectile(ox, oy, aimAngle + jitter, 720, 22, true, false, this.profile.uid, 0x38bdf8);
      return;
    }

    if (this.weaponId === 'ak47' && !this.currentVehicle) {
      this.attackCooldown = 0.13;
      this.recoilKick = 0.28;
      soundEngine.playShoot(true);
      this.addShake(0.07, 0.26);
      const jitter = (Math.random() - 0.5) * 0.045 * spreadMult;
      this.spawnProjectile(ox, oy, aimAngle + jitter, 800, 38, true, false, this.profile.uid, 0xfacc15);
      return;
    }

    // Pistol / Drive-by
    this.attackCooldown = 0.21;
    this.recoilKick = 0.22;
    soundEngine.playShoot(false);
    this.addShake(0.05, 0.18);
    this.spawnProjectile(ox, oy, aimAngle, 700, 32, true, false, this.profile.uid, 0xfacc15);
  }

  private triggerMuzzleFlash(ox: number, oy: number, angle: number): void {
    const mx = (ox + Math.cos(angle) * 14) * WORLD_SCALE;
    const mz = (oy + Math.sin(angle) * 14) * WORLD_SCALE;
    const my = this.pHeight + (this.crouching ? 0.96 : 1.4);
    this.muzzleFlash.position.set(mx, my, mz);
    this.muzzleFlash.rotation.set(0, Math.PI / 2 - angle, Math.random() * Math.PI);
    const scale = this.weaponId === 'shotgun' ? 1.55 : this.weaponId === 'ak47' ? 1.25 : 0.9;
    this.muzzleFlash.scale.setScalar(scale);
    this.muzzleFlash.visible = true;
    this.muzzleFlashTimer = 0.05;
  }

  private spawnProjectile(
    ox: number,
    oy: number,
    angle: number,
    speed: number,
    damage: number,
    fromPlayer: boolean,
    fromNpc: boolean,
    ownerUid: string,
    colorHex: number
  ): void {
    // Pull from pre-allocated projectile pool (Zero GC)
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    const sx = ox + Math.cos(angle) * 14;
    const sy = oy + Math.sin(angle) * 14;
    const sh = (fromPlayer ? this.pHeight : 0) + (fromPlayer && this.crouching ? 0.95 : 1.38);

    slot.active = true;
    slot.x = sx;
    slot.y = sy;
    slot.h = sh;
    slot.vx = Math.cos(angle) * speed;
    slot.vy = Math.sin(angle) * speed;
    slot.vh = 0;
    slot.life = 0.72;
    slot.damage = damage;
    slot.fromPlayer = fromPlayer;
    slot.fromNpc = fromNpc;
    slot.ownerUid = ownerUid;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    slot.mesh.position.set(sx * WORLD_SCALE, sh, sy * WORLD_SCALE);
    slot.mesh.visible = true;
  }

  public triggerVehicleToggle(): void {
    if (this.paused || this.wasted || this.titlePreviewMode) return;
    soundEngine.unlock();

    if (this.sittingBenchId) this.standUpFromBench();
    this.cancelEmote();

    if (this.currentVehicle) {
      const v = this.currentVehicle;
      const candidateAngles = [v.angle - Math.PI / 2, v.angle + Math.PI / 2, v.angle + Math.PI];
      let exitX = v.x;
      let exitY = v.y;
      for (const ang of candidateAngles) {
        const tx = v.x + Math.cos(ang) * 34;
        const ty = v.y + Math.sin(ang) * 34;
        resolveCapsuleCollision(tx, ty, 14, this.map.buildings, this.map.colliders, _colOut);
        if (Math.hypot(_colOut.x - tx, _colOut.y - ty) < 8) {
          exitX = _colOut.x;
          exitY = _colOut.y;
          break;
        }
      }
      this.px = exitX;
      this.py = exitY;
      this.pHeight = 0;
      this.pVelY = 0;
      this.currentVehicle = null;
      this.touchVehSteer = 0;
      this.touchVehThrottle = 0;
      this.touchVehBrake = 0;
      this.playerRig.group.visible = true;
      this.playerRig.group.rotation.set(0, Math.PI / 2 - this.pAngle, 0);
      soundEngine.playVehicleDoor();
      return;
    }

    // Drop held prop smoothly if entering a car
    if (this.heldProp) {
      this.throwHeldProp();
    }

    const best = this.findNearestVehicle();
    if (best) {
      this.aiming = false;
      this.crouching = false;
      this.vehicleEnterTransition = { target: best, t: 0, startX: this.px, startY: this.py };
      soundEngine.playVehicleDoor();
    } else {
      this.spawnOrEnterPersonalVehicle();
    }
  }

  public spawnOrEnterPersonalVehicle(): void {
    const type = this.profile.activeVehicleType;
    const cfg = this.profile.garageConfigs[type] || createDefaultVehicleConfig(type);

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      if (this.vehicles[i].isPlayerPersonal) {
        this.scene.remove(this.vehicles[i].mesh.group);
        this.vehicles.splice(i, 1);
      }
    }

    resolveCapsuleCollision(this.px, this.py, 24, this.map.buildings, this.map.colliders, _colOut);
    const sx = _colOut.x;
    const sy = _colOut.y;

    const personal = this.spawnWorldVehicle(type, sx, sy, this.pAngle, cfg, false, type === 'police', false, true);
    this.currentVehicle = personal;
    this.aiming = false;
    this.crouching = false;
    this.playerRig.group.visible = true;
    soundEngine.playVehicleDoor();
    this.spawnRing3D(sx, sy, 0xf59e0b, 3.6);
    this.showFeed(`${VEHICLE_SPECS[type].name} Ready!`);
  }

  public triggerHornOrAction(): void {
    if (this.paused || this.wasted || this.titlePreviewMode) return;
    soundEngine.unlock();
    const ox = this.currentVehicle ? this.currentVehicle.x : this.px;
    const oy = this.currentVehicle ? this.currentVehicle.y : this.py;
    const horn = this.currentVehicle ? this.currentVehicle.config.hornType : 'auto_peepoo';
    soundEngine.playHorn(horn);
    this.callbacks.onSendHorn(horn, ox, oy);
    this.spawnRing3D(ox, oy, 0xfde047, 3.8);

    let reacted = false;
    for (const npc of this.npcs) {
      if (!npc.alive) continue;
      const d = Math.hypot(npc.x - ox, npc.y - oy);
      if (d < 150) {
        const a = Math.atan2(npc.y - oy, npc.x - ox);
        npc.vx = Math.cos(a) * 90;
        npc.vy = Math.sin(a) * 90;
        npc.scaredTimer = 2.0;
        if (!reacted) {
          reacted = true;
          if (npc.role === 'cow') {
            soundEngine.playCowMoo();
            if (this.activeCityEvent?.def.id === 'cow_parade') {
              this.awardProgress(150, 20);
              this.showFeed(`VIP COW TIP +₹150! ${randomCowLine()}`);
            } else {
              this.showFeed(randomCowLine());
            }
          } else {
            this.showFeed(randomHonkReaction());
          }
        }
      }
    }
  }

  public triggerSpecialPower(): void {
    if (this.paused || this.wasted || this.titlePreviewMode) return;
    if (this.specialCooldown > 0) return;

    soundEngine.unlock();
    const charId = this.profile.characterId;
    const charDef = CHARACTERS[charId];
    this.specialCooldown = charDef.specialCooldown;
    this.specialActiveTimer = charDef.specialDuration;

    const ox = this.currentVehicle ? this.currentVehicle.x : this.px;
    const oy = this.currentVehicle ? this.currentVehicle.y : this.py;

    soundEngine.playSpecial(charId);
    this.callbacks.onSendSpecial(charId, ox, oy);
    this.addShake(0.24, 0.85);

    if (charId === 'motu') {
      this.hp = Math.min(this.maxHp, this.hp + 25);
      this.spawnRing3D(ox, oy, 0xf59e0b, 7.5);
      this.spawnBurst3D(ox, oy, 1.5, 0xfbbf24, 16);
      this.showFeed('SAMOSA RAGE! +25 HP');
      this.blastArea(ox, oy, 150, 75, 280);
    } else if (charId === 'patlu') {
      this.spawnRing3D(ox, oy, 0x38bdf8, 12.0);
      this.spawnBurst3D(ox, oy, 1.5, 0x38bdf8, 16);
      this.showFeed('IDEA EMP! Enemies Stalled');
      this.blastArea(ox, oy, 220, 55, 140);
      for (const v of this.vehicles) {
        if (v !== this.currentVehicle && Math.hypot(v.x - ox, v.y - oy) < 260) {
          v.stalledTimer = 4.5;
          v.speed *= 0.1;
        }
      }
    } else if (charId === 'oggy') {
      this.oggyDashAngle = this.currentVehicle ? this.currentVehicle.angle : this.getCameraForwardAngle();
      if (this.currentVehicle) this.currentVehicle.speed = Math.max(this.currentVehicle.speed + 220, 560);
      this.spawnRing3D(ox, oy, 0x38bdf8, 6.2);
      this.showFeed('SWATTER DASH!');
      this.blastArea(ox, oy, 140, 80, 320);
    } else if (charId === 'bheem') {
      this.hitstopTimer = 0.045;
      this.addShake(0.32, 1.2);
      this.spawnRing3D(ox, oy, 0xf97316, 11.0);
      this.spawnBurst3D(ox, oy, 1.4, 0xfacc15, 22);
      this.showFeed('LADDU SUPER SLAM!');
      this.blastArea(ox, oy, 195, 110, 420);
    } else if (charId === 'chingum') {
      this.wantedLevel = 0;
      this.wantedDecayTimer = 0;
      this.spawnRing3D(ox, oy, 0x60a5fa, 11.0);
      this.showFeed('CHINGUM WHISTLE! 0 Stars');
      this.blastArea(ox, oy, 180, 40, 260);
    }
  }

  private blastArea(ox: number, oy: number, radius: number, damage: number, pushForce: number): void {
    for (const npc of this.npcs) {
      if (!npc.alive) continue;
      const d = Math.hypot(npc.x - ox, npc.y - oy);
      if (d < radius && d > 0.1) {
        this.damageNpc(npc, damage, (npc.x - ox) / d, (npc.y - oy) / d);
      }
    }
    for (const v of this.vehicles) {
      if (v === this.currentVehicle) continue;
      const d = Math.hypot(v.x - ox, v.y - oy);
      if (d < radius && d > 0.1) {
        v.vx = ((v.x - ox) / d) * pushForce;
        v.vy = ((v.y - oy) / d) * pushForce;
        v.stalledTimer = Math.max(v.stalledTimer, 1.8);
        this.damageVehicle(v, damage * 0.75);
      }
    }
    for (const r of this.remotes.values()) {
      const d = Math.hypot(r.x - ox, r.y - oy);
      if (d < radius) {
        this.hitMarkerTimer = 0.2;
        this.callbacks.onSendPvpHit(r.uid, Math.min(45, Math.round(damage * 0.6)));
      }
    }
  }

  private detonateBarrel(p: WorldProp): void {
    p.state = 'respawning';
    p.respawnTimer = 18;
    p.mesh.visible = false;
    soundEngine.playExplosion();
    this.addShake(0.3, 1.15);
    this.spawnRing3D(p.x, p.y, 0xef4444, 9.5);
    this.spawnBurst3D(p.x, p.y, 1.2, 0xf97316, 18);
    this.spawnBurst3D(p.x, p.y, 1.6, 0xef4444, 14);
    this.blastArea(p.x, p.y, 155, 115, 360);
    this.showFeed('BOOM! Gas Barrel Blast!');
  }

  // ==================== MISSIONS & MULTIPLAYER SYNC ====================

  public startMission(mission: CommunityMission): void {
    const startD = DISTRICTS.find((d) => d.id === mission.districtId) || DISTRICTS[0];
    const targetD = DISTRICTS.find((d) => d.id === mission.targetDistrictId) || DISTRICTS[1];

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      if (this.vehicles[i].isMissionTarget) {
        this.scene.remove(this.vehicles[i].mesh.group);
        this.vehicles.splice(i, 1);
      }
    }

    if (mission.type === 'delivery') {
      this.activeMission = {
        mission,
        stage: 'pickup',
        objectiveText: `Pick up at ${startD.name}`,
        targetX: startD.x,
        targetY: startD.y,
        timeLeft: 95,
        progress: 0,
        total: 2,
        checkpoints: [
          { x: startD.x, y: startD.y, done: false },
          { x: targetD.x, y: targetD.y, done: false },
        ],
      };
    } else if (mission.type === 'collect') {
      const pts: { x: number; y: number; done: boolean }[] = [];
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const rad = 120 + (i % 2) * 90;
        let cx = Math.max(200, Math.min(WORLD_SIZE - 200, startD.x + Math.cos(ang) * rad));
        let cy = Math.max(200, Math.min(WORLD_SIZE - 200, startD.y + Math.sin(ang) * rad));
        if (pointHitsBuilding(cx, cy, 24, this.map.buildings)) {
          cx = startD.x;
          cy = startD.y;
        }
        pts.push({ x: cx, y: cy, done: false });
      }
      this.activeMission = {
        mission,
        stage: 'collect',
        objectiveText: `Grab 6 Stashes (${startD.name})`,
        targetX: pts[0].x,
        targetY: pts[0].y,
        timeLeft: 105,
        progress: 0,
        total: pts.length,
        checkpoints: pts,
      };
    } else if (mission.type === 'race') {
      const pts = [
        { x: startD.x, y: startD.y, done: false },
        { x: ROAD_CENTERS[2], y: ROAD_CENTERS[2], done: false },
        { x: ROAD_CENTERS[4], y: ROAD_CENTERS[2], done: false },
        { x: ROAD_CENTERS[4], y: ROAD_CENTERS[4], done: false },
        { x: targetD.x, y: targetD.y, done: false },
      ];
      this.activeMission = {
        mission,
        stage: 'race',
        objectiveText: `Checkpoint 1/5`,
        targetX: pts[0].x,
        targetY: pts[0].y,
        timeLeft: 100,
        progress: 0,
        total: pts.length,
        checkpoints: pts,
      };
    } else {
      for (let i = 0; i < 2; i++) {
        const rx = ROAD_CENTERS[2 + i * 2];
        const ry = ROAD_CENTERS[3];
        const v = this.spawnWorldVehicle(
          'ambassador',
          rx,
          ry + (i === 0 ? -90 : 90),
          0,
          { paintId: 'midnight_desi', decalId: 'tiger', engineLevel: 2, handlingLevel: 2, armorLevel: 1, hornType: 'classic' },
          true,
          false,
          true,
          false
        );
        v.hp = 100;
        v.maxHp = 100;
        v.laneAxis = i === 0 ? 'x' : 'y';
        v.laneLine = i === 0 ? ry : rx;
      }
      this.activeMission = {
        mission,
        stage: 'takedown',
        objectiveText: `Destroy 2 Rogue Cars`,
        targetX: ROAD_CENTERS[2],
        targetY: ROAD_CENTERS[3],
        timeLeft: 120,
        progress: 0,
        total: 2,
        checkpoints: [],
      };
    }

    soundEngine.playPickup(true);
    this.showFeed(`Mission: ${mission.title}`);
  }

  public cancelMission(): void {
    this.activeMission = null;
    this.missionBeacon.visible = false;
    this.missionArrow.visible = false;
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      if (this.vehicles[i].isMissionTarget) {
        this.scene.remove(this.vehicles[i].mesh.group);
        this.vehicles.splice(i, 1);
      }
    }
  }

  public applyRemoteSnapshot(players: RemotePlayerState[]): void {
    const now = performance.now();
    const seen = new Set<string>();
    for (const p of players) {
      if (p.uid === this.profile.uid) continue;
      seen.add(p.uid);
      const existing = this.remotes.get(p.uid);
      if (existing) {
        if (existing.characterId !== p.characterId) {
          this.scene.remove(existing.rig.group);
          existing.rig = createCharacter3D(p.characterId, 'hero');
          this.scene.add(existing.rig.group);
          existing.characterId = p.characterId;
        }
        existing.name = p.name;
        existing.targetX = p.x;
        existing.targetY = p.y;
        existing.targetAngle = p.angle;
        existing.inVehicleType = p.inVehicleType;
        existing.vehicleConfig = p.vehicleConfig;
        existing.weaponId = p.weaponId || 'pistol';
        existing.specialActive = p.specialActive;
        existing.wantedLevel = p.wantedLevel;
        existing.hp = p.hp;
        existing.emote = p.emote || null;
        existing.emoteTime = p.emoteTime || 0;
        existing.lastUpdate = now;

        setRigWeaponVisual(existing.rig, existing.weaponId);

        const nextKey = p.inVehicleType
          ? `${p.inVehicleType}-${p.vehicleConfig?.paintId || ''}-${p.vehicleConfig?.decalId || ''}`
          : '';
        if (nextKey !== existing.vehKey) {
          if (existing.vehMesh) {
            this.scene.remove(existing.vehMesh.group);
            existing.vehMesh = null;
          }
          if (p.inVehicleType) {
            existing.vehMesh = createVehicle3D(p.inVehicleType, p.vehicleConfig || createDefaultVehicleConfig(p.inVehicleType));
            this.scene.add(existing.vehMesh.group);
          }
          existing.vehKey = nextKey;
        }
      } else {
        const rig = createCharacter3D(p.characterId, 'hero');
        rig.group.position.set(p.x * WORLD_SCALE, 0, p.y * WORLD_SCALE);
        this.scene.add(rig.group);

        const label = createNameplateSprite(`${p.name} · ${p.uid}`, CHARACTERS[p.characterId]?.accentColor || '#facc15');
        label.position.set(p.x * WORLD_SCALE, 3.2, p.y * WORLD_SCALE);
        this.scene.add(label);

        let vehMesh: VehicleMesh3D | null = null;
        let vehKey = '';
        if (p.inVehicleType) {
          vehMesh = createVehicle3D(p.inVehicleType, p.vehicleConfig || createDefaultVehicleConfig(p.inVehicleType));
          vehMesh.group.position.set(p.x * WORLD_SCALE, 0, p.y * WORLD_SCALE);
          this.scene.add(vehMesh.group);
          vehKey = `${p.inVehicleType}-${p.vehicleConfig?.paintId || ''}-${p.vehicleConfig?.decalId || ''}`;
        }

        this.remotes.set(p.uid, {
          uid: p.uid,
          name: p.name,
          characterId: p.characterId,
          x: p.x,
          y: p.y,
          targetX: p.x,
          targetY: p.y,
          angle: p.angle,
          targetAngle: p.angle,
          inVehicleType: p.inVehicleType,
          vehicleConfig: p.vehicleConfig,
          weaponId: p.weaponId || 'pistol',
          specialActive: p.specialActive,
          wantedLevel: p.wantedLevel,
          hp: p.hp,
          lastUpdate: now,
          emote: p.emote || null,
          emoteTime: p.emoteTime || 0,
          rig,
          vehMesh,
          vehKey,
          label,
        });
      }
    }

    for (const [uid, r] of this.remotes) {
      if (!seen.has(uid)) {
        this.scene.remove(r.rig.group);
        this.scene.remove(r.label);
        if (r.vehMesh) this.scene.remove(r.vehMesh.group);
        this.remotes.delete(uid);
      }
    }
  }

  public handleRemoteSpecial(evt: { uid: string; characterId: string; x: number; y: number }): void {
    const col = new THREE.Color(CHARACTERS[(evt.characterId as CharacterId) || 'motu']?.accentColor || '#f59e0b').getHex();
    this.spawnRing3D(evt.x, evt.y, col, 8.5);
    this.spawnBurst3D(evt.x, evt.y, 1.5, col, 12);
    if (Math.hypot(evt.x - this.px, evt.y - this.py) < 420) {
      soundEngine.playSpecial((evt.characterId as CharacterId) || 'motu');
    }
  }

  public handleRemoteShoot(evt: { uid: string; weaponId: string; x: number; y: number; angle: number }): void {
    if (evt.weaponId === 'bat') {
      this.spawnRing3D(evt.x, evt.y, 0xf97316, 2.2);
    } else {
      this.spawnProjectile(evt.x, evt.y, evt.angle, 640, 0, false, false, evt.uid, 0x38bdf8);
    }
    if (Math.hypot(evt.x - this.px, evt.y - this.py) < 360) {
      soundEngine.playShoot(evt.weaponId === 'shotgun' || evt.weaponId === 'ak47');
    }
  }

  public handlePvpHit(evt: { attackerUid: string; attackerName: string; targetUid: string; damage: number }): void {
    if (evt.targetUid !== this.profile.uid) return;
    this.takeDamage(evt.damage);
    this.showFeed(`Hit by ${evt.attackerName}! -${evt.damage} HP`);
  }

  public handleRemoteHorn(evt: { uid: string; hornType: string; x: number; y: number }): void {
    this.spawnRing3D(evt.x, evt.y, 0xfde047, 3.2);
    if (Math.hypot(evt.x - this.px, evt.y - this.py) < 380) {
      soundEngine.playHorn((evt.hornType as VehicleCustomConfig['hornType']) || 'auto_peepoo');
    }
  }

  public respawnAfterWasted(): void {
    this.wasted = false;
    this.wastedTimer = 0;
    this.hp = this.maxHp;
    this.armor = 50;
    this.reloadTimer = 0;
    this.stumbleTimer = 0;
    this.wantedLevel = 0;
    this.currentVehicle = null;
    this.vehicleEnterTransition = null;
    this.standUpFromBench();
    this.cancelEmote();
    this.pHeight = 0;
    this.pVelY = 0;
    this.crouching = false;
    this.aiming = false;
    this.playerRig.group.visible = true;
    this.playerRig.group.rotation.set(0, Math.PI / 2 - this.pAngle, 0);
    this.px = SPAWN_X;
    this.py = SPAWN_Y;
    this.spawnRing3D(this.px, this.py, 0x22c55e, 4);
    this.showFeed('Freshly Respawned at Chai Chowk! Try not to crash immediately.');
  }

  // ==================== INPUT EVENTS (PC MOUSE + KEYBOARD + POINTER LOCK) ====================

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('wheel', this.handleWheel, { passive: true });
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('contextmenu', this.handleContextMenu);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleWheel = (e: WheelEvent) => {
    if (this.titlePreviewMode || this.paused) return;
    this.camZoomOffset = Math.max(-1.8, Math.min(5.5, this.camZoomOffset + e.deltaY * 0.004));
  };

  private handleContextMenu = (e: MouseEvent) => e.preventDefault();
  private handleContextLost = (e: Event) => e.preventDefault();

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    if (!this.pointerLocked) {
      this.firingHeld = false;
      this.aiming = false;
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    if (this.titlePreviewMode || this.paused) return;
    if (e.pointerType === 'touch') return; // Android touch handled cleanly by TouchControls 360° pad
    soundEngine.unlock();

    if (this.pointerLocked) {
      if (e.button === 0) {
        this.firingHeld = true;
        this.triggerAttack();
      } else if (e.button === 2) {
        this.setAiming(true);
      }
      return;
    }

    this.pointerDownPos = { x: e.clientX, y: e.clientY, time: performance.now(), button: e.button };
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.didDrag = false;
    this.draggingCam = true;

    if (e.button === 2) {
      this.setAiming(true);
    } else if (e.button === 0) {
      // Quick click fires; dragging orbits 360° smoothly!
      this.firingHeld = true;
      this.triggerAttack();
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (this.titlePreviewMode || this.paused) return;

    const freeLook = this.heldKeys.has('AltLeft') || this.heldKeys.has('AltRight');

    if (this.pointerLocked) {
      this.addCameraOrbit(e.movementX, e.movementY, freeLook);
      return;
    }

    if (!this.draggingCam) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y) > 5) {
      this.didDrag = true;
      if (this.pointerDownPos.button === 0) {
        // User is dragging to look 360° instead of holding fire
        this.firingHeld = false;
      }
    }
    this.addCameraOrbit(dx, dy, freeLook);
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (e.button === 2) {
      this.setAiming(false);
    }
    if (e.button === 0) {
      this.firingHeld = false;
    }
    if (!this.pointerLocked) {
      this.draggingCam = false;
      this.didDrag = false;
    }
  };

  private handleResize = (): void => {
    const rect = this.mountEl.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const code = e.code;
    const wasHeld = this.heldKeys.has(code);
    this.heldKeys.add(code);

    if (this.titlePreviewMode || this.paused) return;

    if (!wasHeld) {
      if (code === 'KeyE') {
        this.triggerSmartInteract();
      } else if (code === 'KeyG') {
        this.triggerGrabOrThrow();
      } else if (code === 'KeyB') {
        this.callbacks.onOpenGarageRequested();
      } else if (code === 'Space') {
        e.preventDefault();
        if (!this.currentVehicle) this.triggerJump();
      } else if (code === 'KeyQ') {
        this.triggerSpecialPower();
      } else if (code === 'KeyF') {
        this.triggerAttack();
      } else if (code === 'KeyH') {
        this.triggerHornOrAction();
      } else if (code === 'KeyR') {
        this.triggerReload();
      } else if (code === 'KeyC') {
        this.toggleCrouch();
      } else if (code === 'KeyV') {
        this.cycleCameraMode();
      } else if (code === 'KeyL') {
        this.requestPointerLock();
      } else if (code === 'KeyX') {
        this.playEmote('wave');
      } else if (code === 'Digit1') {
        this.setWeapon('bat');
      } else if (code === 'Digit2') {
        this.setWeapon('pistol');
      } else if (code === 'Digit3') {
        this.setWeapon('smg');
      } else if (code === 'Digit4') {
        this.setWeapon('shotgun');
      } else if (code === 'Digit5') {
        this.setWeapon('ak47');
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
    if (e.code === 'AltLeft' || e.code === 'AltRight') {
      this.releaseFreeLook();
    }
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchVehSteer = 0;
    this.touchVehThrottle = 0;
    this.touchVehBrake = 0;
    this.touchDrift = false;
    this.firingHeld = false;
    this.draggingCam = false;
    this.aiming = false;
    this.freeLookActive = false;
  };

  // ==================== RENDER LOOP ====================

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.destroyed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tick = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      if (!this.paused) {
        this.update(dt);
      }
      this.renderer.render(this.scene, this.camera);
      this.renderMinimap();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  // ==================== SIMULATION UPDATE ====================

  private update(dt: number): void {
    this.elapsed += dt;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }
    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
    if (this.killFeedTimer > 0) {
      this.killFeedTimer -= dt;
      if (this.killFeedTimer <= 0) this.killFeedText = null;
    }

    // Center SkyDome on camera so horizon is infinite in 360°
    this.skyDome.position.copy(this.camera.position);

    // Update weather atmosphere, sun angle, wet roads & rain particles
    _camTarget.set(this.px * WORLD_SCALE, 0, this.py * WORLD_SCALE);
    this.weatherSystem.update(dt, this.camera.position, _camTarget);
    soundEngine.setRainAmbience(this.titlePreviewMode ? 0 : this.weatherSystem.rainIntensity);

    // Cinematic orbiting 3D camera over Chai Chowk on Title Screen
    if (this.titlePreviewMode) {
      const orbitAng = this.elapsed * 0.14;
      const cx = this.map.roundabout.x * WORLD_SCALE;
      const cz = this.map.roundabout.y * WORLD_SCALE;
      this.camera.position.set(cx + Math.cos(orbitAng) * 48, 22, cz + Math.sin(orbitAng) * 48);
      this.camera.lookAt(cx, 3, cz);
      this.updateLivingCity(dt);
      this.updateParticles(dt);
      this.updateTraffic(dt);
      return;
    }

    if (this.wasted) {
      this.wastedTimer += dt;
      this.camera.position.y += dt * 2.5;
      this.camera.lookAt(this.px * WORLD_SCALE, 1, this.py * WORLD_SCALE);
      if (this.wastedTimer > 2.4) this.respawnAfterWasted();
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.attackSwingTimer > 0) this.attackSwingTimer = Math.max(0, this.attackSwingTimer - dt);
    if (this.specialCooldown > 0) this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    if (this.specialActiveTimer > 0) this.specialActiveTimer = Math.max(0, this.specialActiveTimer - dt);
    if (this.crashQuipCooldown > 0) this.crashQuipCooldown = Math.max(0, this.crashQuipCooldown - dt);
    if (this.stumbleTimer > 0) this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    if (this.recoilKick > 0) this.recoilKick = THREE.MathUtils.damp(this.recoilKick, 0, 14, dt);
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) this.muzzleFlash.visible = false;
    }
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        const maxMag = WEAPON_MAG_SIZE[this.weaponId];
        this.magAmmo[this.weaponId] =
          this.weaponId === 'pistol' ? maxMag : Math.min(maxMag, this.weaponAmmo[this.weaponId] || 0);
        this.showFeed(`${WEAPON_LABELS[this.weaponId]} Reloaded!`);
      }
    }

    if (this.firingHeld && this.attackCooldown <= 0 && this.reloadTimer <= 0 && !this.heldProp) {
      this.triggerAttack();
    }

    // Spring BGMI free-look offset smoothly back to 0 when Eye / Alt released
    if (!this.freeLookActive && (Math.abs(this.freeLookYaw) > 0.001 || Math.abs(this.freeLookPitch) > 0.001)) {
      this.freeLookYaw = THREE.MathUtils.damp(this.freeLookYaw, 0, 10, dt);
      this.freeLookPitch = THREE.MathUtils.damp(this.freeLookPitch, 0, 10, dt);
    }

    if (this.wantedLevel > 0) {
      this.wantedDecayTimer += dt;
      const decayTime = this.profile.characterId === 'chingum' ? 10 : 20;
      if (this.wantedDecayTimer >= decayTime) {
        this.wantedDecayTimer = 0;
        this.wantedLevel = Math.max(0, this.wantedLevel - 1);
      }
    }

    if (this.activeEmote) {
      this.emoteElapsed += dt;
      if (this.emoteTimer > 0) {
        this.emoteTimer -= dt;
        if (this.emoteTimer <= 0) {
          this.cancelEmote();
        }
      }
    }

    this.updateChunkStreaming();
    this.updateLivingCity(dt);
    this.updatePlayer(dt);
    this.updateTraffic(dt);
    this.updateNpcs(dt);
    this.updateProps(dt);
    this.updateDroppedWeapons(dt);
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateMission(dt);
    this.updateRemotes(dt);
    this.updateParticles(dt);
    this.updateCamera3D(dt);

    // Emit network state at 18Hz
    this.netEmitAccum += dt;
    if (this.netEmitAccum >= 0.055) {
      this.netEmitAccum = 0;
      this.callbacks.onSendNetState({
        name: this.profile.name,
        characterId: this.profile.characterId,
        x: Math.round(this.px),
        y: Math.round(this.py),
        angle: Number(this.pAngle.toFixed(2)),
        vx: Math.round(this.pvx),
        vy: Math.round(this.pvy),
        inVehicleType: this.currentVehicle ? this.currentVehicle.type : null,
        vehicleConfig: this.currentVehicle ? this.currentVehicle.config : null,
        weaponId: this.weaponId,
        specialActive: this.specialActiveTimer > 0,
        specialTimer: this.specialActiveTimer,
        wantedLevel: this.wantedLevel,
        hp: Math.round(this.hp),
        maxHp: this.maxHp,
        emote: this.activeEmote,
        emoteTime: Number(this.emoteElapsed.toFixed(2)),
      });
    }

    this.profileSaveAccum += dt;
    if (this.profileSaveAccum >= 10 && this.distanceAccum > 0.05) {
      this.profileSaveAccum = 0;
      this.profile.stats.distanceKm = Number((this.profile.stats.distanceKm + this.distanceAccum).toFixed(2));
      this.distanceAccum = 0;
      this.profile.updatedAt = Date.now();
      this.callbacks.onProfileMutated({ ...this.profile });
    }

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.075) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private updatePlayer(dt: number): void {
    const charId = this.profile.characterId;
    const charDef = CHARACTERS[charId];
    const specialActive = this.specialActiveTimer > 0;
    const drift =
      this.touchDrift ||
      this.heldKeys.has('ShiftLeft') ||
      this.heldKeys.has('ShiftRight') ||
      (this.currentVehicle !== null && this.heldKeys.has('Space'));

    let rawX = this.touchMoveX;
    let rawY = this.touchMoveY;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) rawY -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) rawY += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) rawX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) rawX += 1;

    if (this.vehicleEnterTransition) {
      const tr = this.vehicleEnterTransition;
      tr.t = Math.min(1, tr.t + dt / 0.24);
      const doorAng = tr.target.angle - Math.PI / 2;
      const doorX = tr.target.x + Math.cos(doorAng) * 18;
      const doorY = tr.target.y + Math.sin(doorAng) * 18;
      this.px = tr.startX + (doorX - tr.startX) * tr.t;
      this.py = tr.startY + (doorY - tr.startY) * tr.t;
      this.pAngle = Math.atan2(tr.target.y - this.py, tr.target.x - this.px);
      const groundY = getGroundHeightAt(this.px, this.py, this.map, 0);
      this.playerRig.group.visible = true;
      this.playerRig.group.position.set(this.px * WORLD_SCALE, groundY, this.py * WORLD_SCALE);
      this.playerRig.group.rotation.set(0, Math.PI / 2 - this.pAngle, 0);
      animateHumanRig(this.playerRig, {
        dt,
        elapsed: this.elapsed,
        walking: true,
        speedRatio: 0.75,
        sprinting: false,
        crouching: false,
        inAir: false,
        groundVelY: 0,
        aiming: false,
        firingSwing: 0,
        reloadTimer: 0,
        recoilKick: 0,
        weaponId: this.weaponId,
        holdingProp: false,
        stumbleTimer: 0,
        specialActive,
        inVehicleType: null,
        vehicleSteer: 0,
        vehicleRoll: 0,
        sittingBench: false,
        emote: null,
        emoteTime: 0,
        lodNear: true,
      });

      if (tr.t >= 1) {
        const mounted = tr.target;
        this.vehicleEnterTransition = null;
        this.currentVehicle = mounted;
        mounted.isTraffic = false;
        mounted.stalledTimer = 0;
        if (mounted.isPolice && charId !== 'chingum') this.addWanted(1);
        this.showFeed(`Riding ${VEHICLE_SPECS[mounted.type].name}`);
      }
      return;
    }

    if (this.currentVehicle) {
      const v = this.currentVehicle;
      const spec = VEHICLE_SPECS[v.type];
      const engineMult = 1 + (v.config.engineLevel - 1) * 0.14;
      const handleMult = 1 + (v.config.handlingLevel - 1) * 0.12 + (charId === 'patlu' ? 0.12 : 0);
      const boostMult = specialActive && (charId === 'motu' || charId === 'chingum' || charId === 'oggy') ? 1.42 : 1;

      const maxSpeed = spec.maxSpeed * engineMult * boostMult;
      const accel = spec.accel * engineMult * (specialActive ? 1.35 : 1);

      const kbThrottle =
        (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp') ? 1 : 0) -
        (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown') ? 1 : 0);
      const kbSteer =
        (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight') ? 1 : 0) -
        (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft') ? 1 : 0);

      const throttle = Math.max(-1, Math.min(1, kbThrottle + this.touchVehThrottle - this.touchVehBrake));
      const targetSteer = Math.max(-1, Math.min(1, kbSteer + this.touchVehSteer));
      v.steerSmooth = THREE.MathUtils.damp(v.steerSmooth, targetSteer, 11, dt);

      if (throttle > 0) v.speed += accel * throttle * dt;
      else if (throttle < 0) v.speed += accel * 0.85 * throttle * dt;
      else v.speed *= Math.pow(0.24, dt);

      if (Math.abs(v.speed) > 8) {
        const dirSign = v.speed >= 0 ? 1 : -1;
        const steerScale = Math.min(1, Math.abs(v.speed) / 130);
        v.angle += v.steerSmooth * spec.turnRate * handleMult * (drift ? 1.32 : 1) * steerScale * dirSign * dt;
      }

      if (drift) v.speed *= Math.pow(0.58, dt);
      v.speed = Math.max(-maxSpeed * 0.42, Math.min(maxSpeed, v.speed));

      // Smooth GTA Vice City Suspension Body Roll & Pitch!
      const targetRoll = -v.steerSmooth * Math.min(1, Math.abs(v.speed) / 240) * (v.type === 'bullet' ? 0.34 : 0.09);
      const targetPitch = throttle > 0 ? -0.04 : throttle < 0 ? 0.05 : 0;
      v.bodyRoll = THREE.MathUtils.damp(v.bodyRoll, targetRoll, 9, dt);
      v.bodyPitch = THREE.MathUtils.damp(v.bodyPitch, targetPitch, 8, dt);

      const targetVx = Math.cos(v.angle) * v.speed;
      const targetVy = Math.sin(v.angle) * v.speed;
      const grip = drift ? 0.075 : 1 - spec.driftGrip + 0.16;
      v.vx += (targetVx - v.vx) * Math.min(1, grip * 60 * dt);
      v.vy += (targetVy - v.vy) * Math.min(1, grip * 60 * dt);

      const prevX = v.x;
      const prevY = v.y;
      const nextX = v.x + v.vx * dt;
      const nextY = v.y + v.vy * dt;
      const hitR = spec.width * 0.56;

      resolveCapsuleCollision(nextX, nextY, hitR, this.map.buildings, this.map.colliders, _colOut);
      if (_colOut.hit) {
        const pushDx = _colOut.x - nextX;
        const pushDy = _colOut.y - nextY;
        const mag = Math.hypot(pushDx, pushDy);
        if (mag > 0.001) {
          const nx = pushDx / mag;
          const ny = pushDy / mag;
          const intoWall = -(v.vx * nx + v.vy * ny);
          if (intoWall > 145) this.onHeavyImpact(_colOut.x, _colOut.y, intoWall / 240);
          if (intoWall > 0) {
            v.vx += nx * intoWall * 1.25;
            v.vy += ny * intoWall * 1.25;
            v.speed *= intoWall > 110 ? -0.25 : 0.55;
          }
        }
      }
      v.x = _colOut.x;
      v.y = _colOut.y;

      // Knock street props (cones, tires, crates, barrels) smoothly when driving into them
      for (const prop of this.props) {
        if (prop.state !== 'idle') continue;
        const pdx = prop.x - v.x;
        const pdy = prop.y - v.y;
        const pDist = Math.hypot(pdx, pdy);
        if (pDist < hitR + 7 && pDist > 0.01) {
          const pushSpd = Math.max(85, Math.abs(v.speed) * 1.15);
          prop.vx = (pdx / pDist) * pushSpd;
          prop.vy = (pdy / pDist) * pushSpd;
          prop.vh = 2.6;
          prop.h = 0.05;
          prop.spin = 6;
          prop.state = 'thrown';
        }
      }

      const groundY = getGroundHeightAt(v.x, v.y, this.map, v.h);

      // 3D Stunt Ramp Jump Physics for Vehicles!
      if (v.rampCooldown > 0) v.rampCooldown = Math.max(0, v.rampCooldown - dt);
      if (!v.inAir && v.rampCooldown <= 0 && Math.abs(v.speed) > 130) {
        for (const ramp of this.stuntRamps) {
          if (Math.hypot(v.x - ramp.x, v.y - ramp.y) < 38) {
            v.inAir = true;
            v.airTime = 0;
            v.rampCooldown = 1.6;
            v.h = Math.max(v.h, groundY);
            v.vh = Math.min(18.5, 9.5 + Math.abs(v.speed) * 0.025);
            v.speed = Math.max(v.speed, 320);
            soundEngine.playCartoonBoing();
            this.spawnRing3D(ramp.x, ramp.y, 0xfacc15, 5.2);
            this.showFeed(`${randomStuntLaunch()}`);
            break;
          }
        }
      }

      if (v.inAir || v.h > groundY) {
        v.airTime += dt;
        v.h += v.vh * dt;
        v.vh -= 23 * dt;
        if (v.h <= groundY) {
          v.h = groundY;
          v.vh = 0;
          v.inAir = false;
          if (v.airTime > 0.45) {
            const feverMult = this.activeCityEvent?.def.id === 'stunt_fever' ? 2 : 1;
            const bonus = Math.min(600, Math.round(v.airTime * 280)) * feverMult;
            this.awardProgress(bonus, 55);
            soundEngine.playPickup(true);
            this.addShake(0.18, 0.55);
            this.spawnRing3D(v.x, v.y, 0xf59e0b, 5.0);
            this.showFeed(`${randomStuntLanding()} +₹${bonus}`);
          }
          v.airTime = 0;
        }
      } else {
        v.h = groundY;
      }

      // Vehicle Damage Smoke VFX when below 45% HP (Pooled particles!)
      if (v.hp < v.maxHp * 0.45 && this.graphicsQuality !== 'low') {
        this.vehicleSmokeAccum += dt;
        if (this.vehicleSmokeAccum >= 0.14) {
          this.vehicleSmokeAccum = 0;
          this.spawnSmokePuff(v.x + Math.cos(v.angle) * 14, v.y + Math.sin(v.angle) * 14, 1.35 + v.h);
        }
      }

      // Rain puddle water splash burst + splash SFX when driving over road puddles!
      if (this.puddleSplashCooldown > 0) this.puddleSplashCooldown = Math.max(0, this.puddleSplashCooldown - dt);
      if (this.weatherSystem.wetness > 0.25 && Math.abs(v.speed) > 105 && !v.inAir && this.puddleSplashCooldown <= 0) {
        for (const pd of this.map.puddles) {
          if (Math.abs(v.x - pd.x) < pd.rx * 11 && Math.abs(v.y - pd.y) < pd.rz * 11) {
            this.puddleSplashCooldown = 0.34;
            this.spawnBurst3D(v.x, v.y, 0.35, 0xcbd5e1, 10);
            soundEngine.playSplash();
            break;
          }
        }
      }

      const airPitch = v.inAir ? -Math.max(-0.45, Math.min(0.48, v.vh * 0.032)) : v.bodyPitch;
      v.mesh.group.position.set(v.x * WORLD_SCALE, v.h, v.y * WORLD_SCALE);
      v.mesh.group.rotation.order = 'YXZ';
      v.mesh.group.rotation.y = Math.PI / 2 - v.angle;
      v.mesh.group.rotation.z = v.bodyRoll;
      v.mesh.group.rotation.x = airPitch;

      const wheelSpin = v.speed * dt * 0.14;
      for (const w of v.mesh.wheels) w.rotation.x += wheelSpin;

      // Render & animate driver visible inside/on the vehicle!
      this.playerRig.group.visible = true;
      this.playerRig.group.position.set(v.x * WORLD_SCALE, v.h, v.y * WORLD_SCALE);
      this.playerRig.group.rotation.order = 'YXZ';
      this.playerRig.group.rotation.y = Math.PI / 2 - v.angle;
      this.playerRig.group.rotation.z = v.bodyRoll;
      this.playerRig.group.rotation.x = airPitch;
      animateHumanRig(this.playerRig, {
        dt,
        elapsed: this.elapsed,
        walking: false,
        speedRatio: 0,
        sprinting: false,
        crouching: false,
        inAir: v.inAir,
        groundVelY: v.vh,
        aiming: false,
        firingSwing: this.attackSwingTimer,
        reloadTimer: 0,
        recoilKick: 0,
        weaponId: this.weaponId,
        holdingProp: false,
        stumbleTimer: 0,
        specialActive,
        inVehicleType: v.type,
        vehicleSteer: v.steerSmooth,
        vehicleRoll: v.bodyRoll,
        sittingBench: false,
        emote: null,
        emoteTime: 0,
        lodNear: true,
      });

      this.px = v.x;
      this.py = v.y;
      this.pAngle = v.angle;
      this.pvx = v.vx;
      this.pvy = v.vy;
      this.distanceAccum += Math.hypot(v.x - prevX, v.y - prevY) / 1000;

      // Smoothly align chase camera behind moving vehicle ONLY when user isn't orbiting manually
      if (!this.draggingCam && !this.freeLookActive && Math.abs(v.speed) > 45 && !this.pointerLocked) {
        const desiredYaw = Math.PI / 2 - v.angle + Math.PI;
        let diff = desiredYaw - this.camYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.camYaw += diff * Math.min(1, dt * 3.0);
      }

      // Ram NPCs at speed
      if (Math.abs(v.speed) > 125) {
        for (const npc of this.npcs) {
          if (!npc.alive) continue;
          if (Math.hypot(npc.x - v.x, npc.y - v.y) < 30) {
            this.damageNpc(npc, 110, Math.cos(v.angle), Math.sin(v.angle));
            this.addShake(0.12, 0.45);
          }
        }
      }

      // Auto-repair at Raju's Garage
      if (this.isNearGarage() && v.hp < v.maxHp) {
        v.hp = Math.min(v.maxHp, v.hp + 45 * dt);
        this.hp = Math.min(this.maxHp, this.hp + 25 * dt);
      }

      // Vehicle-to-vehicle smash collisions
      for (const other of this.vehicles) {
        if (other === v) continue;
        const dx = other.x - v.x;
        const dy = other.y - v.y;
        const minDist = (spec.width + VEHICLE_SPECS[other.type].width) * 0.62;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.1 && dist < minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          v.x -= nx * overlap * 0.4;
          v.y -= ny * overlap * 0.4;
          other.x += nx * overlap * 0.6;
          other.y += ny * overlap * 0.6;

          const relSpeed = Math.hypot(v.vx - other.vx, v.vy - other.vy);
          if (relSpeed > 95) {
            const smashBonus =
              (specialActive && (charId === 'motu' || charId === 'bheem')) || v.type === 'truck' ? 2.4 : 1;
            other.vx += nx * relSpeed * 0.85 * smashBonus;
            other.vy += ny * relSpeed * 0.85 * smashBonus;
            other.speed *= 0.35;
            other.stalledTimer = Math.max(other.stalledTimer, 1.1);
            this.damageVehicle(other, 32 * smashBonus);

            if (other.isPolice && charId !== 'chingum') this.addWanted(1);
            const armorMit = 1 - (v.config.armorLevel - 1) * 0.15 - (specialActive && charId === 'bheem' ? 0.5 : 0);
            if (!(specialActive && charId === 'oggy')) {
              this.takeDamage(Math.max(2, (relSpeed / 52) * Math.max(0.2, armorMit)));
            }
            this.onHeavyImpact((v.x + other.x) * 0.5, (v.y + other.y) * 0.5, relSpeed / 200);
          }
        }
      }
    } else if (this.sittingBenchId) {
      // Sitting comfortably on a bench; stands up cleanly if player presses movement!
      if (Math.hypot(rawX, rawY) > 0.25) {
        this.standUpFromBench();
      } else {
        const b = this.benches.find((bench) => bench.id === this.sittingBenchId);
        const groundY = getGroundHeightAt(this.px, this.py, this.map, 0);
        this.playerRig.group.visible = true;
        this.playerRig.group.position.set(this.px * WORLD_SCALE, groundY, this.py * WORLD_SCALE);
        this.playerRig.group.rotation.set(0, b ? b.rot : Math.PI / 2 - this.pAngle, 0);
        animateHumanRig(this.playerRig, {
          dt,
          elapsed: this.elapsed,
          walking: false,
          speedRatio: 0,
          sprinting: false,
          crouching: false,
          inAir: false,
          groundVelY: 0,
          aiming: false,
          firingSwing: 0,
          reloadTimer: 0,
          recoilKick: 0,
          weaponId: null,
          holdingProp: false,
          stumbleTimer: this.stumbleTimer,
          specialActive,
          inVehicleType: null,
          vehicleSteer: 0,
          vehicleRoll: 0,
          sittingBench: true,
          emote: this.activeEmote,
          emoteTime: this.emoteElapsed,
          lodNear: true,
        });
      }
    } else {
      // Smooth On-Foot BGMI + GTA Vice City Movement + Capsule Collisions!
      const len = Math.hypot(rawX, rawY);
      if (len > 1) {
        rawX /= len;
        rawY /= len;
      }

      if (len > 0.15 || this.aiming || this.firingHeld || this.heldProp) {
        this.cancelEmote();
      }

      const forwardX = -Math.sin(this.camYaw);
      const forwardZ = -Math.cos(this.camYaw);
      const rightX = Math.cos(this.camYaw);
      const rightZ = -Math.sin(this.camYaw);

      const moveDirX = rightX * rawX - forwardX * rawY;
      const moveDirZ = rightZ * rawX - forwardZ * rawY;

      let speed = charDef.footSpeed;
      const autoSprint = len > 0.85 || drift;
      if (this.crouching) speed *= 0.56;
      else if (this.aiming) speed *= 0.68;
      else if (autoSprint) speed *= 1.24;
      if (specialActive && charId === 'motu') speed *= 1.5;
      if (specialActive && charId === 'chingum') speed *= 1.28;

      let mvx = moveDirX * speed;
      let mvy = moveDirZ * speed;

      if (specialActive && charId === 'oggy' && this.specialActiveTimer > charDef.specialDuration - 0.32) {
        mvx = Math.cos(this.oggyDashAngle) * 540;
        mvy = Math.sin(this.oggyDashAngle) * 540;
      }

      this.pvx = THREE.MathUtils.damp(this.pvx, mvx, 14, dt);
      this.pvy = THREE.MathUtils.damp(this.pvy, mvy, 14, dt);

      const movingSpeed = Math.hypot(this.pvx, this.pvy);
      const moving = movingSpeed > 14;

      if (this.aiming || this.firingHeld) {
        const targetAng = this.getCameraForwardAngle();
        let diff = targetAng - this.pAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.pAngle += diff * Math.min(1, dt * 16);
      } else if (moving) {
        const targetAng = Math.atan2(this.pvy, this.pvx);
        let diff = targetAng - this.pAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.pAngle += diff * Math.min(1, dt * 12);
        this.walkCycle += dt * (autoSprint ? 15 : 11);
      }

      // Vertical Jump Physics
      if (this.pHeight > 0 || this.pVelY !== 0) {
        this.pHeight += this.pVelY * dt;
        this.pVelY -= 26 * dt;
        if (this.pHeight <= 0) {
          this.pHeight = 0;
          this.pVelY = 0;
        }
      }

      // 1. Capsule collision against buildings, fountain, benches, pond, gazebo, trees, poles, stalls, ATMs
      const propX = this.px + this.pvx * dt;
      const propY = this.py + this.pvy * dt;
      resolveCapsuleCollision(propX, propY, 14, this.map.buildings, this.map.colliders, _colOut);
      let nextPx = _colOut.x;
      let nextPy = _colOut.y;

      // 2. Solid vehicle collision hulls (never walk inside cars!)
      for (const veh of this.vehicles) {
        const vr = VEHICLE_SPECS[veh.type].width * 0.56 + 11;
        const dx = nextPx - veh.x;
        const dy = nextPy - veh.y;
        const dist = Math.hypot(dx, dy);
        if (dist < vr && dist > 0.01) {
          nextPx = veh.x + (dx / dist) * vr;
          nextPy = veh.y + (dy / dist) * vr;
        }
      }

      // 3. Pushable environmental props (cones, tires, crates, barrels slide slightly on bump!)
      for (const prop of this.props) {
        if (prop.state !== 'idle') continue;
        const dx = prop.x - nextPx;
        const dy = prop.y - nextPy;
        const dist = Math.hypot(dx, dy);
        if (dist < 17 && dist > 0.01) {
          const push = 17 - dist;
          const pnx = dx / dist;
          const pny = dy / dist;
          const propNextX = prop.x + pnx * push * 0.7;
          const propNextY = prop.y + pny * push * 0.7;
          if (!pointHitsBuilding(propNextX, propNextY, 8, this.map.buildings)) {
            prop.x = propNextX;
            prop.y = propNextY;
            const pGround = getGroundHeightAt(prop.x, prop.y, this.map, 0);
            prop.mesh.position.set(prop.x * WORLD_SCALE, pGround, prop.y * WORLD_SCALE);
          }
          nextPx -= pnx * push * 0.3;
          nextPy -= pny * push * 0.3;
        }
      }

      this.px = nextPx;
      this.py = nextPy;
      this.distanceAccum += Math.hypot(this.pvx * dt, this.pvy * dt) / 1000;

      const groundY = getGroundHeightAt(this.px, this.py, this.map, this.pHeight);

      // On-Foot Stunt Ramp Parkour Boost
      if (this.playerRampCooldown > 0) this.playerRampCooldown = Math.max(0, this.playerRampCooldown - dt);
      if (this.pHeight <= 0.1 && this.playerRampCooldown <= 0 && movingSpeed > 75) {
        for (const ramp of this.stuntRamps) {
          if (Math.hypot(this.px - ramp.x, this.py - ramp.y) < 34) {
            this.pVelY = 16.5;
            this.playerRampCooldown = 1.4;
            this.awardProgress(100, 20);
            soundEngine.playPickup(false);
            this.spawnRing3D(ramp.x, ramp.y, 0xfacc15, 3.2);
            this.showFeed('PARKOUR BOOST! +₹100');
            break;
          }
        }
      }

      // Position & animate Full-Body + 5-Finger Hand Human Rig flush on surface!
      this.playerRig.group.visible = true;
      this.playerRig.group.position.set(this.px * WORLD_SCALE, groundY + this.pHeight, this.py * WORLD_SCALE);
      this.playerRig.group.rotation.set(0, Math.PI / 2 - this.pAngle, 0);

      animateHumanRig(this.playerRig, {
        dt,
        elapsed: this.elapsed,
        walking: moving,
        speedRatio: movingSpeed / Math.max(1, charDef.footSpeed),
        sprinting: autoSprint && !this.crouching && !this.aiming,
        crouching: this.crouching,
        inAir: this.pHeight > 0.15,
        groundVelY: this.pVelY,
        aiming: this.aiming || this.firingHeld,
        firingSwing: this.attackSwingTimer,
        reloadTimer: this.reloadTimer,
        recoilKick: this.recoilKick,
        weaponId: this.weaponId,
        holdingProp: this.heldProp !== null,
        stumbleTimer: this.stumbleTimer,
        specialActive,
        inVehicleType: null,
        vehicleSteer: 0,
        vehicleRoll: 0,
        sittingBench: false,
        emote: this.activeEmote,
        emoteTime: this.emoteElapsed,
        lodNear: true,
        camPitch: this.camPitch,
      });
    }
  }

  private updateLivingCity(dt: number): void {
    // 1. Station cooldowns
    for (const st of this.stations) {
      if (st.cooldown > 0) st.cooldown = Math.max(0, st.cooldown - dt);
    }

    // 2. Unexpected Funny City Events Scheduler!
    if (!this.titlePreviewMode && !this.wasted) {
      if (this.activeCityEvent) {
        this.activeCityEvent.timeLeft -= dt;
        if (this.activeCityEvent.timeLeft <= 0) {
          this.activeCityEvent = null;
          this.nextCityEventTimer = 34 + Math.random() * 14;
        }
      } else {
        this.nextCityEventTimer -= dt;
        if (this.nextCityEventTimer <= 0) {
          const ev = randomCityEvent();
          this.activeCityEvent = { def: ev, timeLeft: ev.duration };
          soundEngine.playPickup(true);
          this.showFeed(`${ev.title} ${ev.subtitle}`);
        }
      }
    }

    // 3. Spin & Collect 5 Hidden Golden Easter Egg Secrets!
    for (const egg of this.easterEggs) {
      if (egg.found) continue;
      egg.mesh.rotation.y += dt * 2.4;
      egg.mesh.position.y = 0.08 + Math.sin(this.elapsed * 3.2 + egg.secretIndex) * 0.2;
      if (!this.titlePreviewMode && Math.hypot(egg.x - this.px, egg.y - this.py) < 38) {
        egg.found = true;
        egg.mesh.visible = false;
        this.awardProgress(1000, 140);
        soundEngine.playCartoonBoing();
        soundEngine.playMissionComplete();
        this.spawnRing3D(egg.x, egg.y, 0xfacc15, 6.5);
        this.spawnBurst3D(egg.x, egg.y, 1.5, 0xfef08a, 18);
        const foundCount = this.easterEggs.filter((e) => e.found).length;
        this.showFeed(`${EASTER_EGG_SECRETS[egg.secretIndex]} (+₹1000 · ${foundCount}/5)`);
      }
    }

    // 4. Custom Cyan GPS Waypoint beacon animation & auto-arrival
    if (this.waypoint) {
      this.waypointBeacon.visible = true;
      this.waypointBeacon.rotation.y += dt * 1.8;
      if (Math.hypot(this.waypoint.x - this.px, this.waypoint.y - this.py) < 58) {
        const arrivedLabel = this.waypoint.label;
        this.clearWaypoint();
        soundEngine.playPickup(true);
        this.showFeed(`Arrived: ${arrivedLabel}`);
      }
    }

    // 5. Cycling 3D Traffic Lights (Green -> Amber -> Red)
    const cycleLen = 12;
    for (const item of this.trafficLights) {
      const t = (this.elapsed + item.phaseOffset) % cycleLen;
      const isGreen = t < 5.5;
      const isAmber = t >= 5.5 && t < 7.2;
      const isRed = t >= 7.2;
      item.light.greenMat.emissiveIntensity = isGreen ? 3.2 : 0.1;
      item.light.amberMat.emissiveIntensity = isAmber ? 3.2 : 0.1;
      item.light.redMat.emissiveIntensity = isRed ? 3.2 : 0.1;
    }

    // 6. Drifting 3D Sky Clouds + Subtle Wind Sway on Nearby Trees
    const windSpeedMult = 0.7 + this.weatherSystem.windStrength * 0.35;
    for (const c of this.clouds) {
      c.mesh.position.x += c.speed * windSpeedMult * dt;
      if (c.mesh.position.x > 580) c.mesh.position.x = -20;
    }

    if (this.graphicsQuality !== 'low') {
      const swayAmp = 0.015 * this.weatherSystem.windStrength;
      const wp = this.weatherSystem.windPhase;
      const px3 = this.px * WORLD_SCALE;
      const pz3 = this.py * WORLD_SCALE;
      for (const tr of this.animatedTrees) {
        if (Math.abs(tr.mesh.position.x - px3) < 65 && Math.abs(tr.mesh.position.z - pz3) < 65) {
          tr.mesh.rotation.z = Math.sin(wp + tr.phase) * swayAmp;
          tr.mesh.rotation.x = Math.cos(wp * 0.8 + tr.phase) * swayAmp * 0.7;
        }
      }
    }

    // 7. Animated Fountain Water Spray at Chai Chowk (Pooled!)
    if (this.graphicsQuality !== 'low') {
      const rb = this.map.roundabout;
      if (Math.hypot(this.px - rb.x, this.py - rb.y) < 950) {
        this.fountainSprayAccum += dt;
        if (this.fountainSprayAccum >= 0.14) {
          this.fountainSprayAccum = 0;
          const slot = this.particles.find((p) => !p.active);
          if (slot) {
            slot.active = true;
            slot.life = 0.58;
            slot.maxLife = 0.58;
            slot.gravity = 16;
            const ang = Math.random() * Math.PI * 2;
            const sp = 1.6 + Math.random() * 1.4;
            slot.vx = Math.cos(ang) * sp;
            slot.vy = 4.2 + Math.random() * 1.8;
            slot.vz = Math.sin(ang) * sp;
            (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x7dd3fc);
            slot.mesh.scale.setScalar(0.55);
            slot.mesh.position.set(rb.x * WORLD_SCALE, 5.1, rb.y * WORLD_SCALE);
            slot.mesh.visible = true;
          }
        }
      }
    }
  }

  private updateProps(dt: number): void {
    for (const p of this.props) {
      if (p.state === 'respawning') {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.x = p.originX;
          p.y = p.originY;
          p.h = 0;
          p.vx = 0;
          p.vy = 0;
          p.vh = 0;
          p.state = 'idle';
          p.mesh.visible = true;
          p.mesh.position.set(p.x * WORLD_SCALE, 0, p.y * WORLD_SCALE);
          p.mesh.rotation.set(0, 0, 0);
        }
        continue;
      }

      if (p.state !== 'thrown') continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.h += p.vh * dt;
      p.vh -= 19 * dt;
      p.mesh.position.set(p.x * WORLD_SCALE, Math.max(0, p.h), p.y * WORLD_SCALE);
      p.mesh.rotation.x += p.spin * dt;
      p.mesh.rotation.z += p.spin * 0.6 * dt;

      let impacted = p.h <= 0 || pointHitsBuilding(p.x, p.y, 12, this.map.buildings);

      // Hit NPCs with thrown object!
      for (const npc of this.npcs) {
        if (!npc.alive) continue;
        if (Math.hypot(npc.x - p.x, npc.y - p.y) < 26) {
          const spd = Math.max(1, Math.hypot(p.vx, p.vy));
          this.damageNpc(npc, p.kind === 'barrel' ? 110 : 75, p.vx / spd, p.vy / spd);
          impacted = true;
          break;
        }
      }

      // Hit Vehicles with thrown object!
      if (!impacted) {
        for (const v of this.vehicles) {
          if (v === this.currentVehicle) continue;
          if (Math.hypot(v.x - p.x, v.y - p.y) < 34) {
            this.damageVehicle(v, p.kind === 'barrel' ? 95 : 42);
            impacted = true;
            break;
          }
        }
      }

      if (impacted) {
        if (p.kind === 'barrel') {
          this.detonateBarrel(p);
        } else {
          p.h = 0;
          p.vx = 0;
          p.vy = 0;
          p.vh = 0;
          p.state = 'idle';
          p.mesh.position.set(p.x * WORLD_SCALE, 0, p.y * WORLD_SCALE);
          p.mesh.rotation.set(0, Math.random() * Math.PI, 0);
          soundEngine.playCrash(0.45);
          this.spawnBurst3D(p.x, p.y, 0.7, 0xd97706, 7);
        }
      }
    }
  }

  private updateDroppedWeapons(dt: number): void {
    for (let i = this.droppedWeapons.length - 1; i >= 0; i--) {
      const dw = this.droppedWeapons[i];
      dw.life -= dt;
      dw.mesh.rotation.y += dt * 2.4;
      dw.mesh.position.y = Math.sin(this.elapsed * 3.8 + i) * 0.14;
      if (dw.life <= 0) {
        this.scene.remove(dw.mesh);
        this.droppedWeapons.splice(i, 1);
      }
    }
  }

  private updateTraffic(dt: number): void {
    const flip = Math.floor(this.elapsed * 10) % 2 === 0;
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const v = this.vehicles[i];
      if (v === this.currentVehicle) continue;

      if (v.mesh.sirenRed && v.mesh.sirenBlue) {
        const active = v.isPolice && this.wantedLevel > 0;
        (v.mesh.sirenRed.material as THREE.MeshStandardMaterial).emissiveIntensity = active && flip ? 3.5 : 0.4;
        (v.mesh.sirenBlue.material as THREE.MeshStandardMaterial).emissiveIntensity = active && !flip ? 3.5 : 0.4;
      }

      if (v.hp <= 0) {
        this.explodeVehicle(v, i);
        continue;
      }

      if (v.stalledTimer > 0) {
        v.stalledTimer -= dt;
        v.vx *= Math.pow(0.08, dt);
        v.vy *= Math.pow(0.08, dt);
        v.x += v.vx * dt;
        v.y += v.vy * dt;
      } else if (v.isTraffic) {
        if (v.isPolice && this.wantedLevel > 0 && !this.titlePreviewMode) {
          const dist = Math.hypot(this.px - v.x, this.py - v.y);
          if (dist < 760) {
            const targetAng = Math.atan2(this.py - v.y, this.px - v.x);
            let diff = targetAng - v.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            v.angle += Math.max(-3.0 * dt, Math.min(3.0 * dt, diff));
            const chaseSpeed = 225 + this.wantedLevel * 38;
            v.vx = Math.cos(v.angle) * chaseSpeed;
            v.vy = Math.sin(v.angle) * chaseSpeed;
            const nx = v.x + v.vx * dt;
            const ny = v.y + v.vy * dt;
            if (!pointHitsBuilding(nx, v.y, 20, this.map.buildings)) v.x = nx;
            if (!pointHitsBuilding(v.x, ny, 20, this.map.buildings)) v.y = ny;

            if (!this.currentVehicle && dist < 34) {
              this.takeDamage(10);
              v.stalledTimer = 1.2;
            }
          }
        } else {
          const cruiseSpeed = v.isMissionTarget ? 230 : 125;
          if (v.laneAxis === 'x') {
            v.angle = v.laneDir === 1 ? 0 : Math.PI;
            v.vx = v.laneDir * cruiseSpeed;
            v.vy = (v.laneLine - v.y) * 2.4;
          } else {
            v.angle = v.laneDir === 1 ? Math.PI / 2 : -Math.PI / 2;
            v.vx = (v.laneLine - v.x) * 2.4;
            v.vy = v.laneDir * cruiseSpeed;
          }
          v.x += v.vx * dt;
          v.y += v.vy * dt;

          if (v.x < 120) v.x = WORLD_SIZE - 140;
          if (v.x > WORLD_SIZE - 120) v.x = 140;
          if (v.y < 120) v.y = WORLD_SIZE - 140;
          if (v.y > WORLD_SIZE - 120) v.y = 140;

          if (Math.random() < dt * 0.25) {
            for (const r of ROAD_CENTERS) {
              if (Math.abs(v.x - r) < 16 && Math.abs(v.y - r) < 16) {
                v.laneAxis = v.laneAxis === 'x' ? 'y' : 'x';
                v.laneDir = Math.random() > 0.5 ? 1 : -1;
                v.laneLine = r + (v.laneDir === 1 ? 34 : -34);
                break;
              }
            }
          }
        }
      } else {
        v.vx *= Math.pow(0.05, dt);
        v.vy *= Math.pow(0.05, dt);
        v.x += v.vx * dt;
        v.y += v.vy * dt;
      }

      const groundY = getGroundHeightAt(v.x, v.y, this.map, 0);
      v.mesh.group.position.set(v.x * WORLD_SCALE, groundY, v.y * WORLD_SCALE);
      v.mesh.group.rotation.y = Math.PI / 2 - v.angle;
      for (const w of v.mesh.wheels) w.rotation.x += Math.hypot(v.vx, v.vy) * dt * 0.08;
    }
  }

  private damageVehicle(v: WorldVehicle, dmg: number): void {
    v.hp -= dmg;
    this.hitMarkerTimer = 0.14;
    this.spawnBurst3D(v.x, v.y, 1.3, 0xfbbf24, 6);
    if (v.isPolice && this.profile.characterId !== 'chingum') {
      this.addWanted(1);
    }
  }

  private explodeVehicle(v: WorldVehicle, idx: number): void {
    this.spawnBurst3D(v.x, v.y, 1.6, 0xf97316, 20);
    this.spawnBurst3D(v.x, v.y, 2.0, 0xef4444, 14);
    this.spawnRing3D(v.x, v.y, 0xef4444, 7.5);
    soundEngine.playExplosion();
    this.addShake(0.32, 1.2);

    this.scene.remove(v.mesh.group);
    this.vehicles.splice(idx, 1);

    if (v.isMissionTarget && this.activeMission && this.activeMission.stage === 'takedown') {
      this.activeMission.progress += 1;
      this.showFeed(`Rogue Car Destroyed! (${this.activeMission.progress}/${this.activeMission.total})`);
    } else {
      this.profile.stats.kills += 1;
      this.awardProgress(220, 60);
      this.addWanted(1);
      this.showFeed('BOOM! Vehicle Destroyed +₹220');
    }
  }

  private damageNpc(npc: WorldNpc, dmg: number, knockX: number, knockY: number): void {
    if (!npc.alive) return;
    npc.hp -= dmg;
    npc.vx = knockX * 140;
    npc.vy = knockY * 140;
    npc.scaredTimer = 3.2;
    this.hitMarkerTimer = 0.16;
    this.spawnBurst3D(npc.x, npc.y, 1.4, 0xef4444, 7);

    if (npc.rig.hpBarFill) {
      npc.rig.hpBarFill.visible = true;
      const bg = npc.rig.group.getObjectByName('hpBarBg');
      if (bg) bg.visible = true;
      npc.rig.hpBarFill.scale.x = Math.max(0.01, npc.hp / npc.maxHp);
    }

    if (npc.hp <= 0) {
      npc.alive = false;
      npc.fallTimer = 0.01;
      npc.fallDirX = knockX;
      npc.fallDirZ = knockY;
      npc.respawnTimer = 12;
      if (npc.rig.hpBarFill) {
        npc.rig.hpBarFill.visible = false;
        const bg = npc.rig.group.getObjectByName('hpBarBg');
        if (bg) bg.visible = false;
      }

      // Drop enemy's gun on the street so player can loot it!
      if (npc.carriedWeapon) {
        this.spawnDroppedWeapon(npc.carriedWeapon, npc.x, npc.y, WEAPON_AMMO_GRANT[npc.carriedWeapon]);
      }

      soundEngine.playKill();
      if (Math.random() < 0.45) soundEngine.playCartoonBoing();
      this.spawnBurst3D(npc.x, npc.y, 1.2, 0xfacc15, 12);

      const partyBonus = this.activeCityEvent?.def.id === 'disco_chowk' ? 100 : 0;
      const cash = (npc.role === 'gangster' ? 180 : npc.role === 'police' ? 220 : 100) + partyBonus;
      this.profile.stats.kills += 1;
      this.awardProgress(cash, 45);
      this.addWanted(npc.role === 'police' ? 2 : 1);

      const label = npc.role === 'cow' ? 'Moo Knockback!' : randomKoLine();
      this.showFeed(`${label} +₹${cash}${npc.carriedWeapon ? ` · Dropped ${WEAPON_LABELS[npc.carriedWeapon]}` : ''}`);
    }
  }

  private updateNpcs(dt: number): void {
    for (const npc of this.npcs) {
      if (!npc.alive) {
        // Cartoon Ragdoll Tumble: launch arc + flailing limbs + flop!
        if (npc.benchId) {
          const b = this.benches.find((bn) => bn.id === npc.benchId);
          if (b && b.occupiedBy === npc.id) b.occupiedBy = null;
          npc.benchId = null;
          npc.behavior = 'wander';
        }
        npc.fallTimer += dt * 4.2;
        const arcH = Math.max(0, Math.sin(Math.min(Math.PI, npc.fallTimer * 1.25)) * 1.65);
        npc.rig.bodyGroup.rotation.x = Math.min(Math.PI / 2, npc.fallTimer * 1.35);
        npc.rig.bodyGroup.rotation.z = Math.min(0.65, npc.fallTimer * 0.5);
        npc.rig.bodyGroup.position.y = 0.32 + arcH;
        if (arcH > 0.1) {
          const flail = Math.sin(npc.fallTimer * 18) * 1.1;
          npc.rig.leftArm.rotation.x = -2.2 + flail;
          npc.rig.rightArm.rotation.x = -2.2 - flail;
          npc.rig.leftLeg.rotation.x = flail * 0.7;
          npc.rig.rightLeg.rotation.x = -flail * 0.7;
        }
        npc.x += npc.fallDirX * Math.max(0, 1 - npc.fallTimer * 0.45) * 115 * dt;
        npc.y += npc.fallDirZ * Math.max(0, 1 - npc.fallTimer * 0.45) * 115 * dt;
        const gY = getGroundHeightAt(npc.x, npc.y, this.map, 0);
        npc.rig.group.position.set(npc.x * WORLD_SCALE, gY, npc.y * WORLD_SCALE);

        npc.respawnTimer -= dt;
        if (npc.respawnTimer <= 0) {
          const r = ROAD_CENTERS[Math.floor(Math.random() * ROAD_CENTERS.length)];
          const rx = r + (Math.random() > 0.5 ? 92 : -92);
          const ry = 320 + Math.random() * (WORLD_SIZE - 640);
          resolveCapsuleCollision(rx, ry, 14, this.map.buildings, this.map.colliders, _colOut);
          npc.x = _colOut.x;
          npc.y = _colOut.y;
          npc.hp = npc.maxHp;
          npc.alive = true;
          npc.fallTimer = 0;
          npc.behavior = 'wander';
          if (npc.role === 'gangster' || npc.role === 'police') {
            npc.carriedWeapon = npc.role === 'police' ? 'shotgun' : Math.random() > 0.5 ? 'ak47' : 'smg';
            setRigWeaponVisual(npc.rig, npc.carriedWeapon);
          }
          npc.rig.bodyGroup.rotation.set(0, 0, 0);
          npc.rig.bodyGroup.position.y = 0;
          npc.rig.group.position.set(npc.x * WORLD_SCALE, getGroundHeightAt(npc.x, npc.y, this.map, 0), npc.y * WORLD_SCALE);
        }
        continue;
      }

      const distToPlayer = Math.hypot(this.px - npc.x, this.py - npc.y);

      // Seated NPCs relax on benches unless scared/attacked!
      if (npc.behavior === 'sit' && npc.scaredTimer <= 0) {
        const gY = getGroundHeightAt(npc.x, npc.y, this.map, 0);
        npc.rig.group.position.set(npc.x * WORLD_SCALE, gY, npc.y * WORLD_SCALE);
        npc.rig.group.rotation.y = Math.PI / 2 - npc.angle;
        if (distToPlayer < 110) {
          animateHumanRig(npc.rig, {
            dt,
            elapsed: this.elapsed + npc.walkCycle,
            walking: false,
            speedRatio: 0,
            sprinting: false,
            crouching: false,
            inAir: false,
            groundVelY: 0,
            aiming: false,
            firingSwing: 0,
            reloadTimer: 0,
            recoilKick: 0,
            weaponId: null,
            holdingProp: false,
            stumbleTimer: 0,
            specialActive: false,
            inVehicleType: null,
            vehicleSteer: 0,
            vehicleRoll: 0,
            sittingBench: true,
            emote: null,
            emoteTime: 0,
            isNpc: true,
            npcBehavior: 'sit',
            lodNear: distToPlayer < 85,
          });
        }
        continue;
      }

      const hostile =
        npc.carriedWeapon !== null &&
        ((npc.role === 'police' && this.wantedLevel > 0) || (npc.role === 'gangster' && npc.scaredTimer > 0));

      if (hostile && distToPlayer < 240 && !this.titlePreviewMode) {
        npc.behavior = 'wander';
        const ang = Math.atan2(this.py - npc.y, this.px - npc.x);
        npc.angle = ang;
        if (distToPlayer > 85) {
          npc.vx = Math.cos(ang) * 95;
          npc.vy = Math.sin(ang) * 95;
        } else {
          npc.vx *= 0.85;
          npc.vy *= 0.85;
        }
        npc.shootCooldown -= dt;
        if (npc.shootCooldown <= 0) {
          npc.shootCooldown = npc.role === 'police' ? 1.15 : 1.4;
          this.spawnProjectile(npc.x, npc.y, ang, 430, 8, false, true, npc.id, 0xef4444);
          if (distToPlayer < 220) soundEngine.playShoot(false);
        }
      } else if (npc.scaredTimer > 0) {
        npc.scaredTimer -= dt;
        npc.behavior = 'wander';
      } else {
        npc.behaviorTimer -= dt;
        if (npc.behaviorTimer <= 0) {
          npc.behaviorTimer = 2.6 + Math.random() * 4.0;
          if (npc.role === 'ped' && Math.random() < 0.38) {
            const socialPool: NpcSocialBehavior[] = ['chat', 'wave', 'laugh'];
            npc.behavior = socialPool[Math.floor(Math.random() * socialPool.length)];
            npc.vx = 0;
            npc.vy = 0;
          } else {
            npc.behavior = 'wander';
            const sp = npc.role === 'cow' ? 16 : 38;
            const a = Math.random() * Math.PI * 2;
            npc.vx = Math.cos(a) * sp;
            npc.vy = Math.sin(a) * sp;
            npc.angle = a;
          }
        }
      }

      const nx = npc.x + npc.vx * dt;
      const ny = npc.y + npc.vy * dt;
      resolveCapsuleCollision(nx, ny, 13, this.map.buildings, this.map.colliders, _colOut);
      if (_colOut.hit) {
        npc.vx *= -1;
        npc.vy *= -1;
        npc.angle = Math.atan2(npc.vy, npc.vx);
      }
      npc.x = _colOut.x;
      npc.y = _colOut.y;

      const groundY = getGroundHeightAt(npc.x, npc.y, this.map, 0);
      npc.rig.group.position.set(npc.x * WORLD_SCALE, groundY, npc.y * WORLD_SCALE);
      npc.rig.group.rotation.y = Math.PI / 2 - npc.angle;
      const spd = Math.hypot(npc.vx, npc.vy);

      if (npc.role !== 'cow' && distToPlayer < 130) {
        animateHumanRig(npc.rig, {
          dt,
          elapsed: this.elapsed + npc.walkCycle,
          walking: spd > 8,
          speedRatio: spd / 55,
          sprinting: npc.scaredTimer > 0 && spd > 70,
          crouching: false,
          inAir: false,
          groundVelY: 0,
          aiming: hostile,
          firingSwing: 0,
          reloadTimer: 0,
          recoilKick: 0,
          weaponId: npc.carriedWeapon,
          holdingProp: false,
          stumbleTimer: 0,
          specialActive: false,
          inVehicleType: null,
          vehicleSteer: 0,
          vehicleRoll: 0,
          sittingBench: false,
          emote: null,
          emoteTime: 0,
          isNpc: true,
          npcBehavior: npc.behavior,
          lodNear: distToPlayer < 85,
        });
      }

      if (npc.rig.hpBarFill?.visible) {
        npc.rig.hpBarFill.lookAt(this.camera.position);
        npc.rig.group.getObjectByName('hpBarBg')?.lookAt(this.camera.position);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.mesh.position.set(p.x * WORLD_SCALE, p.h, p.y * WORLD_SCALE);

      const hitWall = pointHitsBuilding(p.x, p.y, 4, this.map.buildings);
      if (hitWall) {
        this.spawnBurst3D(p.x, p.y, p.h, 0xfef08a, 4);
      }
      let hit = p.life <= 0 || hitWall;

      if (!hit && p.fromPlayer) {
        // Shoot Explosive Red Barrels!
        for (const prop of this.props) {
          if (prop.state === 'idle' && prop.kind === 'barrel' && Math.hypot(prop.x - p.x, prop.y - p.y) < 16) {
            this.detonateBarrel(prop);
            hit = true;
            break;
          }
        }
        // Check NPC hits
        if (!hit) {
          for (const npc of this.npcs) {
            if (!npc.alive) continue;
            if (Math.hypot(npc.x - p.x, npc.y - p.y) < 18) {
              const len = Math.max(1, Math.hypot(p.vx, p.vy));
              soundEngine.playHitConfirm();
              this.damageNpc(npc, p.damage, p.vx / len, p.vy / len);
              hit = true;
              break;
            }
          }
        }
        // Check Remote Player PvP hits
        if (!hit) {
          for (const r of this.remotes.values()) {
            if (Math.hypot(r.x - p.x, r.y - p.y) < 20) {
              this.hitMarkerTimer = 0.18;
              soundEngine.playHitConfirm();
              this.callbacks.onSendPvpHit(r.uid, p.damage);
              this.spawnBurst3D(r.x, r.y, 1.4, 0xf97316, 8);
              this.showFeed(`Hit ${r.name}! -${p.damage}`);
              hit = true;
              break;
            }
          }
        }
        // Check Vehicle hits
        if (!hit) {
          for (const v of this.vehicles) {
            if (v === this.currentVehicle) continue;
            if (Math.hypot(v.x - p.x, v.y - p.y) < 28) {
              soundEngine.playHitConfirm();
              this.damageVehicle(v, p.damage);
              hit = true;
              break;
            }
          }
        }
      } else if (!hit && p.fromNpc) {
        if (Math.hypot(this.px - p.x, this.py - p.y) < 18) {
          const specialBheem = this.specialActiveTimer > 0 && this.profile.characterId === 'bheem';
          const specialOggy = this.specialActiveTimer > 0 && this.profile.characterId === 'oggy';
          if (!specialOggy) {
            this.takeDamage(specialBheem ? p.damage * 0.4 : p.damage);
          }
          hit = true;
        }
      }

      if (hit) {
        p.active = false;
        p.mesh.visible = false;
      }
    }
  }

  private updatePickups(dt: number): void {
    for (const item of this.pickupMeshes) {
      const pk = this.map.pickups[item.pkIndex];
      if (!pk.active) {
        item.group.visible = false;
        pk.respawnTimer -= dt;
        if (pk.respawnTimer <= 0) pk.active = true;
        continue;
      }
      item.group.visible = true;
      item.group.rotation.y += dt * 2.2;
      item.group.position.set(pk.x * WORLD_SCALE, Math.sin(this.elapsed * 3.5 + item.pkIndex) * 0.16, pk.y * WORLD_SCALE);

      if (Math.hypot(pk.x - this.px, pk.y - this.py) < 34) {
        pk.active = false;
        pk.respawnTimer = 25;
        const isMotu = this.profile.characterId === 'motu';

        if (pk.kind === 'samosa') {
          const cash = isMotu ? 180 : 90;
          this.awardProgress(cash, 35);
          this.hp = Math.min(this.maxHp, this.hp + (isMotu ? 30 : 15));
          this.specialCooldown = Math.max(0, this.specialCooldown - (isMotu ? 4 : 1.5));
          this.profile.stats.samosasEaten += 1;
          soundEngine.playPickup(true);
          this.spawnBurst3D(pk.x, pk.y, 1.0, 0xf59e0b, 10);
          this.showFeed(isMotu ? `SAMOSA 2X! +₹${cash}` : `Samosa +₹${cash}`);
        } else if (pk.kind === 'cash') {
          this.awardProgress(150, 25);
          soundEngine.playPickup(false);
          this.spawnBurst3D(pk.x, pk.y, 1.0, 0x22c55e, 10);
          this.showFeed('+₹150 Cash');
        } else {
          this.hp = Math.min(this.maxHp, this.hp + 25);
          this.awardProgress(75, 20);
          soundEngine.playPickup(false);
          this.spawnBurst3D(pk.x, pk.y, 1.0, 0xfb923c, 10);
          this.showFeed('Cutting Chai +25 HP');
        }
      }
    }
  }

  private updateMission(dt: number): void {
    const am = this.activeMission;
    if (!am) {
      this.missionBeacon.visible = false;
      this.missionArrow.visible = false;
      return;
    }

    am.timeLeft -= dt;
    if (am.timeLeft <= 0) {
      const failed = am.mission;
      this.cancelMission();
      this.callbacks.onMissionFailed(failed, 'Time ran out!');
      return;
    }

    this.missionBeacon.visible = true;
    this.missionBeacon.position.set(am.targetX * WORLD_SCALE, 0, am.targetY * WORLD_SCALE);
    this.missionBeacon.rotation.y += dt * 1.5;

    const ang = Math.atan2(am.targetY - this.py, am.targetX - this.px);
    this.missionArrow.visible = true;
    this.missionArrow.position.set(this.px * WORLD_SCALE, this.currentVehicle ? 3.5 : 3.2 + this.pHeight, this.py * WORLD_SCALE);
    this.missionArrow.rotation.set(Math.PI / 2, 0, ang - Math.PI / 2);

    if (am.stage === 'pickup') {
      if (Math.hypot(am.targetX - this.px, am.targetY - this.py) < 68) {
        am.stage = 'deliver';
        am.progress = 1;
        am.checkpoints[0].done = true;
        am.targetX = am.checkpoints[1].x;
        am.targetY = am.checkpoints[1].y;
        const targetD = DISTRICTS.find((d) => d.id === am.mission.targetDistrictId);
        am.objectiveText = `Deliver to ${targetD?.name || 'Target'}`;
        soundEngine.playPickup(true);
        this.showFeed('Picked up! Race to target!');
      }
    } else if (am.stage === 'deliver') {
      if (Math.hypot(am.targetX - this.px, am.targetY - this.py) < 68) this.completeActiveMission();
    } else if (am.stage === 'collect') {
      let remaining: { x: number; y: number; done: boolean } | null = null;
      let nearest = Infinity;
      for (const cp of am.checkpoints) {
        if (cp.done) continue;
        const d = Math.hypot(cp.x - this.px, cp.y - this.py);
        if (d < 56) {
          cp.done = true;
          am.progress += 1;
          soundEngine.playPickup(true);
          this.showFeed(`Stash ${am.progress}/${am.total}`);
          continue;
        }
        if (d < nearest) {
          nearest = d;
          remaining = cp;
        }
      }
      if (am.progress >= am.total) this.completeActiveMission();
      else if (remaining) {
        am.targetX = remaining.x;
        am.targetY = remaining.y;
        am.objectiveText = `Stashes ${am.progress}/${am.total}`;
      }
    } else if (am.stage === 'race') {
      const curr = am.checkpoints[am.progress];
      if (curr && Math.hypot(curr.x - this.px, curr.y - this.py) < 74) {
        curr.done = true;
        am.progress += 1;
        soundEngine.playPickup(true);
        if (am.progress >= am.total) this.completeActiveMission();
        else {
          am.targetX = am.checkpoints[am.progress].x;
          am.targetY = am.checkpoints[am.progress].y;
          am.objectiveText = `Checkpoint ${am.progress + 1}/${am.total}`;
        }
      }
    } else if (am.stage === 'takedown') {
      const targetVeh = this.vehicles.find((v) => v.isMissionTarget);
      if (am.progress >= am.total || !targetVeh) this.completeActiveMission();
      else {
        am.targetX = targetVeh.x;
        am.targetY = targetVeh.y;
        am.objectiveText = `Rogue Cars ${am.progress}/${am.total}`;
      }
    }
  }

  private completeActiveMission(): void {
    if (!this.activeMission) return;
    const mission = this.activeMission.mission;
    this.cancelMission();

    const patluBonus = this.profile.characterId === 'patlu' ? Math.round(mission.reward * 0.25) : 0;
    const totalCash = mission.reward + patluBonus;
    if (!this.profile.completedMissionIds.includes(mission.id)) {
      this.profile.completedMissionIds.push(mission.id);
    }
    this.profile.stats.missionsDone += 1;
    this.awardProgress(totalCash, 180);
    soundEngine.playMissionComplete();
    this.spawnRing3D(this.px, this.py, 0x22c55e, 7.5);
    this.showFeed(`MISSION PASSED! +₹${totalCash} · ${randomMissionQuip()}`);
    this.callbacks.onMissionFinished(mission, totalCash);
  }

  private updateRemotes(dt: number): void {
    const lerp = Math.min(1, dt * 11);
    for (const r of this.remotes.values()) {
      const prevX = r.x;
      const prevY = r.y;
      r.x += (r.targetX - r.x) * lerp;
      r.y += (r.targetY - r.y) * lerp;
      let diff = r.targetAngle - r.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.angle += diff * lerp;

      const rx = r.x * WORLD_SCALE;
      const rz = r.y * WORLD_SCALE;
      const groundY = getGroundHeightAt(r.x, r.y, this.map, 0);
      const moveSpeed = Math.hypot(r.x - prevX, r.y - prevY) / Math.max(0.001, dt);

      if (r.inVehicleType && r.vehMesh) {
        r.vehMesh.group.visible = true;
        if (r.vehMesh.headlightBeam) r.vehMesh.headlightBeam.visible = this.weatherSystem.isHeadlightsActive();
        r.vehMesh.group.position.set(rx, groundY, rz);
        r.vehMesh.group.rotation.y = Math.PI / 2 - r.angle;

        r.rig.group.visible = true;
        r.rig.group.position.set(rx, groundY, rz);
        r.rig.group.rotation.y = Math.PI / 2 - r.angle;
        animateHumanRig(r.rig, {
          dt,
          elapsed: this.elapsed,
          walking: false,
          speedRatio: 0,
          sprinting: false,
          crouching: false,
          inAir: false,
          groundVelY: 0,
          aiming: false,
          firingSwing: 0,
          reloadTimer: 0,
          recoilKick: 0,
          weaponId: r.weaponId,
          holdingProp: false,
          stumbleTimer: 0,
          specialActive: r.specialActive,
          inVehicleType: r.inVehicleType,
          vehicleSteer: 0,
          vehicleRoll: 0,
          sittingBench: false,
          emote: null,
          emoteTime: 0,
          lodNear: true,
        });
        r.label.position.set(rx, groundY + 3.6, rz);
      } else {
        if (r.vehMesh) r.vehMesh.group.visible = false;
        r.rig.group.visible = true;
        r.rig.group.position.set(rx, groundY, rz);
        r.rig.group.rotation.y = Math.PI / 2 - r.angle;
        animateHumanRig(r.rig, {
          dt,
          elapsed: this.elapsed,
          walking: moveSpeed > 12,
          speedRatio: Math.min(1, moveSpeed / 160),
          sprinting: moveSpeed > 140,
          crouching: false,
          inAir: false,
          groundVelY: 0,
          aiming: false,
          firingSwing: 0,
          reloadTimer: 0,
          recoilKick: 0,
          weaponId: r.weaponId,
          holdingProp: false,
          stumbleTimer: 0,
          specialActive: r.specialActive,
          inVehicleType: null,
          vehicleSteer: 0,
          vehicleRoll: 0,
          sittingBench: false,
          emote: r.emote,
          emoteTime: r.emoteTime,
          lodNear: true,
        });
        r.label.position.set(rx, groundY + 3.2, rz);
      }
    }
  }

  // ==================== SMOOTH 360° BGMI + GTA CAMERA (WITH WALL COLLISION & ZOOM) ====================

  private updateCamera3D(dt: number): void {
    const px3 = this.px * WORLD_SCALE;
    const pz3 = this.py * WORLD_SCALE;
    const inVeh = this.currentVehicle !== null;
    const groundY = getGroundHeightAt(this.px, this.py, this.map, this.pHeight);

    const effYaw = this.camYaw + this.freeLookYaw;
    const effPitch = Math.max(-0.22, Math.min(0.76, this.camPitch + this.freeLookPitch));

    // Distance & Shoulder Offset with mouse-wheel zoom & smooth damping
    const targetBaseDist = this.aiming
      ? 3.7
      : (this.camMode === 0
          ? inVeh
            ? 11.4
            : 6.4
          : this.camMode === 1
          ? inVeh
            ? 8.4
            : 4.7
          : 16.5) + this.camZoomOffset;

    this.camDistSmooth = THREE.MathUtils.damp(this.camDistSmooth, Math.max(3.2, targetBaseDist), 10, dt);

    const shoulderOffset = inVeh ? 0 : this.aiming ? 0.85 : 0.65;
    const rightX = Math.cos(effYaw);
    const rightZ = -Math.sin(effYaw);

    const pivotY = (inVeh ? 1.65 + (this.currentVehicle?.h || 0) : (this.sittingBenchId ? 1.28 : this.crouching ? 1.22 : 1.72) + groundY) + this.pHeight;
    const horizDist = Math.cos(effPitch) * this.camDistSmooth;
    const vertOffset = Math.sin(effPitch) * this.camDistSmooth;

    const sx = this.shakeTime > 0 ? (Math.random() - 0.5) * this.shakeMag : 0;
    const sy = this.shakeTime > 0 ? (Math.random() - 0.5) * this.shakeMag : 0;

    const rawDesiredX = px3 + rightX * shoulderOffset + Math.sin(effYaw) * horizDist + sx;
    const rawDesiredY = Math.max(0.85, pivotY + vertOffset + sy);
    const rawDesiredZ = pz3 + rightZ * shoulderOffset + Math.cos(effYaw) * horizDist;

    // Occlusion pull-forward so camera never gets stuck inside tall buildings
    const safeFrac = clampCameraRayBuildings(
      this.px,
      this.py,
      rawDesiredX / WORLD_SCALE,
      rawDesiredZ / WORLD_SCALE,
      rawDesiredY,
      this.map.buildings
    );
    const desiredX = px3 + (rawDesiredX - px3) * safeFrac;
    const desiredZ = pz3 + (rawDesiredZ - pz3) * safeFrac;
    const desiredY = safeFrac < 0.99 ? Math.max(1.2, pivotY + vertOffset * safeFrac + sy) : rawDesiredY;

    _camDesired.set(desiredX, desiredY, desiredZ);
    const dampSpeed = this.aiming ? 16 : 12;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camDesired.x, dampSpeed, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camDesired.y, dampSpeed, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camDesired.z, dampSpeed, dt);

    // Look slightly ahead of the right-shoulder pivot for crisp BGMI crosshair alignment
    const lookAhead = this.aiming ? 14 : 6;
    _camTarget.set(
      px3 + rightX * shoulderOffset - Math.sin(effYaw) * lookAhead,
      pivotY - Math.sin(effPitch) * (lookAhead * 0.45),
      pz3 + rightZ * shoulderOffset - Math.cos(effYaw) * lookAhead
    );
    this.camera.lookAt(_camTarget);

    // Dynamic FOV (BGMI ADS Zoom vs Fast Driving Wide FOV)
    const spd = Math.hypot(this.pvx, this.pvy);
    const targetFov = this.aiming ? 43 : Math.min(76, 61 + spd * 0.028);
    if (Math.abs(this.camera.fov - targetFov) > 0.15) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 10, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  // ==================== FX & CONTEXT HELPERS ====================

  private findNearestVehicle(): WorldVehicle | null {
    const hijackRange = this.profile.characterId === 'oggy' ? 98 : 74;
    let best: WorldVehicle | null = null;
    let bestD = hijackRange;
    for (const v of this.vehicles) {
      if (v.isMissionTarget) continue;
      const d = Math.hypot(v.x - this.px, v.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private findNearestDroppedWeapon(range: number): DroppedWeapon | null {
    let best: DroppedWeapon | null = null;
    let bestD = range;
    for (const dw of this.droppedWeapons) {
      const d = Math.hypot(dw.x - this.px, dw.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = dw;
      }
    }
    return best;
  }

  private findNearestArmedNpc(range: number): WorldNpc | null {
    let best: WorldNpc | null = null;
    let bestD = range;
    for (const npc of this.npcs) {
      if (!npc.alive || !npc.carriedWeapon) continue;
      const d = Math.hypot(npc.x - this.px, npc.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = npc;
      }
    }
    return best;
  }

  private findNearestProp(range: number): WorldProp | null {
    let best: WorldProp | null = null;
    let bestD = range;
    for (const p of this.props) {
      if (p.state !== 'idle') continue;
      const d = Math.hypot(p.x - this.px, p.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private findNearestStation(range: number): MapStation | null {
    let best: MapStation | null = null;
    let bestD = range;
    for (const st of this.stations) {
      const d = Math.hypot(st.x - this.px, st.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    }
    return best;
  }

  private findNearestFriendlyNpc(range: number): WorldNpc | null {
    let best: WorldNpc | null = null;
    let bestD = range;
    for (const npc of this.npcs) {
      if (!npc.alive || npc.carriedWeapon) continue;
      const d = Math.hypot(npc.x - this.px, npc.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = npc;
      }
    }
    return best;
  }

  private findNearestFreeBench(range: number): (BenchSpot & { occupiedBy: string | null }) | null {
    let best: (BenchSpot & { occupiedBy: string | null }) | null = null;
    let bestD = range;
    for (const b of this.benches) {
      if (b.occupiedBy !== null) continue;
      const d = Math.hypot(b.x - this.px, b.y - this.py);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  private computeContextAction(): ContextAction | null {
    if (this.sittingBenchId) {
      return { kind: 'sit', label: 'Stand Up', keyHint: 'E' };
    }
    if (this.currentVehicle) {
      if (this.isNearGarage()) return { kind: 'garage', label: 'Customize Ride', keyHint: 'B' };
      return null;
    }
    if (this.heldProp) {
      return { kind: 'throw', label: `Throw ${PROP_LABELS[this.heldProp.kind]}`, keyHint: 'Click / G' };
    }
    const drop = this.findNearestDroppedWeapon(58);
    if (drop) {
      return { kind: 'loot', label: `Take ${WEAPON_LABELS[drop.weaponId]}`, keyHint: 'E' };
    }
    const armed = this.findNearestArmedNpc(54);
    if (armed && armed.carriedWeapon) {
      return { kind: 'disarm', label: `Take ${WEAPON_LABELS[armed.carriedWeapon]}`, keyHint: 'E' };
    }
    const station = this.findNearestStation(68);
    if (station) {
      if (station.kind === 'atm') {
        return {
          kind: 'atm',
          label: station.cooldown > 0 ? `ATM (${Math.ceil(station.cooldown)}s)` : 'Withdraw ₹500',
          keyHint: 'E',
        };
      }
      if (station.kind === 'chai') {
        return { kind: 'chai', label: 'Chai Heal (₹50)', keyHint: 'E' };
      }
      return { kind: 'arms', label: 'Buy All Guns (₹250)', keyHint: 'E' };
    }
    const veh = this.findNearestVehicle();
    if (veh) {
      return { kind: 'ride', label: `Ride ${VEHICLE_SPECS[veh.type].name}`, keyHint: 'E' };
    }
    const bench = this.findNearestFreeBench(38);
    if (bench) {
      return { kind: 'sit', label: 'Sit on Bench', keyHint: 'E' };
    }
    const friendly = this.findNearestFriendlyNpc(50);
    if (friendly) {
      return { kind: 'talk', label: friendly.role === 'cow' ? 'Pet Cow' : 'Chat NPC', keyHint: 'E' };
    }
    const prop = this.findNearestProp(56);
    if (prop) {
      return { kind: 'grab', label: `Grab ${PROP_LABELS[prop.kind]}`, keyHint: 'G' };
    }
    if (this.isNearGarage()) {
      return { kind: 'garage', label: "Raju's Garage", keyHint: 'B' };
    }
    return null;
  }

  private spawnBurst3D(x: number, y: number, height: number, colorHex: number, count: number): void {
    const scale = this.graphicsQuality === 'low' ? 0.45 : this.graphicsQuality === 'medium' ? 0.75 : 1;
    const n = Math.max(2, Math.ceil(count * scale));
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.life = 0.42 + Math.random() * 0.28;
      p.maxLife = 0.65;
      p.gravity = 18;
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 7.5;
      p.vx = Math.cos(a) * sp;
      p.vy = 3 + Math.random() * 5.8;
      p.vz = Math.sin(a) * sp;
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      p.mesh.scale.setScalar(1);
      p.mesh.position.set(x * WORLD_SCALE, height, y * WORLD_SCALE);
      p.mesh.visible = true;
      spawned += 1;
      if (spawned >= n) break;
    }
  }

  private spawnSmokePuff(x: number, y: number, height: number): void {
    const p = this.particles.find((slot) => !slot.active);
    if (!p) return;
    p.active = true;
    p.life = 0.65;
    p.maxLife = 0.65;
    p.gravity = -4.5; // Rises gently upward!
    p.vx = (Math.random() - 0.5) * 1.4;
    p.vy = 1.6 + Math.random() * 1.2;
    p.vz = (Math.random() - 0.5) * 1.4;
    (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(0x4b5563);
    p.mesh.scale.setScalar(1.3);
    p.mesh.position.set(x * WORLD_SCALE, height, y * WORLD_SCALE);
    p.mesh.visible = true;
  }

  private spawnRing3D(x: number, y: number, colorHex: number, maxScale: number): void {
    const r = this.rings.find((slot) => !slot.active);
    if (!r) return;
    r.active = true;
    r.vx = maxScale;
    r.life = 0.38;
    r.maxLife = 0.38;
    const mat = r.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.85;
    r.mesh.position.set(x * WORLD_SCALE, 0.25, y * WORLD_SCALE);
    r.mesh.scale.setScalar(0.25);
    r.mesh.visible = true;
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const t = p.life / p.maxLife;
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.15, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(p.gravity < 0 ? 0.6 + (1 - t) * 1.6 : t);
    }

    for (const r of this.rings) {
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const t = r.life / r.maxLife;
      const s = Math.max(0.2, r.vx * (1.1 - t));
      r.mesh.scale.set(s, s, s);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = t;
    }
  }

  private awardProgress(rupees: number, xp: number): void {
    const eventMult = this.activeCityEvent?.def.id === 'samosa_rain' ? 2 : 1;
    this.profile.rupees += rupees * eventMult;
    this.profile.xp += xp;
    this.profile.level = Math.floor(this.profile.xp / 500) + 1;
    this.profile.updatedAt = Date.now();
    this.callbacks.onProfileMutated({ ...this.profile });
  }

  private addWanted(delta: number): void {
    if (this.profile.characterId === 'chingum' && Math.random() < 0.5) return;
    const prev = this.wantedLevel;
    this.wantedLevel = Math.min(4, this.wantedLevel + delta);
    this.wantedDecayTimer = 0;
    if (this.wantedLevel > prev && prev === 0) {
      this.showFeed(randomWantedLine());
    }
  }

  private takeDamage(amount: number): void {
    let remaining = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, remaining * 0.55);
      this.armor = Math.max(0, this.armor - absorbed);
      remaining -= absorbed;
    }
    this.hp = Math.max(0, this.hp - remaining);
    this.stumbleTimer = 0.28;
    this.addShake(0.12, 0.5);
    if (this.hp <= 0 && !this.wasted) {
      this.wasted = true;
      this.wastedTimer = 0;
      this.wastedSubtitle = randomWastedSubtitle();
      this.cancelMission();
      soundEngine.playSlideWhistle();
      soundEngine.playExplosion();
      this.spawnBurst3D(this.px, this.py, 1.2, 0xef4444, 18);
    }
  }

  private onHeavyImpact(x: number, y: number, intensity: number): void {
    soundEngine.playCrash(intensity);
    this.addShake(0.18, Math.min(1.1, 0.4 + intensity * 0.4));
    if (intensity > 0.95) this.hitstopTimer = 0.035;
    this.spawnBurst3D(x, y, 1.2, 0xfbbf24, 8);
    if (intensity > 0.72 && this.crashQuipCooldown <= 0) {
      this.crashQuipCooldown = 4.5;
      this.showFeed(randomCrashLine());
    }
  }

  private addShake(duration: number, mag: number): void {
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  private showFeed(text: string): void {
    this.killFeedText = text;
    this.killFeedTimer = 2.6;
  }

  private isNearGarage(): boolean {
    const g = this.map.garageZone;
    return Math.hypot(this.px - g.x, this.py - g.y) < g.radius + 45;
  }

  private emitHud(): void {
    const district = getNearestDistrict(this.px, this.py);
    const charDef = CHARACTERS[this.profile.characterId];
    const nearVeh = !this.currentVehicle ? this.findNearestVehicle() : null;
    const am = this.activeMission;
    const eggsFound = this.easterEggs.filter((e) => e.found).length;

    this.callbacks.onHudUpdate({
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      armor: Math.round(this.armor),
      maxArmor: this.maxArmor,
      rupees: this.profile.rupees,
      xp: this.profile.xp,
      level: this.profile.level,
      kills: this.profile.stats.kills || 0,
      wantedLevel: this.wantedLevel,
      speedKmh: Math.round(Math.hypot(this.pvx, this.pvy) * 0.24),
      inVehicleType: this.currentVehicle ? this.currentVehicle.type : null,
      vehicleHp: this.currentVehicle ? Math.max(0, Math.round(this.currentVehicle.hp)) : 0,
      vehicleMaxHp: this.currentVehicle ? Math.round(this.currentVehicle.maxHp) : 100,
      vehicleName: this.currentVehicle ? VEHICLE_SPECS[this.currentVehicle.type].name : null,
      nearVehicleName: nearVeh ? VEHICLE_SPECS[nearVeh.type].name : null,
      nearGarage: this.isNearGarage(),
      districtName: district.name,
      timeOfDay: this.weatherSystem.timeOfDay,
      weather: this.weatherSystem.weather,
      graphicsQuality: this.graphicsQuality,
      playerX: Math.round(this.px),
      playerY: Math.round(this.py),
      waypoint: this.waypoint ? { ...this.waypoint } : null,
      weaponId: this.weaponId,
      ownedWeapons: { ...this.ownedWeapons },
      weaponAmmo: { ...this.weaponAmmo },
      magAmmo: this.magAmmo[this.weaponId] || 0,
      magSize: WEAPON_MAG_SIZE[this.weaponId] || 1,
      reloading: this.reloadTimer > 0,
      easterEggsFound: eggsFound,
      easterEggsTotal: this.easterEggs.length,
      activeEvent: this.activeCityEvent
        ? {
            title: this.activeCityEvent.def.title,
            subtitle: this.activeCityEvent.def.subtitle,
            timeLeft: Math.ceil(this.activeCityEvent.timeLeft),
          }
        : null,
      cameraMode: this.camMode,
      aiming: this.aiming,
      crouching: this.crouching,
      holdingProp: this.heldProp ? this.heldProp.kind : null,
      activeEmote: this.activeEmote,
      sittingBench: this.sittingBenchId !== null,
      hitMarker: this.hitMarkerTimer > 0,
      pointerLocked: this.pointerLocked,
      contextAction: this.computeContextAction(),
      specialCooldown: this.specialCooldown,
      specialMaxCooldown: charDef.specialCooldown,
      specialActive: this.specialActiveTimer > 0,
      specialTimer: this.specialActiveTimer,
      activeMission: am
        ? {
            title: am.mission.title,
            objectiveText: am.objectiveText,
            timeLeft: Math.max(0, Math.ceil(am.timeLeft)),
            progress: am.progress,
            total: am.total,
            distanceM: Math.round(Math.hypot(am.targetX - this.px, am.targetY - this.py) / 6),
          }
        : null,
      killFeed: this.killFeedText,
      wasted: this.wasted,
      wastedSubtitle: this.wastedSubtitle,
    });
  }

  private renderMinimap(): void {
    if (!this.minimapCanvas || !this.minimapCtx) return;
    const mctx = this.minimapCtx;
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;
    const cx = mw / 2;
    const cy = mh / 2;
    const viewRadius = 1150; // Crisp GTA-style local player-centered radar (230m diameter)
    const scale = cx / viewRadius;

    mctx.fillStyle = '#181412';
    mctx.fillRect(0, 0, mw, mh);

    const toLocalX = (wx: number) => cx + (wx - this.px) * scale;
    const toLocalY = (wy: number) => cy + (wy - this.py) * scale;

    // Parks & Cricket Field
    const cf = this.map.cricketField;
    mctx.fillStyle = '#1b4326';
    mctx.fillRect(toLocalX(cf.x), toLocalY(cf.y), cf.w * scale, cf.h * scale);
    const cp = this.map.centralPark;
    mctx.fillRect(toLocalX(cp.x), toLocalY(cp.y), cp.w * scale, cp.h * scale);

    // Nearby Asphalt Roads
    mctx.fillStyle = '#44403c';
    const roadHalfPx = (ROAD_WIDTH * 0.5) * scale;
    for (const r of ROAD_CENTERS) {
      const rx = toLocalX(r);
      const ry = toLocalY(r);
      if (ry >= -10 && ry <= mh + 10) mctx.fillRect(0, ry - roadHalfPx, mw, roadHalfPx * 2);
      if (rx >= -10 && rx <= mw + 10) mctx.fillRect(rx - roadHalfPx, 0, roadHalfPx * 2, mh);
    }

    // Nearby Building Footprints
    mctx.fillStyle = '#292524';
    for (const b of this.map.buildings) {
      if (Math.abs(b.x + b.w / 2 - this.px) > viewRadius + 240 || Math.abs(b.y + b.h / 2 - this.py) > viewRadius + 240) {
        continue;
      }
      mctx.fillRect(toLocalX(b.x), toLocalY(b.y), Math.max(2, b.w * scale), Math.max(2, b.h * scale));
    }

    // Garage
    const g = this.map.garageZone;
    mctx.fillStyle = '#10b981';
    mctx.beginPath();
    mctx.arc(toLocalX(g.x), toLocalY(g.y), 3.6, 0, Math.PI * 2);
    mctx.fill();

    // Map Stations & Stunt Ramps
    for (const st of this.stations) {
      mctx.fillStyle = st.kind === 'atm' ? '#22c55e' : st.kind === 'chai' ? '#f59e0b' : '#38bdf8';
      mctx.fillRect(toLocalX(st.x) - 2, toLocalY(st.y) - 2, 4, 4);
    }
    mctx.fillStyle = '#fb923c';
    for (const rm of this.stuntRamps) {
      mctx.fillRect(toLocalX(rm.x) - 1.8, toLocalY(rm.y) - 1.8, 3.6, 3.6);
    }

    // Hostile NPCs
    for (const npc of this.npcs) {
      if (!npc.alive) continue;
      if (npc.role === 'gangster' || (npc.role === 'police' && this.wantedLevel > 0)) {
        mctx.fillStyle = npc.role === 'police' ? '#3b82f6' : '#ef4444';
        mctx.fillRect(toLocalX(npc.x) - 1.5, toLocalY(npc.y) - 1.5, 3, 3);
      }
    }

    // Active Mission & GPS Waypoint (clamped to radar edge when far away)
    const drawClampedMarker = (wx: number, wy: number, color: string, ringOnly: boolean) => {
      let lx = toLocalX(wx);
      let ly = toLocalY(wy);
      const dx = lx - cx;
      const dy = ly - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > cx - 6) {
        lx = cx + (dx / dist) * (cx - 6);
        ly = cy + (dy / dist) * (cy - 6);
      }
      if (ringOnly) {
        mctx.strokeStyle = color;
        mctx.lineWidth = 2;
        mctx.beginPath();
        mctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
        mctx.stroke();
      } else {
        mctx.fillStyle = color;
        mctx.beginPath();
        mctx.arc(lx, ly, 4.2, 0, Math.PI * 2);
        mctx.fill();
      }
    };

    if (this.activeMission) drawClampedMarker(this.activeMission.targetX, this.activeMission.targetY, '#facc15', false);
    if (this.waypoint) drawClampedMarker(this.waypoint.x, this.waypoint.y, '#38bdf8', true);

    // Online Friends
    mctx.fillStyle = '#38bdf8';
    for (const r of this.remotes.values()) {
      mctx.beginPath();
      mctx.arc(toLocalX(r.x), toLocalY(r.y), 3.4, 0, Math.PI * 2);
      mctx.fill();
    }

    // Local Player Heading Arrow (centered)
    mctx.save();
    mctx.translate(cx, cy);
    mctx.rotate(this.pAngle + Math.PI / 2);
    mctx.fillStyle = '#ffffff';
    mctx.strokeStyle = '#f97316';
    mctx.lineWidth = 1.5;
    mctx.beginPath();
    mctx.moveTo(0, -6);
    mctx.lineTo(4.5, 5);
    mctx.lineTo(0, 2.5);
    mctx.lineTo(-4.5, 5);
    mctx.closePath();
    mctx.fill();
    mctx.stroke();
    mctx.restore();
  }

  public destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.renderer.domElement.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    soundEngine.setRainAmbience(0);
    this.renderer.dispose();
  }
}
