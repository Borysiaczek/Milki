import { NeuralNetwork, gaussianRandom } from '../math/NeuralNetwork.js';

let nextCreatureId = 1;

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export class Creature {
  constructor(x, y, options = {}) {
    this.id = nextCreatureId++;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = options.angle !== undefined ? options.angle : Math.random() * Math.PI * 2;
    this.angularVelocity = 0;

    this.diet = options.diet !== undefined ? clamp(options.diet, 0, 1) : Math.random();
    this.size = options.size !== undefined ? clamp(options.size, 5, 16) : 6.5 + Math.random() * 6.5;
    this.fovAngle = options.fovAngle !== undefined ? clamp(options.fovAngle, 0.5, 2.6) : 0.9 + Math.random() * 1.1;
    this.sensorRange = options.sensorRange !== undefined ? clamp(options.sensorRange, 60, 180) : 85 + Math.random() * 70;
    this.hue = options.hue !== undefined ? ((options.hue % 1) + 1) % 1 : Math.random();
    this.clockFreq = options.clockFreq !== undefined ? clamp(options.clockFreq, 1.5, 6.0) : 2.2 + Math.random() * 2.5;

    this.brain = options.brain || new NeuralNetwork(14, 10, 3, true);
    this.generation = options.generation || 1;
    this.age = 0;
    this.childrenCount = 0;
    this.reproCooldown = 1.5;
    this.biteFlash = 0;
    this.hitFlash = 0;
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

    this.updateColorCache();
  }

  getDietCategory() {
    if (this.diet < 0.4) return 'herbivore';
    if (this.diet <= 0.7) return 'omnivore';
    return 'carnivore';
  }

  updateColorCache() {
    let h;
    let s;
    let l;
    if (this.diet < 0.4) {
      h = 152 + this.hue * 42;
      s = 86;
      l = 56;
    } else if (this.diet <= 0.7) {
      h = 34 + this.hue * 22;
      s = 92;
      l = 58;
    } else {
      h = (330 + this.hue * 36) % 360;
      s = 90;
      l = 57;
    }
    this.displayHue = h;
    this.fillColor = `hsl(${h.toFixed(1)}, ${s}%, ${l}%)`;
    this.glowColor = `hsla(${h.toFixed(1)}, ${s}%, ${l + 8}%, 0.42)`;
    this.coreColor = `hsl(${h.toFixed(1)}, ${Math.min(100, s + 10)}%, ${Math.min(92, l + 26)}%)`;
    this.tailColor = `hsla(${h.toFixed(1)}, ${s}%, ${l}%, 0.7)`;
  }

  canEatCreature(other) {
    if (other === this || !other.alive) return false;
    if (this.diet > 0.7) {
      return other.diet <= 0.7 || this.size > other.size * 1.1;
    }
    if (this.diet >= 0.4) {
      return this.size > other.size * 1.12;
    }
    return false;
  }

  sense(world, nearbyCreatures, nearbyFood, nearbyPoison) {
    const range = this.sensorRange;
    const x = this.x;
    const y = this.y;
    const fov = this.fovAngle;
    const startAngle = this.angle - fov * 0.5;
    const stepAngle = fov * 0.25;
    const eatsPlants = this.diet <= 0.7;
    const worldW = world.width;
    const worldH = world.height;

    const foodLen = nearbyFood.length;
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

      if (eatsPlants) {
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
              bestType = 1.0;
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
            if (this.canEatCreature(c)) {
              bestType = 1.0;
            } else if (c.canEatCreature(this)) {
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

    const out = this.brain.forward(this.inputs);
    this.thrust = out[0];
    this.torque = out[1];
    this.sprintOrBite = out[2];

    const actionActive = this.sprintOrBite > 0.5;
    this.isSprinting = actionActive && this.energy > this.maxEnergy * 0.12;
    this.isBiting = actionActive && this.diet >= 0.4;

    const sizeFactor = 1.0 - (this.size - 5) / 28;
    const sprintMult = this.isSprinting ? 1.65 : 1.0;
    const forwardAccel = this.thrust * (165 * sizeFactor + 70) * sprintMult;
    const turnAccel = this.torque * (7.2 * sizeFactor + 3.2);

    this.angularVelocity += turnAccel * dt;
    this.angularVelocity *= Math.exp(-5.5 * dt);
    this.angle += this.angularVelocity * dt;

    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    this.vx += cosA * forwardAccel * dt;
    this.vy += sinA * forwardAccel * dt;

    const drag = Math.exp(-2.6 * dt);
    this.vx *= drag;
    this.vy *= drag;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

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

    const basalCost = (0.018 * this.size * this.size + 0.0085 * this.sensorRange) * dt;
    const moveCost = (2.8 * this.thrust * this.thrust + 0.45 * this.torque * this.torque) * (this.isSprinting ? 2.5 : 1.0) * dt;
    this.energy -= basalCost + moveCost;

    if (this.energy <= 0) {
      this.energy = 0;
      this.alive = false;
    }
  }

  createOffspring(partner, mutationRate, x, y, energyTransfer) {
    const childBrain = partner ? this.brain.crossover(partner.brain) : this.brain.clone();
    childBrain.mutate(mutationRate, 0.28);

    const mixGene = (a, b, std, min, max) => {
      let val = partner ? (Math.random() < 0.5 ? a : b) : a;
      if (Math.random() < Math.min(0.85, mutationRate * 3.5)) {
        val += gaussianRandom() * std;
      }
      return clamp(val, min, max);
    };

    const diet = mixGene(this.diet, partner ? partner.diet : this.diet, 0.05, 0, 1);
    const size = mixGene(this.size, partner ? partner.size : this.size, 0.75, 5, 16);
    const fovAngle = mixGene(this.fovAngle, partner ? partner.fovAngle : this.fovAngle, 0.14, 0.5, 2.6);
    const sensorRange = mixGene(this.sensorRange, partner ? partner.sensorRange : this.sensorRange, 10, 60, 180);
    const clockFreq = mixGene(this.clockFreq, partner ? partner.clockFreq : this.clockFreq, 0.3, 1.5, 6.0);
    let hue = partner ? (Math.random() < 0.5 ? this.hue : partner.hue) : this.hue;
    hue = (hue + gaussianRandom() * 0.035 + 1) % 1;

    const gen = partner ? Math.max(this.generation, partner.generation) + 1 : this.generation + 1;

    return new Creature(x, y, {
      brain: childBrain,
      diet,
      size,
      fovAngle,
      sensorRange,
      hue,
      clockFreq,
      generation: gen,
      energy: energyTransfer,
      angle: Math.random() * Math.PI * 2
    });
  }

  snapshotGenome() {
    return {
      brain: this.brain.clone(),
      diet: this.diet,
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
