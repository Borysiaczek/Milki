import { SpatialGrid } from '../physics/SpatialGrid.js';
import { Creature } from './Creature.js';
import { gaussianRandom } from '../math/NeuralNetwork.js';

export class World {
  constructor(width = 3000, height = 2000) {
    this.width = width;
    this.height = height;
    this.simTime = 0;

    this.mutationRate = 0.08;
    this.foodSpawnRate = 16;
    this.carnivoreEnergyMultiplier = 1.45;

    this.maxCreatures = 380;
    this.maxFood = 900;
    this.maxPoison = 260;

    this.creatureGrid = new SpatialGrid(width, height, 80, 1024);
    this.foodGrid = new SpatialGrid(width, height, 80, 2048);
    this.poisonGrid = new SpatialGrid(width, height, 80, 512);

    this.queryCreatures = [];
    this.queryFood = [];
    this.queryPoison = [];
    this.queryMates = [];
    this.newborns = [];

    this.creatures = [];
    this.food = [];
    this.poison = [];
    this.biomes = [];
    this.hallOfFame = [];

    this.foodSpawnAccumulator = 0;
    this.telemetryTimer = 0;
    this.telemetryHistory = [];
    this.maxTelemetrySamples = 160;

    this.stats = {
      total: 0,
      herbivores: 0,
      omnivores: 0,
      carnivores: 0,
      avgGeneration: 1,
      maxGeneration: 1,
      avgSize: 10,
      avgRange: 120,
      avgFovDeg: 90,
      totalBirths: 0,
      sexualBirths: 0,
      asexualBirths: 0,
      totalDeaths: 0
    };

    this.initBiomes();
    this.seedInitialEcosystem();
  }

