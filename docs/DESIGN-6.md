# Design brief — Mixline 6

## Product context
- Users and roles: one DJ on a phone (the owner tests on a Samsung S26 Ultra); desktop browsers for preparation and keyboard play.
- Primary journey: load two tracks, play Deck 1, blend to Deck 2 with the crossfader or a timed transition, keep going from the library.
- Usage frequency: session-based, many actions per minute during a set; preparation between sets.
- Hard moments: first run with empty decks, loading while the other deck plays, online sources without rights or connectivity, long titles, rotation mid-gesture, a blocked YouTube video mid-Challenge.
- Existing stack: vanilla ES modules, Web Audio, Canvas, Pointer Events, IndexedDB inside an Android WebView shell; no runtime dependencies.

## Direction
- Concept: **a neon performance instrument on obsidian — physical, glowing, legible.**
- Design family: identity hero × spatial command surface, adapted from the supplied boards (Visual DNA, Performance Controls, Music & Challenge components, Pads / FX / Settings targets, Perform / Challenge / Prepare concept, Direction 02, violet / teal variant).
- Omitted reference traits: fabricated metadata (keys, crowd counts, "AI" labels) because the app only shows measured or supplied values; the low-contrast decorative labels of Direction 02 because booth use needs legibility at arm's length.
- Typography: Inter (bundled, SIL OFL) for everything; tracked uppercase micro labels, bold titles, tabular numerals for time and BPM.
- Colour roles: field `#0B0B0D`, graphite surfaces, warm text `#EDE6DD`, Deck 1 `#FF3B3B`, Deck 2 `#00E5FF`, creative violet `#A855FF`, green ready / loop, amber buffering / warning, danger red for destructive actions. Alternative palette Violet · Teal via `data-decks="violet"`. Light theme swaps neutrals only.
- Density: compact instrument density; 48 px primary targets, 44 px secondary.
- Imagery: original SVG covers for the six practice tracks; deterministic generated covers for tracks without artwork; never implied album art.
- Interaction character: technical and calm; glow communicates state, motion is feedback or continuity only (120–320 ms, zero under reduced motion).

## Representative workflow designed completely
- Screens and states: Decks (empty, loading with cancel, loaded, playing, playing-but-silent, scratch, cue hold, focus view), Library (empty library, filtered-empty with clear, online loading skeletons, online error with retry, rights restriction, selected inspector), Challenge (empty queue, queued / buffering / blocked items, player error with retry and open-in-YouTube), Settings (dirty, saved, discard protection, reset preview).
- Navigation model: six bottom tabs (left rail on landscape and desktop) over one live session; header for record, lock and settings; a persistent transport dock.
- Signature interaction: the latched XY filter × echo pad with Bypass (keeps values) and Reset (neutralises), and touch scratching on the platters with slip.

## Responsive plan
- Phone portrait (≤ 380 px): decks stack in one column; otherwise two columns. Dock compacts its buttons below 390 px.
- Phone landscape: navigation becomes a left rail; dock remains at the bottom; workspace scrolls.
- Tablet / desktop (≥ 1024 px): wide rail with labels, content centred at 1040–1240 px, platters capped at 360 px, pads in four columns.

## Retention hypothesis
- First useful outcome: a blend between two originals within the first minute, without an account.
- Continuity: preparation (cues, loops, BPM, start) persists per track; recovery snapshots every 10 s; named sessions; crates and practice pairs.
- Proposed measure (not instrumented): share of sessions that reach a second load after the first blend; guardrail: no lost preparation data.

## Assets
- Inter latin variable woff2 from Google Fonts (SIL Open Font License 1.1), bundled at `web/assets/fonts/Inter-latin.woff2`.
- Icons: hand-drawn inline SVG in `web/js/ui/icons.js`.
- Covers: original SVG artwork in `web/assets/covers/`.
- Envato: not used.
