import React from 'react';
import { Play, RotateCcw, Star, Volume2, VolumeX, Map, ArrowRight, X } from 'lucide-react';
import { STAGES } from '../game/levels';
import { GameScreenState, SaveData, StageResult } from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';

interface GameOverlaysProps {
  screen: GameScreenState;
  saveData: SaveData;
  currentStageId: number;
  lastResult: StageResult | null;
  muted: boolean;
  onStartQuickPlay: () => void;
  onOpenStageSelect: () => void;
  onCloseStageSelect: () => void;
  onSelectStage: (stageId: number) => void;
  onResume: () => void;
  onRestart: () => void;
  onNextStage: () => void;
  onReturnTitle: () => void;
  onToggleMute: () => void;
}

function formatSec(sec: number): string {
  const whole = Math.floor(sec);
  const mins = Math.floor(whole / 60);
  const rem = whole % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  screen,
  saveData,
  currentStageId,
  lastResult,
  muted,
  onStartQuickPlay,
  onOpenStageSelect,
  onCloseStageSelect,
  onSelectStage,
  onResume,
  onRestart,
  onNextStage,
  onReturnTitle,
  onToggleMute,
}) => {
  if (screen === 'PLAYING') return null;

  if (screen === 'TITLE_MENU') {
    const totalStars = Object.values(saveData).reduce((acc, r) => acc + (r.bestStars || 0), 0);
    const maxStars = STAGES.length * 3;

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#09140e]/65 p-4 backdrop-blur-[3px] sm:p-8">
        <div className="w-full max-w-2xl rounded-2xl border border-white/12 bg-[#0f1f16]/90 p-6 shadow-2xl backdrop-blur-md sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-medium tracking-wide text-lime-300/85">
              Macro Microcosm Platformer · 5 Biomes
            </span>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Tiny World
          </h1>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
            Play as Pip, a 3-millimeter forest sprite. Bounce across morning dewdrops, ride
            spinning pocket-watch gears, and glide on dandelion seeds to recover lost relics.
          </p>

          {/* Primary Actions */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onStartQuickPlay}
              className="flex min-h-[48px] items-center justify-center gap-2.5 rounded-xl bg-lime-400 px-6 py-3 text-sm font-semibold text-[#0b1911] shadow-lg shadow-lime-400/20 transition-transform duration-150 hover:bg-lime-300 active:scale-[0.98] whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Play Adventure</span>
            </button>

            <button
              type="button"
              onClick={onOpenStageSelect}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/14 active:scale-[0.98] whitespace-nowrap shrink-0"
            >
              <Map className="h-4 w-4" />
              <span>Select Stage</span>
            </button>

            <PWAInstallButton />

            {totalStars > 0 && (
              <div className="font-mono-tabular ml-auto flex items-center gap-1.5 text-xs font-medium text-amber-300">
                <Star className="h-4 w-4 fill-amber-300" />
                <span>
                  {totalStars}/{maxStars} Stars
                </span>
              </div>
            )}
          </div>

          {/* Concise Controls Reference */}
          <div className="mt-7 grid grid-cols-1 gap-3 border-t border-white/10 pt-5 text-xs text-white/75 sm:grid-cols-3">
            <div>
              <div className="font-semibold text-white">Move</div>
              <div className="mt-0.5 text-white/60">Thumb stick or A / D / Arrows</div>
            </div>
            <div>
              <div className="font-semibold text-white">Jump &amp; Dandelion Glide</div>
              <div className="mt-0.5 text-white/60">Tap Jump, hold in air to float</div>
            </div>
            <div>
              <div className="font-semibold text-white">Dew-Dash &amp; Stomp</div>
              <div className="mt-0.5 text-white/60">Shift / Dash button · Bounce on bugs</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'STAGE_SELECT') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#08120c]/75 p-4 backdrop-blur-sm sm:p-8">
        <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col rounded-2xl border border-white/12 bg-[#0f1f16]/95 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Select Stage</h2>
              <p className="text-xs text-white/65">
                Explore five miniature worlds from clover stems to clockwork gears
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseStageSelect}
              aria-label="Close stage select"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3.5 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((stage) => {
              const rec = saveData[stage.id];
              const stars = rec?.bestStars ?? 0;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onSelectStage(stage.id)}
                  className="group flex flex-col justify-between rounded-xl border border-white/12 bg-white/5 p-4 text-left transition-colors hover:border-lime-400/50 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-lime-400"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-lime-300/85">
                      <span>Stage {stage.id}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${
                              s <= stars ? 'fill-amber-300 text-amber-300' : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <h3 className="font-display mt-1.5 text-lg font-bold text-white group-hover:text-lime-200">
                      {stage.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">{stage.subtitle}</p>
                  </div>

                  <div className="font-mono-tabular mt-4 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-white/60">
                    <span>{stage.scaleLabel.split('·')[0].trim()}</span>
                    <span>
                      {rec?.completed && rec.bestTimeSec !== null
                        ? `Best ${formatSec(rec.bestTimeSec)}`
                        : 'Play'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'PAUSED') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#0f1f16]/95 p-6 shadow-2xl">
          <h2 className="font-display text-2xl font-bold text-white">Game Paused</h2>
          <p className="mt-1 text-xs text-white/65">
            Stage {currentStageId} · {STAGES.find((s) => s.id === currentStageId)?.name}
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-sm font-semibold text-[#0b1911] hover:bg-lime-300"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Resume</span>
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/14"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Restart Stage</span>
            </button>
            <button
              type="button"
              onClick={onOpenStageSelect}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/14"
            >
              <Map className="h-4 w-4" />
              <span>Select Stage</span>
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-5 py-2 text-xs font-medium text-white/70 hover:bg-white/8 hover:text-white"
            >
              Back to Title
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'STAGE_CLEAR' && lastResult) {
    const hasNext = lastResult.stageId < STAGES.length;
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0f1f16]/95 p-7 text-center shadow-2xl">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <Star
                key={s}
                className={`h-8 w-8 transition-transform ${
                  s <= lastResult.stars
                    ? 'scale-105 fill-amber-300 text-amber-300'
                    : 'text-white/15'
                }`}
              />
            ))}
          </div>

          <h2 className="font-display mt-3 text-3xl font-bold text-white">
            {hasNext ? 'Stage Complete' : 'Tiny World Conquered'}
          </h2>
          <p className="mt-1 text-sm text-white/70">{lastResult.stageName}</p>

          <div className="font-mono-tabular mt-5 grid grid-cols-3 gap-2 border-y border-white/10 py-4 text-sm">
            <div>
              <div className="text-[11px] text-white/55">Pollen</div>
              <div className="mt-0.5 font-semibold text-yellow-300">
                {lastResult.pollen}/{lastResult.totalPollen}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-white/55">Relics</div>
              <div className="mt-0.5 font-semibold text-amber-300">
                {lastResult.relics}/{lastResult.totalRelics}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-white/55">Time</div>
              <div className="mt-0.5 font-semibold text-white">
                {formatSec(lastResult.elapsedSec)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={onRestart}
              className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/14"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Replay</span>
            </button>
            {hasNext ? (
              <button
                type="button"
                onClick={onNextStage}
                className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-[#0b1911] hover:bg-lime-300"
              >
                <span>Next Stage</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenStageSelect}
                className="flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-[#0b1911] hover:bg-lime-300"
              >
                <Map className="h-4 w-4" />
                <span>All Stages</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'GAME_OVER') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-[#1a1214]/95 p-7 text-center shadow-2xl">
          <h2 className="font-display text-3xl font-bold text-white">Out of Dew</h2>
          <p className="mt-2 text-sm text-white/70">
            Pip tumbled beneath the grass. Take a breath and leap back in!
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-semibold text-[#0b1911] hover:bg-lime-300"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Play Again</span>
            </button>
            <button
              type="button"
              onClick={onOpenStageSelect}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/14"
            >
              <Map className="h-4 w-4" />
              <span>Select Stage</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
