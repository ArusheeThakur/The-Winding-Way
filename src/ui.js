// DOM layer: character select, the controls hint and the partner's state label.
import { ART, NAMES } from '../assets/manifest.js';

const LABEL = { follow: 'following', hold: 'holding', come: 'coming' };

export function createUI() {
  const select = document.getElementById('select');
  const cards = document.getElementById('cards');
  const hud = document.getElementById('hud');
  const label = document.getElementById('partner-label');

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

    showHud() {
      hud.classList.remove('hidden');
      label.classList.remove('hidden');
    },

    // Keeps the little state chip floating above the partner.
    setPartner(mode, screen) {
      if (label.dataset.mode !== mode) {
        label.dataset.mode = mode;
        label.textContent = LABEL[mode];
      }
      label.style.transform = `translate(-50%, -100%) translate(${screen.x}px, ${screen.y - 6}px)`;
    },
  };
}
