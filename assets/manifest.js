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

// Story paintings, shown in the intro and the ending. Each one is optional: if the file is
// missing, its step is skipped.
export const STORY = {
  bedroom: 'assets/plates/bedroom.png',     // her empty bedroom (intro, first caption)
  tower: 'assets/plates/tower-view.png',    // the whole tower with the couple at the door
  top_room: 'assets/plates/top-room.png',   // the attic room where she is waiting
  reunion: 'assets/plates/Reunion.png',     // the family together (ending)
  portrait: 'assets/plates/family-portrait.png', // the end card picture
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

// Music: drop files into this folder. Locally the game finds whatever is there. On a host that
// does not list folders it tries these names, so use them or change them here.
export const MUSIC_FOLDER = 'assets/audio/';
export const MUSIC = [
  'assets/audio/gregorquendel-beethoven-moonlight-sonata-op-27-nr-2-concert-grand-version-227468.mp3',
];
