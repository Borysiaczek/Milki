import { World } from './sim/World.js';
import { HUD } from './ui/HUD.js';
import { Academy } from './ui/Academy.js';
import { FoodChainModal } from './ui/FoodChainModal.js';

const FIXED_DT = 1 / 60;
const MAX_PARTICLES = 320;

const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

const world = new World(3000, 2000);

const state = {
  timeScaleMode: '1',
  showAllSensors: false,
  showSpatialGrid: false,
  showEnvironment: true,
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

const bgDust = [];
for (let i = 0; i < 110; i++) {
  bgDust.push({
    x: Math.random() * 2000,
    y: Math.random() * 1400,
    r: 0.8 + Math.random() * 1.6,
    a: 0.08 + Math.random() * 0.16,
    phase: Math.random() * Math.PI * 2
  });
}

const particles = [];
let particleHead = 0;
for (let i = 0; i < MAX_PARTICLES; i++) {
  particles.push({
    active: false,
    ring: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 2,
    color: '#22d3ee'
  });
}

function emitParticle(x, y, vx, vy, life, size, color, ring = false) {
  const p = particles[particleHead];
  particleHead = (particleHead + 1) % MAX_PARTICLES;
  p.active = true;
  p.ring = ring;
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.life = life;
  p.maxLife = life;
  p.size = size;
  p.color = color;
}

function consumeFxEvents() {
  const events = world.fxEvents;
  const len = events.length;
  for (let i = 0; i < len; i++) {
    const e = events[i];
    if (e.type === 'birth') {
      emitParticle(e.x, e.y, 0, 0, 0.55, e.radius, e.color, true);
      for (let k = 0; k < 5; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 24 + Math.random() * 42;
        emitParticle(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.45, 2.2, e.color, false);
      }
    } else if (e.type === 'eat') {
      for (let k = 0; k < 4; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 18 + Math.random() * 34;
        emitParticle(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.35, 2.0, e.color, false);
      }
    } else if (e.type === 'bite' || e.type === 'hit') {
      emitParticle(e.x, e.y, 0, 0, 0.35, e.radius, e.color, true);
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 35 + Math.random() * 65;
        emitParticle(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.4, 2.4, e.color, false);
      }
    } else if (e.type === 'death') {
      for (let k = 0; k < 9; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 14 + Math.random() * 38;
        emitParticle(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.75, 2.6, e.color, false);
      }
    } else if (e.type === 'vent') {
      emitParticle(e.x, e.y, 0, 0, 0.9, e.radius, '#fb923c', true);
      for (let k = 0; k < 8; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 22 + Math.random() * 52;
        emitParticle(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.85, 2.8, '#fdba74', false);
      }
    } else if (e.type === 'crystal') {
      emitParticle(e.x, e.y, 0, 0, 1.0, e.radius, e.color, true);
      for (let k = 0; k < 10; k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 26 + Math.random() * 60;
        emitParticle(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.9, 2.5, e.color, false);
      }
    }
  }
  events.length = 0;
}

