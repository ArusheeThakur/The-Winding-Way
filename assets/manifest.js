// The one art manifest. Every piece of art is loaded by name from here.
// To replace a placeholder: drop the new file into /assets and point the
// name at it (or simply overwrite the file and keep the same name).
export const ART = {
  man: 'assets/man.svg',
  woman: 'assets/woman.svg',

  // Thread room props. Any image size works: the game keeps each prop's
  // width and takes the height from the picture's own proportions.
  peg: 'assets/peg.svg',               // upright cutout, drawn standing
  spool_rose: 'assets/spool_rose.svg', // upright cutout
  spool_blue: 'assets/spool_blue.svg', // upright cutout
  spool_gold: 'assets/spool_gold.svg', // upright cutout
  lantern: 'assets/lantern.svg',       // upright cutout, hangs on a string
  banner: 'assets/banner.svg',         // flat on a wall, drawn front-on
  rug: 'assets/rug.svg',               // flat on the floor, drawn from straight above
  light_pool: 'assets/light_pool.svg', // soft glow, added on top of the floor
};

// Placeholder display names (not locked, see NOTES.md Progress Log).
export const NAMES = {
  man: 'Papa',
  woman: 'Mama',
};
