import * as THREE from 'three';
import { CharacterId, VehicleCustomConfig, VehicleType, WeaponId } from '../shared/types';
import { CHARACTERS, getPaintJob } from './constants';
import { BuildingRect } from './mapGenerator';
import {
  createBarkTexture,
  createBuildingPbrTexture,
  createClothTexture,
  createLeafClusterTexture,
  createSkyDomeTexture,
} from './textures3d';

// Coordinate conversion: 10 2D map units = 1 3D meter (5600 -> 560m open city)
export const WORLD_SCALE = 0.1;

// ==================== SHARED VEHICLE & HARDWARE GEOMETRIES/MATERIALS ====================
const tireGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.27, 24);
tireGeo.rotateZ(Math.PI / 2);

const smallTireGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.21, 20);
smallTireGeo.rotateZ(Math.PI / 2);

const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.285, 16);
rimGeo.rotateZ(Math.PI / 2);

const spokeGeo = new THREE.BoxGeometry(0.295, 0.42, 0.045);

const tireMat = new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.88, metalness: 0.06 });
const alloyMat = new THREE.MeshStandardMaterial({ color: 0xd4dae2, roughness: 0.2, metalness: 0.88 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.14, metalness: 0.92 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f242c, roughness: 0.38, metalness: 0.72 });
const matteTrimMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.72, metalness: 0.15 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x162436,
  roughness: 0.06,
  metalness: 0.14,
  clearcoat: 1.0,
  clearcoatRoughness: 0.08,
  transparent: true,
  opacity: 0.44,
});
const headLightMat = new THREE.MeshStandardMaterial({
  color: 0xfefce8,
  emissive: 0xfef08a,
  emissiveIntensity: 2.0,
  roughness: 0.15,
});
const tailLightMat = new THREE.MeshStandardMaterial({
  color: 0xdc2626,
  emissive: 0xef4444,
  emissiveIntensity: 1.8,
  roughness: 0.22,
});
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x090807,
  transparent: true,
  opacity: 0.34,
  depthWrite: false,
});
const shadowDiscGeo = new THREE.CircleGeometry(1, 22);
shadowDiscGeo.rotateX(-Math.PI / 2);

export function createSunsetSkyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(480, 26, 18);
  const tex = createSkyDomeTexture('day', false);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
  return new THREE.Mesh(geo, mat);
}

export function createNameplateSprite(text: string, accentHex = '#facc15'): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = 'rgba(18, 15, 14, 0.88)';
  ctx.beginPath();
  ctx.roundRect(8, 10, 240, 44, 10);
  ctx.fill();
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#fef3c7';
  ctx.font = '700 21px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text.slice(0, 18), 128, 39);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.9, 0.72, 1);
  return sprite;
}

// ==================== SEMI-REALISTIC ANATOMICAL 3D HUMAN RIG (~1.82m) ====================

export interface HandRig3D {
  wrist: THREE.Group;
  thumbBase: THREE.Group;
  thumbTip: THREE.Group;
  indexBase: THREE.Group;
  indexTip: THREE.Group;
  middleBase: THREE.Group;
  middleTip: THREE.Group;
  ringBase: THREE.Group;
  ringTip: THREE.Group;
  pinkyBase: THREE.Group;
  pinkyTip: THREE.Group;
}

export interface CharacterRig3D {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftLeg: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightLeg: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  leftArm: THREE.Group;
  leftElbow: THREE.Group;
  leftHand: HandRig3D;
  rightArm: THREE.Group;
  rightElbow: THREE.Group;
  rightHand: HandRig3D;
  rightHandGripAnchor: THREE.Group;
  holdAnchor: THREE.Group;
  weapons: Record<WeaponId, THREE.Group>;
  specialAura: THREE.Mesh;
  hpBarFill?: THREE.Mesh;
}

// Natural adult human cranium & jawline (0.245m tall, realistic cheekbones & chin)
const naturalHeadGeo = (() => {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.045, 0.015), // chin
    new THREE.Vector2(0.082, 0.055), // jaw
    new THREE.Vector2(0.098, 0.11), // cheekbones
    new THREE.Vector2(0.1, 0.165), // temples
    new THREE.Vector2(0.088, 0.215), // forehead curve
    new THREE.Vector2(0.048, 0.24), // crown
    new THREE.Vector2(0.0, 0.245),
  ];
  const g = new THREE.LatheGeometry(pts, 20);
  g.scale(0.92, 1.0, 1.08);
  g.computeVertexNormals();
  return g;
})();

// Natural adult torso (0.60m tall, realistic shoulder-to-waist taper & ribcage depth)
const naturalTorsoGeo = (() => {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.15, 0.02), // hip line
    new THREE.Vector2(0.165, 0.1), // pelvis
    new THREE.Vector2(0.145, 0.22), // natural waist
    new THREE.Vector2(0.175, 0.38), // ribcage
    new THREE.Vector2(0.205, 0.50), // upper chest / shoulders
    new THREE.Vector2(0.165, 0.56), // trapezius slope
    new THREE.Vector2(0.072, 0.59), // collar
    new THREE.Vector2(0.0, 0.59),
  ];
  const g = new THREE.LatheGeometry(pts, 20);
  g.scale(1.16, 1.0, 0.72);
  g.computeVertexNormals();
  return g;
})();

// Sturdy adult torso (realistic heavier build for Motu without cartoonish sphere proportions)
const heavyTorsoGeo = (() => {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.185, 0.02),
    new THREE.Vector2(0.225, 0.14),
    new THREE.Vector2(0.235, 0.25),
    new THREE.Vector2(0.22, 0.42),
    new THREE.Vector2(0.215, 0.53),
    new THREE.Vector2(0.085, 0.59),
    new THREE.Vector2(0.0, 0.59),
  ];
  const g = new THREE.LatheGeometry(pts, 20);
  g.scale(1.1, 1.0, 0.88);
  g.computeVertexNormals();
  return g;
})();

const thighGeo = new THREE.CylinderGeometry(0.088, 0.068, 0.43, 14);
const calfGeo = new THREE.CylinderGeometry(0.065, 0.048, 0.42, 14);
const upperArmGeo = new THREE.CylinderGeometry(0.058, 0.048, 0.29, 12);
const forearmGeo = new THREE.CylinderGeometry(0.046, 0.034, 0.27, 12);
const jointKneeGeo = new THREE.SphereGeometry(0.06, 10, 10);
const shoulderCapGeo = new THREE.SphereGeometry(0.066, 12, 10);

// Shared anatomical palm + individual finger geometries (zero extra GPU bloat)
const wristJointGeo = new THREE.SphereGeometry(0.028, 8, 8);
const palmBoxGeo = new THREE.BoxGeometry(0.026, 0.076, 0.074);
const fingerProxGeo = new THREE.CapsuleGeometry(0.0082, 0.028, 4, 6);
const fingerDistGeo = new THREE.CapsuleGeometry(0.0072, 0.022, 4, 6);
const thumbProxGeo = new THREE.CapsuleGeometry(0.0096, 0.024, 4, 6);
const thumbDistGeo = new THREE.CapsuleGeometry(0.0084, 0.02, 4, 6);

function createHandRig(skinMat: THREE.Material, isRight: boolean): HandRig3D {
  const wrist = new THREE.Group();
  wrist.position.set(0, -0.275, 0);

  const wristBall = new THREE.Mesh(wristJointGeo, skinMat);
  const palm = new THREE.Mesh(palmBoxGeo, skinMat);
  palm.position.set(0, -0.04, 0.004);
  palm.castShadow = true;
  wrist.add(wristBall, palm);

  const buildFinger = (zOffset: number, yBase: number, scaleLen: number) => {
    const base = new THREE.Group();
    base.position.set(0, yBase, zOffset);
    const prox = new THREE.Mesh(fingerProxGeo, skinMat);
    prox.scale.y = scaleLen;
    prox.position.y = -0.02 * scaleLen;
    base.add(prox);

    const tip = new THREE.Group();
    tip.position.y = -0.04 * scaleLen;
    const dist = new THREE.Mesh(fingerDistGeo, skinMat);
    dist.scale.y = scaleLen;
    dist.position.y = -0.016 * scaleLen;
    tip.add(dist);
    base.add(tip);
    wrist.add(base);
    return { base, tip };
  };

  // 4 Individual Human Fingers from front (+Z index) to back (-Z pinky)
  const index = buildFinger(0.028, -0.076, 0.98);
  const middle = buildFinger(0.01, -0.078, 1.08);
  const ring = buildFinger(-0.009, -0.076, 0.98);
  const pinky = buildFinger(-0.027, -0.072, 0.8);

  // Opposable Human Thumb positioned at front-inner palm edge
  const thumbBase = new THREE.Group();
  thumbBase.position.set(isRight ? -0.01 : 0.01, -0.026, 0.038);
  thumbBase.rotation.set(-0.38, 0, isRight ? -0.22 : 0.22);
  const tProx = new THREE.Mesh(thumbProxGeo, skinMat);
  tProx.position.y = -0.018;
  thumbBase.add(tProx);

  const thumbTip = new THREE.Group();
  thumbTip.position.y = -0.036;
  const tDist = new THREE.Mesh(thumbDistGeo, skinMat);
  tDist.position.y = -0.014;
  thumbTip.add(tDist);
  thumbBase.add(thumbTip);
  wrist.add(thumbBase);

  return {
    wrist,
    thumbBase,
    thumbTip,
    indexBase: index.base,
    indexTip: index.tip,
    middleBase: middle.base,
    middleTip: middle.tip,
    ringBase: ring.base,
    ringTip: ring.tip,
    pinkyBase: pinky.base,
    pinkyTip: pinky.tip,
  };
}

