import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CharacterId,
  ChatMessage,
  CommunityMission,
  EmoteId,
  PlayerProfile,
  RemotePlayerState,
  SPAWN_X,
  SPAWN_Y,
  WeaponId,
  createDefaultProfile,
} from './shared/types';
import { soundEngine } from './game/audio';
import { FurfuriGameEngine, GraphicsQuality, HudSnapshot } from './game/engine';
import {
  ConnectionStatus,
  GameNetworkClient,
  getOrCreateLocalUid,
  loadCachedMissions,
  loadLocalProfile,
  saveCachedMissions,
  saveLocalProfile,
} from './game/network';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { TouchControls } from './components/TouchControls';
import { GarageModal } from './components/GarageModal';
import { MissionModal } from './components/MissionModal';
import { PauseModal } from './components/PauseModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { CityMapModal } from './components/CityMapModal';
import { EmoteMenu } from './components/EmoteMenu';

type GameScreen = 'TITLE' | 'PLAYING';
type ActiveModal = 'none' | 'garage' | 'missions' | 'pause' | 'multiplayer' | 'map';

const DEFAULT_HUD: HudSnapshot = {
  hp: 120,
  maxHp: 120,
  armor: 50,
  maxArmor: 100,
  rupees: 2000,
  xp: 0,
  level: 1,
  kills: 0,
  wantedLevel: 0,
  speedKmh: 0,
  inVehicleType: null,
  vehicleHp: 0,
  vehicleMaxHp: 100,
  vehicleName: null,
  nearVehicleName: null,
  nearGarage: false,
  districtName: 'Chai Chowk',
  timeOfDay: 'day',
  weather: 'clear',
  graphicsQuality: 'medium',
  playerX: SPAWN_X,
  playerY: SPAWN_Y,
  waypoint: null,
  weaponId: 'pistol',
  ownedWeapons: { bat: true, pistol: true, smg: false, shotgun: false, ak47: false },
  weaponAmmo: { bat: 999, pistol: 999, smg: 0, shotgun: 0, ak47: 0 },
  magAmmo: 12,
  magSize: 12,
  reloading: false,
  cameraMode: 0,
  aiming: false,
  crouching: false,
  holdingProp: null,
  activeEmote: null,
  sittingBench: false,
  hitMarker: false,
  pointerLocked: false,
  contextAction: null,
  specialCooldown: 0,
  specialMaxCooldown: 11,
  specialActive: false,
  specialTimer: 0,
  activeMission: null,
  activeEvent: null,
  easterEggsFound: 0,
  easterEggsTotal: 5,
  killFeed: null,
  wasted: false,
  wastedSubtitle: 'Your driving license has left the chat.',
};

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
}

