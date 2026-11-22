import { World } from './sim/World.js';
import { HUD } from './ui/HUD.js';
import { Academy } from './ui/Academy.js';

const FIXED_DT = 1 / 60;

const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const world = new World(3000, 2000);

const state = {
  timeScaleMode: '1',
  showAllSensors: false,
  showSpatialGrid: false,
  brushMode: 'none',
  selectedCreature: null,
  followSelected: false
};

const camera = {
  x: world.width * 0.5,
  y: world.height * 0.5,
  zoom: 0.72,
  targetZoom: 0.72,
  minZoom: 0.24,
  maxZoom: 3.4
};

let viewW = window.innerWidth;
let viewH = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(viewH * dpr);
  canvas.style.width = `${viewW}px`;
  canvas.style.height = `${viewH}px`;
}

function screenToWorld(sx, sy) {
  return {
    x: (sx - viewW * 0.5) / camera.zoom + camera.x,
    y: (sy - viewH * 0.5) / camera.zoom + camera.y
  };
}

function updateCursor() {
  if (state.brushMode === 'food' || state.brushMode === 'poison') {
    canvas.style.cursor = 'crosshair';
  } else if (pointer.isPanning) {
    canvas.style.cursor = 'grabbing';
  } else {
    canvas.style.cursor = 'grab';
  }
}

const hud = new HUD(world, state, {
  onBrushChange: () => updateCursor(),
  onCloneSelected: () => {
    if (state.selectedCreature) {
      const child = world.cloneAndMutateCreature(state.selectedCreature);
      if (child) {
        state.selectedCreature = child;
        hud.updateInspector();
      }
    }
  },
  onResetWorld: () => {
    state.selectedCreature = null;
    state.followSelected = false;
    world.seedInitialEcosystem();
    hud.syncControlsFromState();
    hud.updateInspector();
  },
  onReviveHallOfFame: (index) => {
    const child = world.spawnFromHallOfFame(index, camera.x, camera.y);
    if (child) {
      state.selectedCreature = child;
      hud.updateInspector();
    }
  }
});

const academy = new Academy({
  onApplyScenario: (scenarioId) => {
    state.selectedCreature = null;
    state.followSelected = false;
    world.applyScenario(scenarioId);
    hud.syncControlsFromState();
    hud.updateInspector();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    state.timeScaleMode = state.timeScaleMode === '0' ? '1' : '0';
    hud.updateSpeedButtons();
  } else if (e.key === 'h' || e.key === 'H') {
    academy.toggle();
  } else if (e.key === 'Escape') {
    academy.close();
  }
});

const pointer = {
  down: false,
  button: 0,
  isPanning: false,
  isPainting: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  movedDist: 0,
  lastPaintTime: 0
};

function applyBrushAt(sx, sy, force = false) {
  const now = performance.now();
  if (!force && now - pointer.lastPaintTime < 35) return;
  pointer.lastPaintTime = now;
  const wp = screenToWorld(sx, sy);
  if (wp.x < 0 || wp.x > world.width || wp.y < 0 || wp.y > world.height) return;
  if (state.brushMode === 'food') {
    world.spawnFood(wp.x, wp.y, 4, 22);
  } else if (state.brushMode === 'poison') {
    world.spawnPoison(wp.x, wp.y, 2, 18);
  }
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  pointer.down = true;
  pointer.button = e.button;
  pointer.startX = e.clientX;
  pointer.startY = e.clientY;
  pointer.lastX = e.clientX;
  pointer.lastY = e.clientY;
  pointer.movedDist = 0;

  if (e.button === 0 && state.brushMode !== 'none') {
    pointer.isPainting = true;
    pointer.isPanning = false;
    applyBrushAt(e.clientX, e.clientY, true);
  } else {
    pointer.isPanning = true;
    pointer.isPainting = false;
  }
  updateCursor();
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointer.down) return;
  const dx = e.clientX - pointer.lastX;
  const dy = e.clientY - pointer.lastY;
  pointer.lastX = e.clientX;
  pointer.lastY = e.clientY;
  pointer.movedDist += Math.hypot(dx, dy);

  if (pointer.isPainting) {
    applyBrushAt(e.clientX, e.clientY, false);
  } else if (pointer.isPanning) {
    if (pointer.movedDist > 4 && state.followSelected) {
      state.followSelected = false;
      hud.updateFollowButton();
    }
    camera.x -= dx / camera.zoom;
    camera.y -= dy / camera.zoom;
    camera.x = Math.max(-400, Math.min(world.width + 400, camera.x));
    camera.y = Math.max(-400, Math.min(world.height + 400, camera.y));
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (pointer.down && pointer.button === 0 && !pointer.isPainting && pointer.movedDist < 7) {
    const wp = screenToWorld(e.clientX, e.clientY);
    const hitRadius = Math.max(22, 28 / camera.zoom);
    const picked = world.findCreatureAt(wp.x, wp.y, hitRadius);
    state.selectedCreature = picked;
    hud.updateInspector();
  }
  pointer.down = false;
  pointer.isPanning = false;
  pointer.isPainting = false;
  updateCursor();
  if (canvas.hasPointerCapture(e.pointerId)) {
    canvas.releasePointerCapture(e.pointerId);
  }
});

canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const before = screenToWorld(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.14 : 1 / 1.14;
    const nextZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom * factor));
    camera.zoom = nextZoom;
    camera.targetZoom = nextZoom;
    const after = screenToWorld(e.clientX, e.clientY);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
  },
  { passive: false }
);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
updateCursor();

function drawBackgroundGrid(minX, minY, maxX, maxY) {
  const cell = world.creatureGrid.cellSize;
  const startX = Math.max(0, Math.floor(minX / cell) * cell);
  const endX = Math.min(world.width, Math.ceil(maxX / cell) * cell);
  const startY = Math.max(0, Math.floor(minY / cell) * cell);
  const endY = Math.min(world.height, Math.ceil(maxY / cell) * cell);

  if (state.showSpatialGrid) {
    const grid = world.creatureGrid;
    const cStart = Math.max(0, Math.floor(minX / cell));
    const cEnd = Math.min(grid.cols - 1, Math.ceil(maxX / cell));
    const rStart = Math.max(0, Math.floor(minY / cell));
    const rEnd = Math.min(grid.rows - 1, Math.ceil(maxY / cell));

    ctx.fillStyle = 'rgba(34, 211, 238, 0.065)';
    for (let cy = rStart; cy <= rEnd; cy++) {
      const rowOff = cy * grid.cols;
      for (let cx = cStart; cx <= cEnd; cx++) {
        if (grid.cellHead[rowOff + cx] !== -1) {
          ctx.fillRect(cx * cell + 1, cy * cell + 1, cell - 2, cell - 2);
        }
      }
    }
  }

  ctx.beginPath();
  ctx.strokeStyle = state.showSpatialGrid ? 'rgba(56, 189, 248, 0.22)' : 'rgba(30, 41, 59, 0.36)';
  ctx.lineWidth = 1 / camera.zoom;
  for (let x = startX; x <= endX; x += cell) {
    ctx.moveTo(x, Math.max(0, startY));
    ctx.lineTo(x, Math.min(world.height, endY));
  }
  for (let y = startY; y <= endY; y += cell) {
    ctx.moveTo(Math.max(0, startX), y);
    ctx.lineTo(Math.min(world.width, endX), y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.38)';
  ctx.lineWidth = 2.5 / camera.zoom;
  ctx.strokeRect(0, 0, world.width, world.height);
}

function drawBiomes() {
  for (let i = 0; i < world.biomes.length; i++) {
    const b = world.biomes[i];
    const grad = ctx.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.radius * 1.15);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.085)');
    grad.addColorStop(0.55, 'rgba(6, 182, 212, 0.032)');
    grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 1.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFood(minX, minY, maxX, maxY, timeSec) {
  const food = world.food;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < food.length; i++) {
    const f = food[i];
    if (f.x < minX || f.x > maxX || f.y < minY || f.y > maxY) continue;
    const pulse = 1 + Math.sin(timeSec * 3.2 + f.phase) * 0.14;
    const r = f.radius * pulse;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.24)';
    ctx.beginPath();
    ctx.arc(f.x, f.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPoison(minX, minY, maxX, maxY, timeSec) {
  const poison = world.poison;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < poison.length; i++) {
    const p = poison[i];
    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
    const pulse = 1 + Math.sin(timeSec * 4.8 + p.phase) * 0.18;
    const r = p.radius * pulse;

    ctx.fillStyle = 'rgba(217, 70, 239, 0.22)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.82, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x - r * 1.25, p.y);
    ctx.lineTo(p.x + r * 1.25, p.y);
    ctx.moveTo(p.x, p.y - r * 1.25);
    ctx.lineTo(p.x, p.y + r * 1.25);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCreatureRays(c, highlight) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let r = 0; r < 5; r++) {
    const type = c.rayTypes[r];
    const dist = c.rayDistances[r];
    let stroke;
    if (type > 0.5) {
      stroke = highlight ? 'rgba(45, 212, 191, 0.88)' : 'rgba(45, 212, 191, 0.24)';
    } else if (type < -0.5) {
      stroke = highlight ? 'rgba(251, 113, 133, 0.92)' : 'rgba(251, 113, 133, 0.28)';
    } else {
      stroke = highlight ? 'rgba(148, 163, 184, 0.34)' : 'rgba(100, 116, 139, 0.1)';
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = highlight ? (dist > 0 ? 1.8 : 1.0) : 0.75;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.rayHitX[r], c.rayHitY[r]);
    ctx.stroke();

    if (highlight && dist > 0) {
      ctx.fillStyle = type > 0.5 ? '#2dd4bf' : type < -0.5 ? '#fb7185' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(c.rayHitX[r], c.rayHitY[r], 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCreatures(minX, minY, maxX, maxY, timeSec) {
  const creatures = world.creatures;
  const selected = state.selectedCreature;

  if (state.showAllSensors) {
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (c === selected) continue;
      if (c.x < minX - 180 || c.x > maxX + 180 || c.y < minY - 180 || c.y > maxY + 180) continue;
      drawCreatureRays(c, false);
    }
  }

  for (let i = 0; i < creatures.length; i++) {
    const c = creatures[i];
    if (c.x < minX - 40 || c.x > maxX + 40 || c.y < minY - 40 || c.y > maxY + 40) continue;

    const s = c.size;
    const cosA = Math.cos(c.angle);
    const sinA = Math.sin(c.angle);
    const perpX = -sinA;
    const perpY = cosA;

    const tailLen = s * (1.85 + Math.abs(c.thrust) * 0.7);
    const sway1 = Math.sin(c.tailPhase) * s * (0.28 + Math.abs(c.thrust) * 0.25);
    const sway2 = Math.sin(c.tailPhase - 1.5) * s * (0.52 + Math.abs(c.thrust) * 0.4);

    const t0x = c.x - cosA * s * 0.75;
    const t0y = c.y - sinA * s * 0.75;
    const t1x = c.x - cosA * (s * 0.75 + tailLen * 0.48) + perpX * sway1;
    const t1y = c.y - sinA * (s * 0.75 + tailLen * 0.48) + perpY * sway1;
    const t2x = c.x - cosA * (s * 0.75 + tailLen) + perpX * sway2;
    const t2y = c.y - sinA * (s * 0.75 + tailLen) + perpY * sway2;

    ctx.strokeStyle = c.tailColor;
    ctx.lineWidth = Math.max(1.4, s * 0.24);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(t0x, t0y);
    ctx.quadraticCurveTo(t1x, t1y, t2x, t2y);
    ctx.stroke();

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);

    if (c.isSprinting || c.biteFlash > 0.1 || c === selected) {
      ctx.fillStyle = c.biteFlash > 0.1 ? 'rgba(251, 113, 133, 0.35)' : c.glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, s * (c.isSprinting ? 2.15 : 1.75), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = c.glowColor;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = c.hitFlash > 0.2 ? '#ffffff' : c.fillColor;
    ctx.beginPath();
    ctx.moveTo(s * 1.18, 0);
    ctx.bezierCurveTo(s * 0.75, -s * 0.95, -s * 0.85, -s * 0.82, -s * 0.92, 0);
    ctx.bezierCurveTo(-s * 0.85, s * 0.82, s * 0.75, s * 0.95, s * 1.18, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = c.coreColor;
    ctx.beginPath();
    ctx.arc(s * 0.15, 0, s * 0.38, 0, Math.PI * 2);
    ctx.fill();

    const eyeSpread = Math.min(0.62, Math.max(0.24, c.fovAngle * 0.26));
    const eyeX = s * 0.52;
    const eyeY = s * eyeSpread;
    const eyeR = Math.max(1.2, s * 0.15);
    ctx.fillStyle = '#07090e';
    ctx.beginPath();
    ctx.arc(eyeX, -eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    if (c.diet > 0.7) {
      ctx.strokeStyle = c.biteFlash > 0.1 ? '#fecdd3' : 'rgba(255, 228, 230, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(s * 0.95, -s * 0.28);
      ctx.lineTo(s * 1.42, -s * 0.12);
      ctx.moveTo(s * 0.95, s * 0.28);
      ctx.lineTo(s * 1.42, s * 0.12);
      ctx.stroke();
    }

    ctx.restore();
  }

  if (selected && selected.alive) {
    drawCreatureRays(selected, true);

    const pulse = 1 + Math.sin(timeSec * 6.0) * 0.1;
    const r = (selected.size + 11) * pulse;
    ctx.save();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.8 / Math.sqrt(camera.zoom);
    ctx.beginPath();
    ctx.arc(selected.x, selected.y, r, 0, Math.PI * 2);
    ctx.stroke();

    const tick = 6 / Math.sqrt(camera.zoom);
    ctx.beginPath();
    ctx.moveTo(selected.x - r - tick, selected.y);
    ctx.lineTo(selected.x - r + 2, selected.y);
    ctx.moveTo(selected.x + r - 2, selected.y);
    ctx.lineTo(selected.x + r + tick, selected.y);
    ctx.moveTo(selected.x, selected.y - r - tick);
    ctx.lineTo(selected.x, selected.y - r + 2);
    ctx.moveTo(selected.x, selected.y + r - 2);
    ctx.lineTo(selected.x, selected.y + r + tick);
    ctx.stroke();
    ctx.restore();
  }
}

function render(timeSec) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#07090e';
  ctx.fillRect(0, 0, viewW, viewH);

  ctx.save();
  ctx.translate(viewW * 0.5, viewH * 0.5);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  const halfW = (viewW * 0.5) / camera.zoom;
  const halfH = (viewH * 0.5) / camera.zoom;
  const minX = camera.x - halfW;
  const maxX = camera.x + halfW;
  const minY = camera.y - halfH;
  const maxY = camera.y + halfH;

  drawBiomes();
  drawBackgroundGrid(minX, minY, maxX, maxY);
  drawFood(minX, minY, maxX, maxY, timeSec);
  drawPoison(minX, minY, maxX, maxY, timeSec);
  drawCreatures(minX, minY, maxX, maxY, timeSec);

  ctx.restore();
}

let lastFrameTime = performance.now();
let accumulator = 0;
let fpsSmoothed = 60;
let hudAccum = 0;

function loop(now) {
  const rawDt = Math.min(0.05, Math.max(0.0001, (now - lastFrameTime) / 1000));
  lastFrameTime = now;

  const instFps = 1 / rawDt;
  fpsSmoothed = fpsSmoothed * 0.9 + instFps * 0.1;

  const mode = state.timeScaleMode;
  if (mode === 'warp') {
    for (let i = 0; i < 16; i++) {
      world.step(FIXED_DT);
    }
  } else if (mode !== '0') {
    const scale = parseFloat(mode) || 1;
    accumulator += rawDt * scale;
    let steps = 0;
    const maxSteps = Math.max(2, Math.ceil(scale * 2));
    while (accumulator >= FIXED_DT && steps < maxSteps) {
      world.step(FIXED_DT);
      accumulator -= FIXED_DT;
      steps++;
    }
    if (accumulator > FIXED_DT * 3) {
      accumulator = 0;
    }
  }

  if (state.followSelected && state.selectedCreature && state.selectedCreature.alive) {
    const lerp = 1 - Math.exp(-8 * rawDt);
    camera.x += (state.selectedCreature.x - camera.x) * lerp;
    camera.y += (state.selectedCreature.y - camera.y) * lerp;
  }

  render(now * 0.001);

  hudAccum += rawDt;
  if (hudAccum >= 0.08) {
    hudAccum = 0;
    hud.update(fpsSmoothed);
  }

  requestAnimationFrame(loop);
}

hud.update(60);
requestAnimationFrame(loop);
