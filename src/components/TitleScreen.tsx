import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Play, Users } from 'lucide-react';
import { CharacterId } from '../shared/types';
import { CHARACTER_LIST, CHARACTERS } from '../game/constants';

interface TitleScreenProps {
  initialUid: string;
  initialName: string;
  initialChar: CharacterId;
  offlineDefault: boolean;
  onStartGame: (uid: string, name: string, charId: CharacterId, offline: boolean) => void;
  onOpenMpGuide: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  initialUid,
  initialName,
  initialChar,
  offlineDefault,
  onStartGame,
  onOpenMpGuide,
}) => {
  const [uid, setUid] = useState(initialUid);
  const [name, setName] = useState(initialName);
  const [selectedChar, setSelectedChar] = useState<CharacterId>(initialChar);
  const [offlineMode, setOfflineMode] = useState(offlineDefault);

  const activeChar = CHARACTERS[selectedChar];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT') {
        if (e.key === 'Enter') onStartGame(uid, name, selectedChar, offlineMode);
        return;
      }
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame(uid, name, selectedChar, offlineMode);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [uid, name, selectedChar, offlineMode, onStartGame]);

  const regenerateUid = () => setUid(`IND-${Math.floor(1000 + Math.random() * 9000)}`);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between overflow-y-auto pointer-events-none">
      {/* Subtle left contrast gradient so the live orbiting 3D Furfuri Nagri shines on the right */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-r from-[#14110f]/92 via-[#14110f]/58 to-transparent" />

      <div className="relative z-10 flex flex-1 items-center px-5 py-6 sm:px-10 lg:px-14">
        <div className="pointer-events-auto w-full max-w-[520px] space-y-4">
          {/* Bespoke 3D Title SVG Lockup */}
          <svg
            viewBox="0 0 500 118"
            className="w-full max-w-[420px] drop-shadow-[0_6px_16px_rgba(0,0,0,0.75)]"
            role="img"
            aria-label="Furfuri Grand Auto 3D"
          >
            <defs>
              <linearGradient id="saffronGold3d" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>
            <text
              x="4"
              y="58"
              fill="url(#saffronGold3d)"
              stroke="#14110f"
              strokeWidth="7"
              paintOrder="stroke"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontSize="64"
              letterSpacing="2"
            >
              FURFURI 3D
            </text>
            <text
              x="6"
              y="108"
              fill="#f7f1e6"
              stroke="#14110f"
              strokeWidth="7"
              paintOrder="stroke"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontSize="50"
              letterSpacing="3"
            >
              GRAND AUTO
            </text>
          </svg>

          {/* Hero Picker — Visual portraits, crisp 1-line power */}
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2">
              {CHARACTER_LIST.map((hero) => {
                const isSelected = hero.id === selectedChar;
                return (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => setSelectedChar(hero.id)}
                    className={`overflow-hidden rounded-lg border text-center transition-transform duration-150 ${
                      isSelected
                        ? 'border-amber-400 scale-[1.04] shadow-[0_0_0_2px_rgba(245,158,11,0.45)]'
                        : 'border-amber-100/15 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={hero.portraitUrl}
                      alt={hero.name}
                      referrerPolicy="no-referrer"
                      className="aspect-square w-full object-cover"
                    />
                    <div className="bg-[#181412] py-1 text-xs font-bold text-amber-50">{hero.name}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-amber-200/15 bg-[#181412]/90 px-3 py-2 text-xs">
              <span className="font-bold text-amber-400">{activeChar.specialName}</span>
              <span className="font-mono-num text-amber-100/75">HP {activeChar.maxHp}</span>
            </div>
          </div>

          {/* Instant UID + Street Name (No Login Required) */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center overflow-hidden rounded-lg border border-amber-200/20 bg-[#181412]/95">
              <input
                type="text"
                value={uid}
                maxLength={16}
                onChange={(e) => setUid(e.target.value.toUpperCase())}
                aria-label="Player UID"
                placeholder="UID"
                className="font-mono-num w-full bg-transparent px-3 py-2.5 text-sm font-bold text-amber-300 outline-none"
              />
              <button
                type="button"
                onClick={regenerateUid}
                title="New UID"
                className="flex h-9 w-9 shrink-0 items-center justify-center text-amber-200/70 hover:text-amber-300"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text"
              value={name}
              maxLength={18}
              onChange={(e) => setName(e.target.value)}
              aria-label="Player Name"
              placeholder="Name"
              className="w-full rounded-lg border border-amber-200/20 bg-[#181412]/95 px-3 py-2.5 text-sm font-semibold text-amber-50 outline-none focus:border-amber-400"
            />
          </div>

          {/* Primary Play CTA + Multiplayer How-To Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onStartGame(uid, name, selectedChar, offlineMode)}
              className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 font-display text-2xl font-extrabold tracking-wide text-[#14110f] transition-colors hover:bg-amber-400 active:scale-[0.99] whitespace-nowrap shrink-0"
            >
              <Play className="h-5 w-5 fill-current" />
              PLAY 3D
            </button>

            <button
              type="button"
              onClick={onOpenMpGuide}
              className="flex min-h-[50px] items-center gap-1.5 rounded-lg border border-amber-300/35 bg-[#1b1613]/95 px-4 py-2.5 text-xs font-bold text-amber-200 hover:border-amber-400 whitespace-nowrap shrink-0"
            >
              <Users className="h-4 w-4 text-amber-400" />
              Multiplayer
            </button>

            <button
              type="button"
              onClick={() => setOfflineMode((p) => !p)}
              title="Toggle Online / Offline"
              className={`flex min-h-[50px] w-12 items-center justify-center rounded-lg border ${
                offlineMode
                  ? 'border-amber-400/50 bg-[#2a211b] text-amber-300'
                  : 'border-emerald-400/40 bg-[#14261f] text-emerald-300'
              }`}
            >
              {offlineMode ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Minimal single flat control-hint line */}
      <div className="pointer-events-auto relative z-10 bg-[#14110f]/85 px-4 py-2 text-center text-xs text-amber-100/70">
        WASD Move · Mouse 360° Look (L Lock / Right-Click Aim) · E Ride / Take Gun · G Grab / Throw · Space Jump · Q Power
      </div>
    </div>
  );
};
