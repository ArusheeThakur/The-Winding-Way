// Calibration overlay for plate rooms. Toggle with the ` key, or open the page with ?debug.
// Drag the four corner handles until the grid sits on the painted floor. The game updates
// live. "Download layout" saves the room's layout file with the new calibration: put it in
// assets/plates/ over the old one and the calibration is kept for good.
const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs, parent) => {
  const node = document.createElementNS(NS, name);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  parent?.appendChild(node);
  return node;
};

export function createDebug({ game, onChange, open }) {
  const svg = document.getElementById('debug');
  const panel = document.getElementById('debug-panel');
  let dragging = -1;

  const floor = () => game.floor;
  const fileName = () => 'thread-room.json';

  function draw() {
    const f = floor();
    const { cols, rows, corners } = f.layout.calibration;
    svg.setAttribute('viewBox', `0 0 ${f.size.w} ${f.size.h}`);
    svg.replaceChildren();

    // Grid lines.
    let d = '';
    const line = (a, b) => { d += `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`; };
    for (let i = 0; i <= cols; i++) line(f.gridToPlate(i, 0), f.gridToPlate(i, rows));
    for (let j = 0; j <= rows; j++) line(f.gridToPlate(0, j), f.gridToPlate(cols, j));
    el('path', { d, fill: 'none', stroke: 'rgba(255,255,255,0.45)', 'stroke-width': 1 }, svg);

    // Walkable cells: green dots on the floor, blue on raised floor.
    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        if (!f.grid.isWalkable(x, z)) continue;
        const p = f.gridToPlate(x + 0.5, z + 0.5);
        el('circle', { cx: p.x, cy: p.y, r: 4, fill: f.isRaised(x, z) ? '#5ab4ff' : '#58e08a' }, svg);
      }
    }

    // Cutout outlines.
    for (const cut of f.layout.cutouts) {
      el('polygon', { points: cut.points.map((p) => p.join(',')).join(' '), fill: 'none', stroke: '#ffe94d', 'stroke-width': 1.5 }, svg);
    }

    // Corner handles.
    corners.forEach(([x, y], i) => {
      const h = el('circle', { cx: x, cy: y, r: 13, fill: '#ff5fa2', stroke: '#fff', 'stroke-width': 3, style: 'cursor: grab' }, svg);
      h.addEventListener('pointerdown', (e) => { dragging = i; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
      const label = el('text', { x: x + 18, y: y + 5, fill: '#fff', 'font-size': 20, 'font-family': 'sans-serif', stroke: '#000', 'stroke-width': 0.6 }, svg);
      label.textContent = ['back', 'right', 'front', 'left'][i];
    });
  }

  function apply(calibration) {
    floor().calibrate(calibration);
    onChange();
    draw();
  }

  svg.addEventListener('pointermove', (e) => {
    if (dragging < 0) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const c = floor().layout.calibration;
    const corners = c.corners.map((pt) => [...pt]);
    corners[dragging] = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    apply({ ...c, corners });
  });
  svg.addEventListener('pointerup', () => { dragging = -1; });

  function buildPanel() {
    const c = floor().layout.calibration;
    panel.innerHTML = `
      <b>Floor calibration</b><br>
      Drag the four pink corners so the grid lies on the painted floor. Dots are cells the parents can stand on, yellow lines are the cutout layers.<br>
      <label>cols<input id="dbg-cols" type="number" min="4" max="60" value="${c.cols}"></label>
      <label>rows<input id="dbg-rows" type="number" min="4" max="60" value="${c.rows}"></label><br>
      <button id="dbg-save">Download layout</button><button id="dbg-copy">Copy corners</button>
      <div id="dbg-note" style="margin-top:8px;opacity:.8">To keep a change, put the downloaded ${fileName()} in assets/plates/.</div>`;
    const size = () => apply({
      ...floor().layout.calibration,
      cols: Math.max(4, +panel.querySelector('#dbg-cols').value || c.cols),
      rows: Math.max(4, +panel.querySelector('#dbg-rows').value || c.rows),
    });
    panel.querySelector('#dbg-cols').addEventListener('change', size);
    panel.querySelector('#dbg-rows').addEventListener('change', size);
    panel.querySelector('#dbg-save').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(floor().layout, null, 1) + '\n'], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName();
      a.click();
      URL.revokeObjectURL(a.href);
    });
    panel.querySelector('#dbg-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText(JSON.stringify(floor().layout.calibration));
      panel.querySelector('#dbg-note').textContent = 'Calibration copied.';
    });
  }

  function toggle(show) {
    svg.classList.toggle('hidden', !show);
    panel.classList.toggle('hidden', !show);
    if (show) { buildPanel(); draw(); }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') toggle(svg.classList.contains('hidden'));
  });
  if (open) toggle(true);
}
