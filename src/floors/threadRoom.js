// The thread room: the painted plate with its traced layout.
// The thread puzzle itself is Stage 3.
import { LAYOUTS } from '../../assets/manifest.js';
import { createPlateRoom } from '../plateRoom.js';

export async function create({ art }) {
  const layout = await (await fetch(LAYOUTS.thread_room)).json();
  return createPlateRoom({
    plate: art.thread_room,
    mask: art.thread_room_mask,
    glow: art.light_pool,
    layout,
  });
}
