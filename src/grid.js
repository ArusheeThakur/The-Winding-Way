// A small walkable grid. Cells are {x, z}. World space is centred on the grid.
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export class Grid {
  constructor(w, d) {
    this.w = w;
    this.d = d;
    this.blocked = new Set();
  }

  key(x, z) { return x + ',' + z; }
  inBounds(x, z) { return x >= 0 && z >= 0 && x < this.w && z < this.d; }
  block(x, z) { this.blocked.add(this.key(x, z)); }
  isWalkable(x, z) { return this.inBounds(x, z) && !this.blocked.has(this.key(x, z)); }

  // Centre of a cell in world space.
  toWorld(x, z) {
    return { x: x - (this.w - 1) / 2, z: z - (this.d - 1) / 2 };
  }

  // Shortest path (breadth first) from one cell to another.
  // Returns the list of cells after `from`, ending at `to`, or null.
  path(from, to) {
    const start = this.key(from.x, from.z);
    const goal = this.key(to.x, to.z);
    if (start === goal) return [];
    const cameFrom = new Map([[start, null]]);
    const queue = [from];
    while (queue.length) {
      const c = queue.shift();
      for (const [dx, dz] of DIRS) {
        const n = { x: c.x + dx, z: c.z + dz };
        const k = this.key(n.x, n.z);
        if (cameFrom.has(k)) continue;
        if (k !== goal && !this.isWalkable(n.x, n.z)) continue;
        cameFrom.set(k, c);
        if (k === goal) {
          const out = [n];
          let p = c;
          while (p && this.key(p.x, p.z) !== start) { out.unshift(p); p = cameFrom.get(this.key(p.x, p.z)); }
          return out;
        }
        queue.push(n);
      }
    }
    return null;
  }
}

export function cellDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}
