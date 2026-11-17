# The Winding Way: project notes

Read this whole file first in every new chat. Then read the Progress Log at the bottom to see what is already done. Work only on the current stage unless told otherwise.

## What this is

A small, polished 2.5D co-op puzzle game that runs in the browser. It is a portfolio piece by Arushee Thakur (UX designer and illustrator), so quality of feel and visuals matters more than amount of content. The painted look is what sells it.

Story: a couple's small daughter wandered into a strange, kind tower and got lost. There is no villain and no combat. The tower rearranges itself like a house does when you are little, and its rooms are made of her favorite things. The couple climbs floor by floor to find her. They are tied together by one long thread the whole way.

At the top, in her bedroom, they find her holding her plush bunny. The ending: the other end of the thread was in her hands all along, and when the family is together it ties itself into a bow. The bedroom uses the bunny, not a teddy. The final end card is the family portrait in refrences/.

Tone: warm, cozy, gentle stakes. Failing a puzzle just means a soft reset. Nothing scary happens.

## Player experience

- The player picks one of the two parents at the start. The computer plays the other.
- Both are tied by one thread. Moving either one winds or unwinds the thread around pegs and pillars. Puzzles are solved by moving the two in the right order.
- The partner AI is simple and readable on purpose. Rules: Follow (default, keeps close, respects thread slack), Hold (stays put and acts as an anchor), Come (walks to the player when called). Walking into a partner who is not holding swaps places with them.
- Controls: WASD or arrows to move, Space or E to call, H or Q to toggle hold. Desktop only.

## The game: one room, with a story intro and a rescue ending

The game is now one room, the thread room, polished to the highest quality, with a story intro before it and a rescue ending after it.

1. Intro. A short story sequence that sets up the tower, the lost daughter and the thread.
2. Thread room. Painted plate with posts, a central pillar and crates. The thread starts tangled round the posts that act as pegs and round the pillar. The parents free it and both reach the door at the top right. Doubles as the tutorial.
3. Rescue ending. A short illustrated scene: the daughter, holding her bunny, and the thread tying itself into a bow (see story above).

The dark room and the music box room are cut for now and may be added later. The bunny pickup is dropped: the daughter simply holds the bunny in the ending.

## Art direction

Reference images are in the refrences folder (the spelling is a typo, leave it). They are the target look for everything: warm painted isometric, golden lantern light, plum and violet shadows, rose and gold accents, brass, thread spools, stars and ribbons as small motifs.

- Tower cutaway: Enchanted_Clockwork_Dollhouse_Tower-1.png (for title screen and transitions).
- Thread room plate: assets/plates/thread-room.png, the clean version with no painted rope. Enchanted_Thread_Room_Diorama-2.png is the same room with painted rope and is reference only.
- Dark room reference (not in use, the dark room is cut for now): Dark_Room_Floating_Platform_Puzzle-4.png.
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
- Sound effects are synthesized with the Web Audio API. Music is quiet public-domain classical: audio files dropped into assets/audio/ are played, and if there are none a music-box version of Bach's Prelude in C is synthesized from its notes.
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
2. Thread room plate pipeline. Done.
3. Thread wrapping puzzle on the plate. Done.
3b. Thread polish and a more complex tangle. The thread lies on the floor with a shadow, wraps show on the pegs, depth ordering is right, the partner shows when it is held back, hints are easier to read, and the starting tangle uses about eight posts plus the pillar. Calm classical music replaces the hum. The two parents never stack.
4. Story. An intro sequence and the rescue ending, replacing the "To be continued" card.
5. Atmosphere and effects.
6. Final bug pass and deploy preparation.

If usage runs short, cut in this order: extras in Stage 5, then the intro polish.

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
- Scope change (Nov 16): the game is now one room, the thread room, with a story intro and a rescue ending. The dark room and the music box room are cut for now. The bunny pickup is dropped. Stages renumbered as above.
- Stage 3b, thread polish and a more complex tangle: done and pushed. (The polish items 1 to 5 are described in the entry above; this adds the rest.)
  - Tangle: eight active posts (post_3, 4, 5, 6, 8, 10, 11, 12) plus the pillar. From the player's hand the thread passes post_5, loops fully round post_4, goes one and a half times round post_3 and the pillar together, under post_10, loops round post_8, out round post_6 and back past post_8, over post_11 and under post_12 to the partner. Thread length is 68 cells and the tangle uses 65. Set in tools/build_thread_room.py.
  - Solver: a search over player cell and thread shape, with the partner standing still, on the same thread code the game uses (kept outside the repo, in the test scratch folder). Shortest solution: 140 steps to stand at the door with the thread free. That is about 25 seconds of pure walking, so the two to three minutes has to come from reading the tangle, which no person has timed yet. The 140-step route was then played in the browser with real key presses, with the partner held and with the partner left following, and the door opened both times.
  - Door: it now opens only when both parents are on the landing and the thread is free of every peg. Standing there with it still caught gives a hint. The partner walks to its own free spot on the landing instead of stopping below it.
  - Thread drawing fix: between two points on the same peg the rope stays up, so the pillar band no longer zigzags.
  - Audio: the ambient hum is gone. Music is in src/music.js. Files in assets/audio/ (mp3, ogg, m4a, wav) are played shuffled at volume 0.25 with a 3 second fade in and a 2 second crossfade. A local server lists the folder, so any file name works there. A host that does not list folders tries the names in MUSIC in assets/manifest.js (gymnopedie-1.mp3, clair-de-lune.mp3, prelude-in-c.mp3). With no files, a music-box version of Bach's Prelude in C (bars 1 to 32, then a closing C chord in place of the last three bars) plays from its notes and loops. Music starts on the first key press or click, and M mutes everything. Sound effects are about half as loud as before, and there is a new soft pluck when the thread catches on a peg or comes free.
  - Never stacking: Follow now stops three steps from the player. If the two end up touching (corners included) and the player has stopped, the partner steps away to the nearest free cell the thread allows. A holding partner does not move. Trading places is slower (0.3 seconds) and each parent curves out to their own side, so they pass side by side.
  - Tested (headless Chrome, real key presses, screenshots): the 140-step solve twice as above; a stuck run (straight for the door until the thread is tight, pushing until the reset hint, winding the wrong way round post_5, then R restoring the exact start); the swap caught mid-step; the partner stepping away after the player stops beside it; music reported as running with no files after the first key press. No console errors.
  - Not checked: nothing was listened to. The music, the note list of the prelude and the softer effects were only tested for running without errors, and file playback was not tested because the folder is empty.
  - Known issues: the solution is long but simple (follow the thread back), and the Hold key is not needed on the shortest route. The partner tugs and says the thread is tight from the first second. On the landing the two parents stand on neighbouring cells. During a swap the thread end leaves the hand briefly.
