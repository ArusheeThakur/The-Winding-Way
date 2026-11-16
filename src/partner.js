// Partner AI. Three readable rules, on purpose:
//   Follow: stays close to the player, leaving one empty cell between them (default).
//           It never takes a route that would catch the thread on a new peg, and it
//           waits when the thread has no length left.
//   Hold:   stays put and acts as an anchor.
//   Come:   walks straight to the player (stopping one cell short), then goes back to Follow.
export const MODE = { FOLLOW: 'follow', HOLD: 'hold', COME: 'come' };

const FOLLOW_DELAY = 0.16; // a small beat before setting off, so it reads as following
const FOLLOW_STEP = 0.16;
const COME_STEP = 0.13;    // a little quicker when called
const GAP = 2;             // stop this many steps from the player, so the two sprites never stack

export class Partner {
  // rules.gap() can change how close the partner comes. rules.stepOk(a, b) can forbid a step when planning a route, and rules.canEnter(x, z)
  // has the last word on each step. Both come from the thread.
  constructor(char, leader, rules) {
    this.char = char;
    this.leader = leader;
    this.rules = rules;
    this.mode = MODE.FOLLOW;
    this.wait = 0;
    this.blockedFor = 0; // seconds it has wanted to walk but was not allowed to
  }

  call() { this.mode = MODE.COME; }

  toggleHold() {
    this.mode = this.mode === MODE.HOLD ? MODE.FOLLOW : MODE.HOLD;
    this.wait = FOLLOW_DELAY;
  }

  reset() { this.mode = MODE.FOLLOW; this.wait = 0; this.blockedFor = 0; }

  update(dt) {
    const me = this.char;
    if (this.mode === MODE.HOLD) this.blockedFor = 0;
    if (me.moving || this.mode === MODE.HOLD) return;

    const path = me.grid.path(me.cell, this.leader.cell, this.rules.stepOk);
    const gap = this.rules.gap?.() ?? GAP;
    if (!path || path.length <= gap) {        // close enough to the player, or no way there
      if (this.mode === MODE.COME && path) this.mode = MODE.FOLLOW;
      this.wait = FOLLOW_DELAY;
      this.blockedFor = path ? 0 : this.blockedFor + dt;
      return;
    }

    if (this.mode === MODE.FOLLOW && this.wait > 0) { this.wait -= dt; return; }

    me.stepTime = this.mode === MODE.COME ? COME_STEP : FOLLOW_STEP;
    const next = path[0];
    const went = me.tryStep(next.x - me.cell.x, next.z - me.cell.z, this.rules.canEnter);
    this.blockedFor = went ? 0 : this.blockedFor + dt;
  }
}
