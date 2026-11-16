// Draws the thread: a thick rose-red rope with a slight sag and a soft glow.
// The rope is cut into short pieces, and each piece is drawn in order with the characters
// and the cutout layers by the spot on the floor underneath it. That is what lets it pass
// behind a post and in front of the next one.
import * as THREE from '../lib/three.module.js';

const PIECE = 8;      // plate pixels per piece of rope
const WIDTH = 9.5;
const GLOW_WIDTH = 30;
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

const LOOSE = [new THREE.Color('#d6405c'), new THREE.Color('#b02f4b')]; // two shades, alternating, read as twist
const TAUT = [new THREE.Color('#ff6a55'), new THREE.Color('#de4648')];

export class ThreadView {
  constructor(glowTexture) {
    this.group = new THREE.Group();
    const flat = (extra) => new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, ...extra });
    const ropeMap = strip([[0.35, 0], [0.5, 1], [0.85, 1], [1, 1], [0.8, 1], [0.45, 1], [0.3, 0]]);
    this.rope = [flat({ map: ropeMap }), flat({ map: ropeMap })];
    this.glow = flat({ map: strip([[1, 0], [1, 0.12], [1, 0.45], [1, 1], [1, 0.45], [1, 0.12], [1, 0]]), color: '#ff9c86', blending: THREE.AdditiveBlending });
    this.spark = flat({ map: glowTexture, color: '#ffd9b0', blending: THREE.AdditiveBlending, opacity: 0.8 });
    this.glowTexture = glowTexture;
    this.flat = flat;
    this.quad = new THREE.PlaneGeometry(1, 1);
    this.pieces = [];   // rope pieces and their glow
    this.sparks = [];   // bright spots where the thread touches a peg
    this.halos = new Map(); // one soft halo per peg, lit while the thread is round it
    this.tug = 0;
    this.time = 0;
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
      if (!peg.r) { out.push({ x: peg.x, z: peg.z, h: peg.height, peg }); return; }
      // Go round the peg's surface, from where the thread arrives to where it leaves.
      const prev = pts[i];
      const s = Math.sign(bend.turn) || 1;
      const dx = peg.x - prev.x, dz = peg.z - prev.z;
      const start = Math.atan2(-s * dx, s * dz);
      const steps = Math.max(2, Math.ceil(Math.abs(bend.turn) / 0.5));
      for (let k = 0; k <= steps; k++) {
        const a = start + bend.turn * k / steps;
        out.push({ x: peg.x + Math.cos(a) * peg.r * 1.15, z: peg.z + Math.sin(a) * peg.r * 1.15, h: peg.height, peg: k === (steps >> 1) ? peg : null });
      }
    });
    out.push({ x: line.b.x, z: line.b.z, h: heightB });
    return out;
  }

  update(dt, line, floor, heightA, heightB) {
    this.time += dt;
    this.tug = Math.max(0, this.tug - dt * 2.5);
    const tension = line.tension();
    const taut = Math.max(this.tug, Math.min(1, Math.max(0, (tension - 0.8) / 0.2)));
    const slack = Math.min(1, Math.max(0.06, (1 - tension) * 2.2));
    this.rope.forEach((m, i) => m.color.copy(LOOSE[i]).lerp(TAUT[i], taut));
    this.glow.opacity = 0.2 + 0.28 * taut + 0.03 * Math.sin(this.time * 3);

    // Sample the rope: straight between nodes on the floor, sagging in height.
    const nodes = this.nodes(line, heightA, heightB);
    const samples = [];
    const hooked = new Set();
    let sparks = 0;
    const place = (gx, gz, h) => {
      const p = floor.gridToPlate(gx, gz);
      const ground = p.y - floor.liftAt(gx, gz);
      return { x: p.x, y: ground - h, ground };
    };
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const pa = floor.gridToPlate(a.x, a.z), pb = floor.gridToPlate(b.x, b.z);
      const span = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const n = Math.max(1, Math.ceil(span / PIECE));
      const sag = Math.min(slack * (3 + span * 0.1), Math.max(0, Math.min(a.h, b.h) - 7));
      for (let k = i ? 1 : 0; k <= n; k++) {
        const t = k / n;
        samples.push(place(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, a.h + (b.h - a.h) * t - sag * 4 * t * (1 - t)));
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
      if (i >= count) { piece.rope.visible = piece.glow.visible = false; continue; }
      if (!piece) piece = this.pieces[i] = { glow: this.mesh(this.glow), rope: this.mesh(this.rope[i % 2]) };
      const p = samples[i], q = samples[i + 1];
      const length = Math.hypot(q.x - p.x, q.y - p.y);
      const order = Math.max(p.ground, q.ground) + 0.6;
      for (const [m, width, overlap] of [[piece.rope, WIDTH, 2.5], [piece.glow, GLOW_WIDTH, 0.3]]) {
        m.visible = true;
        m.position.set((p.x + q.x) / 2, -(p.y + q.y) / 2, 0);
        m.rotation.z = Math.atan2(-(q.y - p.y), q.x - p.x);
        m.scale.set(length + overlap, width, 1);
      }
      piece.rope.renderOrder = order;
      piece.glow.renderOrder = order - 0.05;
    }

    // Pegs glow faintly while the thread is round them.
    for (const [id, halo] of this.halos) {
      const target = hooked.has(id) ? halo.strength : 0;
      halo.level += (target - halo.level) * (1 - Math.exp(-dt * 4));
      halo.mesh.material.opacity = halo.level * (1 + 0.15 * Math.sin(this.time * 2.6));
    }
  }

  // Register a peg's halo: a soft light at a plate position, w by h pixels.
  addHalo(id, x, y, w, h, strength) {
    const mesh = this.mesh(this.flat({ map: this.glowTexture, color: '#ffc89a', blending: THREE.AdditiveBlending, opacity: 0 }));
    mesh.position.set(x, -y, 0);
    mesh.scale.set(w, h, 1);
    mesh.renderOrder = TOP;
    this.halos.set(id, { mesh, strength, level: 0 });
  }
}
