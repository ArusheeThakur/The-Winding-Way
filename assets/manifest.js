// The one art manifest. Every piece of art is loaded by name from here.
// To replace art: overwrite the file, or drop a new file into /assets and point the name at it.
export const ART = {
  // Characters: one standing pose each, transparent background, facing right.
  man: 'assets/characters/parent_man.png',
  woman: 'assets/characters/parent_woman.png',
  daughter: 'assets/characters/daughter.png',

  // Thread room.
  thread_room: 'assets/plates/thread-room.png',           // the painted plate
  thread_room_mask: 'assets/plates/thread-room-mask.png', // white = floor, grey = raised landing, black = not walkable

  // Soft warm glow used for lantern light and floor light.
  light_pool: 'assets/light_pool.svg',
};

// Traced data for each plate: grid calibration, cutout layers, lights, spawns.
export const LAYOUTS = {
  thread_room: 'assets/plates/thread-room.json',
};

// Placeholder display names (not locked, see NOTES.md Progress Log).
export const NAMES = {
  man: 'Papa',
  woman: 'Mama',
};
