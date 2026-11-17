// The story: a painted intro before the room and the reunion after it.
// Everything here is slow and soft: paintings that drift, cross-fades, short captions.
// Each painting is optional. If its file is missing, that step is skipped.
import { STORY } from '../assets/manifest.js';

const CAPTIONS = [
  'Their small daughter wandered off one evening, and got lost.',
  'The tower is strange, but kind. Nobody in it means any harm.',
  'The two of them are tied by one red thread. They will have to find her together.',
];

// Where things are in the paintings, in each painting's own pixels.
const TOWER = {
  couple: { x: 600, y: 1120, z: 1.7 },     // the two at the door
  hands: [[594, 1152], [606, 1150]],        // his wrist, her wrist
  window: { x: 644, y: 352 },               // the top room, where she is
  room: { x: 632, y: 704 },                 // the thread room
};
const BEDROOM = { from: { x: 768, y: 512, z: 1 }, to: { x: 690, y: 540, z: 1.2 } };
const TOP_ROOM = { from: { x: 768, y: 512, z: 1 }, to: { x: 715, y: 545, z: 1.12 } };
const REUNION = { from: { x: 768, y: 512, z: 1 }, to: { x: 790, y: 540, z: 1.14 }, knot: [800, 672] }; // knot: just under the parents' clasped hands

const SKIP = Symbol('skip');
const ease = (t) => t * t * (3 - 2 * t);
const SVG = 'http://www.w3.org/2000/svg';
const svg = (name, attrs = {}) => {
  const el = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};
const loadImage = (url) => new Promise((resolve) => {
  if (!url) return resolve(null);
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = url;
});

