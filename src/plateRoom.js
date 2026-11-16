// A room made from a painted plate. Everything is drawn in plate pixels:
//   the plate, then characters and cutout layers sorted by their ground line, then light.
// The layout file gives the grid calibration, the cutout outlines and the lights.
// The mask image says where feet may go: white floor, grey raised floor, black not walkable.
import * as THREE from '../lib/three.module.js';
import { Grid } from './grid.js';
import { makeMapping } from './homography.js';

const TOP = 9000; // draw order for light that sits over everything

export function createPlateRoom({ plate, mask, glow, layout }) {
  const [W, H] = layout.size;
  const group = new THREE.Group();
  const flat = (map, extra) => new THREE.MeshBasicMaterial({ map, transparent: true, depthTest: false, ...extra });

  // The plate itself.
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), flat(plate, { transparent: false }));
  back.position.set(W / 2, -H / 2, 0);
  back.renderOrder = -1;
  group.add(back);

  // Cutout layers: pieces of the plate drawn again in front of anyone standing behind them.
  const plateMat = flat(plate);
  for (const cut of layout.cutouts) {
    const shape = new THREE.Shape(cut.points.map(([x, y]) => new THREE.Vector2(x, -y)));
    const geo = new THREE.ShapeGeometry(shape);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W, 1 + pos.getY(i) / H);
    const mesh = new THREE.Mesh(geo, plateMat);
    mesh.renderOrder = cut.sortY;
    group.add(mesh);
  }

  // Live light: lantern glows, and soft pools that pulse gently over the floor.
  const lights = [];
  const addLight = ({ x, y, r }, opacity, squash) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2 * squash),
      flat(glow, { blending: THREE.AdditiveBlending, opacity }));
    mesh.position.set(x, -y, 0);
    mesh.renderOrder = TOP;
    group.add(mesh);
    lights.push({ mesh, opacity, phase: lights.length * 1.9 });
  };
  layout.glows.forEach((g) => addLight(g, 0.5, 1));
  layout.pools.forEach((p) => addLight(p, 0.16, 0.55));

  // Mask pixels.
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(mask.image, 0, 0, W, H);
  const pixels = ctx.getImageData(0, 0, W, H).data;
  const maskAt = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    return x < 0 || y < 0 || x >= W || y >= H ? 0 : pixels[(y * W + x) * 4];
  };

  const grid = new Grid(1, 1);
  let mapping = null;
  let raised = new Set();
  const SAMPLES = [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]];

  // Work out the grid from the calibration: a cell is walkable when all of it is on the mask.
  function calibrate(calibration) {
    layout.calibration = calibration;
    const { cols, rows, corners, rect } = calibration;
    mapping = makeMapping(corners, rect);
    grid.w = cols; grid.d = rows;
    grid.blocked = new Set();
    raised = new Set();
    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        const values = SAMPLES.map(([dx, dz]) => {
          const p = mapping.project(x + 0.5 + dx, z + 0.5 + dz);
          return maskAt(p.x, p.y);
        });
        if (Math.min(...values) < 100) grid.block(x, z);
        else if (values[0] < 200) raised.add(grid.key(x, z));
      }
    }
  }
  calibrate(layout.calibration);

  let time = 0;
  return {
    grid, group, layout,
    size: { w: W, h: H },
    spawns: {
      player: { x: layout.spawns.player[0], z: layout.spawns.player[1] },
      partner: { x: layout.spawns.partner[0], z: layout.spawns.partner[1] },
    },
    calibrate,
    isRaised: (x, z) => raised.has(grid.key(x, z)),

    // Centre of a cell on the plate: pixel position (y already lifted on raised floor) and draw scale.
    cellToPlate(x, z) {
      const p = mapping.project(x + 0.5, z + 0.5);
      const lift = raised.has(grid.key(x, z)) ? layout.raisedLift : 0;
      return { x: p.x, y: p.y - lift, scale: mapping.scaleAt(x + 0.5, z + 0.5) };
    },
    // Any grid point (fractions allowed) on the plate, and back.
    gridToPlate: (gx, gz) => mapping.project(gx, gz),
    plateToGrid: (x, y) => mapping.unproject(x, y),
    // Extra height of the floor under a grid point (the raised landing).
    liftAt: (gx, gz) => (raised.has(grid.key(Math.floor(gx), Math.floor(gz))) ? layout.raisedLift : 0),

    // The nearest walkable cell to the one asked for.
    nearestWalkable(x, z) {
      let best = null, bestD = Infinity;
      for (let cx = 0; cx < grid.w; cx++) {
        for (let cz = 0; cz < grid.d; cz++) {
          const d = Math.abs(cx - x) + Math.abs(cz - z);
          if (d < bestD && grid.isWalkable(cx, cz)) { best = { x: cx, z: cz }; bestD = d; }
        }
      }
      return best;
    },

    update(dt) {
      time += dt;
      for (const l of lights) {
        l.mesh.material.opacity = l.opacity * (1 + 0.12 * Math.sin(time * 1.7 + l.phase) + 0.05 * Math.sin(time * 5.3 + l.phase));
      }
    },
  };
}
