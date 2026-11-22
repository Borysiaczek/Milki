const INPUT_LABELS = [
  'O1', 'O2', 'O3', 'O4', 'O5',
  'T1', 'T2', 'T3', 'T4', 'T5',
  'ENE', 'PRĘ', 'OBR', 'ZEG'
];

const INPUT_DESCRIPTIONS = [
  'Promień 1 (skrajny lewy) — Odległość obiektu (1.0 = dotyk, 0.0 = pusto).',
  'Promień 2 (lewy) — Odległość obiektu (1.0 = dotyk, 0.0 = pusto).',
  'Promień 3 (środkowy) — Odległość obiektu przed głową organizmu.',
  'Promień 4 (prawy) — Odległość obiektu (1.0 = dotyk, 0.0 = pusto).',
  'Promień 5 (skrajny prawy) — Odległość obiektu (1.0 = dotyk, 0.0 = pusto).',
  'Promień 1 — Typ celu (+1 pokarm/ofiara, -1 drapieżnik/toksyna, 0 ściana).',
  'Promień 2 — Typ celu (+1 pokarm/ofiara, -1 drapieżnik/toksyna, 0 ściana).',
  'Promień 3 — Typ celu (+1 pokarm/ofiara, -1 drapieżnik/toksyna, 0 ściana).',
  'Promień 4 — Typ celu (+1 pokarm/ofiara, -1 drapieżnik/toksyna, 0 ściana).',
  'Promień 5 — Typ celu (+1 pokarm/ofiara, -1 drapieżnik/toksyna, 0 ściana).',
  'Poziom energii organizmu (od 0.0 = głód do 1.0 = pełnia sił).',
  'Znormalizowana prędkość liniowa płynięcia (0.0 do 1.0).',
  'Prędkość kątowa — określa kierunek i tempo obecnego skrętu.',
  'Zegar biologiczny sin(wiek · f) — generuje rytmiczne fale do pływania.'
];

const OUTPUT_LABELS = ['NAP', 'SKR', 'SPR'];

const OUTPUT_DESCRIPTIONS = [
  'Napęd (Thrust): +1 pełny ciąg naprzód, -1 cofanie. Koszt ~ NAP².',
  'Skręt (Torque): ujemny = w lewo, dodatni = w prawo.',
  'Sprint / Ugryzienie: > +0.5 włącza zryw (2.5× koszt) i wzmacnia atak.'
];

function activationColor(v) {
  const clamped = Math.max(-1, Math.min(1, v));
  if (clamped >= 0) {
    const r = Math.round(18 + (34 - 18) * clamped);
    const g = Math.round(28 + (235 - 28) * clamped);
    const b = Math.round(44 + (255 - 44) * clamped);
    return `rgb(${r},${g},${b})`;
  }
  const n = -clamped;
  const r = Math.round(18 + (244 - 18) * n);
  const g = Math.round(28 + (63 - 28) * n);
  const b = Math.round(44 + (94 - 44) * n);
  return `rgb(${r},${g},${b})`;
}

function dietLabelPL(diet) {
  if (diet < 0.4) return 'Roślinożerca';
  if (diet <= 0.7) return 'Wszystkożerca';
  return 'Mięsożerca';
}

