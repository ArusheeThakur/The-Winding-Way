// Partner AI. Three readable rules, on purpose:
//   Follow: stays next to the player (default).
//   Hold:   stays put and acts as an anchor.
//   Come:   walks straight to the player, then goes back to Follow.
export const MODE = { FOLLOW: 'follow', HOLD: 'hold', COME: 'come' };

const FOLLOW_DELAY = 0.16; // a small beat before setting off, so it reads as following
const FOLLOW_STEP = 0.16;
const COME_STEP = 0.13;    // a little quicker when called

export class Partner {
  constructor(char, leader) {
    this.char = char;
    this.leader = leader;
    this.mode = MODE.FOLLOW;
    this.wait = 0;
  }

  call() { this.mode = MODE.COME; }

  toggleHold() {
    this.mode = this.mode === MODE.HOLD ? MODE.FOLLOW : MODE.HOLD;
    this.wait = FOLLOW_DELAY;
  }

  reset() { this.mode = MODE.FOLLOW; this.wait = 0; }

  update(dt) {
    const me = this.char;
    if (me.moving || this.mode === MODE.HOLD) return;

    const path = me.grid.path(me.cell, this.leader.cell);
    if (!path || path.length <= 1) {          // beside the player, or no way there
      if (this.mode === MODE.COME && path) this.mode = MODE.FOLLOW;
      this.wait = FOLLOW_DELAY;
      return;
    }

    if (this.mode === MODE.FOLLOW && this.wait > 0) { this.wait -= dt; return; }

    me.stepTime = this.mode === MODE.COME ? COME_STEP : FOLLOW_STEP;
    const next = path[0];
    me.tryStep(next.x - me.cell.x, next.z - me.cell.z, (x, z) => me.grid.isWalkable(x, z));
  }
}
