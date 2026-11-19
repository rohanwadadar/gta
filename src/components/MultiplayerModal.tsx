import React, { useState } from 'react';
import { X, Link2, Copy, Check, Users, Navigation, Wifi, WifiOff } from 'lucide-react';
import { PlayerProfile, RemotePlayerState } from '../shared/types';
import { CHARACTERS } from '../game/constants';
import { ConnectionStatus } from '../game/network';

interface MultiplayerModalProps {
  profile: PlayerProfile;
  connectionStatus: ConnectionStatus;
  remotePlayers: RemotePlayerState[];
  onTeleportToPlayer: (player: RemotePlayerState) => void;
  onToggleOffline: () => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  profile,
  connectionStatus,
  remotePlayers,
  onTeleportToPlayer,
  onToggleOffline,
  onClose,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  const copyUid = () => {
    navigator.clipboard?.writeText(profile.uid).catch(() => {});
    setCopiedUid(true);
    window.setTimeout(() => setCopiedUid(false), 1800);
  };

  const isOnline = connectionStatus === 'online';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg rounded-xl border border-amber-200/20 bg-[#181412] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-200/15 pb-3">
          <div className="flex items-center gap-2.5">
            <Users className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-amber-400">
              Play Multiplayer
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200/15 text-amber-100 hover:border-amber-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Visual 3-Step Guide (Ultra-short, zero walls of text) */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-amber-200/12 bg-[#211b18] p-3">
            <div className="font-display text-xl font-extrabold text-amber-400">01</div>
            <div className="mt-0.5 text-xs font-bold text-amber-50">Share Link</div>
            <div className="mt-0.5 text-[11px] text-amber-100/60">Send to friend</div>
          </div>
          <div className="rounded-lg border border-amber-200/12 bg-[#211b18] p-3">
            <div className="font-display text-xl font-extrabold text-amber-400">02</div>
            <div className="mt-0.5 text-xs font-bold text-amber-50">Enter Any UID</div>
            <div className="mt-0.5 text-[11px] text-amber-100/60">No password</div>
          </div>
          <div className="rounded-lg border border-amber-200/12 bg-[#211b18] p-3">
            <div className="font-display text-xl font-extrabold text-amber-400">03</div>
            <div className="mt-0.5 text-xs font-bold text-amber-50">Tap Play 3D</div>
            <div className="mt-0.5 text-[11px] text-amber-100/60">Auto-joins city</div>
          </div>
        </div>

        {/* 1-Tap Copy Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={copyLink}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-bold text-[#14110f] hover:bg-amber-400"
          >
            {copiedLink ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copiedLink ? 'Link Copied!' : 'Copy Game Link'}
          </button>

          <button
            type="button"
            onClick={copyUid}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-amber-200/20 bg-[#231d19] px-4 py-2.5 text-xs font-bold text-amber-200 hover:border-amber-400"
          >
            {copiedUid ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span className="font-mono-num">{copiedUid ? 'Copied!' : profile.uid}</span>
          </button>
        </div>

        {/* Live Players in City */}
        <div className="mt-4 border-t border-amber-200/15 pt-3.5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-200/80">
              Live Players ({remotePlayers.length + 1})
            </span>
            <button
              type="button"
              onClick={onToggleOffline}
              className={`flex items-center gap-1.5 font-semibold ${
                isOnline ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isOnline ? 'Online' : 'Offline — Tap to Connect'}
            </button>
          </div>

          <div className="desi-scroll max-h-40 space-y-1.5 overflow-y-auto">
            {remotePlayers.length === 0 ? (
              <div className="rounded-lg border border-amber-200/10 bg-[#1f1a17] px-3.5 py-3 text-center text-xs text-amber-100/65">
                Open the copied link in a second tab or phone to see friends live in 3D!
              </div>
            ) : (
              remotePlayers.map((rp) => {
                const hero = CHARACTERS[rp.characterId] || CHARACTERS.motu;
                return (
                  <div
                    key={rp.uid}
                    className="flex items-center justify-between rounded-lg border border-amber-200/12 bg-[#1f1a17] px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={hero.portraitUrl}
                        alt={hero.name}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-md object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-amber-50">{rp.name}</div>
                        <div className="font-mono-num text-[11px] text-amber-200/60">
                          {rp.uid} · {hero.name}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onTeleportToPlayer(rp);
                        onClose();
                      }}
                      className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Warp
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
