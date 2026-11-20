import { soundEngine } from '../audio/soundEngine';
import {
  CollectibleDef,
  EnemyDef,
  HazardDef,
  HudSnapshot,
  InputState,
  PlatformDef,
  StageDef,
  StageResult,
} from '../types/game';

export interface RuntimePlatform extends PlatformDef {
  currX: number;
  currY: number;
  prevX: number;
  prevY: number;
  angle: number;
  bounceAnim: number;
}

export interface RuntimeEnemy extends EnemyDef {
  currX: number;
  currY: number;
  dir: 1 | -1;
  stunTimer: number;
  walkPhase: number;
}

export interface RuntimeCollectible extends CollectibleDef {
  collected: boolean;
  bobPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  glow?: boolean;
}

export interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

export interface PlayerState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  onPlatformId: string | null;
  coyoteTimer: number;
  jumpBufferTimer: number;
  isGliding: boolean;
  dashTimer: number;
  dashCooldown: number;
  dashAvailable: boolean;
  hearts: number;
  maxHearts: number;
  invulnTimer: number;
  scaleX: number;
  scaleY: number;
  walkCycle: number;
  safeX: number;
  safeY: number;
}

export interface EngineCallbacks {
  onStageClear: (result: StageResult) => void;
  onGameOver: () => void;
  onHudUpdate: (hud: HudSnapshot) => void;
}

export class GameEngine {
  public stage: StageDef;
  public player: PlayerState;
  public platforms: RuntimePlatform[];
  public enemies: RuntimeEnemy[];
  public collectibles: RuntimeCollectible[];
  public hazards: HazardDef[];
  public particles: Particle[] = [];
  public motes: AmbientMote[] = [];
  public time: number = 0;
  public elapsedSec: number = 0;
  public pollenCollected: number = 0;
  public totalPollen: number = 0;
  public relicsCollected: number = 0;
  public totalRelics: number = 0;
  public cameraX: number = 0;
  public cameraY: number = 0;
  public shakeTimer: number = 0;
  public finished: boolean = false;
  public activeHint: string | null = null;
  private hintTimer: number = 6.0;
  private hudSyncAccum: number = 0;
  private callbacks: EngineCallbacks;

