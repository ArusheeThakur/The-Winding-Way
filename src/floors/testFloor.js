// Stage 1 test floor: a small warm room with a pillar, crates and a spool to walk around.
import * as THREE from '../../lib/three.module.js';
import { Grid } from '../grid.js';

const W = 10, D = 8, WALL = 2.2;

export function create() {
  const grid = new Grid(W, D);
  const group = new THREE.Group();
  const mat = (color) => new THREE.MeshLambertMaterial({ color });
  const at = (x, z) => grid.toWorld(x, z);

  // Plum base slab and the tiles on top of it.
  const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.5, D + 0.5), mat('#3b2450'));
  base.position.y = -0.37;
  group.add(base);

  const tileGeo = new THREE.BoxGeometry(0.95, 0.12, 0.95);
  const tiles = [mat('#e0ab7c'), mat('#d49b6e')];
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) {
      const tile = new THREE.Mesh(tileGeo, tiles[(x + z) % 2]);
      const w = at(x, z);
      tile.position.set(w.x, -0.06, w.z);
      group.add(tile);
    }
  }

  // Two back walls with a gold trim.
  const wallMat = mat('#8a5585');
  const trimMat = mat('#e8b563');
  const addWall = (sx, sz, px, pz) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, WALL, sz), wallMat);
    wall.position.set(px, WALL / 2 - 0.12, pz);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.04, 0.12, sz + 0.04), trimMat);
    trim.position.set(px, WALL - 0.12, pz);
    group.add(wall, trim);
  };
  addWall(0.3, D + 0.3, -W / 2 - 0.15, -0.15);
  addWall(W + 0.3, 0.3, -0.15, -D / 2 - 0.15);

  // Things in the way.
  const pillar = (x, z) => {
    grid.block(x, z);
    const w = at(x, z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 1.9, 20), mat('#f1dcc0'));
    shaft.position.set(w.x, 0.95, w.z);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.18, 20), trimMat);
    foot.position.set(w.x, 0.09, w.z);
    const cap = foot.clone();
    cap.position.y = 1.9;
    group.add(shaft, foot, cap);
  };
  const crate = (x, z, turn = 0) => {
    grid.block(x, z);
    const w = at(x, z);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), mat('#b9744a'));
    box.position.set(w.x, 0.36, w.z);
    box.rotation.y = turn;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.1, 0.76), mat('#8f5233'));
    band.position.copy(box.position);
    band.rotation.y = turn;
    group.add(box, band);
  };
  const spool = (x, z) => {
    grid.block(x, z);
    const w = at(x, z);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.5, 20), mat('#d9798b'));
    core.position.set(w.x, 0.33, w.z);
    const end = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 20), mat('#f1dcc0'));
    end.position.set(w.x, 0.04, w.z);
    const top = end.clone();
    top.position.y = 0.62;
    group.add(core, end, top);
  };

  pillar(5, 3);
  crate(2, 5, 0.12);
  crate(3, 5, -0.08);
  crate(7, 1, 0.2);
  spool(7, 5);

  return {
    grid,
    group,
    wallHeight: WALL,
    spawns: { player: { x: 2, z: 3 }, partner: { x: 1, z: 3 } },
  };
}
