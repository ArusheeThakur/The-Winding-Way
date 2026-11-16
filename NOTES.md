# The Winding Way: project notes

Read this whole file first in every new chat. Then read the Progress Log at the bottom to see what is already done. Work only on the current stage unless told otherwise.

## What this is

A small, polished 2.5D co-op puzzle game that runs in the browser. It is a portfolio piece by Arushee Thakur (UX designer and illustrator), so quality of feel and art direction matters more than amount of content.

Story: a couple's small daughter wandered into a strange, kind tower and got lost. There is no villain and no combat. The tower rearranges itself like a house does when you are little, and its rooms are made of her favorite things. The couple climbs floor by floor to find her. They are tied together by one long thread the whole way. At the top she is in her bedroom with her teddy, a little sleepy. The ending: the other end of the thread was in her hands all along, and when they reach her it ties itself into a bow.

Tone: warm, cozy, gentle stakes. Failing a puzzle just means a soft reset. Nothing scary happens.

## Player experience

- The player picks one of the two parents at the start. The computer plays the other.
- Both are tied by one thread. Moving either one winds or unwinds the thread around pegs and pillars. Every puzzle is solved by moving the two of them in the right order.
- The partner AI is simple and readable on purpose. It does not need to be clever. The player should learn its few rules and use them. Starting rules: Follow (default, keeps close, respects thread slack), Hold (stays put and acts as an anchor), Come (walks to the player when called). More personality is added only in the floor 2 stage.
- Controls: arrows or WASD to move, one key to call, one key to hold. Desktop only.

## The tower (build order is not play order)

Play order: Floor 1 thread room, Floor 2 music box room, Floor 3 dark room, then the daughter's bedroom at the top.

1. Floor 1, thread room. Pegs, a central pillar and crates. The thread wraps around them. One parent anchors while the other moves, then they swap, until the thread is unwound and both reach the door. Doubles as the tutorial.
2. Floor 2, music box room. One parent can only press floor tiles, the other can only turn cranks. A melody opens the way up. The tiles must be pressed in sequence with the right timing. The partner is a little impulsive and sometimes jumps the gun, so the player learns to time calls.
3. Floor 3, dark room. One parent carries a lantern, the other sees in the dark. Platforms are only visible near the lantern and fade after a few seconds. Both must cross before the platforms vanish. The room must actually be dark, lit only by the lantern. This is the emotional peak. The daughter's door is at the end.
4. Top, bedroom. Short illustrated ending scene (see story above).

## Art direction

Reference images are in /reference (the tower cutaway, plus one image per floor). Match their style with fresh assets so everything stays consistent: warm isometric painted look, soft golden lantern light, plum and violet shadows, rose and gold accents, brass gears and thread spools, stars and ribbons as small motifs.

Characters (designs are being locked by Arushee, so use placeholders until assets arrive): the man has brown hair, a cream shirt and suspenders. The woman has a blue dress and her hair up. The daughter is small with brown hair and a bow.

Until real art arrives, use simple placeholder shapes in the palette above. Keep every art file name stable so Arushee can drop in replacements without code changes. Put art in /assets and load it by name from one manifest file.

## Tech decisions

- Plain JavaScript with ES modules and three.js, no build step. Vendor three.js in /lib so nothing depends on a CDN.
- Orthographic isometric camera in a small 3D space. Characters and props can be flat painted cutouts standing in that space, with light parallax.
- Thread runs on a grid: it wraps around pegs the way string wraps around nails. No real rope physics, because it is slow to build and hard to make reliable.
- Sound is synthesized with the Web Audio API. No audio files needed.
- Run locally with `python3 -m http.server` in this folder and open localhost.
- Layout: index.html, /src (small focused modules), /assets, /lib, /reference.
- Deploy later (GitHub Pages or Vercel). Do not deploy now.

## Ground rules

- Intent over instructions: when something is not specified, choose the simplest option that fits the story and tone, and note it in the Progress Log.
- Keep scope tight. Do not add features, systems or refactors beyond what the current stage needs. Reason: usage is limited and this must ship in about a day.
- Test it yourself. After each major feature, run the game, take a screenshot at desktop size, play the solution path, and fix what you see before moving on. Desktop only, no phone testing.
- Make targeted edits to existing files instead of rewriting whole files.
- Ask the user only when blocked on something only they can decide (art, names, story). Otherwise keep going within the stage and do not stop to offer options.
- At the end of a stage: stop. Update the Progress Log, commit with a clear message, push, and give a short report of what was tested and any known issues. Keep reports brief and plain.
- Do not start the next stage, and do not deploy, unless asked.
- Ask before deleting files or changing the project structure in a way that would break the Progress Log.

