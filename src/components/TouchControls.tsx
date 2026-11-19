import React, { useRef, useState } from 'react';
import {
  Car,
  Zap,
  Volume2,
  Crosshair,
  Eye,
  Hand,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Focus,
  LogOut,
  Smile,
  Armchair,
} from 'lucide-react';
import { EmoteId, WeaponId } from '../shared/types';
import { ContextAction } from '../game/engine';

interface TouchControlsProps {
  inVehicle: boolean;
  weaponId: WeaponId;
  ownedWeapons: Record<WeaponId, boolean>;
  weaponAmmo: Record<WeaponId, number>;
  aiming: boolean;
  crouching: boolean;
  holdingProp: string | null;
  contextAction: ContextAction | null;
  specialReady: boolean;
  specialCooldown: number;
  onJoystickMove: (nx: number, ny: number) => void;
  onCameraOrbit: (dx: number, dy: number, freeLookOnly: boolean) => void;
  onReleaseFreeLook: () => void;
  onVehicleControls: (ctrl: { steer?: number; throttle?: number; brake?: number }) => void;
  onFireChange: (active: boolean) => void;
  onToggleAim: () => void;
  onJump: () => void;
  onToggleCrouch: () => void;
  onGrabOrThrow: () => void;
  onSmartInteract: () => void;
  onSelectWeapon: (w: WeaponId) => void;
  onVehicleToggle: () => void;
  onSpecial: () => void;
  onHorn: () => void;
  activeEmote: EmoteId | null;
  onToggleEmoteMenu: () => void;
}

const WEAPON_SLOTS: { id: WeaponId; short: string }[] = [
  { id: 'bat', short: 'BAT' },
  { id: 'pistol', short: 'PISTOL' },
  { id: 'smg', short: 'SMG' },
  { id: 'shotgun', short: 'SHOT' },
  { id: 'ak47', short: 'AK-47' },
];