export class HUD {
  constructor(world, state, callbacks) {
    this.world = world;
    this.state = state;
    this.callbacks = callbacks;

    this.elPopTotal = document.getElementById('stat-pop');
    this.elPopHerb = document.getElementById('stat-herb');
    this.elPopOmni = document.getElementById('stat-omni');
    this.elPopCarn = document.getElementById('stat-carn');
    this.elAvgGen = document.getElementById('stat-avg-gen');
    this.elMaxGen = document.getElementById('stat-max-gen');
    this.elFoodCount = document.getElementById('stat-food');
    this.elFps = document.getElementById('stat-fps');

    this.elEvoMorph = document.getElementById('stat-evo-morph');
    this.elEvoRepro = document.getElementById('stat-evo-repro');
    this.elHofList = document.getElementById('hof-list');

    this.elInspectorPanel = document.getElementById('inspector-panel');
    this.elInspectorEmpty = document.getElementById('inspector-empty');
    this.elInspectorContent = document.getElementById('inspector-content');
    this.elInspId = document.getElementById('insp-id');
    this.elInspDiet = document.getElementById('insp-diet');
    this.elInspGen = document.getElementById('insp-gen');
    this.elInspAge = document.getElementById('insp-age');
    this.elInspChildren = document.getElementById('insp-children');
    this.elInspEnergyText = document.getElementById('insp-energy-text');
    this.elInspEnergyBar = document.getElementById('insp-energy-bar');
    this.elInspMorph = document.getElementById('insp-morph');
    this.elInspStatus = document.getElementById('insp-status');
    this.elInspThought = document.getElementById('insp-thought');
    this.elNnTooltip = document.getElementById('nn-tooltip');

    this.nnCanvas = document.getElementById('nn-canvas');
    this.nnCtx = this.nnCanvas.getContext('2d');
    this.sparkCanvas = document.getElementById('sparkline-canvas');
    this.sparkCtx = this.sparkCanvas.getContext('2d');

    this.speedButtons = Array.from(document.querySelectorAll('[data-speed]'));
    this.elMutationSlider = document.getElementById('slider-mutation');
    this.elMutationVal = document.getElementById('val-mutation');
    this.elFoodSlider = document.getElementById('slider-food');
    this.elFoodVal = document.getElementById('val-food');
    this.elCarnSlider = document.getElementById('slider-carn');
    this.elCarnVal = document.getElementById('val-carn');

    this.elToggleSensors = document.getElementById('toggle-sensors');
    this.elToggleGrid = document.getElementById('toggle-grid');
    this.elToggleFoodBrush = document.getElementById('toggle-food-brush');
    this.elTogglePoisonBrush = document.getElementById('toggle-poison-brush');
    this.elBtnClone = document.getElementById('btn-clone-mutate');
    this.elBtnFollow = document.getElementById('btn-follow-selected');
    this.elBtnCloseInsp = document.getElementById('btn-close-inspector');
    this.elBtnReset = document.getElementById('btn-reset-world');

    this.nodePositions = [];
    this.hoveredNode = null;
    this.lastHofHash = '';

    this.bindEvents();
    this.syncControlsFromState();
  }