## Stages

1. Foundation. Scaffold, isometric 2.5D scene and camera, grid movement for both parents (placeholder shapes), character select, partner AI with Follow, Hold and Come, scene manager so floors are separate modules. Done when both characters move smoothly on a test floor and the partner behaves as described.
2. Floor 1, thread room. Thread wrapping and unwinding on the grid, the puzzle, win condition, soft reset, door and a simple transition. Done when floor 1 is solvable start to finish and fails gracefully.
3. Floor 3, dark room. Lantern light, fading platforms, crossing puzzle, win condition. Built before floor 2 because it is simpler.
4. Floor 2, music box room. Tile and crank puzzle, melody timing, partner personality. Needs the most tuning.
5. Story and wiring. Title screen, stills between floors, the bedroom ending with the thread bow, everything connected in play order. Done when the full game plays from title to ending.
6. Art swap and polish. Drop in Arushee's real assets, lighting, synthesized sound, small juice, bug pass, deploy preparation.

If usage runs short, cut in this order: extras in stage 6, then sound, then separate partner personalities, then floor 2.

## Progress Log

Update this at the end of every stage. Keep entries short: what was built, what was tested, decisions made, known issues.

- Stage 0, setup: GitHub repo created (private), folder connected, notes written. Nothing built yet.
- Stage 1, foundation: done.
  - Built: index.html, three.js r160 vendored in /lib, and /src modules: main (loop and glue), stage (renderer, isometric camera, lights, light parallax), grid (cells, walkability, shortest path), character (cutout on the grid, step, hop, breathing), partner (Follow, Hold, Come), thread (stand-in curve), input, scenes (scene manager), ui (character select, controls hint, partner state chip), floors/testFloor (10 by 8 room with a pillar, crates and a spool). Art is loaded by name from assets/manifest.js. Placeholder art: assets/man.svg and assets/woman.svg.
  - How floors plug in: a floor module exports create() returning { grid, group, spawns: { player, partner }, wallHeight, update?, dispose? } and is registered in main.js with scenes.register(name, create).
  - Tested (headless Chrome, 1440 by 900, scripted keys plus screenshots): character select by keyboard, walking, walls and obstacles block, partner follows around the pillar and ends up beside the player, Hold keeps the partner in place, the thread limit stops the player at 6 cells, Call brings the partner over and returns it to Follow, quick key taps register, no console errors.
  - Decisions: controls are WASD or arrows to move, Space or E to call, H or Q to toggle hold. Up means up-right on screen, right means down-right. The parents are labelled "Papa" and "Mama" as placeholders (set in assets/manifest.js, change freely). Walking into a partner who is not holding makes the two trade places, so the player cannot get boxed in. The thread is a stand-in for now: one curve with a 6 cell limit that turns gold when taut. Stage 2 replaces it with the wrapping grid thread. `?as=man` or `?as=woman` in the URL skips the picker, for testing.
  - Known issues: the /reference folder is not in the project folder yet, so the placeholder look follows the written palette only. Placeholder art is SVG, so swapping in PNGs means changing the two file names in assets/manifest.js. A character standing directly behind the pillar is hidden by it. The stand-in thread passes through obstacles.
- Thread room dressing (ahead of stage 2, asked for directly): done.
  - Built: src/floors/threadRoom.js (12 by 9 room, now the floor the game opens on) and src/props.js (three helpers: upright cutout, flat on floor, flat on wall). New placeholder art, all registered by name in assets/manifest.js: peg, spool_rose, spool_blue, spool_gold, lantern, banner, rug, light_pool. The room has 7 pegs, the central pillar, 2 lavender crates, 5 spools, a rug, 4 hanging lanterns with halos and floor light pools (they breathe slightly), and 4 wall banners. Layout lives in the constants at the top of threadRoom.js.
  - Art swap: replace a file, or point its manifest name at a new file. Each prop keeps its width and takes its height from the picture's proportions, so any image size works. Draw upright props standing, the rug from straight above, the banner front-on.
  - Not built: the thread does not wrap around the pegs yet. Pegs block their cell and the floor exposes `pegs` and `pillar` for stage 2. No door yet either (stage 2). The pillar and crates are still plain 3D shapes, not manifest art.
  - Tested: headless Chrome at 1440 by 900, screenshots, walked both parents through the room, no console errors. `?floor=test` still opens the old test floor.
  - Notes: the reference images are in a folder spelled `refrences` (not `reference`). It is left as is and is not committed to git. Peg and prop positions are for looks and will move when the puzzle is designed in stage 2.