function buildWeaponMeshes(charId: CharacterId, forHand = true): Record<WeaponId, THREE.Group> {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b3e1b, roughness: 0.65 });
  const gunMetalMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.34, metalness: 0.78 });

  // Inside rightHandGripAnchor, +Y points up along forearm toward elbow, -Y extends forward past knuckles when arm aims (-Math.PI/2)
  const alignRotX = forHand ? Math.PI / 2 : 0;

  const pistol = new THREE.Group();
  const pInner = new THREE.Group();
  const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.125, 0.055), darkMetalMat);
  pGrip.rotation.x = 0.22;
  const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.05, 0.25), gunMetalMat);
  pSlide.position.set(0, 0.064, 0.085);
  pInner.add(pGrip, pSlide);
  pInner.rotation.x = alignRotX;
  pistol.add(pInner);

  const smg = new THREE.Group();
  const smgInner = new THREE.Group();
  const smgBody = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.08, 0.36), darkMetalMat);
  smgBody.position.set(0, 0.05, 0.13);
  const smgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.18, 8), gunMetalMat);
  smgBarrel.rotation.x = Math.PI / 2;
  smgBarrel.position.set(0, 0.055, 0.35);
  const smgMag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.21, 0.05), darkMetalMat);
  smgMag.position.set(0, -0.065, 0.17);
  smgInner.add(smgBody, smgBarrel, smgMag);
  smgInner.rotation.x = alignRotX;
  smg.add(smgInner);
  smg.visible = false;

  const shotgun = new THREE.Group();
  const sgInner = new THREE.Group();
  const sgStock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.26), woodMat);
  sgStock.position.set(0, 0.035, -0.02);
  const sgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.64, 10), gunMetalMat);
  sgBarrel.rotation.x = Math.PI / 2;
  sgBarrel.position.set(0, 0.064, 0.3);
  const sgPump = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.18, 10), woodMat);
  sgPump.rotation.x = Math.PI / 2;
  sgPump.position.set(0, 0.03, 0.34);
  sgInner.add(sgStock, sgBarrel, sgPump);
  sgInner.rotation.x = alignRotX;
  shotgun.add(sgInner);
  shotgun.visible = false;

  const ak47 = new THREE.Group();
  const akInner = new THREE.Group();
  const akRec = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.08, 0.38), darkMetalMat);
  akRec.position.set(0, 0.05, 0.11);
  const akWood = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.072, 0.22), woodMat);
  akWood.position.set(0, 0.03, -0.14);
  const akBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.44, 8), gunMetalMat);
  akBarrel.rotation.x = Math.PI / 2;
  akBarrel.position.set(0, 0.062, 0.44);
  const akMag = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.023, 6, 10, 1.25), darkMetalMat);
  akMag.rotation.y = Math.PI / 2;
  akMag.rotation.z = -0.5;
  akMag.position.set(0, -0.07, 0.22);
  akInner.add(akRec, akWood, akBarrel, akMag);
  akInner.rotation.x = alignRotX;
  ak47.add(akInner);
  ak47.visible = false;

  const bat = new THREE.Group();
  const batInner = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.26, 10), darkMetalMat);
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(charId === 'oggy' ? 0.16 : 0.1, 0.54, 0.038),
    new THREE.MeshStandardMaterial({ color: charId === 'oggy' ? 0xb91c1c : 0xc29b61, roughness: 0.55 })
  );
  blade.position.y = 0.38;
  batInner.add(handle, blade);
  batInner.rotation.x = forHand ? -Math.PI * 0.45 : Math.PI / 2.2;
  bat.add(batInner);
  bat.visible = false;

  return { pistol, smg, shotgun, ak47, bat };
}

