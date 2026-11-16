# The Winding Way: project notes

Read this whole file first in every new chat. Then read the Progress Log at the bottom to see what is already done. Work only on the current stage unless told otherwise.

## What this is

A small, polished 2.5D co-op puzzle game that runs in the browser. It is a portfolio piece by Arushee Thakur (UX designer and illustrator), so quality of feel and visuals matters more than amount of content. The painted look is what sells it.

Story: a couple's small daughter wandered into a strange, kind tower and got lost. There is no villain and no combat. The tower rearranges itself like a house does when you are little, and its rooms are made of her favorite things. The couple climbs floor by floor to find her. They are tied together by one long thread the whole way.

In the dark room they find her plush bunny on the railing and pick it up (one simple interaction). At the top, in her bedroom, the bunny goes back to her. The ending: the other end of the thread was in her hands all along, and when the family is together it ties itself into a bow. The bedroom uses the bunny, not a teddy. The final end card is the family portrait in refrences/.

Tone: warm, cozy, gentle stakes. Failing a puzzle just means a soft reset. Nothing scary happens.

## Player experience

- The player picks one of the two parents at the start. The computer plays the other.
- Both are tied by one thread. Moving either one winds or unwinds the thread around pegs and pillars. Puzzles are solved by moving the two in the right order.
- The partner AI is simple and readable on purpose. Rules: Follow (default, keeps close, respects thread slack), Hold (stays put and acts as an anchor), Come (walks to the player when called). Walking into a partner who is not holding swaps places with them.
- Controls: WASD or arrows to move, Space or E to call, H or Q to toggle hold. Desktop only.

## The game: two rooms plus an ending

Play order: the thread room, then the dark room, then the daughter's bedroom.

1. Thread room. Painted plate with posts, a central pillar and two crates. The thread wraps around the posts that act as pegs. One parent anchors while the other moves, then they swap, until the thread is unwound and both reach the door at the top right. Doubles as the tutorial.
2. Dark room. One parent carries a lantern, the other sees in the dark. Glowing translucent platforms are only visible near the lantern and fade after a few seconds. Both must cross before the platforms vanish. The room must actually be dark, lit only by the lantern. The bunny is on the railing near the end. The daughter's door is past the last platform. This is the emotional peak.
3. Bedroom ending. A short illustrated scene (see story above).

The music box room was cut to protect time and quality.

## Art direction

Reference images are in the refrences folder (the spelling is a typo, leave it). They are the target look for everything: warm painted isometric, golden lantern light, plum and violet shadows, rose and gold accents, brass, thread spools, stars and ribbons as small motifs.

- Tower cutaway: Enchanted_Clockwork_Dollhouse_Tower-1.png (for title screen and transitions).
- Thread room plate: assets/plates/thread-room.png, the clean version with no painted rope. Enchanted_Thread_Room_Diorama-2.png is the same room with painted rope and is reference only.
- Dark room reference: Dark_Room_Floating_Platform_Puzzle-4.png. The dark room plate will be generated later from this look.
- Characters: final art is in assets/characters/ as parent_man.png, parent_woman.png and daughter.png, on transparent backgrounds. Family portrait is Whimsical_Fairytale_Family_Portrait.png.

Room art is painted plates (generated images) with the game drawn on top as live overlays: the thread, both characters, glow and particles. Things that move or change (thread, fading platforms, glows) are never baked into a plate. Pillar, posts, crates, large spools and railings are traced as cutout layers drawn in front of characters when they stand behind them.

Characters:
- The man: curly brown hair and a short beard, blue vest with leaf embroidery over a cream shirt, red scarf, brown trousers, leather satchel, lace-up boots.
- The woman: long curly brown hair in a loose bun with a lilac ribbon, plum dress with leaf embroidery over a cream blouse with embroidered sleeves, leather satchel, lace-up boots.
- The daughter: small, curly brown hair with a cream bow, plum embroidered dress, boots, holding a cream bunny with a plum ribbon. She only appears in the ending.

