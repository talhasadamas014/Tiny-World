import React, { useRef, useState } from 'react';
import { ArrowUp, Wind } from 'lucide-react';

interface TouchControlsProps {
  onMoveChange: (moveX: number) => void;
  onJumpDown: () => void;
  onJumpUp: () => void;
  onDashPress: () => void;
  dashReady: boolean;
  isGliding: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveChange,
  onJumpDown,
  onJumpUp,
  onDashPress,
  dashReady,
  isGliding,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const activeStickPointerId = useRef<number | null>(null);
  const jumpPointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [jumpActive, setJumpActive] = useState(false);

  const maxRadius = 38;

  const updateStickFromClient = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const ox = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const oy = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    setKnobOffset({ x: ox, y: oy });

    const normalizedX = Math.max(-1, Math.min(1, ox / maxRadius));
    // Deadzone for crisp standing still
    onMoveChange(Math.abs(normalizedX) < 0.16 ? 0 : normalizedX);
  };

  const handleStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activeStickPointerId.current = e.pointerId;
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeStickPointerId.current !== e.pointerId) return;
    e.preventDefault();
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeStickPointerId.current !== e.pointerId) return;
    e.preventDefault();
    activeStickPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onMoveChange(0);
  };

  const handleJumpPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    jumpPointerId.current = e.pointerId;
    setJumpActive(true);
    onJumpDown();
  };

  const handleJumpPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (jumpPointerId.current !== e.pointerId) return;
    e.preventDefault();
    jumpPointerId.current = null;
    setJumpActive(false);
    onJumpUp();
  };

  const handleDashPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onDashPress();
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-5 pb-5 sm:px-8 sm:pb-7"
      aria-label="Touch Controls"
    >
      {/* Left Thumb Zone: Analog Virtual Stick */}
      <div
        ref={padRef}
        onPointerDown={handleStickPointerDown}
        onPointerMove={handleStickPointerMove}
        onPointerUp={handleStickPointerEnd}
        onPointerCancel={handleStickPointerEnd}
        className="pointer-events-auto relative flex h-32 w-32 touch-none items-center justify-center rounded-full border border-white/20 bg-black/25 backdrop-blur-sm"
        role="slider"
        aria-label="Move left or right"
        aria-valuetext={`${Math.round((knobOffset.x / maxRadius) * 100)}%`}
      >
        {/* Subtle directional markers */}
        <span className="pointer-events-none absolute left-3 text-xs font-semibold text-white/40">
          ◀
        </span>
        <span className="pointer-events-none absolute right-3 text-xs font-semibold text-white/40">
          ▶
        </span>
        {/* Thumb knob */}
        <div
          className="pointer-events-none h-14 w-14 rounded-full border border-white/40 bg-white/25 shadow-lg transition-transform duration-75"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y * 0.35}px)`,
          }}
        />
      </div>

      {/* Right Thumb Zone: Dash & Jump/Glide */}
      <div className="pointer-events-auto flex items-end gap-3.5">
        <button
          type="button"
          onPointerDown={handleDashPointerDown}
          aria-label="Dash"
          className={`flex h-14 w-14 touch-none flex-col items-center justify-center rounded-full border transition-transform duration-100 active:scale-95 ${
            dashReady
              ? 'border-sky-300/60 bg-sky-500/35 text-white backdrop-blur-sm'
              : 'border-white/15 bg-black/25 text-white/40 backdrop-blur-sm'
          }`}
        >
          <Wind className="h-5 w-5" />
          <span className="text-[10px] font-semibold tracking-tight">Dash</span>
        </button>

        <button
          type="button"
          onPointerDown={handleJumpPointerDown}
          onPointerUp={handleJumpPointerEnd}
          onPointerCancel={handleJumpPointerEnd}
          aria-label="Jump and hold to glide"
          className={`flex h-20 w-20 touch-none flex-col items-center justify-center rounded-full border shadow-xl transition-transform duration-100 ${
            jumpActive
              ? 'scale-95 border-lime-200/80 bg-lime-500/60 text-white'
              : 'border-lime-300/50 bg-emerald-600/55 text-white backdrop-blur-sm'
          }`}
        >
          <ArrowUp className="h-7 w-7 stroke-[2.5]" />
          <span className="text-[11px] font-semibold tracking-tight">
            {isGliding ? 'Glide' : 'Jump'}
          </span>
        </button>
      </div>
    </div>
  );
};