  constructor(stage: StageDef, callbacks: EngineCallbacks) {
    this.stage = stage;
    this.callbacks = callbacks;

    this.platforms = stage.platforms.map((p) => ({
      ...p,
      currX: p.x,
      currY: p.y,
      prevX: p.x,
      prevY: p.y,
      angle: 0,
      bounceAnim: 0,
    }));

    this.enemies = stage.enemies.map((e) => ({
      ...e,
      currX: e.x,
      currY: e.y,
      dir: 1,
      stunTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
    }));

    this.collectibles = stage.collectibles.map((c, idx) => ({
      ...c,
      collected: false,
      bobPhase: idx * 0.65,
    }));

    this.hazards = stage.hazards;
    this.totalPollen = this.collectibles.filter((c) => c.kind === 'pollen').length;
    this.totalRelics = this.collectibles.filter((c) => c.kind === 'relic').length;
    this.activeHint = stage.hint ?? null;

    this.player = {
      x: stage.spawn.x,
      y: stage.spawn.y,
      w: 28,
      h: 34,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      onPlatformId: null,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      isGliding: false,
      dashTimer: 0,
      dashCooldown: 0,
      dashAvailable: true,
      hearts: 3,
      maxHearts: 3,
      invulnTimer: 0,
      scaleX: 1,
      scaleY: 1,
      walkCycle: 0,
      safeX: stage.spawn.x,
      safeY: stage.spawn.y,
    };

    // Ambient floating dust/pollen motes
    for (let i = 0; i < 48; i++) {
      this.motes.push({
        x: Math.random() * stage.width,
        y: Math.random() * stage.height,
        vx: (Math.random() - 0.5) * 14,
        vy: -5 - Math.random() * 14,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.25 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.cameraX = Math.max(0, this.player.x - 200);
    this.cameraY = Math.max(0, this.player.y - 300);
    this.emitHud();
  }

  public emitHud(): void {
    this.callbacks.onHudUpdate({
      stageId: this.stage.id,
      stageName: this.stage.name,
      scaleLabel: this.stage.scaleLabel,
      hearts: this.player.hearts,
      maxHearts: this.player.maxHearts,
      pollen: this.pollenCollected,
      totalPollen: this.totalPollen,
      relics: this.relicsCollected,
      totalRelics: this.totalRelics,
      elapsedSec: this.elapsedSec,
      isGliding: this.player.isGliding,
      dashReady: this.player.dashAvailable && this.player.dashCooldown <= 0,
      hintText: this.hintTimer > 0 ? this.activeHint : null,
    });
  }

  public spawnParticles(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: number = 140,
    glow: boolean = false
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.85);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        size: 2.2 + Math.random() * 3.2,
        color,
        glow,
      });
    }
  }

  public update(dt: number, input: InputState, viewW: number, viewH: number): void {
    if (this.finished) return;
    const clampedDt = Math.min(dt, 0.05);
    this.time += clampedDt;
    this.elapsedSec += clampedDt;

    if (this.hintTimer > 0) {
      this.hintTimer -= clampedDt;
    }
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - clampedDt);
    }

    // 1. Update platforms (moving leaves & rotating brass gears)
    for (const plat of this.platforms) {
      plat.prevX = plat.currX;
      plat.prevY = plat.currY;
      if (plat.bounceAnim > 0) {
        plat.bounceAnim = Math.max(0, plat.bounceAnim - clampedDt * 4.5);
      }

      if (plat.kind === 'moving_leaf') {
        const range = plat.moveRange ?? 100;
        const speed = plat.moveSpeed ?? 1.5;
        const phase = plat.movePhase ?? 0;
        const offset = Math.sin(this.time * speed + phase) * range;
        if (plat.moveAxis === 'y') {
          plat.currY = plat.y + offset;
        } else {
          plat.currX = plat.x + offset;
        }
      } else if (plat.kind === 'brass_gear') {
        plat.angle += (plat.gearSpeed ?? 0.8) * clampedDt;
      }
    }

    // 2. Carry player if standing on a moving platform or rotating gear
    const p = this.player;
    if (p.grounded && p.onPlatformId) {
      const standing = this.platforms.find((pl) => pl.id === p.onPlatformId);
      if (standing) {
        p.x += standing.currX - standing.prevX;
        p.y += standing.currY - standing.prevY;
        if (standing.kind === 'brass_gear') {
          const r = standing.gearRadius ?? 90;
          const speed = standing.gearSpeed ?? 0.8;
          // Tangential carry along top rim of rotating gear
          p.x += speed * r * 0.52 * clampedDt;
        }
      }
    }

    // 3. Player timers & squash/stretch recovery
    p.scaleX += (1 - p.scaleX) * Math.min(1, clampedDt * 14);
    p.scaleY += (1 - p.scaleY) * Math.min(1, clampedDt * 14);
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - clampedDt);
    if (p.dashCooldown > 0) p.dashCooldown = Math.max(0, p.dashCooldown - clampedDt);

    if (p.grounded) {
      p.coyoteTimer = 0.11;
      p.dashAvailable = true;
    } else {
      p.coyoteTimer = Math.max(0, p.coyoteTimer - clampedDt);
    }

    if (input.jumpPressedThisFrame) {
      p.jumpBufferTimer = 0.13;
    } else {
      p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - clampedDt);
    }

    // 4. Dash activation
    if (input.dashPressedThisFrame && p.dashAvailable && p.dashCooldown <= 0 && p.dashTimer <= 0) {
      p.dashTimer = 0.16;
      p.dashCooldown = 0.45;
      p.dashAvailable = false;
      const dashDir = Math.abs(input.moveX) > 0.15 ? (input.moveX > 0 ? 1 : -1) : p.facing;
      p.facing = dashDir;
      p.vx = dashDir * 540;
      p.vy = -40;
      p.scaleX = 1.32;
      p.scaleY = 0.72;
      soundEngine.playDash();
      this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 10, '#7dd3fc', 160, true);
    }

    // 5. Horizontal movement
    if (p.dashTimer > 0) {
      p.dashTimer -= clampedDt;
      if (Math.random() < 0.7) {
        this.particles.push({
          x: p.x + p.w / 2,
          y: p.y + p.h / 2 + (Math.random() - 0.5) * 10,
          vx: -p.facing * 40,
          vy: (Math.random() - 0.5) * 20,
          life: 0.22,
          maxLife: 0.22,
          size: 4,
          color: '#bae6fd',
          glow: true,
        });
      }
    } else {
      const targetSpeed = input.moveX * 290;
      const accel = p.grounded ? 2400 : 1750;
      if (p.vx < targetSpeed) {
        p.vx = Math.min(targetSpeed, p.vx + accel * clampedDt);
      } else if (p.vx > targetSpeed) {
        p.vx = Math.max(targetSpeed, p.vx - accel * clampedDt);
      }
      if (Math.abs(input.moveX) > 0.1) {
        p.facing = input.moveX > 0 ? 1 : -1;
      }
    }

    if (p.grounded && Math.abs(p.vx) > 25) {
      p.walkCycle += clampedDt * (Math.abs(p.vx) * 0.055);
    }

    // 6. Jump execution
    if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0) {
      p.vy = -605;
      p.grounded = false;
      p.onPlatformId = null;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
      p.scaleX = 0.76;
      p.scaleY = 1.28;
      soundEngine.playJump();
      this.spawnParticles(p.x + p.w / 2, p.y + p.h, 6, '#bef264', 110);
    }

    // 7. Updrafts & Dandelion Glide + Gravity
    const pCenterX = p.x + p.w / 2;
    const pCenterY = p.y + p.h / 2;
    let inUpdraft = null;
    for (const u of this.stage.updrafts) {
      if (pCenterX >= u.x && pCenterX <= u.x + u.w && pCenterY >= u.y && pCenterY <= u.y + u.h) {
        inUpdraft = u;
        break;
      }
    }

    p.isGliding = !p.grounded && input.jumpHeld && (p.vy > 20 || inUpdraft !== null) && p.dashTimer <= 0;

    if (p.dashTimer <= 0) {
      let gravity = 1450;
      if (p.isGliding) {
        gravity = 420;
      }
      p.vy += gravity * clampedDt;

      if (inUpdraft && (p.isGliding || input.jumpHeld)) {
        p.vy -= (inUpdraft.strength + 520) * clampedDt;
        if (p.vy < -inUpdraft.strength) {
          p.vy = -inUpdraft.strength;
        }
      } else if (p.isGliding && p.vy > 105) {
        p.vy = 105;
      } else if (p.vy > 900) {
        p.vy = 900;
      }
    }

    // 8. Move X and resolve solid horizontal overlaps (skip one-way-friendly top edges)
    p.x += p.vx * clampedDt;
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    if (p.x + p.w > this.stage.width) {
      p.x = this.stage.width - p.w;
      p.vx = 0;
    }

    // 9. Move Y and resolve platform landings
    const prevBottom = p.y + p.h;
    p.y += p.vy * clampedDt;
    const wasGrounded = p.grounded;
    p.grounded = false;
    p.onPlatformId = null;

    if (p.vy >= 0) {
      for (const plat of this.platforms) {
        if (plat.kind === 'brass_gear') {
          const r = plat.gearRadius ?? 90;
          const cx = plat.currX + r;
          const cy = plat.currY + r;
          const dx = p.x + p.w / 2 - cx;
          if (Math.abs(dx) <= r * 0.92) {
            const surfaceY = cy - Math.sqrt(Math.max(0, r * r - dx * dx));
            if (prevBottom <= surfaceY + 14 && p.y + p.h >= surfaceY - 2) {
              p.y = surfaceY - p.h;
              p.vy = 0;
              p.grounded = true;
              p.onPlatformId = plat.id;
              if (!wasGrounded) {
                p.scaleX = 1.22;
                p.scaleY = 0.78;
              }
              break;
            }
          }
        } else {
          const horizOverlap = p.x + p.w - 4 > plat.currX && p.x + 4 < plat.currX + plat.w;
          if (horizOverlap && prevBottom <= plat.currY + 14 && p.y + p.h >= plat.currY) {
            p.y = plat.currY - p.h;

            if (
              plat.kind === 'dew_puddle' ||
              plat.kind === 'bottlecap_bounce' ||
              plat.kind === 'mushroom_bounce'
            ) {
              const bounceV = plat.bouncePower ?? 900;
              p.vy = input.jumpHeld ? -bounceV * 1.07 : -bounceV;
              p.grounded = false;
              p.dashAvailable = true;
              p.scaleX = 0.7;
              p.scaleY = 1.35;
              plat.bounceAnim = 1;
              const isWater = plat.kind === 'dew_puddle';
              soundEngine.playBounce(isWater);
              this.spawnParticles(
                p.x + p.w / 2,
                plat.currY,
                14,
                isWater ? '#7dd3fc' : plat.kind === 'mushroom_bounce' ? '#fca5a5' : '#fde047',
                190,
                true
              );
            } else {
              p.vy = 0;
              p.grounded = true;
              p.onPlatformId = plat.id;
              // Record safe ground checkpoint on static sturdy platforms
              if (
                plat.kind !== 'moving_leaf' &&
                plat.kind !== 'silk_bridge' &&
                p.x > plat.currX + 12 &&
                p.x + p.w < plat.currX + plat.w - 12
              ) {
                p.safeX = p.x;
                p.safeY = plat.currY - p.h - 4;
              }
              if (!wasGrounded) {
                p.scaleX = 1.22;
                p.scaleY = 0.8;
                this.spawnParticles(p.x + p.w / 2, plat.currY, 4, '#d9f99d', 80);
              }
            }
            break;
          }
        }
      }
    }

    // 10. Update enemies & check collisions
    for (const enemy of this.enemies) {
      if (enemy.stunTimer > 0) {
        enemy.stunTimer -= clampedDt;
        continue;
      }
      enemy.currX += enemy.dir * enemy.speed * clampedDt;
      enemy.walkPhase += clampedDt * enemy.speed * 0.12;
      if (enemy.currX <= enemy.minX) {
        enemy.currX = enemy.minX;
        enemy.dir = 1;
      } else if (enemy.currX >= enemy.maxX) {
        enemy.currX = enemy.maxX;
        enemy.dir = -1;
      }

      const ew = 34;
      const eh = 24;
      const overlap =
        p.x + p.w - 4 > enemy.currX - ew / 2 &&
        p.x + 4 < enemy.currX + ew / 2 &&
        p.y + p.h > enemy.currY &&
        p.y < enemy.currY + eh;

      if (overlap) {
        // Stomp check: falling and feet near top of beetle
        if (p.vy > 0 && prevBottom <= enemy.currY + 14) {
          p.vy = -580;
          p.dashAvailable = true;
          p.scaleX = 0.74;
          p.scaleY = 1.3;
          enemy.stunTimer = 2.4;
          soundEngine.playBounce(false);
          this.spawnParticles(enemy.currX, enemy.currY + 6, 12, '#fda4af', 160, true);
        } else {
          this.damagePlayer(p.x + p.w / 2 < enemy.currX ? -1 : 1);
        }
      }
    }

    // 11. Check hazards (brambles, sap, pendulums, raindrops)
    for (const haz of this.hazards) {
      if (haz.kind === 'bramble' || haz.kind === 'sap') {
        const hit =
          p.x + p.w - 6 > haz.x &&
          p.x + 6 < haz.x + haz.w &&
          p.y + p.h - 2 > haz.y &&
          p.y + 6 < haz.y + haz.h;
        if (hit) {
          this.damagePlayer(p.vx >= 0 ? -1 : 1);
        }
      } else if (haz.kind === 'pendulum') {
        const px = haz.pivotX ?? haz.x;
        const py = haz.pivotY ?? haz.y;
        const len = haz.length ?? 200;
        const maxA = haz.swingAngle ?? 0.7;
        const spd = haz.swingSpeed ?? 2.0;
        const theta = Math.sin(this.time * spd) * maxA;
        const bobX = px + Math.sin(theta) * len;
        const bobY = py + Math.cos(theta) * len;
        const dist = Math.hypot(p.x + p.w / 2 - bobX, p.y + p.h / 2 - bobY);
        if (dist < (haz.w / 2) + 12) {
          this.damagePlayer(p.x + p.w / 2 < bobX ? -1 : 1);
        }
      } else if (haz.kind === 'raindrop_zone') {
        const interval = haz.interval ?? 2.5;
        const phase = haz.phase ?? 0;
        const cycle = (this.time + phase) % interval;
        const dropDuration = 0.55;
        if (cycle > interval - dropDuration) {
          const progress = (cycle - (interval - dropDuration)) / dropDuration; // 0..1
          const dropY = haz.y + progress * haz.h;
          const dist = Math.hypot(p.x + p.w / 2 - (haz.x + haz.w / 2), p.y + p.h / 2 - dropY);
          if (dist < 22) {
            this.damagePlayer(0);
          }
        }
      }
    }

    // 12. Check collectibles
    for (const c of this.collectibles) {
      if (c.collected) continue;
      const dist = Math.hypot(p.x + p.w / 2 - c.x, p.y + p.h / 2 - c.y);
      const radius = c.kind === 'relic' ? 28 : 24;
      if (dist < radius) {
        c.collected = true;
        if (c.kind === 'pollen') {
          this.pollenCollected++;
          soundEngine.playPollen();
          this.spawnParticles(c.x, c.y, 10, '#fde047', 130, true);
        } else if (c.kind === 'relic') {
          this.relicsCollected++;
          soundEngine.playRelic();
          this.spawnParticles(c.x, c.y, 20, '#fbbf24', 200, true);
        } else if (c.kind === 'dew_heart') {
          if (p.hearts < p.maxHearts) {
            p.hearts++;
          } else {
            this.pollenCollected += 3;
          }
          soundEngine.playRelic();
          this.spawnParticles(c.x, c.y, 16, '#38bdf8', 170, true);
        }
        this.emitHud();
      }
    }

    // 13. Check falling out of bounds
    if (p.y > this.stage.height + 70) {
      this.handleFallOut();
    }

    // 14. Check Goal reached
    const goalDist = Math.hypot(p.x + p.w / 2 - this.stage.goal.x, p.y + p.h / 2 - this.stage.goal.y);
    if (goalDist < 48) {
      this.completeStage();
    }

    // 15. Update particles & motes
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * clampedDt;
      pt.y += pt.vy * clampedDt;
      pt.vy += 260 * clampedDt;
      pt.life -= clampedDt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (const m of this.motes) {
      m.x += (m.vx + Math.sin(this.time + m.phase) * 8) * clampedDt;
      m.y += m.vy * clampedDt;
      if (m.y < -10) m.y = this.stage.height + 10;
      if (m.x < -10) m.x = this.stage.width + 10;
      if (m.x > this.stage.width + 10) m.x = -10;
    }

    // 16. Smooth camera follow
    const targetCamX = Math.max(
      0,
      Math.min(this.stage.width - viewW, p.x + p.w / 2 - viewW * 0.42 + p.facing * 45)
    );
    const targetCamY = Math.max(
      0,
      Math.min(this.stage.height - viewH, p.y + p.h / 2 - viewH * 0.54)
    );
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, clampedDt * 6.5);
    this.cameraY += (targetCamY - this.cameraY) * Math.min(1, clampedDt * 5.5);

    this.hudSyncAccum += clampedDt;
    if (this.hudSyncAccum >= 0.15) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private damagePlayer(knockDir: number): void {
    const p = this.player;
    if (p.invulnTimer > 0 || this.finished) return;
    p.hearts--;
    p.invulnTimer = 1.4;
    p.vy = -380;
    p.vx = knockDir * 240;
    this.shakeTimer = 0.25;
    soundEngine.playHurt();
    this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 16, '#f87171', 190, true);
    this.emitHud();

    if (p.hearts <= 0) {
      this.finished = true;
      soundEngine.playGameOver();
      this.callbacks.onGameOver();
    }
  }

  private handleFallOut(): void {
    const p = this.player;
    if (this.finished) return;
    p.hearts--;
    this.shakeTimer = 0.25;
    soundEngine.playHurt();
    this.emitHud();

    if (p.hearts <= 0) {
      this.finished = true;
      soundEngine.playGameOver();
      this.callbacks.onGameOver();
      return;
    }

    p.x = p.safeX;
    p.y = p.safeY;
    p.vx = 0;
    p.vy = 0;
    p.invulnTimer = 1.5;
    p.dashAvailable = true;
    this.spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 14, '#7dd3fc', 140, true);
  }

  private completeStage(): void {
    if (this.finished) return;
    this.finished = true;
    soundEngine.playStageClear();
    this.spawnParticles(this.stage.goal.x, this.stage.goal.y, 30, '#fde047', 240, true);

    const pollenRatio = this.totalPollen > 0 ? this.pollenCollected / this.totalPollen : 1;
    let stars: 1 | 2 | 3 = 1;
    if (this.relicsCollected >= 2 || (pollenRatio >= 0.7 && this.elapsedSec <= this.stage.parTimeSec * 1.25)) {
      stars = 2;
    }
    if (this.relicsCollected === this.totalRelics && pollenRatio >= 0.75) {
      stars = 3;
    }

    this.callbacks.onStageClear({
      stageId: this.stage.id,
      stageName: this.stage.name,
      pollen: this.pollenCollected,
      totalPollen: this.totalPollen,
      relics: this.relicsCollected,
      totalRelics: this.totalRelics,
      elapsedSec: this.elapsedSec,
      stars,
      isNewBest: false,
    });
  }
}
