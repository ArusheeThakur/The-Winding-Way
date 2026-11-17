// A parent: one painted standing pose on the plate, moving cell to cell.
// There are no walk frames, so walking is a bob, a sway and a lean, and turning is a flip.
import * as THREE from '../lib/three.module.js';

const MAN_SOURCE_HEIGHT = 1011; // pixel height of parent_man.png; every character is scaled by the same factor
const FEET = 0.02;              // how far up the picture the soles are

let shadowTexture = null;
function softShadow() {
  if (shadowTexture) return shadowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(42, 20, 56, 0.6)');
  grad.addColorStop(0.55, 'rgba(42, 20, 56, 0.32)');
  grad.addColorStop(1, 'rgba(42, 20, 56, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  shadowTexture = new THREE.CanvasTexture(c);
  return shadowTexture;
}

export class Character {
  // height: how tall the man stands on the plate, in plate pixels.
  constructor(name, texture, height) {
    this.name = name;
    this.floor = null;
    this.grid = null;
    this.cell = { x: 0, z: 0 };
    this.fromCell = { x: 0, z: 0 };
    this.moving = false;
    this.stepTime = 0.16;
    this.t = 0;
    this.clock = Math.random() * 10;
    this.stride = 0;   // walk cycle phase
    this.walk = 0;     // 0 standing, 1 walking, eased
    this.facing = 1;   // 1 right, -1 left
    this.from = { x: 0, y: 0, scale: 1 };
    this.to = { x: 0, y: 0, scale: 1 };
    this.feet = { x: 0, y: 0 }; // where the feet are on the plate right now
    this.strain = 0;   // 1 to 0 while pulling against the thread
    this.strainDir = 1;

    texture.anisotropy = 8;
    const k = height / MAN_SOURCE_HEIGHT;
    const w = texture.image.width * k, h = texture.image.height * k;
    this.height = h;
    this.group = new THREE.Group();

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.05, w * 0.42),
      new THREE.MeshBasicMaterial({ map: softShadow(), transparent: true, depthTest: false }),
    );
    this.group.add(this.shadow);

    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2 - h * FEET, 0); // pivot at the feet
    this.sprite = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false }));
    this.group.add(this.sprite);

    // A faint copy that a room can draw over whatever is hiding this character.
    this.ghost = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, opacity: 0.32 }));
    this.ghost.visible = false;
    this.sprite.add(this.ghost);
  }

  // Where the feet are on the grid right now (cell centres are at .5), for the thread.
  get gridPos() {
    const { fromCell: f, cell: c, t } = this;
    return { x: f.x + (c.x - f.x) * t + 0.5, z: f.z + (c.z - f.z) * t + 0.5 };
  }

  // How high above the floor the thread is held, in plate pixels.
  get handHeight() { return (this.height * 0.3 + this.sprite.position.y) * this.group.scale.y; }

  // Top of the head on the plate, for labels.
  get head() {
    return { x: this.feet.x, y: this.feet.y - this.height * this.group.scale.y };
  }

  setPose(p) {
    this.feet.x = p.x; this.feet.y = p.y;
    this.group.position.set(p.x, -p.y, 0);
    this.group.scale.setScalar(p.scale);
    this.sprite.renderOrder = p.y;          // lower on the plate is nearer, so it is drawn later
    this.shadow.renderOrder = p.y - 0.01;
  }

  place(floor, x, z) {
    this.floor = floor;
    this.grid = floor.grid;
    this.cell = { x, z };
    this.fromCell = { x, z };
    this.moving = false;
    this.t = 1;
    this.setPose(floor.cellToPlate(x, z));
  }

  // A short lean and pull toward one side (1 right, -1 left): wanting to go but held by the thread.
  tug(dir) {
    this.strain = 1;
    this.strainDir = dir;
    this.facing = dir;
  }

  // Start one step if the cell can be entered. canEnter(x, z) decides.
  tryStep(dx, dz, canEnter) {
    if (this.moving) return false;
    const x = this.cell.x + dx, z = this.cell.z + dz;
    const to = this.floor.cellToPlate(x, z);
    const side = to.x - this.feet.x;
    if (Math.abs(side) > 1) this.facing = side > 0 ? 1 : -1;
    if (!canEnter(x, z)) return false;
    this.fromCell = this.cell;
    this.cell = { x, z };
    this.from = { x: this.feet.x, y: this.feet.y, scale: this.group.scale.x };
    this.to = to;
    this.t = 0;
    this.moving = true;
    this.onStep?.();
    return true;
  }

  update(dt) {
    this.clock += dt;
    if (this.moving) {
      this.t = Math.min(1, this.t + dt / this.stepTime);
      const { from, to, t } = this;
      this.setPose({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        scale: from.scale + (to.scale - from.scale) * t,
      });
      this.stride += dt * 12.5;
      if (this.t >= 1) this.moving = false;
    }

    // Ease between standing and walking so starts and stops are soft.
    const ease = 1 - Math.exp(-dt * 14);
    this.walk += ((this.moving ? 1 : 0) - this.walk) * ease;
    const s = this.sprite;
    s.position.y = Math.abs(Math.sin(this.stride)) * 3.2 * this.walk;                    // bob
    s.rotation.z = (Math.sin(this.stride) * 0.045 - this.facing * 0.06) * this.walk;    // sway and lean
    s.scale.x += (this.facing - s.scale.x) * (1 - Math.exp(-dt * 22));                   // flip
    s.scale.y = 1 + Math.sin(this.clock * 2.2) * 0.008 * (1 - this.walk);                // quiet breathing
    // straining: lean out twice against the thread, then settle back
    this.strain = Math.max(0, this.strain - dt / 1.1);
    const pull = Math.sin(this.strain * Math.PI) * (0.6 + 0.4 * Math.abs(Math.sin(this.strain * Math.PI * 2)));
    s.rotation.z -= this.strainDir * 0.16 * pull;
    s.position.x = this.strainDir * 7 * pull;
    this.shadow.scale.setScalar(1 - 0.08 * Math.abs(Math.sin(this.stride)) * this.walk);
  }
}