export default function App() {
  const initialUid = useRef(getOrCreateLocalUid()).current;
  const cachedLocal = useRef(loadLocalProfile(initialUid)).current;

  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [modal, setModal] = useState<ActiveModal>('none');
  const [profile, setProfile] = useState<PlayerProfile>(
    () => cachedLocal || createDefaultProfile(initialUid, `Hero_${initialUid.slice(-4)}`, 'motu')
  );
  const [hud, setHud] = useState<HudSnapshot>(DEFAULT_HUD);
  const [missions, setMissions] = useState<CommunityMission[]>(() => loadCachedMissions());
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerState[]>([]);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');
  const [pingMs, setPingMs] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);
  const [offlineMode, setOfflineMode] = useState(false);
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>(() =>
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4 ? 'low' : 'medium'
  );
  const [touchEnabled, setTouchEnabled] = useState(() => detectTouchDevice());
  const [muted, setMuted] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FurfuriGameEngine | null>(null);
  const networkRef = useRef<GameNetworkClient | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const profileUidRef = useRef(profile.uid);

  useEffect(() => {
    profileUidRef.current = profile.uid;
  }, [profile.uid]);

  const flashNotice = useCallback((msg: string) => {
    setSyncNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setSyncNotice(null), 2800);
  }, []);

  // Initialize isolated Three.js 3D Engine + WebSocket Network Client once
  useEffect(() => {
    const net = new GameNetworkClient({
      onStatusChange: (status, ping, count) => {
        setConnectionStatus(status);
        setPingMs(ping);
        setOnlineCount(count);
      },
      onRemotePlayersSnapshot: (players) => {
        engineRef.current?.applyRemoteSnapshot(players);
        setRemotePlayers(players.filter((p) => p.uid !== profileUidRef.current));
      },
      onRemoteSpecial: (evt) => {
        engineRef.current?.handleRemoteSpecial(evt);
      },
      onRemoteShoot: (evt) => {
        engineRef.current?.handleRemoteShoot(evt);
      },
      onPvpHit: (evt) => {
        engineRef.current?.handlePvpHit(evt);
      },
      onRemoteHorn: (evt) => {
        engineRef.current?.handleRemoteHorn(evt);
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev.slice(-49), msg];
        });
      },
      onChatHistory: (msgs) => {
        setChatMessages(msgs);
      },
      onMissionsUpdate: (list) => {
        setMissions(list);
      },
      onMissionUpsert: (mission) => {
        setMissions((prev) => {
          const idx = prev.findIndex((m) => m.id === mission.id);
          const next = idx >= 0 ? prev.map((m, i) => (i === idx ? mission : m)) : [mission, ...prev];
          saveCachedMissions(next);
          return next;
        });
      },
      onOfflineSyncNotice: (msg) => {
        flashNotice(msg);
      },
    });
    networkRef.current = net;

    const mountEl = canvasMountRef.current;
    if (mountEl) {
      const engine = new FurfuriGameEngine(mountEl, profile, {
        onHudUpdate: (snap) => setHud(snap),
        onProfileMutated: (nextProf) => {
          setProfile(nextProf);
          saveLocalProfile(nextProf);
          net.syncProfile(nextProf);
        },
        onSendNetState: (state) => net.sendPlayerState(state),
        onSendSpecial: (charId, x, y) => net.sendSpecialEvent(charId, x, y),
        onSendShoot: (weaponId, x, y, angle) => net.sendShootEvent(weaponId, x, y, angle),
        onSendPvpHit: (targetUid, damage) => net.sendPvpHitEvent(targetUid, damage),
        onSendHorn: (hornType, x, y) => net.sendHornEvent(hornType, x, y),
        onMissionFinished: (mission, totalCash) => {
          setActiveMissionId(null);
          net.recordMissionComplete(mission.id);
          flashNotice(`Passed: ${mission.title} +₹${totalCash.toLocaleString('en-IN')}`);
        },
        onMissionFailed: (mission, reason) => {
          setActiveMissionId(null);
          flashNotice(`${mission.title}: ${reason}`);
        },
        onOpenGarageRequested: () => setModal('garage'),
      });
      engine.setGraphicsQuality(graphicsQuality);
      engineRef.current = engine;
    }

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
      net.destroy();
      networkRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.paused = modal !== 'none';
    }
    if (modal !== 'none') {
      setEmoteMenuOpen(false);
    }
  }, [modal]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'PLAYING') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }

      if (e.key === 'Escape') {
        if (emoteMenuOpen && modal === 'none') {
          setEmoteMenuOpen(false);
        } else if (!document.pointerLockElement) {
          setModal((prev) => (prev === 'none' ? 'pause' : 'none'));
        }
      } else if (e.code === 'KeyB' && modal === 'none') {
        setModal('garage');
      } else if (e.code === 'KeyM' && modal === 'none') {
        setModal('missions');
      } else if (e.code === 'Tab' && (modal === 'none' || modal === 'map')) {
        e.preventDefault();
        setModal((prev) => (prev === 'map' ? 'none' : 'map'));
      } else if (e.code === 'KeyT' && modal === 'none') {
        e.preventDefault();
        setChatOpen((prev) => !prev);
      } else if (e.code === 'KeyZ' && modal === 'none') {
        e.preventDefault();
        setEmoteMenuOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, modal, emoteMenuOpen]);

  const handleStartGame = useCallback(
    async (uid: string, name: string, charId: CharacterId, startOffline: boolean) => {
      soundEngine.unlock();
      setOfflineMode(startOffline);
      setScreen('PLAYING');
      setModal('none');

      const net = networkRef.current;
      if (net) {
        const { profile: loadedProf, missions: loadedMissions } = await net.bootstrapAndConnect(
          uid,
          name,
          charId,
          startOffline
        );
        setProfile(loadedProf);
        setMissions(loadedMissions);
        engineRef.current?.setProfile(loadedProf, false);
        engineRef.current?.setTitlePreviewMode(false);
        if (startOffline) {
          flashNotice('Offline Solo — Progress Saved');
        }
      }
    },
    [flashNotice]
  );

  const handleUpdateProfile = useCallback((next: PlayerProfile, spawnNow = false) => {
    setProfile(next);
    saveLocalProfile(next);
    engineRef.current?.setProfile(next, spawnNow);
    networkRef.current?.syncProfile(next);
  }, []);

  const handleSwitchCharacter = useCallback(
    (charId: CharacterId) => {
      const next: PlayerProfile = { ...profile, characterId: charId, updatedAt: Date.now() };
      handleUpdateProfile(next, false);
    },
    [profile, handleUpdateProfile]
  );

  const handleStartMission = useCallback((mission: CommunityMission) => {
    setActiveMissionId(mission.id);
    engineRef.current?.startMission(mission);
  }, []);

  const handleCancelMission = useCallback(() => {
    setActiveMissionId(null);
    engineRef.current?.cancelMission();
  }, []);

  const handleCreateMission = useCallback((mission: CommunityMission) => {
    networkRef.current?.publishMission(mission);
  }, []);

  const handleUpvoteMission = useCallback((missionId: string) => {
    setMissions((prev) => prev.map((m) => (m.id === missionId ? { ...m, upvotes: m.upvotes + 1 } : m)));
    networkRef.current?.upvoteMission(missionId);
  }, []);

  const handleToggleMute = useCallback(() => {
    soundEngine.muted = !soundEngine.muted;
    setMuted(soundEngine.muted);
  }, []);

  const handleSetGraphicsQuality = useCallback((quality: GraphicsQuality) => {
    setGraphicsQuality(quality);
    engineRef.current?.setGraphicsQuality(quality);
  }, []);

  const handleToggleOffline = useCallback(() => {
    setOfflineMode((prev) => {
      const next = !prev;
      networkRef.current?.setForceOffline(next);
      return next;
    });
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  const handleBindMinimap = useCallback((el: HTMLCanvasElement | null) => {
    engineRef.current?.setMinimapCanvas(el);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#14110f]">
      {/* Isolated Full-Viewport Three.js WebGL Mount Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0 h-full w-full" />

      {/* Title Screen */}
      {screen === 'TITLE' && (
        <TitleScreen
          initialUid={profile.uid}
          initialName={profile.name}
          initialChar={profile.characterId}
          offlineDefault={offlineMode}
          onStartGame={handleStartGame}
          onOpenMpGuide={() => setModal('multiplayer')}
        />
      )}

      {/* Active 3D Gameplay HUD + Touch Controls */}
      {screen === 'PLAYING' && (
        <>
          <GameHUD
            profile={profile}
            hud={hud}
            connectionStatus={connectionStatus}
            pingMs={pingMs}
            onlineCount={onlineCount}
            muted={muted}
            touchEnabled={touchEnabled}
            chatMessages={chatMessages}
            chatOpen={chatOpen}
            syncNotice={syncNotice}
            onBindMinimap={handleBindMinimap}
            onOpenFriends={() => setModal('multiplayer')}
            onOpenGarage={() => setModal('garage')}
            onOpenMissions={() => setModal('missions')}
            onOpenMap={() => setModal('map')}
            onToggleChat={() => setChatOpen((prev) => !prev)}
            onSendChat={(text) => networkRef.current?.sendChat(text, profile)}
            onToggleMute={handleToggleMute}
            onCycleCamera={() => engineRef.current?.cycleCameraMode()}
            onCycleTimeOfDay={() => engineRef.current?.cycleTimeOfDay()}
            onCycleWeather={() => engineRef.current?.cycleWeather()}
            onRequestPointerLock={() => engineRef.current?.requestPointerLock()}
            onSelectWeapon={(w: WeaponId) => engineRef.current?.setWeapon(w)}
            onTriggerReload={() => engineRef.current?.triggerReload()}
            onTriggerGrab={() => engineRef.current?.triggerGrabOrThrow()}
            onTriggerSmartInteract={() => engineRef.current?.triggerSmartInteract()}
            onTriggerSpecial={() => engineRef.current?.triggerSpecialPower()}
            onTriggerVehicle={() => engineRef.current?.triggerVehicleToggle()}
            onOpenPause={() => setModal('pause')}
            onCancelMission={handleCancelMission}
            onRespawn={() => engineRef.current?.respawnAfterWasted()}
            emoteMenuOpen={emoteMenuOpen}
            onToggleEmoteMenu={() => setEmoteMenuOpen((prev) => !prev)}
            onCancelEmote={() => engineRef.current?.cancelEmote()}
          />

          {emoteMenuOpen && modal === 'none' && (
            <EmoteMenu
              activeEmote={hud.activeEmote}
              onSelectEmote={(id: EmoteId) => {
                engineRef.current?.playEmote(id);
              }}
              onCancelEmote={() => engineRef.current?.cancelEmote()}
              onClose={() => setEmoteMenuOpen(false)}
            />
          )}

          {touchEnabled && modal === 'none' && !chatOpen && (
            <TouchControls
              inVehicle={hud.inVehicleType !== null}
              weaponId={hud.weaponId}
              ownedWeapons={hud.ownedWeapons}
              weaponAmmo={hud.weaponAmmo}
              aiming={hud.aiming}
              crouching={hud.crouching}
              holdingProp={hud.holdingProp}
              contextAction={hud.contextAction}
              specialReady={hud.specialCooldown <= 0}
              specialCooldown={hud.specialCooldown}
              onJoystickMove={(nx, ny) => engineRef.current?.setTouchJoystick(nx, ny)}
              onCameraOrbit={(dx, dy, freeLook) => engineRef.current?.addCameraOrbit(dx, dy, freeLook)}
              onReleaseFreeLook={() => engineRef.current?.releaseFreeLook()}
              onVehicleControls={(ctrl) => engineRef.current?.setVehicleControls(ctrl)}
              onFireChange={(active) => engineRef.current?.setTouchFire(active)}
              onToggleAim={() => engineRef.current?.toggleAiming()}
              onJump={() => engineRef.current?.triggerJump()}
              onToggleCrouch={() => engineRef.current?.toggleCrouch()}
              onGrabOrThrow={() => engineRef.current?.triggerGrabOrThrow()}
              onSmartInteract={() => engineRef.current?.triggerSmartInteract()}
              onSelectWeapon={(w: WeaponId) => engineRef.current?.setWeapon(w)}
              onVehicleToggle={() => engineRef.current?.triggerVehicleToggle()}
              onSpecial={() => engineRef.current?.triggerSpecialPower()}
              onHorn={() => engineRef.current?.triggerHornOrAction()}
              activeEmote={hud.activeEmote}
              onToggleEmoteMenu={() => setEmoteMenuOpen((prev) => !prev)}
            />
          )}

          {modal === 'garage' && (
            <GarageModal
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              onClose={() => setModal('none')}
            />
          )}

          {modal === 'missions' && (
            <MissionModal
              profile={profile}
              missions={missions}
              activeMissionId={activeMissionId}
              onStartMission={handleStartMission}
              onUpvoteMission={handleUpvoteMission}
              onCreateMission={handleCreateMission}
              onClose={() => setModal('none')}
            />
          )}

          {modal === 'pause' && (
            <PauseModal
              profile={profile}
              graphicsQuality={graphicsQuality}
              touchEnabled={touchEnabled}
              offlineMode={offlineMode}
              onResume={() => setModal('none')}
              onSwitchCharacter={handleSwitchCharacter}
              onSetGraphicsQuality={handleSetGraphicsQuality}
              onToggleTouch={() => setTouchEnabled((prev) => !prev)}
              onToggleOffline={handleToggleOffline}
              onToggleFullscreen={handleToggleFullscreen}
              onReturnTitle={() => {
                setModal('none');
                setScreen('TITLE');
                engineRef.current?.setTitlePreviewMode(true);
              }}
            />
          )}

          {modal === 'map' && engineRef.current && (
            <CityMapModal
              poiData={engineRef.current.getMapPoiData()}
              remotePlayers={remotePlayers}
              onSetWaypoint={(x, y, label) => engineRef.current?.setWaypoint(x, y, label)}
              onClearWaypoint={() => engineRef.current?.clearWaypoint()}
              onFastTravel={(x, y, label) => engineRef.current?.teleportTo(x, y, label)}
              onClose={() => setModal('none')}
            />
          )}
        </>
      )}

      {/* Multiplayer Invite & Warp Modal (Accessible from both Title & HUD) */}
      {modal === 'multiplayer' && (
        <MultiplayerModal
          profile={profile}
          connectionStatus={connectionStatus}
          remotePlayers={remotePlayers}
          onTeleportToPlayer={(rp) => engineRef.current?.teleportTo(rp.x, rp.y, rp.name)}
          onToggleOffline={handleToggleOffline}
          onClose={() => setModal('none')}
        />
      )}
    </div>
  );
}