  initBiomes() {
    this.biomes.length = 0;
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      this.biomes.push({
        x: 350 + Math.random() * (this.width - 700),
        y: 300 + Math.random() * (this.height - 600),
        vx: Math.cos(angle) * (10 + Math.random() * 14),
        vy: Math.sin(angle) * (10 + Math.random() * 14),
        radius: 170 + Math.random() * 110,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  seedInitialEcosystem(preset = {}) {
    this.creatures.length = 0;
    this.food.length = 0;
    this.poison.length = 0;
    this.hallOfFame.length = 0;
    this.telemetryHistory.length = 0;
    this.simTime = 0;
    this.stats.totalBirths = 0;
    this.stats.sexualBirths = 0;
    this.stats.asexualBirths = 0;
    this.stats.totalDeaths = 0;

    const initialFood = preset.initialFood !== undefined ? preset.initialFood : 380;
    const initialPoison = preset.initialPoison !== undefined ? preset.initialPoison : 24;
    const initialCount = preset.initialCount !== undefined ? preset.initialCount : 110;
    const herbShare = preset.herbShare !== undefined ? preset.herbShare : 0.58;
    const omniShare = preset.omniShare !== undefined ? preset.omniShare : 0.22;

    for (let i = 0; i < initialFood; i++) {
      this.spawnBiomeFood();
    }

    for (let i = 0; i < initialPoison; i++) {
      this.spawnPoison(
        160 + Math.random() * (this.width - 320),
        160 + Math.random() * (this.height - 320),
        1,
        0
      );
    }

    for (let i = 0; i < initialCount; i++) {
      const biome = this.biomes[i % this.biomes.length];
      const x = Math.max(80, Math.min(this.width - 80, biome.x + gaussianRandom() * biome.radius * 1.1));
      const y = Math.max(80, Math.min(this.height - 80, biome.y + gaussianRandom() * biome.radius * 1.1));
      const r = Math.random();
      let diet;
      if (r < herbShare) diet = Math.random() * 0.36;
      else if (r < herbShare + omniShare) diet = 0.42 + Math.random() * 0.26;
      else diet = 0.74 + Math.random() * 0.26;

      this.creatures.push(new Creature(x, y, { diet }));
    }

    this.rebuildGrids();
    this.updateStats();
    this.recordTelemetrySample();
  }

  applyScenario(scenarioId) {
    if (scenarioId === 'balanced') {
      this.mutationRate = 0.08;
      this.foodSpawnRate = 16;
      this.carnivoreEnergyMultiplier = 1.45;
      this.seedInitialEcosystem();
    } else if (scenarioId === 'arms_race') {
      this.mutationRate = 0.12;
      this.foodSpawnRate = 20;
      this.carnivoreEnergyMultiplier = 2.35;
      this.seedInitialEcosystem({ initialFood: 420, initialPoison: 18, initialCount: 120, herbShare: 0.48, omniShare: 0.16 });
    } else if (scenarioId === 'famine') {
      this.mutationRate = 0.09;
      this.foodSpawnRate = 6;
      this.carnivoreEnergyMultiplier = 1.6;
      this.seedInitialEcosystem({ initialFood: 140, initialPoison: 20, initialCount: 95, herbShare: 0.65, omniShare: 0.2 });
    } else if (scenarioId === 'toxic') {
      this.mutationRate = 0.1;
      this.foodSpawnRate = 18;
      this.carnivoreEnergyMultiplier = 1.4;
      this.seedInitialEcosystem({ initialFood: 360, initialPoison: 135, initialCount: 115, herbShare: 0.6, omniShare: 0.22 });
    } else if (scenarioId === 'chaos') {
      this.mutationRate = 0.32;
      this.foodSpawnRate = 18;
      this.carnivoreEnergyMultiplier = 1.45;
      this.seedInitialEcosystem({ initialFood: 380, initialPoison: 24, initialCount: 110 });
    }
  }

  spawnFromHallOfFame(index, x, y) {
    const seed = this.hallOfFame[index];
    if (!seed) return null;
    const sx = x !== undefined ? x : this.width * 0.5 + gaussianRandom() * 140;
    const sy = y !== undefined ? y : this.height * 0.5 + gaussianRandom() * 140;
    const brain = seed.brain.clone().mutate(Math.max(0.06, this.mutationRate), 0.25);
    const child = new Creature(
      Math.max(40, Math.min(this.width - 40, sx)),
      Math.max(40, Math.min(this.height - 40, sy)),
      {
        brain,
        diet: seed.diet,
        size: seed.size,
        fovAngle: seed.fovAngle,
        sensorRange: seed.sensorRange,
        hue: seed.hue,
        clockFreq: seed.clockFreq,
        generation: seed.generation + 1
      }
    );
    this.creatures.push(child);
    this.stats.totalBirths++;
    this.stats.asexualBirths++;
    return child;
  }

  spawnBiomeFood() {
    if (this.food.length >= this.maxFood) return;
    let x;
    let y;
    if (Math.random() < 0.9 && this.biomes.length > 0) {
      const b = this.biomes[(Math.random() * this.biomes.length) | 0];
      x = b.x + gaussianRandom() * (b.radius * 0.52);
      y = b.y + gaussianRandom() * (b.radius * 0.52);
    } else {
      x = 80 + Math.random() * (this.width - 160);
      y = 80 + Math.random() * (this.height - 160);
    }
    x = Math.max(30, Math.min(this.width - 30, x));
    y = Math.max(30, Math.min(this.height - 30, y));
    this.food.push({
      x,
      y,
      radius: 3.4 + Math.random() * 1.8,
      energy: 36 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      alive: true
    });
  }

  spawnFood(x, y, count = 1, spread = 18) {
    for (let i = 0; i < count; i++) {
      if (this.food.length >= this.maxFood) break;
      const fx = Math.max(20, Math.min(this.width - 20, x + (Math.random() - 0.5) * spread * 2));
      const fy = Math.max(20, Math.min(this.height - 20, y + (Math.random() - 0.5) * spread * 2));
      this.food.push({
        x: fx,
        y: fy,
        radius: 3.6 + Math.random() * 1.6,
        energy: 38 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        alive: true
      });
    }
  }

  spawnPoison(x, y, count = 1, spread = 18) {
    for (let i = 0; i < count; i++) {
      if (this.poison.length >= this.maxPoison) {
        this.poison.shift();
      }
      const px = Math.max(20, Math.min(this.width - 20, x + (Math.random() - 0.5) * spread * 2));
      const py = Math.max(20, Math.min(this.height - 20, y + (Math.random() - 0.5) * spread * 2));
      this.poison.push({
        x: px,
        y: py,
        radius: 5.5 + Math.random() * 2.2,
        damage: 34,
        phase: Math.random() * Math.PI * 2,
        ttl: 120 + Math.random() * 60,
        alive: true
      });
    }
  }

  cloneAndMutateCreature(source) {
    if (!source) return null;
    const angle = Math.random() * Math.PI * 2;
    const dist = source.size * 2.5 + 14;
    const nx = Math.max(40, Math.min(this.width - 40, source.x + Math.cos(angle) * dist));
    const ny = Math.max(40, Math.min(this.height - 40, source.y + Math.sin(angle) * dist));
    const clone = source.createOffspring(null, Math.max(0.06, this.mutationRate), nx, ny, source.maxEnergy * 0.72);
    this.creatures.push(clone);
    this.stats.totalBirths++;
    return clone;
  }

  recordHallOfFame(creature) {
    if (creature.age < 6) return;
    const hof = this.hallOfFame;
    if (hof.length < 3 || creature.age > hof[hof.length - 1].age) {
      hof.push(creature.snapshotGenome());
      hof.sort((a, b) => b.age - a.age);
      if (hof.length > 3) hof.length = 3;
    }
  }

  enforceExtinctionFailsafe() {
    if (this.creatures.length >= 15) return;
    const needed = 18 - this.creatures.length;
    for (let i = 0; i < needed; i++) {
      const biome = this.biomes[i % this.biomes.length];
      const x = Math.max(80, Math.min(this.width - 80, biome.x + gaussianRandom() * biome.radius * 0.8));
      const y = Math.max(80, Math.min(this.height - 80, biome.y + gaussianRandom() * biome.radius * 0.8));

      if (this.hallOfFame.length > 0) {
        const seed = this.hallOfFame[i % this.hallOfFame.length];
        const brain = seed.brain.clone().mutate(Math.max(0.1, this.mutationRate * 1.4), 0.35);
        const dietDrift = i % 3 === 0 ? Math.random() * 0.35 : seed.diet + gaussianRandom() * 0.08;
        this.creatures.push(
          new Creature(x, y, {
            brain,
            diet: Math.max(0, Math.min(1, dietDrift)),
            size: seed.size + gaussianRandom() * 0.8,
            fovAngle: seed.fovAngle + gaussianRandom() * 0.15,
            sensorRange: seed.sensorRange + gaussianRandom() * 12,
            hue: seed.hue + gaussianRandom() * 0.05,
            clockFreq: seed.clockFreq + gaussianRandom() * 0.3,
            generation: seed.generation + 1
          })
        );
      } else {
        this.creatures.push(new Creature(x, y, { diet: Math.random() * 0.45 }));
      }
      this.stats.totalBirths++;
    }
  }

  rebuildGrids() {
    this.creatureGrid.clear();
    this.foodGrid.clear();
    this.poisonGrid.clear();

    const creatures = this.creatures;
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (c.alive) {
        this.creatureGrid.insert(c, c.x, c.y, c.size);
      }
    }

    const food = this.food;
    for (let i = 0; i < food.length; i++) {
      const f = food[i];
      if (f.alive) {
        this.foodGrid.insert(f, f.x, f.y, f.radius);
      }
    }

    const poison = this.poison;
    for (let i = 0; i < poison.length; i++) {
      const p = poison[i];
      if (p.alive) {
        this.poisonGrid.insert(p, p.x, p.y, p.radius);
      }
    }
  }

  updateBiomes(dt) {
    const margin = 220;
    for (let i = 0; i < this.biomes.length; i++) {
      const b = this.biomes[i];
      b.phase += dt * 0.35;
      b.x += (b.vx + Math.cos(b.phase) * 8) * dt;
      b.y += (b.vy + Math.sin(b.phase * 1.13) * 8) * dt;

      if (b.x < margin) {
        b.x = margin;
        b.vx = Math.abs(b.vx);
      } else if (b.x > this.width - margin) {
        b.x = this.width - margin;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y < margin) {
        b.y = margin;
        b.vy = Math.abs(b.vy);
      } else if (b.y > this.height - margin) {
        b.y = this.height - margin;
        b.vy = -Math.abs(b.vy);
      }
    }

    this.foodSpawnAccumulator += this.foodSpawnRate * dt;
    while (this.foodSpawnAccumulator >= 1) {
      this.foodSpawnAccumulator -= 1;
      this.spawnBiomeFood();
    }
  }

  step(dt) {
    this.simTime += dt;
    this.updateBiomes(dt);

    for (let i = 0; i < this.poison.length; i++) {
      const p = this.poison[i];
      p.ttl -= dt;
      if (p.ttl <= 0) p.alive = false;
    }

    this.rebuildGrids();

    const creatures = this.creatures;
    const qC = this.queryCreatures;
    const qF = this.queryFood;
    const qP = this.queryPoison;

    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (!c.alive) continue;
      this.creatureGrid.queryRadius(c.x, c.y, c.sensorRange, qC);
      if (c.diet <= 0.7) {
        this.foodGrid.queryRadius(c.x, c.y, c.sensorRange, qF);
      } else {
        qF.length = 0;
      }
      this.poisonGrid.queryRadius(c.x, c.y, c.sensorRange, qP);
      c.sense(this, qC, qF, qP);
    }

    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (!c.alive) continue;
      c.update(dt, this);
    }

    this.newborns.length = 0;

    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (!c.alive) continue;

      if (c.diet <= 0.7) {
        this.foodGrid.queryRadius(c.x, c.y, c.size + 6, qF);
        const plantEfficiency = c.diet < 0.4 ? 1.0 : 0.58;
        for (let j = 0; j < qF.length; j++) {
          const f = qF[j];
          if (!f.alive) continue;
          const dx = f.x - c.x;
          const dy = f.y - c.y;
          const rad = c.size + f.radius + 1.5;
          if (dx * dx + dy * dy <= rad * rad) {
            f.alive = false;
            c.energy = Math.min(c.maxEnergy, c.energy + f.energy * plantEfficiency);
          }
        }
      }

      this.poisonGrid.queryRadius(c.x, c.y, c.size + 8, qP);
      for (let j = 0; j < qP.length; j++) {
        const p = qP[j];
        if (!p.alive) continue;
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const rad = c.size + p.radius;
        if (dx * dx + dy * dy <= rad * rad) {
          p.alive = false;
          c.energy -= p.damage;
          c.hitFlash = 1.0;
          if (c.energy <= 0) {
            c.energy = 0;
            c.alive = false;
            break;
          }
        }
      }
      if (!c.alive) continue;

      this.creatureGrid.queryRadius(c.x, c.y, c.size + 18, qC);
      for (let j = 0; j < qC.length; j++) {
        const other = qC[j];
        if (other === c || !other.alive) continue;
        const dx = other.x - c.x;
        const dy = other.y - c.y;
        const minDist = c.size + other.size;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.35;
          const nx = dx / dist;
          const ny = dy / dist;
          c.x -= nx * overlap;
          c.y -= ny * overlap;
          other.x += nx * overlap;
          other.y += ny * overlap;

          if (c.canEatCreature(other)) {
            const biteMult = c.isBiting ? 1.9 : 1.0;
            const rawDrain = (28 + c.size * 3.8) * biteMult * dt;
            const actualDrain = Math.min(other.energy, rawDrain);
            other.energy -= actualDrain;
            other.hitFlash = 1.0;
            c.biteFlash = 1.0;

            const dietEff = c.diet > 0.7 ? 1.0 : 0.65;
            c.energy = Math.min(c.maxEnergy, c.energy + actualDrain * this.carnivoreEnergyMultiplier * dietEff);

            if (other.energy <= 0) {
              other.energy = 0;
              other.alive = false;
              c.energy = Math.min(c.maxEnergy, c.energy + 24 * this.carnivoreEnergyMultiplier * dietEff);
            }
          }
        }
      }