export function createCharacter3D(
  charId: CharacterId,
  role: 'hero' | 'ped' | 'gangster' | 'police' | 'cow' = 'hero',
  customColor?: string
): CharacterRig3D {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  const torsoGroup = new THREE.Group();
  const headGroup = new THREE.Group();
  group.add(bodyGroup);
  bodyGroup.add(torsoGroup);

  const holdAnchor = new THREE.Group();
  holdAnchor.position.set(0, 2.02, 0.28);
  bodyGroup.add(holdAnchor);

  const shadow = new THREE.Mesh(shadowDiscGeo, shadowMat);
  shadow.scale.set(role === 'cow' ? 1.12 : 0.48, 1, role === 'cow' ? 0.72 : 0.48);
  shadow.position.y = 0.03;
  group.add(shadow);

  const leftLeg = new THREE.Group();
  const leftKnee = new THREE.Group();
  const leftAnkle = new THREE.Group();
  const rightLeg = new THREE.Group();
  const rightKnee = new THREE.Group();
  const rightAnkle = new THREE.Group();
  const leftArm = new THREE.Group();
  const leftElbow = new THREE.Group();
  const rightArm = new THREE.Group();
  const rightElbow = new THREE.Group();
  const rightHandGripAnchor = new THREE.Group();
  const weapons = buildWeaponMeshes(charId, true);

  const auraMat = new THREE.MeshBasicMaterial({
    color: CHARACTERS[charId]?.accentColor || '#f59e0b',
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const specialAura = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.15, 28), auraMat);
  specialAura.rotation.x = -Math.PI / 2;
  specialAura.position.y = 0.07;
  specialAura.visible = false;
  group.add(specialAura);

  if (role === 'cow') {
    const cowWhite = new THREE.MeshStandardMaterial({ color: 0xeae6df, roughness: 0.84 });
    const cowSpot = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.86 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.76, 8, 14), cowWhite);
    torso.rotation.x = Math.PI / 2;
    torso.position.y = 0.92;
    torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.46), cowWhite);
    head.position.set(0, 1.12, 0.72);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), cowSpot);
    spot.scale.set(1.18, 0.78, 0.9);
    spot.position.set(0.05, 0.98, -0.08);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 8), cowSpot);
    hornL.position.set(-0.15, 1.34, 0.65);
    hornL.rotation.z = 0.42;
    const hornR = hornL.clone();
    hornR.position.x = 0.15;
    hornR.rotation.z = -0.42;
    torsoGroup.add(torso, head, spot, hornL, hornR);

    const cLegGeo = new THREE.CylinderGeometry(0.07, 0.055, 0.62, 8);
    [
      [-0.2, 0.32, 0.38],
      [0.2, 0.32, 0.38],
      [-0.2, 0.32, -0.38],
      [0.2, 0.32, -0.38],
    ].forEach(([lx, ly, lz]) => {
      const l = new THREE.Mesh(cLegGeo, cowWhite);
      l.position.set(lx, ly, lz);
      torsoGroup.add(l);
    });
    const dummySkin = new THREE.MeshStandardMaterial({ color: 0xeae6df });
    const leftHand = createHandRig(dummySkin, false);
    const rightHand = createHandRig(dummySkin, true);
    return {
      group,
      bodyGroup,
      torsoGroup,
      headGroup,
      leftLeg,
      leftKnee,
      leftAnkle,
      rightLeg,
      rightKnee,
      rightAnkle,
      leftArm,
      leftElbow,
      leftHand,
      rightArm,
      rightElbow,
      rightHand,
      rightHandGripAnchor,
      holdAnchor,
      weapons,
      specialAura,
    };
  }

  const def = CHARACTERS[charId];
  const shirtHex =
    role === 'gangster'
      ? '#27272a'
      : role === 'police'
      ? '#b39869'
      : role === 'ped'
      ? customColor || '#c2410c'
      : def.primaryColor;
  const pantsHex =
    role === 'gangster'
      ? '#18181b'
      : role === 'police'
      ? '#8c7246'
      : charId === 'bheem' && role === 'hero'
      ? '#eab308'
      : '#1e293b';

  // Grounded natural skin tones (semi-realistic)
  const skinHex =
    role === 'hero'
      ? charId === 'oggy'
        ? '#c79772'
        : def.skinColor
      : '#c68b60';

  const shirtTex = createClothTexture(shirtHex, role === 'police' ? 'khaki' : 'cotton');
  const pantsTex = createClothTexture(pantsHex, role === 'police' ? 'khaki' : 'denim');

  const shirtMat = new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.78, metalness: 0.03 });
  const pantsMat = new THREE.MeshStandardMaterial({ map: pantsTex, roughness: 0.85, metalness: 0.02 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.6, metalness: 0.02 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.76 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: 0x231710, roughness: 0.5, metalness: 0.1 });
  const shoeSoleMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.75 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.8 });
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x8f4e45, roughness: 0.58 });

  const isMotu = role === 'hero' && charId === 'motu';
  const isBheem = role === 'hero' && charId === 'bheem';
  const isOggy = role === 'hero' && charId === 'oggy';

  // ---- 1. PROPORTIONAL 3-SEGMENT HUMAN LEGS (Hip y=0.912 -> Knee -> Ankle -> Shoe sole y=0.000) ----
  const buildLeg = (hipGroup: THREE.Group, kneeGroup: THREE.Group, ankleGroup: THREE.Group, xOffset: number) => {
    hipGroup.position.set(xOffset, 0.912, 0);
    const hipBall = new THREE.Mesh(new THREE.SphereGeometry(0.086, 10, 10), pantsMat);
    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.position.y = -0.215;
    thigh.castShadow = true;

    kneeGroup.position.set(0, -0.43, 0);
    const kneeCap = new THREE.Mesh(jointKneeGeo, pantsMat);
    const calf = new THREE.Mesh(calfGeo, isBheem ? skinMat : pantsMat);
    calf.position.y = -0.21;
    calf.castShadow = true;

    ankleGroup.position.set(0, -0.43, 0);
    const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.072, 0.23), leatherMat);
    shoeUpper.position.set(0, -0.008, 0.045);
    shoeUpper.castShadow = true;
    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.024, 0.24), shoeSoleMat);
    shoeSole.position.set(0, -0.04, 0.045);

    ankleGroup.add(shoeUpper, shoeSole);
    kneeGroup.add(kneeCap, calf, ankleGroup);
    hipGroup.add(hipBall, thigh, kneeGroup);
    bodyGroup.add(hipGroup);
  };

  buildLeg(leftLeg, leftKnee, leftAnkle, -0.11);
  buildLeg(rightLeg, rightKnee, rightAnkle, 0.11);

  // ---- 2. PROPORTIONAL HUMAN TORSO + TAILORED CLOTHING ----
  torsoGroup.position.set(0, 0.9, 0);

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(isMotu ? 0.19 : 0.16, 12, 10), pantsMat);
  pelvis.scale.set(1.12, 0.62, 0.78);
  pelvis.position.y = 0.02;
  torsoGroup.add(pelvis);

  const torsoMesh = new THREE.Mesh(isMotu ? heavyTorsoGeo : naturalTorsoGeo, shirtMat);
  torsoMesh.position.y = 0.03;
  torsoMesh.castShadow = true;
  torsoGroup.add(torsoMesh);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(isMotu ? 0.21 : 0.165, 0.024, 8, 22), leatherMat);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.1, isMotu ? 0.88 : 0.74, 1);
  belt.position.y = 0.095;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.042, 0.028), goldMat);
  buckle.position.set(0, 0.095, isMotu ? 0.2 : 0.135);
  torsoGroup.add(belt, buckle);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.02, 8, 16), shirtMat);
  collar.rotation.x = Math.PI / 2 + 0.18;
  collar.position.set(0, 0.6, 0.015);
  torsoGroup.add(collar);

  if (isMotu) {
    const vest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.245, 0.44, 16, 1, true, 0.55, Math.PI * 2 - 1.1),
      new THREE.MeshStandardMaterial({ map: createClothTexture('#1e1b18'), roughness: 0.72 })
    );
    vest.position.y = 0.34;
    vest.rotation.y = Math.PI;
    torsoGroup.add(vest);
  } else if (isBheem) {
    const sash = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.032, 8, 18), goldMat);
    sash.position.set(0, 0.36, 0);
    sash.rotation.set(0.42, 0.18, 0.68);
    torsoGroup.add(sash);
  } else if (isOggy) {
    const tie = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.28, 0.022),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 })
    );
    tie.position.set(0, 0.41, 0.135);
    torsoGroup.add(tie);
  } else if (role === 'police' || (role === 'hero' && charId === 'chingum')) {
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.016, 8), goldMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0.085, 0.45, 0.145);
    torsoGroup.add(badge);
  }

  // ---- 3. NATURAL HUMAN HEAD (~0.245m, realistic features, hair & accessories) ----
  headGroup.position.set(0, 0.61, 0);
  torsoGroup.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.11, 14), skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  const headMesh = new THREE.Mesh(naturalHeadGeo, skinMat);
  headMesh.position.y = 0.08;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Subtle realistic nose ridge
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.052, 0.028), skinMat);
  nose.rotation.x = -0.22;
  nose.position.set(0, 0.2, 0.105);
  headGroup.add(nose);

  // Natural mouth contour
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.012, 0.016), lipMat);
  mouth.position.set(0, 0.145, 0.095);
  headGroup.add(mouth);

  // Contoured ears
  const earGeo = new THREE.SphereGeometry(0.024, 8, 8);
  earGeo.scale(0.45, 1.15, 0.75);
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.position.set(-0.095, 0.205, -0.005);
  const earR = earL.clone();
  earR.position.x = 0.095;
  headGroup.add(earL, earR);

  // Realistic human eyes + brows OR aviator shades / glasses
  if ((role === 'hero' && charId === 'chingum') || role === 'gangster') {
    const lensGeo = new THREE.BoxGeometry(0.046, 0.028, 0.014);
    const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x09090b, roughness: 0.08, metalness: 0.4, clearcoat: 1 });
    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.set(-0.036, 0.225, 0.104);
    const lensR = lensL.clone();
    lensR.position.x = 0.036;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.007, 0.01), goldMat);
    bridge.position.set(0, 0.23, 0.106);
    headGroup.add(lensL, lensR, bridge);
  } else {
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.25 });
    const eyeGeo = new THREE.SphereGeometry(0.015, 8, 8);
    eyeGeo.scale(1.2, 0.78, 0.65);
    const irisGeo = new THREE.SphereGeometry(0.009, 8, 8);
    const browGeo = new THREE.BoxGeometry(0.036, 0.008, 0.012);
    [-0.035, 0.035].forEach((ex) => {
      const ew = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      ew.position.set(ex, 0.225, 0.092);
      const ei = new THREE.Mesh(irisGeo, irisMat);
      ei.position.set(ex, 0.225, 0.098);
      const brow = new THREE.Mesh(browGeo, hairMat);
      brow.rotation.z = ex < 0 ? 0.08 : -0.08;
      brow.position.set(ex, 0.248, 0.095);
      headGroup.add(ew, ei, brow);
    });

    if (role === 'hero' && charId === 'patlu') {
      const rimL = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 16), darkMetalMat);
      rimL.position.set(-0.035, 0.225, 0.104);
      const rimR = rimL.clone();
      rimR.position.x = 0.035;
      headGroup.add(rimL, rimR);
    }
  }

  // Handlebar Mustache (grounded scale)
  if (role === 'hero' && (charId === 'motu' || charId === 'chingum')) {
    const stacheL = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.04, 4, 6), hairMat);
    stacheL.rotation.z = Math.PI / 2.25;
    stacheL.position.set(-0.028, 0.168, 0.102);
    const stacheR = stacheL.clone();
    stacheR.rotation.z = -Math.PI / 2.25;
    stacheR.position.x = 0.028;
    headGroup.add(stacheL, stacheR);
  }

  // Natural Sculpted Hair / Police Peaked Cap
  if ((role === 'hero' && charId === 'chingum') || role === 'police') {
    const capCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.1, 0.075, 16),
      new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.48 })
    );
    capCrown.position.set(0, 0.325, 0);
    const capPeak = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.016, 14, 1, false, -0.9, 1.8), darkMetalMat);
    capPeak.position.set(0, 0.288, 0.055);
    headGroup.add(capCrown, capPeak);
  } else {
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.102, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
    hairCap.scale.set(0.95, 1.0, 1.1);
    hairCap.position.set(0, 0.23, -0.012);
    headGroup.add(hairCap);
    if (isBheem) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), hairMat);
      bun.position.set(0, 0.34, -0.035);
      headGroup.add(bun);
    } else {
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.032, 0.055), hairMat);
      fringe.position.set(0, 0.295, 0.052);
      headGroup.add(fringe);
    }
  }

  // ---- 4. PROPORTIONAL HUMAN ARMS + ARTICULATED 5-FINGER HANDS ----
  const shoulderX = isMotu ? 0.24 : 0.22;
  const buildArm = (shoulderG: THREE.Group, elbowG: THREE.Group, xPos: number, isRight: boolean): HandRig3D => {
    shoulderG.position.set(xPos, 0.54, 0);
    const deltoid = new THREE.Mesh(shoulderCapGeo, shirtMat);
    const upper = new THREE.Mesh(upperArmGeo, shirtMat);
    upper.position.y = -0.145;
    upper.castShadow = true;

    elbowG.position.set(0, -0.29, 0);
    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 10), skinMat);
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.y = -0.135;
    forearm.castShadow = true;

    const hand = createHandRig(skinMat, isRight);
    elbowG.add(elbowJoint, forearm, hand.wrist);
    shoulderG.add(deltoid, upper, elbowG);
    torsoGroup.add(shoulderG);
    return hand;
  };

  const leftHand = buildArm(leftArm, leftElbow, -shoulderX, false);
  const rightHand = buildArm(rightArm, rightElbow, shoulderX, true);

  // Attach weapons inside right wrist grip anchor so firearms follow wrist/hand orientation 1:1
  rightHandGripAnchor.position.set(-0.018, -0.052, 0.015);
  rightHand.wrist.add(rightHandGripAnchor);
  if (role === 'hero' || role === 'gangster' || role === 'police') {
    rightHandGripAnchor.add(weapons.pistol, weapons.smg, weapons.shotgun, weapons.ak47, weapons.bat);
  }

  let hpBarFill: THREE.Mesh | undefined;
  if (role !== 'hero') {
    const barBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.11),
      new THREE.MeshBasicMaterial({ color: 0x181412, side: THREE.DoubleSide })
    );
    barBg.position.y = 2.15;
    barBg.name = 'hpBarBg';
    barBg.visible = false;
    hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.075),
      new THREE.MeshBasicMaterial({ color: role === 'police' ? 0x3b82f6 : 0xef4444, side: THREE.DoubleSide })
    );
    hpBarFill.position.set(0, 2.15, 0.01);
    hpBarFill.visible = false;
    group.add(barBg, hpBarFill);
  }

  return {
    group,
    bodyGroup,
    torsoGroup,
    headGroup,
    leftLeg,
    leftKnee,
    leftAnkle,
    rightLeg,
    rightKnee,
    rightAnkle,
    leftArm,
    leftElbow,
    leftHand,
    rightArm,
    rightElbow,
    rightHand,
    rightHandGripAnchor,
    holdAnchor,
    weapons,
    specialAura,
    hpBarFill,
  };
}

