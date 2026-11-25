import { SPECIES, TOTAL_TARGETS } from '../sim/FoodChain.js';

const TARGET_HEADERS = [
  { label: 'Flora', color: 'text-emerald-300' },
  { label: 'Padlina', color: 'text-violet-300' },
  { label: 'Rośl', color: 'text-teal-300' },
  { label: 'Padl', color: 'text-purple-300' },
  { label: 'Wsz', color: 'text-amber-300' },
  { label: 'Łowca', color: 'text-rose-300' },
  { label: 'Alfa', color: 'text-sky-300' }
];

export class FoodChainModal {
  constructor(world, callbacks) {
    this.world = world;
    this.callbacks = callbacks;
    this.isOpen = false;

    this.modal = document.getElementById('foodchain-modal');
    this.backdrop = document.getElementById('foodchain-backdrop');
    this.btnOpen = document.getElementById('btn-open-chain');
    this.btnClose = document.getElementById('btn-close-chain');
    this.btnModeManual = document.getElementById('btn-chain-manual');
    this.btnModeEvo = document.getElementById('btn-chain-evo');
    this.elModeDesc = document.getElementById('chain-mode-desc');
    this.elPresetsBar = document.getElementById('chain-presets');
    this.elMatrixBody = document.getElementById('chain-matrix-body');
    this.graphCanvas = document.getElementById('chain-graph');
    this.graphCtx = this.graphCanvas.getContext('2d');

    this.bindEvents();
    this.renderAll();
  }

  bindEvents() {
    this.btnOpen.addEventListener('click', () => this.open());
    this.btnClose.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());

    this.btnModeManual.addEventListener('click', () => {
      this.world.foodChain.mode = 'manual';
      this.renderAll();
      this.callbacks.onModeChange?.();
    });

    this.btnModeEvo.addEventListener('click', () => {
      this.world.foodChain.mode = 'evolution';
      this.world.foodChain.computeEvolvedRates(this.world.creatures);
      this.renderAll();
      this.callbacks.onModeChange?.();
    });

