// The Winding Way: boot, game loop and the glue between modules.
import { createStage } from './stage.js';
import { loadArt } from './art.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { SceneManager } from './scenes.js';
import { Character } from './character.js';
import { Partner, MODE } from './partner.js';
import { create as createThreadRoom } from './floors/threadRoom.js';
import { createDebug } from './debug.js';
import { createAudio } from './audio.js';
import { createStory } from './story.js';

const stage = createStage(document.getElementById('game'));
const input = createInput();
const ui = createUI();
const audio = createAudio();
const scenes = new SceneManager(stage);
scenes.register('thread', createThreadRoom);

const game = { audio, ui, art: null, stage, scenes, player: null, partner: null, floor: null, frozen: false, story: null, onSolved: null };
window.__game = game; // handy for testing in the console

async function enterFloor(name) {
  game.floor = await scenes.load(name, { art: game.art });
  resetRoom();
}

// Start the room, or start it again: parents back on their spawns, the room's puzzle reset.
function resetRoom() {
  if (!game.player) return;
  placeParents();
  game.frozen = false;
  game.story?.close(0.8);
  game.floor.begin?.(game);
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

const SWAP_SIDE = 0.85; // how far each parent curves out when they trade places, in cells
const SWAP_TIME = 0.3;  // seconds for that step
const STEP_TIME = 0.16; // the player's usual step
let lastMode = null; // to hear when the partner's mode changes

function start(art, choice) {
  const other = choice === 'man' ? 'woman' : 'man';
  const height = game.floor.layout.characterHeight;
  game.player = new Character(choice, art[choice], height);
  // The room has a say in where the partner may walk (in the thread room, the thread decides).
  game.partner = new Partner(new Character(other, art[other], height), game.player, {
    target: () => game.floor.partnerTarget?.(),
    delay: () => game.floor.partnerDelay?.(),
    stepOk: (a, b) => game.floor.partnerStepOk?.(a, b) ?? true,
    canEnter: (x, z) => game.floor.grid.isWalkable(x, z) && (game.floor.partnerCanEnter?.(x, z) ?? true),
  });
  stage.scene.add(game.player.group, game.partner.char.group);
  resetRoom();

  // A footfall on every second cell: the player's a little louder than the partner's.
  const steps = (volume, n = 0) => () => { if (n++ % 2 === 0) audio.footstep(volume); };
  game.player.onStep = steps(1);
  game.partner.char.onStep = steps(0.55);
  lastMode = game.partner.mode;

  input.on('call', () => { if (!game.frozen) game.partner.call(); });
  input.on('hold', () => { if (!game.frozen) game.partner.toggleHold(); });
  input.on('reset', resetRoom);
  input.enable();
  ui.showHud();
}

// The player may step onto a free cell, if the room allows it (in the thread room: if the thread reaches).
function playerCanEnter(x, z) {
  const other = game.partner.char.cell;
  if (!game.floor.grid.isWalkable(x, z)) return false;
  if (x === other.x && z === other.z) return false;
  return game.floor.playerCanEnter?.(x, z) ?? true;
}

function update(dt) {
  const { player, partner } = game;
  if (player) {
    player.update(dt);
    partner.char.update(dt);
    const dir = game.frozen ? null : input.direction();
    if (dir && !player.moving) {
      const [dx, dz] = dir;
      const pc = partner.char;
      const intoPartner = player.cell.x + dx === pc.cell.x && player.cell.z + dz === pc.cell.z;
      const canSwap = () => game.floor.swapOk?.(pc.cell, player.cell) ?? true;
      if (intoPartner && partner.mode !== MODE.HOLD && !pc.moving && canSwap()) {
        // Walking into a partner who is not anchoring: they trade places, so nobody gets boxed in.
        // Each curves out to their own side and they take it a little slower, so it reads as stepping past.
        const here = game.floor.cellToPlate(player.cell.x, player.cell.z);
        const beside = game.floor.cellToPlate(player.cell.x + dz, player.cell.z + dx); // one cell to the side
        const side = { x: (beside.x - here.x) * SWAP_SIDE, y: (beside.y - here.y) * SWAP_SIDE };
        pc.stepTime = player.stepTime = SWAP_TIME;
        pc.tryStep(-dx, -dz, () => true);
        player.tryStep(dx, dz, () => true);
        player.sidestep = side;
        pc.sidestep = { x: -side.x, y: -side.y };
      } else {
        player.stepTime = STEP_TIME;
        player.tryStep(dx, dz, playerCanEnter);
      }
    }
    if (!game.frozen) partner.update(dt);
    if (partner.mode !== lastMode) { lastMode = partner.mode; audio.pop(); }

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
  createDebug({ game, onChange: resetRoom, open: params.has('debug') });

  // The story. ?nointro goes straight to the room, ?rate=4 plays the story four times faster.
  const story = game.story = await createStory({ rate: Number(params.get('rate')) || 1 });
  game.onSolved = () => story.ending();
  story.onAgain(resetRoom);
  if (!params.has('nointro') && !params.has('debug')) await story.intro();

  const preset = params.get('as'); // ?as=man skips the picker
  const picked = preset === 'man' || preset === 'woman' ? preset : ui.chooseCharacter();
  story.close(1.6);
  start(game.art, await picked);
}
boot();
