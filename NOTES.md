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
- Stage 2, thread room plate pipeline: done and pushed. Rendering is three.js with a flat camera on the plate, everything in plate pixels, drawn in order: plate, then characters and cutout layers sorted by ground line, then light. Plate data is two files in assets/plates/: thread-room.json (calibration, cutouts, lights, spawns, puzzle) and thread-room-mask.png (white floor, grey raised landing, black not walkable), both written by tools/build_thread_room.py, which holds every traced coordinate. Grid is 26 by 26 cells of about 40 plate pixels, mapped with a four-point perspective mapping. Calibration tool: ` key or ?debug, drag the four corners, "Download layout" and put the file in assets/plates/. Art folders had been created as `assets:characters:` and `assets:plates:` and were moved to assets/characters/ and assets/plates/.
- Playtest fixes after Stage 2: parents are 210 plate pixels tall (characterHeight in the layout), the partner's mode label is small and fades after a second, Follow stops with one empty cell between the two.
- Audio module: src/audio.js, Web Audio only. Footsteps, mode pop, ambient pad, creak(tension) and chime(). Starts on the first key or click, M mutes. Still not checked by ear.
- Stage 3, thread puzzle: done and pushed.
  - Cleanup: deleted testFloor.js, props.js and the nine placeholder SVGs. The manifest already had no entries for them.
  - Thread logic (src/threadLogic.js, no drawing): the thread is a line between the two parents that bends round pegs. It hooks a peg when the line sweeps across it and lets go when the turn at that peg comes back to zero, so it winds, unwinds and can loop more than once. Only the bends next to a moving end change, like real string. Each bend costs thread (turn times peg thickness) and the total may not pass maxLength. The pillar is a ring of 8 points so the thread wraps its surface.
  - Rules: the thread never blocks walking. A step is refused only when it would need more thread than there is. Crates and plain posts do not catch it.
  - Puzzle (set in tools/build_thread_room.py, written into the layout): active pegs are the post beside the rug (post_5), the pillar, and the two posts in the middle and front of the floor (post_10, post_12). Thread length is 32 cells and the starting tangle uses 29.4. Order to solve: step across beside post_5 (the gentle first move), follow the thread round the back of the pillar, pass post_10, then post_12. The partner will chase the player round post_12 and keep it hooked, so the player has to press H to anchor the partner, walk round the post, then go to the door and call. With the pillar still hooked the door is out of reach.
  - Partner and the thread: it never plans a route that would hook a new peg, never winds the thread further round the peg next to it, keeps 2 cells of thread spare for the player, and waits when it cannot move. On the door landing it comes right beside the player.
  - Drawing (src/thread.js): a rose-red rope of short pieces in two alternating shades, with sag that flattens as it tightens and a glow that brightens when taut. Each piece is sorted by the floor under it, so it passes behind and in front of posts, the pillar and crates correctly. A bright spot marks each contact point and hooked pegs get a faint halo.
  - Also: R restarts the room, the door fills with warm light and the chime plays when both parents stand on the landing, then a "To be continued" card (R plays again). A faint ghost shows a parent hidden behind the pillar. The rope creak follows the tension. Hints appear at the top: at the start, when the thread is tight, after repeated pulling (press R), when the partner is caught near its post (press H), and when the player waits at the door alone (press Space).
  - Tested (headless Chrome, scripted real key presses, screenshots): a full solve with the partner held from the start; a realistic solve with the partner following and Hold used only at the last post; a deliberately stuck run (straight for the door, then the wrong way round post_5 and the pillar) ending taut with the reset hint, and R restoring the exact starting tangle; door opening, end card, replay. Screenshots checked for the rope behind the pillar, behind post_10 and in front of post_12. No console errors.
  - Decisions: the stuck state is a tight thread the player cannot get further with, not a dead end, since walking back always unwinds. Thread over a crate is sorted by the floor under it, so it can look as if it passes through the top of a crate.
  - Known issues: only one solving route was scripted, so there may be shortcuts or odd partner behaviour off that route. Puzzle difficulty is gentle and not playtested by a person. Sounds still not checked by ear. Recalibrating in the debug tool restarts the room. The Stage 2 additions in the stage list (contact shadow that shifts with movement, warm and cool light tint on the characters) are not built.
- Stage 3 polish pass (thread room only): done and pushed.
  - Thread look: the rope now lies on the floor. It drops from each hand or peg within about 48 pixels, runs along the floor with a lazy curve (no long straight runs), and has a soft contact shadow under it. It lifts only slightly when tight. Highlight on top, darker underneath, and the two twist shades are closer together. It is held at hip height and sits lower on the posts (34 pixels) and the pillar (56).
  - Wraps: while a post or the pillar has the thread on it, a short band of rope is drawn across its front, over the cutout, so it reads as wrapped and not as passing behind.
  - Depth: crates and spools now carry a `front` line in the layout (the front edge of their footprint, written by tools/build_thread_room.py). The thread checks which side of that line it is on, so it goes behind a crate properly, including when a parent stands behind the top crate. The bit of rope near a hand sorts with the parent holding it. Peg halos now sort with their peg, so they no longer light the face of someone standing in front.
  - Partner held back: when the partner wants to walk and the thread will not let it, it leans and tugs toward the player every 5 seconds, the rope flashes, and its chip says "the thread is tight" or "the thread is caught" (at most every 12 seconds).
  - Hints: solid background, larger text, shown for longer (the first one for 16 seconds). If no peg has come free for 20 seconds a hint is shown again, chosen by what is left: the starting hint, the press H hint when only the partner's post is left, or a go to the door hint when the thread is free.
  - Tested (headless Chrome, real key presses, screenshots): start, tight thread, rope behind the top and middle crates with a parent behind each, pillar and post wraps, the partner's strain and chip, the 20 second hint, then the full realistic solve and the stuck run with R again. No console errors.
  - Decisions: progress for the hint timer means the thread coming off a peg. The band across the front of the pillar is shown whenever the pillar is hooked, even when the real thread runs round the back, because that is what makes it read as wrapped.
  - Known issues: the partner tugs and speaks at the very start too, since it wants to follow and cannot. Rope lying just in front of a crate's front edge can draw over the shins of a parent standing right there. The strain lean is small. Everything in the Stage 3 list still applies (one scripted route, sounds unchecked by ear, Stage 2 shadow and tint additions not built).
