// Stand-in for the thread: one soft curve between the two parents, in plate pixels.
// Stage 3 replaces this with the grid thread that wraps around pegs.
import * as THREE from '../lib/three.module.js';

const LOOSE = new THREE.Color('#e58a9a');
const TAUT = new THREE.Color('#ffd98a');

export class Thread {
  constructor() {
    this.material = new THREE.MeshBasicMaterial({ color: LOOSE, transparent: true, depthTest: false });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.tug = 0;
  }

  // A short glow when the player pulls against a taut thread.
  pull() { this.tug = 1; }

  // slack: 1 = lots of loose thread, 0 = pulled straight.
  // order: draw order, so the thread sits with the characters among the cutout layers.
  update(dt, a, b, slack, order) {
    this.mesh.renderOrder = order;
    this.tug = Math.max(0, this.tug - dt * 3);
    this.material.color.copy(LOOSE).lerp(TAUT, Math.max(this.tug, slack <= 0 ? 0.5 : 0));

    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= slack * 46;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TubeGeometry(curve, 20, 1.8, 6);
  }
}
