// The thread room: the painted plate plus the thread puzzle.
// The thread starts tangled round the active pegs and the pillar. It has a fixed length,
// so the parents can only reach the door together once it has been freed.
import * as THREE from '../../lib/three.module.js';
import { LAYOUTS } from '../../assets/manifest.js';
import { createPlateRoom } from '../plateRoom.js';
import { ThreadLine } from '../threadLogic.js';
import { ThreadView } from '../thread.js';

const RESERVE = 2;      // cells of thread the partner leaves spare, so it never pins the player
const MAX_WIND = 1.6;   // the partner will not wind the thread further than this round a peg (radians)
const centre = (x, z) => ({ x: x + 0.5, z: z + 0.5 });

const HINT = {
  start: 'The thread is caught on the glowing posts. Follow it back and walk around them to free it.',
  tight: 'The thread is pulled tight.',
  stuck: 'Tangled? Press R to start the room again.',
  door: 'You both need to stand at the door. Press Space to call.',
  caught: 'The thread is still caught near your partner. Press H so they hold still, then walk around that post.',
};

export async function create({ art }) {
  const layout = await (await fetch(LAYOUTS.thread_room)).json();
  const room = createPlateRoom({ plate: art.thread_room, mask: art.thread_room_mask, glow: art.light_pool, layout });
  const spec = layout.thread;

  const view = new ThreadView(art.light_pool);
  room.group.add(view.group);
  for (const p of spec.pegs) view.addHalo(p.id, p.x, p.top, 70, 70, 0.55);
  view.addHalo('pillar', spec.pillar.x, spec.pillar.y - spec.pillar.height, 210, 90, 0.3);

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

  let line = null;
  let game = null;
  let open = 0;          // 0 closed, 1 fully open
  let solved = false;
  let refusals = 0;      // how often the player has pulled against a tight thread
  let waiting = 0;       // seconds the player has stood at the door alone

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

  // Start, or start again: the thread is laid out in its starting tangle.
  room.begin = (g) => {
    game = g;
    const a = g.player.gridPos, b = g.partner.char.gridPos;
    line = new ThreadLine(makePegs(), spec.maxLength);
    line.reset(a, a);
    for (const [x, y] of spec.tangle) line.moveEnd('b', room.plateToGrid(x, y));
    line.moveEnd('b', b);
    room.line = line;
    open = 0; solved = false; refusals = 0; waiting = 0;
    g.ui.hint(HINT.start, 9);
  };

  // The player may take a step if the thread is long enough for it.
  room.playerCanEnter = (x, z) => {
    if (line.after('a', centre(x, z)).length() <= line.maxLength) return true;
    view.pull();
    refusals++;
    game.ui.hint(refusals > 5 ? HINT.stuck : HINT.tight, 4);
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
  // On the small door landing the partner comes right up beside the player.
  room.partnerGap = () => (room.isRaised(game.player.cell.x, game.player.cell.z) ? 1 : undefined);
  // Trading places is fine as long as the thread allows both steps.
  room.swapOk = (playerTo, partnerTo) => {
    const next = line.after('a', centre(playerTo.x, playerTo.z));
    next.moveEnd('b', centre(partnerTo.x, partnerTo.z));
    return next.length() <= line.maxLength;
  };

  // True when the only thing still holding the thread is the peg next to the partner.
  // and the player is close enough to do something about it.
  const lastPegOnly = () => line.bends.length > 0 && line.bends.every((bend) => bend.peg.id === line.bends[0].peg.id)
    && Math.abs(line.a.x - line.b.x) + Math.abs(line.a.z - line.b.z) < 7;

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
    const strain = Math.max(0, (tension - 0.82) / 0.18);
    g.audio.creak(strain * (player.moving || partner.moving ? 1 : 0.2));

    // A faint ghost shows a parent who is hidden behind the pillar.
    const hide = layout.hideBehind;
    for (const c of [player, partner]) {
      c.ghost.visible = c.feet.y < hide.sortY && Math.abs(c.feet.x - hide.x) < hide.halfWidth;
      c.ghost.renderOrder = hide.sortY + 0.5;
    }

    // The door opens when both parents stand on the landing.
    const atDoor = (c) => !c.moving && room.isRaised(c.cell.x, c.cell.z);
    if (!solved && atDoor(player) && atDoor(partner)) {
      solved = true;
      g.frozen = true;
      g.audio.chime();
      g.ui.hint('', 0);
      setTimeout(() => { if (solved) g.ui.showEndCard(); }, 2200);
    } else if (!solved && g.partner.blockedFor > 2.5 && lastPegOnly() && !player.moving) {
      // The partner wants to come but the thread will not let them.
      g.ui.hint(HINT.caught, 6);
      g.partner.blockedFor = -8;
    } else if (!solved && atDoor(player)) {
      waiting += dt;
      if (waiting > 2.5) { g.ui.hint(HINT.door, 4); waiting = -6; }
    } else if (!solved) {
      waiting = Math.min(waiting, 0);
    }
    open += ((solved ? 1 : 0) - open) * (1 - Math.exp(-dt * 2.2));
    doorLight.material.opacity = open * 0.95;
    doorGlow.material.opacity = open * 0.9;
  };

  return room;
}
