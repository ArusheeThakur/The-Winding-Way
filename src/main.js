// The Winding Way: boot, game loop and the glue between modules.
import { createStage } from './stage.js';
import { loadArt } from './art.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { SceneManager } from './scenes.js';
import { Character } from './character.js';
import { Partner, MODE } from './partner.js';
import { Thread } from './thread.js';
import { cellDistance } from './grid.js';
import { create as createThreadRoom } from './floors/threadRoom.js';
import { createDebug } from './debug.js';
import { createAudio } from './audio.js';

// How many cells apart the thread lets the two parents get (stand-in until Stage 3).
const THREAD_CELLS = 10;

const stage = createStage(document.getElementById('game'));
const input = createInput();
const ui = createUI();
const audio = createAudio();
const scenes = new SceneManager(stage);
scenes.register('thread', createThreadRoom);

const game = { audio, art: null, stage, scenes, player: null, partner: null, thread: null, floor: null };
window.__game = game; // handy for testing in the console

async function enterFloor(name) {
  game.floor = await scenes.load(name, { art: game.art });
  placeParents();
}

// Put both parents on their spawn cells (or the nearest walkable ones).
function placeParents() {
  if (!game.player) return;
  const { floor } = game;
  const a = floor.nearestWalkable(floor.spawns.player.x, floor.spawns.player.z);
  floor.grid.block(a.x, a.z); // so the partner does not land on the same cell
  const b = floor.nearestWalkable(floor.spawns.partner.x, floor.spawns.partner.z);
  floor.grid.blocked.delete(floor.grid.key(a.x, a.z));
  game.player.place(floor, a.x, a.z);
  game.partner.char.place(floor, b.x, b.z);
  game.partner.reset();
}

let lastMode = null; // to hear when the partner's mode changes

function start(art, choice) {
  const other = choice === 'man' ? 'woman' : 'man';
  const height = game.floor.layout.characterHeight;
  game.player = new Character(choice, art[choice], height);
  game.partner = new Partner(new Character(other, art[other], height), game.player);
  game.thread = new Thread();
  stage.scene.add(game.player.group, game.partner.char.group, game.thread.mesh);
  placeParents();

  // A footfall on every second cell: the player's a little louder than the partner's.
  const steps = (volume, n = 0) => () => { if (n++ % 2 === 0) audio.footstep(volume); };
  game.player.onStep = steps(1);
  game.partner.char.onStep = steps(0.55);
  lastMode = game.partner.mode;

  input.on('call', () => game.partner.call());
  input.on('hold', () => game.partner.toggleHold());
  input.enable();
  ui.showHud();
}

// The player may step onto a free cell that the thread can still reach.
function playerCanEnter(x, z) {
  const other = game.partner.char.cell;
  if (!game.floor.grid.isWalkable(x, z)) return false;
  if (x === other.x && z === other.z) return false;
  if (cellDistance({ x, z }, other) > THREAD_CELLS) { game.thread.pull(); return false; }
  return true;
}

function update(dt) {
  const { player, partner, thread } = game;
  if (player) {
    player.update(dt);
    partner.char.update(dt);
    const dir = input.direction();
    if (dir && !player.moving) {
      const [dx, dz] = dir;
      const pc = partner.char;
      const intoPartner = player.cell.x + dx === pc.cell.x && player.cell.z + dz === pc.cell.z;
      if (intoPartner && partner.mode !== MODE.HOLD && !pc.moving) {
        // Walking into a partner who is not anchoring: they trade places, so nobody gets boxed in.
        pc.stepTime = player.stepTime;
        pc.tryStep(-dx, -dz, () => true);
        player.tryStep(dx, dz, () => true);
      } else {
        player.tryStep(dx, dz, playerCanEnter);
      }
    }
    partner.update(dt);
    if (partner.mode !== lastMode) { lastMode = partner.mode; audio.pop(); }

    const slack = Math.max(0, 1 - cellDistance(player.cell, partner.char.cell) / THREAD_CELLS);
    const order = Math.max(player.feet.y, partner.char.feet.y) + 0.5;
    thread.update(dt, player.hand, partner.char.hand, slack, order);

    const head = partner.char.head;
    ui.setPartner(partner.mode, stage.toScreen(head.x, head.y));
  }
  scenes.update(dt, game);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  stage.render();
  requestAnimationFrame(frame);
}

async function boot() {
  game.art = await loadArt();
  await enterFloor('thread');
  requestAnimationFrame(frame);
  const params = new URLSearchParams(location.search);
  // Calibration overlay: press the ` key, or open with ?debug
  createDebug({ game, onChange: placeParents, open: params.has('debug') });
  const preset = params.get('as'); // ?as=man skips the picker
  const choice = preset === 'man' || preset === 'woman' ? preset : await ui.chooseCharacter();
  start(game.art, choice);
}
boot();
