import * as THREE from 'three';
import { EmoteId, VehicleType, WeaponId } from '../shared/types';
import { CharacterRig3D, HandRig3D } from './models3d';

export type HandPoseName =
  | 'relaxed'
  | 'fist'
  | 'grip_gun'
  | 'grip_rifle'
  | 'grip_bat'
  | 'grip_bar'
  | 'grip_wheel'
  | 'open_wave'
  | 'point'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'salute'
  | 'namaste'
  | 'clap';

export type NpcSocialBehavior = 'wander' | 'sit' | 'chat' | 'wave' | 'laugh';

export interface HumanAnimParams {
  dt: number;
  elapsed: number;
  walking: boolean;
  speedRatio: number; // 0..1+
  sprinting: boolean;
  crouching: boolean;
  inAir: boolean;
  groundVelY: number;
  aiming: boolean;
  firingSwing: number;
  reloadTimer: number;
  recoilKick: number;
  weaponId: WeaponId | null;
  holdingProp: boolean;
  stumbleTimer: number;
  specialActive: boolean;
  inVehicleType: VehicleType | null;
  vehicleSteer: number;
  vehicleRoll: number;
  sittingBench: boolean;
  emote: EmoteId | null;
  emoteTime: number;
  isNpc?: boolean;
  npcBehavior?: NpcSocialBehavior;
  lodNear?: boolean;
  camPitch?: number;
}

const damp = THREE.MathUtils.damp;

function setFingerCurl(
  base: THREE.Group,
  tip: THREE.Group,
  sign: number,
  baseAngle: number,
  tipAngle: number,
  spreadZ: number,
  lambda: number,
  dt: number
): void {
  base.rotation.z = damp(base.rotation.z, sign * baseAngle, lambda, dt);
  base.rotation.x = damp(base.rotation.x, spreadZ, lambda, dt);
  tip.rotation.z = damp(tip.rotation.z, sign * tipAngle, lambda, dt);
}

/**
 * Smoothly articulates all 5 individual human fingers (thumb + index/middle/ring/pinky)
 * for gripping guns, handlebars, steering wheels, waving, pointing, thumbs up, and fists.
 */
export function applyHandPose(
  hand: HandRig3D,
  isRight: boolean,
  pose: HandPoseName,
  dt: number
): void {
  // Inner palm faces -X on right hand (curl = negative rz) and +X on left hand (curl = positive rz)
  const s = isRight ? -1 : 1;
  const lambda = 16;

  let tRx = -0.35;
  let tRz = isRight ? -0.22 : 0.22;
  let tTipRz = s * 0.2;

  let iB = 0.22;
  let iT = 0.25;
  let mB = 0.26;
  let mT = 0.28;
  let rB = 0.3;
  let rT = 0.32;
  let pB = 0.34;
  let pT = 0.36;

  let spI = 0.04;
  let spM = 0.01;
  let spR = -0.02;
  let spP = -0.05;

  switch (pose) {
    case 'relaxed':
      // Natural slightly curved resting fingers
      iB = 0.22; iT = 0.24;
      mB = 0.26; mT = 0.28;
      rB = 0.31; rT = 0.33;
      pB = 0.36; pT = 0.38;
      break;

    case 'fist':
      iB = 1.25; iT = 1.15;
      mB = 1.28; mT = 1.18;
      rB = 1.28; rT = 1.18;
      pB = 1.25; pT = 1.15;
      tRx = -0.58;
      tRz = isRight ? -0.75 : 0.75;
      tTipRz = s * 0.65;
      spI = spM = spR = spP = 0;
      break;

    case 'grip_gun':
      // Index finger poised on trigger, other fingers curled firmly around pistol grip
      iB = 0.58; iT = 0.68;
      mB = 1.18; mT = 1.05;
      rB = 1.22; rT = 1.1;
      pB = 1.2; pT = 1.08;
      tRx = -0.45;
      tRz = isRight ? -0.55 : 0.55;
      tTipRz = s * 0.45;
      spI = 0.02; spM = 0; spR = 0; spP = 0;
      break;

    case 'grip_rifle':
      if (isRight) {
        iB = 0.56; iT = 0.65;
        mB = 1.18; mT = 1.05;
        rB = 1.22; rT = 1.1;
        pB = 1.2; pT = 1.08;
        tRx = -0.48;
        tRz = -0.58;
      } else {
        // Left hand cradles foregrip/handguard
        iB = 0.78; iT = 0.75;
        mB = 0.85; mT = 0.82;
        rB = 0.88; rT = 0.84;
        pB = 0.9; pT = 0.85;
        tRx = -0.72;
        tRz = 0.38;
      }
      break;

    case 'grip_bat':
    case 'grip_bar':
    case 'grip_wheel':
      iB = 1.05; iT = 0.96;
      mB = 1.08; mT = 0.98;
      rB = 1.1; rT = 1.0;
      pB = 1.08; pT = 0.98;
      tRx = -0.55;
      tRz = isRight ? -0.62 : 0.62;
      tTipRz = s * 0.52;
      spI = spM = spR = spP = 0;
      break;

    case 'open_wave':
      iB = 0.06; iT = 0.08;
      mB = 0.05; mT = 0.06;
      rB = 0.07; rT = 0.08;
      pB = 0.1; pT = 0.12;
      tRx = -0.78;
      tRz = isRight ? 0.15 : -0.15;
      tTipRz = s * 0.06;
      spI = 0.14; spM = 0.03; spR = -0.06; spP = -0.16;
      break;

    case 'point':
      iB = 0.04; iT = 0.04;
      mB = 1.22; mT = 1.12;
      rB = 1.26; rT = 1.15;
      pB = 1.24; pT = 1.12;
      tRx = -0.62;
      tRz = isRight ? -0.68 : 0.68;
      tTipRz = s * 0.45;
      spI = 0.04; spM = spR = spP = 0;
      break;

    case 'thumbs_up':
    case 'thumbs_down':
      iB = 1.24; iT = 1.14;
      mB = 1.28; mT = 1.18;
      rB = 1.28; rT = 1.18;
      pB = 1.25; pT = 1.15;
      // Extend thumb cleanly perpendicular along +Z (which points straight up/down via wrist roll)
      tRx = -1.52;
      tRz = isRight ? 0.14 : -0.14;
      tTipRz = s * 0.04;
      spI = spM = spR = spP = 0;
      break;

    case 'salute':
    case 'namaste':
    case 'clap':
      // Straight flat fingers pressed together
      iB = 0.03; iT = 0.04;
      mB = 0.03; mT = 0.04;
      rB = 0.04; rT = 0.05;
      pB = 0.05; pT = 0.06;
      tRx = -0.25;
      tRz = isRight ? -0.18 : 0.18;
      tTipRz = s * 0.08;
      spI = spM = spR = spP = 0;
      break;
  }

  hand.thumbBase.rotation.x = damp(hand.thumbBase.rotation.x, tRx, lambda, dt);
  hand.thumbBase.rotation.z = damp(hand.thumbBase.rotation.z, tRz, lambda, dt);
  hand.thumbTip.rotation.z = damp(hand.thumbTip.rotation.z, tTipRz, lambda, dt);

  setFingerCurl(hand.indexBase, hand.indexTip, s, iB, iT, spI, lambda, dt);
  setFingerCurl(hand.middleBase, hand.middleTip, s, mB, mT, spM, lambda, dt);
  setFingerCurl(hand.ringBase, hand.ringTip, s, rB, rT, spR, lambda, dt);
  setFingerCurl(hand.pinkyBase, hand.pinkyTip, s, pB, pT, spP, lambda, dt);
}