// rate: 1 is normal. A higher number plays the story faster (for testing: ?rate=4).
export async function createStory({ rate = 1 } = {}) {
  const root = document.getElementById('story');
  const back = document.getElementById('story-back');
  const layersBox = document.getElementById('story-layers');
  const flood = document.getElementById('story-flood');
  const title = document.getElementById('story-title');
  const caption = document.getElementById('story-caption');
  const skipHint = document.getElementById('story-skip');
  const endCard = document.getElementById('story-end');
  const portraitBox = document.getElementById('story-portrait');
  const again = document.getElementById('story-again');

  const names = Object.keys(STORY);
  const images = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await loadImage(STORY[n])])));

  // One layer per painting: the picture sits in a "camera" box that is moved and scaled.
  const layers = {};
  for (const name of ['bedroom', 'tower', 'top_room', 'reunion']) {
    const img = images[name];
    if (!img) continue;
    const el = document.createElement('div');
    el.className = 'story-layer';
    const cam = document.createElement('div');
    cam.className = 'story-cam';
    cam.style.width = img.naturalWidth + 'px';
    cam.style.height = img.naturalHeight + 'px';
    const art = svg('svg', { viewBox: `0 0 ${img.naturalWidth} ${img.naturalHeight}` });
    cam.append(img, art);
    const flicker = document.createElement('div');
    flicker.className = 'story-flicker';
    el.append(cam, flicker);
    layersBox.append(el);
    layers[name] = { el, cam, art, flicker, w: img.naturalWidth, h: img.naturalHeight, view: { x: img.naturalWidth / 2, y: img.naturalHeight / 2, z: 1 } };
  }
  if (images.portrait) portraitBox.append(images.portrait);
  else endCard.classList.add('no-portrait'); // no picture: the words sit under the reunion painting's family

  // Point a layer's camera at (x, y) in the painting. z = 1 fills the frame.
  function look(layer, view) {
    layer.view = view;
    const fw = root.clientWidth, fh = root.clientHeight;
    const s = Math.max(fw / layer.w, fh / layer.h) * view.z;
    const tx = Math.min(0, Math.max(fw - layer.w * s, fw / 2 - view.x * s));
    const ty = Math.min(0, Math.max(fh - layer.h * s, fh / 2 - view.y * s));
    layer.cam.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }
  window.addEventListener('resize', () => Object.values(layers).forEach((l) => look(l, l.view)));

  // ---- a tiny timeline: every wait can be cut short by skipping ----
  let run = null; // the sequence that is playing: { dead, wake: [] }
  const state = { beat: 'idle' };
  function begin() {
    stop();
    run = { dead: false, wake: [] };
    return run;
  }
  function stop() {
    if (!run) return;
    run.dead = true;
    run.wake.splice(0).forEach((fn) => fn());
  }
  const sleep = (r, seconds) => new Promise((resolve, reject) => {
    if (r.dead) return reject(SKIP);
    const id = setTimeout(resolve, seconds * 1000 / rate);
    r.wake.push(() => { clearTimeout(id); reject(SKIP); });
  });
  // Glide a camera to a new view. Returns a promise for the end of the move.
  function move(r, layer, to, seconds, curve = ease) {
    const from = { ...layer.view }, start = performance.now();
    const tick = (now) => {
      if (r.dead) return;
      const t = Math.min(1, (now - start) / (seconds * 1000 / rate)), k = curve(t);
      look(layer, { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, z: from.z + (to.z - from.z) * k });
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return sleep(r, seconds);
  }
  function fade(el, opacity, seconds) {
    el.style.transition = `opacity ${seconds / rate}s ease-in-out`;
    void el.offsetWidth; // so the change always animates
    el.style.opacity = opacity;
  }
  async function say(r, text, seconds) {
    state.beat = 'caption: ' + text;
    caption.textContent = text;
    fade(caption, 1, 1.2);
    await sleep(r, seconds);
    fade(caption, 0, 1);
    await sleep(r, 1);
  }
  function open(solid) {
    root.classList.remove('hidden');
    document.body.classList.add('in-story');
    for (const el of [title, caption, skipHint, endCard, flood, ...Object.values(layers).map((l) => l.el)]) {
      el.style.transition = 'none';
      el.style.opacity = 0;
    }
    endCard.classList.remove('on');
    back.style.transition = 'none';
    back.style.opacity = solid ? 1 : 0;
    root.style.transition = 'none';
    root.style.opacity = 1;
  }
  // Fade the whole story away, back to the game underneath.
  function close(seconds = 1.4) {
    stop();
    state.beat = 'idle';
    document.body.classList.remove('in-story');
    if (root.classList.contains('hidden')) return Promise.resolve();
    fade(root, 0, seconds);
    return new Promise((resolve) => setTimeout(() => {
      if (!run || run.dead) root.classList.add('hidden');
      resolve();
    }, seconds * 1000 / rate));
  }

  // ---- the red thread between the parents' hands at the tower door ----
  if (layers.tower) {
    const [a, b] = TOWER.hands;
    const shade = svg('path', { class: 'story-thread-shade' }), line = svg('path', { class: 'story-thread' });
    layers.tower.art.append(shade, line);
    const sway = (now) => {
      if (!root.classList.contains('hidden')) {
        const t = now / 1000;
        const mx = (a[0] + b[0]) / 2 + Math.sin(t * 1.3) * 5 + Math.sin(t * 2.9) * 1.5;
        const my = a[1] + 62 + Math.sin(t * 1.9) * 3;
        const d = `M${a[0]} ${a[1]} C${a[0] - 7} ${a[1] + 30} ${mx - 9} ${my} ${mx} ${my} S${b[0] + 8} ${b[1] + 30} ${b[0]} ${b[1]}`;
        line.setAttribute('d', d);
        shade.setAttribute('d', d);
      }
      requestAnimationFrame(sway);
    };
    requestAnimationFrame(sway);
  }

  // ---- the bow that ties itself at the parents' hands in the reunion ----
  const bow = [];
  let sparkle = null;
  if (layers.reunion) {
    const [kx, ky] = REUNION.knot;
    const loop = (side) => `M${kx} ${ky} C${kx + side * 14} ${ky - 42} ${kx + side * 68} ${ky - 38} ${kx + side * 58} ${ky - 3} C${kx + side * 50} ${ky + 15} ${kx + side * 17} ${ky + 8} ${kx} ${ky}`;
    const paths = [
      loop(-1), loop(1),                                              // the two loops
      `M${kx} ${ky} Q${kx - 15} ${ky + 26} ${kx - 28} ${ky + 50}`,    // the two tails
      `M${kx} ${ky} Q${kx + 11} ${ky + 28} ${kx + 30} ${ky + 47}`,
    ];
    const group = svg('g', { class: 'story-bow' });
    for (const d of paths) {
      for (const cls of ['story-bow-shade', 'story-bow-line']) {
        const p = svg('path', { d, class: cls, pathLength: 1 });
        group.append(p);
        bow.push(p);
      }
    }
    group.append(svg('circle', { cx: kx, cy: ky, r: 6.5, class: 'story-bow-knot' }));
    sparkle = svg('g', { class: 'story-sparkle' });
    sparkle.append(svg('circle', { cx: kx, cy: ky, r: 60, class: 'story-sparkle-glow' }));
    [[0, -56, 10], [62, -30, 7], [-66, -22, 8], [44, 44, 6], [-40, 50, 7], [84, 10, 5]].forEach(([dx, dy, size], i) => {
      const s = size, x = kx + dx, y = ky + dy;
      const star = svg('path', { d: `M${x} ${y - s * 2} Q${x} ${y} ${x + s * 2} ${y} Q${x} ${y} ${x} ${y + s * 2} Q${x} ${y} ${x - s * 2} ${y} Q${x} ${y} ${x} ${y - s * 2}Z` });
      star.style.transformOrigin = `${x}px ${y}px`;
      star.style.animationDelay = `${i * 0.22}s`;
      sparkle.append(star);
    });
    layers.reunion.art.append(group, sparkle);
  }
  function setBow(drawn, seconds = 0) {
    bow.forEach((p, i) => {
      const step = Math.floor(i / 2);
      p.style.transition = seconds ? `stroke-dashoffset ${seconds / rate}s ease-in-out ${step * seconds * 0.55 / rate}s` : 'none';
      p.style.strokeDashoffset = drawn ? 0 : 1;
    });
    layers.reunion?.art.classList.toggle('tied', drawn);
  }

  // ---- the intro ----
  async function intro() {
    const r = begin();
    const { bedroom, tower, top_room: top } = layers;
    open(true);
    setBow(false);
    state.beat = 'title';
    const first = bedroom || tower;
    try {
      if (bedroom) { look(bedroom, BEDROOM.from); move(r, bedroom, BEDROOM.to, 26, (t) => t).catch(() => {}); }
      else if (tower) look(tower, TOWER.couple);
      if (first) fade(first.el, 1, 2);
      fade(title, 1, 2);

      // The title waits for a key or a click, which is also what lets the music start.
      await new Promise((resolve, reject) => {
        const go = () => { window.removeEventListener('keydown', go); root.removeEventListener('pointerdown', go); resolve(); };
        window.addEventListener('keydown', go);
        root.addEventListener('pointerdown', go);
        r.wake.push(() => { go(); reject(SKIP); });
      });
      const skip = (e) => { if (e.type === 'pointerdown' || e.code === 'Space') { e.preventDefault(); stop(); } };
      setTimeout(() => { if (!r.dead) { window.addEventListener('keydown', skip); root.addEventListener('pointerdown', skip); } }, 300);
      r.wake.push(() => { window.removeEventListener('keydown', skip); root.removeEventListener('pointerdown', skip); });

      fade(title, 0, 1.4);
      fade(skipHint, 1, 1.4);
      await sleep(r, 1.6);
      if (bedroom) await say(r, CAPTIONS[0], 6);

      if (tower) {
        state.beat = 'tower door';
        look(tower, TOWER.couple);
        fade(tower.el, 1, 2.2);
        if (bedroom) fade(bedroom.el, 0, 2.2);
        move(r, tower, { ...TOWER.couple, y: TOWER.couple.y - 20, z: 1.5 }, 10, (t) => t).catch(() => {});
        await sleep(r, 2.4);
        await say(r, bedroom ? CAPTIONS[1] : CAPTIONS[0] + ' ' + CAPTIONS[1], 6.5);

        state.beat = 'pan up';
        await move(r, tower, { x: TOWER.window.x, y: TOWER.window.y + 60, z: 1.2 }, 7);
        if (top) {
          state.beat = 'into the window';
          const push = move(r, tower, { ...TOWER.window, z: 3.4 }, 2.8, (t) => t * t);
          push.catch(() => {});
          await sleep(r, 1.2);
          look(top, TOP_ROOM.from);
          fade(top.el, 1, 1.8);
          fade(tower.el, 0, 1.8);
          await push;
          state.beat = 'top room';
          move(r, top, TOP_ROOM.to, 14, (t) => t).catch(() => {});
          await sleep(r, 1);
          await say(r, CAPTIONS[2], 7);
          await sleep(r, 1.2);
          state.beat = 'pull back';
          fade(tower.el, 1, 1.8);
          fade(top.el, 0, 1.8);
          await move(r, tower, { x: TOWER.window.x, y: TOWER.window.y + 120, z: 1.25 }, 3.2);
        } else {
          state.beat = 'top window';
          await move(r, tower, { ...TOWER.window, z: 2 }, 3);
          await say(r, CAPTIONS[2], 7);
        }
        state.beat = 'down to the thread room';
        await move(r, tower, { ...TOWER.room, z: 1.5 }, 3.6);
        move(r, tower, { ...TOWER.room, z: 2.6 }, 2.6, (t) => t * t).catch(() => {});
        await sleep(r, 1.2);
      } else if (top) {
        look(top, TOP_ROOM.from);
        fade(top.el, 1, 2);
        if (bedroom) fade(bedroom.el, 0, 2);
        await say(r, CAPTIONS[2], 7);
      }
    } catch (e) {
      if (e !== SKIP) throw e;
    }
    stop();
    state.beat = 'intro done';
  }

  // ---- the ending. Resolves when it has reached the end card. ----
  async function ending() {
    const r = begin();
    const { reunion } = layers;
    open(false);
    setBow(false);
    state.beat = 'flood';
    try {
      fade(flood, 1, 2.6);                  // warm light fills the room
      await sleep(r, 3);
      if (reunion) {
        state.beat = 'reunion';
        back.style.opacity = 1;
        look(reunion, REUNION.from);
        reunion.el.style.opacity = 1;
        move(r, reunion, REUNION.to, 20, (t) => 1 - (1 - t) * (1 - t)).catch(() => {});
        fade(flood, 0, 3.2);
        await sleep(r, 6);
        state.beat = 'bow';
        setBow(true, 1.1);
        await sleep(r, 5.5);
        state.beat = 'bow tied';
        await sleep(r, 2.5);
      } else {
        back.style.opacity = 1;
      }
      state.beat = 'end card';
      endCard.classList.add('on');
      fade(endCard, 1, 2);
      if (!reunion) fade(flood, 0.35, 2);
      await sleep(r, 2);
    } catch (e) {
      if (e !== SKIP) throw e;
    }
  }

  return {
    state, images, intro, ending, close,
    skip: stop,
    get playing() { return !root.classList.contains('hidden'); },
    onAgain(fn) { again.addEventListener('click', fn); },
  };
}