      if (
        c.alive &&
        c.energy >= c.maxEnergy * 0.85 &&
        c.reproCooldown <= 0 &&
        creatures.length + this.newborns.length < this.maxCreatures
      ) {
        this.creatureGrid.queryRadius(c.x, c.y, 100, this.queryMates);
        let bestMate = null;
        let bestDistSq = 10000;
        for (let m = 0; m < this.queryMates.length; m++) {
          const cand = this.queryMates[m];
          if (cand === c || !cand.alive) continue;
          if (Math.abs(cand.diet - c.diet) > 0.25) continue;
          if (cand.energy < cand.maxEnergy * 0.45) continue;
          const mdx = cand.x - c.x;
          const mdy = cand.y - c.y;
          const dSq = mdx * mdx + mdy * mdy;
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestMate = cand;
          }
        }

        const energyTransfer = c.energy * 0.4;
        c.energy -= energyTransfer;
        c.childrenCount++;
        c.reproCooldown = 3.2;

        const spawnAngle = c.angle + Math.PI + (Math.random() - 0.5) * 0.8;
        const spawnDist = c.size * 2.1 + 4;
        const ox = Math.max(30, Math.min(this.width - 30, c.x + Math.cos(spawnAngle) * spawnDist));
        const oy = Math.max(30, Math.min(this.height - 30, c.y + Math.sin(spawnAngle) * spawnDist));

