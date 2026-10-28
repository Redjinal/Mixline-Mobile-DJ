# Mixline 5.0.0-test1

This build implements the authorized 5.0 restoration following the design discussion. Default composition is balanced waveforms and medium platters. XY effects retain the last position on release; Bypass remembers values and Reset neutralizes them. Same Android package and test signing identity as 4.0 test2.

## Restoration delivered

Direct Decks/Waves/Mixer/Pads/FX/Library navigation; both track identities and controls persist in the dock. Wave editing and independent library preparation share eight cue slots, cue names/colors, manual markers, loop/grid metadata. Main Cue audition, momentary nudge, slip, trim, EQ cuts, master mute, fine/exact controls, sampler and bass-exchange macros are restored. Two audio clocks persist across workspaces; transient gestures release on cancellation/navigation.

The library adds source selection, structured search, BPM ranges/unknowns/sorting, Favorites/Recents/Crates, selected-track inspector, independent public-output preview, complete preparation, set recipe import/export and adjacent-pair rehearsal. Six original synthesized demos replace the smaller two-demo collection. Existing durable local imports and session snapshots are retained. Online audio uses bounded transient storage when offline retention is not allowed.

Queue tools include separate Load/Cut, precision starts, rename, up/down, skip/restore, remove/undo and cancellation of a prepared handoff. Source resolution can reload eligible references after cache eviction; failures do not fabricate a ready track. Video remains optional and uses visible official players.

## Source status

| Source | Implemented | Still unverified or unavailable |
|---|---|---|
| Local / Originals | Import, persistent files, preparation, mixing, recording; six demos | Physical-phone long-file and storage behavior |
| Audius | Search/trending, metadata, source details, eligible track loading | Live requests, current service access and phone playback; recording/offline disabled pending service validation |
| Jamendo | Public Client ID setup, search, license/credit metadata and eligible session loading | Requires user's Client ID; live service access/playback; recording/offline disabled pending service validation |
| Internet Archive / Wikimedia | Experimental metadata search and eligible licensed audio resolution | Live endpoints, actual catalog quality and phone playback |
| Free To Use | Honest source details/research status | No fabricated adapter; current API/terms not established |
| Spotify / commercial catalogs | Accurate source/access explanation | No partner audio connection |
| YouTube | Existing visible-player queue/start/repeat/retry/transition and local-layer paths | Live overlap/availability; no waveform/DSP or capture of video audio |

Provider tests use controlled responses. Official provider hosts are blocked by the environment network policy. A network failure here does not establish that the same provider will fail on the phone, and implemented adapters are not a claim of live service verification.

## Deliberate limits

Approximate onset-based BPM estimation requires review; manual downbeat/grid and one-time alignment do not provide maintained beat sync. EQ cuts use strong band attenuation. Tempo changes pitch. Private headphone cue routing, key lock, key detection, stems, native DSP and unlimited disk recording remain separate work, as recorded in the historical audit.

The new views follow the approved design direction, but generated concept images are not pixel-perfect implementation contracts. Rendered implementation checks, automated audio/state tests and Android packaging evidence are in VERIFICATION-5.md. S26 Ultra hardware certification is not claimed.
