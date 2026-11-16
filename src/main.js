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
import { create as createTestFloor } from './floors/testFloor.js';

// How many cells apart the thread lets the two parents get (stage 1 stand-in).
const THREAD_CELLS = 6;

const stage = createStage(document.getElementById('game'));
const input = createInput();
const ui = createUI();
const scenes = new SceneManager(stage);
scenes.register('test', createTestFloor);

const game = { stage, scenes, player: null, partner: null, thread: null, floor: null };
window.__game = game; // handy for testing in the console

function enterFloor(name) {
  game.floor = scenes.load(name);
  if (!game.player) return;
  const { grid, spawns } = game.floor;
  game.player.place(grid, spawns.player.x, spawns.player.z);
  game.partner.char.place(grid, spawns.partner.x, spawns.partner.z);
  game.partner.reset();
}

function start(art, choice) {
  const other = choice === 'man' ? 'woman' : 'man';
  game.player = new Character(choice, art[choice]);
  game.partner = new Partner(new Character(other, art[other]), game.player);
  game.thread = new Thread();
  stage.scene.add(game.player.group, game.partner.char.group, game.thread.mesh);
  enterFloor(scenes.currentName);

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

    const a = player.hand, b = partner.char.hand;
    const flat = Math.hypot(a.x - b.x, a.z - b.z);
    thread.update(dt, a, b, Math.max(0, 1 - flat / THREAD_CELLS));
    stage.lookToward((a.x + b.x) / 2, (a.z + b.z) / 2);

    const head = partner.char.group.position.clone();
    head.y = 1.75;
    ui.setPartner(partner.mode, stage.toScreen(head));
  }
  scenes.update(dt, game);
  stage.update(dt);
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
  enterFloor('test');
  requestAnimationFrame(frame);
  const art = await loadArt();
  const preset = new URLSearchParams(location.search).get('as'); // ?as=man skips the picker
  const choice = preset === 'man' || preset === 'woman' ? preset : await ui.chooseCharacter();
  start(art, choice);
}
boot();
