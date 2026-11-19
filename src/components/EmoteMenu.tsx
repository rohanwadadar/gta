import React, { useState } from 'react';
import {
  EMOTE_LIST,
  EmoteId,
  EmoteMeta,
} from '../shared/types';
import {
  Smile,
  X,
  Hand,
  Sparkles,
  HeartHandshake,
  ThumbsUp,
  ThumbsDown,
  Pointer,
  PartyPopper,
  Laugh,
  Music,
  Shield,
  Armchair,
  Ban,
} from 'lucide-react';

interface EmoteMenuProps {
  activeEmote: EmoteId | null;
  onSelectEmote: (id: EmoteId) => void;
  onCancelEmote: () => void;
  onClose: () => void;
}

type TabFilter = 'all' | 'social' | 'express' | 'action';

function getEmoteIcon(id: EmoteId) {
  switch (id) {
    case 'wave':
    case 'goodbye':
      return <Hand className="h-4 w-4" />;
    case 'greeting':
    case 'handshake':
    case 'high_five':
      return <HeartHandshake className="h-4 w-4" />;
    case 'thumbs_up':
      return <ThumbsUp className="h-4 w-4" />;
    case 'thumbs_down':
      return <ThumbsDown className="h-4 w-4" />;
    case 'point_forward':
    case 'point_object':
      return <Pointer className="h-4 w-4" />;
    case 'salute':
      return <Shield className="h-4 w-4" />;
    case 'laugh':
      return <Laugh className="h-4 w-4" />;
    case 'dance':
      return <Music className="h-4 w-4" />;
    case 'celebrate':
      return <PartyPopper className="h-4 w-4" />;
    case 'sit':
      return <Armchair className="h-4 w-4" />;
    case 'clap':
    case 'hands_hips':
    case 'facepalm':
    case 'shrug':
    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

export const EmoteMenu: React.FC<EmoteMenuProps> = ({
  activeEmote,
  onSelectEmote,
  onCancelEmote,
  onClose,
}) => {
  const [tab, setTab] = useState<TabFilter>('all');

  const items: EmoteMeta[] =
    tab === 'all' ? EMOTE_LIST : EMOTE_LIST.filter((e) => e.category === tab);

  return (
    <div className="pointer-events-auto fixed top-20 right-3 z-30 w-[290px] sm:top-auto sm:bottom-20 sm:right-5 sm:w-[340px] rounded-xl border border-amber-300/35 bg-[#181412]/95 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-200/15 px-3 py-2">
        <div className="flex items-center gap-2">
          <Smile className="h-4 w-4 text-amber-400" />
          <span className="font-display text-sm font-bold tracking-wide text-amber-200">
            Gestures &amp; Emotes
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeEmote && (
            <button
              type="button"
              onClick={onCancelEmote}
              className="flex items-center gap-1 rounded-md border border-red-400/50 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-200 hover:bg-red-500/35"
            >
              <Ban className="h-3 w-3" />
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-amber-100/65 hover:bg-[#2a221d] hover:text-amber-100"
            aria-label="Close Emotes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-1 border-b border-amber-200/10 px-2.5 py-1.5">
        {(
          [
            { id: 'all', label: 'All (18)' },
            { id: 'social', label: 'Social' },
            { id: 'express', label: 'Express' },
            { id: 'action', label: 'Actions' },
          ] as { id: TabFilter; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
              tab === t.id
                ? 'bg-amber-500 text-[#14110f]'
                : 'bg-[#241e1a] text-amber-100/75 hover:bg-[#312822]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Emote Grid */}
      <div className="desi-scroll grid max-h-60 grid-cols-3 gap-1.5 overflow-y-auto p-2.5">
        {items.map((em) => {
          const active = activeEmote === em.id;
          return (
            <button
              key={em.id}
              type="button"
              onClick={() => {
                onSelectEmote(em.id);
              }}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-all active:scale-95 ${
                active
                  ? 'border-amber-300 bg-amber-500 text-[#14110f] shadow-md'
                  : 'border-amber-200/15 bg-[#221c18] text-amber-100 hover:border-amber-400/50 hover:bg-[#2d241f]'
              }`}
              title={em.label}
            >
              <span className={active ? 'text-[#14110f]' : 'text-amber-400'}>
                {getEmoteIcon(em.id)}
              </span>
              <span className="line-clamp-1 text-[11px] font-bold leading-tight">
                {em.short}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Hint */}
      <div className="border-t border-amber-200/10 px-3 py-1.5 text-[10px] font-medium text-amber-100/60 flex items-center justify-between">
        <span>Synced live in multiplayer</span>
        <span className="font-bold text-amber-300">X: Quick Wave · Z: Toggle</span>
      </div>
    </div>
  );
};
