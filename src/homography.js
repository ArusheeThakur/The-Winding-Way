// Four-point perspective mapping from the grid to the painted plate.
// rect = [x0, z0, x1, z1] is a rectangle of cells, and corners says where its four corners
// (x0,z0), (x1,z0), (x1,z1), (x0,z1) sit on the plate, in pixels. The rest of the grid follows from that.
export function makeMapping(corners, rect) {
  const [rx0, rz0, rx1, rz1] = rect;
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = corners;
  const dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;

  // Grid position (fractions allowed) to plate pixels.
  const project = (gx, gz) => {
    const u = (gx - rx0) / (rx1 - rx0), v = (gz - rz0) / (rz1 - rz0);
    const w = g * u + h * v + 1;
    return { x: (a * u + b * v + x0) / w, y: (d * u + e * v + y0) / w };
  };

  // How big one cell is drawn at this spot, compared with the middle of the rectangle.
  const area = (gx, gz) => {
    const p = project(gx - 0.5, gz - 0.5), q = project(gx + 0.5, gz - 0.5), r = project(gx - 0.5, gz + 0.5);
    return Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  };
  const mid = area((rx0 + rx1) / 2, (rz0 + rz1) / 2);
  const scaleAt = (gx, gz) => Math.sqrt(area(gx, gz) / mid);

  return { project, scaleAt };
}
