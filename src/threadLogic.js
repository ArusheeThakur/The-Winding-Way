// The thread, as pure geometry on the floor grid (no drawing here).
// It is a line from end a to end b that bends around pegs, the way string bends around nails.
//   - When an end moves and the line sweeps across a peg, the line hooks on it (a new bend).
//   - Each bend remembers which way it turns and by how much. When the turn comes back to
//     zero the thread lifts off that peg again.
//   - Only the bends next to a moving end can change, exactly like real string.
// Pegs are points { id, x, z, r }: r is the peg's thickness, so winding round it uses up thread.
const TAU = Math.PI * 2;
const cross = (ax, az, bx, bz) => ax * bz - az * bx;
const dir = (from, to) => Math.atan2(to.z - from.z, to.x - from.x);
const turnBetween = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const SUBSTEP = 0.12; // cells: ends are moved in small pieces so no peg is skipped

function inTriangle(p, a, b, c) {
  const d1 = cross(b.x - a.x, b.z - a.z, p.x - a.x, p.z - a.z);
  const d2 = cross(c.x - b.x, c.z - b.z, p.x - b.x, p.z - b.z);
  const d3 = cross(a.x - c.x, a.z - c.z, p.x - c.x, p.z - c.z);
  const eps = 1e-9;
  return (d1 > eps && d2 > eps && d3 > eps) || (d1 < -eps && d2 < -eps && d3 < -eps);
}

// Where the line through p0 and p1 meets the segment q0-q1 (clamped to the segment).
function meet(p0, p1, q0, q1) {
  const den = cross(q1.x - q0.x, q1.z - q0.z, p1.x - p0.x, p1.z - p0.z);
  if (Math.abs(den) < 1e-12) return { x: q0.x, z: q0.z };
  const t = Math.min(1, Math.max(0, cross(p0.x - q0.x, p0.z - q0.z, p1.x - p0.x, p1.z - p0.z) / den));
  return { x: q0.x + (q1.x - q0.x) * t, z: q0.z + (q1.z - q0.z) * t };
}

export class ThreadLine {
  constructor(pegs, maxLength) {
    this.pegs = pegs;
    this.maxLength = maxLength;
    this.a = { x: 0, z: 0 };
    this.b = { x: 0, z: 0 };
    this.bends = []; // from the a end to the b end: { peg, sign, turn }
  }

  // A straight thread between two points.
  reset(a, b) {
    this.a = { x: a.x, z: a.z };
    this.b = { x: b.x, z: b.z };
    this.bends = [];
  }

  clone() {
    const t = new ThreadLine(this.pegs, this.maxLength);
    t.a = { ...this.a };
    t.b = { ...this.b };
    t.bends = this.bends.map((bend) => ({ ...bend }));
    return t;
  }

  // Every point the thread passes through, from a to b.
  points() { return [this.a, ...this.bends.map((bend) => bend.peg), this.b]; }

  length() {
    const pts = this.points();
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    for (const bend of this.bends) total += Math.abs(bend.turn) * bend.peg.r;
    return total;
  }

  // 0 = lots of slack, 1 = pulled tight.
  tension() { return Math.min(1, this.length() / this.maxLength); }

  // What the thread would look like if one end ('a' or 'b') moved to a point.
  after(which, to) {
    const t = this.clone();
    t.moveEnd(which, to);
    return t;
  }

  // Move one end ('a' or 'b') to a point, hooking and unhooking pegs on the way.
  moveEnd(which, to) {
    const end = this[which];
    const from = { x: end.x, z: end.z };
    const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / SUBSTEP));
    for (let i = 1; i <= n; i++) {
      this.step(which, { x: from.x + (to.x - from.x) * i / n, z: from.z + (to.z - from.z) * i / n });
    }
  }

  step(which, to) {
    const isA = which === 'a';
    const end = this[which];
    let old = { x: end.x, z: end.z };
    const side = isA ? -1 : 1; // which way a turn at the neighbouring bend counts

    for (let guard = 0; guard < 12; guard++) {
      const index = isA ? 0 : this.bends.length - 1;
      const bend = this.bends[index];
      const anchor = bend ? bend.peg : (isA ? this.b : this.a);
      const swing = turnBetween(dir(anchor, old), dir(anchor, to)); // how far the end swings round the anchor

      // Does the thread lift off the neighbouring peg?
      if (bend && (bend.turn + swing * side) * bend.sign <= 0) {
        this.bends.splice(index, 1);
        const before = this.bends[isA ? 0 : this.bends.length - 1];
        const beyond = before ? before.peg : (isA ? this.b : this.a);
        old = meet(beyond, anchor, old, to);
        continue;
      }

      // Does it catch on a new peg? Take the first one the line meets.
      let hit = null, least = Infinity;
      for (const peg of this.pegs) {
        if (peg === anchor || !inTriangle(peg, anchor, old, to)) continue;
        const reach = Math.abs(turnBetween(dir(anchor, old), dir(anchor, peg)));
        if (reach < least) { least = reach; hit = peg; }
      }
      if (hit) {
        if (bend) bend.turn += turnBetween(dir(anchor, old), dir(anchor, hit)) * side;
        const sign = Math.sign(swing) * side || 1;
        const fresh = { peg: hit, sign, turn: sign * 1e-6 };
        if (isA) this.bends.unshift(fresh); else this.bends.push(fresh);
        old = meet(anchor, hit, old, to);
        continue;
      }

      if (bend) bend.turn += swing * side;
      break;
    }
    end.x = to.x;
    end.z = to.z;
  }

  // True if moving straight from p to q, with the thread anchored at `anchor`, would catch a peg.
  wouldCatch(anchor, p, q) {
    return this.pegs.some((peg) => peg !== anchor && inTriangle(peg, anchor, p, q));
  }
}