export function setRigWeaponVisual(rig: CharacterRig3D, weaponId: WeaponId): void {
  (Object.keys(rig.weapons) as WeaponId[]).forEach((k) => {
    rig.weapons[k].visible = k === weaponId;
  });
}

// ==================== MULTI-PART SEMI-REALISTIC VEHICLES ====================

function createBeveledCarBody(length: number, width: number, lowerH: number, hoodSlope: number, mat: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  const hl = length / 2;
  shape.moveTo(-hl, 0);
  shape.lineTo(hl, 0);
  shape.quadraticCurveTo(hl + 0.1, lowerH * 0.52, hl - 0.14, lowerH * (1 - hoodSlope));
  shape.lineTo(hl * 0.34, lowerH);
  shape.lineTo(-hl + 0.14, lowerH);
  shape.quadraticCurveTo(-hl - 0.06, lowerH * 0.6, -hl, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - 0.2,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.1,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -(width - 0.2) / 2);
  geo.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createDetailedWheel(small = false): THREE.Mesh {
  const tire = new THREE.Mesh(small ? smallTireGeo : tireGeo, tireMat);
  tire.castShadow = true;
  const hub = new THREE.Mesh(rimGeo, alloyMat);
  if (small) hub.scale.setScalar(0.78);
  tire.add(hub);

  // 3 crossing alloy spokes for realistic wheel rim depth
  for (let s = 0; s < 3; s++) {
    const spoke = new THREE.Mesh(spokeGeo, darkMetalMat);
    spoke.rotation.x = (s / 3) * Math.PI;
    if (small) spoke.scale.setScalar(0.76);
    tire.add(spoke);
  }
  return tire;
}

export interface VehicleMesh3D {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  sirenRed?: THREE.Mesh;
  sirenBlue?: THREE.Mesh;
  headlightBeam?: THREE.Mesh;
}

export function createVehicle3D(type: VehicleType, config: VehicleCustomConfig, isCityBus = false): VehicleMesh3D {
  const group = new THREE.Group();
  const wheels: THREE.Mesh[] = [];
  const paint = getPaintJob(config.paintId);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: paint.body,
    roughness: 0.24,
    metalness: 0.48,
    clearcoat: 0.88,
    clearcoatRoughness: 0.14,
  });
  const roofMat = new THREE.MeshPhysicalMaterial({
    color: paint.roof,
    roughness: 0.3,
    metalness: 0.28,
    clearcoat: 0.6,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: paint.trim, roughness: 0.26, metalness: 0.65 });

  const shadow = new THREE.Mesh(shadowDiscGeo, shadowMat);
  shadow.position.y = 0.04;
  group.add(shadow);

  let length = 4.6;
  let width = 2.12;
  let sirenRed: THREE.Mesh | undefined;
  let sirenBlue: THREE.Mesh | undefined;

  const addWheel = (x: number, y: number, z: number, small = false) => {
    const w = createDetailedWheel(small);
    w.position.set(x, y, z);
    group.add(w);
    wheels.push(w);
  };

  if (isCityBus && type === 'truck') {
    // Detailed Urban City Bus for traffic realism
    length = 7.6;
    width = 2.55;
    shadow.scale.set(1.9, 1, 4.1);

    const busLower = createBeveledCarBody(length, width, 1.25, 0.05, bodyMat);
    busLower.position.set(0, 0.42, 0);
    const busUpper = new THREE.Mesh(new THREE.BoxGeometry(width - 0.08, 1.35, length - 0.2), roofMat);
    busUpper.position.set(0, 2.25, 0);
    busUpper.castShadow = true;

    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.02, 0.88, length - 0.65), glassMat);
    sideGlass.position.set(0, 2.25, 0);

    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.28, 1.15, 0.14), glassMat);
    frontGlass.position.set(0, 2.05, length / 2 + 0.02);

    const destSign = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.26, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 1.1 })
    );
    destSign.position.set(0, 2.75, length / 2 + 0.03);

    group.add(busLower, busUpper, sideGlass, frontGlass, destSign);
    [-0.85, 0.85].forEach((hx) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.1), headLightMat);
      h.position.set(hx, 0.82, length / 2 + 0.06);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.1), tailLightMat);
      t.position.set(hx, 0.92, -length / 2 - 0.06);
      group.add(h, t);
    });
    addWheel(-1.26, 0.4, 2.35);
    addWheel(1.26, 0.4, 2.35);
    addWheel(-1.26, 0.4, -2.25);
    addWheel(1.26, 0.4, -2.25);
  } else if (type === 'auto') {
    length = 3.4;
    width = 1.82;
    shadow.scale.set(1.25, 1, 1.95);

    const lower = createBeveledCarBody(3.0, 1.68, 0.7, 0.16, bodyMat);
    lower.position.set(0, 0.34, 0);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.96, 16), bodyMat);
    nose.position.set(0, 0.86, 1.12);
    nose.castShadow = true;

    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.9, 2.35, 16, 1, false, 0, Math.PI), roofMat);
    canopy.rotation.z = Math.PI / 2;
    canopy.rotation.y = Math.PI / 2;
    canopy.scale.set(1, 0.42, 1);
    canopy.position.set(0, 1.9, -0.2);
    canopy.castShadow = true;

    // Frame A-pillars + windshield
    const wind = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.8, 12, 1, true, -0.8, 1.6), glassMat);
    wind.position.set(0, 1.5, 0.76);
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 14), headLightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 0.86, 1.66);

    const mudguard = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12, 1, false, 0, Math.PI), matteTrimMat);
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set(0, 0.36, 1.32);

    // Driver seat cushion + T-handlebar inside Auto cab
    const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.5), matteTrimMat);
    seatCushion.position.set(0, 0.62, 0.18);
    const steerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), darkMetalMat);
    steerCol.rotation.x = 0.28;
    steerCol.position.set(0, 1.05, 0.78);
    const tBar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.68, 8), chromeMat);
    tBar.rotation.z = Math.PI / 2;
    tBar.position.set(0, 1.24, 0.7);

    group.add(lower, nose, canopy, wind, hl, mudguard, seatCushion, steerCol, tBar);
    addWheel(0, 0.3, 1.32, true);
    addWheel(-0.86, 0.3, -0.92, true);
    addWheel(0.86, 0.3, -0.92, true);
  } else if (type === 'bullet') {
    length = 2.55;
    width = 0.98;
    shadow.scale.set(0.82, 1, 1.45);

    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 8, 14), bodyMat);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 1.02, 0.25);
    tank.castShadow = true;
    const seat = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.54, 8, 12), matteTrimMat);
    seat.rotation.x = Math.PI / 2;
    seat.position.set(0, 0.92, -0.42);
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 12), chromeMat);
    engine.position.set(0, 0.63, 0.08);
    const forkL = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), chromeMat);
    forkL.rotation.x = -0.34;
    forkL.position.set(-0.1, 0.82, 0.82);
    const forkR = forkL.clone();
    forkR.position.x = 0.1;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.04, 8), chromeMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.28, 0.64);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.068, 1.4, 10), chromeMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0.24, 0.45, -0.35);
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 12), headLightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 1.1, 1.02);
    const footPegBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8), darkMetalMat);
    footPegBar.rotation.z = Math.PI / 2;
    footPegBar.position.set(0, 0.42, -0.05);

    group.add(tank, seat, engine, forkL, forkR, bar, exhaust, hl, footPegBar);
    addWheel(0, 0.39, 0.94);
    addWheel(0, 0.39, -0.9);
  } else if (type === 'truck') {
    length = 6.9;
    width = 2.62;
    shadow.scale.set(1.85, 1, 3.85);

    const cab = createBeveledCarBody(2.2, 2.44, 2.05, 0.1, trimMat);
    cab.position.set(0, 0.44, 2.15);
    const cargo = createBeveledCarBody(4.45, 2.58, 2.35, 0.02, bodyMat);
    cargo.position.set(0, 0.62, -1.18);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.38, 4.25), roofMat);
    stripe.position.set(0, 1.85, -1.18);
    const wind = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.72, 0.12), glassMat);
    wind.position.set(0, 1.92, 3.2);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.56, 0.1), darkMetalMat);
    grille.position.set(0, 1.05, 3.3);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.24, 0.18), chromeMat);
    bumper.position.set(0, 0.58, 3.34);

    group.add(cab, cargo, stripe, wind, grille, bumper);
    [-0.95, 0.95].forEach((hx) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), headLightMat);
      h.position.set(hx, 0.96, 3.32);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.1), tailLightMat);
      t.position.set(hx, 0.85, -3.45);
      group.add(h, t);
    });
    addWheel(-1.3, 0.4, 2.25);
    addWheel(1.3, 0.4, 2.25);
    addWheel(-1.3, 0.4, -0.68);
    addWheel(1.3, 0.4, -0.68);
    addWheel(-1.3, 0.4, -2.22);
    addWheel(1.3, 0.4, -2.22);
  } else {
    // Semi-realistic Sedan (Ambassador), SUV (Thar), and Police Cruiser
    length = 4.65;
    width = 2.12;
    shadow.scale.set(1.48, 1, 2.65);

    const lower = createBeveledCarBody(length, width, 0.78, type === 'ambassador' ? 0.22 : 0.11, bodyMat);
    lower.position.set(0, 0.34, 0);
    group.add(lower);

    // Sculpted Cabin Greenhouse + recessed dark window frame
    const cabinLen = type === 'thar' ? 2.42 : 2.55;
    const cabin = createBeveledCarBody(cabinLen, width - 0.3, 0.7, 0.16, roofMat);
    cabin.position.set(0, 1.11, -0.26);
    group.add(cabin);

    // Side windows strip (recessed slightly proud on pillars for realistic dark glass framing)
    const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(width - 0.24, 0.52, cabinLen * 0.78), glassMat);
    sideWindows.position.set(0, 1.44, -0.28);
    group.add(sideWindows);

    // B-Pillar divider
    const bPillar = new THREE.Mesh(new THREE.BoxGeometry(width - 0.21, 0.56, 0.14), matteTrimMat);
    bPillar.position.set(0, 1.44, -0.22);
    group.add(bPillar);

    // Front & Rear Sloped Windshields
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.44, 0.58, 0.1), glassMat);
    frontGlass.position.set(0, 1.44, 0.92);
    frontGlass.rotation.x = -0.34;
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(width - 0.44, 0.54, 0.1), glassMat);
    rearGlass.position.set(0, 1.44, -1.42);
    rearGlass.rotation.x = 0.28;
    group.add(frontGlass, rearGlass);

    // Side Wing Mirrors
    [-width / 2 - 0.04, width / 2 + 0.04].forEach((mx) => {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.14), matteTrimMat);
      mirror.position.set(mx, 1.24, 0.65);
      group.add(mirror);
    });

    // Wheel-Arch Fender Flares
    [1.42, -1.42].forEach((wz) => {
      [-width / 2 + 0.01, width / 2 - 0.01].forEach((wx) => {
        const arch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.46, 0.16, 12, 1, false, 0, Math.PI),
          matteTrimMat
        );
        arch.rotation.z = Math.PI / 2;
        arch.rotation.y = Math.PI / 2;
        arch.position.set(wx, 0.42, wz);
        group.add(arch);
      });
    });

    // Front Grille + Bumpers + License Plates
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.3, 0.12), darkMetalMat);
    grille.position.set(0, 0.72, length / 2 + 0.02);
    const frontBump = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 0.2, 0.18), matteTrimMat);
    frontBump.position.set(0, 0.42, length / 2 + 0.06);
    const rearBump = frontBump.clone();
    rearBump.position.z = -length / 2 - 0.06;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.14, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    plate.position.set(0, 0.62, -length / 2 - 0.09);
    group.add(grille, frontBump, rearBump, plate);

    // Headlights + Taillights
    [-0.74, 0.74].forEach((lx) => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.1), headLightMat);
      hl.position.set(lx, 0.82, length / 2 + 0.04);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.15, 0.1), tailLightMat);
      tl.position.set(lx, 0.84, -length / 2 - 0.04);
      group.add(hl, tl);
    });

    if (type === 'ambassador') {
      const taxiBox = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.24), headLightMat);
      taxiBox.position.set(0, 1.9, 0.05);
      group.add(taxiBox);
    } else if (type === 'thar') {
      const spare = createDetailedWheel(false);
      spare.rotation.y = Math.PI / 2;
      spare.position.set(0, 1.02, -length / 2 - 0.18);
      group.add(spare);
      // Roof rack bars
      [-0.65, 0.65].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.9), matteTrimMat);
        rail.position.set(rx, 1.85, -0.25);
        group.add(rail);
      });
    } else if (type === 'police') {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.1, 0.24), darkMetalMat);
      bar.position.set(0, 1.88, 0.02);
      sirenRed = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.12, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.5 })
      );
      sirenRed.position.set(-0.36, 1.94, 0.02);
      sirenBlue = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.12, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 2.5 })
      );
      sirenBlue.position.set(0.36, 1.94, 0.02);
      group.add(bar, sirenRed, sirenBlue);
    }

    // Interior Seat & Steering Wheel (visible through cabin glass)
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 0.14), matteTrimMat);
    seatBack.position.set(0.38, 1.25, -0.38);
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 14), darkMetalMat);
    wheelRim.rotation.x = 0.42;
    wheelRim.position.set(0.38, 1.26, 0.34);
    group.add(seatBack, wheelRim);

    addWheel(-width / 2 - 0.02, 0.39, 1.42);
    addWheel(width / 2 + 0.02, 0.39, 1.42);
    addWheel(-width / 2 - 0.02, 0.39, -1.42);
    addWheel(width / 2 + 0.02, 0.39, -1.42);
  }

  // Headlight Ground/Cone Projection (auto-active at Night / Dusk / Rain / Fog)
  const beamGeo = new THREE.ConeGeometry(2.2, 8.5, 14, 1, true);
  beamGeo.rotateX(-Math.PI / 2);
  const headlightBeam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: 0xfef9c3,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  headlightBeam.position.set(0, 0.65, length / 2 + 4.3);
  headlightBeam.visible = false;
  group.add(headlightBeam);

  // Vehicle Paint Decals (anchored tightly per vehicle body height!)
  if (config.decalId === 'marigold') {
    for (let i = -3; i <= 3; i++) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xf97316 : 0xfacc15, roughness: 0.65 })
      );
      flower.position.set(i * 0.2, 0.96 - Math.abs(i) * 0.04, length / 2 + 0.08);
      group.add(flower);
    }
  } else if (config.decalId === 'tricolor') {
    const stripeLen = type === 'bullet' ? 0.62 : type === 'auto' ? 1.85 : length * 0.62;
    const stripeWidth = type === 'bullet' ? 0.075 : 0.14;
    const stripeSpacing = type === 'bullet' ? 0.085 : 0.16;
    const stripeY =
      type === 'truck' ? 3.04 : type === 'bullet' ? 1.245 : type === 'auto' ? 2.02 : 1.83;
    const stripeZ = type === 'bullet' ? 0.24 : type === 'auto' ? -0.2 : -0.24;
    [0xf97316, 0xffffff, 0x16a34a].forEach((col, idx) => {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(stripeWidth, 0.025, stripeLen),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.38 })
      );
      stripe.position.set((idx - 1) * stripeSpacing, stripeY, stripeZ);
      group.add(stripe);
    });
  } else if (config.decalId === 'horn_ok') {
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(width * 0.68, 1.65), 0.3, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.25 })
    );
    plate.position.set(0, type === 'truck' ? 1.2 : 0.88, -length / 2 - 0.08);
    group.add(plate);
  } else if (config.decalId === 'nazar_battu') {
    const nimbu = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
    nimbu.position.set(0, 0.4, length / 2 + 0.16);
    const mirchi = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x22c55e }));
    mirchi.rotation.x = Math.PI;
    mirchi.position.set(0, 0.22, length / 2 + 0.16);
    group.add(nimbu, mirchi);
  }

  return { group, wheels, sirenRed, sirenBlue, headlightBeam };
}

