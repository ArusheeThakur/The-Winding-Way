// Flat painted props. Each takes a texture from the art manifest and a width in
// cells; the height comes from the picture's own proportions, so art can be swapped freely.
import * as THREE from '../lib/three.module.js';
import { COS_EL } from './stage.js';

const ratio = (tex) => tex.image.height / tex.image.width;

const painted = (tex) => new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });

// Soft light that adds onto whatever is behind it.
export const glowing = (tex, opacity) => new THREE.MeshBasicMaterial({
  map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
});

// Upright cutout that stands on its base and faces the camera.
export function cutout(tex, width, material = painted(tex)) {
  const height = width * ratio(tex) / COS_EL;
  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, height / 2, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.rotation.y = Math.PI / 4;
  mesh.userData.height = height;
  return mesh;
}

// Lies flat on the floor. Width runs along x.
export function onFloor(tex, width, material = painted(tex)) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * ratio(tex)), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// Hangs flat on a wall from its top edge. turn = 0 faces +z, Math.PI / 2 faces +x.
export function onWall(tex, width, turn = 0) {
  const height = width * ratio(tex);
  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, -height / 2, 0);
  const mesh = new THREE.Mesh(geo, painted(tex));
  mesh.rotation.y = turn;
  return mesh;
}