function updateParticles(dt) {
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    if (!p.ring) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const damp = Math.exp(-3.2 * dt);
      p.vx *= damp;
      p.vy *= damp;
    }
  }
}

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
  if (state.brushMode !== 'none') {
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
    world.seedInitialEcosystem({ reinitEnvironment: true });
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

const foodChainModal = new FoodChainModal(world, {});

const SPEED_MODES = ['0', '1', '2', '5', '10', '20', 'warp'];

window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    state.timeScaleMode = state.timeScaleMode === '0' ? '1' : '0';
    hud.updateSpeedButtons();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    const idx = SPEED_MODES.indexOf(state.timeScaleMode);
    if (idx >= 0 && idx < SPEED_MODES.length - 1) {
      state.timeScaleMode = SPEED_MODES[idx + 1];
      hud.updateSpeedButtons();
    }
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    const idx = SPEED_MODES.indexOf(state.timeScaleMode);
    if (idx > 0) {
      state.timeScaleMode = SPEED_MODES[idx - 1];
      hud.updateSpeedButtons();
    }
  } else if (e.key === 'h' || e.key === 'H') {
    foodChainModal.close();
    academy.toggle();
  } else if (e.key === 'l' || e.key === 'L') {
    academy.close();
    foodChainModal.toggle();
  } else if (e.key === 'Escape') {
    academy.close();
    foodChainModal.close();
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
  } else if (state.brushMode === 'carrion') {
    world.spawnCarrion(wp.x, wp.y, 2, 18, 56);
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

function drawBackdrop(timeSec) {
  const phase = world.getEnvironmentPhase();
  const grad = ctx.createRadialGradient(viewW * 0.5, viewH * 0.5, 40, viewW * 0.5, viewH * 0.5, Math.max(viewW, viewH) * 0.78);
  if (phase.id === 'bloom') {
    grad.addColorStop(0, '#0a1420');
    grad.addColorStop(1, '#05080f');
  } else if (phase.id === 'tide') {
    grad.addColorStop(0, '#09111e');
    grad.addColorStop(1, '#05070e');
  } else {
    grad.addColorStop(0, '#0c0b1a');
    grad.addColorStop(1, '#04050a');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);

  const pxOff = -(camera.x * 0.25) % 2000;
  const pyOff = -(camera.y * 0.25) % 1400;
  for (let i = 0; i < bgDust.length; i++) {
    const d = bgDust[i];
    let sx = (d.x + pxOff + timeSec * 4) % viewW;
    let sy = (d.y + pyOff + Math.sin(timeSec * 0.4 + d.phase) * 8) % viewH;
    if (sx < 0) sx += viewW;
    if (sy < 0) sy += viewH;
    ctx.fillStyle = `rgba(148, 210, 255, ${(d.a * (0.7 + 0.3 * Math.sin(timeSec + d.phase))).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

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
  ctx.strokeStyle = state.showSpatialGrid ? 'rgba(56, 189, 248, 0.22)' : 'rgba(30, 41, 59, 0.28)';
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

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
  ctx.lineWidth = 2.5 / camera.zoom;
  ctx.strokeRect(0, 0, world.width, world.height);
}

function drawEnvironment(timeSec) {
  const f = world.features;

  if (f.thermalZones) {
    for (let i = 0; i < world.warmZones.length; i++) {
    const z = world.warmZones[i];
    const pulse = 1 + Math.sin(timeSec * 1.1 + z.phase) * 0.03;
    const r = z.radius * pulse;
    const grad = ctx.createRadialGradient(z.x, z.y, 18, z.x, z.y, r);
    grad.addColorStop(0, 'rgba(249, 115, 22, 0.14)');
    grad.addColorStop(0.55, 'rgba(225, 29, 72, 0.065)');
    grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(z.x, z.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.2)';
    ctx.lineWidth = 1.4 / camera.zoom;
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(253, 186, 116, 0.28)';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STREFA CIEPŁA', z.x, z.y - z.radius * 0.72);
    ctx.restore();
  }

  for (let i = 0; i < world.coldZones.length; i++) {
    const z = world.coldZones[i];
    const pulse = 1 + Math.sin(timeSec * 0.9 + z.phase) * 0.025;
    const r = z.radius * pulse;
    const grad = ctx.createRadialGradient(z.x, z.y, 18, z.x, z.y, r);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
    grad.addColorStop(0.55, 'rgba(59, 130, 246, 0.06)');
    grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(z.x, z.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.22)';
    ctx.lineWidth = 1.4 / camera.zoom;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius * 0.94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(186, 230, 253, 0.26)';
    ctx.lineWidth = 1.1;
    for (let f = 0; f < 5; f++) {
      const ang = z.phase + f * 1.25;
      const fx = z.x + Math.cos(ang) * z.radius * (0.25 + (f % 3) * 0.2);
      const fy = z.y + Math.sin(ang * 1.1) * z.radius * (0.25 + ((f + 1) % 3) * 0.2);
      const sr = 6;
      for (let k = 0; k < 3; k++) {
        const ka = (k * Math.PI) / 3 + timeSec * 0.2;
        ctx.beginPath();
        ctx.moveTo(fx - Math.cos(ka) * sr, fy - Math.sin(ka) * sr);
        ctx.lineTo(fx + Math.cos(ka) * sr, fy + Math.sin(ka) * sr);
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('STREFA ZIMNA', z.x, z.y - z.radius * 0.72);
    ctx.restore();
  }
  }

  for (let i = 0; i < world.biomes.length; i++) {
    const b = world.biomes[i];
    const grad = ctx.createRadialGradient(b.x, b.y, 12, b.x, b.y, b.radius * 1.18);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.11)');
    grad.addColorStop(0.55, 'rgba(6, 182, 212, 0.04)');
    grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 1.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.12)';
    ctx.lineWidth = 1.2 / camera.zoom;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius * 0.88, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (f.currents) {
    for (let i = 0; i < world.currents.length; i++) {
      const cur = world.currents[i];
      const grad = ctx.createRadialGradient(cur.x, cur.y, 10, cur.x, cur.y, cur.radius);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.085)');
      grad.addColorStop(0.65, 'rgba(14, 165, 233, 0.03)');
      grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, cur.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cur.x, cur.y);
      ctx.rotate(cur.angle);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let s = -2; s <= 2; s++) {
        const yOff = s * (cur.radius * 0.28);
        const maxHalf = Math.sqrt(Math.max(100, cur.radius * cur.radius - yOff * yOff)) * 0.78;
        const travel = ((timeSec * 55 + s * 67 + i * 41) % (maxHalf * 2)) - maxHalf;
        const len = 34;
        const x1 = Math.max(-maxHalf, travel - len);
        const x2 = Math.min(maxHalf, travel);
        if (x2 - x1 > 8) {
          ctx.beginPath();
          ctx.moveTo(x1, yOff);
          ctx.lineTo(x2, yOff);
          ctx.lineTo(x2 - 5, yOff - 3.5);
          ctx.moveTo(x2, yOff);
          ctx.lineTo(x2 - 5, yOff + 3.5);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    for (let i = 0; i < world.whirlpools.length; i++) {
      const wp = world.whirlpools[i];
      ctx.save();
      ctx.translate(wp.x, wp.y);
      const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, wp.radius);
      grad.addColorStop(0, 'rgba(34, 211, 238, 0.16)');
      grad.addColorStop(0.6, 'rgba(14, 165, 233, 0.05)');
      grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, wp.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(103, 232, 249, 0.24)';
      ctx.lineWidth = 1.6;
      for (let arm = 0; arm < 3; arm++) {
        const baseA = wp.phase + (arm * Math.PI * 2) / 3;
        ctx.beginPath();
        for (let step = 0; step <= 22; step++) {
          const t = step / 22;
          const r = 14 + t * (wp.radius * 0.84);
          const a = baseA + t * 3.1 * wp.dir;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (step === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  if (f.kelp) {
    for (let i = 0; i < world.kelpClusters.length; i++) {
      const k = world.kelpClusters[i];
      ctx.save();
      for (let s = 0; s < k.stalks.length; s++) {
        const st = k.stalks[s];
        const bx = k.x + st.ox;
        const by = k.y + st.oy;
        const sway = Math.sin(timeSec * 1.8 + st.phase) * 14;
        const tipX = bx + sway;
        const tipY = by - st.len;

        ctx.strokeStyle = `hsla(${k.hue}, 68%, 45%, 0.42)`;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx - sway * 0.45, by - st.len * 0.5, tipX, tipY);
        ctx.stroke();

        ctx.fillStyle = `hsla(${k.hue + 16}, 92%, 68%, 0.68)`;
        ctx.beginPath();
        ctx.arc(tipX, tipY, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  if (f.crystalsAndVents) {
    for (let i = 0; i < world.vents.length; i++) {
      const v = world.vents[i];
      const pulse = 1 + Math.sin(timeSec * 3.4 + v.phase) * 0.14;
      const grad = ctx.createRadialGradient(v.x, v.y, 4, v.x, v.y, v.radius * 3.8 * pulse);
      grad.addColorStop(0, 'rgba(251, 146, 60, 0.28)');
      grad.addColorStop(0.45, 'rgba(234, 88, 12, 0.1)');
      grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.radius * 3.8 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e1b24';
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(v.x, v.y, v.radius * 0.28 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < world.crystals.length; i++) {
      const cr = world.crystals[i];
      const pulse = 1 + Math.sin(timeSec * 2.8 + cr.phase) * 0.14;
      const grad = ctx.createRadialGradient(cr.x, cr.y, 2, cr.x, cr.y, cr.radius * 3.6 * pulse);
      grad.addColorStop(0, `hsla(${cr.hue}, 92%, 66%, 0.34)`);
      grad.addColorStop(0.5, `hsla(${cr.hue}, 86%, 54%, 0.1)`);
      grad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cr.x, cr.y, cr.radius * 3.6 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(cr.x, cr.y);
      ctx.rotate(Math.sin(timeSec * 0.7 + cr.phase) * 0.12);
      const r = cr.radius * pulse;
      ctx.fillStyle = `hsla(${cr.hue}, 84%, 58%, 0.85)`;
      ctx.strokeStyle = `hsla(${cr.hue}, 96%, 84%, 0.92)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.15);
      ctx.lineTo(r * 0.72, 0);
      ctx.lineTo(0, r * 1.15);
      ctx.lineTo(-r * 0.72, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = `hsla(${cr.hue}, 100%, 92%, 0.7)`;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.58);
      ctx.lineTo(r * 0.32, 0);
      ctx.lineTo(0, r * 0.58);
      ctx.lineTo(-r * 0.32, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawObstacles() {
  if (!world.features.obstacles) return;
  const obstacles = world.obstacles;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const verts = o.verts;
    if (verts.length < 3) continue;

    ctx.save();
    ctx.beginPath();
    const len = verts.length;
    for (let j = 0; j < len; j++) {
      const curr = verts[j];
      const next = verts[(j + 1) % len];
      const cx = o.x + Math.cos(curr.a) * curr.r;
      const cy = o.y + Math.sin(curr.a) * curr.r;
      const nx = o.x + Math.cos(next.a) * next.r;
      const ny = o.y + Math.sin(next.a) * next.r;
      const mx = (cx + nx) * 0.5;
      const my = (cy + ny) * 0.5;
      if (j === 0) {
        const prev = verts[len - 1];
        const px = o.x + Math.cos(prev.a) * prev.r;
        const py = o.y + Math.sin(prev.a) * prev.r;
        ctx.moveTo((px + cx) * 0.5, (py + cy) * 0.5);
      }
      ctx.quadraticCurveTo(cx, cy, mx, my);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(o.x - o.radius * 0.25, o.y - o.radius * 0.25, 6, o.x, o.y, o.radius * 1.1);
    grad.addColorStop(0, `hsl(${o.hue}, 26%, 18%)`);
    grad.addColorStop(0.7, `hsl(${o.hue}, 28%, 11%)`);
    grad.addColorStop(1, `hsl(${o.hue}, 32%, 7%)`);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `hsla(${o.hue}, 65%, 52%, 0.42)`;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.strokeStyle = `hsla(${o.hue}, 75%, 64%, 0.16)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius * 0.48, 0.4, 2.5);
    ctx.stroke();
    ctx.restore();
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

    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
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

function drawCarrion(minX, minY, maxX, maxY, timeSec) {
  const carrion = world.carrion;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < carrion.length; i++) {
    const m = carrion[i];
    if (m.x < minX || m.x > maxX || m.y < minY || m.y > maxY) continue;
    const freshness = Math.max(0.25, m.ttl / m.maxTtl);
    const pulse = 1 + Math.sin(timeSec * 2.4 + m.phase) * 0.1;
    const r = m.radius * (0.55 + 0.45 * freshness) * pulse;

    ctx.fillStyle = `rgba(167, 139, 250, ${(0.24 * freshness).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.angle);
    ctx.fillStyle = `rgba(196, 181, 253, ${(0.88 * freshness).toFixed(2)})`;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const rad = k % 2 === 0 ? r * 1.15 : r * 0.68;
      if (k === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.82)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(p.x - r * 1.3, p.y);
    ctx.lineTo(p.x + r * 1.3, p.y);
    ctx.moveTo(p.x, p.y - r * 1.3);
    ctx.lineTo(p.x, p.y + r * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < MAX_PARTICLES; i++) {
    const p = particles[i];
    if (!p.active) continue;
    const t = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = t * 0.78;
    if (p.ring) {
      const r = p.size * (1.25 - t * 0.85);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.8 * t;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
    }
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
    if (type > 0.35) {
      stroke = highlight ? 'rgba(45, 212, 191, 0.88)' : 'rgba(45, 212, 191, 0.22)';
    } else if (type < -0.5) {
      stroke = highlight ? 'rgba(251, 113, 133, 0.92)' : 'rgba(251, 113, 133, 0.26)';
    } else {
      stroke = highlight ? 'rgba(148, 163, 184, 0.36)' : 'rgba(100, 116, 139, 0.1)';
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = highlight ? (dist > 0 ? 1.8 : 1.0) : 0.75;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.rayHitX[r], c.rayHitY[r]);
    ctx.stroke();

    if (highlight && dist > 0) {
      ctx.fillStyle = type > 0.35 ? '#2dd4bf' : type < -0.5 ? '#fb7185' : '#94a3b8';
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
    if (c.x < minX - 42 || c.x > maxX + 42 || c.y < minY - 42 || c.y > maxY + 42) continue;

    const s = c.size;
    const cat = c.getDietCategory();
    const cosA = Math.cos(c.angle);
    const sinA = Math.sin(c.angle);
    const perpX = -sinA;
    const perpY = cosA;

    const tailLen = s * (1.85 + Math.abs(c.thrust) * 0.72);
    const sway1 = Math.sin(c.tailPhase) * s * (0.28 + Math.abs(c.thrust) * 0.26);
    const sway2 = Math.sin(c.tailPhase - 1.5) * s * (0.54 + Math.abs(c.thrust) * 0.42);

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

    const auraScale = c.isSprinting ? 2.15 : c.eatFlash > 0.2 ? 1.9 : c === selected ? 1.85 : 1.48;
    ctx.fillStyle = c.biteFlash > 0.1 ? 'rgba(251, 113, 133, 0.36)' : c.glowColor;
    ctx.beginPath();
    ctx.arc(0, 0, s * auraScale, 0, Math.PI * 2);
    ctx.fill();

    if (cat === 'herbivore') {
      const antSway = Math.sin(c.tailPhase * 0.7) * s * 0.18;
      ctx.strokeStyle = c.strokeColor;
      ctx.lineWidth = Math.max(1.0, s * 0.13);
      ctx.beginPath();
      ctx.moveTo(s * 0.85, -s * 0.22);
      ctx.quadraticCurveTo(s * 1.25, -s * 0.55 + antSway, s * 1.5, -s * 0.42 + antSway);
      ctx.moveTo(s * 0.85, s * 0.22);
      ctx.quadraticCurveTo(s * 1.25, s * 0.55 - antSway, s * 1.5, s * 0.42 - antSway);
      ctx.stroke();
    } else if (cat === 'scavenger') {
      const wSway = Math.sin(c.tailPhase * 1.1) * s * 0.12;
      ctx.strokeStyle = 'rgba(221, 214, 254, 0.8)';
      ctx.lineWidth = Math.max(1.0, s * 0.12);
      ctx.beginPath();
      ctx.moveTo(s * 0.9, -s * 0.25);
      ctx.lineTo(s * 1.45, -s * 0.45 + wSway);
      ctx.moveTo(s * 0.98, 0);
      ctx.lineTo(s * 1.55, wSway * 0.5);
      ctx.moveTo(s * 0.9, s * 0.25);
      ctx.lineTo(s * 1.45, s * 0.45 - wSway);
      ctx.stroke();
    } else if (cat === 'omnivore') {
      const finSway = Math.sin(c.tailPhase) * 0.22;
      ctx.fillStyle = c.tailColor;
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.65);
      ctx.quadraticCurveTo(-s * 0.35, -s * (1.22 + finSway), -s * 0.65, -s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.1, s * 0.65);
      ctx.quadraticCurveTo(-s * 0.35, s * (1.22 - finSway), -s * 0.65, s * 0.55);
      ctx.closePath();
      ctx.fill();
    } else if (cat === 'predator_apex') {
      ctx.fillStyle = c.tailColor;
      ctx.beginPath();
      ctx.moveTo(s * 0.35, -s * 0.55);
      ctx.lineTo(-s * 0.3, -s * 1.25);
      ctx.lineTo(-s * 0.2, -s * 0.52);
      ctx.lineTo(-s * 0.78, -s * 1.05);
      ctx.lineTo(-s * 0.55, -s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.35, s * 0.55);
      ctx.lineTo(-s * 0.3, s * 1.25);
      ctx.lineTo(-s * 0.2, s * 0.52);
      ctx.lineTo(-s * 0.78, s * 1.05);
      ctx.lineTo(-s * 0.55, s * 0.4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = c.tailColor;
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.55);
      ctx.lineTo(-s * 0.65, -s * 1.12);
      ctx.lineTo(-s * 0.45, -s * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.55);
      ctx.lineTo(-s * 0.65, s * 1.12);
      ctx.lineTo(-s * 0.45, s * 0.45);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = c.hitFlash > 0.2 ? '#ffffff' : c.fillColor;
    ctx.strokeStyle = c.strokeColor;
    ctx.lineWidth = Math.max(0.9, s * 0.11);
    ctx.beginPath();
    if (cat === 'predator_red' || cat === 'predator_apex') {
      const tip = cat === 'predator_apex' ? 1.4 : 1.32;
      ctx.moveTo(s * tip, 0);
      ctx.bezierCurveTo(s * 0.72, -s * 0.85, -s * 0.72, -s * 0.75, -s * 1.0, 0);
      ctx.bezierCurveTo(-s * 0.72, s * 0.75, s * 0.72, s * 0.85, s * tip, 0);
    } else if (cat === 'scavenger') {
      ctx.moveTo(s * 1.1, 0);
      ctx.bezierCurveTo(s * 0.78, -s * 1.02, -s * 0.78, -s * 0.96, -s * 0.96, 0);
      ctx.bezierCurveTo(-s * 0.78, s * 0.96, s * 0.78, s * 1.02, s * 1.1, 0);
    } else {
      ctx.moveTo(s * 1.18, 0);
      ctx.bezierCurveTo(s * 0.75, -s * 0.95, -s * 0.85, -s * 0.82, -s * 0.92, 0);
      ctx.bezierCurveTo(-s * 0.85, s * 0.82, s * 0.75, s * 0.95, s * 1.18, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (cat === 'scavenger') {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.48)';
      ctx.lineWidth = Math.max(1.0, s * 0.13);
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.58);
      ctx.quadraticCurveTo(-s * 0.25, 0, -s * 0.4, s * 0.58);
      ctx.moveTo(0, -s * 0.66);
      ctx.quadraticCurveTo(s * 0.14, 0, 0, s * 0.66);
      ctx.stroke();
    } else if (cat === 'predator_apex') {
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)';
      ctx.lineWidth = Math.max(1.0, s * 0.11);
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, 0);
      ctx.lineTo(s * 0.45, 0);
      ctx.stroke();
    }

    ctx.fillStyle = c.coreColor;
    ctx.beginPath();
    ctx.arc(s * 0.14, 0, s * 0.34, 0, Math.PI * 2);
    ctx.fill();

    const eyeSpread = Math.min(0.62, Math.max(0.24, c.fovAngle * 0.26));
    const eyeX = s * 0.52;
    const eyeY = s * eyeSpread;
    const eyeR = Math.max(1.2, s * 0.16);
    ctx.fillStyle = '#07090e';
    ctx.beginPath();
    ctx.arc(eyeX, -eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.3, -eyeY - eyeR * 0.25, eyeR * 0.35, 0, Math.PI * 2);
    ctx.arc(eyeX + eyeR * 0.3, eyeY - eyeR * 0.25, eyeR * 0.35, 0, Math.PI * 2);
    ctx.fill();

    if (cat === 'predator_red' || cat === 'predator_apex') {
      const jawSpread = c.biteFlash > 0.1 || c.isBiting ? 0.44 : 0.16;
      const jawLen = cat === 'predator_apex' ? 1.58 : 1.48;
      ctx.strokeStyle =
        cat === 'predator_apex'
          ? 'rgba(186, 230, 253, 0.92)'
          : c.biteFlash > 0.1
            ? '#fecdd3'
            : 'rgba(255, 228, 230, 0.82)';
      ctx.lineWidth = Math.max(1.3, s * 0.16);
      ctx.beginPath();
      ctx.moveTo(s * 0.95, -s * 0.28);
      ctx.lineTo(s * jawLen, -s * jawSpread);
      ctx.moveTo(s * 0.95, s * 0.28);
      ctx.lineTo(s * jawLen, s * jawSpread);
      ctx.stroke();
    }

    if (camera.zoom > 1.25 || c === selected) {
      const ePct = Math.max(0, Math.min(1, c.energy / c.maxEnergy));
      ctx.strokeStyle = ePct > 0.85 ? 'rgba(34, 211, 238, 0.7)' : 'rgba(226, 232, 240, 0.35)';
      ctx.lineWidth = 1.4 / camera.zoom;
      ctx.beginPath();
      ctx.arc(0, 0, s + 4.5, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * ePct);
      ctx.stroke();
    }

    ctx.restore();

    if (camera.zoom >= 1.35 && c !== selected) {
      ctx.save();
      ctx.font = `600 ${(10 / Math.sqrt(camera.zoom)).toFixed(1)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
      ctx.fillText(c.name, c.x, c.y - s - 7);
      ctx.restore();
    }
  }

  if (selected && selected.alive) {
    drawCreatureRays(selected, true);

    const pulse = 1 + Math.sin(timeSec * 6.0) * 0.1;
    const r = (selected.size + 12) * pulse;
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

    const fontSize = Math.max(10, 12 / Math.sqrt(camera.zoom));
    ctx.font = `700 ${fontSize.toFixed(1)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const label = `${selected.name} · P${selected.generation}`;
    const tw = ctx.measureText(label).width;
    const lx = selected.x;
    const ly = selected.y - r - 9 / Math.sqrt(camera.zoom);
    ctx.fillStyle = 'rgba(7, 11, 20, 0.82)';
    ctx.fillRect(lx - tw * 0.5 - 5, ly - fontSize, tw + 10, fontSize + 5);
    ctx.fillStyle = '#67e8f9';
    ctx.fillText(label, lx, ly - 1);
    ctx.restore();
  }
}

function render(timeSec) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBackdrop(timeSec);

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

  drawEnvironment(timeSec);
  drawBackgroundGrid(minX, minY, maxX, maxY);
  drawObstacles();
  drawFood(minX, minY, maxX, maxY, timeSec);
  drawCarrion(minX, minY, maxX, maxY, timeSec);
  drawPoison(minX, minY, maxX, maxY, timeSec);
  drawParticles();
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
    for (let i = 0; i < 30; i++) {
      world.step(FIXED_DT);
      if (i < 29) world.fxEvents.length = 0;
    }
    consumeFxEvents();
    updateParticles(rawDt * 3.0);
  } else if (mode !== '0') {
    const scale = parseFloat(mode) || 1;
    accumulator += rawDt * scale;
    let steps = 0;
    const maxSteps = Math.min(24, Math.max(2, Math.ceil(scale * 1.5)));
    while (accumulator >= FIXED_DT && steps < maxSteps) {
      if (steps > 0 && scale >= 10) world.fxEvents.length = 0;
      world.step(FIXED_DT);
      accumulator -= FIXED_DT;
      steps++;
    }
    if (accumulator > FIXED_DT * 3) {
      accumulator = 0;
    }
    consumeFxEvents();
    updateParticles(rawDt * Math.min(3.0, scale));
  }

  if (state.followSelected && state.selectedCreature && state.selectedCreature.alive) {
    const lerp = 1 - Math.exp(-8 * rawDt);
    camera.x += (state.selectedCreature.x - camera.x) * lerp;
    camera.y += (state.selectedCreature.y - camera.y) * lerp;
  }

  const timeSec = now * 0.001;
  render(timeSec);
  hud.animateDna(timeSec);

  hudAccum += rawDt;
  if (hudAccum >= 0.08) {
    hudAccum = 0;
    hud.update(fpsSmoothed);
    foodChainModal.refreshIfOpen();
  }

  requestAnimationFrame(loop);
}

hud.update(60);
requestAnimationFrame(loop);
