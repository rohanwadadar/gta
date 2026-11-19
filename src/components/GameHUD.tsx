import React, { useEffect, useRef, useState } from 'react';
import {
  Wrench,
  Flag,
  MessageSquare,
  Volume2,
  VolumeX,
  Pause,
  Send,
  X,
  Wifi,
  WifiOff,
  Star,
  Skull,
  Users,
  Camera,
  Zap,
  Car,
  Hand,
  MousePointer2,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  CloudRain,
  CloudFog,
  Map as MapIcon,
  Trophy,
  RotateCw,
  Sparkles,
  Smile,
} from 'lucide-react';
import { ChatMessage, EMOTE_LIST, PlayerProfile, WeaponId } from '../shared/types';
import { CHARACTERS, QUICK_CHAT_PHRASES } from '../game/constants';
import { HudSnapshot } from '../game/engine';
import { ConnectionStatus } from '../game/network';

interface GameHUDProps {
  profile: PlayerProfile;
  hud: HudSnapshot;
  connectionStatus: ConnectionStatus;
  pingMs: number;
  onlineCount: number;
  muted: boolean;
  touchEnabled: boolean;
  chatMessages: ChatMessage[];
  chatOpen: boolean;
  syncNotice: string | null;
  onBindMinimap: (el: HTMLCanvasElement | null) => void;
  onOpenFriends: () => void;
  onOpenGarage: () => void;
  onOpenMissions: () => void;
  onOpenMap: () => void;
  onToggleChat: () => void;
  onSendChat: (text: string) => void;
  onToggleMute: () => void;
  onCycleCamera: () => void;
  onCycleTimeOfDay: () => void;
  onCycleWeather: () => void;
  onRequestPointerLock: () => void;
  onSelectWeapon: (w: WeaponId) => void;
  onTriggerReload: () => void;
  onTriggerGrab: () => void;
  onTriggerSmartInteract: () => void;
  onTriggerSpecial: () => void;
  onTriggerVehicle: () => void;
  onOpenPause: () => void;
  onCancelMission: () => void;
  onRespawn: () => void;
  emoteMenuOpen: boolean;
  onToggleEmoteMenu: () => void;
  onCancelEmote: () => void;
}

const WEAPON_DOCK: { id: WeaponId; key: string; label: string }[] = [
  { id: 'bat', key: '1', label: 'Bat' },
  { id: 'pistol', key: '2', label: 'Pistol' },
  { id: 'smg', key: '3', label: 'SMG' },
  { id: 'shotgun', key: '4', label: 'Shotgun' },
  { id: 'ak47', key: '5', label: 'AK-47' },
];

