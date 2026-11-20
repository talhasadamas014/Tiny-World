import { BiomeId, HazardDef } from '../types/game';
import { GameEngine, RuntimeCollectible, RuntimeEnemy, RuntimePlatform } from './engine';

interface BiomePalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  bokeh1: string;
  bokeh2: string;
  silhouetteFar: string;
  silhouetteNear: string;
}

const BIOME_PALETTES: Record<BiomeId, BiomePalette> = {
  morning_leaf: {
    skyTop: '#0f291e',
    skyMid: '#1b4332',
    skyBottom: '#2d6a4f',
    bokeh1: 'rgba(253, 224, 71, 0.14)',
    bokeh2: 'rgba(134, 239, 172, 0.12)',
    silhouetteFar: '#123022',
    silhouetteNear: '#0b2016',
  },
  picnic_ruins: {
    skyTop: '#2c1810',
    skyMid: '#4a2518',
    skyBottom: '#7c3a23',
    bokeh1: 'rgba(251, 191, 36, 0.16)',
    bokeh2: 'rgba(252, 165, 165, 0.13)',
    silhouetteFar: '#331a12',
    silhouetteNear: '#21100a',
  },
  moss_terrarium: {
    skyTop: '#0a2229',
    skyMid: '#133c44',
    skyBottom: '#1f5e5b',
    bokeh1: 'rgba(103, 232, 249, 0.14)',
    bokeh2: 'rgba(167, 243, 208, 0.12)',
    silhouetteFar: '#0d2e33',
    silhouetteNear: '#071d21',
  },
  raindrop_canopy: {
    skyTop: '#0e172a',
    skyMid: '#1b2b4b',
    skyBottom: '#28456c',
    bokeh1: 'rgba(125, 211, 252, 0.16)',
    bokeh2: 'rgba(165, 243, 252, 0.1)',
    silhouetteFar: '#132138',
    silhouetteNear: '#0b1424',
  },
  pocket_watch: {
    skyTop: '#1c150c',
    skyMid: '#332512',
    skyBottom: '#4e3819',
    bokeh1: 'rgba(251, 191, 36, 0.18)',
    bokeh2: 'rgba(245, 158, 11, 0.11)',
    silhouetteFar: '#241a0d',
    silhouetteNear: '#150f06',
  },
};

