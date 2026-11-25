export const SPECIES = [
  { id: 'herbivore', index: 0, name: 'Roślinożerca', short: 'Rośl', color: '#2dd4bf', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' },
  { id: 'scavenger', index: 1, name: 'Padlinożerca', short: 'Padl', color: '#a78bfa', badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-400/40' },
  { id: 'omnivore', index: 2, name: 'Wszystkożerca', short: 'Wsz', color: '#fbbf24', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40' },
  { id: 'predator_red', index: 3, name: 'Łowca Szkarłatny', short: 'Łowca', color: '#fb7185', badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-400/40' },
  { id: 'predator_apex', index: 4, name: 'Drapieżnik Alfa', short: 'Alfa', color: '#38bdf8', badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-400/40' }
];

export const RESOURCE_COUNT = 2;
export const TOTAL_TARGETS = SPECIES.length + RESOURCE_COUNT;

export function getSpeciesIndexFromDiet(diet) {
  if (diet < 0.24) return 0;
  if (diet < 0.42) return 1;
  if (diet < 0.60) return 2;
  if (diet < 0.80) return 3;
  return 4;
}

export function getSpeciesByIndex(index) {
  return SPECIES[index] || SPECIES[0];
}

export function createDefaultTrophicGenes(speciesIdx) {
  const g = new Float32Array(TOTAL_TARGETS);
  if (speciesIdx === 0) {
    g[0] = 0.95;
    g[1] = -0.6;
    g[2] = -0.8;
    g[3] = -0.8;
    g[4] = -0.8;
    g[5] = -0.9;
    g[6] = -0.9;
  } else if (speciesIdx === 1) {
    g[0] = 0.35;
    g[1] = 0.98;
    g[2] = -0.7;
    g[3] = -0.8;
    g[4] = -0.7;
    g[5] = -0.8;
    g[6] = -0.9;
  } else if (speciesIdx === 2) {
    g[0] = 0.65;
    g[1] = 0.72;
    g[2] = 0.55;
    g[3] = 0.45;
    g[4] = -0.35;
    g[5] = -0.65;
    g[6] = -0.8;
  } else if (speciesIdx === 3) {
    g[0] = -0.85;
    g[1] = 0.45;
    g[2] = 0.92;
    g[3] = 0.82;
    g[4] = 0.72;
    g[5] = -0.45;
    g[6] = -0.8;
  } else {
    g[0] = -0.9;
    g[1] = -0.5;
    g[2] = -0.4;
    g[3] = 0.65;
    g[4] = 0.85;
    g[5] = 0.96;
    g[6] = -0.45;
  }
  return g;
}

export class FoodChain {
  constructor() {
    this.mode = 'manual';
    this.matrix = Array.from({ length: SPECIES.length }, () => new Uint8Array(TOTAL_TARGETS));
    this.evolvedRates = Array.from({ length: SPECIES.length }, () => new Float32Array(TOTAL_TARGETS));
    this.applyPreset('pyramid');
  }

  applyPreset(presetId) {
    for (let i = 0; i < SPECIES.length; i++) {
      this.matrix[i].fill(0);
    }

    if (presetId === 'pyramid') {
      this.matrix[0][0] = 1;
      this.matrix[1][0] = 1;
      this.matrix[1][1] = 1;
      this.matrix[2][0] = 1;
      this.matrix[2][1] = 1;
      this.matrix[2][2] = 1;
      this.matrix[2][3] = 1;
      this.matrix[3][1] = 1;
      this.matrix[3][2] = 1;
      this.matrix[3][3] = 1;
      this.matrix[3][4] = 1;
      this.matrix[4][3] = 1;
      this.matrix[4][4] = 1;
      this.matrix[4][5] = 1;
    } else if (presetId === 'arena') {
      for (let i = 0; i < SPECIES.length; i++) {
        this.matrix[i][1] = 1;
        if (i < 3) this.matrix[i][0] = 1;
        for (let j = 0; j < SPECIES.length; j++) {
          if (i !== j) this.matrix[i][2 + j] = 1;
        }
      }
    } else if (presetId === 'peaceful') {
      for (let i = 0; i < SPECIES.length; i++) {
        this.matrix[i][0] = 1;
        this.matrix[i][1] = 1;
      }
    } else if (presetId === 'inverted') {
      this.matrix[0][0] = 1;
      this.matrix[0][5] = 1;
      this.matrix[0][6] = 1;
      this.matrix[1][1] = 1;
      this.matrix[1][4] = 1;
      this.matrix[2][0] = 1;
      this.matrix[2][1] = 1;
      this.matrix[2][3] = 1;
      this.matrix[3][0] = 1;
      this.matrix[3][1] = 1;
      this.matrix[4][0] = 1;
      this.matrix[4][1] = 1;
    }
  }

  toggleRule(speciesIdx, targetIdx) {
    if (speciesIdx < 0 || speciesIdx >= SPECIES.length) return;
    if (targetIdx < 0 || targetIdx >= TOTAL_TARGETS) return;
    this.matrix[speciesIdx][targetIdx] = this.matrix[speciesIdx][targetIdx] ? 0 : 1;
  }

  canEatPlant(creature) {
    if (this.mode === 'evolution') {
      return creature.trophicGenes[0] > 0.1;
    }
    return this.matrix[creature.speciesIdx][0] === 1;
  }

  getPlantEfficiency(creature) {
    if (!this.canEatPlant(creature)) return 0;
    if (this.mode === 'evolution') {
      return 0.35 + Math.min(1, creature.trophicGenes[0]) * 0.65;
    }
    const s = creature.speciesIdx;
    if (s === 0) return 1.0;
    if (s === 2) return 0.65;
    if (s === 1) return 0.4;
    return 0.5;
  }

  canEatCarrion(creature) {
    if (this.mode === 'evolution') {
      return creature.trophicGenes[1] > 0.1;
    }
    return this.matrix[creature.speciesIdx][1] === 1;
  }

  getCarrionEfficiency(creature) {
    if (!this.canEatCarrion(creature)) return 0;
    if (this.mode === 'evolution') {
      return 0.4 + Math.min(1, creature.trophicGenes[1]) * 0.7;
    }
    const s = creature.speciesIdx;
    if (s === 1) return 1.08;
    if (s === 2) return 0.75;
    return 0.55;
  }

  canEatCreature(predator, prey) {
    if (predator === prey || !prey.alive) return false;
    const targetIdx = 2 + prey.speciesIdx;
    if (this.mode === 'evolution') {
      const affinity = predator.trophicGenes[targetIdx];
      if (affinity <= 0.2) return false;
      if (predator.speciesIdx === prey.speciesIdx) {
        return predator.size > prey.size * 1.15;
      }
      return true;
    }
    if (this.matrix[predator.speciesIdx][targetIdx] !== 1) return false;
    if (predator.speciesIdx === prey.speciesIdx) {
      return predator.size > prey.size * 1.14;
    }
    if (predator.speciesIdx === 2) {
      return predator.size > prey.size * 1.05;
    }
    return true;
  }

  computeEvolvedRates(creatures) {
    const counts = new Int32Array(SPECIES.length);
    for (let i = 0; i < SPECIES.length; i++) {
      this.evolvedRates[i].fill(0);
    }
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (!c.alive) continue;
      const s = c.speciesIdx;
      counts[s]++;
      const g = c.trophicGenes;
      if (g[0] > 0.1) this.evolvedRates[s][0]++;
      if (g[1] > 0.1) this.evolvedRates[s][1]++;
      for (let t = 2; t < TOTAL_TARGETS; t++) {
        if (g[t] > 0.2) this.evolvedRates[s][t]++;
      }
    }
    for (let i = 0; i < SPECIES.length; i++) {
      if (counts[i] > 0) {
        for (let t = 0; t < TOTAL_TARGETS; t++) {
          this.evolvedRates[i][t] /= counts[i];
        }
      }
    }
  }
}
