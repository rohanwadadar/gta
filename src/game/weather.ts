import * as THREE from 'three';
import { SkyMode, createSkyDomeTexture } from './textures3d';

export type WeatherType = 'clear' | 'rain' | 'fog';
export type TimeOfDay = SkyMode;

interface AtmosphereTarget {
  bg: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  sunOffset: THREE.Vector3;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  exposure: number;
  cloudTint: THREE.Color;
  lampIntensity: number;
  headlightsOn: boolean;
}

const RAIN_STREAKS_MAX = 820;

export class WeatherSystem {
  public timeOfDay: TimeOfDay = 'day';
  public weather: WeatherType = 'clear';
  public rainIntensity = 0; // 0..1 smooth rain particle intensity
  public wetness = 0; // 0..1 road & puddle wetness (lingers slightly after rain stops)
  public windStrength = 1;
  public windPhase = 0;

  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyDome: THREE.Mesh;

  private roadMaterials: THREE.MeshStandardMaterial[] = [];
  private streetLampMats: THREE.MeshStandardMaterial[] = [];
  private cloudMats: THREE.MeshBasicMaterial[] = [];
  private puddleMat: THREE.MeshStandardMaterial | null = null;

  private rainMesh: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private rainPos: Float32Array;
  private rainSeeds: Float32Array;
  private activeStreakCount = 520;

  private currentBg = new THREE.Color(0x93c5fd);
  private currentFog = new THREE.Color(0xcbd5e1);
  private currentSun = new THREE.Color(0xfffbeb);
  private currentHemiSky = new THREE.Color(0xe0f2fe);
  private currentHemiGround = new THREE.Color(0x8a7965);
  private currentCloud = new THREE.Color(0xf8fafc);
  private currentFogDensity = 0.002;
  private currentExposure = 1.06;
  private currentLampIntensity = 0.25;
  private lastSkyKey = '';

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    sunLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    skyDome: THREE.Mesh
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.sunLight = sunLight;
    this.hemiLight = hemiLight;
    this.skyDome = skyDome;

    // Pre-allocated pooled 3D rain streaks (1 draw call, zero GC)
    this.rainPos = new Float32Array(RAIN_STREAKS_MAX * 6);
    this.rainSeeds = new Float32Array(RAIN_STREAKS_MAX * 3);
    for (let i = 0; i < RAIN_STREAKS_MAX; i++) {
      this.rainSeeds[i * 3 + 0] = (Math.random() - 0.5) * 58; // local X offset around camera
      this.rainSeeds[i * 3 + 1] = Math.random() * 24; // local Y height
      this.rainSeeds[i * 3 + 2] = (Math.random() - 0.5) * 58; // local Z offset around camera
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    rainGeo.setDrawRange(0, this.activeStreakCount * 2);

    this.rainMat = new THREE.LineBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainMesh = new THREE.LineSegments(rainGeo, this.rainMat);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;
    this.scene.add(this.rainMesh);

    this.applySkyTexture(true);
    this.snapToTarget();
  }

  public registerRoadMaterial(mat: THREE.MeshStandardMaterial): void {
    this.roadMaterials.push(mat);
  }

  public registerLampMaterial(mat: THREE.MeshStandardMaterial): void {
    this.streetLampMats.push(mat);
  }

  public registerCloudMaterial(mat: THREE.MeshBasicMaterial): void {
    this.cloudMats.push(mat);
  }

  public registerPuddleMaterial(mat: THREE.MeshStandardMaterial): void {
    this.puddleMat = mat;
  }

