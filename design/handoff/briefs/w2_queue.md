# Screen family: queue (wave 2)

Smoke port: 8813

Ownership (paths relative to design/prototype/): screens/queue/index.js, screens/queue/queue.css, screens/queue/queue.js, fixtures/queue.json (optional)

FAMILY: queue — queue/queue (shell: true). Also read Document 03 §2 "Queue and automix" row and §4 "Queue reorder" row, Document 02 FR-032, Document 09 QA-23, Document 13 (automix execution is engine-owned; manual takeover).

Content: Automix toggle with current mode (off / assisted / armed plan), the current item (locked, protected), next item readiness (ready / not ready with reason), transition settings (type: cut / fade / at marked exit, duration bars, tempo match), queue list (mdj-queue-item with handle + Move up/down), Skip, Cancel transition, Manual takeover control (Stop automation), "Inspect next" detail. States: ready (set-ready + queue drift/glasswork/calypso), missing-next (queue has BRASS CANYON missing: never treated as ready; pick another), committed-transition (transition scenario: "Transition committed — begins in 8 bars"; edits to the next item blocked with reason), expired-edit (a late reorder was rejected: "Engine already committed; your change did not apply"), takeover (manual takeover: automation cancelled at frame N; faders not reset), automix-off, tempo-mismatch ("CALYPSO WIRE 136 BPM vs 124: sync would exceed range — manual"). Exercised: ready → committed-transition? via scenario; ready → missing-next (Add BRASS CANYON? no—drawn); ready → takeover (Stop automation), ready → automix-off (Automix toggle), ready → inspect-next (Inspect next) as an extra exercised state.