export const TouchControls: React.FC<TouchControlsProps> = ({
  inVehicle,
  weaponId,
  ownedWeapons,
  weaponAmmo,
  aiming,
  crouching,
  holdingProp,
  contextAction,
  specialReady,
  specialCooldown,
  onJoystickMove,
  onCameraOrbit,
  onReleaseFreeLook,
  onVehicleControls,
  onFireChange,
  onToggleAim,
  onJump,
  onToggleCrouch,
  onGrabOrThrow,
  onSmartInteract,
  onSelectWeapon,
  onVehicleToggle,
  onSpecial,
  onHorn,
  activeEmote,
  onToggleEmoteMenu,
}) => {
  // Left Analog Joystick State
  const baseRef = useRef<HTMLDivElement | null>(null);
  const stickPointerRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const maxRadius = 42;

  // Right-Half 360° Swipe Look Pad State
  const lookPointerRef = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  // BGMI 360° Eye Free-Look State
  const eyePointerRef = useRef<number | null>(null);
  const lastEyePos = useRef({ x: 0, y: 0 });

  const updateStick = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnob({ x: dx, y: dy });
    onJoystickMove(dx / maxRadius, dy / maxRadius);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none">
      {/* Transparent Right-Half 360° Camera Swipe Pad (BGMI Style: look 360° while standing, running or driving!) */}
      <div
        onPointerDown={(e) => {
          if (lookPointerRef.current !== null) return;
          lookPointerRef.current = e.pointerId;
          lastLookPos.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (lookPointerRef.current !== e.pointerId) return;
          const dx = e.clientX - lastLookPos.current.x;
          const dy = e.clientY - lastLookPos.current.y;
          lastLookPos.current = { x: e.clientX, y: e.clientY };
          onCameraOrbit(dx * 1.35, dy * 1.15, false);
        }}
        onPointerUp={(e) => {
          if (lookPointerRef.current !== e.pointerId) return;
          lookPointerRef.current = null;
        }}
        onPointerCancel={() => {
          lookPointerRef.current = null;
        }}
        className="pointer-events-auto fixed inset-y-16 right-0 w-[56%] touch-none"
        aria-label="360 Camera Swipe Area"
      />

      {/* BGMI 360° Free-Look Eye Button (Right-Upper Mid) */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          eyePointerRef.current = e.pointerId;
          lastEyePos.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (eyePointerRef.current !== e.pointerId) return;
          e.stopPropagation();
          const dx = e.clientX - lastEyePos.current.x;
          const dy = e.clientY - lastEyePos.current.y;
          lastEyePos.current = { x: e.clientX, y: e.clientY };
          onCameraOrbit(dx * 1.6, dy * 1.2, true);
        }}
        onPointerUp={(e) => {
          if (eyePointerRef.current !== e.pointerId) return;
          eyePointerRef.current = null;
          onReleaseFreeLook();
        }}
        onPointerCancel={() => {
          eyePointerRef.current = null;
          onReleaseFreeLook();
        }}
        className="pointer-events-auto fixed right-4 top-28 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/40 bg-[#181412]/75 text-amber-200 touch-none active:border-amber-400 active:bg-amber-500/30"
        title="Hold & Drag for 360° Free-Look"
      >
        <Eye className="h-5 w-5" />
      </div>

      {/* Touch Quick Emotes & Gestures Button (On Foot) */}
      {!inVehicle && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleEmoteMenu();
          }}
          className={`pointer-events-auto fixed right-4 top-42 z-30 flex h-11 w-11 items-center justify-center rounded-full border active:scale-95 ${
            activeEmote
              ? 'border-amber-300 bg-amber-500 text-[#14110f]'
              : 'border-amber-200/40 bg-[#181412]/75 text-amber-200'
          }`}
          title="Gestures & Emotes"
        >
          <Smile className="h-5 w-5" />
        </button>
      )}

      {/* Floating Contextual Action Button (Ride Car / Sit Bench / Take Gun / Grab / Throw) */}
      {contextAction && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (contextAction.kind === 'grab' || contextAction.kind === 'throw') {
              onGrabOrThrow();
            } else {
              onSmartInteract();
            }
          }}
          className="pointer-events-auto fixed bottom-28 left-1/2 z-30 -translate-x-1/2 flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-[#181412]/95 px-4 py-2 text-xs font-extrabold text-amber-200 shadow-xl active:scale-95"
        >
          {contextAction.kind === 'ride' ? (
            <Car className="h-4 w-4 text-emerald-400" />
          ) : contextAction.kind === 'sit' ? (
            <Armchair className="h-4 w-4 text-emerald-400" />
          ) : (
            <Hand className="h-4 w-4 text-amber-400" />
          )}
          <span>{contextAction.label}</span>
        </button>
      )}

      {/* ==================== BOTTOM CONTROLS: AUTO-ADAPTIVE BGMI ON-FOOT vs VEHICLE ==================== */}
      {inVehicle ? (
        /* BGMI VEHICLE DRIVING LAYOUT */
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-4 pb-5">
          {/* Left: Tactile Steer Left / Right Buttons */}
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onVehicleControls({ steer: -1 });
              }}
              onPointerUp={() => onVehicleControls({ steer: 0 })}
              onPointerLeave={() => onVehicleControls({ steer: 0 })}
              onPointerCancel={() => onVehicleControls({ steer: 0 })}
              className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-200/40 bg-[#181412]/80 text-amber-100 active:bg-amber-500 active:text-[#14110f]"
            >
              <ChevronLeft className="h-9 w-9" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onVehicleControls({ steer: 1 });
              }}
              onPointerUp={() => onVehicleControls({ steer: 0 })}
              onPointerLeave={() => onVehicleControls({ steer: 0 })}
              onPointerCancel={() => onVehicleControls({ steer: 0 })}
              className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-amber-200/40 bg-[#181412]/80 text-amber-100 active:bg-amber-500 active:text-[#14110f]"
            >
              <ChevronRight className="h-9 w-9" />
            </button>
          </div>

          {/* Right: Drive-by Fire, Horn, Nitro, Exit + BRAKE & GAS Pedals */}
          <div className="pointer-events-auto flex items-end gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onFireChange(true);
                }}
                onPointerUp={() => onFireChange(false)}
                onPointerCancel={() => onFireChange(false)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/60 bg-red-600/90 text-white active:scale-95"
              >
                <Crosshair className="h-5 w-5" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onHorn();
                }}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200/35 bg-[#181412]/85 text-amber-200 active:scale-95"
              >
                <Volume2 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSpecial();
                }}
                className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl border active:scale-95 ${
                  specialReady
                    ? 'border-amber-300 bg-amber-500 text-[#14110f]'
                    : 'border-amber-200/20 bg-[#181412]/80 text-amber-200/50'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span className="font-mono-num text-[9px] font-bold">
                  {specialReady ? 'BOOST' : `${Math.ceil(specialCooldown)}s`}
                </span>
              </button>
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onVehicleToggle();
                }}
                className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-emerald-400/60 bg-[#14261f]/90 text-emerald-300 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-[9px] font-bold">EXIT</span>
              </button>
            </div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onVehicleControls({ brake: 1 });
              }}
              onPointerUp={() => onVehicleControls({ brake: 0 })}
              onPointerLeave={() => onVehicleControls({ brake: 0 })}
              onPointerCancel={() => onVehicleControls({ brake: 0 })}
              className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border-2 border-red-400/70 bg-[#2a1515]/90 text-[11px] font-extrabold text-red-300 active:bg-red-600 active:text-white"
            >
              REV
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onVehicleControls({ throttle: 1 });
              }}
              onPointerUp={() => onVehicleControls({ throttle: 0 })}
              onPointerLeave={() => onVehicleControls({ throttle: 0 })}
              onPointerCancel={() => onVehicleControls({ throttle: 0 })}
              className="flex h-20 w-16 flex-col items-center justify-center rounded-2xl border-2 border-emerald-300 bg-emerald-600/90 text-xs font-extrabold text-white shadow-xl active:scale-95"
            >
              GAS
            </button>
          </div>
        </div>
      ) : (
        /* BGMI ON-FOOT DUAL-THUMB COMBAT & SANDBOX LAYOUT */
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-4 pb-4">
          {/* Left Thumb: BGMI Left-Fire Button + Smooth Analog Joystick */}
          <div className="pointer-events-auto flex flex-col items-start gap-3">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onFireChange(true);
              }}
              onPointerUp={() => onFireChange(false)}
              onPointerCancel={() => onFireChange(false)}
              className="ml-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-300/70 bg-[#181412]/80 text-amber-300 active:bg-red-600 active:text-white"
              title="Left Fire"
            >
              <Crosshair className="h-5 w-5" />
            </button>

            <div
              ref={baseRef}
              onPointerDown={(e) => {
                if (stickPointerRef.current !== null) return;
                stickPointerRef.current = e.pointerId;
                e.currentTarget.setPointerCapture(e.pointerId);
                updateStick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (stickPointerRef.current !== e.pointerId) return;
                updateStick(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                if (stickPointerRef.current !== e.pointerId) return;
                stickPointerRef.current = null;
                setKnob({ x: 0, y: 0 });
                onJoystickMove(0, 0);
              }}
              onPointerCancel={() => {
                stickPointerRef.current = null;
                setKnob({ x: 0, y: 0 });
                onJoystickMove(0, 0);
              }}
              className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-200/30 bg-[#181412]/65 touch-none"
            >
              <div
                className="h-12 w-12 rounded-full border-2 border-amber-300 bg-amber-500/85 shadow-lg"
                style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
              />
            </div>
          </div>

          {/* Bottom-Center: Sleek BGMI Weapon Slots Bar */}
          <div className="pointer-events-auto mb-1 flex items-center gap-1 rounded-xl border border-amber-200/20 bg-[#181412]/85 p-1">
            {WEAPON_SLOTS.filter((s) => ownedWeapons[s.id]).map((s) => {
              const active = weaponId === s.id;
              const ammo = s.id === 'bat' || s.id === 'pistol' ? '∞' : weaponAmmo[s.id];
              return (
                <button
                  key={s.id}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onSelectWeapon(s.id);
                  }}
                  className={`flex flex-col items-center rounded-lg px-2 py-1 text-[10px] font-extrabold ${
                    active ? 'bg-amber-500 text-[#14110f]' : 'text-amber-100/80'
                  }`}
                >
                  <span>{s.short}</span>
                  <span className="font-mono-num text-[9px] opacity-80">{ammo}</span>
                </button>
              );
            })}
          </div>

          {/* Right Thumb: BGMI Combat Arc (Scope, Jump, Crouch, Grab, Ride, Power + BIG FIRE) */}
          <div className="pointer-events-auto flex items-end gap-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onToggleAim();
                }}
                className={`flex h-11 w-12 flex-col items-center justify-center rounded-xl border active:scale-95 ${
                  aiming
                    ? 'border-sky-300 bg-sky-500 text-[#14110f]'
                    : 'border-amber-200/30 bg-[#181412]/85 text-amber-100'
                }`}
              >
                <Focus className="h-4 w-4" />
                <span className="text-[9px] font-bold">AIM</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onJump();
                }}
                className="flex h-11 w-12 flex-col items-center justify-center rounded-xl border border-amber-200/30 bg-[#181412]/85 text-amber-100 active:scale-95"
              >
                <ArrowUp className="h-4 w-4" />
                <span className="text-[9px] font-bold">JUMP</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onToggleCrouch();
                }}
                className={`flex h-11 w-12 flex-col items-center justify-center rounded-xl border active:scale-95 ${
                  crouching
                    ? 'border-amber-300 bg-amber-500/30 text-amber-200'
                    : 'border-amber-200/30 bg-[#181412]/85 text-amber-100'
                }`}
              >
                <ArrowDown className="h-4 w-4" />
                <span className="text-[9px] font-bold">CROUCH</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onGrabOrThrow();
                }}
                className={`flex h-11 w-12 flex-col items-center justify-center rounded-xl border active:scale-95 ${
                  holdingProp
                    ? 'border-orange-300 bg-orange-500 text-[#14110f]'
                    : 'border-amber-200/30 bg-[#181412]/85 text-amber-200'
                }`}
              >
                <Hand className="h-4 w-4" />
                <span className="text-[9px] font-bold">{holdingProp ? 'THROW' : 'GRAB'}</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onVehicleToggle();
                }}
                className="flex h-11 w-12 flex-col items-center justify-center rounded-xl border border-emerald-400/50 bg-[#14261f]/90 text-emerald-300 active:scale-95"
              >
                <Car className="h-4 w-4" />
                <span className="text-[9px] font-bold">RIDE</span>
              </button>

              <button
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSpecial();
                }}
                className={`flex h-11 w-12 flex-col items-center justify-center rounded-xl border active:scale-95 ${
                  specialReady
                    ? 'border-amber-300 bg-amber-500 text-[#14110f]'
                    : 'border-amber-200/20 bg-[#181412]/80 text-amber-200/50'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span className="font-mono-num text-[9px] font-bold">
                  {specialReady ? 'POWER' : `${Math.ceil(specialCooldown)}s`}
                </span>
              </button>
            </div>

            {/* Big Primary BGMI Fire / Throw Trigger */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onFireChange(true);
              }}
              onPointerUp={() => onFireChange(false)}
              onPointerCancel={() => onFireChange(false)}
              className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-2 border-red-300 bg-red-600/95 text-white shadow-xl active:scale-95"
            >
              <Crosshair className="h-7 w-7" />
              <span className="text-[10px] font-extrabold tracking-wide">{holdingProp ? 'THROW' : 'FIRE'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
