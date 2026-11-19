import React, { useMemo, useState } from 'react';
import {
  X,
  Navigation,
  Zap,
  Wrench,
  Banknote,
  Coffee,
  Crosshair,
  Flame,
  MapPin,
  Trash2,
  Trophy,
} from 'lucide-react';
import { DISTRICTS, RemotePlayerState, WORLD_SIZE } from '../shared/types';
import { ROAD_CENTERS } from '../game/mapGenerator';
import { MapPoiData } from '../game/engine';

interface CityMapModalProps {
  poiData: MapPoiData;
  remotePlayers: RemotePlayerState[];
  onSetWaypoint: (x: number, y: number, label: string) => void;
  onClearWaypoint: () => void;
  onFastTravel: (x: number, y: number, label: string) => void;
  onClose: () => void;
}

interface SelectedPoint {
  x: number;
  y: number;
  label: string;
  subtitle: string;
}

export const CityMapModal: React.FC<CityMapModalProps> = ({
  poiData,
  remotePlayers,
  onSetWaypoint,
  onClearWaypoint,
  onFastTravel,
  onClose,
}) => {
  const [selected, setSelected] = useState<SelectedPoint | null>(() =>
    poiData.waypoint
      ? {
          x: poiData.waypoint.x,
          y: poiData.waypoint.y,
          label: poiData.waypoint.label,
          subtitle: 'Active 3D Sky Beam',
        }
      : {
          x: poiData.garage.x,
          y: poiData.garage.y,
          label: "Raju's Garage",
          subtitle: 'Customize & Repair Rides',
        }
  );

  const quickSpots = useMemo(() => {
    const px = poiData.player.x;
    const py = poiData.player.y;
    const nearest = <T extends { x: number; y: number }>(list: T[]): T | null => {
      let best: T | null = null;
      let bestD = Infinity;
      for (const item of list) {
        const d = Math.hypot(item.x - px, item.y - py);
        if (d < bestD) {
          bestD = d;
          best = item;
        }
      }
      return best;
    };

    const nearAtm = nearest(poiData.stations.filter((s) => s.kind === 'atm'));
    const nearChai = nearest(poiData.stations.filter((s) => s.kind === 'chai'));
    const nearArms = nearest(poiData.stations.filter((s) => s.kind === 'arms'));
    const nearRamp = nearest(poiData.ramps);

    return [
      {
        id: 'garage',
        label: 'Garage',
        sub: 'Mods & Paint',
        x: poiData.garage.x,
        y: poiData.garage.y,
        color: 'text-emerald-300 border-emerald-400/35 bg-emerald-950/50',
        icon: Wrench,
      },
      nearAtm && {
        id: 'atm',
        label: 'ATM +₹500',
        sub: nearAtm.name,
        x: nearAtm.x,
        y: nearAtm.y,
        color: 'text-green-300 border-green-400/35 bg-green-950/50',
        icon: Banknote,
      },
      nearChai && {
        id: 'chai',
        label: 'Chai Heal',
        sub: nearChai.name,
        x: nearChai.x,
        y: nearChai.y,
        color: 'text-amber-300 border-amber-400/35 bg-amber-950/50',
        icon: Coffee,
      },
      nearArms && {
        id: 'arms',
        label: 'Gun Shop',
        sub: nearArms.name,
        x: nearArms.x,
        y: nearArms.y,
        color: 'text-sky-300 border-sky-400/35 bg-sky-950/50',
        icon: Crosshair,
      },
      nearRamp && {
        id: 'ramp',
        label: 'Stunt Ramp',
        sub: nearRamp.label,
        x: nearRamp.x,
        y: nearRamp.y,
        color: 'text-orange-300 border-orange-400/35 bg-orange-950/50',
        icon: Flame,
      },
    ].filter(Boolean) as {
      id: string;
      label: string;
      sub: string;
      x: number;
      y: number;
      color: string;
      icon: React.ComponentType<{ className?: string }>;
    }[];
  }, [poiData]);

  const toPct = (v: number) => `${(v / WORLD_SIZE) * 100}%`;

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0.03, Math.min(0.97, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0.03, Math.min(0.97, (e.clientY - rect.top) / rect.height));
    const wx = Math.round(nx * WORLD_SIZE);
    const wy = Math.round(ny * WORLD_SIZE);
    setSelected({
      x: wx,
      y: wy,
      label: 'Custom GPS Pin',
      subtitle: `${Math.round(Math.hypot(wx - poiData.player.x, wy - poiData.player.y) / 6)}m away`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0c0a]/90 p-3 sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-200/20 bg-[#181412] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-200/15 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-400" />
              <h2 className="font-display text-lg font-extrabold tracking-wide text-amber-100">
                FURFURI NAGRI GPS MAP
              </h2>
            </div>
            <span className="font-mono-num flex items-center gap-1 text-xs font-bold text-amber-300">
              <Trophy className="h-3.5 w-3.5" />
              {poiData.easterEggs.filter((e) => e.found).length}/{poiData.easterEggs.length} Secrets
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200/20 bg-[#251f1b] text-amber-100 hover:border-amber-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Interactive Map + Side Quick-Jump */}
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-[1fr_240px]">
          {/* Interactive Square Tactical Map */}
          <div className="flex items-center justify-center">
            <div
              onClick={handleMapClick}
              className="relative aspect-square w-full max-w-[490px] cursor-crosshair overflow-hidden rounded-xl border border-amber-200/25 bg-[#1d1815] shadow-inner select-none"
            >
              {/* Bada Maidan Green Cricket Ground */}
              <div
                className="pointer-events-none absolute rounded-md bg-emerald-800/45 border border-emerald-500/30"
                style={{
                  left: toPct(1365),
                  top: toPct(2965),
                  width: toPct(470),
                  height: toPct(470),
                }}
              />

              {/* Central Park Green Gardens */}
              <div
                className="pointer-events-none absolute rounded-md bg-emerald-700/40 border border-emerald-400/30"
                style={{
                  left: toPct(2945),
                  top: toPct(3745),
                  width: toPct(510),
                  height: toPct(510),
                }}
              />

              {/* Temple Square Sandstone Plaza */}
              <div
                className="pointer-events-none absolute rounded-md bg-amber-700/35 border border-amber-400/30"
                style={{
                  left: toPct(545),
                  top: toPct(2145),
                  width: toPct(510),
                  height: toPct(510),
                }}
              />

              {/* City Road Grid */}
              {ROAD_CENTERS.map((r) => (
                <React.Fragment key={r}>
                  <div
                    className="pointer-events-none absolute left-0 right-0 h-[3.2%] -translate-y-1/2 bg-[#3c3633]"
                    style={{ top: toPct(r) }}
                  />
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 w-[3.2%] -translate-x-1/2 bg-[#3c3633]"
                    style={{ left: toPct(r) }}
                  />
                </React.Fragment>
              ))}

              {/* Chai Chowk Center Roundabout */}
              <div
                className="pointer-events-none absolute h-[5.5%] w-[5.5%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-500/70 bg-sky-500/35"
                style={{ left: toPct(WORLD_SIZE / 2), top: toPct(WORLD_SIZE / 2) }}
              />

              {/* District Labels */}
              {DISTRICTS.map((d) => (
                <div
                  key={d.id}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold tracking-wider text-amber-100/50 uppercase whitespace-nowrap"
                  style={{ left: toPct(d.x), top: toPct(d.y - 110) }}
                >
                  {d.name}
                </div>
              ))}

              {/* Raju's Garage */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected({
                    x: poiData.garage.x,
                    y: poiData.garage.y,
                    label: "Raju's Garage",
                    subtitle: 'Upgrade & Customize Cars',
                  });
                }}
                title="Raju's Garage"
                className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-600 text-white shadow-md hover:scale-110"
                style={{ left: toPct(poiData.garage.x), top: toPct(poiData.garage.y) }}
              >
                <Wrench className="h-3.5 w-3.5" />
              </button>

              {/* ATMs, Chai Stalls, Arms Gun Shops */}
              {poiData.stations.map((st) => {
                const style =
                  st.kind === 'atm'
                    ? 'border-green-300 bg-green-600 text-white'
                    : st.kind === 'chai'
                    ? 'border-amber-200 bg-amber-500 text-[#14110f]'
                    : 'border-sky-200 bg-sky-500 text-[#14110f]';
                const sub =
                  st.kind === 'atm'
                    ? 'Withdraw +₹500 Cash'
                    : st.kind === 'chai'
                    ? 'Full HP + Power Heal (₹50)'
                    : 'Buy SMG, Shotgun & AK-47 (₹250)';
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected({ x: st.x, y: st.y, label: st.name, subtitle: sub });
                    }}
                    title={st.name}
                    className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border shadow hover:scale-110 ${style}`}
                    style={{ left: toPct(st.x), top: toPct(st.y) }}
                  >
                    {st.kind === 'atm' ? (
                      <Banknote className="h-3.5 w-3.5" />
                    ) : st.kind === 'chai' ? (
                      <Coffee className="h-3.5 w-3.5" />
                    ) : (
                      <Crosshair className="h-3.5 w-3.5" />
                    )}
                  </button>
                );
              })}

              {/* 6 Stunt Jump Ramps */}
              {poiData.ramps.map((rm) => (
                <button
                  key={rm.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected({
                      x: rm.x,
                      y: rm.y,
                      label: rm.label,
                      subtitle: 'High-Speed Stunt Jump (+₹300)',
                    });
                  }}
                  title={rm.label}
                  className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border border-orange-300 bg-orange-600 text-white shadow hover:scale-110"
                  style={{ left: toPct(rm.x), top: toPct(rm.y) }}
                >
                  <Flame className="h-3 w-3" />
                </button>
              ))}

              {/* Discovered Golden Easter Eggs */}
              {poiData.easterEggs
                .filter((eg) => eg.found)
                .map((eg) => (
                  <button
                    key={eg.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected({
                        x: eg.x,
                        y: eg.y,
                        label: 'Golden Secret Found',
                        subtitle: 'Collected Easter Egg Trophy (+₹1,000)',
                      });
                    }}
                    title="Discovered Golden Secret"
                    className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-yellow-200 bg-yellow-400 text-[#14110f] shadow"
                    style={{ left: toPct(eg.x), top: toPct(eg.y) }}
                  >
                    <Trophy className="h-3 w-3" />
                  </button>
                ))}

              {/* Active Mission Target */}
              {poiData.activeMissionTarget && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected({
                      x: poiData.activeMissionTarget!.x,
                      y: poiData.activeMissionTarget!.y,
                      label: 'Active Mission',
                      subtitle: poiData.activeMissionTarget!.label,
                    });
                  }}
                  className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-200 bg-yellow-400/80 shadow"
                  style={{
                    left: toPct(poiData.activeMissionTarget.x),
                    top: toPct(poiData.activeMissionTarget.y),
                  }}
                />
              )}

              {/* Online Friends */}
              {remotePlayers.map((rp) => (
                <button
                  key={rp.uid}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected({
                      x: rp.x,
                      y: rp.y,
                      label: rp.name,
                      subtitle: `Online Friend · ${rp.uid}`,
                    });
                  }}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ left: toPct(rp.x), top: toPct(rp.y) }}
                >
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-400 shadow" />
                  <span className="mt-0.5 rounded bg-[#14110f]/90 px-1 text-[9px] font-bold text-sky-300 whitespace-nowrap">
                    {rp.name}
                  </span>
                </button>
              ))}

              {/* Selected Pin Crosshair */}
              {selected && (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: toPct(selected.x), top: toPct(selected.y) }}
                >
                  <div className="h-8 w-8 rounded-full border-2 border-sky-300 bg-sky-400/20 shadow" />
                </div>
              )}

              {/* Local Player Arrow */}
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: toPct(poiData.player.x),
                  top: toPct(poiData.player.y),
                  transform: `translate(-50%, -50%) rotate(${poiData.player.angle + Math.PI / 2}rad)`,
                }}
              >
                <div className="h-0 w-0 border-x-[6px] border-b-[13px] border-x-transparent border-b-white drop-shadow" />
              </div>
            </div>
          </div>

          {/* Right Panel: Selected Spot Actions + Quick POI List */}
          <div className="flex flex-col justify-between gap-3">
            <div className="space-y-3">
              {/* Selected Target Card */}
              <div className="rounded-xl border border-amber-200/20 bg-[#221c19] p-3">
                <div className="text-sm font-extrabold text-amber-200">
                  {selected ? selected.label : 'Tap Anywhere on Map'}
                </div>
                <div className="mt-0.5 text-xs text-amber-100/65">
                  {selected ? selected.subtitle : 'Drop a 3D GPS Beam or Fast Travel'}
                </div>

                {selected && (
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSetWaypoint(selected.x, selected.y, selected.label);
                        onClose();
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-extrabold text-[#14110f] hover:bg-sky-400"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Set 3D GPS Pin
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onFastTravel(selected.x, selected.y, selected.label);
                        onClose();
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-extrabold text-[#14110f] hover:bg-amber-400"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Fast Travel Warp
                    </button>
                  </div>
                )}

                {poiData.waypoint && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearWaypoint();
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-400/35 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear GPS Pin
                  </button>
                )}
              </div>

              {/* Nearest Quick Jump Spots */}
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-100/55">
                  Nearest Hotspots
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {quickSpots.map((spot) => {
                    const Icon = spot.icon;
                    return (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() =>
                          setSelected({ x: spot.x, y: spot.y, label: spot.label, subtitle: spot.sub })
                        }
                        className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs font-bold transition-transform hover:scale-[1.01] ${spot.color}`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{spot.label}</span>
                        </span>
                        <span className="font-mono-num text-[10px] opacity-75">
                          {Math.round(Math.hypot(spot.x - poiData.player.x, spot.y - poiData.player.y) / 6)}m
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Minimal Icon Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-amber-200/10 pt-2 text-[10px] text-amber-100/60">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />ATM</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Chai</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />Guns</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />Ramp</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Garage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