/**
 * Analytical 2-Bone Arm Solver helper so arms reach handlebars, steering wheels,
 * foregrips, and targets cleanly without snapping.
 */
export function solveTwoBoneArm(
  shoulder: THREE.Group,
  elbow: THREE.Group,
  targetShoulderRx: number,
  targetShoulderRy: number,
  targetShoulderRz: number,
  targetElbowRx: number,
  lambda: number,
  dt: number
): void {
  shoulder.rotation.x = damp(shoulder.rotation.x, targetShoulderRx, lambda, dt);
  shoulder.rotation.y = damp(shoulder.rotation.y, targetShoulderRy, lambda, dt);
  shoulder.rotation.z = damp(shoulder.rotation.z, targetShoulderRz, lambda, dt);
  elbow.rotation.x = damp(elbow.rotation.x, Math.min(0, targetElbowRx), lambda, dt);
}

/**
 * Full-body procedural human skeleton + hand + ankle animation controller.
 * Drives locomotion, combat aiming, vehicle driving postures, bench sitting,
 * NPC social behaviors, and all 18 expressive gestures/emotes smoothly at 60fps.
 */
export function animateHumanRig(rig: CharacterRig3D, p: HumanAnimParams): void {
  const dt = Math.min(0.05, Math.max(0.001, p.dt));
  const t = p.elapsed;
  const near = p.lodNear !== false;

  // Aura ring rotation if Hero Special is active
  rig.specialAura.visible = p.specialActive;
  if (p.specialActive) {
    rig.specialAura.rotation.z += dt * 4.2;
  }

  // ==================== 1. VEHICLE DRIVING / RIDING POSTURES ====================
  if (p.inVehicleType) {
    rig.bodyGroup.rotation.set(0, 0, 0);
    rig.torsoGroup.scale.y = 1;
    const steer = Math.max(-1, Math.min(1, p.vehicleSteer));

    if (p.inVehicleType === 'bullet') {
      // Natural motorcycle straddle posture on saddle, forward lean & grip on chrome handlebars
      rig.bodyGroup.position.x = damp(rig.bodyGroup.position.x, 0, 14, dt);
      rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, -0.02, 14, dt);
      rig.bodyGroup.position.z = damp(rig.bodyGroup.position.z, -0.34, 14, dt);

      rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.28, 12, dt);
      rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, steer * 0.14, 12, dt);
      rig.torsoGroup.rotation.z = damp(rig.torsoGroup.rotation.z, -steer * 0.12, 12, dt);

      rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, -0.22, 12, dt);
      rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, -steer * 0.22, 12, dt);
      rig.headGroup.rotation.z = damp(rig.headGroup.rotation.z, 0, 12, dt);

      // Straddling tank & engine block onto footpegs
      rig.leftLeg.rotation.set(damp(rig.leftLeg.rotation.x, -0.82, 14, dt), 0.14, damp(rig.leftLeg.rotation.z, -0.26, 14, dt));
      rig.rightLeg.rotation.set(damp(rig.rightLeg.rotation.x, -0.82, 14, dt), -0.14, damp(rig.rightLeg.rotation.z, 0.26, 14, dt));
      rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, 1.18, 14, dt);
      rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, 1.18, 14, dt);
      rig.leftAnkle.rotation.x = damp(rig.leftAnkle.rotation.x, -0.25, 14, dt);
      rig.rightAnkle.rotation.x = damp(rig.rightAnkle.rotation.x, -0.25, 14, dt);

      // Hands reach wide handlebar (y=1.28, z=0.64) shifting with steering angle
      const lBarPitch = -1.24 + steer * 0.14;
      const rBarPitch = -1.24 - steer * 0.14;
      solveTwoBoneArm(rig.leftArm, rig.leftElbow, lBarPitch, 0.15, -0.26, -0.34, 14, dt);
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, rBarPitch, -0.15, 0.26, -0.34, 14, dt);
      rig.leftHand.wrist.rotation.set(0, 0.45, 0);
      rig.rightHand.wrist.rotation.set(0, -0.45, 0);
      if (near) {
        applyHandPose(rig.leftHand, false, 'grip_bar', dt);
        applyHandPose(rig.rightHand, true, 'grip_bar', dt);
      }
      return;
    }

    if (p.inVehicleType === 'auto') {
      // Auto-Rickshaw driver seated centrally on front bench below canopy, gripping T-handlebar
      rig.bodyGroup.position.x = damp(rig.bodyGroup.position.x, 0, 14, dt);
      rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, -0.26, 14, dt);
      rig.bodyGroup.position.z = damp(rig.bodyGroup.position.z, 0.18, 14, dt);

      rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.08, 12, dt);
      rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, steer * 0.1, 12, dt);
      rig.torsoGroup.rotation.z = damp(rig.torsoGroup.rotation.z, 0, 12, dt);
      rig.headGroup.rotation.set(damp(rig.headGroup.rotation.x, -0.04, 12, dt), damp(rig.headGroup.rotation.y, -steer * 0.18, 12, dt), 0);

      rig.leftLeg.rotation.set(damp(rig.leftLeg.rotation.x, -1.32, 14, dt), 0, damp(rig.leftLeg.rotation.z, -0.12, 14, dt));
      rig.rightLeg.rotation.set(damp(rig.rightLeg.rotation.x, -1.32, 14, dt), 0, damp(rig.rightLeg.rotation.z, 0.12, 14, dt));
      rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, 1.38, 14, dt);
      rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, 1.38, 14, dt);
      rig.leftAnkle.rotation.x = damp(rig.leftAnkle.rotation.x, 0.05, 14, dt);
      rig.rightAnkle.rotation.x = damp(rig.rightAnkle.rotation.x, 0.05, 14, dt);

      solveTwoBoneArm(rig.leftArm, rig.leftElbow, -0.92 + steer * 0.16, 0.1, -0.14, -0.62, 14, dt);
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.92 - steer * 0.16, -0.1, 0.14, -0.62, 14, dt);
      rig.leftHand.wrist.rotation.set(0, 0.4, 0);
      rig.rightHand.wrist.rotation.set(0, -0.4, 0);
      if (near) {
        applyHandPose(rig.leftHand, false, 'grip_bar', dt);
        applyHandPose(rig.rightHand, true, 'grip_bar', dt);
      }
      return;
    }

    // Closed-cab cars / SUV / Police / Truck: Seated inside driver seat gripping steering wheel
    const isTruck = p.inVehicleType === 'truck';
    const seatX = isTruck ? 0.52 : 0.36;
    const seatY = isTruck ? 0.32 : -0.12;
    const seatZ = isTruck ? 2.05 : -0.18;

    rig.bodyGroup.position.x = damp(rig.bodyGroup.position.x, seatX, 16, dt);
    rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, seatY, 16, dt);
    rig.bodyGroup.position.z = damp(rig.bodyGroup.position.z, seatZ, 16, dt);

    rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, -0.08, 12, dt);
    rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, 0, 12, dt);
    rig.torsoGroup.rotation.z = damp(rig.torsoGroup.rotation.z, -steer * 0.06, 12, dt);
    rig.headGroup.rotation.set(0.02, damp(rig.headGroup.rotation.y, -steer * 0.18, 12, dt), 0);

    rig.leftLeg.rotation.set(damp(rig.leftLeg.rotation.x, -1.42, 14, dt), 0, damp(rig.leftLeg.rotation.z, -0.05, 14, dt));
    rig.rightLeg.rotation.set(damp(rig.rightLeg.rotation.x, -1.42, 14, dt), 0, damp(rig.rightLeg.rotation.z, 0.05, 14, dt));
    rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, 1.38, 14, dt);
    rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, 1.38, 14, dt);
    rig.leftAnkle.rotation.x = damp(rig.leftAnkle.rotation.x, -0.1, 14, dt);
    rig.rightAnkle.rotation.x = damp(rig.rightAnkle.rotation.x, -0.1, 14, dt);

    solveTwoBoneArm(rig.leftArm, rig.leftElbow, -0.95 + steer * 0.16, 0.25, 0.12, -0.58, 14, dt);
    solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.95 - steer * 0.16, -0.25, -0.12, -0.58, 14, dt);
    rig.leftHand.wrist.rotation.set(0, 0.6, 0);
    rig.rightHand.wrist.rotation.set(0, -0.6, 0);
    if (near) {
      applyHandPose(rig.leftHand, false, 'grip_wheel', dt);
      applyHandPose(rig.rightHand, true, 'grip_wheel', dt);
    }
    return;
  }

  // ==================== 2. SITTING ON BENCH POSTURE ====================
  if (p.sittingBench) {
    rig.bodyGroup.position.x = damp(rig.bodyGroup.position.x, 0, 14, dt);
    rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, -0.34, 14, dt);
    rig.bodyGroup.position.z = damp(rig.bodyGroup.position.z, 0.04, 14, dt);
    rig.bodyGroup.rotation.z = damp(rig.bodyGroup.rotation.z, 0, 12, dt);

    rig.torsoGroup.scale.y = 1 + Math.sin(t * 2.1) * 0.014;
    rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, -0.06, 10, dt);
    rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, Math.sin(t * 0.55) * 0.06, 8, dt);
    rig.torsoGroup.rotation.z = damp(rig.torsoGroup.rotation.z, 0, 10, dt);

    rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, 0.04 + Math.sin(t * 0.9) * 0.03, 8, dt);
    rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, Math.sin(t * 0.65) * 0.18, 8, dt);
    rig.headGroup.rotation.z = damp(rig.headGroup.rotation.z, 0, 8, dt);

    rig.leftLeg.rotation.set(damp(rig.leftLeg.rotation.x, -1.48, 14, dt), 0, damp(rig.leftLeg.rotation.z, -0.06, 14, dt));
    rig.rightLeg.rotation.set(damp(rig.rightLeg.rotation.x, -1.48, 14, dt), 0, damp(rig.rightLeg.rotation.z, 0.06, 14, dt));
    rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, 1.46, 14, dt);
    rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, 1.46, 14, dt);
    rig.leftAnkle.rotation.x = damp(rig.leftAnkle.rotation.x, 0, 14, dt);
    rig.rightAnkle.rotation.x = damp(rig.rightAnkle.rotation.x, 0, 14, dt);

    // Hands rest comfortably on knees/bench edge unless performing a seated emote!
    if (!p.emote) {
      solveTwoBoneArm(rig.leftArm, rig.leftElbow, -0.58, 0.15, -0.08, -0.78, 10, dt);
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.58, -0.15, 0.08, -0.78, 10, dt);
      rig.leftHand.wrist.rotation.set(0, 0, 0);
      rig.rightHand.wrist.rotation.set(0, 0, 0);
      if (near) {
        applyHandPose(rig.leftHand, false, 'relaxed', dt);
        applyHandPose(rig.rightHand, true, 'relaxed', dt);
      }
      return;
    }
  }

  // ==================== 3. 18 EXPRESSIVE HUMAN GESTURES / EMOTES ====================
  const activeEmote: EmoteId | null =
    p.emote ||
    (p.isNpc && p.npcBehavior === 'wave'
      ? 'wave'
      : p.isNpc && p.npcBehavior === 'laugh'
      ? 'laugh'
      : p.isNpc && p.npcBehavior === 'chat'
      ? 'point_forward'
      : null);

  if (activeEmote && !p.walking && !p.inAir && !p.holdingProp) {
    const et = p.emote ? p.emoteTime : t;
    let lPose: HandPoseName = 'relaxed';
    let rPose: HandPoseName = 'relaxed';

    if (!p.sittingBench) {
      // Balanced grounded stance for standing emotes
      rig.bodyGroup.position.x = damp(rig.bodyGroup.position.x, 0, 12, dt);
      rig.bodyGroup.position.z = damp(rig.bodyGroup.position.z, 0, 12, dt);
      rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, 0, 12, dt);
      rig.bodyGroup.rotation.z = damp(rig.bodyGroup.rotation.z, 0, 12, dt);

      rig.leftLeg.rotation.set(damp(rig.leftLeg.rotation.x, 0.04, 12, dt), 0, damp(rig.leftLeg.rotation.z, -0.08, 12, dt));
      rig.rightLeg.rotation.set(damp(rig.rightLeg.rotation.x, -0.04, 12, dt), 0, damp(rig.rightLeg.rotation.z, 0.08, 12, dt));
      rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, 0.06, 12, dt);
      rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, 0.06, 12, dt);
      rig.leftAnkle.rotation.x = damp(rig.leftAnkle.rotation.x, 0, 12, dt);
      rig.rightAnkle.rotation.x = damp(rig.rightAnkle.rotation.x, 0, 12, dt);

      rig.torsoGroup.rotation.set(0, 0, 0);
      rig.headGroup.rotation.set(0, 0, 0);
    }

    rig.torsoGroup.scale.y = 1 + Math.sin(t * 2.5) * 0.014;
    rig.leftHand.wrist.rotation.set(0, 0, 0);
    rig.rightHand.wrist.rotation.set(0, 0, 0);

    switch (activeEmote) {
      case 'wave':
      case 'goodbye': {
        const speed = activeEmote === 'goodbye' ? 6.8 : 9.2;
        const sway = Math.sin(et * speed);
        rig.torsoGroup.rotation.z = damp(rig.torsoGroup.rotation.z, -0.06, 10, dt);
        rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, 0.08, 10, dt);
        rig.headGroup.rotation.z = damp(rig.headGroup.rotation.z, 0.09, 10, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -2.35, -0.25, 0.45 + sway * 0.24, -0.68 + sway * 0.16, 14, dt);
        rig.rightHand.wrist.rotation.set(0, Math.PI * 0.5, sway * 0.22);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.06, 0, -0.1, -0.2, 12, dt);
        rPose = 'open_wave';
        break;
      }

      case 'greeting': {
        // Traditional Desi Namaste: palms pressed together at chest height + respectful slight bow
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.16, 10, dt);
        rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, 0.24, 10, dt);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, -0.78, 0.46, 0.32, -1.28, 14, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.78, -0.46, -0.32, -1.28, 14, dt);
        rig.leftHand.wrist.rotation.set(0, -0.18, 0.12);
        rig.rightHand.wrist.rotation.set(0, 0.18, -0.12);
        lPose = 'namaste';
        rPose = 'namaste';
        break;
      }

      case 'handshake': {
        const pump = Math.sin(et * 8.5) * 0.12;
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.08, 10, dt);
        rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, -0.14, 10, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.98 + pump, -0.12, -0.05, -0.35 - pump, 14, dt);
        rig.rightHand.wrist.rotation.set(0, 0, 0);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.08, 0, -0.08, -0.18, 12, dt);
        rPose = et > 0.7 ? 'grip_bar' : 'open_wave';
        break;
      }

      case 'high_five': {
        const reach = Math.min(1, et * 3.5);
        if (!p.sittingBench) rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, Math.sin(Math.min(Math.PI, et * 4.5)) * 0.22, 14, dt);
        rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, -0.18, 12, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -2.45 * reach, -0.1, 0.22, -0.24, 16, dt);
        rig.rightHand.wrist.rotation.set(0, Math.PI * 0.5, 0);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.15, 0, -0.12, -0.25, 12, dt);
        rPose = 'open_wave';
        break;
      }

      case 'thumbs_up': {
        rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, -0.1, 10, dt);
        rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, Math.sin(et * 5) * 0.09, 10, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -1.25, -0.18, 0.14, -0.36, 14, dt);
        rig.rightHand.wrist.rotation.set(0, 0, 0);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.06, 0, -0.1, -0.22, 12, dt);
        rPose = 'thumbs_up';
        break;
      }

      case 'thumbs_down': {
        rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, Math.sin(et * 6.5) * 0.22, 12, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -1.22, -0.12, 0.08, -0.3, 14, dt);
        // Forearm pronates 180° so thumb points straight down
        rig.rightHand.wrist.rotation.set(0, Math.PI, 0);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.06, 0, -0.1, -0.2, 12, dt);
        rPose = 'thumbs_down';
        break;
      }

      case 'point_forward': {
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.08, 10, dt);
        rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, -0.14, 10, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -1.48, -0.05, 0.04, -0.1, 14, dt);
        rig.rightHand.wrist.rotation.set(0, 0, 0);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.06, 0, -0.1, -0.22, 12, dt);
        rPose = 'point';
        break;
      }

      case 'point_object': {
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.16, 10, dt);
        rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, -0.2, 10, dt);
        rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, 0.24, 10, dt);
        rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, -0.15, 10, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -1.02, -0.24, 0.14, -0.14, 14, dt);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.06, 0, -0.1, -0.22, 12, dt);
        rPose = 'point';
        break;
      }

      case 'clap': {
        const clapWave = Math.abs(Math.sin(et * 11));
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.06, 10, dt);
        rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, Math.sin(et * 5.5) * 0.08, 10, dt);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, -0.82, 0.42 - clapWave * 0.24, 0.16, -1.12, 18, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.82, -0.42 + clapWave * 0.24, -0.16, -1.12, 18, dt);
        rig.leftHand.wrist.rotation.set(0, 0.1, 0);
        rig.rightHand.wrist.rotation.set(0, -0.1, 0);
        lPose = 'clap';
        rPose = 'clap';
        break;
      }

      case 'hands_hips': {
        // Confident boss stance with knuckles tucked neatly onto waist/belt
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, -0.05, 10, dt);
        rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, Math.sin(et * 0.9) * 0.14, 8, dt);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.24, 0.35, -0.58, -1.48, 12, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, 0.24, -0.35, 0.58, -1.48, 12, dt);
        lPose = 'fist';
        rPose = 'fist';
        break;
      }

      case 'facepalm': {
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.14, 10, dt);
        rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, 0.32, 12, dt);
        rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, Math.sin(et * 4.5) * 0.14, 10, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -1.42, -0.34, -0.14, -1.68, 14, dt);
        rig.rightHand.wrist.rotation.set(0, Math.PI * 0.5, 0);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.18, 0.3, -0.52, -1.42, 12, dt);
        lPose = 'fist';
        rPose = 'open_wave';
        break;
      }

      case 'laugh': {
        const laughPulse = Math.sin(et * 14);
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, -0.14 + laughPulse * 0.09, 14, dt);
        rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, -0.22 + laughPulse * 0.1, 14, dt);
        if (!p.sittingBench) {
          rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, Math.abs(laughPulse) * 0.04, 14, dt);
        }
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.45, -0.42, -0.15, -1.25 + laughPulse * 0.1, 14, dt);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, -0.65, 0.1, -0.25, -0.8 + laughPulse * 0.18, 14, dt);
        rPose = 'open_wave';
        lPose = 'open_wave';
        break;
      }

      case 'dance': {
        // Energetic Bollywood / Bhangra groove!
        const beat = Math.sin(et * 9.5);
        const halfBeat = Math.sin(et * 4.75);
        if (!p.sittingBench) {
          rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, -Math.abs(beat) * 0.11, 16, dt);
          rig.leftLeg.rotation.x = damp(rig.leftLeg.rotation.x, Math.max(0, beat) * -0.42, 14, dt);
          rig.rightLeg.rotation.x = damp(rig.rightLeg.rotation.x, Math.max(0, -beat) * -0.42, 14, dt);
          rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, Math.max(0.06, beat * 0.72), 14, dt);
          rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, Math.max(0.06, -beat * 0.72), 14, dt);
        }
        rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, halfBeat * 0.28, 12, dt);
        rig.torsoGroup.rotation.z = damp(rig.torsoGroup.rotation.z, beat * 0.12, 12, dt);
        rig.headGroup.rotation.z = damp(rig.headGroup.rotation.z, -beat * 0.15, 12, dt);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, -2.05 + beat * 0.42, 0.12, -0.58 - halfBeat * 0.25, -0.88, 16, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -2.05 - beat * 0.42, -0.12, 0.58 - halfBeat * 0.25, -0.88, 16, dt);
        rig.leftHand.wrist.rotation.set(0, -Math.PI * 0.5, et * 5.0);
        rig.rightHand.wrist.rotation.set(0, Math.PI * 0.5, -et * 5.0);
        lPose = 'open_wave';
        rPose = 'open_wave';
        break;
      }

      case 'celebrate': {
        const hop = Math.abs(Math.sin(et * 7.5));
        if (!p.sittingBench) {
          rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, hop * 0.26, 14, dt);
          rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, hop * 0.35, 14, dt);
          rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, hop * 0.35, 14, dt);
        }
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, -0.1, 10, dt);
        rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, -0.16, 10, dt);
        const pump = Math.sin(et * 11) * 0.24;
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, -2.55 + pump, 0, -0.45, -0.45, 16, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -2.55 - pump, 0, 0.45, -0.45, 16, dt);
        lPose = 'fist';
        rPose = 'fist';
        break;
      }

      case 'salute': {
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, -0.04, 12, dt);
        rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, -0.02, 12, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -1.32, -0.22, 0.72, -1.78, 16, dt);
        rig.rightHand.wrist.rotation.set(0, 0.35, -0.25);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, 0.02, 0, -0.06, -0.08, 14, dt);
        rPose = 'salute';
        lPose = 'fist';
        break;
      }

      case 'shrug': {
        rig.headGroup.rotation.z = damp(rig.headGroup.rotation.z, 0.16, 10, dt);
        rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, Math.sin(et * 2.5) * 0.16, 10, dt);
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, -0.04, 10, dt);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, -0.35, 0.32, -0.46, -1.18, 14, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.35, -0.32, 0.46, -1.18, 14, dt);
        rig.leftHand.wrist.rotation.set(0, -Math.PI * 0.42, 0);
        rig.rightHand.wrist.rotation.set(0, Math.PI * 0.42, 0);
        lPose = 'open_wave';
        rPose = 'open_wave';
        break;
      }

      case 'sit': {
        // Cross-legged ground relax sit (when not on a bench)
        if (!p.sittingBench) {
          rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, -0.78, 12, dt);
          rig.leftLeg.rotation.set(damp(rig.leftLeg.rotation.x, -1.42, 12, dt), 0.38, damp(rig.leftLeg.rotation.z, -0.42, 12, dt));
          rig.rightLeg.rotation.set(damp(rig.rightLeg.rotation.x, -1.42, 12, dt), -0.38, damp(rig.rightLeg.rotation.z, 0.42, 12, dt));
          rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, 1.92, 12, dt);
          rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, 1.92, 12, dt);
        }
        rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, 0.05, 8, dt);
        rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, Math.sin(t * 0.8) * 0.14, 8, dt);
        solveTwoBoneArm(rig.leftArm, rig.leftElbow, -0.52, 0.25, -0.22, -0.68, 10, dt);
        solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.52, -0.25, 0.22, -0.68, 10, dt);
        lPose = 'relaxed';
        rPose = 'relaxed';
        break;
      }
    }

    if (near) {
      applyHandPose(rig.leftHand, false, lPose, dt);
      applyHandPose(rig.rightHand, true, rPose, dt);
    }
    return;
  }

  // ==================== 4. ON-FOOT LOCOMOTION, COMBAT AIMING & PROP CARRY ====================
  const speedRatio = Math.min(1.25, Math.max(0, p.speedRatio));
  const moving = p.walking && speedRatio > 0.05;
  const runBob = moving && !p.inAir ? Math.abs(Math.sin(t * (p.sprinting ? 14 : 10))) * (0.045 + speedRatio * 0.045) : 0;
  const targetBodyY = (p.crouching ? -0.34 : 0) + runBob;

  rig.bodyGroup.position.x = damp(rig.bodyGroup.position.x, 0, 14, dt);
  rig.bodyGroup.position.z = damp(rig.bodyGroup.position.z, 0, 14, dt);
  rig.bodyGroup.position.y = damp(rig.bodyGroup.position.y, targetBodyY, 14, dt);

  // Stumble reaction tilt
  rig.bodyGroup.rotation.x = damp(rig.bodyGroup.rotation.x, 0, 14, dt);
  rig.bodyGroup.rotation.z =
    p.stumbleTimer > 0 ? Math.sin(p.stumbleTimer * 36) * 0.24 : damp(rig.bodyGroup.rotation.z, 0, 12, dt);

  // Natural torso lean + subtle upper-body counter-twist while running + gentle breathing
  const strideFreq = p.sprinting ? 14.5 : 10.5;
  const phase = t * strideFreq;
  const stride = p.inAir ? 0.42 : moving ? Math.sin(phase) * (p.sprinting ? 0.72 : 0.56) * Math.min(1, speedRatio + 0.25) : 0;
  const cosStride = moving && !p.inAir ? Math.cos(phase) : 0;

  const targetTorsoPitch = p.crouching ? 0.24 : moving ? (p.sprinting ? 0.16 : 0.08) : 0.02 * Math.sin(t * 1.4);
  const targetTorsoYaw = p.aiming ? 0.14 : moving ? -stride * 0.16 : 0;
  const targetTorsoRoll = moving ? cosStride * 0.035 : Math.sin(t * 0.9) * 0.015;

  rig.torsoGroup.rotation.x = damp(rig.torsoGroup.rotation.x, targetTorsoPitch, 12, dt);
  rig.torsoGroup.rotation.y = damp(rig.torsoGroup.rotation.y, targetTorsoYaw, 12, dt);
  rig.torsoGroup.rotation.z = damp(rig.torsoGroup.rotation.z, targetTorsoRoll, 12, dt);
  rig.torsoGroup.scale.y = 1 + Math.sin(t * 2.6) * 0.014;

  // Natural head look around when idle, or track aim pitch
  const idleHeadLookY = !moving && !p.aiming ? Math.sin(t * 0.85) * 0.14 : 0;
  const targetHeadX = p.aiming ? -(p.camPitch || 0) * 0.4 : -targetTorsoPitch * 0.45;
  rig.headGroup.rotation.x = damp(rig.headGroup.rotation.x, targetHeadX, 12, dt);
  rig.headGroup.rotation.y = damp(rig.headGroup.rotation.y, p.aiming ? -0.14 : idleHeadLookY, 10, dt);
  rig.headGroup.rotation.z = damp(rig.headGroup.rotation.z, 0, 10, dt);

  // 3-Segment Legs: Hip, Knee, Ankle (Heel-strike & Toe-off)
  const leftHipTarget = p.crouching && !moving ? -0.44 : stride;
  const rightHipTarget = p.crouching && !moving ? -0.44 : -stride;
  rig.leftLeg.rotation.set(damp(rig.leftLeg.rotation.x, leftHipTarget, 16, dt), 0, damp(rig.leftLeg.rotation.z, -0.04, 14, dt));
  rig.rightLeg.rotation.set(damp(rig.rightLeg.rotation.x, rightHipTarget, 16, dt), 0, damp(rig.rightLeg.rotation.z, 0.04, 14, dt));

  const leftKneeTarget = p.inAir ? 0.85 : p.crouching ? 0.82 : moving ? Math.max(0.06, -stride * 1.12 + 0.12) : 0.04;
  const rightKneeTarget = p.inAir ? 0.62 : p.crouching ? 0.82 : moving ? Math.max(0.06, stride * 1.12 + 0.12) : 0.04;
  rig.leftKnee.rotation.x = damp(rig.leftKnee.rotation.x, leftKneeTarget, 16, dt);
  rig.rightKnee.rotation.x = damp(rig.rightKnee.rotation.x, rightKneeTarget, 16, dt);

  const leftAnkleTarget = p.inAir ? 0.35 : moving ? stride * 0.34 : 0;
  const rightAnkleTarget = p.inAir ? 0.35 : moving ? -stride * 0.34 : 0;
  rig.leftAnkle.rotation.x = damp(rig.leftAnkle.rotation.x, leftAnkleTarget, 14, dt);
  rig.rightAnkle.rotation.x = damp(rig.rightAnkle.rotation.x, rightAnkleTarget, 14, dt);

  // 2-Segment Arms + Hands + Weapon Handling
  rig.leftHand.wrist.rotation.set(0, 0, 0);
  rig.rightHand.wrist.rotation.set(0, 0, 0);

  let lPose: HandPoseName = 'relaxed';
  let rPose: HandPoseName = 'relaxed';

  if (p.holdingProp) {
    solveTwoBoneArm(rig.leftArm, rig.leftElbow, -2.52, 0.18, -0.14, -0.46, 14, dt);
    solveTwoBoneArm(rig.rightArm, rig.rightElbow, -2.52, -0.18, 0.14, -0.46, 14, dt);
    lPose = 'grip_bar';
    rPose = 'grip_bar';
  } else {
    const wId = p.weaponId;
    const isTwoHandGun = wId === 'smg' || wId === 'shotgun' || wId === 'ak47';

    // Left Arm (supports two-handed rifle foregrip or swings naturally opposite legs)
    if (p.reloadTimer > 0) {
      solveTwoBoneArm(rig.leftArm, rig.leftElbow, -1.12, 0.42, 0.18, -1.08, 16, dt);
      lPose = 'grip_bar';
    } else if (isTwoHandGun && (p.aiming || !p.isNpc)) {
      solveTwoBoneArm(rig.leftArm, rig.leftElbow, -1.06, 0.48, 0.22, -0.74, 14, dt);
      lPose = 'grip_rifle';
    } else if (p.aiming) {
      solveTwoBoneArm(rig.leftArm, rig.leftElbow, -1.08, 0.25, 0.08, -0.82, 14, dt);
      lPose = 'fist';
    } else {
      const lArmPitch = p.inAir ? -0.65 : moving ? -stride * 0.68 : 0.04 * Math.sin(t * 1.6);
      const lElbowPitch = moving ? -0.42 - Math.max(0, stride * 0.42) : -0.18;
      solveTwoBoneArm(rig.leftArm, rig.leftElbow, lArmPitch, 0, -0.08, lElbowPitch, 14, dt);
      lPose = 'relaxed';
    }

    // Right Arm (Bat swing, reload, aiming firearm, or relaxed carry)
    if (p.firingSwing > 0 && wId === 'bat') {
      const swing = Math.sin(p.firingSwing * 24) * 0.85;
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, -1.52 - swing, -0.35, 0.2, -0.28, 22, dt);
      rPose = 'grip_bat';
    } else if (p.reloadTimer > 0) {
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, -0.95 + Math.sin(t * 18) * 0.24, -0.2, 0.05, -1.12, 16, dt);
      rPose = 'grip_gun';
    } else if (wId === null || (p.isNpc && wId === null)) {
      const rArmPitch = p.inAir ? -0.65 : moving ? stride * 0.68 : -0.04 * Math.sin(t * 1.6);
      const rElbowPitch = moving ? -0.42 - Math.max(0, -stride * 0.42) : -0.18;
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, rArmPitch, 0, 0.08, rElbowPitch, 14, dt);
      rPose = 'relaxed';
    } else if (wId === 'bat') {
      const batSwing = moving ? -0.36 + stride * 0.42 : -0.28;
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, batSwing, 0, 0.1, -0.46, 14, dt);
      rPose = 'grip_bat';
    } else if (p.aiming || p.firingSwing > 0) {
      const aimShoulder = -Math.PI / 2 + (p.camPitch || 0) * 0.45 - p.recoilKick;
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, aimShoulder, isTwoHandGun ? -0.14 : -0.04, 0.02, -0.16, 18, dt);
      rPose = isTwoHandGun ? 'grip_rifle' : 'grip_gun';
    } else {
      // Tactical low-ready weapon carry (safe, natural looking!)
      const lowReady = moving ? -0.92 + stride * 0.16 : -0.88;
      solveTwoBoneArm(rig.rightArm, rig.rightElbow, lowReady - p.recoilKick, isTwoHandGun ? -0.18 : -0.06, 0.06, -0.44, 14, dt);
      rPose = isTwoHandGun ? 'grip_rifle' : 'grip_gun';
    }
  }

  if (near) {
    applyHandPose(rig.leftHand, false, lPose, dt);
    applyHandPose(rig.rightHand, true, rPose, dt);
  }
}