Each character is a single standing pose. Flip it horizontally for left and right, and animate walking with a bob, sway and lean instead of separate frames, with a soft contact shadow under the feet.

Keep every swappable art file registered by name in the assets manifest so art can be replaced without code changes.

## Tech decisions

- Plain JavaScript with ES modules, no build step. Rendering approach is whatever Stage 1 established (see Progress Log).
- The thread runs on a grid: it wraps around pegs the way string wraps around nails. No real rope physics.
- The plate is a drawn three-quarter view and not a true isometric grid, so the grid is mapped to it with a four-point perspective calibration tool, and the result is saved.
- Sound is synthesized with the Web Audio API. No audio files needed.
- Run locally with `python3 -m http.server` in this folder and open localhost:8000.
- Deploy later (GitHub Pages needs a public repo on a free account, Vercel works with private). Do not deploy now.

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

1. Foundation. Done.
2. Thread room plate pipeline. Put the plate in as the background, replace placeholder characters with the real art, build the perspective calibration tool, the walkable mask (main floor and the door landing only, stairs, round platform, bridge and edge props are scenery), and the cutout layers for the pillar, posts, crates, large spools and front railing. Keep live lantern glow and a light pulse. Make the characters sit in the scene: a soft contact shadow under the feet that shifts with movement, and a light tint that warms and brightens them near a lantern and cools them in shadow. Done when both parents walk smoothly, pass behind obstacles correctly, and cannot leave the floor. No thread puzzle yet.
3. Thread wrapping puzzle on the plate. Real thread wrapping and unwinding around the posts chosen as pegs, the puzzle layout, soft reset on a key, a door that opens when both reach the exit, a transition. Replaces the stand-in thread. Done when the room is solvable and a wrong order can be reset out of.
4. Dark room. Dark room plate, lantern light, fading glowing platforms, crossing puzzle, bunny pickup, win condition.
5. Story and wiring. Title screen, transitions between rooms, the bedroom ending with the bunny and the thread bow, full playthrough from title to ending.
6. Polish and deploy preparation. Character life: idle breathing, small squash and stretch when starting and stopping, and a light sway on the loose parts (her skirt and ribbon, his scarf) using one small image-warp shader, so the flat cutouts feel alive and not like paper. Then sound, small juice, bug pass, upscale art if needed. A true 3D character experiment is a stretch goal only if everything else is done.

If usage runs short, cut in this order: extras in Stage 6, then sound, then the title screen polish.

## Progress Log

Update this at the end of every stage. Keep entries short: what was built, what was tested, decisions made, known issues.