        const child = c.createOffspring(bestMate, this.mutationRate, ox, oy, energyTransfer);
        this.newborns.push(child);
        this.stats.totalBirths++;
        if (bestMate) this.stats.sexualBirths++;
        else this.stats.asexualBirths++;
      }
    }

    let writeIdx = 0;
    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (c.alive) {
        creatures[writeIdx++] = c;
      } else {
        this.recordHallOfFame(c);
        this.stats.totalDeaths++;
      }
    }
    creatures.length = writeIdx;

    for (let i = 0; i < this.newborns.length; i++) {
      creatures.push(this.newborns[i]);
    }

    this.compactAlive(this.food);
    this.compactAlive(this.poison);

    this.enforceExtinctionFailsafe();
    this.updateStats();

    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.5) {
      this.telemetryTimer -= 0.5;
      this.recordTelemetrySample();
    }
  }

  compactAlive(list) {
    let w = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].alive) {
        list[w++] = list[i];
      }
    }
    list.length = w;
  }

  updateStats() {
    let herb = 0;
    let omni = 0;
    let carn = 0;
    let genSum = 0;
    let sizeSum = 0;
    let rangeSum = 0;
    let fovSum = 0;
    let maxGen = 1;
    const creatures = this.creatures;
    const len = creatures.length;

    for (let i = 0; i < len; i++) {
      const c = creatures[i];
      if (c.diet < 0.4) herb++;
      else if (c.diet <= 0.7) omni++;
      else carn++;
      genSum += c.generation;
      sizeSum += c.size;
      rangeSum += c.sensorRange;
      fovSum += c.fovAngle;
      if (c.generation > maxGen) maxGen = c.generation;
    }

    this.stats.total = len;
    this.stats.herbivores = herb;
    this.stats.omnivores = omni;
    this.stats.carnivores = carn;
    this.stats.avgGeneration = len > 0 ? genSum / len : 1;
    this.stats.maxGeneration = maxGen;
    this.stats.avgSize = len > 0 ? sizeSum / len : 10;
    this.stats.avgRange = len > 0 ? rangeSum / len : 120;
    this.stats.avgFovDeg = len > 0 ? ((fovSum / len) * 180) / Math.PI : 90;
  }

  recordTelemetrySample() {
    this.telemetryHistory.push({
      herb: this.stats.herbivores,
      omni: this.stats.omnivores,
      carn: this.stats.carnivores,
      avgGen: this.stats.avgGeneration
    });
    if (this.telemetryHistory.length > this.maxTelemetrySamples) {
      this.telemetryHistory.shift();
    }
  }

  findCreatureAt(x, y, maxRadius = 28) {
    const candidates = this.creatureGrid.queryRadius(x, y, maxRadius, this.queryCreatures);
    let closest = null;
    let bestDistSq = maxRadius * maxRadius;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      if (!c.alive) continue;
      const dx = c.x - x;
      const dy = c.y - y;
      const dSq = dx * dx + dy * dy;
      const hitRad = Math.max(c.size + 10, maxRadius);
      if (dSq <= hitRad * hitRad && dSq < bestDistSq) {
        bestDistSq = dSq;
        closest = c;
      }
    }
    return closest;
  }
}
