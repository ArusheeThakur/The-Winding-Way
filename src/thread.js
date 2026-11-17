// Draws the thread: a thick rose-red rope with a slight sag and a soft glow.
// The rope is cut into short pieces, and each piece is drawn in order with the characters
// and the cutout layers by the spot on the floor underneath it. That is what lets it pass
// behind a post and in front of the next one.
import * as THREE from '../lib/three.module.js';

const PIECE = 8;      // plate pixels per piece of rope
const WIDTH = 9.5;
const GLOW_WIDTH = 30;
const SHADOW_WIDTH = 13;
const DROP = 48;      // plate pixels over which the rope comes down from a hand or a peg to the floor
const ON_FLOOR = 2.5; // how high the middle of the rope sits when it lies on the floor
const TOP = 9000;

// A strip texture that runs across the rope: values are [grey 0-1, alpha 0-1] from edge to edge.
function strip(stops) {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 32);
  stops.forEach(([grey, alpha], i) => {
    const v = Math.round(grey * 255);
    grad.addColorStop(i / (stops.length - 1), `rgba(${v},${v},${v},${alpha})`);
  });
  g.fillStyle = grad;
  g.fillRect(0, 0, 1, 32);
  return new THREE.CanvasTexture(c);
}

const LOOSE = [new THREE.Color('#d6405c'), new THREE.Color('#bf3450')]; // two shades, alternating, read as twist
const TAUT = [new THREE.Color('#ff6a55'), new THREE.Color('#de4648')];

