# Screen family: preparation (wave 1)

Smoke port: 8802

Ownership (paths relative to design/prototype/): screens/preparation/index.js, screens/preparation/preparation.css, screens/preparation/track.js, fixtures/preparation.json (optional)

FAMILY: preparation — prep/track. Also read Document 02 FR-006/007/008/009/011, Document 07 §2 (user preparation vs machine analysis; cue media-time basis; half/double), Document 06 AE-02.

prep/track (shell: false; full-height editor). Portrait: header (deck summary full, analysis status with method + confidence), overview waveform, detailed waveform with grid, tool rows, cue list, loops, gain/tags. Landscape: waveform-led (overview + detailed across the top), tools and lists in two columns beneath.
Tools: Tap downbeat, Nudge grid −/+, Local tempo, Half / Double BPM, Lock grid, Reanalyze (cannot overwrite locked edits: say so), Set cue (needs explicit edit state), Name/colour cue, Delete (edit state only), Loop in/out, Gain trim numeral with reset, Phrase markers, Tags/comment/rating/colour. Save / Undo with saved-revision indicator ("Saved · revision 4 · cues bind to this rendition").
States: uncertain (walkthrough; track 'tide': low confidence after the bridge; hatched uncertain region on the waveform; "Uncertain grid after 2:21 — tap a downbeat to correct"; nothing presented as certain), edited (walkthrough; after a cue edit: cue 2 renamed/moved, correction kept, Undo available, grid locked indicator), locked ('calypso': half/double corrected to 136 and locked; Reanalyze disabled with reason), undo (the Undo confirmation/toast with what will revert), pending-analysis ('glasswork': playable, analysis queued; grid tools disabled with reason; "Play is available"), save-failure (save failed: storage or write error; edits retained in memory; Retry / Export), cue-edit (explicit edit mode for pads: edit badge, delete enabled), half-double (BPM ambiguity choice 68/136 for calypso). Exercised: uncertain → cue-edit (Edit cues), cue-edit → edited (Keep correction), edited → undo (Undo), uncertain → half-double? no — locked → half-double (Half / Double).
