// Background music: quiet, warm, and never silent.
// If there are audio files in assets/audio/ they are played shuffled, with a crossfade.
// If there are none, a soft music-box version of Bach's Prelude in C major (BWV 846, public
// domain) is played from its notes.
import { MUSIC, MUSIC_FOLDER } from '../assets/manifest.js';

const VOLUME = 0.25;
const FADE_IN = 3, CROSSFADE = 2;

// The prelude, one chord per bar. Each bar plays its five notes as 1 2 3 4 5 3 4 5, twice.
const PRELUDE = `C4 E4 G4 C5 E5|C4 D4 A4 D5 F5|B3 D4 G4 D5 F5|C4 E4 G4 C5 E5|C4 E4 A4 E5 A5|C4 D4 F#4 A4 D5|
B3 D4 G4 D5 G5|B3 C4 E4 G4 C5|A3 C4 E4 G4 C5|D3 A3 D4 F#4 C5|G3 B3 D4 G4 B4|G3 A#3 E4 G4 C#5|F3 A3 D4 A4 D5|
F3 G#3 D4 F4 B4|E3 G3 C4 G4 C5|E3 F3 A3 C4 F4|D3 F3 A3 C4 F4|G2 D3 G3 B3 F4|C3 E3 G3 C4 E4|C3 G3 A#3 C4 E4|
F2 F3 A3 C4 E4|F#2 C3 A3 C4 D#4|G#2 F3 B3 C4 D4|G2 F3 G3 B3 D4|G2 E3 G3 C4 E4|G2 D3 G3 C4 F4|G2 D3 G3 B3 F4|
G2 D#3 A3 C4 F#4|G2 E3 G3 C4 G4|G2 D3 G3 C4 F4|G2 D3 G3 B3 F4|C2 C3 G3 A#3 E4`.split('|').map((bar) => bar.trim().split(' '));
const ENDING = ['C2', 'C3', 'E4', 'G4', 'C5'];
const SEMITONE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const hertz = (name) => 440 * 2 ** ((SEMITONE[name.slice(0, -1)] + (Number(name.slice(-1)) - 4) * 12 - 9) / 12);
const BEAT = 0.25; // seconds per note: slow and unhurried

const shuffled = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
const exists = (url) => fetch(url, { method: 'HEAD' }).then((r) => r.ok, () => false);

// Which files are there? A local server lists the folder; elsewhere, try the names in the manifest.
async function findFiles() {
  try {
    const page = await fetch(MUSIC_FOLDER);
    const type = page.headers.get('content-type') || '';
    if (page.ok && type.includes('html')) {
      const names = [...(await page.text()).matchAll(/href="([^"?]+\.(?:mp3|ogg|m4a|wav))"/gi)].map((m) => m[1]);
      return names.map((n) => MUSIC_FOLDER + n.split('/').pop()); // the listing is the whole truth
    }
  } catch { /* no folder listing here */ }
  const found = await Promise.all(MUSIC.map(async (url) => ((await exists(url)) ? url : null)));
  return found.filter(Boolean);
}

// ctx: the AudioContext. out: where to send the music (the master volume, so M mutes it too).
export async function startMusic(ctx, out) {
  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0, ctx.currentTime);
  bus.gain.linearRampToValueAtTime(VOLUME, ctx.currentTime + FADE_IN);
  bus.connect(out);

  const files = await findFiles();
  if (files.length) playFiles(ctx, bus, files);
  else playPrelude(ctx, bus);
  return { files };
}

// Files: one after another in shuffled order, each fading into the next.
function playFiles(ctx, bus, files) {
  let queue = [];
  const next = () => {
    if (!queue.length) queue = shuffled(files);
    const el = new Audio(queue.shift());
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + CROSSFADE);
    ctx.createMediaElementSource(el).connect(gain).connect(bus);
    let handed = false;
    const hand = () => {            // start the next track and fade this one out
      if (handed) return;
      handed = true;
      gain.gain.setTargetAtTime(0, ctx.currentTime, CROSSFADE / 3);
      setTimeout(() => { el.pause(); gain.disconnect(); }, CROSSFADE * 2000);
      next();
    };
    el.addEventListener('timeupdate', () => { if (el.duration && el.currentTime > el.duration - CROSSFADE) hand(); });
    el.addEventListener('ended', hand);
    el.addEventListener('error', () => { files = files.filter((f) => !el.src.endsWith(f)); if (files.length) hand(); else playPrelude(ctx, bus); });
    el.play().catch(() => {});
  };
  next();
}

// The music box: each note is a soft bell (a sine with a faint octave) that rings on and fades.
function playPrelude(ctx, bus) {
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 2400;
  warm.connect(bus);
  const note = (name, at, level = 1, ring = 1.8) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.5 * level, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + ring);
    g.connect(warm);
    for (const [mult, amount] of [[1, 1], [2, 0.22], [3, 0.05]]) {
      const o = ctx.createOscillator(), part = ctx.createGain();
      o.frequency.value = hertz(name) * mult;
      part.gain.value = amount;
      o.connect(part).connect(g);
      o.start(at);
      o.stop(at + ring + 0.05);
    }
  };
  // Write the piece out as [time, note, level], then keep scheduling a little ahead of the clock.
  const score = [];
  PRELUDE.forEach((bar, b) => {
    for (let i = 0; i < 16; i++) {
      const k = [0, 1, 2, 3, 4, 2, 3, 4][i % 8];
      score.push([(b * 16 + i) * BEAT, bar[k], k < 2 ? 0.8 : 0.6]);
    }
  });
  const end = PRELUDE.length * 16 * BEAT;
  ENDING.forEach((name, i) => score.push([end + i * 0.12, name, 0.7, 5]));
  const length = end + 8; // a breath before it starts again

  let origin = ctx.currentTime + 0.3, index = 0;
  setInterval(() => {
    const horizon = ctx.currentTime + 1.5;
    while (origin + score[index][0] < horizon) {
      const [time, name, level, ring] = score[index];
      if (origin + time > ctx.currentTime - 0.1) note(name, Math.max(origin + time, ctx.currentTime), level, ring);
      if (++index === score.length) { index = 0; origin += length; }
    }
  }, 250);
}