- Stage 0, setup: GitHub repo created (private) at ArusheeThakur/The-Winding-Way, folder connected, notes written.
- Stage 1, foundation: done and pushed. Isometric test room, character select screen, both parents as placeholder cutouts moving cell to cell on the grid, partner AI (Follow, Hold, Come) with a chip above the partner showing its mode, a stand-in thread curve with a 6-cell limit, and a scene manager where each floor is its own module. Tested in headless Chrome at 1440x900 with scripted keys and screenshots: no console errors. Decisions: controls as listed above, parents labelled "Papa" and "Mama" as placeholders (change in assets/manifest.js), walking into a non-holding partner swaps places. The old test floor still opens with ?floor=test.
- Room dressing pass (before the plan change): the old placeholder thread room was dressed with 7 brass-topped pegs, 5 spools, a rug, 4 hanging lanterns with light pools, and 4 banners. Props are SVG placeholders registered in assets/manifest.js (peg, spool_rose, spool_blue, spool_gold, lantern, banner, rug, light_pool). This placeholder room is replaced by the painted plate in Stage 2.
- Plan change (Nov 16): two rooms plus the ending, painted plates as room art, music box room cut, final character art added, bunny story beat added. Stages renumbered as above.
- Known issues: the stand-in thread passes through obstacles (replaced in Stage 3). The refrences folder is not committed to git (about 10 MB) and its spelling is a typo. A character directly behind a pillar is hidden (fixed by a faint silhouette in Stage 3). Movement was only tested with scripted keys, not by hand.
- Stage 2, thread room plate pipeline: done and pushed.
  - Rendering: still three.js, but now a flat camera looking straight at the plate. Everything is positioned in plate pixels (1536 by 1024) and drawn in order: plate, then characters and cutout layers sorted by their ground line (lower on the plate is nearer), then light on top. The whole plate is always shown, letterboxed.
  - Art: the art folders had been created as `assets:characters:` and `assets:plates:` in the project root, so the files were moved to assets/characters/ and assets/plates/. Manifest now holds man, woman, daughter, thread_room, thread_room_mask, light_pool, plus LAYOUTS.thread_room.
  - Plate data (two files in assets/plates/): thread-room.json (grid calibration, 35 cutout outlines, glows, light pools, spawns, character height, landing lift) and thread-room-mask.png (white floor, grey raised landing, black not walkable). Both are written by tools/build_thread_room.py, which holds every traced coordinate. The game only reads the two files.
  - Grid: 26 by 26 cells, about 40 plate pixels each, mapped with a four-point perspective mapping (src/homography.js). A cell is walkable only if five sample points in it are on the mask. 273 walkable cells, all reachable, 9 of them on the door landing (drawn 12 pixels higher).
  - Calibration tool: press the ` key or open with ?debug. Shows the grid, walkable cells, cutout outlines and four draggable corners, and updates the game live. "Download layout" saves thread-room.json with the new calibration; putting that file in assets/plates/ keeps it. The saved calibration is the one in the committed file.
  - Cutouts: pillar (base to the top edge), 12 floor posts, 2 landing posts and the landing rail, 3 crates, 3 large spools (gold, rose, blue), the lantern post by the stairs, and the front railing (4 posts, rails and balusters traced one by one so the floor shows between them). Each is a polygon cut from the plate itself, so no extra image files.
  - Characters: real art, scaled so the man was 140 plate pixels tall (now 210, see below). Walking is a bob, sway and lean, turning is a quick flip, with a soft contact shadow. Step time 0.16 s per cell. Stand-in thread limit raised to 10 cells because cells are smaller.
  - Live effects: 5 lantern and star glows and 3 soft floor light pools that pulse gently.
  - Tested (headless Chrome, 1440 by 900, scripted keys and screenshots): pushed against every edge and wandered with random keys while checking every cell either parent stood on (140 different cells, none blocked, never sharing a cell); stood and walked behind the pillar, a post, a crate and the front railing; stood on the door landing; hold, call and follow still work; dragged a calibration corner; no console errors.
  - Decisions: the default calibration is a plain parallelogram, because the rug edges on the plate measure as parallel (no visible convergence); the tool still does full perspective. Mask and cutouts were traced by eye from zoomed crops.
  - Known issues: every post is an obstacle for now (Stage 3 picks the pegs). The stand-in thread is drawn as one straight curve, over or under things by its lowest end. A parent directly behind the pillar is fully hidden. Posts on the back bridge supports and the back-left spools block the floor but have no cutout, since nobody can stand behind them. Leftover files from the placeholder room are no longer used and can be deleted when you say so: src/floors/testFloor.js, src/props.js, and in assets: man.svg, woman.svg, peg.svg, spool_rose.svg, spool_blue.svg, spool_gold.svg, lantern.svg, banner.svg, rug.svg. ?floor=test no longer works. Movement is still only tested with scripted keys, not by hand.
- Playtest fixes after Stage 2: parents scaled up 1.5x (man is 210 plate pixels tall, set by characterHeight in assets/plates/thread-room.json and in tools/build_thread_room.py). The partner's mode label is smaller and only appears for about a second when the mode changes. In Follow (and at the end of Come) the partner now stops with one empty cell between it and the player. The two can still end up side by side if the player walks up to the partner or right after trading places. Tested with scripted keys and screenshots, no console errors.
