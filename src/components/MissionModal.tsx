import React, { useState } from 'react';
import { X, ThumbsUp, Play, Plus, CheckCircle2 } from 'lucide-react';
import {
  CommunityMission,
  DISTRICTS,
  MissionDifficulty,
  MissionType,
  PlayerProfile,
} from '../shared/types';

interface MissionModalProps {
  profile: PlayerProfile;
  missions: CommunityMission[];
  activeMissionId: string | null;
  onStartMission: (mission: CommunityMission) => void;
  onUpvoteMission: (missionId: string) => void;
  onCreateMission: (mission: CommunityMission) => void;
  onClose: () => void;
}

export const MissionModal: React.FC<MissionModalProps> = ({
  profile,
  missions,
  activeMissionId,
  onStartMission,
  onUpvoteMission,
  onCreateMission,
  onClose,
}) => {
  const [tab, setTab] = useState<'board' | 'create'>('board');
  const [filterType, setFilterType] = useState<'all' | MissionType>('all');
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => new Set());

  // Mission creator form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MissionType>('delivery');
  const [districtId, setDistrictId] = useState('chai_chowk');
  const [targetDistrictId, setTargetDistrictId] = useState('furfuri_bazaar');
  const [difficulty, setDifficulty] = useState<MissionDifficulty>('Medium');
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = missions.filter((m) => (filterType === 'all' ? true : m.type === filterType));

  const handleUpvote = (id: string) => {
    if (upvotedIds.has(id)) return;
    setUpvotedIds((prev) => new Set(prev).add(id));
    onUpvoteMission(id);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4 || description.trim().length < 10) {
      setFormError('Please enter a mission title (4+ chars) and short briefing (10+ chars).');
      return;
    }
    const reward = difficulty === 'Easy' ? 750 : difficulty === 'Medium' ? 1200 : 1800;
    const newMission: CommunityMission = {
      id: `cmis-${profile.uid}-${Date.now()}`,
      title: title.trim().slice(0, 48),
      description: description.trim().slice(0, 160),
      type,
      authorUid: profile.uid,
      authorName: profile.name,
      districtId,
      targetDistrictId: type === 'collect' ? districtId : targetDistrictId,
      reward,
      difficulty,
      upvotes: 1,
      completions: 0,
      createdAt: Date.now(),
      isOfficial: false,
    };
    onCreateMission(newMission);
    setTitle('');
    setDescription('');
    setFormError(null);
    setTab('board');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-amber-200/20 bg-[#181412] shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/15 px-5 py-3.5">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-amber-400">
              Furfuri Community Missions
            </h2>
            <p className="text-xs text-amber-100/70">
              Play street jobs or publish your own mission for every multiplayer player
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-[#251f1b] p-1 text-xs">
              <button
                type="button"
                onClick={() => setTab('board')}
                className={`rounded-md px-3 py-1.5 font-semibold whitespace-nowrap shrink-0 ${
                  tab === 'board' ? 'bg-amber-500 text-[#14110f]' : 'text-amber-100/75 hover:text-amber-50'
                }`}
              >
                Mission Board ({missions.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 font-semibold whitespace-nowrap shrink-0 ${
                  tab === 'create' ? 'bg-amber-500 text-[#14110f]' : 'text-amber-100/75 hover:text-amber-50'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Mission
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200/15 text-amber-100 hover:border-amber-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {tab === 'board' ? (
          <>
            {/* Interactive Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-amber-200/10 px-5 py-2.5">
              {(
                [
                  { id: 'all', label: 'All Jobs' },
                  { id: 'delivery', label: 'Delivery' },
                  { id: 'collect', label: 'Collect' },
                  { id: 'race', label: 'Street Race' },
                  { id: 'takedown', label: 'Takedown' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    filterType === f.id
                      ? 'bg-[#2f2620] text-amber-300 border border-amber-400/40'
                      : 'text-amber-100/65 hover:text-amber-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Mission List */}
            <div className="desi-scroll flex-1 space-y-2.5 overflow-y-auto p-5">
              {filtered.map((m) => {
                const startD = DISTRICTS.find((d) => d.id === m.districtId)?.name || m.districtId;
                const targetD = DISTRICTS.find((d) => d.id === m.targetDistrictId)?.name || m.targetDistrictId;
                const completed = profile.completedMissionIds.includes(m.id);
                const isActive = activeMissionId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col justify-between gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center ${
                      isActive ? 'border-amber-400 bg-[#2a211b]' : 'border-amber-200/12 bg-[#1f1a17]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-amber-50">{m.title}</h3>
                        {completed && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                      </div>
                      <p className="mt-1 text-xs text-amber-100/75">{m.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-100/55">
                        <span className="capitalize text-amber-300">{m.type}</span>
                        <span aria-hidden="true">·</span>
                        <span>{m.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {m.type === 'collect' ? startD : `${startD} → ${targetD}`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>By {m.isOfficial ? 'Furfuri Official' : `${m.authorName} (${m.authorUid})`}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{m.completions} runs</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                      <span className="font-mono-num text-sm font-bold text-emerald-400">
                        +₹{m.reward.toLocaleString('en-IN')}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpvote(m.id)}
                          disabled={upvotedIds.has(m.id)}
                          className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                            upvotedIds.has(m.id)
                              ? 'border-amber-400/50 text-amber-300'
                              : 'border-amber-200/15 text-amber-100/75 hover:border-amber-300'
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          <span className="font-mono-num">{m.upvotes}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onStartMission(m);
                            onClose();
                          }}
                          className="flex items-center gap-1 rounded-md bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-[#14110f] hover:bg-amber-400 whitespace-nowrap shrink-0"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          {isActive ? 'Restart' : 'Start'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Community Mission Creator */
          <form onSubmit={handlePublish} className="desi-scroll flex-1 space-y-4 overflow-y-auto p-5">
            {formError && (
              <div className="rounded-md border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs text-red-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-200/80">Mission Title</span>
                <input
                  type="text"
                  value={title}
                  maxLength={48}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midnight Jalebi Express"
                  className="w-full rounded-lg border border-amber-200/20 bg-[#1f1a17] px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-400"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-200/80">Mission Type</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MissionType)}
                  className="w-full rounded-lg border border-amber-200/20 bg-[#1f1a17] px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-400"
                >
                  <option value="delivery">Delivery Run (Pickup → Dropoff)</option>
                  <option value="collect">Samosa / Loot Stash Hunt</option>
                  <option value="race">5-Point Street Checkpoint Race</option>
                  <option value="takedown">Rogue Getaway Car Takedown</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-amber-200/80">Street Briefing</span>
              <textarea
                value={description}
                maxLength={160}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell players what to do across Furfuri Nagri..."
                className="w-full rounded-lg border border-amber-200/20 bg-[#1f1a17] px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-400"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-200/80">Start District</span>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full rounded-lg border border-amber-200/20 bg-[#1f1a17] px-3 py-2 text-sm text-amber-50 outline-none"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-200/80">Target District</span>
                <select
                  value={targetDistrictId}
                  disabled={type === 'collect'}
                  onChange={(e) => setTargetDistrictId(e.target.value)}
                  className="w-full rounded-lg border border-amber-200/20 bg-[#1f1a17] px-3 py-2 text-sm text-amber-50 outline-none disabled:opacity-50"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-amber-200/80">Difficulty &amp; Payout</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as MissionDifficulty)}
                  className="w-full rounded-lg border border-amber-200/20 bg-[#1f1a17] px-3 py-2 text-sm text-amber-50 outline-none"
                >
                  <option value="Easy">Easy · ₹750</option>
                  <option value="Medium">Medium · ₹1,200</option>
                  <option value="Desi Chaos">Desi Chaos · ₹1,800</option>
                </select>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-amber-200/10 pt-4">
              <span className="text-xs text-amber-100/60">
                Publishing as {profile.name} ({profile.uid}) · Works online or queues offline
              </span>
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-bold text-[#14110f] hover:bg-amber-400"
              >
                Publish Community Mission
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
