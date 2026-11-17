// The thread room: the painted plate plus the thread puzzle.
// The thread starts tangled round the active pegs and the pillar. It has a fixed length,
// so the parents can only reach the door together once it has been freed.
import * as THREE from '../../lib/three.module.js';
import { LAYOUTS } from '../../assets/manifest.js';
import { createPlateRoom } from '../plateRoom.js';
import { ThreadLine } from '../threadLogic.js';
import { ThreadView } from '../thread.js';

const CUE_AFTER = 10;   // seconds without progress before the next peg is pointed out (first two moves only)
const CUE_MOVES = 2;
const HINT_EVERY = 20;  // seconds without progress between text hints
const RETRY_AFTER = 30; // seconds without progress before the "Press R" bubble
const RESERVE = 2;      // cells of thread the partner leaves spare, so it never pins the player
const MAX_WIND = 1.6;   // the partner will not wind the thread further than this round a peg (radians)
const centre = (x, z) => ({ x: x + 0.5, z: z + 0.5 });

// Hints are short: they show in a small bubble above the player. The number is the priority:
// when two would show at once, the higher one wins.
const HINT = {
  start: ['Follow the thread back, round each glowing post.', 1],
  retry: ['Stuck? Press R to try again.', 1],
  tight: ['The thread is pulled tight.', 2],
  stuck: ['Tangled? Press R to start again.', 2],
  caught: ['Press H so your partner holds still, then walk round that post.', 3],
  notFree: ['The door stays shut while the thread is caught.', 4],
  door: ['Press Space to call your partner.', 4],
  open: ['The door is open.', 5],
};

