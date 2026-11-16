// Loads every texture named in the manifest.
import * as THREE from '../lib/three.module.js';
import { ART } from '../assets/manifest.js';

export async function loadArt() {
  const loader = new THREE.TextureLoader();
  const art = {};
  await Promise.all(Object.entries(ART).map(async ([name, url]) => {
    const tex = await loader.loadAsync(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    art[name] = tex;
  }));
  return art;
}
