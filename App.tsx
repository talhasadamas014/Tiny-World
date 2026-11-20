import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { GameHUD } from './components/GameHUD';
import { GameOverlays } from './components/GameOverlays';
import { OfflineIndicator } from './components/PWAInstallButton';
import { TouchControls } from './components/TouchControls';
import { GameEngine } from './game/engine';
import { STAGES } from './game/levels';
import { renderGame } from './game/renderer';
import {
  GameScreenState,
  HudSnapshot,
  InputState,
  SaveData,
  StageResult,
} from './types/game';

const SAVE_KEY = 'tiny_world_save_v1';

function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      return JSON.parse(raw) as SaveData;
    }
  } catch {
    // Ignore storage read errors
  }
  return {};
}

function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write errors
  }
}

function computeVirtualViewport(canvasW: number, canvasH: number): { w: number; h: number } {
  const aspect = canvasW / Math.max(1, canvasH);
  if (aspect < 0.9) {
    // Portrait smartphone: keep world elements large and readable
    const w = 560;
    return { w, h: Math.round(w / aspect) };
  }
  const h = 620;
  return { w: Math.round(h * aspect), h };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [screen, setScreen] = useState<GameScreenState>('TITLE_MENU');
  const [returnScreenFromSelect, setReturnScreenFromSelect] = useState<GameScreenState>('TITLE_MENU');
  const [currentStageId, setCurrentStageId] = useState<number>(1);
  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [lastResult, setLastResult] = useState<StageResult | null>(null);
  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [showTouchControls, setShowTouchControls] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 1024;
  });

  const [hud, setHud] = useState<HudSnapshot>({
    stageId: 1,
    stageName: STAGES[0].name,
    scaleLabel: STAGES[0].scaleLabel,
    hearts: 3,
    maxHearts: 3,
    pollen: 0,
    totalPollen: STAGES[0].collectibles.filter((c) => c.kind === 'pollen').length,
    relics: 0,
    totalRelics: STAGES[0].collectibles.filter((c) => c.kind === 'relic').length,
    elapsedSec: 0,
    isGliding: false,
    dashReady: true,
    hintText: STAGES[0].hint ?? null,
  });

  // Mutable refs for 60fps input & screen sync without re-binding RAF
  const screenRef = useRef<GameScreenState>(screen);
  screenRef.current = screen;

  const keyInputRef = useRef({
    left: false,
    right: false,
    jumpHeld: false,
    jumpJustPressed: false,
    dashJustPressed: false,
  });

  const touchInputRef = useRef({
    moveX: 0,
    jumpHeld: false,
    jumpJustPressed: false,
    dashJustPressed: false,
  });

  const createEngineForStage = useCallback((stageId: number) => {
    const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
    setCurrentStageId(stage.id);

    const engine = new GameEngine(stage, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onStageClear: (result) => {
        setSaveData((prev) => {
          const existing = prev[result.stageId];
          const bestStars = Math.max(existing?.bestStars ?? 0, result.stars);
          const bestPollen = Math.max(existing?.bestPollen ?? 0, result.pollen);
          const bestRelics = Math.max(existing?.bestRelics ?? 0, result.relics);
          const bestTimeSec =
            existing?.bestTimeSec != null
              ? Math.min(existing.bestTimeSec, result.elapsedSec)
              : result.elapsedSec;
          const updated: SaveData = {
            ...prev,
            [result.stageId]: {
              completed: true,
              bestStars,
              bestPollen,
              bestRelics,
              bestTimeSec,
            },
          };
          persistSaveData(updated);
          return updated;
        });
        setLastResult(result);
        setScreen('STAGE_CLEAR');
      },
      onGameOver: () => {
        setScreen('GAME_OVER');
      },
    });

    engineRef.current = engine;
  }, []);

  // Initialize diorama on mount
  useEffect(() => {
    createEngineForStage(1);
  }, [createEngineForStage]);

  // Auto-enable touch controls if a real touch occurs
  useEffect(() => {
    const handleTouch = () => {
      setShowTouchControls(true);
    };
    window.addEventListener('touchstart', handleTouch, { passive: true, once: true });
    return () => window.removeEventListener('touchstart', handleTouch);
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keyInputRef.current.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keyInputRef.current.right = true;
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (!keyInputRef.current.jumpHeld) {
          keyInputRef.current.jumpJustPressed = true;
        }
        keyInputRef.current.jumpHeld = true;
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK' || e.code === 'KeyX') {
        if (!e.repeat) {
          keyInputRef.current.dashJustPressed = true;
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screenRef.current === 'PLAYING') {
          setScreen('PAUSED');
        } else if (screenRef.current === 'PAUSED') {
          setScreen('PLAYING');
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keyInputRef.current.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keyInputRef.current.right = false;
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        keyInputRef.current.jumpHeld = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Manage background music with screen state
  useEffect(() => {
    if (screen === 'PLAYING' && !muted) {
      soundEngine.startMusic();
    } else {
      soundEngine.stopMusic();
    }
    return () => soundEngine.stopMusic();
  }, [screen, muted]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const frame = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (canvas && engine) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const targetW = Math.floor(cssW * dpr);
        const targetH = Math.floor(cssH * dpr);

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const vp = computeVirtualViewport(cssW, cssH);

        if (screenRef.current === 'PLAYING') {
          const k = keyInputRef.current;
          const t = touchInputRef.current;

          const keyMove = (k.right ? 1 : 0) - (k.left ? 1 : 0);
          const moveX = Math.abs(t.moveX) > 0.05 ? t.moveX : keyMove;

          const input: InputState = {
            moveX,
            jumpHeld: k.jumpHeld || t.jumpHeld,
            jumpPressedThisFrame: k.jumpJustPressed || t.jumpJustPressed,
            dashPressedThisFrame: k.dashJustPressed || t.dashJustPressed,
          };

          k.jumpJustPressed = false;
          k.dashJustPressed = false;
          t.jumpJustPressed = false;
          t.dashJustPressed = false;

          engine.update(dt, input, vp.w, vp.h);
        } else if (screenRef.current === 'TITLE_MENU') {
          // Gentle live diorama animation on title screen
          engine.time += Math.min(dt, 0.05);
          for (const m of engine.motes) {
            m.x += (m.vx + Math.sin(engine.time + m.phase) * 8) * Math.min(dt, 0.05);
            m.y += m.vy * Math.min(dt, 0.05);
            if (m.y < -10) m.y = engine.stage.height + 10;
          }
          engine.cameraX = 140 + Math.sin(engine.time * 0.25) * 90;
          engine.cameraY = 230;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          renderGame(ctx, engine, cssW, cssH, vp.w, vp.h);
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const handleToggleMute = () => {
    soundEngine.unlock();
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
    if (!nextMuted) soundEngine.playClick();
  };

  const handleStartQuickPlay = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    // Resume highest unlocked incomplete stage or Stage 1
    let startId = 1;
    for (const s of STAGES) {
      if (saveData[s.id]?.completed && s.id < STAGES.length) {
        startId = s.id + 1;
      }
    }
    createEngineForStage(startId);
    setScreen('PLAYING');
  };

  const handleSelectStage = (stageId: number) => {
    soundEngine.unlock();
    soundEngine.playClick();
    createEngineForStage(stageId);
    setScreen('PLAYING');
  };

  const handleRestart = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    createEngineForStage(currentStageId);
    setScreen('PLAYING');
  };

  const handleNextStage = () => {
    soundEngine.unlock();
    soundEngine.playClick();
    const nextId = Math.min(STAGES.length, currentStageId + 1);
    createEngineForStage(nextId);
    setScreen('PLAYING');
  };

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#0d1912] select-none">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="Tiny World game canvas"
      />

      {screen === 'PLAYING' && (
        <GameHUD
          hud={hud}
          muted={muted}
          showTouchControls={showTouchControls}
          onToggleMute={handleToggleMute}
          onToggleTouchControls={() => {
            soundEngine.playClick();
            setShowTouchControls((prev) => !prev);
          }}
          onPause={() => {
            soundEngine.playClick();
            setScreen('PAUSED');
          }}
        />
      )}

      {screen === 'PLAYING' && showTouchControls && (
        <TouchControls
          dashReady={hud.dashReady}
          isGliding={hud.isGliding}
          onMoveChange={(moveX) => {
            touchInputRef.current.moveX = moveX;
          }}
          onJumpDown={() => {
            soundEngine.unlock();
            touchInputRef.current.jumpHeld = true;
            touchInputRef.current.jumpJustPressed = true;
          }}
          onJumpUp={() => {
            touchInputRef.current.jumpHeld = false;
          }}
          onDashPress={() => {
            soundEngine.unlock();
            touchInputRef.current.dashJustPressed = true;
          }}
        />
      )}

      <GameOverlays
        screen={screen}
        saveData={saveData}
        currentStageId={currentStageId}
        lastResult={lastResult}
        muted={muted}
        onStartQuickPlay={handleStartQuickPlay}
        onOpenStageSelect={() => {
          soundEngine.unlock();
          soundEngine.playClick();
          setReturnScreenFromSelect(screen === 'PAUSED' ? 'PAUSED' : 'TITLE_MENU');
          setScreen('STAGE_SELECT');
        }}
        onCloseStageSelect={() => {
          soundEngine.playClick();
          setScreen(returnScreenFromSelect);
        }}
        onSelectStage={handleSelectStage}
        onResume={() => {
          soundEngine.playClick();
          setScreen('PLAYING');
        }}
        onRestart={handleRestart}
        onNextStage={handleNextStage}
        onReturnTitle={() => {
          soundEngine.playClick();
          createEngineForStage(1);
          setScreen('TITLE_MENU');
        }}
        onToggleMute={handleToggleMute}
      />

      <OfflineIndicator />
    </main>
  );
}
