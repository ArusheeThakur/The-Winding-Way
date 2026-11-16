// DOM layer: character select, the controls hint and the partner's state label.
import { ART, NAMES } from '../assets/manifest.js';

const LABEL = { follow: 'following', hold: 'holding', come: 'coming' };

export function createUI() {
  const select = document.getElementById('select');
  const cards = document.getElementById('cards');
  const hud = document.getElementById('hud');
  const label = document.getElementById('partner-label');
  const hintBox = document.getElementById('hint');
  const endCard = document.getElementById('endcard');
  let hintTimer = 0;
  let labelTimer = 0;

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

    // A line of guidance at the top that fades after a few seconds. Empty text hides it.
    hint(text, seconds) {
      clearTimeout(hintTimer);
      if (text) hintBox.textContent = text;
      hintBox.classList.toggle('on', !!text);
      if (text) hintTimer = setTimeout(() => hintBox.classList.remove('on'), seconds * 1000);
    },

    showEndCard() { endCard.classList.add('on'); },
    hideEndCard() { endCard.classList.remove('on'); },

    showHud() {
      hud.classList.remove('hidden');
      label.classList.remove('hidden');
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