export function renderGame(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  canvasW: number,
  canvasH: number,
  worldViewW: number,
  worldViewH: number
): void {
  const palette = BIOME_PALETTES[engine.stage.biome];
  const scaleX = canvasW / worldViewW;
  const scaleY = canvasH / worldViewH;
  const scale = Math.min(scaleX, scaleY);

  // 1. Sky / Macro Bokeh Backdrop
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
  skyGrad.addColorStop(0, palette.skyTop);
  skyGrad.addColorStop(0.55, palette.skyMid);
  skyGrad.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Soft macro depth-of-field bokeh circles
  drawBokeh(ctx, engine, canvasW, canvasH, palette);

  // Parallax giant grass blades / background shapes
  drawParallaxSilhouettes(ctx, engine, canvasW, canvasH, palette);

  ctx.save();
  // Camera shake
  let shakeX = 0;
  let shakeY = 0;
  if (engine.shakeTimer > 0) {
    const mag = engine.shakeTimer * 24;
    shakeX = (Math.random() - 0.5) * mag;
    shakeY = (Math.random() - 0.5) * mag;
  }

  ctx.scale(scale, scale);
  ctx.translate(-engine.cameraX + shakeX, -engine.cameraY + shakeY);

  // 2. Ambient floating motes in world space
  for (const m of engine.motes) {
    ctx.fillStyle = `rgba(254, 240, 138, ${m.alpha})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Updrafts (Sunbeams, Mist, Steam)
  for (const u of engine.stage.updrafts) {
    drawUpdraft(ctx, u.x, u.y, u.w, u.h, u.kind, engine.time);
  }

  // 4. Background macro decorations
  for (const deco of engine.stage.decorations) {
    drawDecoration(ctx, deco.x, deco.y, deco.kind, deco.scale ?? 1, engine.time);
  }

  // 5. Platforms & Gears
  for (const plat of engine.platforms) {
    drawPlatform(ctx, plat, engine.time);
  }

  // 6. Hazards (Brambles, Sap, Pendulums, Raindrops)
  for (const haz of engine.hazards) {
    drawHazard(ctx, haz, engine.time);
  }

  // 7. Goal Beacon
  drawGoal(ctx, engine.stage.goal.x, engine.stage.goal.y, engine.stage.biome, engine.time);

  // 8. Collectibles (Pollen, Relics, Dew Hearts)
  for (const c of engine.collectibles) {
    if (!c.collected) {
      drawCollectible(ctx, c, engine.time);
    }
  }

  // 9. Enemies (Ladybugs & Clock Beetles)
  for (const enemy of engine.enemies) {
    drawEnemy(ctx, enemy, engine.time);
  }

  // 10. Player (Pip)
  drawPlayer(ctx, engine);

  // 11. Foreground Particles
  for (const pt of engine.particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (pt.glow) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = pt.color;
    }
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * (0.5 + 0.5 * alpha), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawBokeh(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  w: number,
  h: number,
  palette: BiomePalette
): void {
  const spots = [
    { x: 0.15, y: 0.22, r: 95, c: palette.bokeh1, p: 0.08 },
    { x: 0.42, y: 0.16, r: 140, c: palette.bokeh2, p: 0.05 },
    { x: 0.72, y: 0.34, r: 110, c: palette.bokeh1, p: 0.07 },
    { x: 0.88, y: 0.2, r: 80, c: palette.bokeh2, p: 0.06 },
    { x: 0.28, y: 0.65, r: 130, c: palette.bokeh2, p: 0.04 },
    { x: 0.62, y: 0.72, r: 90, c: palette.bokeh1, p: 0.09 },
  ];
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    const px = ((s.x * w - engine.cameraX * s.p) % (w + 260) + (w + 260)) % (w + 260) - 130;
    const py = s.y * h + Math.sin(engine.time * 0.5 + i) * 10;
    ctx.fillStyle = s.c;
    ctx.beginPath();
    ctx.arc(px, py, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParallaxSilhouettes(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  w: number,
  h: number,
  palette: BiomePalette
): void {
  // Giant grass blades / fern stalks in the far macro background
  ctx.fillStyle = palette.silhouetteFar;
  const count = 9;
  const spacing = (w + 200) / count;
  for (let i = 0; i < count; i++) {
    const baseX = ((i * spacing - engine.cameraX * 0.14) % (w + 240) + (w + 240)) % (w + 240) - 120;
    const sway = Math.sin(engine.time * 0.8 + i * 1.1) * 14;
    const bladeH = h * (0.45 + (i % 3) * 0.14);
    ctx.beginPath();
    ctx.moveTo(baseX - 28, h);
    ctx.quadraticCurveTo(baseX + sway * 0.5, h - bladeH * 0.55, baseX + sway, h - bladeH);
    ctx.quadraticCurveTo(baseX + 26 + sway * 0.5, h - bladeH * 0.5, baseX + 34, h);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = palette.silhouetteNear;
  for (let i = 0; i < 6; i++) {
    const baseX = ((i * (w / 5) - engine.cameraX * 0.25) % (w + 260) + (w + 260)) % (w + 260) - 130;
    const sway = Math.cos(engine.time * 0.9 + i) * 10;
    const bladeH = h * (0.28 + (i % 2) * 0.12);
    ctx.beginPath();
    ctx.moveTo(baseX - 22, h);
    ctx.quadraticCurveTo(baseX + sway, h - bladeH * 0.6, baseX + 18 + sway, h - bladeH);
    ctx.quadraticCurveTo(baseX + 36, h - bladeH * 0.4, baseX + 28, h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawUpdraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: 'sunbeam' | 'mist' | 'steam',
  time: number
): void {
  const grad = ctx.createLinearGradient(x, y + h, x, y);
  if (kind === 'sunbeam') {
    grad.addColorStop(0, 'rgba(253, 224, 71, 0.22)');
    grad.addColorStop(0.6, 'rgba(254, 240, 138, 0.11)');
    grad.addColorStop(1, 'rgba(254, 249, 195, 0.02)');
  } else if (kind === 'mist') {
    grad.addColorStop(0, 'rgba(165, 243, 252, 0.24)');
    grad.addColorStop(0.6, 'rgba(207, 250, 254, 0.12)');
    grad.addColorStop(1, 'rgba(207, 250, 254, 0.01)');
  } else {
    grad.addColorStop(0, 'rgba(253, 186, 116, 0.24)');
    grad.addColorStop(0.6, 'rgba(254, 215, 170, 0.12)');
    grad.addColorStop(1, 'rgba(254, 215, 170, 0.01)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Rising air ribbons
  ctx.strokeStyle =
    kind === 'sunbeam'
      ? 'rgba(254, 240, 138, 0.45)'
      : kind === 'mist'
      ? 'rgba(165, 243, 252, 0.45)'
      : 'rgba(253, 186, 116, 0.45)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const laneX = x + ((i + 0.5) * w) / 4;
    const progress = ((time * 0.75 + i * 0.27) % 1);
    const ry = y + h - progress * h;
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.8;
    ctx.beginPath();
    ctx.moveTo(laneX + Math.sin(progress * 8 + i) * 6, ry + 26);
    ctx.lineTo(laneX - Math.sin(progress * 8 + i) * 6, ry);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDecoration(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: string,
  scale: number,
  time: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (kind === 'clover') {
    const sway = Math.sin(time * 1.4 + x * 0.01) * 0.05;
    ctx.rotate(sway);
    ctx.strokeStyle = '#3f6212';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(4, -22, 0, -42);
    ctx.stroke();
    ctx.fillStyle = '#4d7c0f';
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 - Math.PI / 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 10, -44 + Math.sin(a) * 8, 10, 7, a, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'pebble') {
    ctx.fillStyle = '#57534e';
    ctx.beginPath();
    ctx.ellipse(0, -10, 22, 12, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.ellipse(-5, -14, 9, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'fern') {
    const sway = Math.sin(time * 1.1 + x * 0.02) * 0.06;
    ctx.rotate(sway);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, -35, 10, -64);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    for (let i = 1; i <= 5; i++) {
      const fy = -i * 11;
      ctx.beginPath();
      ctx.ellipse(-9, fy, 9, 3.5, -0.3, 0, Math.PI * 2);
      ctx.ellipse(9, fy, 9, 3.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'fork') {
    // Giant silver fork handle peeking behind
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-10, -65, 6, 65);
    ctx.fillRect(0, -65, 6, 65);
    ctx.fillRect(10, -65, 6, 65);
  } else if (kind === 'screw') {
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-8, -14, 16, 14);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, -14, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, p: RuntimePlatform, time: number): void {
  const x = p.currX;
  const y = p.currY;
  const w = p.w;
  const h = p.h;

  ctx.save();

  if (p.kind === 'brass_gear') {
    const r = p.gearRadius ?? 90;
    const cx = x + r;
    const cy = y + r;
    const teeth = p.gearTeeth ?? 12;

    ctx.translate(cx, cy);
    ctx.rotate(p.angle);

    // Gear teeth
    ctx.fillStyle = '#b45309';
    for (let i = 0; i < teeth; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / teeth);
      ctx.fillRect(-9, -r - 8, 18, 16);
      ctx.restore();
    }

    // Outer brass ring
    const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 10, 0, 0, r);
    grad.addColorStop(0, '#fcd34d');
    grad.addColorStop(0.6, '#d97706');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Cutout spokes
    ctx.fillStyle = '#241a0d';
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center hub jewel
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  if (p.kind === 'leaf' || p.kind === 'moving_leaf' || p.kind === 'lotus') {
    const isLotus = p.kind === 'lotus';
    const baseColor = isLotus ? '#15803d' : p.kind === 'moving_leaf' ? '#65a30d' : '#16a34a';
    const topHighlight = isLotus ? '#4ade80' : p.kind === 'moving_leaf' ? '#bef264' : '#86efac';

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();

    // Top sunlit rim
    ctx.fillStyle = topHighlight;
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 2, w - 8, 6, 4);
    ctx.fill();

    // Central leaf vein
    ctx.strokeStyle = 'rgba(236, 253, 245, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + h * 0.52);
    ctx.lineTo(x + w - 12, y + h * 0.52);
    ctx.stroke();
  } else if (p.kind === 'moss_stone') {
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    ctx.roundRect(x, y + 6, w, h - 6, 12);
    ctx.fill();

    // Thick velvety moss cap
    ctx.fillStyle = '#4d7c0f';
    ctx.beginPath();
    ctx.roundRect(x - 2, y, w + 4, 16, 10);
    ctx.fill();
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 2, w - 8, 6, 4);
    ctx.fill();
  } else if (p.kind === 'matchstick') {
    // Wood stick
    ctx.fillStyle = '#d6b282';
    ctx.beginPath();
    ctx.roundRect(x, y + 3, w - 18, h - 4, 4);
    ctx.fill();
    ctx.fillStyle = '#e7cfa6';
    ctx.fillRect(x + 4, y + 5, w - 26, 4);
    // Red match head
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(x + w - 14, y + h / 2, 16, h * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.ellipse(x + w - 16, y + h / 2 - 4, 6, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === 'sugar_cube') {
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Sparkling sugar crystals
    ctx.fillStyle = '#cbd5e1';
    for (let sx = x + 14; sx < x + w - 10; sx += 22) {
      for (let sy = y + 12; sy < y + h - 10; sy += 20) {
        ctx.fillRect(sx, sy, 3, 3);
      }
    }
  } else if (p.kind === 'dew_puddle') {
    const squash = Math.sin(p.bounceAnim * Math.PI) * 7;
    const grad = ctx.createRadialGradient(x + w * 0.4, y + 6, 4, x + w * 0.5, y + 14, w * 0.6);
    grad.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.85)');
    grad.addColorStop(1, 'rgba(2, 132, 199, 0.9)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2 + squash * 0.4, w / 2 + squash, h / 2 - squash * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.35, y + 9 + squash * 0.4, w * 0.18, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === 'bottlecap_bounce') {
    const squash = Math.sin(p.bounceAnim * Math.PI) * 6;
    // Metal crimped bottle cap
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(x, y + squash, w, h - 4, 8);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(x + 8, y + 3 + squash, w - 16, 6);
    // Crimped ridges
    ctx.fillStyle = '#b45309';
    for (let rx = x + 6; rx < x + w - 8; rx += 14) {
      ctx.fillRect(rx, y + h - 10 + squash * 0.4, 6, 10);
    }
  } else if (p.kind === 'mushroom_bounce') {
    const squash = Math.sin(p.bounceAnim * Math.PI) * 7;
    // Stalk
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(x + w * 0.35, y + 14, w * 0.3, h + 16);
    // Red spotted cap
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + 12 + squash * 0.5, w / 2 + squash * 0.6, 18 - squash * 0.4, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    // White spots
    ctx.fillStyle = '#fef2f2';
    ctx.beginPath();
    ctx.arc(x + w * 0.3, y + 5 + squash * 0.4, 5, 0, Math.PI * 2);
    ctx.arc(x + w * 0.55, y + 2 + squash * 0.4, 6, 0, Math.PI * 2);
    ctx.arc(x + w * 0.74, y + 7 + squash * 0.4, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === 'quartz') {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(0.5, '#7dd3fc');
    grad.addColorStop(1, '#0284c7');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + w - 10, y);
    ctx.lineTo(x + w, y + h * 0.55);
    ctx.lineTo(x + w - 18, y + h);
    ctx.lineTo(x + 18, y + h);
    ctx.lineTo(x, y + h * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(x + 16, y + 3, w - 32, 4);
  } else if (p.kind === 'silk_bridge') {
    // Stretched glistening spider silk strands
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.85)';
    ctx.lineWidth = 3;
    const sag = Math.sin(time * 2 + x * 0.02) * 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.quadraticCurveTo(x + w / 2, y + 10 + sag, x + w, y + 4);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.lineTo(x + w, y + 10);
    ctx.stroke();
  } else if (p.kind === 'brass_plate') {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(0.35, '#b45309');
    grad.addColorStop(1, '#78350f');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    // Rivets
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(x + 12, y + 10, 3, 0, Math.PI * 2);
    ctx.arc(x + w - 12, y + 10, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHazard(ctx: CanvasRenderingContext2D, h: HazardDef, time: number): void {
  ctx.save();
  if (h.kind === 'bramble') {
    ctx.fillStyle = '#4c0519';
    ctx.strokeStyle = '#9f1239';
    ctx.lineWidth = 2;
    const spikes = Math.max(3, Math.floor(h.w / 14));
    const sw = h.w / spikes;
    for (let i = 0; i < spikes; i++) {
      const sx = h.x + i * sw;
      ctx.beginPath();
      ctx.moveTo(sx, h.y + h.h);
      ctx.lineTo(sx + sw * 0.5, h.y);
      ctx.lineTo(sx + sw, h.y + h.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (h.kind === 'sap') {
    const grad = ctx.createLinearGradient(h.x, h.y, h.x, h.y + h.h);
    grad.addColorStop(0, '#fbbf24');
    grad.addColorStop(1, '#b45309');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(h.x, h.y + 4, h.w, h.h - 4, 8);
    ctx.fill();
    // Bubbling amber glob
    const bx = h.x + h.w * 0.5 + Math.sin(time * 3) * (h.w * 0.2);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(bx, h.y + 5, 5 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (h.kind === 'pendulum') {
    const px = h.pivotX ?? h.x;
    const py = h.pivotY ?? h.y;
    const len = h.length ?? 200;
    const maxA = h.swingAngle ?? 0.7;
    const spd = h.swingSpeed ?? 2.0;
    const theta = Math.sin(time * spd) * maxA;
    const bobX = px + Math.sin(theta) * len;
    const bobY = py + Math.cos(theta) * len;

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // Glowing red-rimmed brass pendulum bob
    ctx.fillStyle = '#b45309';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bobX, bobY, h.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'raindrop_zone') {
    const interval = h.interval ?? 2.5;
    const phase = h.phase ?? 0;
    const cycle = (time + phase) % interval;
    const dropDuration = 0.55;
    const groundY = h.y + h.h;
    const cx = h.x + h.w / 2;

    // Warning ripple before raindrop hits
    if (cycle > interval - 1.2) {
      const warnAlpha = Math.min(1, (cycle - (interval - 1.2)) / 0.5);
      const pulse = 10 + Math.sin(time * 18) * 4;
      ctx.strokeStyle = `rgba(125, 211, 252, ${warnAlpha * 0.85})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, groundY - 2, pulse + 8, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (cycle > interval - dropDuration) {
      const progress = (cycle - (interval - dropDuration)) / dropDuration;
      const dropY = h.y + progress * h.h;
      ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
      ctx.beginPath();
      ctx.moveTo(cx, dropY - 24);
      ctx.quadraticCurveTo(cx + 16, dropY + 4, cx, dropY + 14);
      ctx.quadraticCurveTo(cx - 16, dropY + 4, cx, dropY - 24);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx - 4, dropY - 2, 3, 7, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGoal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  biome: BiomeId,
  time: number
): void {
  ctx.save();
  ctx.translate(x, y);

  // Soft pulsing glow aura
  const pulse = 1 + Math.sin(time * 3.2) * 0.1;
  const glow = ctx.createRadialGradient(0, 0, 6, 0, 0, 56 * pulse);
  glow.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
  glow.addColorStop(0.5, 'rgba(163, 230, 53, 0.35)');
  glow.addColorStop(1, 'rgba(163, 230, 53, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 56 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Giant glowing flower blossom / lantern
  const petals = biome === 'pocket_watch' ? 8 : 6;
  ctx.rotate(time * 0.45);
  ctx.fillStyle = biome === 'pocket_watch' ? '#fbbf24' : '#fef08a';
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / petals);
    ctx.beginPath();
    ctx.ellipse(0, -18, 9, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-3, -3, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCollectible(
  ctx: CanvasRenderingContext2D,
  c: RuntimeCollectible,
  time: number
): void {
  const bob = Math.sin(time * 3.2 + c.bobPhase) * 5;
  ctx.save();
  ctx.translate(c.x, c.y + bob);

  if (c.kind === 'pollen') {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#fde047';
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2.5, -2.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.kind === 'dew_heart') {
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(13, 2, 0, 12);
    ctx.quadraticCurveTo(-13, 2, 0, -12);
    ctx.fill();
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(-3, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (c.kind === 'relic') {
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#fbbf24';

    if (c.relicType === 'button') {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#78350f';
      const holes = [
        [-4, -4],
        [4, -4],
        [-4, 4],
        [4, 4],
      ];
      for (const [hx, hy] of holes) {
        ctx.beginPath();
        ctx.arc(hx, hy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (c.relicType === 'penny') {
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (c.relicType === 'stamp') {
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(-13, -11, 26, 22);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-9, -7, 18, 14);
    } else if (c.relicType === 'watch_key') {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -6, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-2, 1, 4, 13);
      ctx.fillRect(2, 9, 5, 3);
    } else {
      // Dew Pearl
      const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.6, '#bae6fd');
      grad.addColorStop(1, '#38bdf8');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: RuntimeEnemy, time: number): void {
  ctx.save();
  ctx.translate(e.currX, e.currY + 12);
  if (e.stunTimer > 0) {
    ctx.scale(1.18, 0.65);
    ctx.globalAlpha = 0.75;
  } else {
    const bob = Math.abs(Math.sin(e.walkPhase)) * 2;
    ctx.translate(0, -bob);
  }
  ctx.scale(e.dir, 1);

  // Tiny legs
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 2.5;
  for (let i = -1; i <= 1; i++) {
    const legSwing = e.stunTimer > 0 ? 0 : Math.sin(e.walkPhase + i) * 3;
    ctx.beginPath();
    ctx.moveTo(i * 8, 6);
    ctx.lineTo(i * 9 + legSwing, 13);
    ctx.stroke();
  }

  // Dome shell
  ctx.fillStyle = e.kind === 'clock_beetle' ? '#d97706' : '#dc2626';
  ctx.beginPath();
  ctx.arc(0, 6, 17, Math.PI, 0);
  ctx.closePath();
  ctx.fill();

  // Spots or brass rivets
  ctx.fillStyle = e.kind === 'clock_beetle' ? '#fef08a' : '#1c1917';
  ctx.beginPath();
  ctx.arc(-6, -2, 3.2, 0, Math.PI * 2);
  ctx.arc(3, -5, 2.8, 0, Math.PI * 2);
  ctx.arc(-1, 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(14, 3, 6, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(16, 1.5, 2, 0, Math.PI * 2);
  ctx.fill();

  // Antennae
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(16, -2);
  ctx.quadraticCurveTo(20, -9 + Math.sin(time * 8) * 1.5, 23, -7);
  ctx.stroke();

  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  const p = engine.player;
  const cx = p.x + p.w / 2;
  const by = p.y + p.h;

  ctx.save();
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 14) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  ctx.translate(cx, by);

  // Dandelion Seed Parachute when gliding!
  if (p.isGliding) {
    ctx.save();
    ctx.translate(0, -p.h - 4);
    const sway = Math.sin(engine.time * 8) * 0.08;
    ctx.rotate(sway);

    // Stem held by Pip
    ctx.strokeStyle = '#bef264';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(0, -24);
    ctx.stroke();

    // Fluffy dandelion parachute tufts
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.8;
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.26 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(Math.cos(a) * 24, -24 + Math.sin(a) * 16);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 24, -24 + Math.sin(a) * 16, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.scale(p.facing * p.scaleX, p.scaleY);

  // Tiny stepping feet
  const footOffset = p.grounded ? Math.sin(p.walkCycle) * 4 : 3;
  ctx.fillStyle = '#3f2e21';
  ctx.beginPath();
  ctx.ellipse(-5 + footOffset, -3, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(5 - footOffset, -3, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mossy leaf cloak body
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.quadraticCurveTo(-13, -24, 0, -26);
  ctx.quadraticCurveTo(13, -24, 12, -6);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(1, -24, 10.5, 0, Math.PI * 2);
  ctx.fill();

  // Acorn cap beret!
  ctx.fillStyle = '#92400e';
  ctx.beginPath();
  ctx.ellipse(0, -31, 12, 6.5, -0.1, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  // Acorn stem
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-1, -37);
  ctx.lineTo(-3, -42);
  ctx.stroke();

  // Glowing antennae / dew drop spark
  ctx.fillStyle = '#fde047';
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#fde047';
  ctx.beginPath();
  ctx.arc(-3, -43, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Expressive eyes
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(5, -24, 2.1, 0, Math.PI * 2);
  ctx.arc(10, -24, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Rosy cheek
  ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
  ctx.beginPath();
  ctx.arc(2.5, -20.5, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