export const GameHUD: React.FC<GameHUDProps> = ({
  profile,
  hud,
  connectionStatus,
  pingMs,
  onlineCount,
  muted,
  touchEnabled,
  chatMessages,
  chatOpen,
  syncNotice,
  onBindMinimap,
  onOpenFriends,
  onOpenGarage,
  onOpenMissions,
  onOpenMap,
  onToggleChat,
  onSendChat,
  onToggleMute,
  onCycleCamera,
  onCycleTimeOfDay,
  onCycleWeather,
  onRequestPointerLock,
  onSelectWeapon,
  onTriggerReload,
  onTriggerGrab,
  onTriggerSmartInteract,
  onTriggerSpecial,
  onTriggerVehicle,
  onOpenPause,
  onCancelMission,
  onRespawn,
  emoteMenuOpen,
  onToggleEmoteMenu,
  onCancelEmote,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const charDef = CHARACTERS[profile.characterId];

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const armorPct = Math.max(0, Math.min(100, (hud.armor / Math.max(1, hud.maxArmor)) * 100));
  const vehHpPct = Math.max(0, Math.min(100, (hud.vehicleHp / Math.max(1, hud.vehicleMaxHp)) * 100));
  const spPct = hud.specialActive
    ? 100
    : Math.max(0, Math.min(100, ((hud.specialMaxCooldown - hud.specialCooldown) / Math.max(1, hud.specialMaxCooldown)) * 100));

  const crossGap = hud.aiming ? 4 : hud.crouching ? 6 : 9;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-3.5">
      {/* ==================== CENTER BGMI DYNAMIC CROSSHAIR + RED HITMARKER ==================== */}
      {!hud.wasted && (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-10 w-10">
            {/* Center dot */}
            <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300" />
            {/* 4 Dynamic Crosshair Ticks */}
            <div
              className="absolute left-1/2 h-2.5 w-0.5 -translate-x-1/2 bg-white/90 shadow"
              style={{ bottom: `calc(50% + ${crossGap}px)` }}
            />
            <div
              className="absolute left-1/2 h-2.5 w-0.5 -translate-x-1/2 bg-white/90 shadow"
              style={{ top: `calc(50% + ${crossGap}px)` }}
            />
            <div
              className="absolute top-1/2 h-0.5 w-2.5 -translate-y-1/2 bg-white/90 shadow"
              style={{ right: `calc(50% + ${crossGap}px)` }}
            />
            <div
              className="absolute top-1/2 h-0.5 w-2.5 -translate-y-1/2 bg-white/90 shadow"
              style={{ left: `calc(50% + ${crossGap}px)` }}
            />

            {/* Vivid Red X Hitmarker */}
            {hud.hitMarker && (
              <svg viewBox="0 0 32 32" className="absolute inset-0 h-10 w-10 text-red-500">
                <line x1="8" y1="8" x2="13" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="24" y1="8" x2="19" y2="13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="8" y1="24" x2="13" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="24" y1="24" x2="19" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </div>

          {/* Desktop Single Contextual Action Prompt below crosshair */}
          {!touchEnabled && hud.contextAction && (
            <button
              type="button"
              onClick={() => {
                if (hud.contextAction?.kind === 'grab' || hud.contextAction?.kind === 'throw') {
                  onTriggerGrab();
                } else {
                  onTriggerSmartInteract();
                }
              }}
              className="pointer-events-auto absolute left-1/2 top-14 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-amber-300/70 bg-[#181412]/92 px-3 py-1.5 text-xs font-extrabold text-amber-200 shadow-lg whitespace-nowrap"
            >
              <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-[#14110f]">
                {hud.contextAction.keyHint}
              </span>
              <span>{hud.contextAction.label}</span>
            </button>
          )}
        </div>
      )}

      {/* ==================== TOP PERIMETER ==================== */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Minimalist Hero Vitals + Cash + KOs */}
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-amber-200/20 bg-[#181412]/90 p-2 shadow-lg">
          <img
            src={charDef.portraitUrl}
            alt={charDef.name}
            referrerPolicy="no-referrer"
            className="h-11 w-11 shrink-0 rounded-md border border-amber-400/50 object-cover sm:h-12 sm:w-12"
          />
          <div className="min-w-[138px] sm:min-w-[162px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono-num text-sm font-bold text-emerald-400">
                ₹{hud.rupees.toLocaleString('en-IN')}
              </span>
              <div className="flex items-center gap-2">
                <span
                  title="Hidden Golden Secrets Found"
                  className="font-mono-num flex items-center gap-0.5 text-[11px] font-bold text-amber-300"
                >
                  <Trophy className="h-3 w-3" />
                  {hud.easterEggsFound}/{hud.easterEggsTotal}
                </span>
                <span className="font-mono-num flex items-center gap-1 text-xs font-bold text-red-400">
                  <Skull className="h-3.5 w-3.5" />
                  {hud.kills}
                </span>
              </div>
            </div>

            {/* Health Bar */}
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-[#2e2622]">
              <div
                className={`h-full transition-all duration-150 ${hpPct < 30 ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${hpPct}%` }}
              />
            </div>

            {/* Armor Bar */}
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-[#2e2622]">
              <div className="h-full bg-sky-400 transition-all duration-150" style={{ width: `${armorPct}%` }} />
            </div>

            {/* Special Power Bar */}
            <div className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-[#2e2622]">
              <div className="h-full bg-amber-400 transition-all duration-150" style={{ width: `${spPct}%` }} />
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] text-amber-100/75">
              <span className="truncate font-semibold text-amber-200">{hud.districtName}</span>
              <span className={`ml-2 inline-flex items-center gap-1 ${connectionStatus === 'online' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {connectionStatus === 'online' ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span className="font-mono-num">{onlineCount}P{pingMs > 0 ? ` ${pingMs}ms` : ''}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Solo</span>
                  </>
                )}
              </span>
            </div>

            {hud.wantedLevel > 0 && (
              <div className="mt-1 flex items-center gap-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < hud.wantedLevel ? 'fill-amber-400 text-amber-400' : 'text-amber-100/20'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top-Center: Active Mission Compact Bar + City Event + Live Funny Feed */}
        <div className="flex flex-col items-center gap-1.5">
          {hud.activeMission && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-amber-400/45 bg-[#181412]/92 px-3 py-1.5 text-xs shadow-lg">
              <span className="font-bold text-amber-300">{hud.activeMission.objectiveText}</span>
              <span className="font-mono-num text-amber-100">{hud.activeMission.distanceM}m</span>
              <span className="font-mono-num text-emerald-400">{hud.activeMission.timeLeft}s</span>
              <button type="button" onClick={onCancelMission} className="text-amber-100/55 hover:text-red-400">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {hud.activeEvent && (
            <div className="flex items-center gap-2 rounded-lg border border-sky-400/40 bg-[#141a22]/92 px-3 py-1 text-xs shadow-lg">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="font-extrabold text-sky-200">{hud.activeEvent.title}</span>
              <span className="hidden text-amber-100/75 sm:inline">· {hud.activeEvent.subtitle}</span>
              <span className="font-mono-num font-bold text-amber-300">{hud.activeEvent.timeLeft}s</span>
            </div>
          )}

          {(hud.killFeed || syncNotice) && (
            <div className="rounded-md border border-amber-400/40 bg-[#181412]/92 px-3 py-1 text-xs font-bold text-amber-300 shadow text-center">
              {hud.killFeed || syncNotice}
            </div>
          )}

          {hud.activeEmote && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-amber-400/45 bg-[#181412]/92 px-2.5 py-1 text-xs font-bold text-amber-200 shadow">
              <Smile className="h-3.5 w-3.5 text-amber-400" />
              <span>{EMOTE_LIST.find((e) => e.id === hud.activeEmote)?.label || hud.activeEmote}</span>
              <button
                type="button"
                onClick={onCancelEmote}
                className="rounded bg-red-500/25 px-1.5 py-0.5 text-[10px] font-extrabold text-red-200 hover:bg-red-500/45"
              >
                Stop
              </button>
            </div>
          )}

          {hud.sittingBench && !hud.activeEmote && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-emerald-400/40 bg-[#14221c]/92 px-2.5 py-1 text-xs font-bold text-emerald-200 shadow">
              <span>Relaxing on Bench · Move or press E to stand</span>
            </div>
          )}
        </div>

        {/* Top-Right: Crisp Icon Bar + Compact Minimap */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-start gap-2">
            <div className="flex flex-wrap justify-end gap-1.5">
              {!touchEnabled && (
                <button
                  type="button"
                  onClick={onRequestPointerLock}
                  title="Lock Mouse for 360° Aim (L)"
                  className={`flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-extrabold whitespace-nowrap shrink-0 ${
                    hud.pointerLocked
                      ? 'border-sky-400 bg-sky-500 text-[#14110f]'
                      : 'border-amber-200/25 bg-[#181412]/90 text-sky-300 hover:border-sky-400/60'
                  }`}
                >
                  <MousePointer2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{hud.pointerLocked ? '360° ON' : '360° Mouse'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenFriends}
                title="Multiplayer & Friends"
                className="flex h-10 items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500 px-2.5 text-xs font-extrabold text-[#14110f] hover:bg-amber-400 whitespace-nowrap shrink-0"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">MP</span>
              </button>

              <button
                type="button"
                onClick={onOpenGarage}
                title="Garage (B)"
                className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                  hud.nearGarage
                    ? 'border-emerald-400 bg-emerald-600 text-white'
                    : 'border-amber-200/20 bg-[#181412]/90 text-amber-100 hover:border-amber-400/50'
                }`}
              >
                <Wrench className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onOpenMissions}
                title="Missions (M)"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200/20 bg-[#181412]/90 text-amber-400 hover:border-amber-400/50"
              >
                <Flag className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onToggleEmoteMenu}
                title="Gestures & Emotes (Z)"
                className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                  emoteMenuOpen || hud.activeEmote
                    ? 'border-amber-400 bg-amber-500 text-[#14110f]'
                    : 'border-amber-200/20 bg-[#181412]/90 text-amber-300 hover:border-amber-400/50'
                }`}
              >
                <Smile className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onToggleChat}
                title="Chat (T)"
                className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                  chatOpen
                    ? 'border-amber-400 bg-amber-500 text-[#14110f]'
                    : 'border-amber-200/20 bg-[#181412]/90 text-amber-100 hover:border-amber-400/50'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onOpenMap}
                title="Interactive City Map (Tab)"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-400/40 bg-[#181412]/90 text-sky-300 hover:border-sky-400"
              >
                <MapIcon className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onCycleTimeOfDay}
                title={`Time: ${hud.timeOfDay.charAt(0).toUpperCase() + hud.timeOfDay.slice(1)} (Click to cycle)`}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200/20 bg-[#181412]/90 text-amber-300 hover:border-amber-400/60"
              >
                {hud.timeOfDay === 'night' ? (
                  <Moon className="h-4 w-4 text-sky-300" />
                ) : hud.timeOfDay === 'sunrise' ? (
                  <Sunrise className="h-4 w-4 text-amber-300" />
                ) : hud.timeOfDay === 'day' ? (
                  <Sun className="h-4 w-4 text-yellow-300" />
                ) : (
                  <Sunset className="h-4 w-4 text-orange-400" />
                )}
              </button>

              <button
                type="button"
                onClick={onCycleWeather}
                title={`Weather: ${hud.weather.charAt(0).toUpperCase() + hud.weather.slice(1)} (Click to cycle)`}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                  hud.weather === 'rain'
                    ? 'border-sky-400/60 bg-sky-950/80 text-sky-300'
                    : hud.weather === 'fog'
                    ? 'border-slate-400/60 bg-slate-800/80 text-slate-200'
                    : 'border-amber-200/20 bg-[#181412]/90 text-amber-200 hover:border-amber-400/60'
                }`}
              >
                {hud.weather === 'rain' ? (
                  <CloudRain className="h-4 w-4 text-sky-400" />
                ) : hud.weather === 'fog' ? (
                  <CloudFog className="h-4 w-4 text-slate-300" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-200" />
                )}
              </button>

              <button
                type="button"
                onClick={onCycleCamera}
                title="Camera Distance (V)"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200/20 bg-[#181412]/90 text-amber-100 hover:border-amber-400/50"
              >
                <Camera className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                title="Sound"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200/20 bg-[#181412]/90 text-amber-100 hover:border-amber-400/50"
              >
                {muted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={onOpenPause}
                title="Menu (Esc)"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200/20 bg-[#181412]/90 text-amber-100 hover:border-amber-400/50"
              >
                <Pause className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenMap}
              title="Open Interactive GPS Map (Tab)"
              className="group relative hidden overflow-hidden rounded-lg border border-amber-200/25 bg-[#181412] shadow-lg hover:border-sky-400 sm:block"
            >
              <canvas ref={onBindMinimap} width={108} height={108} className="block h-[108px] w-[108px]" />
              <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-[#14110f]/85 px-1 py-0.5 text-[9px] font-extrabold tracking-wider text-sky-300">
                MAP
              </span>
            </button>
          </div>

          {hud.inVehicleType && (
            <div className="min-w-[144px] rounded-lg border border-amber-200/20 bg-[#181412]/92 px-2.5 py-1.5 shadow-lg">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-bold text-amber-100">{hud.vehicleName || 'Ride'}</span>
                <span className="font-mono-num font-extrabold text-amber-400">{hud.speedKmh} km/h</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-[#2e2622]">
                <div
                  className={`h-full transition-all duration-150 ${
                    vehHpPct < 35 ? 'bg-red-500' : vehHpPct < 65 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${vehHpPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== BOTTOM AREA: CHAT + DESKTOP BGMI WEAPON BAR ==================== */}
      <div className="mt-auto flex items-end justify-between gap-2">
        {chatOpen ? (
          <div className="pointer-events-auto w-full max-w-[310px] rounded-lg border border-amber-200/20 bg-[#181412]/95 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-200/10 px-3 py-1.5">
              <span className="text-xs font-bold text-amber-300">Chat</span>
              <button type="button" onClick={onToggleChat} className="text-amber-100/60 hover:text-amber-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="desi-scroll max-h-36 space-y-1 overflow-y-auto px-3 py-2 text-xs">
              {chatMessages.map((m) => (
                <div key={m.id} className={m.system ? 'text-amber-300/80' : 'text-amber-50'}>
                  {!m.system && <span className="mr-1.5 font-bold text-amber-400">{m.name}:</span>}
                  <span>{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="desi-scroll flex gap-1 overflow-x-auto border-t border-amber-200/10 px-2 py-1">
              {QUICK_CHAT_PHRASES.slice(0, 4).map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => onSendChat(phrase)}
                  className="rounded border border-amber-200/15 bg-[#251f1b] px-2 py-0.5 text-[11px] text-amber-100 whitespace-nowrap shrink-0"
                >
                  {phrase}
                </button>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="flex items-center border-t border-amber-200/15 p-1">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={140}
                placeholder="Message..."
                className="flex-1 bg-transparent px-2 py-1 text-xs text-amber-50 outline-none"
              />
              <button type="submit" className="flex h-7 w-7 items-center justify-center rounded bg-amber-500 text-[#14110f]">
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <div />
        )}

        {/* Desktop Compact BGMI 5-Slot Weapon + Action Dock */}
        {!touchEnabled && (
          <div className="pointer-events-auto mx-auto flex items-center gap-1 rounded-xl border border-amber-200/20 bg-[#181412]/92 p-1.5 shadow-xl">
            {WEAPON_DOCK.map((w) => {
              const owned = hud.ownedWeapons[w.id];
              const active = hud.weaponId === w.id;
              const reserve = w.id === 'bat' || w.id === 'pistol' ? '∞' : hud.weaponAmmo[w.id];
              const ammoText =
                active && w.id !== 'bat' ? `${hud.magAmmo}/${reserve}` : `${reserve}`;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelectWeapon(w.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-amber-500 text-[#14110f]'
                      : owned
                      ? 'text-amber-100 hover:bg-[#27211d]'
                      : 'text-amber-100/30 hover:bg-[#221d19]'
                  }`}
                >
                  <span className="opacity-65">{w.key}</span>
                  <span>{w.label}</span>
                  {owned && <span className="font-mono-num text-[10px] opacity-85">{ammoText}</span>}
                </button>
              );
            })}

            {hud.weaponId !== 'bat' && (
              <button
                type="button"
                onClick={onTriggerReload}
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 ${
                  hud.reloading
                    ? 'bg-sky-500 text-[#14110f]'
                    : hud.magAmmo < hud.magSize
                    ? 'bg-[#251f1b] text-sky-300 hover:bg-[#322923]'
                    : 'bg-[#251f1b] text-amber-100/50'
                }`}
                title="Reload Magazine (R)"
              >
                <RotateCw className={`h-3.5 w-3.5 ${hud.reloading ? 'animate-spin' : ''}`} />
                <span>{hud.reloading ? 'Reloading' : 'R'}</span>
              </button>
            )}

            <div className="mx-1 h-5 w-px bg-amber-200/15" />

            <button
              type="button"
              onClick={onTriggerGrab}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 ${
                hud.holdingProp
                  ? 'bg-orange-500 text-[#14110f]'
                  : 'bg-[#251f1b] text-amber-200 hover:bg-[#322923]'
              }`}
              title="Grab / Throw Object (G)"
            >
              <Hand className="h-3.5 w-3.5" />
              {hud.holdingProp ? 'Throw' : 'Grab'}
            </button>

            <button
              type="button"
              onClick={onTriggerSpecial}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 ${
                hud.specialCooldown <= 0
                  ? 'border border-amber-400/50 bg-amber-500/20 text-amber-300'
                  : 'bg-[#251f1b] text-amber-100/45'
              }`}
              title="Hero Power (Q)"
            >
              <Zap className="h-3.5 w-3.5" />
              {hud.specialCooldown <= 0 ? 'Q' : `${Math.ceil(hud.specialCooldown)}s`}
            </button>

            <button
              type="button"
              onClick={onTriggerVehicle}
              className="flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-[#14261f] px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-[#1a332a] whitespace-nowrap shrink-0"
              title="Ride / Exit Car (E)"
            >
              <Car className="h-3.5 w-3.5" />
              {hud.inVehicleType ? 'Exit' : 'Ride'}
            </button>

            <button
              type="button"
              onClick={onToggleEmoteMenu}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 ${
                emoteMenuOpen || hud.activeEmote
                  ? 'bg-amber-500 text-[#14110f]'
                  : 'bg-[#251f1b] text-amber-200 hover:bg-[#322923]'
              }`}
              title="Gestures & Emotes (Z)"
            >
              <Smile className="h-3.5 w-3.5" />
              <span>Z</span>
            </button>
          </div>
        )}

        <div className="hidden w-12 sm:block" />
      </div>

      {/* Wasted Overlay with Funny Comedy Subtitle */}
      {hud.wasted && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#14110f]/82 px-4 text-center">
          <h2 className="font-display text-5xl font-extrabold tracking-widest text-red-500 sm:text-6xl">KNOCKED OUT!</h2>
          <p className="mt-2 max-w-md text-sm font-semibold text-amber-200/90 sm:text-base">
            {hud.wastedSubtitle}
          </p>
          <button
            type="button"
            onClick={onRespawn}
            className="mt-6 rounded-lg bg-amber-500 px-6 py-2.5 font-display text-lg font-bold text-[#14110f] hover:bg-amber-400"
          >
            Respawn at Chai Chowk
          </button>
        </div>
      )}
    </div>
  );
};