    this.elPresetsBar.querySelectorAll('[data-chain-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-chain-preset');
        this.world.foodChain.mode = 'manual';
        this.world.foodChain.applyPreset(presetId);
        this.renderAll();
        this.callbacks.onModeChange?.();
      });
    });
  }

  open() {
    this.isOpen = true;
    this.modal.classList.remove('hidden');
    this.modal.classList.add('flex');
    this.world.foodChain.computeEvolvedRates(this.world.creatures);
    this.renderAll();
  }

  close() {
    this.isOpen = false;
    this.modal.classList.add('hidden');
    this.modal.classList.remove('flex');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  refreshIfOpen() {
    if (!this.isOpen) return;
    if (this.world.foodChain.mode === 'evolution') {
      this.world.foodChain.computeEvolvedRates(this.world.creatures);
      this.renderMatrix();
    }
    this.drawGraph();
  }

  renderAll() {
    const isEvo = this.world.foodChain.mode === 'evolution';
    if (isEvo) {
      this.btnModeEvo.className = 'px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-purple-500/25 text-purple-200 border-purple-400/60 transition';
      this.btnModeManual.className = 'px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-slate-900/70 text-slate-400 border-slate-700/70 hover:text-slate-200 transition';
      this.elModeDesc.textContent = 'Tryb Ewolucyjny: każdy miłek posiada własne mutujące geny diety. Łańcuch pokarmowy sam kształtuje się przez selekcję naturalną — tabela poniżej pokazuje aktualny % osobników polujących na dany cel.';
      this.elPresetsBar.classList.add('opacity-45');
    } else {
      this.btnModeManual.className = 'px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-cyan-500/25 text-cyan-200 border-cyan-400/60 transition';
      this.btnModeEvo.className = 'px-3 py-1.5 rounded-lg text-[11px] font-semibold border bg-slate-900/70 text-slate-400 border-slate-700/70 hover:text-slate-200 transition';
      this.elModeDesc.textContent = 'Tryb Ręczny: klikaj komórki tabeli poniżej, aby samemu ułożyć drzewo pokarmowe („Wiersz zjada Kolumnę”), albo wybierz gotowy szablon.';
      this.elPresetsBar.classList.remove('opacity-45');
    }
    this.renderMatrix();
    this.drawGraph();
  }

  renderMatrix() {
    const chain = this.world.foodChain;
    const isEvo = chain.mode === 'evolution';

    let html = `<tr class="border-b border-slate-800 text-[9.5px] font-mono">
      <th class="py-1.5 px-2 text-left text-slate-500">ZJADAJĄCY ↓ / CEL →</th>`;
    for (let t = 0; t < TARGET_HEADERS.length; t++) {
      html += `<th class="py-1.5 px-1.5 text-center ${TARGET_HEADERS[t].color}">${TARGET_HEADERS[t].label}</th>`;
    }
    html += `</tr>`;

    for (let s = 0; s < SPECIES.length; s++) {
      const sp = SPECIES[s];
      html += `<tr class="border-b border-slate-800/60">
        <td class="py-1.5 px-2 font-semibold text-[11px] whitespace-nowrap">
          <span class="inline-block w-2 h-2 rounded-full mr-1.5" style="background:${sp.color}"></span>
          <span class="text-slate-200">${sp.name}</span>
        </td>`;

      for (let t = 0; t < TOTAL_TARGETS; t++) {
        if (isEvo) {
          const pct = Math.round(chain.evolvedRates[s][t] * 100);
          const strong = pct >= 45;
          const cellCls = strong
            ? 'bg-purple-500/25 text-purple-200 border-purple-400/40'
            : pct >= 15
              ? 'bg-slate-800/80 text-slate-300 border-slate-700/60'
              : 'bg-slate-950/60 text-slate-600 border-slate-800/50';
          html += `<td class="p-1 text-center">
            <div class="py-1 rounded border text-[10px] font-mono ${cellCls}">${pct}%</div>
          </td>`;
        } else {
          const active = chain.matrix[s][t] === 1;
          const btnCls = active
            ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.18)]'
            : 'bg-slate-950/70 text-slate-600 border-slate-800 hover:border-slate-600 hover:text-slate-300';
          html += `<td class="p-1 text-center">
            <button data-cell="${s}:${t}" class="w-full py-1 rounded border text-[10px] font-mono transition ${btnCls}">${active ? 'TAK' : '—'}</button>
          </td>`;
        }
      }
      html += `</tr>`;
    }

    this.elMatrixBody.innerHTML = html;

    if (!isEvo) {
      this.elMatrixBody.querySelectorAll('[data-cell]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const [sStr, tStr] = btn.getAttribute('data-cell').split(':');
          chain.toggleRule(parseInt(sStr, 10), parseInt(tStr, 10));
          this.renderMatrix();
          this.drawGraph();
        });
      });
    }
  }

  drawGraph() {
    const canvas = this.graphCanvas;
    const ctx = this.graphCtx;
    const w = canvas.width;
    const h = canvas.height;
    const chain = this.world.foodChain;
    const isEvo = chain.mode === 'evolution';
    const stats = this.world.stats;

    ctx.clearRect(0, 0, w, h);

    const nodes = [
      { x: w * 0.32, y: h - 26, label: 'Flora', color: '#4ade80', count: this.world.food.length },
      { x: w * 0.68, y: h - 26, label: 'Padlina', color: '#c084fc', count: this.world.carrion.length },
      { x: w * 0.14, y: h * 0.52, label: 'Rośl', color: SPECIES[0].color, count: stats.herbivores },
      { x: w * 0.34, y: h * 0.56, label: 'Padl', color: SPECIES[1].color, count: stats.scavengers },
      { x: w * 0.54, y: h * 0.42, label: 'Wsz', color: SPECIES[2].color, count: stats.omnivores },
      { x: w * 0.74, y: h * 0.30, label: 'Łowca', color: SPECIES[3].color, count: stats.predatorsRed },
      { x: w * 0.88, y: h * 0.16, label: 'Alfa', color: SPECIES[4].color, count: stats.predatorsApex }
    ];

    for (let s = 0; s < SPECIES.length; s++) {
      const fromNode = nodes[2 + s];
      for (let t = 0; t < TOTAL_TARGETS; t++) {
        const strength = isEvo ? chain.evolvedRates[s][t] : chain.matrix[s][t];
        if (strength < 0.22) continue;
        const toNode = nodes[t];
        if (fromNode === toNode) continue;

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const curve = 16;
        const mx = (fromNode.x + toNode.x) * 0.5 + nx * curve;
        const my = (fromNode.y + toNode.y) * 0.5 + ny * curve;

        ctx.save();
        ctx.strokeStyle = fromNode.color;
        ctx.globalAlpha = 0.22 + strength * 0.62;
        ctx.lineWidth = 1.0 + strength * 1.6;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.quadraticCurveTo(mx, my, toNode.x, toNode.y);
        ctx.stroke();

        const tPos = 0.72;
        const ax = (1 - tPos) * (1 - tPos) * fromNode.x + 2 * (1 - tPos) * tPos * mx + tPos * tPos * toNode.x;
        const ay = (1 - tPos) * (1 - tPos) * fromNode.y + 2 * (1 - tPos) * tPos * my + tPos * tPos * toNode.y;
        const tx = 2 * (1 - tPos) * (mx - fromNode.x) + 2 * tPos * (toNode.x - mx);
        const ty = 2 * (1 - tPos) * (my - fromNode.y) + 2 * tPos * (toNode.y - my);
        const ang = Math.atan2(ty, tx);

        ctx.fillStyle = fromNode.color;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(ang - 0.45) * 7, ay - Math.sin(ang - 0.45) * 7);
        ctx.lineTo(ax - Math.cos(ang + 0.45) * 7, ay - Math.sin(ang + 0.45) * 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const rad = i < 2 ? 15 : 18;
      ctx.fillStyle = '#0b1120';
      ctx.beginPath();
      ctx.arc(n.x, n.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = n.color;
      ctx.fillText(n.label, n.x, n.y - 3);
      ctx.font = '600 8.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(String(n.count), n.x, n.y + 7);
      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    }
  }
}
