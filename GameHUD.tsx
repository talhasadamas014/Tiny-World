import React from 'react';
import { Gamepad2, Pause, Volume2, VolumeX } from 'lucide-react';
import { HudSnapshot } from '../types/game';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  showTouchControls: boolean;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onPause: () => void;
}

function formatTime(sec: number): string {
  const whole = Math.floor(sec);
  const mins = Math.floor(whole / 60);
  const rem = whole % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  muted,
  showTouchControls,
  onToggleMute,
  onToggleTouchControls,
  onPause,
}) => {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-col items-center px-3 pt-2.5 sm:px-6 sm:pt-3.5">
      <div className="pointer-events-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d1912]/75 px-3 py-1.5 backdrop-blur-md sm:px-4">
        {/* Left: Dew Hearts & Stage Info */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1" aria-label={`Health ${hud.hearts} of ${hud.maxHearts}`}>
            {Array.from({ length: hud.maxHearts }).map((_, idx) => {
              const active = idx < hud.hearts;
              return (
                <svg
                  key={idx}
                  viewBox="0 0 24 24"
                  className={`h-5 w-5 transition-transform duration-150 ${
                    active ? 'scale-100 text-sky-400' : 'scale-90 text-white/20'
                  }`}
                  fill="currentColor"
                >
                  <path d="M12 2.5C12 2.5 5.5 10.2 5.5 14.8C5.5 18.4 8.4 21.5 12 21.5C15.6 21.5 18.5 18.4 18.5 14.8C18.5 10.2 12 2.5 12 2.5Z" />
                </svg>
              );
            })}
          </div>

          <div className="hidden min-w-0 items-center gap-2 text-xs text-white/75 sm:flex">
            <span className="truncate font-semibold text-white">
              {hud.stageId}. {hud.stageName}
            </span>
            <span aria-hidden="true" className="text-white/35">·</span>
            <span className="truncate text-white/60">{hud.scaleLabel}</span>
          </div>
        </div>

        {/* Center: Unboxed Tabular Stats */}
        <div className="font-mono-tabular flex items-center gap-3 text-xs font-medium text-white/90 sm:gap-5 sm:text-sm">
          <span className="flex items-center gap-1.5" title="Pollen Collected">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-300" />
            <span>
              {hud.pollen}/{hud.totalPollen}
            </span>
          </span>
          <span aria-hidden="true" className="text-white/25">·</span>
          <span className="flex items-center gap-1.5" title="Relics Found">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-amber-400" fill="currentColor">
              <path d="M10 1.5l2.5 5.1 5.6.8-4 3.9.9 5.6L10 14.3 5 16.9l.9-5.6-4-3.9 5.6-.8L10 1.5z" />
            </svg>
            <span>
              {hud.relics}/{hud.totalRelics}
            </span>
          </span>
          <span aria-hidden="true" className="hidden text-white/25 sm:inline">·</span>
          <span className="hidden text-white/75 sm:inline">{formatTime(hud.elapsedSec)}</span>
        </div>

        {/* Right: Touch toggle, Audio Mute, Pause */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleTouchControls}
            aria-label={showTouchControls ? 'Hide on-screen touch controls' : 'Show on-screen touch controls'}
            title={showTouchControls ? 'Hide Touch Pad' : 'Show Touch Pad'}
            className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-lime-400 ${
              showTouchControls
                ? 'bg-white/10 text-lime-300 hover:bg-white/15'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Gamepad2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            title={muted ? 'Unmute' : 'Mute'}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-lime-400"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            title="Pause"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-lime-400"
          >
            <Pause className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Transient non-blocking stage hint */}
      {hud.hintText && (
        <div className="mt-2 rounded-lg bg-black/55 px-3.5 py-1.5 text-center text-xs font-medium text-lime-100/95 backdrop-blur-sm sm:text-sm">
          {hud.hintText}
        </div>
      )}
    </header>
  );
};
