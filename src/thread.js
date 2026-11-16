// Stage 1 stand-in for the thread: one soft curve between the two parents.
// Stage 2 replaces this with the grid thread that wraps around pegs.
import * as THREE from '../lib/three.module.js';

const LOOSE = new THREE.Color('#e58a9a');
const TAUT = new THREE.Color('#ffd98a');

export class Thread {
  constructor() {
    this.material = new THREE.MeshBasicMaterial({ color: LOOSE });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.tug = 0;
  }

  // A short glow when the player pulls against a taut thread.
  pull() { this.tug = 1; }

  // slack: 1 = lots of loose thread, 0 = pulled straight.
  update(dt, a, b, slack) {
    this.tug = Math.max(0, this.tug - dt * 3);
    this.material.color.copy(LOOSE).lerp(TAUT, Math.max(this.tug, slack <= 0 ? 0.5 : 0));

    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y = Math.max(0.06, mid.y - slack * 1.1);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.TubeGeometry(curve, 20, 0.028, 6);
  }
}
