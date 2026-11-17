# Music

Drop audio files here (mp3, ogg, m4a or wav) and the game plays them quietly, shuffled, with a crossfade.
Use public-domain recordings only, for example Satie's Gymnopédie No. 1, Debussy's Clair de lune or Bach's Prelude in C major.

When running locally the game finds whatever is in this folder. On a host that does not list folders
(most of them), it looks for the file names in `MUSIC` in `assets/manifest.js`, so either use those names or edit that list.

If there are no files, the game plays a soft music-box version of the Bach prelude instead.
