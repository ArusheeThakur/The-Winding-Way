// Renderer and a flat camera that looks straight at a painted plate.
// World units are plate pixels: x to the right, y is minus the plate's y (so up is positive).
import * as THREE from '../lib/three.module.js';

export function createStage(canvas) {
  const frame = canvas.parentElement; // sized to the plate's proportions; overlays sit inside it
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#24152f');
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 0.1, 100);
  camera.position.z = 10;

  const size = { w: 1536, h: 1024 };

  function resize() {
    const scale = Math.min(window.innerWidth / size.w, window.innerHeight / size.h);
    const w = Math.round(size.w * scale), h = Math.round(size.h * scale);
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, size,

    // Frame a plate of the given pixel size, shown whole.
    fit(w, h) {
      size.w = w; size.h = h;
      camera.right = w; camera.bottom = -h;
      camera.updateProjectionMatrix();
      resize();
    },

    render() { renderer.render(scene, camera); },

    // Plate pixels to CSS pixels in the window, for small DOM labels.
    toScreen(x, y) {
      const r = canvas.getBoundingClientRect();
      return { x: r.left + x / size.w * r.width, y: r.top + y / size.h * r.height };
    },
  };
}
