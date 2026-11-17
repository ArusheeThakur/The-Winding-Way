// DOM layer: character select, the controls line, the partner's state label, and the small
// speech bubbles that carry hints (above the player) and the partner's remarks (above the partner).
import { ART, NAMES } from '../assets/manifest.js';

const LABEL = { follow: 'following', hold: 'holding', come: 'coming' };

export function createUI() {
  const select = document.getElementById('select');
  const cards = document.getElementById('cards');
  const hud = document.getElementById('hud');
  const label = document.getElementById('partner-label');
  let labelTimer = 0;

  // A bubble: text, a timer, and a sideways nudge that is eased so it never jumps.
  const makeBubble = (id) => ({ el: document.getElementById(id), timer: 0, until: 0, priority: 0, shift: 0 });
  const mine = makeBubble('hint'), theirs = makeBubble('partner-bubble');
  function show(b, text, seconds, priority) {
    const now = performance.now();
    if (text && now < b.until && priority < b.priority) return; // something more important is showing
    clearTimeout(b.timer);
    b.el.classList.toggle('on', !!text);
    b.until = text ? now + seconds * 1000 : 0;
    b.priority = priority;
    if (!text) return;
    b.el.firstChild.textContent = text;
    b.timer = setTimeout(() => b.el.classList.remove('on'), seconds * 1000);
  }
  const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  // Put a bubble just above a head. Try a few sideways positions and take the one that covers
  // the least of the other character and the thread, staying inside the picture.
  function place(b, head, lift, other, thread, bounds, taken) {
    const w = b.el.offsetWidth, h = b.el.offsetHeight;
    let best = 0, least = Infinity;
    for (const step of [0, -1, 1, -2, 2, -3, 3]) {
      const left = Math.min(bounds.r - w - 6, Math.max(bounds.l + 6, head.x + step * 55 - w / 2));
      const box = { l: left, r: left + w, t: head.y - lift - h, b: head.y - lift };
      const hits = thread.filter((p) => p.x > box.l && p.x < box.r && p.y > box.t && p.y < box.b).length;
      const cost = overlap(box, other) / 400 + (taken ? overlap(box, taken) / 40 : 0) + hits * 3 + Math.abs(step) * 0.6 + (step === Math.round(b.shift / 55) ? -0.5 : 0);
      if (cost < least) { least = cost; best = left + w / 2 - head.x; }
    }
    b.shift += (best - b.shift) * 0.12;
    const top = Math.max(bounds.t + 6, head.y - lift - h);
    b.el.style.transform = `translate(${Math.round(head.x + b.shift - w / 2)}px, ${Math.round(top)}px)`;
    b.el.style.setProperty('--tail', Math.min(w - 18, Math.max(18, w / 2 - b.shift)) + 'px');
    const left = head.x + b.shift - w / 2;
    return { l: left, r: left + w, t: top, b: top + h };
  }

  return {
    // Shows the picker and resolves with 'man' or 'woman'.
    chooseCharacter() {
      return new Promise((resolve) => {
        const buttons = Object.keys(NAMES).map((id) => {
          const b = document.createElement('button');
          b.className = 'card';
          b.dataset.id = id;
          b.innerHTML = `<img src="${ART[id]}" alt=""><span>${NAMES[id]}</span>`;
          b.addEventListener('click', () => {
            window.removeEventListener('keydown', onKey);
            select.classList.add('hidden');
            resolve(id);
          });
          cards.appendChild(b);
          return b;
        });
        const onKey = (e) => {
          if (e.code !== 'ArrowLeft' && e.code !== 'ArrowRight' && e.code !== 'KeyA' && e.code !== 'KeyD') return;
          const i = buttons.indexOf(document.activeElement);
          const step = e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 1;
          buttons[(i + step + buttons.length) % buttons.length].focus();
        };
        window.addEventListener('keydown', onKey);
        select.classList.remove('hidden');
        buttons[0].focus();
      });
    },

    // A hint in a bubble above the player. It fades after a few seconds. Empty text hides it.
    // If two hints want to show at once, the one with the higher priority wins.
    hint(text, seconds, priority = 1) { show(mine, text, seconds, priority); },

    // A soft word from the partner, in a bubble above the partner.
    say(text) { show(theirs, text, 2.8, 1); },

    showHud() {
      hud.classList.remove('hidden');
      label.classList.remove('hidden');
    },

    // Every frame: keep both bubbles over their heads. Everything is in window pixels.
    //   player, partner: { head: {x, y}, box: {l, r, t, b} }   thread: points   bounds: the picture
    placeBubbles(player, partner, thread, bounds) {
      const hint = place(mine, player.head, 12, partner.box, thread, bounds);
      const showing = mine.el.classList.contains('on');
      // The partner's bubble sits a little higher, clear of the mode chip, and keeps off the hint.
      const remark = place(theirs, partner.head, 34, player.box, thread, bounds, showing ? hint : null);
      // If the two still collide, the hint is the more important one.
      theirs.el.style.visibility = showing && overlap(hint, remark) > 0 ? 'hidden' : '';
    },

    // The little state chip above the partner: shown when the mode changes, then it fades away.
    setPartner(mode, screen) {
      if (label.dataset.mode !== mode) {
        label.dataset.mode = mode;
        label.textContent = LABEL[mode];
        label.classList.add('on');
        clearTimeout(labelTimer);
        labelTimer = setTimeout(() => label.classList.remove('on'), 1000);
      }
      label.style.transform = `translate(-50%, -100%) translate(${screen.x}px, ${screen.y - 6}px)`;
    },
  };
}
