export class SpatialGrid {
  constructor(width, height, cellSize = 80, initialCapacity = 2048) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.numCells = this.cols * this.rows;

    this.cellHead = new Int32Array(this.numCells);
    this.cellHead.fill(-1);

    this.capacity = initialCapacity;
    this.count = 0;
    this.next = new Int32Array(initialCapacity);
    this.posX = new Float32Array(initialCapacity);
    this.posY = new Float32Array(initialCapacity);
    this.radii = new Float32Array(initialCapacity);
    this.items = new Array(initialCapacity);
    this.defaultQueryBuffer = [];
  }

  clear() {
    this.cellHead.fill(-1);
    const items = this.items;
    const count = this.count;
    for (let i = 0; i < count; i++) {
      items[i] = null;
    }
    this.count = 0;
  }

  grow() {
    const newCap = this.capacity * 2;
    const newNext = new Int32Array(newCap);
    newNext.set(this.next);
    const newX = new Float32Array(newCap);
    newX.set(this.posX);
    const newY = new Float32Array(newCap);
    newY.set(this.posY);
    const newR = new Float32Array(newCap);
    newR.set(this.radii);
    this.items.length = newCap;

    this.next = newNext;
    this.posX = newX;
    this.posY = newY;
    this.radii = newR;
    this.capacity = newCap;
  }

  getCellIndex(x, y) {
    let cx = (x * this.invCellSize) | 0;
    let cy = (y * this.invCellSize) | 0;
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cx + cy * this.cols;
  }

  insert(item, x, y, radius = 0) {
    if (this.count >= this.capacity) {
      this.grow();
    }
    const idx = this.count++;
    const cellIdx = this.getCellIndex(x, y);

    this.items[idx] = item;
    this.posX[idx] = x;
    this.posY[idx] = y;
    this.radii[idx] = radius;
    this.next[idx] = this.cellHead[cellIdx];
    this.cellHead[cellIdx] = idx;
  }

  queryRadius(x, y, radius, out = this.defaultQueryBuffer) {
    out.length = 0;
    const inv = this.invCellSize;
    let minCx = ((x - radius) * inv) | 0;
    let maxCx = ((x + radius) * inv) | 0;
    let minCy = ((y - radius) * inv) | 0;
    let maxCy = ((y + radius) * inv) | 0;

    if (minCx < 0) minCx = 0;
    if (minCy < 0) minCy = 0;
    if (maxCx >= this.cols) maxCx = this.cols - 1;
    if (maxCy >= this.rows) maxCy = this.rows - 1;

    const cols = this.cols;
    const cellHead = this.cellHead;
    const next = this.next;
    const posX = this.posX;
    const posY = this.posY;
    const radii = this.radii;
    const items = this.items;

    for (let cy = minCy; cy <= maxCy; cy++) {
      const rowOffset = cy * cols;
      for (let cx = minCx; cx <= maxCx; cx++) {
        let entry = cellHead[rowOffset + cx];
        while (entry !== -1) {
          const dx = posX[entry] - x;
          const dy = posY[entry] - y;
          const maxD = radius + radii[entry];
          if (dx * dx + dy * dy <= maxD * maxD) {
            out.push(items[entry]);
          }
          entry = next[entry];
        }
      }
    }
    return out;
  }
}
