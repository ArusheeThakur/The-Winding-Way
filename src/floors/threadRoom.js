// Floor 1, the thread room. This file is the room and its dressing.
// The thread puzzle itself (wrapping, win, reset, door) is stage 2.
import * as THREE from '../../lib/three.module.js';
import { Grid } from '../grid.js';
import { cutout, onFloor, onWall, glowing } from '../props.js';

const W = 12, D = 9, WALL = 2.7;

// Layout, in cells. Fractions are fine for things that do not block.
const PILLAR = [5, 4];
const PEGS = [[3, 1], [6, 1], [8, 2], [2, 5], [8, 5], [4, 7], [10, 6]];
const CRATES = [[6, 6, 0.1], [9, 3, -0.12]];
const SPOOLS = [
  [0, 0, 'spool_blue', 1.2], [11, 0, 'spool_rose', 1.2],
  [0, 8, 'spool_gold', 1.2], [11, 8, 'spool_rose', 0.8], [0, 1, 'spool_gold', 0.7],
];
const LANTERNS = [[3.2, 2.0], [8.6, 0.9], [1.0, 5.6], [7.5, 4.5]];
const RUG = [6, 7.5, 3];                 // centre x, centre z, width
const BANNERS_LEFT = [2.6, 7.2];          // z positions along the left wall
const BANNERS_RIGHT = [4.6, 10.2];        // x positions along the right wall

export function create({ art }) {
  const grid = new Grid(W, D);
  const group = new THREE.Group();
  const mat = (color) => new THREE.MeshLambertMaterial({ color });
  const at = (x, z) => grid.toWorld(x, z);
  const put = (mesh, x, z, y = 0) => {
    const w = at(x, z);
    mesh.position.set(w.x, y, w.z);
    group.add(mesh);
    return mesh;
  };

  // Base slab and dusky stone tiles (kept a little dim so the lantern light reads).
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.5, D + 0.5), mat('#3b2450'));
  base.position.y = -0.37;
  group.add(base);
  const tileGeo = new THREE.BoxGeometry(0.95, 0.12, 0.95);
  const tiles = [mat('#b98468'), mat('#ad785f')];
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) put(new THREE.Mesh(tileGeo, tiles[(x + z) % 2]), x, z, -0.06);
  }

  // Two back walls with a wooden trim.
  const wallMat = mat('#8f5f88');
  const trimMat = mat('#d9a45a');
  const addWall = (sx, sz, px, pz) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, WALL, sz), wallMat);
    wall.position.set(px, WALL / 2 - 0.12, pz);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.06, 0.14, sz + 0.06), trimMat);
    trim.position.set(px, WALL - 0.12, pz);
    const skirting = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.06, 0.22, sz + 0.06), trimMat);
    skirting.position.set(px, 0.11, pz);
    group.add(wall, trim, skirting);
  };
  addWall(0.3, D + 0.3, -W / 2 - 0.15, -0.15);
  addWall(W + 0.3, 0.3, -0.15, -D / 2 - 0.15);

  // Central pillar and crates stay as simple solid shapes.
  {
    const [x, z] = PILLAR;
    grid.block(x, z);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 2.4, 20), mat('#f1dcc0')), x, z, 1.2);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.2, 20), trimMat), x, z, 0.1);
    put(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.2, 20), trimMat), x, z, 2.4);
  }
  for (const [x, z, turn] of CRATES) {
    grid.block(x, z);
    const box = put(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.74, 0.74), mat('#b9a3d6')), x, z, 0.37);
    const band = put(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.78), mat('#9580b8')), x, z, 0.37);
    box.rotation.y = band.rotation.y = turn;
  }

  // Pegs: brass-topped posts. They block their cell; stage 2 wraps the thread around them.
  for (const [x, z] of PEGS) {
    grid.block(x, z);
    put(cutout(art.peg, 0.62), x, z);
  }

  for (const [x, z, name, width] of SPOOLS) {
    grid.block(x, z);
    put(cutout(art[name], width), x, z);
  }

  put(onFloor(art.rug, RUG[2]), RUG[0], RUG[1], 0.012);

  // Banners hang just in front of the two back walls.
  for (const z of BANNERS_LEFT) {
    const b = put(onWall(art.banner, 0.8, Math.PI / 2), 0, z, WALL - 0.35);
    b.position.x = -W / 2 + 0.03;
  }
  for (const x of BANNERS_RIGHT) {
    const b = put(onWall(art.banner, 0.8, 0), x, 0, WALL - 0.35);
    b.position.z = -D / 2 + 0.03;
  }

  // Hanging lanterns, each with a halo and a warm pool of light on the floor.
  const stringMat = new THREE.MeshBasicMaterial({ color: '#c8923f' });
  const glows = [];
  for (const [x, z] of LANTERNS) {
    const lantern = put(cutout(art.lantern, 0.46), x, z, 2.15);
    const top = 2.15 + lantern.userData.height;
    put(new THREE.Mesh(new THREE.BoxGeometry(0.025, 9, 0.025), stringMat), x, z, top + 4.5);

    const halo = put(cutout(art.light_pool, 1.5, glowing(art.light_pool, 0.55)), x, z, 1.65);
    const pool = put(onFloor(art.light_pool, 4.2, glowing(art.light_pool, 0.5)), x, z, 0.03);
    glows.push([halo, 0.55], [pool, 0.5]);
  }

  let time = 0;
  return {
    grid,
    group,
    wallHeight: WALL,
    pegs: PEGS.map(([x, z]) => ({ x, z })),
    pillar: { x: PILLAR[0], z: PILLAR[1] },
    spawns: { player: { x: 2, z: 3 }, partner: { x: 1, z: 3 } },

    // The lantern light breathes very slightly.
    update(dt) {
      time += dt;
      glows.forEach(([mesh, opacity], i) => {
        mesh.material.opacity = opacity * (1 + 0.07 * Math.sin(time * 2.2 + i * 1.7));
      });
    },
  };
}