  public setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.activeStreakCount = quality === 'low' ? 260 : quality === 'medium' ? 520 : RAIN_STREAKS_MAX;
    this.rainMesh.geometry.setDrawRange(0, this.activeStreakCount * 2);
  }

  public setTimeOfDay(mode: TimeOfDay): void {
    this.timeOfDay = mode;
    this.applySkyTexture(false);
  }

  public setWeather(w: WeatherType): void {
    this.weather = w;
    this.applySkyTexture(false);
  }

  public isHeadlightsActive(): boolean {
    return this.timeOfDay === 'night' || this.timeOfDay === 'sunset' || this.weather !== 'clear';
  }

  private applySkyTexture(force: boolean): void {
    const overcast = this.weather === 'rain' || this.weather === 'fog';
    const key = `${this.timeOfDay}|${overcast}`;
    if (!force && key === this.lastSkyKey) return;
    this.lastSkyKey = key;

    const skyMat = this.skyDome.material as THREE.MeshBasicMaterial;
    const oldMap = skyMat.map;
    skyMat.map = createSkyDomeTexture(this.timeOfDay, overcast);
    skyMat.needsUpdate = true;
    oldMap?.dispose();
  }

  private getTarget(): AtmosphereTarget {
    const t: AtmosphereTarget = {
      bg: new THREE.Color(),
      fogColor: new THREE.Color(),
      fogDensity: 0.0022,
      sunColor: new THREE.Color(),
      sunIntensity: 2.2,
      sunOffset: new THREE.Vector3(52, 86, 42),
      hemiSky: new THREE.Color(),
      hemiGround: new THREE.Color(),
      hemiIntensity: 0.9,
      exposure: 1.05,
      cloudTint: new THREE.Color(0xf8fafc),
      lampIntensity: 0.3,
      headlightsOn: false,
    };

    if (this.timeOfDay === 'sunrise') {
      t.bg.setHex(0xe59f7d);
      t.fogColor.setHex(0xdeb392);
      t.fogDensity = 0.0028;
      t.sunColor.setHex(0xffd29d);
      t.sunIntensity = 1.85;
      t.sunOffset.set(78, 42, 48);
      t.hemiSky.setHex(0xfde68a);
      t.hemiGround.setHex(0x7c5840);
      t.hemiIntensity = 0.78;
      t.exposure = 1.04;
      t.cloudTint.setHex(0xfed7aa);
      t.lampIntensity = 1.1;
      t.headlightsOn = false;
    } else if (this.timeOfDay === 'day') {
      t.bg.setHex(0x8fd3f4);
      t.fogColor.setHex(0xcbe6f7);
      t.fogDensity = 0.0018;
      t.sunColor.setHex(0xfffbeb);
      t.sunIntensity = 2.45;
      t.sunOffset.set(44, 96, 34);
      t.hemiSky.setHex(0xe0f2fe);
      t.hemiGround.setHex(0x8c7b65);
      t.hemiIntensity = 0.95;
      t.exposure = 1.05;
      t.cloudTint.setHex(0xf8fafc);
      t.lampIntensity = 0.15;
      t.headlightsOn = false;
    } else if (this.timeOfDay === 'sunset') {
      t.bg.setHex(0xd98262);
      t.fogColor.setHex(0xcf8465);
      t.fogDensity = 0.003;
      t.sunColor.setHex(0xffc085);
      t.sunIntensity = 1.95;
      t.sunOffset.set(-76, 38, 46);
      t.hemiSky.setHex(0x93c5fd);
      t.hemiGround.setHex(0x7c4a32);
      t.hemiIntensity = 0.78;
      t.exposure = 1.05;
      t.cloudTint.setHex(0xfdba74);
      t.lampIntensity = 2.2;
      t.headlightsOn = true;
    } else {
      t.bg.setHex(0x0b1120);
      t.fogColor.setHex(0x111a2e);
      t.fogDensity = 0.0036;
      t.sunColor.setHex(0x93c5fd);
      t.sunIntensity = 0.65;
      t.sunOffset.set(-40, 74, -40);
      t.hemiSky.setHex(0x3b82f6);
      t.hemiGround.setHex(0x1e293b);
      t.hemiIntensity = 0.52;
      t.exposure = 1.02;
      t.cloudTint.setHex(0x334155);
      t.lampIntensity = 4.2;
      t.headlightsOn = true;
    }

    if (this.weather === 'rain') {
      t.bg.lerp(new THREE.Color(0x475569), 0.72);
      t.fogColor.lerp(new THREE.Color(0x4b5563), 0.78);
      t.fogDensity = Math.max(t.fogDensity, 0.0052);
      t.sunIntensity *= 0.44;
      t.hemiSky.lerp(new THREE.Color(0x94a3b8), 0.65);
      t.hemiIntensity *= 0.85;
      t.cloudTint.setHex(0x475569);
      t.lampIntensity = Math.max(t.lampIntensity, 2.8);
      t.headlightsOn = true;
    } else if (this.weather === 'fog') {
      const fogTint = this.timeOfDay === 'night' ? 0x1e293b : 0xb6c2cf;
      t.bg.lerp(new THREE.Color(fogTint), 0.82);
      t.fogColor.lerp(new THREE.Color(fogTint), 0.88);
      t.fogDensity = 0.0115; // Strong atmospheric distance fog!
      t.sunIntensity *= 0.52;
      t.cloudTint.setHex(0x94a3b8);
      t.lampIntensity = Math.max(t.lampIntensity, 2.4);
      t.headlightsOn = true;
    }

    return t;
  }

  private snapToTarget(): void {
    const t = this.getTarget();
    this.currentBg.copy(t.bg);
    this.currentFog.copy(t.fogColor);
    this.currentSun.copy(t.sunColor);
    this.currentHemiSky.copy(t.hemiSky);
    this.currentHemiGround.copy(t.hemiGround);
    this.currentCloud.copy(t.cloudTint);
    this.currentFogDensity = t.fogDensity;
    this.currentExposure = t.exposure;
    this.currentLampIntensity = t.lampIntensity;
    this.applySceneAtmosphere(t);
  }

  private applySceneAtmosphere(target: AtmosphereTarget): void {
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.currentBg);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.currentFog);
      this.scene.fog.density = this.currentFogDensity;
    }
    this.sunLight.color.copy(this.currentSun);
    this.sunLight.intensity = THREE.MathUtils.lerp(this.sunLight.intensity, target.sunIntensity, 0.08);
    this.hemiLight.color.copy(this.currentHemiSky);
    this.hemiLight.groundColor.copy(this.currentHemiGround);
    this.hemiLight.intensity = THREE.MathUtils.lerp(this.hemiLight.intensity, target.hemiIntensity, 0.08);
    this.renderer.toneMappingExposure = this.currentExposure;

    for (const mat of this.streetLampMats) {
      mat.emissiveIntensity = this.currentLampIntensity;
    }
    for (const cm of this.cloudMats) {
      cm.color.copy(this.currentCloud);
    }
  }

  public update(dt: number, camPos: THREE.Vector3, playerWorldPos: THREE.Vector3): void {
    const target = this.getTarget();
    const colorBlend = 1 - Math.exp(-dt * 2.2);

    this.currentBg.lerp(target.bg, colorBlend);
    this.currentFog.lerp(target.fogColor, colorBlend);
    this.currentSun.lerp(target.sunColor, colorBlend);
    this.currentHemiSky.lerp(target.hemiSky, colorBlend);
    this.currentHemiGround.lerp(target.hemiGround, colorBlend);
    this.currentCloud.lerp(target.cloudTint, colorBlend);
    this.currentFogDensity = THREE.MathUtils.damp(this.currentFogDensity, target.fogDensity, 2.5, dt);
    this.currentExposure = THREE.MathUtils.damp(this.currentExposure, target.exposure, 2.5, dt);
    this.currentLampIntensity = THREE.MathUtils.damp(this.currentLampIntensity, target.lampIntensity, 3.0, dt);

    // Move shadow-casting directional sun relative to player + smooth time angle
    const sunX = THREE.MathUtils.damp(this.sunLight.position.x - playerWorldPos.x, target.sunOffset.x, 3, dt);
    const sunY = THREE.MathUtils.damp(this.sunLight.position.y, target.sunOffset.y, 3, dt);
    const sunZ = THREE.MathUtils.damp(this.sunLight.position.z - playerWorldPos.z, target.sunOffset.z, 3, dt);
    this.sunLight.position.set(playerWorldPos.x + sunX, sunY, playerWorldPos.z + sunZ);
    this.sunLight.target.position.copy(playerWorldPos);

    this.applySceneAtmosphere(target);

    // Smooth rain & wetness transitions
    const targetRain = this.weather === 'rain' ? 1 : 0;
    this.rainIntensity = THREE.MathUtils.damp(this.rainIntensity, targetRain, 1.8, dt);

    // Wetness builds quickly during rain, dries slowly after rain stops
    const wetRate = targetRain > 0 ? 1.4 : 0.25;
    this.wetness = THREE.MathUtils.damp(this.wetness, targetRain, wetRate, dt);

    // Wind sway strength
    this.windStrength = THREE.MathUtils.damp(this.windStrength, this.weather === 'rain' ? 2.8 : 1.0, 2.0, dt);
    this.windPhase += dt * this.windStrength * 1.4;

    // Wet reflective asphalt road shader values
    const roadRoughness = THREE.MathUtils.lerp(0.86, 0.16, this.wetness);
    const roadMetalness = THREE.MathUtils.lerp(0.02, 0.18, this.wetness);
    const roadEnv = THREE.MathUtils.lerp(0.65, 1.75, this.wetness);
    for (const rMat of this.roadMaterials) {
      rMat.roughness = roadRoughness;
      rMat.metalness = roadMetalness;
      rMat.envMapIntensity = roadEnv;
    }

    if (this.puddleMat) {
      this.puddleMat.opacity = 0.04 + this.wetness * 0.74;
    }

    // Update falling diagonal 3D rain streaks localized around camera
    if (this.rainIntensity > 0.02) {
      this.rainMesh.visible = true;
      this.rainMat.opacity = this.rainIntensity * 0.42;

      const fallSpeed = 29;
      const windDriftX = 4.2 * this.windStrength;
      const streakLenY = 0.85;
      const streakLenX = 0.12 * this.windStrength;

      for (let i = 0; i < this.activeStreakCount; i++) {
        const si = i * 3;
        this.rainSeeds[si + 0] += windDriftX * dt;
        this.rainSeeds[si + 1] -= fallSpeed * dt;

        if (this.rainSeeds[si + 1] < 0) {
          this.rainSeeds[si + 1] = 22 + Math.random() * 4;
          this.rainSeeds[si + 0] = (Math.random() - 0.5) * 58;
          this.rainSeeds[si + 2] = (Math.random() - 0.5) * 58;
        }
        if (this.rainSeeds[si + 0] > 29) this.rainSeeds[si + 0] -= 58;

        const wx = camPos.x + this.rainSeeds[si + 0];
        const wy = this.rainSeeds[si + 1];
        const wz = camPos.z + this.rainSeeds[si + 2];

        const pi = i * 6;
        this.rainPos[pi + 0] = wx;
        this.rainPos[pi + 1] = wy;
        this.rainPos[pi + 2] = wz;
        this.rainPos[pi + 3] = wx - streakLenX;
        this.rainPos[pi + 4] = wy + streakLenY;
        this.rainPos[pi + 5] = wz;
      }
      (this.rainMesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    } else {
      this.rainMesh.visible = false;
    }
  }
}
