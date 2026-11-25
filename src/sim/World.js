import { SpatialGrid } from '../physics/SpatialGrid.js';
import { Creature } from './Creature.js';
import { gaussianRandom } from '../math/NeuralNetwork.js';
import { FoodChain } from './FoodChain.js';

const THERMAL_WARM = { zone: 'warm', speedMult: 1.25, basalMult: 1.28 };
const THERMAL_COLD = { zone: 'cold', speedMult: 0.78, basalMult: 0.68 };
const THERMAL_TEMPERATE = { zone: 'temperate', speedMult: 1.0, basalMult: 1.0 };

export class World {
  constructor(width = 3000, height = 2000) {
    this.width = width;
    this.height = height;
    this.simTime = 0;

    this.mutationRate = 0.08;
    this.foodSpawnRate = 16;
    this.carnivoreEnergyMultiplier = 1.45;

    this.features = {
      thermalZones: true,
      obstacles: true,
      currents: true,
      crystalsAndVents: true,
      kelp: true
    };

    this.foodChain = new FoodChain();

    this.maxCreatures = 380;
    this.maxFood = 900;
    this.maxCarrion = 280;
    this.maxPoison = 260;

    this.creatureGrid = new SpatialGrid(width, height, 80, 1024);
    this.foodGrid = new SpatialGrid(width, height, 80, 2048);
    this.carrionGrid = new SpatialGrid(width, height, 80, 512);
    this.poisonGrid = new SpatialGrid(width, height, 80, 512);

    this.queryCreatures = [];
    this.queryFood = [];
    this.queryCarrion = [];
    this.queryPoison = [];
    this.queryMates = [];
    this.newborns = [];

    this.creatures = [];
    this.food = [];
    this.carrion = [];
    this.poison = [];
    this.biomes = [];
    this.obstacles = [];
    this.currents = [];
    this.vents = [];
    this.warmZones = [];
    this.coldZones = [];
    this.whirlpools = [];
    this.kelpClusters = [];
    this.crystals = [];
    this.hallOfFame = [];
    this.fxEvents = [];

    this.foodSpawnAccumulator = 0;
    this.telemetryTimer = 0;
    this.telemetryHistory = [];
    this.maxTelemetrySamples = 160;

    this.stats = {
      total: 0,
      herbivores: 0,
      scavengers: 0,
      omnivores: 0,
      predatorsRed: 0,
      predatorsApex: 0,
      carnivores: 0,
      avgGeneration: 1,
      maxGeneration: 1,
      avgSize: 10,
      avgRange: 120,
      avgFovDeg: 90,
      avgClockFreq: 3.5,
      avgFitness: 0,
      totalBirths: 0,
      sexualBirths: 0,
      asexualBirths: 0,
      totalDeaths: 0
    };

    this.initEnvironment();
    this.seedInitialEcosystem();
  }

  pushFx(type, x, y, color, radius = 10) {
    if (this.fxEvents.length >= 64) return;
    this.fxEvents.push({ type, x, y, color, radius });
  }

  getEnvironmentPhase() {
    const cycle = (this.simTime % 90) / 90;
    if (cycle < 0.38) {
      return { id: 'bloom', label: 'Rozkwit', foodMult: 1.25, tint: 0 };
    }
    if (cycle < 0.72) {
      return { id: 'tide', label: 'Przypływ', foodMult: 1.0, tint: 0.5 };
    }
    return { id: 'abyss', label: 'Mrok', foodMult: 0.72, tint: 1 };
  }

  getThermalEffect(x, y) {
    if (!this.features.thermalZones) return THERMAL_TEMPERATE;
    for (let i = 0; i < this.warmZones.length; i++) {
      const z = this.warmZones[i];
      const dx = x - z.x;
      const dy = y - z.y;
      if (dx * dx + dy * dy <= z.radius * z.radius) {
        return THERMAL_WARM;
      }
    }
    for (let i = 0; i < this.coldZones.length; i++) {
      const z = this.coldZones[i];
      const dx = x - z.x;
      const dy = y - z.y;
      if (dx * dx + dy * dy <= z.radius * z.radius) {
        return THERMAL_COLD;
      }
    }
    return THERMAL_TEMPERATE;
  }