// ==================== ARCHITECTURAL SEMI-REALISTIC BUILDINGS ====================

const plinthMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.88 });
const balconySlabMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78 });
const railingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.65 });
const hvacMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.55, metalness: 0.45 });
const waterTankMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
const waterTankGeo = new THREE.CylinderGeometry(0.68, 0.68, 1.25, 12);

export function createBuilding3D(b: BuildingRect, maxAnisotropy: number): THREE.Group {
  const g = new THREE.Group();
  const bw = b.w * WORLD_SCALE;
  const bd = b.h * WORLD_SCALE;
  const floorH = b.style === 'industrial' ? 4.4 : 3.55;
  const bh = b.isTemple ? 10.5 : Math.max(5.2, b.floors * floorH);
  const cx = (b.x + b.w / 2) * WORLD_SCALE;
  const cz = (b.y + b.h / 2) * WORLD_SCALE;

  g.position.set(cx, 0, cz);

  // Ground stone plinth step
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.35, 0.45, bd + 0.35), plinthMat);
  plinth.position.y = 0.225;
  plinth.receiveShadow = true;
  g.add(plinth);

  const facadeTex = createBuildingPbrTexture(b.style, b.wallColor, b.awningColor, b.floors, b.label, maxAnisotropy);
  const sideMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    roughness: b.style === 'downtown' ? 0.32 : 0.76,
    metalness: b.style === 'downtown' ? 0.35 : 0.05,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.85 });

  const mainMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [
    sideMat,
    sideMat,
    roofMat,
    roofMat,
    sideMat,
    sideMat,
  ]);
  mainMesh.position.y = bh / 2 + 0.35;
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  g.add(mainMesh);

  // Architectural roof cornice & parapet wall
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(bw + 0.42, 0.42, bd + 0.42),
    b.style === 'downtown' ? hvacMat : plinthMat
  );
  cornice.position.y = bh + 0.56;
  cornice.castShadow = true;
  g.add(cornice);

  // Protruding 3D Concrete Balconies + Railings on Apartment & Residential buildings
  if (b.hasBalconies && bh > 8) {
    const numRows = Math.min(3, b.floors - 1);
    for (let r = 1; r <= numRows; r++) {
      const by = 0.5 + r * floorH;
      if (by > bh - 1.2) break;
      const balcW = Math.min(bw * 0.52, 6.2);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(balcW, 0.18, 1.15), balconySlabMat);
      slab.position.set(0, by, bd / 2 + 0.55);
      slab.castShadow = true;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(balcW, 0.65, 0.08), railingMat);
      rail.position.set(0, by + 0.38, bd / 2 + 1.08);
      g.add(slab, rail);
    }
  }

  // Commercial shop awning overhang for Market / Service storefronts
  if ((b.style === 'market' || b.style === 'service') && !b.isTemple) {
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(bw * 0.78, 0.2, 1.5),
      new THREE.MeshStandardMaterial({ color: b.awningColor, roughness: 0.65 })
    );
    awning.position.set(0, 3.6, bd / 2 + 0.7);
    awning.rotation.x = 0.18;
    awning.castShadow = true;
    g.add(awning);
  }

  // Rooftop details: HVAC chillers, stairwell bulkhead, helipad or water tank
  if (b.style === 'downtown') {
    const mech = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.4, 1.6, bd * 0.35), hvacMat);
    mech.position.set(-bw * 0.18, bh + 1.5, -bd * 0.15);
    mech.castShadow = true;
    g.add(mech);
    if (b.hasHelipad) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 2.8, 0.14, 20),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
      );
      pad.position.set(bw * 0.15, bh + 0.85, bd * 0.12);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.9, 2.2, 20),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(bw * 0.15, bh + 0.94, bd * 0.12);
      g.add(pad, ring);
    }
  } else if (b.hasWaterTank) {
    const tank = new THREE.Mesh(waterTankGeo, waterTankMat);
    tank.position.set(bw * 0.24, bh + 1.4, -bd * 0.24);
    g.add(tank);
  }

  if (b.isTemple) {
    const templeGold = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.32, metalness: 0.7 });
    const stoneStep = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.68, 2.2, bd * 0.68), plinthMat);
    stoneStep.position.y = bh + 1.5;
    const spire = new THREE.Mesh(new THREE.ConeGeometry(4.2, 7.6, 8), templeGold);
    spire.position.y = bh + 6.2;
    spire.castShadow = true;
    const kalash = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 12), templeGold);
    kalash.position.y = bh + 10.2;
    g.add(stoneStep, spire, kalash);
  }

  return g;
}

