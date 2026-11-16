// A parent: a flat painted cutout standing on the grid, moving cell to cell.
import * as THREE from '../lib/three.module.js';
import { COS_EL } from './stage.js';

const WIDTH = 0.78;
const HEIGHT = WIDTH * (200 / 120) / COS_EL; // stretched so it reads true on screen

export class Character {
  constructor(name, texture) {
    this.name = name;
    this.grid = null;
    this.cell = { x: 0, z: 0 };
    this.moving = false;
    this.stepTime = 0.2;
    this.t = 0;
    this.clock = Math.random() * 10;
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();

    this.group = new THREE.Group();

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 24),
      new THREE.MeshBasicMaterial({ color: '#2a1438', transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.group.add(shadow);

    const geo = new THREE.PlaneGeometry(WIDTH, HEIGHT);
    geo.translate(0, HEIGHT / 2, 0);
    this.sprite = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: texture, alphaTest: 0.5, side: THREE.DoubleSide,
    }));
    this.sprite.rotation.y = Math.PI / 4; // face the isometric camera
    this.group.add(this.sprite);
  }

  // Where the thread is held.
  get hand() {
    return new THREE.Vector3(this.group.position.x, 0.62 + this.sprite.position.y, this.group.position.z);
  }

  place(grid, x, z) {
    this.grid = grid;
    this.cell = { x, z };
    this.moving = false;
    const w = grid.toWorld(x, z);
    this.group.position.set(w.x, 0, w.z);
  }

  face(dx, dz) {
    const screenX = dx - dz;
    if (screenX !== 0) this.sprite.scale.x = screenX > 0 ? 1 : -1;
  }

  // Start one step if the cell can be entered. canEnter(x, z) decides.
  tryStep(dx, dz, canEnter) {
    if (this.moving) return false;
    this.face(dx, dz);
    const x = this.cell.x + dx, z = this.cell.z + dz;
    if (!canEnter(x, z)) return false;
    this.cell = { x, z };
    const w = this.grid.toWorld(x, z);
    this.from.copy(this.group.position);
    this.to.set(w.x, 0, w.z);
    this.t = 0;
    this.moving = true;
    return true;
  }

  update(dt) {
    this.clock += dt;
    if (this.moving) {
      this.t = Math.min(1, this.t + dt / this.stepTime);
      this.group.position.lerpVectors(this.from, this.to, this.t);
      this.sprite.position.y = Math.sin(Math.PI * this.t) * 0.07;
      this.sprite.scale.y = 1;
      if (this.t >= 1) this.moving = false;
    } else {
      this.sprite.position.y = 0;
      this.sprite.scale.y = 1 + Math.sin(this.clock * 2.4) * 0.012; // quiet breathing
    }
  }
}
