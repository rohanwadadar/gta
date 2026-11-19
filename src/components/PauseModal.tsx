import React, { useState } from 'react';
import { Copy, Check, Cpu, Gamepad2, Wifi, WifiOff, Maximize, LogOut, Play } from 'lucide-react';
import { CharacterId, PlayerProfile } from '../shared/types';
import { CHARACTER_LIST } from '../game/constants';
import { GraphicsQuality } from '../game/engine';

interface PauseModalProps {
  profile: PlayerProfile;
  graphicsQuality: GraphicsQuality;
  touchEnabled: boolean;
  offlineMode: boolean;
  onResume: () => void;
  onSwitchCharacter: (charId: CharacterId) => void;
  onSetGraphicsQuality: (quality: GraphicsQuality) => void;
  onToggleTouch: () => void;
  onToggleOffline: () => void;
  onToggleFullscreen: () => void;
  onReturnTitle: () => void;
}

const QUALITY_OPTIONS: { id: GraphicsQuality; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Med' },
  { id: 'high', label: 'High' },
];

export const PauseModal: React.FC<PauseModalProps> = ({
  profile,
  graphicsQuality,
  touchEnabled,
  offlineMode,
  onResume,
  onSwitchCharacter,
  onSetGraphicsQuality,
  onToggleTouch,
  onToggleOffline,
  onToggleFullscreen,
  onReturnTitle,
}) => {
  const [copied, setCopied] = useState(false);

  const copyUid = () => {
    navigator.clipboard?.writeText(profile.uid).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl rounded-xl border border-amber-200/20 bg-[#181412] p-5 shadow-2xl">
        <div className="flex items-start justify-between border-b border-amber-200/15 pb-3.5">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-wide text-amber-400">Game Menu</h2>
            <p className="mt-0.5 font-mono-num text-xs text-amber-100/70">
              UID: {profile.uid} · Level {profile.level} · {profile.stats.missionsDone} Missions ·{' '}
              {profile.stats.distanceKm.toFixed(1)} km
            </p>
          </div>
          <button
            type="button"
            onClick={copyUid}
            className="flex items-center gap-1.5 rounded-lg border border-amber-200/20 bg-[#231d19] px-3 py-1.5 text-xs font-semibold text-amber-200 hover:border-amber-400"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied UID' : 'Copy UID'}
          </button>
        </div>

        {/* Live Hero Switcher */}
        <div className="mt-4">
          <span className="mb-2 block text-xs font-semibold text-amber-200/80">Switch Hero Instantly</span>
          <div className="grid grid-cols-5 gap-2">
            {CHARACTER_LIST.map((hero) => {
              const active = profile.characterId === hero.id;
              return (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => onSwitchCharacter(hero.id)}
                  className={`overflow-hidden rounded-lg border text-center transition-transform ${
                    active ? 'border-amber-400 scale-[1.03]' : 'border-amber-200/15 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={hero.portraitUrl}
                    alt={hero.name}
                    referrerPolicy="no-referrer"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="bg-[#14110f] py-1 text-[11px] font-bold text-amber-50">{hero.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hardware & Connection Settings */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200/15 bg-[#1f1a17] px-3 py-2 font-semibold text-amber-100">
            <span className="flex items-center gap-2 whitespace-nowrap">
              <Cpu className="h-4 w-4 text-emerald-400" />
              Graphics
            </span>
            <div className="flex items-center gap-1 rounded-md bg-[#14110f] p-0.5">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSetGraphicsQuality(opt.id)}
                  className={`rounded px-2 py-1 text-[11px] font-bold transition-colors ${
                    graphicsQuality === opt.id
                      ? 'bg-emerald-500 text-[#14110f]'
                      : 'text-amber-100/65 hover:text-amber-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleTouch}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 font-semibold ${
              touchEnabled ? 'border-amber-400/50 bg-[#2a211b] text-amber-300' : 'border-amber-200/15 bg-[#1f1a17] text-amber-100'
            }`}
          >
            <span className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Android Touch UI
            </span>
            <span>{touchEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleOffline}
            className={`flex items-center justify-between rounded-lg border px-3 py-2.5 font-semibold ${
              offlineMode ? 'border-amber-400/50 bg-[#2a211b] text-amber-300' : 'border-emerald-400/35 bg-[#14261f] text-emerald-300'
            }`}
          >
            <span className="flex items-center gap-2">
              {offlineMode ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
              Network Mode
            </span>
            <span>{offlineMode ? 'Offline' : 'Online'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="flex items-center justify-between rounded-lg border border-amber-200/15 bg-[#1f1a17] px-3 py-2.5 font-semibold text-amber-100 hover:border-amber-400/40"
          >
            <span className="flex items-center gap-2">
              <Maximize className="h-4 w-4" />
              Fullscreen View
            </span>
            <span>Toggle</span>
          </button>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between border-t border-amber-200/15 pt-4">
          <button
            type="button"
            onClick={onReturnTitle}
            className="flex items-center gap-1.5 rounded-lg border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            Title Screen
          </button>

          <button
            type="button"
            onClick={onResume}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 font-display text-lg font-extrabold text-[#14110f] hover:bg-amber-400"
          >
            <Play className="h-4 w-4 fill-current" />
            Resume Streets
          </button>
        </div>
      </div>
    </div>
  );
};
