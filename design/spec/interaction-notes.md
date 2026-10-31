# Interaction notes

Decisions the prototype made where Documents 03, 13, 14–16 and 19 left a choice, and places where screens differ from their briefs. Each item says what the prototype does and why. None of it is verified with a DJ or on the device.

## Engine stand-in

- No engine exists. Every control enters a pending state by itself after a gesture: it prints SENT and keeps the last acknowledged value visible underneath. The screen then plays the engine's part and acknowledges after about 0.5 s, or leaves the control at SENT when no fixture acknowledgement exists. Nothing animates to imply success.
- Finger-down states (touched, held, scratching, nudging) are transient while the pointer is captured. Drawn states in the gallery set them explicitly.
- Pointer cancel releases a held scratch at the last acknowledged position.

## Persistent shell

- Portrait dock: deck tabs, Cue and Play for the focused pair, crossfader, master meter, Master button. Landscape dock is one slim row with 48 dp transport and an icon-only Master button.
- In landscape the dock's slim master meter prints only the most severe flag (CLIP, then LATCHED, then LIM, then MUTED). The full list is in its accessible text and on the Master screen.
- A deck interrupted by a route loss shows as interrupted in the dock, not paused.
- perform/ab and sampler/sequencer drop the landscape dock because they draw their own transport.

## Performance

- Portrait perform/ab fits the content area without scrolling at 100 %. Landscape is a different composition: lanes on top, two deck workspaces, a centre mini mixer.
- Landscape cannot hold everything in the brief at real hit sizes in about 319 dp. The jog is 120 dp, not 200 dp. Trim and 3-band EQ are one tap away on perform/mixer. Key lock, Slip, Quantize, Load next and Preview seek sit about 140 dp below the fold.
- A protected (audible) deck never loads on a row tap. Library rows select; loading is the separate Load A/B/C/D control, and a playing deck asks for confirmation.

## Preparation

- The editor works on a track's saved preparation, not on a deck, so it builds its own track summary, cue list and gain trim rather than the deck components.
- The uncertain region in the fixture starts at 2:19, so the copy says "after 2:19" rather than the brief's 2:21.

## Routing

- Phone speaker leads with "Phone speaker — master only. Not a cue route." Master playback stays available.
- After a route loss, cue is never moved to the speaker, and choosing another route does not resume playback.
- The isolation check never completes in the prototype; it stays at SENT with progress unknown.

## Pads, loops, FX, stems

- Effects add a "latch armed" step between choosing Latch and the effect being latched, so choosing a mode alone never claims the effect is held.
- Full-mix fallback for stems is reachable by cancelling preparation.
- The selected pad in edit mode is highlighted through a `data-selected` attribute on the pad.

## Sampler

- An empty sample slot cannot yet be tapped (the component marks it inert); the screen adds a labelled "Assign slot N" button instead. Making the slot itself tappable is an open component change.
- The sequencer edits for the next bar while the previous revision keeps sounding; both revisions are printed.

## Queue and automix

- Stop automation stays in the same place and cancels automation without resetting faders, EQ or crossfader.
- An edit that loses a race with an engine commit is shown as expired ("Engine already committed; your change did not apply"). It is drawn, not reached by tapping, because a tap path would misrepresent a race.

## ParDay

- Read and propose until a bounded plan is armed. Stop automation is separate from manual takeover: touching a control cancels the plan, and the prototype reaches that state through a button labelled as a stand-in for the crossfader touch.
- The takeover frame number comes from the plan fixture, so it agrees with the executing state.
- A proposal that becomes stale after a reload is reviewable again and never retargets silently.

## Sources

- The clipboard is read only when Paste is tapped; the app never watches it.
- Every adapter shows four separate statuses: technical, service access, content use and distribution.
- A matching title alone never approves a substitute version.
- Cancel download stops one download. The note explains that Android's Task Manager Stop closes the whole app.

## Recording and broadcast

- A recording indicator is never shown as a broadcast indicator. The broadcast screen uses the recording scenario on purpose to show both side by side.
- A source with unknown recording or broadcast permission is treated as not allowed.

## Open component changes

- Route diagram and route card have no swapped-splitter variant; the routing screen draws its own.
- The waveform's loading text cannot say "queued" rather than "analysing".
- The deck summary has no deck-less variant for the preparation editor.
- The XY pad emits no touch event; the FX screen listens for the pointer itself.
- Empty sample slots should emit a tap.