  regenerateTerrain() {
    this.initEnvironment();
    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      const pos = this.pushOutOfObstacles(c.x, c.y, c.size + 4);
      c.x = pos.x;
      c.y = pos.y;
    }
  }

  initEnvironment() {
    this.biomes.length = 0;
    this.obstacles.length = 0;
    this.currents.length = 0;
    this.vents.length = 0;
    this.warmZones.length = 0;
    this.coldZones.length = 0;
    this.whirlpools.length = 0;
    this.kelpClusters.length = 0;
    this.crystals.length = 0;

    const warmPresets = [
      { x: 640, y: 1460, radius: 390 },
      { x: 1620, y: 860, radius: 360 },
      { x: 2440, y: 1500, radius: 370 }
    ];
    for (let i = 0; i < warmPresets.length; i++) {
      const p = warmPresets[i];
      this.warmZones.push({
        x: p.x + (Math.random() - 0.5) * 140,
        y: p.y + (Math.random() - 0.5) * 120,
        radius: p.radius,
        phase: Math.random() * Math.PI * 2
      });
    }

    const coldPresets = [
      { x: 560, y: 440, radius: 390 },
      { x: 2420, y: 460, radius: 410 },
      { x: 1480, y: 1700, radius: 330 }
    ];
    for (let i = 0; i < coldPresets.length; i++) {
      const p = coldPresets[i];
      this.coldZones.push({
        x: p.x + (Math.random() - 0.5) * 140,
        y: p.y + (Math.random() - 0.5) * 100,
        radius: p.radius,
        phase: Math.random() * Math.PI * 2
      });
    }

    const biomeCount = 6;
    for (let i = 0; i < biomeCount; i++) {
      const angle = (i / biomeCount) * Math.PI * 2 + Math.random() * 0.5;
      this.biomes.push({
        x: 350 + Math.random() * (this.width - 700),
        y: 300 + Math.random() * (this.height - 600),
        vx: Math.cos(angle) * (9 + Math.random() * 12),
        vy: Math.sin(angle) * (9 + Math.random() * 12),
        radius: 175 + Math.random() * 105,
        phase: Math.random() * Math.PI * 2
      });
    }

    const obstacleCount = 7;
    let attempts = 0;
    while (this.obstacles.length < obstacleCount && attempts < 120) {
      attempts++;
      const radius = 52 + Math.random() * 58;
      const x = 240 + Math.random() * (this.width - 480);
      const y = 220 + Math.random() * (this.height - 440);
      let overlap = false;
      for (let i = 0; i < this.obstacles.length; i++) {
        const o = this.obstacles[i];
        const minD = o.radius + radius + 170;
        if (Math.hypot(o.x - x, o.y - y) < minD) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;
      const verts = [];
      const sides = 10 + ((Math.random() * 5) | 0);
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        const rScale = 0.84 + Math.random() * 0.24;
        verts.push({ a, r: radius * rScale });
      }
      this.obstacles.push({
        x,
        y,
        radius,
        verts,
        hue: 195 + Math.random() * 35
      });
    }

    const currentPresets = [
      { x: 760, y: 540, radius: 290, angle: 0.22, strength: 88 },
      { x: 2220, y: 620, radius: 310, angle: 2.35, strength: 82 },
      { x: 1500, y: 1460, radius: 330, angle: -0.35, strength: 92 },
      { x: 640, y: 1520, radius: 260, angle: -1.15, strength: 78 }
    ];
    for (let i = 0; i < currentPresets.length; i++) {
      const p = currentPresets[i];
      const ang = p.angle + (Math.random() - 0.5) * 0.45;
      this.currents.push({
        x: p.x + (Math.random() - 0.5) * 140,
        y: p.y + (Math.random() - 0.5) * 120,
        radius: p.radius,
        angle: ang,
        fx: Math.cos(ang) * p.strength,
        fy: Math.sin(ang) * p.strength,
        phase: Math.random() * Math.PI * 2
      });
    }

    const ventSpots = [
      { x: 520, y: 1020 },
      { x: 1520, y: 960 },
      { x: 2480, y: 1060 }
    ];
    for (let i = 0; i < ventSpots.length; i++) {
      let vx = ventSpots[i].x + (Math.random() - 0.5) * 200;
      let vy = ventSpots[i].y + (Math.random() - 0.5) * 200;
      for (let j = 0; j < this.obstacles.length; j++) {
        const o = this.obstacles[j];
        const d = Math.hypot(vx - o.x, vy - o.y);
        if (d < o.radius + 95) {
          vx = o.x + ((vx - o.x) / (d || 1)) * (o.radius + 115);
          vy = o.y + ((vy - o.y) / (d || 1)) * (o.radius + 115);
        }
      }
      this.vents.push({
        x: Math.max(180, Math.min(this.width - 180, vx)),
        y: Math.max(180, Math.min(this.height - 180, vy)),
        radius: 34,
        phase: Math.random() * Math.PI * 2,
        eruptTimer: 2 + Math.random() * 4
      });
    }

    const whirlPresets = [
      { x: 1050, y: 1050, radius: 225, dir: 1, strength: 118 },
      { x: 2020, y: 1120, radius: 215, dir: -1, strength: 112 }
    ];
    for (let i = 0; i < whirlPresets.length; i++) {
      const p = whirlPresets[i];
      const pos = this.pushOutOfObstacles(
        p.x + (Math.random() - 0.5) * 160,
        p.y + (Math.random() - 0.5) * 160,
        110
      );
      this.whirlpools.push({
        x: pos.x,
        y: pos.y,
        radius: p.radius,
        dir: p.dir,
        strength: p.strength,
        phase: Math.random() * Math.PI * 2
      });
    }

    for (let i = 0; i < 6; i++) {
      const pos = this.pushOutOfObstacles(
        260 + Math.random() * (this.width - 520),
        220 + Math.random() * (this.height - 440),
        90
      );
      const stalks = [];
      const stalkCount = 7 + ((Math.random() * 5) | 0);
      for (let s = 0; s < stalkCount; s++) {
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 68;
        stalks.push({
          ox: Math.cos(a) * d,
          oy: Math.sin(a) * d,
          len: 28 + Math.random() * 34,
          phase: Math.random() * Math.PI * 2
        });
      }
      this.kelpClusters.push({
        x: pos.x,
        y: pos.y,
        radius: 95,
        hue: 145 + Math.random() * 35,
        stalks
      });
    }

    for (let i = 0; i < 4; i++) {
      const pos = this.pushOutOfObstacles(
        300 + Math.random() * (this.width - 600),
        260 + Math.random() * (this.height - 520),
        85
      );
      this.crystals.push({
        x: pos.x,
        y: pos.y,
        radius: 22,
        hue: i % 2 === 0 ? 185 : 278,
        phase: Math.random() * Math.PI * 2,
        pulseTimer: 4 + Math.random() * 6
      });
    }
  }

  isInsideObstacle(x, y, pad = 12) {
    if (!this.features.obstacles) return false;
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      const dx = x - o.x;
      const dy = y - o.y;
      const minD = o.radius + pad;
      if (dx * dx + dy * dy < minD * minD) return true;
    }
    return false;
  }

  pushOutOfObstacles(x, y, pad = 16) {
    let px = x;
    let py = y;
    if (this.features.obstacles) {
      for (let i = 0; i < this.obstacles.length; i++) {
        const o = this.obstacles[i];
        const dx = px - o.x;
        const dy = py - o.y;
        const minD = o.radius + pad;
        const dSq = dx * dx + dy * dy;
        if (dSq < minD * minD) {
          const d = Math.sqrt(dSq) || 1;
          px = o.x + (dx / d) * minD;
          py = o.y + (dy / d) * minD;
        }
      }
    }
    return {
      x: Math.max(30, Math.min(this.width - 30, px)),
      y: Math.max(30, Math.min(this.height - 30, py))
    };
  }

  seedInitialEcosystem(preset = {}) {
    this.creatures.length = 0;
    this.food.length = 0;
    this.carrion.length = 0;
    this.poison.length = 0;
    this.hallOfFame.length = 0;
    this.telemetryHistory.length = 0;
    this.fxEvents.length = 0;
    this.simTime = 0;
    this.stats.totalBirths = 0;
    this.stats.sexualBirths = 0;
    this.stats.asexualBirths = 0;
    this.stats.totalDeaths = 0;

    if (preset.reinitEnvironment) {
      this.initEnvironment();
    }

    const initialFood = preset.initialFood !== undefined ? preset.initialFood : 380;
    const initialCarrion = preset.initialCarrion !== undefined ? preset.initialCarrion : 36;
    const initialPoison = preset.initialPoison !== undefined ? preset.initialPoison : 26;
    const initialCount = preset.initialCount !== undefined ? preset.initialCount : 120;
    const herbShare = preset.herbShare !== undefined ? preset.herbShare : 0.42;
    const scavShare = preset.scavShare !== undefined ? preset.scavShare : 0.20;
    const omniShare = preset.omniShare !== undefined ? preset.omniShare : 0.18;

    for (let i = 0; i < initialFood; i++) {
      this.spawnBiomeFood();
    }

    for (let i = 0; i < initialCarrion; i++) {
      const rx = 180 + Math.random() * (this.width - 360);
      const ry = 180 + Math.random() * (this.height - 360);
      this.spawnCarrion(rx, ry, 1, 14, 52);
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
      const rawX = Math.max(80, Math.min(this.width - 80, biome.x + gaussianRandom() * biome.radius * 1.15));
      const rawY = Math.max(80, Math.min(this.height - 80, biome.y + gaussianRandom() * biome.radius * 1.15));
      const pos = this.pushOutOfObstacles(rawX, rawY, 22);
      const r = Math.random();
      let diet;
      if (r < herbShare) diet = Math.random() * 0.22;
      else if (r < herbShare + scavShare) diet = 0.26 + Math.random() * 0.14;
      else if (r < herbShare + scavShare + omniShare) diet = 0.44 + Math.random() * 0.14;
      else if (r < herbShare + scavShare + omniShare + (1 - herbShare - scavShare - omniShare) * 0.72) {
        diet = 0.62 + Math.random() * 0.16;
      } else {
        diet = 0.82 + Math.random() * 0.18;
      }

      this.creatures.push(new Creature(pos.x, pos.y, { diet }));
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
      this.seedInitialEcosystem({ reinitEnvironment: true });
    } else if (scenarioId === 'arms_race') {
      this.mutationRate = 0.12;
      this.foodSpawnRate = 20;
      this.carnivoreEnergyMultiplier = 2.35;
      this.seedInitialEcosystem({
        initialFood: 420,
        initialCarrion: 45,
        initialPoison: 18,
        initialCount: 125,
        herbShare: 0.36,
        scavShare: 0.18,
        omniShare: 0.14
      });
    } else if (scenarioId === 'famine') {
      this.mutationRate = 0.09;
      this.foodSpawnRate = 6;
      this.carnivoreEnergyMultiplier = 1.6;
      this.seedInitialEcosystem({
        initialFood: 140,
        initialCarrion: 48,
        initialPoison: 20,
        initialCount: 100,
        herbShare: 0.45,
        scavShare: 0.25,
        omniShare: 0.16
      });
    } else if (scenarioId === 'toxic') {
      this.mutationRate = 0.1;
      this.foodSpawnRate = 18;
      this.carnivoreEnergyMultiplier = 1.4;
      this.seedInitialEcosystem({
        initialFood: 360,
        initialCarrion: 40,
        initialPoison: 135,
        initialCount: 120,
        herbShare: 0.40,
        scavShare: 0.28,
        omniShare: 0.16
      });
    } else if (scenarioId === 'chaos') {
      this.mutationRate = 0.32;
      this.foodSpawnRate = 18;
      this.carnivoreEnergyMultiplier = 1.45;
      this.seedInitialEcosystem({ initialFood: 380, initialCarrion: 36, initialPoison: 24, initialCount: 115 });
    } else if (scenarioId === 'scavenger_realm') {
      this.mutationRate = 0.1;
      this.foodSpawnRate = 10;
      this.carnivoreEnergyMultiplier = 1.85;
      this.seedInitialEcosystem({
        initialFood: 210,
        initialCarrion: 115,
        initialPoison: 42,
        initialCount: 125,
        herbShare: 0.24,
        scavShare: 0.38,
        omniShare: 0.14
      });
    }
  }

  spawnFromHallOfFame(index, x, y) {
    const seed = this.hallOfFame[index];
    if (!seed) return null;
    const rawX = x !== undefined ? x : this.width * 0.5 + gaussianRandom() * 140;
    const rawY = y !== undefined ? y : this.height * 0.5 + gaussianRandom() * 140;
    const pos = this.pushOutOfObstacles(rawX, rawY, 20);
    const brain = seed.brain.clone().mutate(Math.max(0.06, this.mutationRate), 0.25);
    const child = new Creature(pos.x, pos.y, {
      brain,
      diet: seed.diet,
      size: seed.size,
      fovAngle: seed.fovAngle,
      sensorRange: seed.sensorRange,
      hue: seed.hue,
      clockFreq: seed.clockFreq,
      generation: seed.generation + 1
    });
    this.creatures.push(child);
    this.stats.totalBirths++;
    this.stats.asexualBirths++;
    this.pushFx('birth', pos.x, pos.y, child.fillColor, child.size * 2.2);
    return child;
  }

  spawnBiomeFood() {
    if (this.food.length >= this.maxFood) return;
    let x;
    let y;
    if (Math.random() < 0.88 && this.biomes.length > 0) {
      const b = this.biomes[(Math.random() * this.biomes.length) | 0];
      x = b.x + gaussianRandom() * (b.radius * 0.52);
      y = b.y + gaussianRandom() * (b.radius * 0.52);
    } else {
      x = 80 + Math.random() * (this.width - 160);
      y = 80 + Math.random() * (this.height - 160);
    }
    if (this.isInsideObstacle(x, y, 10)) return;
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
      if (this.isInsideObstacle(fx, fy, 8)) continue;
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

  spawnCarrion(x, y, count = 1, spread = 14, energy = 54) {
    for (let i = 0; i < count; i++) {
      if (this.carrion.length >= this.maxCarrion) {
        this.carrion.shift();
      }
      const cx = Math.max(20, Math.min(this.width - 20, x + (Math.random() - 0.5) * spread * 2));
      const cy = Math.max(20, Math.min(this.height - 20, y + (Math.random() - 0.5) * spread * 2));
      if (this.isInsideObstacle(cx, cy, 8)) continue;
      const ttl = 48 + Math.random() * 24;
      this.carrion.push({
        x: cx,
        y: cy,
        radius: 4.6 + Math.random() * 2.2,
        energy,
        phase: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI * 2,
        ttl,
        maxTtl: ttl,
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
      if (this.isInsideObstacle(px, py, 8)) continue;
      this.poison.push({
        x: px,
        y: py,
        radius: 5.5 + Math.random() * 2.2,
        damage: 34,
        phase: Math.random() * Math.PI * 2,
        ttl: 110 + Math.random() * 60,
        alive: true
      });
    }
  }

  cloneAndMutateCreature(source) {
    if (!source) return null;
    const angle = Math.random() * Math.PI * 2;
    const dist = source.size * 2.5 + 14;
    const pos = this.pushOutOfObstacles(
      source.x + Math.cos(angle) * dist,
      source.y + Math.sin(angle) * dist,
      source.size + 4
    );
    const clone = source.createOffspring(null, Math.max(0.06, this.mutationRate), pos.x, pos.y, source.maxEnergy * 0.72);
    this.creatures.push(clone);
    this.stats.totalBirths++;
    this.stats.asexualBirths++;
    this.pushFx('birth', pos.x, pos.y, clone.fillColor, clone.size * 2.2);
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
    if (this.creatures.length >= 16) return;
    const needed = 20 - this.creatures.length;
    for (let i = 0; i < needed; i++) {
      const biome = this.biomes[i % this.biomes.length];
      const pos = this.pushOutOfObstacles(
        biome.x + gaussianRandom() * biome.radius * 0.8,
        biome.y + gaussianRandom() * biome.radius * 0.8,
        20
      );

      if (this.hallOfFame.length > 0) {
        const seed = this.hallOfFame[i % this.hallOfFame.length];
        const brain = seed.brain.clone().mutate(Math.max(0.1, this.mutationRate * 1.4), 0.35);
        const dietDrift = i % 4 === 0 ? Math.random() * 0.28 : i % 4 === 1 ? 0.35 + Math.random() * 0.14 : seed.diet + gaussianRandom() * 0.08;
        this.creatures.push(
          new Creature(pos.x, pos.y, {
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
        this.creatures.push(new Creature(pos.x, pos.y, { diet: Math.random() * 0.5 }));
      }
      this.stats.totalBirths++;
    }
  }

  rebuildGrids() {
    this.creatureGrid.clear();
    this.foodGrid.clear();
    this.carrionGrid.clear();
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

    const carrion = this.carrion;
    for (let i = 0; i < carrion.length; i++) {
      const m = carrion[i];
      if (m.alive) {
        this.carrionGrid.insert(m, m.x, m.y, m.radius);
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

  updateBiomesAndVents(dt) {
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

    if (this.features.currents) {
      for (let i = 0; i < this.currents.length; i++) {
        this.currents[i].phase += dt * 1.4;
      }
      for (let i = 0; i < this.whirlpools.length; i++) {
        this.whirlpools[i].phase += dt * 1.6 * this.whirlpools[i].dir;
      }
    }

    if (this.features.crystalsAndVents) {
      for (let i = 0; i < this.vents.length; i++) {
        const v = this.vents[i];
        v.phase += dt * 2.2;
        v.eruptTimer -= dt;
        if (v.eruptTimer <= 0) {
          v.eruptTimer = 4.5 + Math.random() * 3.5;
          this.spawnFood(v.x, v.y, 6, 68);
          if (Math.random() < 0.45) {
            this.spawnPoison(v.x, v.y, 1, 55);
          }
          this.pushFx('vent', v.x, v.y, '#fb923c', 42);
        }
      }

      for (let i = 0; i < this.crystals.length; i++) {
        const cr = this.crystals[i];
        cr.phase += dt * 2.0;
        cr.pulseTimer -= dt;
        if (cr.pulseTimer <= 0) {
          cr.pulseTimer = 7.5 + Math.random() * 4.5;
          this.spawnFood(cr.x, cr.y, 5, 58);
          this.pushFx('crystal', cr.x, cr.y, `hsl(${cr.hue}, 92%, 68%)`, 54);
        }
      }
    }

    const phase = this.getEnvironmentPhase();
    this.foodSpawnAccumulator += this.foodSpawnRate * phase.foodMult * dt;
    while (this.foodSpawnAccumulator >= 1) {
      this.foodSpawnAccumulator -= 1;
      this.spawnBiomeFood();
    }
  }

  driftPelletInCurrents(item, dt, scale = 0.22) {
    if (!this.features.currents) return;
    const currents = this.currents;
    for (let j = 0; j < currents.length; j++) {
      const cur = currents[j];
      const dx = item.x - cur.x;
      const dy = item.y - cur.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < cur.radius * cur.radius) {
        const f = (1 - Math.sqrt(dSq) / cur.radius) * scale * dt;
        item.x = Math.max(24, Math.min(this.width - 24, item.x + cur.fx * f));
        item.y = Math.max(24, Math.min(this.height - 24, item.y + cur.fy * f));
      }
    }
  }

  step(dt) {
    this.simTime += dt;
    this.updateBiomesAndVents(dt);

    for (let i = 0; i < this.carrion.length; i++) {
      const m = this.carrion[i];
      m.ttl -= dt;
      if (m.ttl <= 0) {
        m.alive = false;
      } else {
        this.driftPelletInCurrents(m, dt, 0.25);
      }
    }

    for (let i = 0; i < this.poison.length; i++) {
      const p = this.poison[i];
      p.ttl -= dt;
      if (p.ttl <= 0) p.alive = false;
    }

    this.rebuildGrids();

    const creatures = this.creatures;
    const qC = this.queryCreatures;
    const qF = this.queryFood;
    const qM = this.queryCarrion;
    const qP = this.queryPoison;

    const chain = this.foodChain;

    for (let i = 0; i < creatures.length; i++) {
      const c = creatures[i];
      if (!c.alive) continue;
      this.creatureGrid.queryRadius(c.x, c.y, c.sensorRange, qC);
      if (chain.canEatPlant(c)) {
        this.foodGrid.queryRadius(c.x, c.y, c.sensorRange, qF);
      } else {
        qF.length = 0;
      }
      if (chain.canEatCarrion(c)) {
        this.carrionGrid.queryRadius(c.x, c.y, c.sensorRange, qM);
      } else {
        qM.length = 0;
      }
      this.poisonGrid.queryRadius(c.x, c.y, c.sensorRange, qP);
      c.sense(this, qC, qF, qM, qP);
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

      const plantEff = chain.getPlantEfficiency(c);
      if (plantEff > 0) {
        this.foodGrid.queryRadius(c.x, c.y, c.size + 6, qF);
        for (let j = 0; j < qF.length; j++) {
          const f = qF[j];
          if (!f.alive) continue;
          const dx = f.x - c.x;
          const dy = f.y - c.y;
          const rad = c.size + f.radius + 1.5;
          if (dx * dx + dy * dy <= rad * rad) {
            f.alive = false;
            const gained = f.energy * plantEff;
            c.energy = Math.min(c.maxEnergy, c.energy + gained);
            c.energyGained += gained;
            c.foodEaten++;
            c.eatFlash = 1.0;
            this.pushFx('eat', f.x, f.y, '#4ade80', 8);
          }
        }
      }

      const carrionEff = chain.getCarrionEfficiency(c);
      if (carrionEff > 0) {
        this.carrionGrid.queryRadius(c.x, c.y, c.size + 8, qM);
        for (let j = 0; j < qM.length; j++) {
          const m = qM[j];
          if (!m.alive) continue;
          const dx = m.x - c.x;
          const dy = m.y - c.y;
          const rad = c.size + m.radius + 2.0;
          if (dx * dx + dy * dy <= rad * rad) {
            m.alive = false;
            const freshness = 0.45 + 0.55 * (m.ttl / m.maxTtl);
            const gained = m.energy * carrionEff * freshness;
            c.energy = Math.min(c.maxEnergy, c.energy + gained);
            c.energyGained += gained;
            c.foodEaten++;
            c.eatFlash = 1.0;
            this.pushFx('eat', m.x, m.y, '#c084fc', 10);
          }
        }
      }

      this.poisonGrid.queryRadius(c.x, c.y, c.size + 8, qP);
      const toxinMult = c.speciesIdx === 1 ? 0.42 : 1.0;
      for (let j = 0; j < qP.length; j++) {
        const p = qP[j];
        if (!p.alive) continue;
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const rad = c.size + p.radius;
        if (dx * dx + dy * dy <= rad * rad) {
          p.alive = false;
          c.energy -= p.damage * toxinMult;
          c.toxinsHit++;
          c.hitFlash = 1.0;
          this.pushFx('hit', p.x, p.y, '#e879f9', 12);
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

          if (chain.canEatCreature(c, other)) {
            const biteMult = c.isBiting ? 1.9 : 1.0;
            const apexMult = c.speciesIdx === 4 ? 1.08 : 1.0;
            const rawDrain = (28 + c.size * 3.8) * biteMult * apexMult * dt;
            const actualDrain = Math.min(other.energy, rawDrain);
            other.energy -= actualDrain;
            other.hitFlash = 1.0;
            c.biteFlash = 1.0;

            const dietEff = c.speciesIdx === 4 ? 0.8 : c.speciesIdx === 3 ? 0.96 : 0.7;
            const biteGain = actualDrain * this.carnivoreEnergyMultiplier * dietEff;
            c.energy = Math.min(c.maxEnergy, c.energy + biteGain);
            c.energyGained += biteGain;

            if (other.energy <= 0) {
              other.energy = 0;
              other.alive = false;
              c.kills++;
              const killBonus = 22 * this.carnivoreEnergyMultiplier * dietEff;
              c.energy = Math.min(c.maxEnergy, c.energy + killBonus);
              c.energyGained += killBonus;
              this.pushFx('bite', other.x, other.y, c.fillColor, other.size * 1.8);
            }
          }
        }
      }

      const reproThreshold = c.speciesIdx === 4 ? 0.9 : 0.85;
      if (
        c.alive &&
        c.energy >= c.maxEnergy * reproThreshold &&
        c.reproCooldown <= 0 &&
        creatures.length + this.newborns.length < this.maxCreatures
      ) {
        this.creatureGrid.queryRadius(c.x, c.y, 100, this.queryMates);
        let bestMate = null;
        let bestDistSq = 10000;
        for (let m = 0; m < this.queryMates.length; m++) {
          const cand = this.queryMates[m];
          if (cand === c || !cand.alive) continue;
          if (Math.abs(cand.diet - c.diet) > 0.22) continue;
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
        c.reproCooldown = c.speciesIdx === 4 ? 6.8 : 3.2;

        const spawnAngle = c.angle + Math.PI + (Math.random() - 0.5) * 0.8;
        const spawnDist = c.size * 2.1 + 4;
        const pos = this.pushOutOfObstacles(
          c.x + Math.cos(spawnAngle) * spawnDist,
          c.y + Math.sin(spawnAngle) * spawnDist,
          c.size
        );

        const child = c.createOffspring(bestMate, this.mutationRate, pos.x, pos.y, energyTransfer);
        this.newborns.push(child);
        this.stats.totalBirths++;
        if (bestMate) this.stats.sexualBirths++;
        else this.stats.asexualBirths++;
        this.pushFx('birth', pos.x, pos.y, child.fillColor, child.size * 2.0);
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
        const chunks = c.size > 11 ? 2 : 1;
        this.spawnCarrion(c.x, c.y, chunks, c.size * 0.9, 36 + c.size * 3.4);
        this.pushFx('death', c.x, c.y, c.fillColor, c.size * 1.6);
      }
    }
    creatures.length = writeIdx;

    for (let i = 0; i < this.newborns.length; i++) {
      creatures.push(this.newborns[i]);
    }

    this.compactAlive(this.food);
    this.compactAlive(this.carrion);
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
    let scav = 0;
    let omni = 0;
    let predRed = 0;
    let predApex = 0;
    let genSum = 0;
    let sizeSum = 0;
    let rangeSum = 0;
    let fovSum = 0;
    let clockSum = 0;
    let fitSum = 0;
    let maxGen = 1;
    const creatures = this.creatures;
    const len = creatures.length;

    for (let i = 0; i < len; i++) {
      const c = creatures[i];
      if (c.speciesIdx === 0) herb++;
      else if (c.speciesIdx === 1) scav++;
      else if (c.speciesIdx === 2) omni++;
      else if (c.speciesIdx === 3) predRed++;
      else predApex++;
      genSum += c.generation;
      sizeSum += c.size;
      rangeSum += c.sensorRange;
      fovSum += c.fovAngle;
      clockSum += c.clockFreq;
      fitSum += c.getFitnessScore();
      if (c.generation > maxGen) maxGen = c.generation;
    }

    this.stats.total = len;
    this.stats.herbivores = herb;
    this.stats.scavengers = scav;
    this.stats.omnivores = omni;
    this.stats.predatorsRed = predRed;
    this.stats.predatorsApex = predApex;
    this.stats.carnivores = predRed + predApex;
    this.stats.avgGeneration = len > 0 ? genSum / len : 1;
    this.stats.maxGeneration = maxGen;
    this.stats.avgSize = len > 0 ? sizeSum / len : 10;
    this.stats.avgRange = len > 0 ? rangeSum / len : 120;
    this.stats.avgFovDeg = len > 0 ? ((fovSum / len) * 180) / Math.PI : 90;
    this.stats.avgClockFreq = len > 0 ? clockSum / len : 3.5;
    this.stats.avgFitness = len > 0 ? fitSum / len : 0;
  }

  recordTelemetrySample() {
    this.telemetryHistory.push({
      herb: this.stats.herbivores,
      scav: this.stats.scavengers,
      omni: this.stats.omnivores,
      predRed: this.stats.predatorsRed,
      predApex: this.stats.predatorsApex,
      carn: this.stats.carnivores,
      avgGen: this.stats.avgGeneration,
      avgSize: this.stats.avgSize,
      avgRange: this.stats.avgRange,
      avgFov: this.stats.avgFovDeg,
      avgFitness: this.stats.avgFitness
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