// ==================== PETROL STATION, PARK GAZEBO, BUS STOP, SIGNS, TREES ====================

export function createPetrolStation3D(name: string): THREE.Group {
  const g = new THREE.Group();
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const brandMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xc2410c,
    emissiveIntensity: 0.45,
    roughness: 0.38,
  });

  // Elevated Concrete Forecourt Pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.16, 10.5), plinthMat);
  pad.position.y = 0.08;
  pad.receiveShadow = true;
  g.add(pad);

  // Canopy Roof + Brand Fascia
  const roof = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.65, 9.2), canopyMat);
  roof.position.y = 5.2;
  roof.castShadow = true;
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.55, 9.4), brandMat);
  fascia.position.y = 5.55;
  g.add(roof, fascia);

  // 4 Steel Columns + Fuel Dispenser Islands
  const colGeo = new THREE.CylinderGeometry(0.24, 0.28, 5.1, 10);
  const pumpGeo = new THREE.BoxGeometry(0.95, 1.85, 0.55);
  const pumpMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.4 });
  [-4.2, 4.2].forEach((px) => {
    [-2.4, 2.4].forEach((pz) => {
      const col = new THREE.Mesh(colGeo, alloyMat);
      col.position.set(px, 2.6, pz);
      col.castShadow = true;
      g.add(col);
    });
    const island = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 1.2), plinthMat);
    island.position.set(px, 0.24, 0);
    const pump = new THREE.Mesh(pumpGeo, pumpMat);
    pump.position.set(px, 1.25, 0);
    pump.castShadow = true;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.35),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    screen.position.set(px, 1.65, 0.29);
    g.add(island, pump, screen);
  });

  const sign = createNameplateSprite(name.toUpperCase(), '#fb923c');
  sign.position.set(0, 6.8, 0);
  g.add(sign);
  return g;
}