  bindEvents() {
    this.speedButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-speed');
        this.state.timeScaleMode = mode;
        this.updateSpeedButtons();
      });
    });

    this.elMutationSlider.addEventListener('input', () => {
      const val = parseFloat(this.elMutationSlider.value);
      this.world.mutationRate = val;
      this.elMutationVal.textContent = `${Math.round(val * 100)}%`;
    });

    this.elFoodSlider.addEventListener('input', () => {
      const val = parseFloat(this.elFoodSlider.value);
      this.world.foodSpawnRate = val;
      this.elFoodVal.textContent = `${val.toFixed(0)}/s`;
    });

    this.elCarnSlider.addEventListener('input', () => {
      const val = parseFloat(this.elCarnSlider.value);
      this.world.carnivoreEnergyMultiplier = val;
      this.elCarnVal.textContent = `${val.toFixed(2)}×`;
    });

    this.elToggleSensors.addEventListener('change', () => {
      this.state.showAllSensors = this.elToggleSensors.checked;
    });

    this.elToggleGrid.addEventListener('change', () => {
      this.state.showSpatialGrid = this.elToggleGrid.checked;
    });

    this.elToggleFoodBrush.addEventListener('change', () => {
      if (this.elToggleFoodBrush.checked) {
        this.state.brushMode = 'food';
        this.elTogglePoisonBrush.checked = false;
      } else if (this.state.brushMode === 'food') {
        this.state.brushMode = 'none';
      }
      this.callbacks.onBrushChange?.(this.state.brushMode);
    });

    this.elTogglePoisonBrush.addEventListener('change', () => {
      if (this.elTogglePoisonBrush.checked) {
        this.state.brushMode = 'poison';
        this.elToggleFoodBrush.checked = false;
      } else if (this.state.brushMode === 'poison') {
        this.state.brushMode = 'none';
      }
      this.callbacks.onBrushChange?.(this.state.brushMode);
    });

    this.elBtnClone.addEventListener('click', () => {
      if (this.state.selectedCreature) {
        this.callbacks.onCloneSelected?.();
      }
    });

    this.elBtnFollow.addEventListener('click', () => {
      this.state.followSelected = !this.state.followSelected;
      this.updateFollowButton();
    });

    this.elBtnCloseInsp.addEventListener('click', () => {
      this.state.selectedCreature = null;
      this.state.followSelected = false;
      this.updateFollowButton();
      this.updateInspector();
    });

    this.elBtnReset.addEventListener('click', () => {
      this.callbacks.onResetWorld?.();
    });

    this.nnCanvas.addEventListener('pointermove', (e) => {
      const rect = this.nnCanvas.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * this.nnCanvas.width;
      const sy = ((e.clientY - rect.top) / rect.height) * this.nnCanvas.height;
      let hit = null;
      let bestSq = 144;
      for (let i = 0; i < this.nodePositions.length; i++) {
        const n = this.nodePositions[i];
        const dx = n.x - sx;
        const dy = n.y - sy;
        const dSq = dx * dx + dy * dy;
        if (dSq < bestSq) {
          bestSq = dSq;
          hit = n;
        }
      }
      this.hoveredNode = hit;
      if (this.state.selectedCreature) {
        this.updateNnTooltip(this.state.selectedCreature.brain);
      }
    });

    this.nnCanvas.addEventListener('pointerleave', () => {
      this.hoveredNode = null;
      if (this.state.selectedCreature) {
        this.updateNnTooltip(this.state.selectedCreature.brain);
      }
    });
  }

  syncControlsFromState() {
    this.elMutationSlider.value = String(this.world.mutationRate);
    this.elMutationVal.textContent = `${Math.round(this.world.mutationRate * 100)}%`;
    this.elFoodSlider.value = String(this.world.foodSpawnRate);
    this.elFoodVal.textContent = `${this.world.foodSpawnRate.toFixed(0)}/s`;
    this.elCarnSlider.value = String(this.world.carnivoreEnergyMultiplier);
    this.elCarnVal.textContent = `${this.world.carnivoreEnergyMultiplier.toFixed(2)}×`;
    this.elToggleSensors.checked = this.state.showAllSensors;
    this.elToggleGrid.checked = this.state.showSpatialGrid;
    this.elToggleFoodBrush.checked = this.state.brushMode === 'food';
    this.elTogglePoisonBrush.checked = this.state.brushMode === 'poison';
    this.updateSpeedButtons();
    this.updateFollowButton();
  }

  updateFollowButton() {
    if (this.state.followSelected) {
      this.elBtnFollow.classList.add('bg-cyan-500/25', 'text-cyan-200', 'border-cyan-400/60');
      this.elBtnFollow.classList.remove('bg-slate-900/70', 'text-slate-400', 'border-slate-700/70');
      this.elBtnFollow.textContent = 'Śledzenie: WŁ';
    } else {
      this.elBtnFollow.classList.remove('bg-cyan-500/25', 'text-cyan-200', 'border-cyan-400/60');
      this.elBtnFollow.classList.add('bg-slate-900/70', 'text-slate-400', 'border-slate-700/70');
      this.elBtnFollow.textContent = 'Śledź kamerą';
    }
  }

  updateSpeedButtons() {
    const active = this.state.timeScaleMode;
    this.speedButtons.forEach((btn) => {
      const mode = btn.getAttribute('data-speed');
      if (mode === active) {
        btn.classList.add('bg-cyan-500/25', 'text-cyan-300', 'border-cyan-400/60', 'shadow-[0_0_12px_rgba(34,211,238,0.25)]');
        btn.classList.remove('bg-slate-900/70', 'text-slate-400', 'border-slate-700/60');
      } else {
        btn.classList.remove('bg-cyan-500/25', 'text-cyan-300', 'border-cyan-400/60', 'shadow-[0_0_12px_rgba(34,211,238,0.25)]');
        btn.classList.add('bg-slate-900/70', 'text-slate-400', 'border-slate-700/60');
      }
    });
  }

  update(fps) {
    const s = this.world.stats;
    this.elPopTotal.textContent = String(s.total);
    this.elPopHerb.textContent = String(s.herbivores);
    this.elPopOmni.textContent = String(s.omnivores);
    this.elPopCarn.textContent = String(s.carnivores);
    this.elAvgGen.textContent = s.avgGeneration.toFixed(1);
    this.elMaxGen.textContent = String(s.maxGeneration);
    this.elFoodCount.textContent = String(this.world.food.length);
    this.elFps.textContent = `${Math.round(fps)}`;

    this.elEvoMorph.textContent = `Śr. rozm. ${s.avgSize.toFixed(1)}px · Zasięg ${Math.round(s.avgRange)}px · FOV ${Math.round(s.avgFovDeg)}°`;
    const totalB = s.sexualBirths + s.asexualBirths;
    const sexPct = totalB > 0 ? Math.round((s.sexualBirths / totalB) * 100) : 0;
    this.elEvoRepro.textContent = `Narodziny: ${s.totalBirths} (Krzyżowanie ${sexPct}%)`;

    this.updateHallOfFame();
    this.updateInspector();
    this.drawSparkline();
  }

  updateHallOfFame() {
    const hof = this.world.hallOfFame;
    const hash = hof.map((h) => `${h.generation}:${Math.round(h.age)}:${h.diet.toFixed(2)}`).join('|');
    if (hash === this.lastHofHash) return;
    this.lastHofHash = hash;

    if (hof.length === 0) {
      this.elHofList.innerHTML = `<div class="text-[10px] text-slate-500 italic py-1">Oczekiwanie na pierwszych weteranów (&gt;6s)...</div>`;
      return;
    }

    this.elHofList.innerHTML = hof
      .map((entry, idx) => {
        const badgeColor =
          entry.diet < 0.4 ? 'text-emerald-300' : entry.diet <= 0.7 ? 'text-amber-300' : 'text-rose-300';
        return `<div class="flex items-center justify-between py-1 px-1.5 rounded bg-slate-900/70 border border-slate-800/70 text-[10px]">
          <div class="flex items-center gap-1.5 font-mono">
            <span class="text-slate-500">#${idx + 1}</span>
            <span class="${badgeColor} font-semibold">P${entry.generation}</span>
            <span class="text-slate-300">${entry.age.toFixed(0)}s</span>
          </div>
          <button data-revive="${idx}" class="px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition text-[9px] font-medium">Wskrześ</button>
        </div>`;
      })
      .join('');

    this.elHofList.querySelectorAll('[data-revive]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-revive'), 10);
        this.callbacks.onReviveHallOfFame?.(index);
      });
    });
  }

  describeThought(c) {
    if (!c.alive) return 'Organizm obumarł — jego wagi neuronowe zostały zamrożone do analizy.';

    let foodDir = 0;
    let threatDir = 0;
    let seesFood = false;
    let seesThreat = false;

    for (let r = 0; r < 5; r++) {
      const dist = c.rayDistances[r];
      if (dist <= 0.01) continue;
      const offset = r - 2;
      if (c.rayTypes[r] > 0.5) {
        seesFood = true;
        foodDir += offset * dist;
      } else if (c.rayTypes[r] < -0.5) {
        seesThreat = true;
        threatDir += offset * dist;
      }
    }

    const turnStr = c.torque < -0.2 ? 'skręca w lewo' : c.torque > 0.2 ? 'skręca w prawo' : 'płynie prosto';
    const moveStr = c.thrust > 0.2 ? 'przyspiesza' : c.thrust < -0.2 ? 'cofa się' : 'dryfuje';

    if (c.isBiting && seesFood) {
      return `Wykrywa ofiarę i aktywuje ATAK/SPRINT (2.5× energii) — ${turnStr}.`;
    }
    if (seesThreat) {
      const side = threatDir < -0.15 ? 'po lewej' : threatDir > 0.15 ? 'po prawej' : 'przed sobą';
      return `Wykrywa zagrożenie/toksynę ${side} (-1) → ${turnStr} i ${moveStr}.`;
    }
    if (seesFood) {
      const side = foodDir < -0.15 ? 'po lewej' : foodDir > 0.15 ? 'po prawej' : 'na wprost';
      return `Namierza pokarm ${side} (+1) → ${turnStr} i ${moveStr}.`;
    }
    if (c.energy >= c.maxEnergy * 0.82) {
      return `Wysoka energia — gotowy do podziału i przekazania genów (szuka partnera w 100px).`;
    }
    if (c.isSprinting) {
      return `Włączony SPRINT (SPR > 0.5) — szybki przelot kosztem 2.5× energii.`;
    }
    return `Eksploruje głębiny (${turnStr}, ${moveStr}) w rytmie zegara biologicznego.`;
  }

  updateNnTooltip(brain) {
    if (!this.hoveredNode) {
      this.elNnTooltip.textContent = 'Najedź na dowolny neuron, aby sprawdzić jego rolę i wartość aktywacji.';
      return;
    }
    const n = this.hoveredNode;
    if (n.layer === 0) {
      const val = brain.lastInputs[n.index];
      this.elNnTooltip.innerHTML = `<span class="text-cyan-300 font-mono font-bold">${INPUT_LABELS[n.index]} = ${val.toFixed(2)}</span> · ${INPUT_DESCRIPTIONS[n.index]}`;
    } else if (n.layer === 1) {
      const val = brain.lastHidden[n.index];
      const bias = brain.biasH[n.index];
      this.elNnTooltip.innerHTML = `<span class="text-purple-300 font-mono font-bold">Ukryty H${n.index + 1} = ${val.toFixed(2)}</span> (bias ${bias.toFixed(2)}) · Łączy cechy ze zmysłów przez tanh(Σ w·x + b).`;
    } else {
      const val = brain.lastOutputs[n.index];
      this.elNnTooltip.innerHTML = `<span class="text-emerald-300 font-mono font-bold">${OUTPUT_LABELS[n.index]} = ${val.toFixed(2)}</span> · ${OUTPUT_DESCRIPTIONS[n.index]}`;
    }
  }

  updateInspector() {
    const c = this.state.selectedCreature;
    if (!c) {
      this.elInspectorEmpty.classList.remove('hidden');
      this.elInspectorContent.classList.add('hidden');
      return;
    }

    this.elInspectorEmpty.classList.add('hidden');
    this.elInspectorContent.classList.remove('hidden');

    this.elInspId.textContent = `#${c.id}`;
    this.elInspGen.textContent = `P${c.generation}`;
    this.elInspAge.textContent = `${c.age.toFixed(1)}s`;
    this.elInspChildren.textContent = String(c.childrenCount);

    const cat = c.getDietCategory();
    this.elInspDiet.textContent = dietLabelPL(c.diet);
    if (cat === 'herbivore') {
      this.elInspDiet.className = 'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40';
    } else if (cat === 'omnivore') {
      this.elInspDiet.className = 'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40';
    } else {
      this.elInspDiet.className = 'px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/40';
    }

    if (c.alive) {
      this.elInspStatus.textContent = c.isSprinting ? 'SPRINT' : 'ŻYJE';
      this.elInspStatus.className = c.isSprinting
        ? 'text-[10px] font-mono text-cyan-300 tracking-wider'
        : 'text-[10px] font-mono text-emerald-400 tracking-wider';
    } else {
      this.elInspStatus.textContent = 'MARTWY';
      this.elInspStatus.className = 'text-[10px] font-mono text-rose-400 tracking-wider';
    }

    const energyPct = Math.max(0, Math.min(100, (c.energy / c.maxEnergy) * 100));
    this.elInspEnergyText.textContent = `${Math.round(c.energy)} / ${Math.round(c.maxEnergy)}`;
    this.elInspEnergyBar.style.width = `${energyPct.toFixed(1)}%`;

    const fovDeg = Math.round((c.fovAngle * 180) / Math.PI);
    this.elInspMorph.textContent = `Rozmiar ${c.size.toFixed(1)}px · Zasięg ${Math.round(c.sensorRange)}px · FOV ${fovDeg}°`;
    this.elInspThought.textContent = this.describeThought(c);

    this.drawNeuralNetwork(c.brain);
    this.updateNnTooltip(c.brain);
  }

  drawNeuralNetwork(brain) {
    const canvas = this.nnCanvas;
    const ctx = this.nnCtx;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const padX = 34;
    const padY = 12;
    const colX = [padX, w * 0.52, w - 34];

    const inCount = brain.inputCount;
    const hidCount = brain.hiddenCount;
    const outCount = brain.outputCount;

    const inY = new Float32Array(inCount);
    const hidY = new Float32Array(hidCount);
    const outY = new Float32Array(outCount);

    for (let i = 0; i < inCount; i++) {
      inY[i] = padY + (i / (inCount - 1)) * (h - padY * 2);
    }
    for (let i = 0; i < hidCount; i++) {
      hidY[i] = padY + 11 + (i / (hidCount - 1)) * (h - padY * 2 - 22);
    }
    for (let i = 0; i < outCount; i++) {
      outY[i] = h * 0.25 + (i / (outCount - 1)) * (h * 0.5);
    }

    this.nodePositions.length = 0;
    for (let i = 0; i < inCount; i++) this.nodePositions.push({ layer: 0, index: i, x: colX[0], y: inY[i], r: 4.2 });
    for (let i = 0; i < hidCount; i++) this.nodePositions.push({ layer: 1, index: i, x: colX[1], y: hidY[i], r: 5.2 });
    for (let i = 0; i < outCount; i++) this.nodePositions.push({ layer: 2, index: i, x: colX[2], y: outY[i], r: 6.4 });

    const wIH = brain.weightsIH;
    const wHO = brain.weightsHO;
    const lastIn = brain.lastInputs;
    const lastHid = brain.lastHidden;
    const lastOut = brain.lastOutputs;
    const hovered = this.hoveredNode;

    for (let hi = 0; hi < hidCount; hi++) {
      const offset = hi * inCount;
      for (let ii = 0; ii < inCount; ii++) {
        const weight = wIH[offset + ii];
        const mag = Math.abs(weight);
        if (mag < 0.16) continue;
        const isFocus = hovered && ((hovered.layer === 0 && hovered.index === ii) || (hovered.layer === 1 && hovered.index === hi));
        const alphaBase = hovered ? (isFocus ? 0.85 : 0.08) : Math.min(1, mag * 0.45 + Math.abs(lastIn[ii]) * 0.25) * 0.48;
        ctx.strokeStyle = weight >= 0
          ? `rgba(34, 211, 238, ${alphaBase.toFixed(2)})`
          : `rgba(244, 63, 94, ${alphaBase.toFixed(2)})`;
        ctx.lineWidth = isFocus ? Math.min(2.8, 0.9 + mag * 0.8) : Math.min(2.2, 0.45 + mag * 0.65);
        ctx.beginPath();
        ctx.moveTo(colX[0], inY[ii]);
        ctx.lineTo(colX[1], hidY[hi]);
        ctx.stroke();
      }
    }

    for (let oi = 0; oi < outCount; oi++) {
      const offset = oi * hidCount;
      for (let hi = 0; hi < hidCount; hi++) {
        const weight = wHO[offset + hi];
        const mag = Math.abs(weight);
        if (mag < 0.12) continue;
        const isFocus = hovered && ((hovered.layer === 1 && hovered.index === hi) || (hovered.layer === 2 && hovered.index === oi));
        const alphaBase = hovered ? (isFocus ? 0.9 : 0.08) : Math.min(1, mag * 0.5 + Math.abs(lastHid[hi]) * 0.35) * 0.65;
        ctx.strokeStyle = weight >= 0
          ? `rgba(34, 211, 238, ${alphaBase.toFixed(2)})`
          : `rgba(244, 63, 94, ${alphaBase.toFixed(2)})`;
        ctx.lineWidth = isFocus ? Math.min(3.2, 1.0 + mag * 0.95) : Math.min(2.6, 0.55 + mag * 0.8);
        ctx.beginPath();
        ctx.moveTo(colX[1], hidY[hi]);
        ctx.lineTo(colX[2], outY[oi]);
        ctx.stroke();
      }
    }

    ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < inCount; i++) {
      const val = lastIn[i];
      const isHov = hovered && hovered.layer === 0 && hovered.index === i;
      ctx.fillStyle = activationColor(val);
      ctx.beginPath();
      ctx.arc(colX[0], inY[i], isHov ? 5.6 : 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isHov ? '#fde047' : 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = isHov ? 1.8 : 1;
      ctx.stroke();

      ctx.fillStyle = isHov ? '#fde047' : 'rgba(148, 163, 184, 0.85)';
      ctx.textAlign = 'right';
      ctx.fillText(INPUT_LABELS[i], colX[0] - 7, inY[i]);
    }

    for (let i = 0; i < hidCount; i++) {
      const val = lastHid[i];
      const isHov = hovered && hovered.layer === 1 && hovered.index === i;
      ctx.fillStyle = activationColor(val);
      ctx.beginPath();
      ctx.arc(colX[1], hidY[i], isHov ? 6.6 : 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isHov ? '#fde047' : 'rgba(226, 232, 240, 0.45)';
      ctx.lineWidth = isHov ? 1.8 : 1;
      ctx.stroke();
    }

    for (let i = 0; i < outCount; i++) {
      const val = lastOut[i];
      const isHov = hovered && hovered.layer === 2 && hovered.index === i;
      const activeSprint = i === 2 && val > 0.5;
      if (activeSprint) {
        ctx.beginPath();
        ctx.arc(colX[2], outY[i], 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.fill();
      }
      ctx.fillStyle = activationColor(val);
      ctx.beginPath();
      ctx.arc(colX[2], outY[i], isHov ? 7.6 : 6.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isHov ? '#fde047' : activeSprint ? '#22d3ee' : 'rgba(226, 232, 240, 0.65)';
      ctx.lineWidth = isHov || activeSprint ? 1.8 : 1.1;
      ctx.stroke();

      ctx.fillStyle = isHov ? '#fde047' : 'rgba(226, 232, 240, 0.9)';
      ctx.textAlign = 'left';
      ctx.fillText(OUTPUT_LABELS[i], colX[2] + 9, outY[i]);
    }
  }

  drawSparkline() {
    const canvas = this.sparkCanvas;
    const ctx = this.sparkCtx;
    const w = canvas.width;
    const h = canvas.height;
    const history = this.world.telemetryHistory;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (history.length < 2) return;

    let maxPop = 30;
    let maxGen = 2;
    for (let i = 0; i < history.length; i++) {
      const sample = history[i];
      if (sample.herb > maxPop) maxPop = sample.herb;
      if (sample.omni > maxPop) maxPop = sample.omni;
      if (sample.carn > maxPop) maxPop = sample.carn;
      if (sample.avgGen > maxGen) maxGen = sample.avgGen;
    }

    const drawSeries = (getter, maxVal, color, dashed = false) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.35 : 1.75;
      if (dashed) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      const stepX = w / (history.length - 1);
      for (let i = 0; i < history.length; i++) {
        const x = i * stepX;
        const norm = getter(history[i]) / maxVal;
        const y = h - 4 - norm * (h - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    drawSeries((d) => d.herb, maxPop, '#2dd4bf', false);
    drawSeries((d) => d.omni, maxPop, 'rgba(251, 191, 36, 0.7)', false);
    drawSeries((d) => d.carn, maxPop, '#fb7185', false);
    drawSeries((d) => d.avgGen, maxGen, '#c084fc', true);
  }
}
