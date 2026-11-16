// Renderer, isometric orthographic camera and the warm base lighting.
import * as THREE from '../lib/three.module.js';

const ISO = new THREE.Vector3(1, 1, 1).normalize();
const SIN_EL = 1 / Math.sqrt(3);          // camera elevation above the floor
export const COS_EL = Math.sqrt(2 / 3);   // how much upright things are squashed on screen

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#24152f');

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const target = new THREE.Vector3(0, 0.6, 0);
  const goal = target.clone();

  scene.add(new THREE.HemisphereLight('#ffe6c4', '#5a3a80', 1.7));
  const sun = new THREE.DirectionalLight('#ffd39a', 1.7);
  sun.position.set(-3, 8, 5);
  scene.add(sun);

  let fitW = 12, fitH = 8;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const viewH = Math.max(fitH, fitW / aspect);
    camera.left = -viewH * aspect / 2;
    camera.right = viewH * aspect / 2;
    camera.top = viewH / 2;
    camera.bottom = -viewH / 2;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function place() {
    camera.position.copy(target).addScaledVector(ISO, 60);
    camera.lookAt(target);
  }

  return {
    renderer, scene, camera,

    // Frame a floor that is w by d cells with walls of the given height.
    fit(w, d, wallHeight = 2.2) {
      const diag = (w + d) / Math.SQRT2;
      fitW = diag + 2.5;
      fitH = diag * SIN_EL + wallHeight * COS_EL + 2.5;
      resize();
      place();
    },

    // Light parallax: the camera leans a little toward a point of interest.
    lookToward(x, z) { goal.set(x * 0.12, 0.6, z * 0.12); },

    update(dt) {
      target.lerp(goal, 1 - Math.exp(-dt * 3));
      place();
    },

    render() { renderer.render(scene, camera); },

    // World position to CSS pixels, for small DOM labels.
    toScreen(v) {
      const p = v.clone().project(camera);
      return { x: (p.x + 1) / 2 * window.innerWidth, y: (1 - p.y) / 2 * window.innerHeight };
    },
  };
}