export function createParkGazebo3D(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.8, 0.55, 8), plinthMat);
  base.position.y = 0.28;
  base.receiveShadow = true;
  g.add(base);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 8), woodMat);
    post.position.set(Math.cos(a) * 3.6, 2.0, Math.sin(a) * 3.6);
    post.castShadow = true;
    g.add(post);
  }
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4.8, 2.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 })
  );
  roof.position.y = 4.8;
  roof.castShadow = true;
  g.add(roof);
  return g;
}

export function createBusShelter3D(): THREE.Group {
  const g = new THREE.Group();
  const frameMat = darkMetalMat;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 2.1), frameMat);
  roof.position.set(0, 2.75, 0);
  roof.castShadow = true;
  const backGlass = new THREE.Mesh(new THREE.BoxGeometry(4.9, 2.4, 0.08), glassMat);
  backGlass.position.set(0, 1.4, -0.9);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.6), alloyMat);
  bench.position.set(0, 0.55, -0.45);
  [-2.3, 2.3].forEach((px) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8), frameMat);
    p.position.set(px, 1.35, -0.9);
    g.add(p);
  });
  g.add(roof, backGlass, bench);
  return g;
}

export function createRoadSign3D(kind: 'speed50' | 'stop' | 'crossing' | 'fuel'): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.1, 8), alloyMat);
  post.position.y = 1.55;
  post.castShadow = true;
  const color = kind === 'stop' ? 0xdc2626 : kind === 'fuel' ? 0x0284c7 : kind === 'crossing' ? 0xeab308 : 0xf8fafc;
  const board = new THREE.Mesh(
    kind === 'stop' ? new THREE.CylinderGeometry(0.45, 0.45, 0.06, 8) : new THREE.CylinderGeometry(0.42, 0.42, 0.06, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 })
  );
  board.rotation.x = Math.PI / 2;
  board.position.set(0, 2.85, 0);
  g.add(post, board);
  return g;
}

export function createUtilityPole3D(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 7.6, 8), plinthMat);
  pole.position.y = 3.8;
  pole.castShadow = true;
  const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), darkMetalMat);
  cross.position.y = 7.2;
  g.add(pole, cross);
  return g;
}

export function createGarbageBin3D(): THREE.Group {
  const g = new THREE.Group();
  const bin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.3, 0.92, 10),
    new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.55, metalness: 0.2 })
  );
  bin.position.y = 0.46;
  bin.castShadow = true;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.12, 10), darkMetalMat);
  lid.position.y = 0.96;
  g.add(bin, lid);
  return g;
}

export function createVendorCart3D(colorHex: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.9, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 })
  );
  body.position.y = 0.72;
  body.castShadow = true;
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.15, 1.5),
    new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.6 })
  );
  roof.position.y = 2.3;
  [-0.95, 0.95].forEach((px) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), darkMetalMat);
    p.position.set(px, 1.65, -0.45);
    const w = createDetailedWheel(true);
    w.position.set(px, 0.3, 0.55);
    g.add(p, w);
  });
  g.add(body, roof);
  return g;
}

// ==================== REALISTIC BRANCHING TREES (BARK + LAYERED FOLIAGE) ====================

let sharedBarkMat: THREE.MeshStandardMaterial | null = null;
let sharedLeafMat: THREE.MeshStandardMaterial | null = null;

function getTreeMaterials(maxAnisotropy = 4) {
  if (!sharedBarkMat) {
    sharedBarkMat = new THREE.MeshStandardMaterial({
      map: createBarkTexture(maxAnisotropy),
      roughness: 0.92,
    });
  }
  if (!sharedLeafMat) {
    sharedLeafMat = new THREE.MeshStandardMaterial({
      map: createLeafClusterTexture(maxAnisotropy),
      alphaTest: 0.38,
      side: THREE.DoubleSide,
      roughness: 0.78,
    });
  }
  return { barkMat: sharedBarkMat, leafMat: sharedLeafMat };
}

export function createTree3D(kind: 'palm' | 'banyan' | 'neem', scaleVar = 1, maxAniso = 4): THREE.Group {
  const g = new THREE.Group();
  const { barkMat, leafMat } = getTreeMaterials(maxAniso);

  if (kind === 'palm') {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.28, 2.8, 0.1),
      new THREE.Vector3(0.45, 5.6, 0.18),
      new THREE.Vector3(0.32, 8.1, 0.08),
    ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.22, 8, false), barkMat);
    trunk.castShadow = true;
    g.add(trunk);

    const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x2f5e28, roughness: 0.74, side: THREE.DoubleSide });
    const frondGeo = new THREE.PlaneGeometry(0.9, 3.2, 2, 4);
    frondGeo.translate(0, 1.5, 0);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const frond = new THREE.Mesh(frondGeo, palmLeafMat);
      frond.position.set(0.32, 8.0, 0.08);
      frond.rotation.y = ang;
      frond.rotation.x = 1.15 + (i % 2) * 0.22;
      frond.castShadow = true;
      g.add(frond);
    }
  } else {
    // Realistic branching Neem / Banyan with multi-plane organic leaf cards (zero lollipop balls!)
    const h = kind === 'banyan' ? 3.8 : 3.4;
    const rBot = kind === 'banyan' ? 0.58 : 0.36;
    const rTop = kind === 'banyan' ? 0.34 : 0.22;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, 10), barkMat);
    trunk.position.y = h * 0.5;
    trunk.castShadow = true;
    g.add(trunk);

    // 3 diverging woody limbs
    const limbGeo = new THREE.CylinderGeometry(0.1, 0.18, 2.6, 8);
    const crownRadius = kind === 'banyan' ? 2.8 : 2.2;
    for (let b = 0; b < 3; b++) {
      const ang = (b / 3) * Math.PI * 2 + 0.4;
      const limb = new THREE.Mesh(limbGeo, barkMat);
      limb.position.set(Math.cos(ang) * 0.7, h + 0.65, Math.sin(ang) * 0.7);
      limb.rotation.z = -Math.cos(ang) * 0.55;
      limb.rotation.x = Math.sin(ang) * 0.55;
      limb.castShadow = true;
      g.add(limb);

      // Crossed foliage canopy cards at limb tips
      for (let p = 0; p < 2; p++) {
        const card = new THREE.Mesh(new THREE.PlaneGeometry(crownRadius * 1.45, crownRadius * 1.25), leafMat);
        card.position.set(Math.cos(ang) * 1.35, h + 1.55 + p * 0.4, Math.sin(ang) * 1.35);
        card.rotation.y = ang + p * (Math.PI / 2);
        card.rotation.x = (p === 0 ? 0.35 : -0.25);
        card.castShadow = true;
        g.add(card);
      }
    }

    // Upper central canopy crossed cards
    const topCardA = new THREE.Mesh(new THREE.PlaneGeometry(crownRadius * 1.75, crownRadius * 1.45), leafMat);
    topCardA.position.y = h + 2.35;
    topCardA.rotation.x = 0.22;
    const topCardB = topCardA.clone();
    topCardB.rotation.y = Math.PI / 2;
    const topFlat = new THREE.Mesh(new THREE.PlaneGeometry(crownRadius * 1.6, crownRadius * 1.6), leafMat);
    topFlat.rotation.x = -Math.PI / 2;
    topFlat.position.y = h + 2.15;
    g.add(topCardA, topCardB, topFlat);
  }

  g.scale.setScalar(scaleVar);
  return g;
}

// ==================== CITY DETAILS: STUNT RAMPS, ATMS, STALLS, TRAFFIC LIGHTS, CLOUDS ====================

