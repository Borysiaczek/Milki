export function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export class NeuralNetwork {
  constructor(inputCount = 14, hiddenCount = 10, outputCount = 3, randomize = true) {
    this.inputCount = inputCount;
    this.hiddenCount = hiddenCount;
    this.outputCount = outputCount;

    this.weightsIH = new Float32Array(inputCount * hiddenCount);
    this.biasH = new Float32Array(hiddenCount);
    this.weightsHO = new Float32Array(hiddenCount * outputCount);
    this.biasO = new Float32Array(outputCount);

    this.lastInputs = new Float32Array(inputCount);
    this.lastHidden = new Float32Array(hiddenCount);
    this.lastOutputs = new Float32Array(outputCount);

    if (randomize) {
      this.randomizeWeights();
    }
  }

  randomizeWeights() {
    const scaleIH = Math.sqrt(2.0 / (this.inputCount + this.hiddenCount));
    const scaleHO = Math.sqrt(2.0 / (this.hiddenCount + this.outputCount));

    for (let i = 0; i < this.weightsIH.length; i++) {
      this.weightsIH[i] = gaussianRandom() * scaleIH;
    }
    for (let i = 0; i < this.biasH.length; i++) {
      this.biasH[i] = gaussianRandom() * 0.25;
    }
    for (let i = 0; i < this.weightsHO.length; i++) {
      this.weightsHO[i] = gaussianRandom() * scaleHO;
    }
    for (let i = 0; i < this.biasO.length; i++) {
      this.biasO[i] = gaussianRandom() * 0.25;
    }
  }

  forward(inputs) {
    const inCount = this.inputCount;
    const hidCount = this.hiddenCount;
    const outCount = this.outputCount;
    const wIH = this.weightsIH;
    const bH = this.biasH;
    const wHO = this.weightsHO;
    const bO = this.biasO;
    const lastIn = this.lastInputs;
    const lastHid = this.lastHidden;
    const lastOut = this.lastOutputs;

    for (let i = 0; i < inCount; i++) {
      lastIn[i] = inputs[i];
    }

    for (let h = 0; h < hidCount; h++) {
      let sum = bH[h];
      const offset = h * inCount;
      for (let i = 0; i < inCount; i++) {
        sum += lastIn[i] * wIH[offset + i];
      }
      lastHid[h] = Math.tanh(sum);
    }

    for (let o = 0; o < outCount; o++) {
      let sum = bO[o];
      const offset = o * hidCount;
      for (let h = 0; h < hidCount; h++) {
        sum += lastHid[h] * wHO[offset + h];
      }
      lastOut[o] = Math.tanh(sum);
    }

    return lastOut;
  }

  clone() {
    const copy = new NeuralNetwork(this.inputCount, this.hiddenCount, this.outputCount, false);
    copy.weightsIH.set(this.weightsIH);
    copy.biasH.set(this.biasH);
    copy.weightsHO.set(this.weightsHO);
    copy.biasO.set(this.biasO);
    return copy;
  }

  mutate(mutationRate = 0.08, mutationStrength = 0.3) {
    let changed = 0;
    const mutateArray = (arr) => {
      for (let i = 0; i < arr.length; i++) {
        if (Math.random() < mutationRate) {
          changed++;
          if (Math.random() < 0.08) {
            arr[i] = -arr[i];
          } else {
            arr[i] += gaussianRandom() * mutationStrength;
          }
          if (arr[i] > 4.0) arr[i] = 4.0;
          else if (arr[i] < -4.0) arr[i] = -4.0;
        }
      }
    };

    mutateArray(this.weightsIH);
    mutateArray(this.biasH);
    mutateArray(this.weightsHO);
    mutateArray(this.biasO);
    this.lastMutationCount = changed;
    return this;
  }

  crossover(partnerGenome) {
    const child = new NeuralNetwork(this.inputCount, this.hiddenCount, this.outputCount, false);

    const mix = (a, b, out) => {
      const useSinglePoint = Math.random() < 0.35;
      if (useSinglePoint) {
        const split = Math.floor(Math.random() * out.length);
        for (let i = 0; i < out.length; i++) {
          out[i] = i < split ? a[i] : b[i];
        }
      } else {
        for (let i = 0; i < out.length; i++) {
          out[i] = Math.random() < 0.5 ? a[i] : b[i];
        }
      }
    };

    mix(this.weightsIH, partnerGenome.weightsIH, child.weightsIH);
    mix(this.biasH, partnerGenome.biasH, child.biasH);
    mix(this.weightsHO, partnerGenome.weightsHO, child.weightsHO);
    mix(this.biasO, partnerGenome.biasO, child.biasO);
    return child;
  }
}
