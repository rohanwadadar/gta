import React, { useState } from 'react';
import { X, Check, Lock, Volume2, Car } from 'lucide-react';
import { PlayerProfile, VehicleType, createDefaultVehicleConfig } from '../shared/types';
import { DECAL_OPTIONS, HORN_OPTIONS, PAINT_JOBS, VEHICLE_SPECS } from '../game/constants';
import { soundEngine } from '../game/audio';

interface GarageModalProps {
  profile: PlayerProfile;
  onUpdateProfile: (next: PlayerProfile, spawnNow?: boolean) => void;
  onClose: () => void;
}

const VEHICLE_ORDER: VehicleType[] = ['auto', 'bullet', 'ambassador', 'thar', 'truck', 'police'];

export const GarageModal: React.FC<GarageModalProps> = ({ profile, onUpdateProfile, onClose }) => {
  const [selectedType, setSelectedType] = useState<VehicleType>(profile.activeVehicleType);
  const [feedback, setFeedback] = useState<string | null>(null);

  const spec = VEHICLE_SPECS[selectedType];
  const owned = profile.ownedVehicles.includes(selectedType);
  const cfg = profile.garageConfigs[selectedType] || createDefaultVehicleConfig(selectedType);

  const showMsg = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  const buyVehicle = () => {
    if (profile.rupees < spec.price) {
      showMsg(`Need ₹${(spec.price - profile.rupees).toLocaleString('en-IN')} more! Complete a mission.`);
      return;
    }
    const next: PlayerProfile = {
      ...profile,
      rupees: profile.rupees - spec.price,
      ownedVehicles: [...profile.ownedVehicles, selectedType],
      activeVehicleType: selectedType,
      updatedAt: Date.now(),
    };
    soundEngine.playMissionComplete();
    onUpdateProfile(next, false);
    showMsg(`Purchased ${spec.name}!`);
  };

  const applyPaint = (paintId: string, price: number) => {
    if (!owned) return;
    if (cfg.paintId === paintId) return;
    if (profile.rupees < price) {
      showMsg(`Need ₹${price} for this paint job.`);
      return;
    }
    const next: PlayerProfile = {
      ...profile,
      rupees: profile.rupees - price,
      garageConfigs: {
        ...profile.garageConfigs,
        [selectedType]: { ...cfg, paintId },
      },
      updatedAt: Date.now(),
    };
    soundEngine.playPickup(false);
    onUpdateProfile(next, false);
    showMsg('Fresh Desi paint applied!');
  };

  const applyDecal = (decalId: typeof cfg.decalId, price: number) => {
    if (!owned) return;
    if (cfg.decalId === decalId) return;
    if (profile.rupees < price) {
      showMsg(`Need ₹${price} for this decal.`);
      return;
    }
    const next: PlayerProfile = {
      ...profile,
      rupees: profile.rupees - price,
      garageConfigs: {
        ...profile.garageConfigs,
        [selectedType]: { ...cfg, decalId },
      },
      updatedAt: Date.now(),
    };
    soundEngine.playPickup(false);
    onUpdateProfile(next, false);
    showMsg('Street decal installed!');
  };

  const applyHorn = (hornType: typeof cfg.hornType, price: number) => {
    soundEngine.playHorn(hornType);
    if (!owned || cfg.hornType === hornType) return;
    if (profile.rupees < price) {
      showMsg(`Need ₹${price} for this horn.`);
      return;
    }
    const next: PlayerProfile = {
      ...profile,
      rupees: profile.rupees - price,
      garageConfigs: {
        ...profile.garageConfigs,
        [selectedType]: { ...cfg, hornType },
      },
      updatedAt: Date.now(),
    };
    onUpdateProfile(next, false);
    showMsg('Horn upgraded!');
  };

  const upgradeStat = (key: 'engineLevel' | 'handlingLevel' | 'armorLevel', label: string) => {
    if (!owned) return;
    const currentLvl = cfg[key];
    if (currentLvl >= 4) return;
    const cost = currentLvl * 450;
    if (profile.rupees < cost) {
      showMsg(`Need ₹${cost} to upgrade ${label}.`);
      return;
    }
    const next: PlayerProfile = {
      ...profile,
      rupees: profile.rupees - cost,
      garageConfigs: {
        ...profile.garageConfigs,
        [selectedType]: { ...cfg, [key]: currentLvl + 1 },
      },
      updatedAt: Date.now(),
    };
    soundEngine.playPickup(true);
    onUpdateProfile(next, false);
    showMsg(`${label} upgraded to Level ${currentLvl + 1}!`);
  };

  const driveOut = () => {
    if (!owned) return;
    const next: PlayerProfile = {
      ...profile,
      activeVehicleType: selectedType,
      updatedAt: Date.now(),
    };
    onUpdateProfile(next, true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-amber-200/20 bg-[#181412] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-200/15 px-5 py-3.5">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-wide text-amber-400">
              Raju&apos;s Desi Garage
            </h2>
            <p className="text-xs text-amber-100/70">
              Local Indian Vehicle Customization · Synced live in Multiplayer
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono-num text-base font-bold text-emerald-400">
              ₹{profile.rupees.toLocaleString('en-IN')}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200/15 text-amber-100 hover:border-amber-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="desi-scroll grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-12">
          {/* Left Column: Vehicle Selector */}
          <div className="space-y-2 md:col-span-5">
            <span className="text-xs font-semibold text-amber-200/75">Select Indian Vehicle</span>
            {VEHICLE_ORDER.map((vt) => {
              const s = VEHICLE_SPECS[vt];
              const isOwned = profile.ownedVehicles.includes(vt);
              const isSelected = vt === selectedType;
              return (
                <button
                  key={vt}
                  type="button"
                  onClick={() => setSelectedType(vt)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'border-amber-400 bg-[#2a211b]'
                      : 'border-amber-200/10 bg-[#1f1a17] hover:border-amber-200/30'
                  }`}
                >
                  <div>
                    <div className="text-sm font-bold text-amber-50">{s.name}</div>
                    <div className="text-xs text-amber-100/60">{s.subtitle}</div>
                  </div>
                  <div className="text-right text-xs font-semibold">
                    {isOwned ? (
                      <span className="text-emerald-400">Owned</span>
                    ) : (
                      <span className="font-mono-num text-amber-300">₹{s.price.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Customization Controls */}
          <div className="space-y-4 md:col-span-7">
            <div className="flex items-center justify-between border-b border-amber-200/10 pb-3">
              <div>
                <h3 className="font-display text-xl font-bold text-amber-50">{spec.name}</h3>
                <p className="font-mono-num text-xs text-amber-100/70">
                  Top Speed {Math.round(spec.maxSpeed * (1 + (cfg.engineLevel - 1) * 0.14) * 0.24)} km/h · Armor{' '}
                  {spec.maxHp + (cfg.armorLevel - 1) * 45} HP
                </p>
              </div>
              {!owned && (
                <button
                  type="button"
                  onClick={buyVehicle}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-[#14110f] hover:bg-amber-400 whitespace-nowrap shrink-0"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Buy ₹{spec.price.toLocaleString('en-IN')}
                </button>
              )}
            </div>

            {feedback && (
              <div className="rounded-md border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200">
                {feedback}
              </div>
            )}

            {/* Paint Jobs */}
            <div>
              <span className="mb-2 block text-xs font-semibold text-amber-200/80">Paint Job</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAINT_JOBS.map((paint) => {
                  const active = cfg.paintId === paint.id;
                  return (
                    <button
                      key={paint.id}
                      type="button"
                      disabled={!owned}
                      onClick={() => applyPaint(paint.id, paint.price)}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs disabled:opacity-45 ${
                        active ? 'border-amber-400 bg-[#2a211b]' : 'border-amber-200/15 bg-[#1f1a17] hover:border-amber-200/35'
                      }`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-white/25"
                        style={{ background: `linear-gradient(135deg, ${paint.body} 50%, ${paint.roof} 50%)` }}
                      />
                      <span className="min-w-0 flex-1 truncate text-amber-50">{paint.name}</span>
                      {active ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <span className="font-mono-num text-[11px] text-amber-300">
                          {paint.price === 0 ? 'Free' : `₹${paint.price}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desi Decals */}
            <div>
              <span className="mb-2 block text-xs font-semibold text-amber-200/80">Desi Street Art &amp; Decals</span>
              <div className="grid grid-cols-2 gap-2">
                {DECAL_OPTIONS.map((dec) => {
                  const active = cfg.decalId === dec.id;
                  return (
                    <button
                      key={dec.id}
                      type="button"
                      disabled={!owned}
                      onClick={() => applyDecal(dec.id, dec.price)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs disabled:opacity-45 ${
                        active ? 'border-amber-400 bg-[#2a211b]' : 'border-amber-200/15 bg-[#1f1a17] hover:border-amber-200/35'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-amber-50">{dec.name}</span>
                        <span className="font-mono-num text-[11px] text-amber-300">
                          {active ? 'Equipped' : dec.price === 0 ? 'Free' : `₹${dec.price}`}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-amber-100/60">{dec.tagline}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Musical Horns */}
            <div>
              <span className="mb-2 block text-xs font-semibold text-amber-200/80">Pressure &amp; Musical Horn (Click to Preview)</span>
              <div className="flex flex-wrap gap-2">
                {HORN_OPTIONS.map((h) => {
                  const active = cfg.hornType === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => applyHorn(h.id, h.price)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${
                        active ? 'border-amber-400 bg-[#2a211b] text-amber-200' : 'border-amber-200/15 bg-[#1f1a17] text-amber-100/80'
                      }`}
                    >
                      <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                      <span>{h.name}</span>
                      {!active && h.price > 0 && <span className="font-mono-num text-amber-300">₹{h.price}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Performance Upgrades */}
            <div>
              <span className="mb-2 block text-xs font-semibold text-amber-200/80">Performance Upgrades</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: 'engineLevel', label: 'Turbo Engine' },
                    { key: 'handlingLevel', label: 'Desi Suspension' },
                    { key: 'armorLevel', label: 'Steel Bumper' },
                  ] as const
                ).map((item) => {
                  const lvl = cfg[item.key];
                  const maxed = lvl >= 4;
                  const cost = lvl * 450;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!owned || maxed}
                      onClick={() => upgradeStat(item.key, item.label)}
                      className="rounded-lg border border-amber-200/15 bg-[#1f1a17] p-2.5 text-left text-xs hover:border-amber-400/50 disabled:opacity-55"
                    >
                      <div className="font-semibold text-amber-50">{item.label}</div>
                      <div className="mt-1 flex gap-1">
                        {[1, 2, 3, 4].map((dot) => (
                          <span
                            key={dot}
                            className={`h-1.5 flex-1 rounded-xs ${dot <= lvl ? 'bg-amber-400' : 'bg-amber-100/15'}`}
                          />
                        ))}
                      </div>
                      <div className="font-mono-num mt-1.5 text-[11px] text-emerald-400">
                        {maxed ? 'Max Level' : `Upgrade ₹${cost}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-amber-200/15 px-5 py-3">
          <span className="text-xs text-amber-100/60">Auto-saves offline &amp; broadcasts to multiplayer players</span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-amber-200/20 px-4 py-2 text-xs font-semibold text-amber-100 hover:border-amber-200/40"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!owned}
              onClick={driveOut}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-[#14110f] hover:bg-amber-400 disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Car className="h-4 w-4" />
              Drive Out Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
