import { getSpeciesByIndex, getSpeciesIndexFromDiet } from '../sim/FoodChain.js';

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
  if (diet < 0.3) return 'Roślinożerca';
  if (diet < 0.52) return 'Padlinożerca';
  if (diet <= 0.74) return 'Wszystkożerca';
  return 'Mięsożerca';
}

export class HUD {
  constructor(world, state, callbacks) {
    this.world = world;
    this.state = state;
    this.callbacks = callbacks;

    this.elPopTotal = document.getElementById('stat-pop');
    this.elPopHerb = document.getElementById('stat-herb');
    this.elPopScav = document.getElementById('stat-scav');
    this.elPopOmni = document.getElementById('stat-omni');
    this.elPopCarn = document.getElementById('stat-carn');
    this.elPopApex = document.getElementById('stat-apex');
    this.elAvgGen = document.getElementById('stat-avg-gen');
    this.elMaxGen = document.getElementById('stat-max-gen');
    this.elFoodCount = document.getElementById('stat-food');
    this.elPhase = document.getElementById('stat-phase');
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
    this.elInspArchetype = document.getElementById('insp-archetype');
    this.elInspParent = document.getElementById('insp-parent');
    this.elInspFoodEaten = document.getElementById('insp-food-eaten');
    this.elInspKills = document.getElementById('insp-kills');
    this.elInspDist = document.getElementById('insp-dist');
    this.elBarSize = document.getElementById('bar-size');
    this.elBarRange = document.getElementById('bar-range');
    this.elBarFov = document.getElementById('bar-fov');
    this.elBarClock = document.getElementById('bar-clock');
    this.elAvgSize = document.getElementById('avg-size');
    this.elAvgRange = document.getElementById('avg-range');
    this.elAvgFov = document.getElementById('avg-fov');
    this.elAvgClock = document.getElementById('avg-clock');
    this.elValSize = document.getElementById('val-size');
    this.elValRange = document.getElementById('val-range');
    this.elValFov = document.getElementById('val-fov');
    this.elValClock = document.getElementById('val-clock');
    this.elInspFitness = document.getElementById('insp-fitness');
    this.elInspFounder = document.getElementById('insp-founder');
    this.elInspMutations = document.getElementById('insp-mutations');
    this.elInspBurn = document.getElementById('insp-burn');
    this.elInspGained = document.getElementById('insp-gained');
    this.elInspSprintPct = document.getElementById('insp-sprint-pct');
    this.elInspMaxSpeed = document.getElementById('insp-max-speed');
    this.elInspToxins = document.getElementById('insp-toxins');
    this.elBtnChartPop = document.getElementById('btn-chart-pop');
    this.elBtnChartTraits = document.getElementById('btn-chart-traits');
    this.elChartLegend = document.getElementById('chart-legend');
    this.elInspThought = document.getElementById('insp-thought');
    this.elNnTooltip = document.getElementById('nn-tooltip');
    this.elDnaSummary = document.getElementById('dna-summary');
    this.elDnaTooltip = document.getElementById('dna-tooltip');

    this.nnCanvas = document.getElementById('nn-canvas');
    this.nnCtx = this.nnCanvas.getContext('2d');
    this.dnaCanvas = document.getElementById('dna-canvas');
    this.dnaCtx = this.dnaCanvas.getContext('2d');
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
    this.elToggleTerrainThermal = document.getElementById('toggle-terrain-thermal');
    this.elToggleTerrainObstacles = document.getElementById('toggle-terrain-obstacles');
    this.elToggleTerrainCurrents = document.getElementById('toggle-terrain-currents');
    this.elToggleTerrainCrystals = document.getElementById('toggle-terrain-crystals');
    this.elToggleTerrainKelp = document.getElementById('toggle-terrain-kelp');
    this.elBtnRegenTerrain = document.getElementById('btn-regen-terrain');
    this.elToggleFoodBrush = document.getElementById('toggle-food-brush');
    this.elToggleCarrionBrush = document.getElementById('toggle-carrion-brush');
    this.elTogglePoisonBrush = document.getElementById('toggle-poison-brush');
    this.elBtnClone = document.getElementById('btn-clone-mutate');
    this.elBtnFollow = document.getElementById('btn-follow-selected');
    this.elBtnCloseInsp = document.getElementById('btn-close-inspector');
    this.elBtnReset = document.getElementById('btn-reset-world');

    this.nodePositions = [];
    this.hoveredNode = null;
    this.hoveredGeneIdx = -1;
    this.dnaCache = null;
    this.chartMode = 'pop';
    this.lastHofHash = '';
    this.lastDnaCreatureId = -1;

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

    this.elToggleTerrainThermal.addEventListener('change', () => {
      this.world.features.thermalZones = this.elToggleTerrainThermal.checked;
    });

    this.elToggleTerrainObstacles.addEventListener('change', () => {
      this.world.features.obstacles = this.elToggleTerrainObstacles.checked;
    });

    this.elToggleTerrainCurrents.addEventListener('change', () => {
      this.world.features.currents = this.elToggleTerrainCurrents.checked;
    });

    this.elToggleTerrainCrystals.addEventListener('change', () => {
      this.world.features.crystalsAndVents = this.elToggleTerrainCrystals.checked;
    });

    this.elToggleTerrainKelp.addEventListener('change', () => {
      this.world.features.kelp = this.elToggleTerrainKelp.checked;
    });

    this.elBtnRegenTerrain.addEventListener('click', () => {
      this.world.regenerateTerrain();
    });

    this.elToggleFoodBrush.addEventListener('change', () => {
      if (this.elToggleFoodBrush.checked) {
        this.state.brushMode = 'food';
        this.elToggleCarrionBrush.checked = false;
        this.elTogglePoisonBrush.checked = false;
      } else if (this.state.brushMode === 'food') {
        this.state.brushMode = 'none';
      }
      this.callbacks.onBrushChange?.(this.state.brushMode);
    });

    this.elToggleCarrionBrush.addEventListener('change', () => {
      if (this.elToggleCarrionBrush.checked) {
        this.state.brushMode = 'carrion';
        this.elToggleFoodBrush.checked = false;
        this.elTogglePoisonBrush.checked = false;
      } else if (this.state.brushMode === 'carrion') {
        this.state.brushMode = 'none';
      }
      this.callbacks.onBrushChange?.(this.state.brushMode);
    });

    this.elTogglePoisonBrush.addEventListener('change', () => {
      if (this.elTogglePoisonBrush.checked) {
        this.state.brushMode = 'poison';
        this.elToggleFoodBrush.checked = false;
        this.elToggleCarrionBrush.checked = false;
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

    this.dnaCanvas.addEventListener('pointermove', (e) => {
      const rect = this.dnaCanvas.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * this.dnaCanvas.width;
      const padX = 8;
      const usableW = this.dnaCanvas.width - padX * 2;
      const t = Math.max(0, Math.min(1, (sx - padX) / usableW));
      const total = this.dnaCache ? this.dnaCache.all.length : 183;
      this.hoveredGeneIdx = Math.min(total - 1, Math.max(0, Math.round(t * (total - 1))));
      if (this.state.selectedCreature) {
        this.updateDnaTooltip(this.state.selectedCreature.brain);
      }
    });

    this.dnaCanvas.addEventListener('pointerleave', () => {
      this.hoveredGeneIdx = -1;
      if (this.state.selectedCreature) {
        this.updateDnaTooltip(this.state.selectedCreature.brain);
      }
    });

    this.elBtnChartPop.addEventListener('click', () => {
      this.chartMode = 'pop';
      this.updateChartModeButtons();
      this.drawSparkline();
    });

    this.elBtnChartTraits.addEventListener('click', () => {
      this.chartMode = 'traits';
      this.updateChartModeButtons();
      this.drawSparkline();
    });
  }

  updateChartModeButtons() {
    if (this.chartMode === 'pop') {
      this.elBtnChartPop.className = 'px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 transition';
      this.elBtnChartTraits.className = 'px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200 transition';
      this.elChartLegend.innerHTML = '<span class="text-teal-300">Rośl</span><span class="text-violet-300">Padl</span><span class="text-rose-300">Łow</span><span class="text-sky-300">Alfa</span>';
    } else {
      this.elBtnChartTraits.className = 'px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/20 text-purple-200 border border-purple-400/50 transition';
      this.elBtnChartPop.className = 'px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-slate-200 transition';
      this.elChartLegend.innerHTML = '<span class="text-cyan-300">Rozm</span><span class="text-emerald-300">Zas</span><span class="text-purple-300">FOV</span><span class="text-amber-300">Fit</span>';
    }
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
    this.elToggleTerrainThermal.checked = this.world.features.thermalZones;
    this.elToggleTerrainObstacles.checked = this.world.features.obstacles;
    this.elToggleTerrainCurrents.checked = this.world.features.currents;
    this.elToggleTerrainCrystals.checked = this.world.features.crystalsAndVents;
    this.elToggleTerrainKelp.checked = this.world.features.kelp;
    this.elToggleFoodBrush.checked = this.state.brushMode === 'food';
    this.elToggleCarrionBrush.checked = this.state.brushMode === 'carrion';
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
    const phase = this.world.getEnvironmentPhase();
    this.elPopTotal.textContent = String(s.total);
    this.elPopHerb.textContent = String(s.herbivores);
    this.elPopScav.textContent = String(s.scavengers);
    this.elPopOmni.textContent = String(s.omnivores);
    this.elPopCarn.textContent = String(s.predatorsRed);
    this.elPopApex.textContent = String(s.predatorsApex);
    this.elAvgGen.textContent = s.avgGeneration.toFixed(1);
    this.elMaxGen.textContent = String(s.maxGeneration);
    this.elFoodCount.textContent = String(this.world.food.length);
    this.elPhase.textContent = phase.label;
    this.elPhase.className =
      phase.id === 'bloom'
        ? 'text-emerald-300 font-semibold'
        : phase.id === 'tide'
          ? 'text-sky-300 font-semibold'
          : 'text-violet-300 font-semibold';
    this.elFps.textContent = `${Math.round(fps)}`;

    this.elEvoMorph.textContent = `Śr. rozm. ${s.avgSize.toFixed(1)}px · Zasięg ${Math.round(s.avgRange)}px · FOV ${Math.round(s.avgFovDeg)}°`;
    const totalB = s.sexualBirths + s.asexualBirths;
    const sexPct = totalB > 0 ? Math.round((s.sexualBirths / totalB) * 100) : 0;
    this.elEvoRepro.textContent = `Narodziny: ${s.totalBirths} (Krzyżowanie ${sexPct}%) · Padlina: ${this.world.carrion.length}`;

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
        const spIdx = getSpeciesIndexFromDiet(entry.diet);
        const badgeColor =
          spIdx === 0
            ? 'text-emerald-300'
            : spIdx === 1
              ? 'text-violet-300'
              : spIdx === 2
                ? 'text-amber-300'
                : spIdx === 3
                  ? 'text-rose-300'
                  : 'text-sky-300';
        const entryName = entry.name || 'Weteran';
        return `<div class="flex items-center justify-between py-1 px-1.5 rounded bg-slate-900/70 border border-slate-800/70 text-[10px]">
          <div class="flex items-center gap-1.5 font-mono truncate">
            <span class="text-slate-500">#${idx + 1}</span>
            <span class="text-slate-100 font-sans font-medium truncate max-w-[68px]" title="${entryName}">${entryName}</span>
            <span class="${badgeColor} font-semibold">P${entry.generation}</span>
            <span class="text-slate-400">${entry.age.toFixed(0)}s</span>
          </div>
          <button data-revive="${idx}" class="px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition text-[9px] font-medium shrink-0">Wskrześ</button>
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

    this.elInspId.textContent = `${c.name} #${c.id}`;
    this.elInspGen.textContent = `P${c.generation}`;
    this.elInspAge.textContent = `${c.age.toFixed(1)}s`;
    this.elInspChildren.textContent = String(c.childrenCount);

    const sp = getSpeciesByIndex(c.speciesIdx);
    this.elInspDiet.textContent = sp.name;
    this.elInspDiet.className = `inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${sp.badgeBg}`;

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

    const stats = this.world.stats;
    const fovDeg = Math.round((c.fovAngle * 180) / Math.PI);
    const zoneHtml =
      c.thermalZone === 'warm'
        ? '<span class="text-orange-300">Ciepła (+25% ruch)</span>'
        : c.thermalZone === 'cold'
          ? '<span class="text-sky-300">Zimna (-32% koszt)</span>'
          : '<span class="text-slate-400">Umiarkowana</span>';
    this.elInspMorph.innerHTML = `Strefa: ${zoneHtml}`;

    const fmtDelta = (val, avg, digits = 1) => {
      const diff = val - avg;
      const sign = diff >= 0 ? '+' : '';
      const cls = diff >= 0 ? 'text-emerald-400' : 'text-rose-400';
      return `<span class="${cls}">${sign}${diff.toFixed(digits)}</span>`;
    };

    this.elInspArchetype.textContent = this.computeArchetype(c);
    this.elInspParent.textContent = c.parentName
      ? `Rodzic: ${c.parentName} (${c.birthType})`
      : 'Rodzic: Pierwsze pokolenie';
    this.elInspFounder.textContent = `Pra-przodek (P1): ${c.founderName}`;
    this.elInspFoodEaten.textContent = String(c.foodEaten);
    this.elInspKills.textContent = String(c.kills);
    this.elInspDist.textContent = `${Math.round(c.distanceTraveled / 10)}m`;

    const fit = c.getFitnessScore();
    const fitDiff = Math.round(fit - stats.avgFitness);
    const fitSign = fitDiff >= 0 ? '+' : '';
    const fitCls = fitDiff >= 0 ? 'text-emerald-300' : 'text-rose-300';
    this.elInspFitness.innerHTML = `${fit} <span class="text-[8.5px] ${fitCls}">(${fitSign}${fitDiff})</span>`;

    this.elInspMutations.textContent = `${c.lineageMutations} (+${c.ownMutations})`;
    this.elInspBurn.textContent = `-${c.currentBurnRate.toFixed(1)} E/s`;
    this.elInspGained.textContent = `+${Math.round(c.energyGained)} E`;
    const sprintPct = c.age > 0.1 ? Math.min(100, Math.round((c.sprintTime / c.age) * 100)) : 0;
    this.elInspSprintPct.textContent = `${sprintPct}%`;
    this.elInspMaxSpeed.textContent = `${Math.round(c.maxSpeedReached)} px/s`;
    this.elInspToxins.textContent = String(c.toxinsHit);

    const clampPct = (v) => Math.max(0, Math.min(100, v)).toFixed(0);
    this.elBarSize.style.width = `${clampPct(((c.size - 5) / 11) * 100)}%`;
    this.elBarRange.style.width = `${clampPct(((c.sensorRange - 60) / 120) * 100)}%`;
    this.elBarFov.style.width = `${clampPct(((c.fovAngle - 0.5) / 2.1) * 100)}%`;
    this.elBarClock.style.width = `${clampPct(((c.clockFreq - 1.5) / 4.5) * 100)}%`;

    this.elAvgSize.style.left = `${clampPct(((stats.avgSize - 5) / 11) * 100)}%`;
    this.elAvgRange.style.left = `${clampPct(((stats.avgRange - 60) / 120) * 100)}%`;
    this.elAvgFov.style.left = `${clampPct((((stats.avgFovDeg * Math.PI) / 180 - 0.5) / 2.1) * 100)}%`;
    this.elAvgClock.style.left = `${clampPct(((stats.avgClockFreq - 1.5) / 4.5) * 100)}%`;

    this.elValSize.innerHTML = `${c.size.toFixed(1)} ${fmtDelta(c.size, stats.avgSize, 1)}`;
    this.elValRange.innerHTML = `${Math.round(c.sensorRange)} ${fmtDelta(c.sensorRange, stats.avgRange, 0)}`;
    this.elValFov.innerHTML = `${fovDeg}° ${fmtDelta(fovDeg, stats.avgFovDeg, 0)}`;
    this.elValClock.innerHTML = `${c.clockFreq.toFixed(1)} ${fmtDelta(c.clockFreq, stats.avgClockFreq, 1)}`;

    this.elInspThought.textContent = this.describeThought(c);

    this.drawNeuralNetwork(c.brain);
    this.updateNnTooltip(c.brain);
    this.ensureDnaCache(c);
    this.updateDnaTooltip(c.brain);
  }

  computeArchetype(c) {
    if (c.kills >= 4) return 'Bezwzględny Łowca';
    if (c.childrenCount >= 4 && c.age > 35) return 'Mistrz Przetrwania';
    if (c.foodEaten >= 12) return 'Cierpliwy Żerowca';
    if (c.sensorRange >= 150) return 'Bystry Zwiadowca';
    if (c.fovAngle >= 2.0) return 'Ostrożny Nawigator';
    if (c.brain.biasO[2] > 0.3) return 'Niespokojny Sprinter';
    if (c.size >= 13.5) return 'Głębinowy Kolos';
    if (c.size <= 7.2) return 'Zwinny Zwiadowca';
    return 'Głębinowy Wędrowiec';
  }

  ensureDnaCache(creature) {
    if (this.lastDnaCreatureId === creature.id && this.dnaCache) return;
    this.lastDnaCreatureId = creature.id;

    const brain = creature.brain;
    const totalParams =
      brain.weightsIH.length + brain.biasH.length + brain.weightsHO.length + brain.biasO.length;
    const all = new Float32Array(totalParams);
    let offset = 0;
    all.set(brain.weightsIH, offset);
    offset += brain.weightsIH.length;
    all.set(brain.biasH, offset);
    offset += brain.biasH.length;
    all.set(brain.weightsHO, offset);
    offset += brain.weightsHO.length;
    all.set(brain.biasO, offset);

    let hash = 2166136261;
    let strongCount = 0;
    let absSum = 0;
    let maxIdx = 0;
    let maxAbs = 0;
    for (let i = 0; i < totalParams; i++) {
      const v = all[i];
      const av = Math.abs(v);
      absSum += av;
      if (av > 0.5) strongCount++;
      if (av > maxAbs) {
        maxAbs = av;
        maxIdx = i;
      }
      const q = Math.round((v + 4) * 100);
      hash = Math.imul(hash ^ q, 16777619);
    }
    const dnaCode = ((hash >>> 0) % 0xffffff).toString(16).toUpperCase().padStart(6, '0');
    const avgAbs = absSum / totalParams;
    this.elDnaSummary.textContent = `DNA-${dnaCode} · Silne: ${strongCount}/${totalParams} · Śr.|w| ${avgAbs.toFixed(2)}`;
    this.dnaCache = {
      all,
      lenIH: brain.weightsIH.length,
      lenBH: brain.biasH.length,
      lenHO: brain.weightsHO.length,
      lenBO: brain.biasO.length,
      strongestIdx: maxIdx
    };
  }

  describeGene(brain, idx) {
    const lenIH = brain.weightsIH.length;
    const lenBH = brain.biasH.length;
    const lenHO = brain.weightsHO.length;

    if (idx < lenIH) {
      const hidIdx = Math.floor(idx / brain.inputCount);
      const inIdx = idx % brain.inputCount;
      const val = brain.weightsIH[idx];
      const role = val >= 0 ? 'wzmacnia' : 'hamuje';
      return `<span class="text-cyan-300 font-mono font-bold">Gen #${idx + 1} [Zmysł→Mózg]</span> ${INPUT_LABELS[inIdx]}→H${hidIdx + 1} = <span class="${val >= 0 ? 'text-cyan-200' : 'text-rose-300'} font-mono">${val.toFixed(2)}</span> · ${role} neuron H${hidIdx + 1} na sygnał ${INPUT_LABELS[inIdx]}.`;
    }
    if (idx < lenIH + lenBH) {
      const h = idx - lenIH;
      const val = brain.biasH[h];
      const role = val >= 0 ? 'ułatwia pobudzenie' : 'podnosi próg ostrożności';
      return `<span class="text-purple-300 font-mono font-bold">Gen #${idx + 1} [Próg H${h + 1}]</span> bias = <span class="${val >= 0 ? 'text-cyan-200' : 'text-rose-300'} font-mono">${val.toFixed(2)}</span> · ${role} neuronu ukrytego H${h + 1}.`;
    }
    if (idx < lenIH + lenBH + lenHO) {
      const local = idx - lenIH - lenBH;
      const outIdx = Math.floor(local / brain.hiddenCount);
      const hidIdx = local % brain.hiddenCount;
      const val = brain.weightsHO[local];
      const outName = outIdx === 0 ? 'Napęd (NAP)' : outIdx === 1 ? 'Skręt (SKR)' : 'Sprint/Atak (SPR)';
      return `<span class="text-emerald-300 font-mono font-bold">Gen #${idx + 1} [Mózg→Ruch]</span> H${hidIdx + 1}→${OUTPUT_LABELS[outIdx]} = <span class="${val >= 0 ? 'text-cyan-200' : 'text-rose-300'} font-mono">${val.toFixed(2)}</span> · steruje wyjściem ${outName}.`;
    }
    const o = idx - lenIH - lenBH - lenHO;
    const val = brain.biasO[o];
    const instName =
      o === 0
        ? val >= 0
          ? 'wrodzona chęć płynięcia naprzód'
          : 'wrodzona tendencja do hamowania/cofania'
        : o === 1
          ? val >= 0
            ? 'naturalny dryf skrętu w prawo'
            : 'naturalny dryf skrętu w lewo'
          : val > 0.25
            ? 'wysoka gotowość do sprintu/ataku'
            : 'oszczędzanie energii (rzadki sprint)';
    return `<span class="text-amber-300 font-mono font-bold">Gen #${idx + 1} [Instynkt ${OUTPUT_LABELS[o]}]</span> = <span class="${val >= 0 ? 'text-cyan-200' : 'text-rose-300'} font-mono">${val.toFixed(2)}</span> · ${instName}.`;
  }

  updateDnaTooltip(brain) {
    if (!this.dnaCache) return;
    if (this.hoveredGeneIdx >= 0) {
      this.elDnaTooltip.innerHTML = this.describeGene(brain, this.hoveredGeneIdx);
    } else {
      this.elDnaTooltip.innerHTML = `<span class="text-slate-400">Najsilniejszy gen:</span> ${this.describeGene(brain, this.dnaCache.strongestIdx)}`;
    }
  }

  animateDna(timeSec) {
    const c = this.state.selectedCreature;
    if (!c) return;
    this.ensureDnaCache(c);
    const cache = this.dnaCache;
    if (!cache) return;

    const all = cache.all;
    const totalParams = all.length;
    const canvas = this.dnaCanvas;
    const ctx = this.dnaCtx;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const midY = h * 0.5;
    const amp = h * 0.36;
    const padX = 8;
    const usableW = w - padX * 2;
    const stepX = usableW / (totalParams - 1);
    const spin = timeSec * 2.3;

    const s1 = padX + cache.lenIH * stepX;
    const s2 = padX + (cache.lenIH + cache.lenBH) * stepX;
    const s3 = padX + (cache.lenIH + cache.lenBH + cache.lenHO) * stepX;

    ctx.fillStyle = 'rgba(34, 211, 238, 0.045)';
    ctx.fillRect(padX, 0, s1 - padX, h);
    ctx.fillStyle = 'rgba(192, 132, 252, 0.07)';
    ctx.fillRect(s1, 0, s2 - s1, h);
    ctx.fillStyle = 'rgba(52, 211, 153, 0.06)';
    ctx.fillRect(s2, 0, s3 - s2, h);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.09)';
    ctx.fillRect(s3, 0, padX + usableW - s3, h);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    for (const sx of [s1, s2, s3]) {
      ctx.beginPath();
      ctx.moveTo(sx, 1);
      ctx.lineTo(sx, h - 1);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const hoverIdx = this.hoveredGeneIdx;
    for (let i = 0; i < totalParams; i += 2) {
      const x = padX + i * stepX;
      const phase = (i / totalParams) * Math.PI * 6.5 - spin;
      const y1 = midY + Math.sin(phase) * amp;
      const y2 = midY - Math.sin(phase) * amp;
      const depth = 0.55 + 0.45 * Math.abs(Math.cos(phase));
      const v = all[i];
      const norm = Math.min(1, Math.abs(v) / 1.8);
      const isHov = hoverIdx >= 0 && Math.abs(i - hoverIdx) <= 1;
      const alpha = isHov ? 1.0 : (0.18 + norm * 0.78) * depth;

      ctx.strokeStyle = isHov
        ? '#fde047'
        : v >= 0
          ? `rgba(34, 211, 238, ${alpha.toFixed(2)})`
          : `rgba(244, 63, 94, ${alpha.toFixed(2)})`;
      ctx.lineWidth = isHov ? 2.4 : 1.35;
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }

    const drawHelixStrand = (sign, r, g, b) => {
      for (let i = 0; i < totalParams - 1; i++) {
        const x1 = padX + i * stepX;
        const x2 = padX + (i + 1) * stepX;
        const p1 = (i / totalParams) * Math.PI * 6.5 - spin;
        const p2 = ((i + 1) / totalParams) * Math.PI * 6.5 - spin;
        const y1 = midY + sign * Math.sin(p1) * amp;
        const y2 = midY + sign * Math.sin(p2) * amp;
        const z = sign * Math.cos(p1);
        const front = (z + 1) * 0.5;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.22 + front * 0.75).toFixed(2)})`;
        ctx.lineWidth = 1.0 + front * 1.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    drawHelixStrand(1, 56, 189, 248);
    drawHelixStrand(-1, 192, 132, 252);

    if (hoverIdx >= 0) {
      const hx = padX + hoverIdx * stepX;
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, h);
      ctx.stroke();
    }
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

    const drawSeries = (getter, minVal, maxVal, color, dashed = false) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.35 : 1.75;
      if (dashed) ctx.setLineDash([4, 3]);
      ctx.beginPath();
      const stepX = w / (history.length - 1);
      const span = Math.max(0.001, maxVal - minVal);
      for (let i = 0; i < history.length; i++) {
        const x = i * stepX;
        const norm = Math.max(0, Math.min(1, (getter(history[i]) - minVal) / span));
        const y = h - 4 - norm * (h - 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    if (this.chartMode === 'traits') {
      let maxFit = 60;
      for (let i = 0; i < history.length; i++) {
        if ((history[i].avgFitness || 0) > maxFit) maxFit = history[i].avgFitness;
      }
      drawSeries((d) => d.avgSize || 10, 5, 16, '#22d3ee', false);
      drawSeries((d) => d.avgRange || 120, 60, 180, '#34d399', false);
      drawSeries((d) => d.avgFov || 90, 28, 150, '#c084fc', false);
      drawSeries((d) => d.avgFitness || 0, 0, maxFit, '#fbbf24', true);
      return;
    }

    let maxPop = 30;
    let maxGen = 2;
    for (let i = 0; i < history.length; i++) {
      const sample = history[i];
      if (sample.herb > maxPop) maxPop = sample.herb;
      if (sample.scav > maxPop) maxPop = sample.scav;
      if (sample.omni > maxPop) maxPop = sample.omni;
      if ((sample.predRed || 0) > maxPop) maxPop = sample.predRed;
      if ((sample.predApex || 0) > maxPop) maxPop = sample.predApex;
      if (sample.avgGen > maxGen) maxGen = sample.avgGen;
    }

    drawSeries((d) => d.herb, 0, maxPop, '#2dd4bf', false);
    drawSeries((d) => d.scav || 0, 0, maxPop, '#a78bfa', false);
    drawSeries((d) => d.omni, 0, maxPop, 'rgba(251, 191, 36, 0.78)', false);
    drawSeries((d) => d.predRed || 0, 0, maxPop, '#fb7185', false);
    drawSeries((d) => d.predApex || 0, 0, maxPop, '#38bdf8', false);
    drawSeries((d) => d.avgGen, 0, maxGen, 'rgba(226, 232, 240, 0.72)', true);
  }
}
