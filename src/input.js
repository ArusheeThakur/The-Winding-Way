// Keyboard input. Arrows or WASD move, Space or E calls, H or Q holds.
// On the isometric floor: up is up-right, right is down-right, and so on.
const MOVE = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};
const ACTION = { Space: 'call', KeyE: 'call', KeyH: 'hold', KeyQ: 'hold' };

export function createInput() {
  const held = []; // most recent last
  const handlers = { call: [], hold: [] };
  let enabled = false;
  let tapped = null; // a quick tap still counts for one step, even if released before the next frame

  window.addEventListener('keydown', (e) => {
    if (!enabled) return;
    if (MOVE[e.code]) {
      e.preventDefault();
      if (!held.includes(e.code)) held.push(e.code);
      if (!e.repeat) tapped = MOVE[e.code];
    } else if (ACTION[e.code] && !e.repeat) {
      e.preventDefault();
      handlers[ACTION[e.code]].forEach((fn) => fn());
    }
  });
  window.addEventListener('keyup', (e) => {
    const i = held.indexOf(e.code);
    if (i >= 0) held.splice(i, 1);
  });
  window.addEventListener('blur', () => { held.length = 0; });

  return {
    enable() { enabled = true; },
    on(action, fn) { handlers[action].push(fn); },
    // Current move direction as [dx, dz], or null.
    direction() {
      const dir = held.length ? MOVE[held[held.length - 1]] : tapped;
      tapped = null;
      return dir;
    },
  };
}
