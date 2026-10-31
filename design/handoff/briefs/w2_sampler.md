# Screen family: sampler (wave 2)

Smoke port: 8812

Ownership (paths relative to design/prototype/): screens/sampler/index.js, screens/sampler/sampler.css, screens/sampler/banks.js, screens/sampler/sequencer.js, fixtures/sampler.json (optional)

FAMILY: sampler — sampler/banks, sampler/sequencer (shell: true). Also read Document 03 §7 "Sequencer", Document 06 AE-06 sampler/sequencer paragraphs, Document 02 FR-027.

sampler/banks: mdj-sample-bank 16 slots over 2 banks, trigger modes, choke groups, levels, Stop all samples (56), sample pack rights note. States: bank-a, empty-slot (tap an empty slot → assign sheet), playing (two one-shots sounding, one loop), choked (choke group stopped a voice; documented voice-stealing), missing-sample ("Sample file missing — slot kept"), edit (assign/rename/trigger mode). Exercised: bank-a → playing (slot 1), playing → choked (slot 2 in the same choke group), bank-a → edit (Edit), empty-slot via (slot 12).
sampler/sequencer: mdj-step-grid with lanes, pattern bank, length/resolution/swing readouts, revision + next-bar marker, Start / Stop at bar / Stop now / Pattern change as distinct actions, takeover note. States: stopped, playing-sounding (current step moving = fixture), queued-next-bar-revision (an edit made during playback becomes revision 7 at the next bar; marker visible; sounding pattern still revision 6), editing (stopped editor usable without ParDay), stop-quantized-pending ("Stops at bar end"), stop-immediate, pattern-change (B queued). Exercised: stopped → playing-sounding (Start), playing-sounding → queued-next-bar-revision (toggle a step), playing-sounding → stop-quantized-pending (Stop at bar), playing-sounding → stop-immediate (Stop now), stopped → editing (Edit pattern).