export async function create({ art }) {
  const layout = await (await fetch(LAYOUTS.thread_room)).json();
  const room = createPlateRoom({ plate: art.thread_room, mask: art.thread_room_mask, glow: art.light_pool, layout });
  const spec = layout.thread;

  const view = new ThreadView(art.light_pool, layout.cutouts);
  room.group.add(view.group);
  for (const p of spec.pegs) {
    view.addHalo(p.id, p.x, p.top, 70, 70, 0.55, p.y + 0.9);
    view.addWrap(p.id, p.x, p.y - p.height, 19, 6, p.y + 0.7);
  }
  view.addHalo('pillar', spec.pillar.x, spec.pillar.y - spec.pillar.height, 210, 90, 0.3, spec.pillar.y + 0.9);
  view.addWrap('pillar', spec.pillar.x, spec.pillar.y - spec.pillar.height, 51, 20, spec.pillar.y + 0.7);

  // The door: warm light that fills the doorway when it opens.
  const flat = (extra) => new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, opacity: 0, ...extra });
  const doorLight = new THREE.Mesh(
    new THREE.ShapeGeometry(new THREE.Shape(layout.door.points.map(([x, y]) => new THREE.Vector2(x, -y)))),
    flat({ color: '#fff1c4' }),
  );
  doorLight.renderOrder = layout.door.sortY;
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flat({ map: art.light_pool, blending: THREE.AdditiveBlending }));
  doorGlow.position.set(layout.door.glow.x, -layout.door.glow.y, 0);
  doorGlow.scale.setScalar(layout.door.glow.r * 2);
  doorGlow.renderOrder = 9000;
  room.group.add(doorLight, doorGlow);

  // When the thread comes free the door calls the parents over: light on the runner, a ring of
  // light that grows out from the door again and again, and a few sparkles drifting up.
  const TOP = 9000;
  const lit = (map, color) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flat({ map, color, blending: THREE.AdditiveBlending }));
    m.renderOrder = TOP;
    room.group.add(m);
    return m;
  };
  const runner = layout.door.runner;
  const runnerGlow = lit(art.light_pool, '#ffd9a0');
  runnerGlow.position.set(runner.x, -runner.y, 0);
  runnerGlow.scale.set(runner.w, runner.h, 1);
  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = ringCanvas.height = 128;
  const rc = ringCanvas.getContext('2d'), grad = rc.createRadialGradient(64, 64, 30, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.7, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  rc.fillStyle = grad; rc.fillRect(0, 0, 128, 128);
  const ringMap = new THREE.CanvasTexture(ringCanvas);
  const rings = [0, 0.5].map((phase) => ({ mesh: lit(ringMap, '#ffe1a6'), phase }));
  const sparkles = Array.from({ length: 12 }, (_, i) => ({
    mesh: lit(art.light_pool, '#fff3cf'),
    x: layout.door.glow.x - 110 + ((i * 53) % 190), // spread across the door and the runner
    y: layout.door.glow.y + 130 - ((i * 37) % 90),
    speed: 14 + (i % 4) * 5, phase: i * 0.37, size: 9 + (i % 3) * 4,
  }));
  let beckon = 0;        // 0 nothing, 1 the door is calling
  let wasFree = false;
  let time = 0;

  let line = null;
  let game = null;
  let open = 0;          // 0 closed, 1 fully open
  let solved = false;
  let refusals = 0;      // how often the player has pulled against a tight thread
  let waiting = 0;       // seconds the player has stood at the door alone
  let tangled = 1;       // how many pegs the thread was caught on at the start
  let tugBack = 0;       // seconds before the partner may tug back again
  let bendCount = 0;     // to hear the thread catch and come free
  let fewest = 0;        // the fewest pegs the thread has been caught on so far (progress)
  let idle = 0;          // seconds since the last progress
  let hintAt = HINT_EVERY; // show a text hint when idle reaches this
  let retryAt = RETRY_AFTER; // show the "Press R" bubble when idle reaches this
  let strain = 0;        // seconds until the partner's next tug while it is held back
  let quiet = 0;         // seconds before the partner may speak again
  let caughtWait = 0;    // seconds before the "press H" hint may show again

  // Pegs on the grid: the active posts, and the pillar as a ring of points.
  function makePegs() {
    const pegs = spec.pegs.map((p) => ({ id: p.id, ...room.plateToGrid(p.x, p.y), r: p.r, height: p.height }));
    const c = room.plateToGrid(spec.pillar.x, spec.pillar.y);
    for (let i = 0; i < spec.pillar.sides; i++) {
      const a = (i + 0.5) / spec.pillar.sides * Math.PI * 2;
      pegs.push({ id: 'pillar', x: c.x + Math.cos(a) * spec.pillar.radius, z: c.z + Math.sin(a) * spec.pillar.radius, r: 0, height: spec.pillar.height });
    }
    return pegs;
  }

  const say = (name, seconds) => game.ui.hint(HINT[name][0], seconds, HINT[name][1]);

  // Points along the thread on the plate, so bubbles can keep off it.
  room.threadPoints = () => {
    if (!line) return [];
    const out = [], pts = line.points();
    for (let i = 1; i < pts.length; i++) {
      const n = Math.max(1, Math.ceil(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z)));
      for (let k = 0; k < n; k++) out.push(room.gridToPlate(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / n, pts[i - 1].z + (pts[i].z - pts[i - 1].z) * k / n));
    }
    return out;
  };

  // Start, or start again: the thread is laid out in its starting tangle.
  room.begin = (g) => {
    game = g;
    const a = g.player.gridPos, b = g.partner.char.gridPos;
    line = new ThreadLine(makePegs(), spec.maxLength);
    line.reset(a, a);
    for (const [x, y] of spec.tangle) line.moveEnd('b', room.plateToGrid(x, y));
    line.moveEnd('b', b);
    room.line = line;
    open = 0; solved = false; refusals = 0; waiting = 0; wasFree = false;
    fewest = bendCount = tangled = Math.max(1, caughtOn()); tugBack = 0; idle = 0; hintAt = HINT_EVERY; retryAt = RETRY_AFTER; strain = 0; quiet = 0; caughtWait = 0;
    g.ui.hint('', 0);
    say('start', 16);
  };

  // The player may take a step if the thread is long enough for it.
  room.playerCanEnter = (x, z) => {
    if (line.after('a', centre(x, z)).length() <= line.maxLength) return true;
    view.pull();
    refusals++;
    // Early on the two are a little out of step: when the player pulls the thread tight,
    // the partner gives a small tug back.
    if (together() < 0.5 && tugBack <= 0) {
      const partner = game.partner.char;
      partner.tug(Math.sign(partner.feet.x - game.player.feet.x) || 1);
      tugBack = 2.5;
    }
    say(refusals > 5 ? 'stuck' : 'tight', refusals > 5 ? 6 : 3.5);
    return false;
  };

  // The partner never plans a route that would catch the thread on another peg...
  room.partnerStepOk = (from, to) => {
    const last = line.bends[line.bends.length - 1];
    return !line.wouldCatch(last ? last.peg : line.a, centre(from.x, from.z), centre(to.x, to.z));
  };
  // ...never winds the thread further round the peg it is already on, and never uses up the last of it.
  room.partnerCanEnter = (x, z) => {
    const next = line.after('b', centre(x, z));
    if (next.bends.length > line.bends.length) return false;
    const wound = (l) => Math.abs(l.bends[l.bends.length - 1]?.turn ?? 0);
    if (next.bends.length === line.bends.length && wound(next) > Math.max(wound(line), MAX_WIND)) return false;
    const length = next.length();
    return length <= line.maxLength - RESERVE || length <= line.length();
  };
  // 0 at the start, 1 once the thread is free: how well the two are moving together.
  const together = () => 1 - Math.min(1, caughtOn() / tangled);
  // The partner sets off after the player with a lag that shrinks to nothing as they untangle,
  // so by the end they walk as one.
  room.partnerDelay = () => 0.45 - 0.41 * together();

  // When the player is on the small door landing, the partner heads for the nearest free spot on it.
  room.partnerTarget = () => {
    const you = game.player.cell, me = game.partner.char.cell;
    if (!room.isRaised(you.x, you.z)) return undefined;
    let best, least = Infinity;
    for (let x = 0; x < room.grid.w; x++) for (let z = 0; z < room.grid.d; z++) {
      if (!room.isRaised(x, z) || !room.grid.isWalkable(x, z) || (x === you.x && z === you.z)) continue;
      const d = Math.abs(x - me.x) + Math.abs(z - me.z);
      if (d < least) { least = d; best = { x, z }; }
    }
    return best;
  };
  // Trading places is fine as long as the thread allows both steps.
  room.swapOk = (playerTo, partnerTo) => {
    const next = line.after('a', centre(playerTo.x, playerTo.z));
    next.moveEnd('b', centre(partnerTo.x, partnerTo.z));
    return next.length() <= line.maxLength;
  };

  // True when the only thing still holding the thread is the peg next to the partner...
  const onePegLeft = () => line.bends.length > 0 && line.bends.every((bend) => bend.peg.id === line.bends[0].peg.id);
  // ...and the player is close enough to do something about it.
  const lastPegOnly = () => onePegLeft() && Math.abs(line.a.x - line.b.x) + Math.abs(line.a.z - line.b.z) < 7;

  // How many pegs the thread is caught on (the pillar counts once each time round, not per corner).
  const caughtOn = () => line.bends.filter((bend, i) => i === 0 || bend.peg.id !== line.bends[i - 1].peg.id).length;

  const baseUpdate = room.update;
  room.update = (dt, g) => {
    baseUpdate(dt);
    if (!line || !g.player) return;
    const player = g.player, partner = g.partner.char;
    line.moveEnd('a', player.gridPos);
    line.moveEnd('b', partner.gridPos);
    view.update(dt, line, room, player.handHeight, partner.handHeight);

    // The rope creaks as it tightens.
    const tension = line.tension();
    const creak = Math.max(0, (tension - 0.82) / 0.18);
    g.audio.creak(creak * (player.moving || partner.moving ? 1 : 0.2));

    // A faint ghost shows a parent who is hidden behind the pillar.
    const hide = layout.hideBehind;
    for (const c of [player, partner]) {
      c.ghost.visible = c.feet.y < hide.sortY && Math.abs(c.feet.x - hide.x) < hide.halfWidth;
      c.ghost.renderOrder = hide.sortY + 0.5;
    }

    // The partner wants to walk but the thread holds it back: a small tug and a soft word,
    // so it never looks as if it has simply stopped working.
    quiet -= dt;
    if (!solved && g.partner.blockedFor > 0.5) {
      strain -= dt;
      if (strain <= 0) {
        strain = 5;
        partner.tug(Math.sign(player.feet.x - partner.feet.x) || 1);
        view.pull();
        if (quiet <= 0) { g.ui.say(tension > 0.9 ? 'the thread is tight' : 'the thread is caught'); quiet = 12; }
      }
    } else strain = 0;

    // A soft pluck when the thread catches on a peg, a lighter one when it comes free.
    const now = caughtOn();
    if (now !== bendCount) { g.audio.pluck(now > bendCount); bendCount = now; }

    // Progress is the thread coming off a peg. After a while without any, show a hint again.
    if (now < fewest) { fewest = now; idle = 0; hintAt = HINT_EVERY; retryAt = RETRY_AFTER; }
    idle += dt;
    const free = !line.bends.length;
    if (!solved && idle > retryAt) {
      // Stuck for a while: a small bubble about starting again.
      retryAt += HINT_EVERY;
      hintAt = idle + HINT_EVERY / 2;
      if (!free) say('retry', 7);
    } else if (!solved && idle > hintAt) {
      hintAt += HINT_EVERY;
      say(free ? 'open' : onePegLeft() ? 'caught' : 'start', 7);
    }
    // For the first two moves, point out the next peg to walk round: the one nearest the player's hand.
    const teaching = !solved && tangled - fewest < CUE_MOVES && idle > CUE_AFTER && line.bends.length;
    view.cue = teaching ? line.bends[0].peg.id : null;

    // The moment the thread comes free, the door lights up as the next goal.
    if (free && !wasFree && !solved) { say('open', 7); g.audio.chime(); }
    wasFree = free;

    // The door opens when both parents stand on the landing.
    const atDoor = (c) => !c.moving && room.isRaised(c.cell.x, c.cell.z);
    if (!solved && atDoor(player) && atDoor(partner) && !line.bends.length) {
      solved = true;
      g.frozen = true;
      g.audio.chime();
      g.ui.hint('', 0);
      setTimeout(() => { if (solved) g.onSolved?.(); }, 1800);
    } else if (!solved && g.partner.blockedFor > 2.5 && caughtWait <= 0 && lastPegOnly() && !player.moving) {
      // The partner wants to come but the thread will not let them.
      say('caught', 8);
      caughtWait = 10; hintAt = idle + HINT_EVERY;
    } else if (!solved && atDoor(player)) {
      waiting += dt;
      if (waiting > 2.5) { say(line.bends.length ? 'notFree' : 'door', 6); waiting = -6; hintAt = idle + HINT_EVERY; }
    } else if (!solved) {
      waiting = Math.min(waiting, 0);
    }
    caughtWait -= dt;
    tugBack -= dt;
    open += ((solved ? 1 : 0) - open) * (1 - Math.exp(-dt * 2.2));
    // The door calls: a gentle pulse while the thread is free. The growing rings stop once
    // someone has reached the landing. When the puzzle is solved the light floods out as before.
    time += dt;
    const reached = room.isRaised(player.cell.x, player.cell.z) || room.isRaised(partner.cell.x, partner.cell.z);
    beckon += ((free && !solved ? 1 : 0) - beckon) * (1 - Math.exp(-dt * 1.6));
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.1);
    const glow = layout.door.glow;
    doorLight.material.opacity = Math.max(open * 0.95, beckon * (0.5 + 0.25 * pulse));
    doorGlow.material.opacity = Math.max(open * 0.9, beckon * (0.5 + 0.3 * pulse));
    doorGlow.scale.setScalar(glow.r * 2 * (1 + open * 2.2 + beckon * 0.25 * pulse)); // the light spills out into the room
    runnerGlow.material.opacity = Math.max(open * 0.6, beckon * (0.4 + 0.25 * pulse));
    for (const ring of rings) {
      const t = (time / 2.8 + ring.phase) % 1; // each ring grows from the door, out over the landing, and fades
      ring.mesh.position.set(glow.x - 30 * t, -(glow.y + 60 * t), 0);
      ring.mesh.scale.set(glow.r * (0.6 + 2.6 * t), glow.r * (0.6 + 2.6 * t) * 0.8, 1);
      ring.mesh.material.opacity = beckon * (reached ? 0 : 1) * 0.5 * Math.sin(Math.PI * t) * (1 - t * 0.5);
    }
    for (const s of sparkles) {
      const t = (time * s.speed / 90 + s.phase) % 1; // drift up, twinkle, start again
      s.mesh.position.set(s.x + Math.sin(time * 1.3 + s.phase * 9) * 8, -(s.y - t * 90), 0);
      s.mesh.scale.setScalar(s.size * (0.6 + 0.4 * Math.sin(time * 6 + s.phase * 20)));
      s.mesh.material.opacity = Math.max(beckon, open) * Math.sin(Math.PI * t) * 0.9;
    }
  };

  return room;
}