export class ThreadView {
  // cutouts: the room's cutout layers, so the rope can go behind crates and spools properly.
  constructor(glowTexture, cutouts = []) {
    this.group = new THREE.Group();
    this.occluders = cutouts.filter((c) => c.front).map((c) => ({ sortY: c.sortY, front: c.front }));
    this.wraps = new Map(); // a short band of rope across the front of each peg, shown while it is hooked
    const flat = (extra) => new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, ...extra });
    const ropeMap = strip([[0.4, 0], [0.62, 1], [1, 1], [0.8, 1], [0.62, 1], [0.44, 1], [0.3, 1], [0.22, 0]]); // lit on top, dark underneath
    this.rope = [flat({ map: ropeMap }), flat({ map: ropeMap })];
    this.glow = flat({ map: strip([[1, 0], [1, 0.12], [1, 0.45], [1, 1], [1, 0.45], [1, 0.12], [1, 0]]), color: '#ff9c86', blending: THREE.AdditiveBlending });
    this.shadow = flat({ map: strip([[1, 0], [1, 0.45], [1, 1], [1, 0.45], [1, 0]]), color: '#1d0d2b', opacity: 0.42 });
    this.spark = flat({ map: glowTexture, color: '#ffd9b0', blending: THREE.AdditiveBlending, opacity: 0.8 });
    this.glowTexture = glowTexture;
    this.flat = flat;
    this.quad = new THREE.PlaneGeometry(1, 1);
    this.pieces = [];   // rope pieces and their glow
    this.sparks = [];   // bright spots where the thread touches a peg
    this.halos = new Map(); // one soft halo per peg, lit while the thread is round it
    this.tug = 0;
    this.time = 0;
    this.cue = null;    // id of a peg to point out with a slow, soft pulse (or null)
  }

  // A short flash when someone pulls against a taut thread.
  pull() { this.tug = 1; }

  mesh(material) {
    const m = new THREE.Mesh(this.quad, material);
    this.group.add(m);
    return m;
  }

  // The points the rope passes through, on the grid, each with a height above the floor.
  nodes(line, heightA, heightB) {
    const pts = line.points();
    const out = [{ x: line.a.x, z: line.a.z, h: heightA }];
    line.bends.forEach((bend, i) => {
      const peg = bend.peg;
      if (!peg.r) { out.push({ x: peg.x, z: peg.z, h: peg.height, peg, id: peg.id }); return; }
      // Go round the peg's surface, from where the thread arrives to where it leaves.
      const prev = pts[i];
      const s = Math.sign(bend.turn) || 1;
      const dx = peg.x - prev.x, dz = peg.z - prev.z;
      const start = Math.atan2(-s * dx, s * dz);
      const steps = Math.max(2, Math.ceil(Math.abs(bend.turn) / 0.5));
      for (let k = 0; k <= steps; k++) {
        const a = start + bend.turn * k / steps;
        out.push({ x: peg.x + Math.cos(a) * peg.r * 1.15, z: peg.z + Math.sin(a) * peg.r * 1.15, h: peg.height, peg: k === (steps >> 1) ? peg : null, id: peg.id });
      }
    });
    out.push({ x: line.b.x, z: line.b.z, h: heightB });
    return out;
  }

  // Draw order for a bit of rope whose floor point is (x, ground). Normally that is just the
  // ground line, but a crate or spool has a slanted front edge, so check which side of it we are.
  order(x, ground) {
    let order = ground + 0.6, cap = Infinity;
    for (const { sortY, front } of this.occluders) {
      if (x < front[0][0] || x > front[front.length - 1][0]) continue;
      let i = 1;
      while (x > front[i][0]) i++;
      const [x0, y0] = front[i - 1], [x1, y1] = front[i];
      const edge = y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1);
      if (ground < edge) cap = Math.min(cap, sortY - 0.5);
      else order = Math.max(order, sortY + 0.5);
    }
    return Math.min(order, cap);
  }

  update(dt, line, floor, heightA, heightB) {
    this.time += dt;
    this.tug = Math.max(0, this.tug - dt * 2.5);
    const tension = line.tension();
    const taut = Math.max(this.tug, Math.min(1, Math.max(0, (tension - 0.8) / 0.2)));
    this.rope.forEach((m, i) => m.color.copy(LOOSE[i]).lerp(TAUT[i], taut));
    this.glow.opacity = 0.2 + 0.28 * taut + 0.03 * Math.sin(this.time * 3);

    // Sample the rope. Loose, it drops from each hand or peg and lies on the floor with a lazy
    // curve. As it tightens it lifts off the floor and straightens.
    const nodes = this.nodes(line, heightA, heightB);
    const samples = [];
    const hooked = new Set();
    let sparks = 0;
    const fall = (u) => (u < 1 ? (1 - u) * (1 - u) : 0);
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const pa = floor.gridToPlate(a.x, a.z), pb = floor.gridToPlate(b.x, b.z);
      const span = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const n = Math.max(1, Math.ceil(span / PIECE));
      const nx = span ? -(pb.y - pa.y) / span : 0, ny = span ? (pb.x - pa.x) / span : 0;
      const wave = a.id && a.id === b.id ? 0 : (1 - 0.75 * taut) * Math.min(10, span * 0.08);
      const sag = Math.min(12, span * 0.08);
      for (let k = i ? 1 : 0; k <= n; k++) {
        const t = k / n, d = t * span;
        const gx = a.x + (b.x - a.x) * t, gz = a.z + (b.z - a.z) * t;
        const lying = Math.max(ON_FLOOR, a.h * fall(d / DROP), b.h * fall((span - d) / DROP));
        const straight = a.h + (b.h - a.h) * t - sag * 4 * t * (1 - t);
        // between two points on the same peg (round a post, or round the pillar) the rope stays up
        const h = a.id && a.id === b.id ? a.h : Math.max(ON_FLOOR, lying + (straight - lying) * taut * 0.3);
        // the lazy curve stays put on the floor near the end that is not being carried
        const off = wave * Math.sin(Math.PI * t) * Math.sin((i ? d : span - d) / 42 + i * 2.1);
        const p = floor.gridToPlate(gx, gz);
        const x = p.x + nx * off, ground = p.y - floor.liftAt(gx, gz) + ny * off;
        // close to a hand the rope is held in front of the body, so it sorts with its holder
        const last = i === nodes.length - 2;
        const held = i === 0 && d < DROP ? 0 : last && span - d < DROP ? 1 : -1;
        samples.push({ x, y: ground - h, ground, h, held });
      }
      if (b.peg) {
        hooked.add(b.peg.id);
        const s = this.sparks[sparks] ?? (this.sparks[sparks] = this.mesh(this.spark));
        const at = samples[samples.length - 1];
        s.visible = true;
        s.position.set(at.x, -at.y, 0);
        s.scale.setScalar(30 + 5 * Math.sin(this.time * 4 + sparks));
        s.renderOrder = at.ground + 0.8;
        sparks++;
      }
    }
    for (let i = sparks; i < this.sparks.length; i++) this.sparks[i].visible = false;

    // One rope piece (and its glow) between each pair of samples.
    const count = samples.length - 1;
    for (let i = 0; i < Math.max(count, this.pieces.length); i++) {
      let piece = this.pieces[i];
      if (i >= count) { piece.rope.visible = piece.glow.visible = piece.shadow.visible = false; continue; }
      if (!piece) piece = this.pieces[i] = { shadow: this.mesh(this.shadow), glow: this.mesh(this.glow), rope: this.mesh(this.rope[i % 2]) };
      const p = samples[i], q = samples[i + 1];
      const length = Math.hypot(q.x - p.x, q.y - p.y);
      let order = this.order((p.x + q.x) / 2, (p.ground + q.ground) / 2);
      const holder = p.held >= 0 && q.held === p.held ? samples[p.held ? count : 0] : null;
      if (holder) order = Math.max(order, this.order(holder.x, holder.ground));
      for (const [m, width, overlap] of [[piece.rope, WIDTH, 2.5], [piece.glow, GLOW_WIDTH, 0.3]]) {
        m.visible = true;
        m.position.set((p.x + q.x) / 2, -(p.y + q.y) / 2, 0);
        m.rotation.z = Math.atan2(-(q.y - p.y), q.x - p.x);
        m.scale.set(length + overlap, width, 1);
      }
      piece.rope.renderOrder = order;
      piece.glow.renderOrder = order - 0.05;
      // The contact shadow lies on the floor under the rope, softer and wider the higher the rope is.
      const s = piece.shadow, high = (p.h + q.h) / 2;
      s.visible = true;
      s.position.set((p.x + q.x) / 2 + 1.5, -((p.ground + q.ground) / 2 + 2.5), 0);
      s.rotation.z = Math.atan2(-(q.ground - p.ground), q.x - p.x);
      s.scale.set(Math.hypot(q.x - p.x, q.ground - p.ground) + 0.3, SHADOW_WIDTH + Math.min(12, high * 0.2), 1);
      s.renderOrder = order - 0.8;
    }

    for (const [id, band] of this.wraps) for (const m of band) m.visible = hooked.has(id);

    // Pegs glow faintly while the thread is round them.
    for (const [id, halo] of this.halos) {
      const target = hooked.has(id) ? halo.strength : 0;
      halo.level += (target - halo.level) * (1 - Math.exp(-dt * 4));
      // the peg being pointed out breathes: brighter and a little larger, slowly
      halo.cue += ((id === this.cue ? 1 : 0) - halo.cue) * (1 - Math.exp(-dt * 2));
      const breath = halo.cue * (0.5 + 0.5 * Math.sin(this.time * 2.4));
      halo.mesh.material.opacity = Math.min(1, halo.level * (1 + 0.15 * Math.sin(this.time * 2.6)) + breath * 0.75);
      halo.mesh.scale.set(halo.w * (1 + breath * 0.9), halo.h * (1 + breath * 0.9), 1);
    }
  }

  // Register a peg's wrap: a short band of rope across its front, drawn over the peg's cutout.
  // (x, y) is the middle of the band on the plate, rx and ry its half width and how far it dips.
  addWrap(id, x, y, rx, ry, order) {
    const band = [];
    const at = (a) => [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
    const N = Math.max(5, Math.round(rx / 3.5));
    for (let i = 0; i < N; i++) {
      const [x0, y0] = at(Math.PI * i / N), [x1, y1] = at(Math.PI * (i + 1) / N);
      for (const [material, dy, width, lift] of [[this.shadow, 4, WIDTH + 3, 0], [this.rope[i % 2], 0, WIDTH, 0.1]]) {
        const m = this.mesh(material);
        m.position.set((x0 + x1) / 2, -((y0 + y1) / 2 + dy), 0);
        m.rotation.z = Math.atan2(-(y1 - y0), x1 - x0);
        m.scale.set(Math.hypot(x1 - x0, y1 - y0) + 2.5, width, 1);
        m.renderOrder = order + lift;
        m.visible = false;
        band.push(m);
      }
    }
    this.wraps.set(id, band);
  }

  // Register a peg's halo: a soft light at a plate position, w by h pixels. Give it the peg's
  // draw order so someone standing in front of the peg is not lit across the face.
  addHalo(id, x, y, w, h, strength, order = TOP) {
    const mesh = this.mesh(this.flat({ map: this.glowTexture, color: '#ffc89a', blending: THREE.AdditiveBlending, opacity: 0 }));
    mesh.position.set(x, -y, 0);
    mesh.scale.set(w, h, 1);
    mesh.renderOrder = order;
    this.halos.set(id, { mesh, strength, level: 0, cue: 0, w, h });
  }
}
