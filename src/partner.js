// Partner AI. Three readable rules, on purpose:
//   Follow: stays close to the player but never beside them (default). If the two do end up
//           side by side, it steps away to the nearest free cell so the sprites never stack.
//           It never takes a route that would catch the thread on a new peg, and it
//           waits when the thread has no length left.
//   Hold:   stays put and acts as an anchor.
//   Come:   walks straight to the player (stopping one cell short), then goes back to Follow.
export const MODE = { FOLLOW: 'follow', HOLD: 'hold', COME: 'come' };

const FOLLOW_DELAY = 0.16; // a small beat before setting off, so it reads as following
const FOLLOW_STEP = 0.16;
const COME_STEP = 0.13;    // a little quicker when called
const GAP = 3;             // stop this many steps from the player, so the two sprites never stack
const NUDGE_DELAY = 0.3;   // how long the two may stand side by side before the partner steps away
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const apart = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z)); // 1 = touching, corners included

export class Partner {
  // rules.target() can name the exact cell to stand on. rules.stepOk(a, b) can forbid a step when planning a route, and rules.canEnter(x, z)
  // has the last word on each step. Both come from the thread.
  constructor(char, leader, rules) {
    this.char = char;
    this.leader = leader;
    this.rules = rules;
    this.mode = MODE.FOLLOW;
    this.wait = 0;
    this.blockedFor = 0; // seconds it has wanted to walk but was not allowed to
    this.crowded = 0;    // seconds it has stood right beside the player
  }

  call() { this.mode = MODE.COME; }

  toggleHold() {
    this.mode = this.mode === MODE.HOLD ? MODE.FOLLOW : MODE.HOLD;
    this.wait = FOLLOW_DELAY;
  }

  reset() { this.mode = MODE.FOLLOW; this.wait = 0; this.blockedFor = 0; this.crowded = 0; }

  // Take the one step that gets furthest from the player (and that the room allows).
  stepAway() {
    const me = this.char, you = this.leader.cell;
    const far = (c) => apart(c, you) * 10 + Math.abs(c.x - you.x) + Math.abs(c.z - you.z);
    const options = DIRS.map(([dx, dz]) => ({ dx, dz, x: me.cell.x + dx, z: me.cell.z + dz }))
      .filter((c) => far(c) > far(me.cell) && (this.rules.stepOk?.(me.cell, c) ?? true))
      .sort((a, b) => far(b) - far(a));
    me.stepTime = FOLLOW_STEP;
    for (const c of options) if (me.tryStep(c.dx, c.dz, this.rules.canEnter)) return;
  }

  update(dt) {
    const me = this.char;
    if (this.mode === MODE.HOLD) this.blockedFor = 0;
    if (me.moving || this.mode === MODE.HOLD) return;

    // Normally it heads for the player and stops short. The room can name an exact spot instead
    // (beside the player on the door landing), and then it walks round the player to get there.
    const you = this.leader.cell;
    const target = this.rules.target?.();
    const stepOk = target
      ? (a, b) => !(b.x === you.x && b.z === you.z) && (this.rules.stepOk?.(a, b) ?? true)
      : this.rules.stepOk;
    const path = me.grid.path(me.cell, target ?? you, stepOk);
    const gap = target ? 0 : GAP;
    if (!path || path.length <= gap) {        // close enough to the player, or no way there
      if (this.mode === MODE.COME && path) this.mode = MODE.FOLLOW;
      this.wait = FOLLOW_DELAY;
      this.blockedFor = path ? 0 : this.blockedFor + dt;
      // Too close: once the player has stopped, step away to the nearest free cell.
      const close = !target && !this.leader.moving && apart(me.cell, this.leader.cell) <= 1;
      this.crowded = close ? this.crowded + dt : 0;
      if (this.crowded > NUDGE_DELAY) this.stepAway();
      return;
    }
    this.crowded = 0;

    if (this.mode === MODE.FOLLOW && this.wait > 0) { this.wait -= dt; return; }

    me.stepTime = this.mode === MODE.COME ? COME_STEP : FOLLOW_STEP;
    const next = path[0];
    const went = me.tryStep(next.x - me.cell.x, next.z - me.cell.z, this.rules.canEnter);
    this.blockedFor = went ? 0 : this.blockedFor + dt;
  }
}
