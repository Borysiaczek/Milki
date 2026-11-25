import { NeuralNetwork, gaussianRandom } from '../math/NeuralNetwork.js';
import { getRandomCreatureName } from './Names.js';
import { getSpeciesIndexFromDiet, getSpeciesByIndex, createDefaultTrophicGenes, TOTAL_TARGETS } from './FoodChain.js';

let nextCreatureId = 1;

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export class Creature {
  constructor(x, y, options = {}) {
    this.id = nextCreatureId++;
    this.name = options.name || getRandomCreatureName();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = options.angle !== undefined ? options.angle : Math.random() * Math.PI * 2;
    this.angularVelocity = 0;
    this.thermalZone = 'temperate';

    this.diet = options.diet !== undefined ? clamp(options.diet, 0, 1) : Math.random();
    this.speciesIdx = getSpeciesIndexFromDiet(this.diet);
    this.trophicGenes = options.trophicGenes
      ? new Float32Array(options.trophicGenes)
      : createDefaultTrophicGenes(this.speciesIdx);

    this.size = options.size !== undefined ? clamp(options.size, 5, 16) : 6.5 + Math.random() * 6.5;
    this.fovAngle = options.fovAngle !== undefined ? clamp(options.fovAngle, 0.5, 2.6) : 0.9 + Math.random() * 1.1;
    this.sensorRange = options.sensorRange !== undefined ? clamp(options.sensorRange, 60, 180) : 85 + Math.random() * 70;
    this.hue = options.hue !== undefined ? ((options.hue % 1) + 1) % 1 : Math.random();
    this.clockFreq = options.clockFreq !== undefined ? clamp(options.clockFreq, 1.5, 6.0) : 2.2 + Math.random() * 2.5;

    this.brain = options.brain || new NeuralNetwork(14, 10, 3, true);
    this.generation = options.generation || 1;
    this.parentName = options.parentName || null;
    this.founderName = options.founderName || this.name;
    this.birthType = options.birthType || 'Pierwotny';
    this.ownMutations = options.ownMutations || 0;
    this.lineageMutations = options.lineageMutations || 0;
    this.age = 0;
    this.childrenCount = 0;
    this.foodEaten = 0;
    this.kills = 0;
    this.toxinsHit = 0;
    this.energyGained = 0;
    this.currentBurnRate = 0;
    this.sprintTime = 0;
    this.maxSpeedReached = 0;
    this.distanceTraveled = 0;
    this.reproCooldown = this.speciesIdx === 4 ? 3.5 : 1.5;
    this.biteFlash = 0;
    this.hitFlash = 0;
    this.eatFlash = 0;
    this.alive = true;

    this.maxEnergy = 90 + this.size * 14;
    this.energy = options.energy !== undefined ? Math.min(options.energy, this.maxEnergy) : this.maxEnergy * 0.65;

    this.thrust = 0;
    this.torque = 0;
    this.sprintOrBite = 0;
    this.isSprinting = false;
    this.isBiting = false;
    this.tailPhase = Math.random() * Math.PI * 2;

    this.inputs = new Float32Array(14);
    this.rayDistances = new Float32Array(5);
    this.rayTypes = new Float32Array(5);
    this.rayHitX = new Float32Array(5);
    this.rayHitY = new Float32Array(5);
    this.rayAngles = new Float32Array(5);
    this.rayHitX.fill(x);
    this.rayHitY.fill(y);

    this.updateColorCache();
  }

  getDietCategory() {
    return getSpeciesByIndex(this.speciesIdx).id;
  }

  updateColorCache() {
    let h;
    let s;
    let l;
    if (this.speciesIdx === 0) {
      h = 150 + this.hue * 34;
      s = 86;
      l = 55;
    } else if (this.speciesIdx === 1) {
      h = 256 + this.hue * 32;
      s = 82;
      l = 64;
    } else if (this.speciesIdx === 2) {
      h = 34 + this.hue * 20;
      s = 94;
      l = 58;
    } else if (this.speciesIdx === 3) {
      h = (338 + this.hue * 24) % 360;
      s = 90;
      l = 57;
    } else {
      h = 198 + this.hue * 24;
      s = 95;
      l = 60;
    }
    this.displayHue = h;
    this.fillColor = `hsl(${h.toFixed(1)}, ${s}%, ${l}%)`;
    this.strokeColor = `hsla(${h.toFixed(1)}, ${Math.min(100, s + 8)}%, ${Math.min(92, l + 22)}%, 0.78)`;
    this.glowColor = `hsla(${h.toFixed(1)}, ${s}%, ${l + 8}%, 0.36)`;
    this.coreColor = `hsl(${h.toFixed(1)}, ${Math.min(100, s + 10)}%, ${Math.min(95, l + 28)}%)`;
    this.tailColor = `hsla(${h.toFixed(1)}, ${s}%, ${l + 4}%, 0.72)`;
  }

  sense(world, nearbyCreatures, nearbyFood, nearbyCarrion, nearbyPoison) {
    const range = this.sensorRange;
    const x = this.x;
    const y = this.y;
    const fov = this.fovAngle;
    const startAngle = this.angle - fov * 0.5;
    const stepAngle = fov * 0.25;
    const chain = world.foodChain;
    const eatsPlants = chain.canEatPlant(this);
    const eatsCarrion = chain.canEatCarrion(this);
    const worldW = world.width;
    const worldH = world.height;
    const useObstacles = world.features.obstacles;
    const obstacles = world.obstacles;
    const obsLen = useObstacles ? obstacles.length : 0;

    const foodLen = nearbyFood.length;
    const carrionLen = nearbyCarrion.length;
    const poisonLen = nearbyPoison.length;
    const creatureLen = nearbyCreatures.length;

    for (let r = 0; r < 5; r++) {
      const rayAngle = startAngle + r * stepAngle;
      this.rayAngles[r] = rayAngle;
      const dx = Math.cos(rayAngle);
      const dy = Math.sin(rayAngle);

      let bestDist = range;
      let bestType = 0;
      let hitSomething = false;

      if (dx < -0.0001) {
        const t = -x / dx;
        if (t > 0 && t < bestDist) {
          bestDist = t;
          bestType = 0;
          hitSomething = true;
        }
      } else if (dx > 0.0001) {
        const t = (worldW - x) / dx;
        if (t > 0 && t < bestDist) {
          bestDist = t;
          bestType = 0;
          hitSomething = true;
        }
      }
      if (dy < -0.0001) {
        const t = -y / dy;
        if (t > 0 && t < bestDist) {
          bestDist = t;
          bestType = 0;
          hitSomething = true;
        }
      } else if (dy > 0.0001) {
        const t = (worldH - y) / dy;
        if (t > 0 && t < bestDist) {
          bestDist = t;
          bestType = 0;
          hitSomething = true;
        }
      }

      for (let i = 0; i < obsLen; i++) {
        const ob = obstacles[i];
        const ox = ob.x - x;
        const oy = ob.y - y;
        const proj = ox * dx + oy * dy;
        if (proj <= -ob.radius || proj >= bestDist + ob.radius) continue;
        const perpSq = ox * ox + oy * oy - proj * proj;
        const radSq = ob.radius * ob.radius;
        if (perpSq <= radSq) {
          const t = proj - Math.sqrt(Math.max(0, radSq - perpSq));
          if (t > 0 && t < bestDist) {
            bestDist = t;
            bestType = 0;
            hitSomething = true;
          }
        }
      }

      if (eatsPlants) {
        const plantSignal = chain.getPlantEfficiency(this);
        for (let i = 0; i < foodLen; i++) {
          const f = nearbyFood[i];
          const ox = f.x - x;
          const oy = f.y - y;
          const proj = ox * dx + oy * dy;
          if (proj <= 0 || proj >= bestDist) continue;
          const perpSq = ox * ox + oy * oy - proj * proj;
          const rad = f.radius + 2.5;
          if (perpSq <= rad * rad) {
            const t = proj - Math.sqrt(Math.max(0, rad * rad - perpSq));
            if (t > 0 && t < bestDist) {
              bestDist = t;
              bestType = plantSignal;
              hitSomething = true;
            }
          }
        }
      }

      if (eatsCarrion) {
        const carrionSignal = Math.min(1.0, chain.getCarrionEfficiency(this));
        for (let i = 0; i < carrionLen; i++) {
          const m = nearbyCarrion[i];
          const ox = m.x - x;
          const oy = m.y - y;
          const proj = ox * dx + oy * dy;
          if (proj <= 0 || proj >= bestDist) continue;
          const perpSq = ox * ox + oy * oy - proj * proj;
          const rad = m.radius + 3.0;
          if (perpSq <= rad * rad) {
            const t = proj - Math.sqrt(Math.max(0, rad * rad - perpSq));
            if (t > 0 && t < bestDist) {
              bestDist = t;
              bestType = carrionSignal;
              hitSomething = true;
            }
          }
        }
      }

      for (let i = 0; i < poisonLen; i++) {
        const p = nearbyPoison[i];
        const ox = p.x - x;
        const oy = p.y - y;
        const proj = ox * dx + oy * dy;
        if (proj <= 0 || proj >= bestDist) continue;
        const perpSq = ox * ox + oy * oy - proj * proj;
        const rad = p.radius + 3.0;
        if (perpSq <= rad * rad) {
          const t = proj - Math.sqrt(Math.max(0, rad * rad - perpSq));
          if (t > 0 && t < bestDist) {
            bestDist = t;
            bestType = -1.0;
            hitSomething = true;
          }
        }
      }

      for (let i = 0; i < creatureLen; i++) {
        const c = nearbyCreatures[i];
        if (c === this || !c.alive) continue;
        const ox = c.x - x;
        const oy = c.y - y;
        const proj = ox * dx + oy * dy;
        if (proj <= 0 || proj >= bestDist) continue;
        const perpSq = ox * ox + oy * oy - proj * proj;
        const rad = c.size + 1.5;
        if (perpSq <= rad * rad) {
          const t = proj - Math.sqrt(Math.max(0, rad * rad - perpSq));
          if (t > 0 && t < bestDist) {
            bestDist = t;
            if (chain.canEatCreature(this, c)) {
              bestType = 1.0;
            } else if (chain.canEatCreature(c, this)) {
              bestType = -1.0;
            } else {
              bestType = 0.0;
            }
            hitSomething = true;
          }
        }
      }

      const normDist = hitSomething ? clamp(1.0 - bestDist / range, 0, 1) : 0;
      this.rayDistances[r] = normDist;
      this.rayTypes[r] = bestType;
      this.rayHitX[r] = x + dx * bestDist;
      this.rayHitY[r] = y + dy * bestDist;

      this.inputs[r] = normDist;
      this.inputs[5 + r] = bestType;
    }

    const speed = Math.hypot(this.vx, this.vy);
    const maxSpeed = 195;
    this.inputs[10] = clamp(this.energy / this.maxEnergy, 0, 1);
    this.inputs[11] = clamp(speed / maxSpeed, 0, 1);
    this.inputs[12] = clamp(this.angularVelocity / 5.5, -1, 1);
    this.inputs[13] = Math.sin(this.age * this.clockFreq);
  }

  update(dt, world) {
    this.age += dt;
    if (this.reproCooldown > 0) this.reproCooldown -= dt;
    if (this.biteFlash > 0) this.biteFlash = Math.max(0, this.biteFlash - dt * 3.5);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4.0);
    if (this.eatFlash > 0) this.eatFlash = Math.max(0, this.eatFlash - dt * 3.5);

    const out = this.brain.forward(this.inputs);
    this.thrust = out[0];
    this.torque = out[1];
    this.sprintOrBite = out[2];

    const actionActive = this.sprintOrBite > 0.5;
    this.isSprinting = actionActive && this.energy > this.maxEnergy * 0.12;
    this.isBiting = actionActive;

    const thermal = world.getThermalEffect(this.x, this.y);
    this.thermalZone = thermal.zone;

    const sizeFactor = 1.0 - (this.size - 5) / 28;
    const sprintMult = this.isSprinting ? 1.65 : 1.0;
    const forwardAccel = this.thrust * (165 * sizeFactor + 70) * sprintMult * thermal.speedMult;
    const turnAccel = this.torque * (7.2 * sizeFactor + 3.2) * (0.5 + 0.5 * thermal.speedMult);

    this.angularVelocity += turnAccel * dt;
    this.angularVelocity *= Math.exp(-5.5 * dt);
    this.angle += this.angularVelocity * dt;

    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    this.vx += cosA * forwardAccel * dt;
    this.vy += sinA * forwardAccel * dt;

    if (world.features.currents) {
      const currents = world.currents;
      for (let i = 0; i < currents.length; i++) {
        const cur = currents[i];
        const dx = this.x - cur.x;
        const dy = this.y - cur.y;
        const distSq = dx * dx + dy * dy;
        const radSq = cur.radius * cur.radius;
        if (distSq < radSq) {
          const falloff = 1.0 - Math.sqrt(distSq) / cur.radius;
          this.vx += cur.fx * falloff * dt;
          this.vy += cur.fy * falloff * dt;
        }
      }

      const whirlpools = world.whirlpools;
      for (let i = 0; i < whirlpools.length; i++) {
        const wp = whirlpools[i];
        const dx = this.x - wp.x;
        const dy = this.y - wp.y;
        const distSq = dx * dx + dy * dy;
        const radSq = wp.radius * wp.radius;
        if (distSq < radSq && distSq > 4) {
          const dist = Math.sqrt(distSq);
          const falloff = 1.0 - dist / wp.radius;
          const nx = dx / dist;
          const ny = dy / dist;
          const tx = -ny * wp.dir;
          const ty = nx * wp.dir;
          const radial = dist < wp.radius * 0.22 ? 42 : -28;
          this.vx += (tx * wp.strength + nx * radial) * falloff * dt;
          this.vy += (ty * wp.strength + ny * radial) * falloff * dt;
        }
      }
    }

    let extraDrag = 0;
    if (world.features.kelp) {
      const kelps = world.kelpClusters;
      for (let i = 0; i < kelps.length; i++) {
        const k = kelps[i];
        const dx = this.x - k.x;
        const dy = this.y - k.y;
        if (dx * dx + dy * dy < k.radius * k.radius) {
          extraDrag = 1.5;
          break;
        }
      }
    }

    const drag = Math.exp(-(2.6 + extraDrag) * dt);
    this.vx *= drag;
    this.vy *= drag;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (world.features.obstacles) {
      const obstacles = world.obstacles;
      for (let i = 0; i < obstacles.length; i++) {
        const ob = obstacles[i];
        const dx = this.x - ob.x;
        const dy = this.y - ob.y;
        const minDist = ob.radius + this.size;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          this.x = ob.x + nx * minDist;
          this.y = ob.y + ny * minDist;
          const vn = this.vx * nx + this.vy * ny;
          if (vn < 0) {
            this.vx -= 1.45 * vn * nx;
            this.vy -= 1.45 * vn * ny;
          }
        }
      }
    }

    const margin = 95;
    const repelStrength = 420;
    if (this.x < margin) {
      const f = (margin - this.x) / margin;
      this.vx += f * f * repelStrength * dt;
    } else if (this.x > world.width - margin) {
      const f = (this.x - (world.width - margin)) / margin;
      this.vx -= f * f * repelStrength * dt;
    }
    if (this.y < margin) {
      const f = (margin - this.y) / margin;
      this.vy += f * f * repelStrength * dt;
    } else if (this.y > world.height - margin) {
      const f = (this.y - (world.height - margin)) / margin;
      this.vy -= f * f * repelStrength * dt;
    }

    if (this.x < this.size) {
      this.x = this.size;
      if (this.vx < 0) this.vx *= -0.4;
    } else if (this.x > world.width - this.size) {
      this.x = world.width - this.size;
      if (this.vx > 0) this.vx *= -0.4;
    }
    if (this.y < this.size) {
      this.y = this.size;
      if (this.vy < 0) this.vy *= -0.4;
    } else if (this.y > world.height - this.size) {
      this.y = world.height - this.size;
      if (this.vy > 0) this.vy *= -0.4;
    }

    this.tailPhase += dt * (4.5 + Math.abs(this.thrust) * (this.isSprinting ? 18 : 11));
    const instSpeed = Math.hypot(this.vx, this.vy);
    if (instSpeed > this.maxSpeedReached) this.maxSpeedReached = instSpeed;
    this.distanceTraveled += instSpeed * dt;
    if (this.isSprinting) this.sprintTime += dt;

    const apexBasal = this.speciesIdx === 4 ? 1.48 : 1.0;
    const apexMove = this.speciesIdx === 4 ? 1.28 : 1.0;
    const basalRate = (0.0175 * this.size * this.size + 0.008 * this.sensorRange) * thermal.basalMult * apexBasal;
    const moveRate = (2.7 * this.thrust * this.thrust + 0.42 * this.torque * this.torque) * (this.isSprinting ? 2.5 : 1.0) * apexMove;
    this.currentBurnRate = basalRate + moveRate;
    this.energy -= this.currentBurnRate * dt;

    if (this.energy <= 0) {
      this.energy = 0;
      this.alive = false;
    }
  }

  getFitnessScore() {
    return Math.round(
      this.age * 1.2 +
      this.childrenCount * 45 +
      this.foodEaten * 6 +
      this.kills * 28 +
      this.energyGained * 0.08 -
      this.toxinsHit * 12
    );
  }

  createOffspring(partner, mutationRate, x, y, energyTransfer) {
    const childBrain = partner ? this.brain.crossover(partner.brain) : this.brain.clone();
    childBrain.mutate(mutationRate, 0.28);
    const ownMuts = childBrain.lastMutationCount || 0;

    const mixGene = (a, b, std, min, max) => {
      let val = partner ? (Math.random() < 0.5 ? a : b) : a;
      if (Math.random() < Math.min(0.85, mutationRate * 3.5)) {
        val += gaussianRandom() * std;
      }
      return clamp(val, min, max);
    };

    const diet = mixGene(this.diet, partner ? partner.diet : this.diet, 0.055, 0, 1);
    const size = mixGene(this.size, partner ? partner.size : this.size, 0.75, 5, 16);
    const fovAngle = mixGene(this.fovAngle, partner ? partner.fovAngle : this.fovAngle, 0.14, 0.5, 2.6);
    const sensorRange = mixGene(this.sensorRange, partner ? partner.sensorRange : this.sensorRange, 10, 60, 180);
    const clockFreq = mixGene(this.clockFreq, partner ? partner.clockFreq : this.clockFreq, 0.3, 1.5, 6.0);
    let hue = partner ? (Math.random() < 0.5 ? this.hue : partner.hue) : this.hue;
    hue = (hue + gaussianRandom() * 0.035 + 1) % 1;

    const childTrophic = new Float32Array(TOTAL_TARGETS);
    for (let i = 0; i < TOTAL_TARGETS; i++) {
      let v = partner ? (Math.random() < 0.5 ? this.trophicGenes[i] : partner.trophicGenes[i]) : this.trophicGenes[i];
      if (Math.random() < Math.min(0.6, mutationRate * 2.5)) {
        v += gaussianRandom() * 0.24;
      }
      childTrophic[i] = clamp(v, -1, 1);
    }

    const gen = partner ? Math.max(this.generation, partner.generation) + 1 : this.generation + 1;
    const parentLabel = partner ? `${this.name} + ${partner.name}` : this.name;
    const baseLineageMuts = partner
      ? Math.round((this.lineageMutations + partner.lineageMutations) * 0.5)
      : this.lineageMutations;

    return new Creature(x, y, {
      brain: childBrain,
      diet,
      trophicGenes: childTrophic,
      size,
      fovAngle,
      sensorRange,
      hue,
      clockFreq,
      generation: gen,
      parentName: parentLabel,
      founderName: this.founderName,
      birthType: partner ? 'Krzyżowanie' : 'Klonowanie',
      ownMutations: ownMuts,
      lineageMutations: baseLineageMuts + ownMuts,
      energy: energyTransfer,
      angle: Math.random() * Math.PI * 2
    });
  }

  snapshotGenome() {
    return {
      name: this.name,
      founderName: this.founderName,
      lineageMutations: this.lineageMutations,
      brain: this.brain.clone(),
      diet: this.diet,
      trophicGenes: new Float32Array(this.trophicGenes),
      size: this.size,
      fovAngle: this.fovAngle,
      sensorRange: this.sensorRange,
      hue: this.hue,
      clockFreq: this.clockFreq,
      generation: this.generation,
      age: this.age
    };
  }
}