export function createStuntRamp3D(): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-4.0, 0);
  shape.lineTo(4.0, 0);
  shape.lineTo(4.0, 2.3);
  shape.lineTo(-4.0, 0.12);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 4.4,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -2.2);
  geo.rotateY(-Math.PI / 2);

  const rampMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72, metalness: 0.35 });
  const mesh = new THREE.Mesh(geo, rampMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.75,
  });
  for (let i = -2; i <= 2; i += 2) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.48), stripeMat);
    bar.position.set(0, 1.15 + i * 0.27, i * 1.0);
    bar.rotation.x = -0.27;
    g.add(bar);
  }
  return g;
}

export function createAtmMachine3D(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 2.4, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.35, metalness: 0.45 })
  );
  body.position.y = 1.2;
  body.castShadow = true;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.65),
    new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.5 })
  );
  screen.position.set(0, 1.55, 0.56);

  const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.28), chromeMat);
  keypad.position.set(0, 1.02, 0.58);

  const header = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.38, 1.18),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.5 })
  );
  header.position.y = 2.48;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.75, 24),
    new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.09;

  g.add(body, screen, keypad, header, ring);
  return g;
}

export function createStreetStall3D(kind: 'chai' | 'arms'): THREE.Group {
  const g = new THREE.Group();
  const counterColor = kind === 'chai' ? 0x92400e : 0x1e293b;
  const canopyColor = kind === 'chai' ? 0xc2410c : 0x0369a1;

  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.15, 1.6),
    new THREE.MeshStandardMaterial({ color: counterColor, roughness: 0.68 })
  );
  counter.position.y = 0.58;
  counter.castShadow = true;

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8);
  [
    [-1.45, 1.35, -0.68],
    [1.45, 1.35, -0.68],
    [-1.45, 1.35, 0.68],
    [1.45, 1.35, 0.68],
  ].forEach(([px, py, pz]) => {
    const p = new THREE.Mesh(poleGeo, darkMetalMat);
    p.position.set(px, py, pz);
    g.add(p);
  });

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.25, 2.1),
    new THREE.MeshStandardMaterial({ color: canopyColor, roughness: 0.55 })
  );
  roof.position.y = 2.75;
  roof.rotation.x = 0.08;
  roof.castShadow = true;

  if (kind === 'chai') {
    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.45, 12), chromeMat);
    kettle.position.set(-0.6, 1.38, 0);
    const samosaTray = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.14, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.3 })
    );
    samosaTray.position.set(0.65, 1.24, 0.1);
    g.add(kettle, samosaTray);
  } else {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.75, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0284c7, emissiveIntensity: 0.45 })
    );
    rack.position.set(0, 1.85, -0.6);
    g.add(rack);
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.6, 26),
    new THREE.MeshBasicMaterial({
      color: kind === 'chai' ? 0xf59e0b : 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.09;

  g.add(counter, roof, ring);
  return g;
}

export interface TrafficLight3D {
  group: THREE.Group;
  redMat: THREE.MeshStandardMaterial;
  amberMat: THREE.MeshStandardMaterial;
  greenMat: THREE.MeshStandardMaterial;
}

export function createTrafficLight3D(): TrafficLight3D {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 6.2, 10), darkMetalMat);
  pole.position.y = 3.1;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 8), darkMetalMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(1.7, 5.9, 0);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.45), darkMetalMat);
  housing.position.set(3.2, 5.5, 0);

  const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 });
  const amberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.2 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.2 });

  const bulbGeo = new THREE.SphereGeometry(0.14, 10, 10);
  const rMesh = new THREE.Mesh(bulbGeo, redMat);
  rMesh.position.set(3.2, 5.88, 0.22);
  const aMesh = new THREE.Mesh(bulbGeo, amberMat);
  aMesh.position.set(3.2, 5.5, 0.22);
  const gMesh = new THREE.Mesh(bulbGeo, greenMat);
  gMesh.position.set(3.2, 5.12, 0.22);

  group.add(pole, arm, housing, rMesh, aMesh, gMesh);
  return { group, redMat, amberMat, greenMat };
}

export function createBench3D(): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.65), wood);
  seat.position.y = 0.55;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 0.1), wood);
  back.position.set(0, 0.9, -0.28);
  back.rotation.x = -0.15;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.55), darkMetalMat);
  legL.position.set(-0.85, 0.27, 0);
  const legR = legL.clone();
  legR.position.x = 0.85;
  g.add(seat, back, legL, legR);
  return g;
}

export function createCloudCluster3D(): { group: THREE.Group; mat: THREE.MeshBasicMaterial } {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.68, fog: false });
  [
    [0, 0, 0, 14],
    [12, -1.6, 2.5, 10],
    [-13, -2, -1.5, 9.5],
    [5, 2.5, -3.5, 9],
  ].forEach(([cx, cy, cz, r]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    puff.scale.set(1.6, 0.48, 1.05);
    puff.position.set(cx, cy, cz);
    group.add(puff);
  });
  return { group, mat };
}

export function createStreetLamp3D(): { group: THREE.Group; bulbMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 6.4, 8), alloyMat);
  pole.position.y = 3.2;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.6, 8), alloyMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.75, 6.25, 0);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
  });
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.32), darkMetalMat);
  housing.position.set(1.45, 6.24, 0);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.24), bulbMat);
  bulb.position.set(1.45, 6.14, 0);
  group.add(pole, arm, housing, bulb);
  return { group, bulbMat };
}

export type PropKind = 'barrel' | 'crate' | 'cone' | 'tire';

export function createGrabbableProp3D(kind: PropKind): THREE.Group {
  const g = new THREE.Group();
  const sh = new THREE.Mesh(shadowDiscGeo, shadowMat);
  sh.scale.setScalar(0.55);
  sh.position.y = 0.03;
  g.add(sh);

  if (kind === 'barrel') {
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 1.15, 16),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.38, metalness: 0.55 })
    );
    cyl.position.y = 0.58;
    cyl.castShadow = true;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.42 })
    );
    band.position.y = 0.6;
    g.add(cyl, band);
  } else if (kind === 'crate') {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.85, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 })
    );
    crate.position.y = 0.43;
    crate.castShadow = true;
    g.add(crate);
  } else if (kind === 'cone') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.08, 12), darkMetalMat);
    base.position.y = 0.04;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.82, 12),
      new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.42 })
    );
    cone.position.y = 0.45;
    cone.castShadow = true;
    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xffffff, emissiveIntensity: 0.2 })
    );
    stripe.position.y = 0.5;
    g.add(base, cone, stripe);
  } else {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.16, 10, 18), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.y = 0.18;
    tire.castShadow = true;
    g.add(tire);
  }
  return g;
}

export function createDroppedWeapon3D(weaponId: WeaponId): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.8, 20),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.09;
  g.add(ring);

  const wMap = buildWeaponMeshes('motu', false);
  const gun = wMap[weaponId];
  gun.visible = true;
  gun.position.set(0, 0.68, 0);
  gun.scale.setScalar(1.45);
  g.add(gun);
  return g;
}

export function createPickup3D(kind: 'samosa' | 'cash' | 'chai'): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'samosa') {
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.88, 3),
      new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xb45309, emissiveIntensity: 0.4, roughness: 0.45 })
    );
    mesh.position.y = 0.85;
    g.add(mesh);
  } else if (kind === 'cash') {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.36, 0.44),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x15803d, emissiveIntensity: 0.4, roughness: 0.38 })
    );
    mesh.position.y = 0.85;
    g.add(mesh);
  } else {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.25, 0.7, 14),
      new THREE.MeshStandardMaterial({ color: 0xb45309, emissive: 0x9a3412, emissiveIntensity: 0.35, roughness: 0.55 })
    );
    cup.position.y = 0.85;
    g.add(cup);
  }
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.78, 20),
    new THREE.MeshBasicMaterial({ color: kind === 'cash' ? 0x4ade80 : 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  g.add(ring);
  return g;
}

export function createEasterEgg3D(): THREE.Group {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    metalness: 0.85,
    roughness: 0.18,
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), goldMat);
  gem.position.y = 1.35;
  gem.scale.set(1.05, 1.35, 1.05);
  g.add(gem);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.065, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
  );
  halo.position.y = 1.35;
  g.add(halo);

  const baseRing = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.35, 24),
    new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
  );
  baseRing.rotation.x = -Math.PI / 2;
  baseRing.position.y = 0.12;
  g.add(baseRing);
  return g;
}

export function createMuzzleFlash3D(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), mat);
  core.scale.set(0.85, 0.85, 2.2);
  g.add(core);
  const spark = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.65, 6),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  spark.rotation.x = Math.PI / 2;
  spark.position.z = 0.25;
  g.add(spark);
  g.visible = false;
  return g;
}
