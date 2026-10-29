# Agent handoff for the mobile DJ project

This is the version 1.0 final planning and design handoff, not a production app release. The owner is ready to begin design. Follow the current user request for the next design/build task; do not treat this template as an extra permission gate. No cloud deployment, spending or publication has been performed or authorized by the planning choices.

## Required startup

1. Read `00_README.md`, Document 19 for design startup, Document 12, the current decision ledger, and the documents assigned to the work package in Document 10.
2. Distinguish confirmed instructions, proposed choices, and unanswered questions. Do not treat the suggested defaults as user answers.
3. Start a fresh project when directed. Do not reuse Mixline without a new explicit instruction.
4. Use requirement IDs and functional/shared quality cases from `contracts/requirements_register.json`.
5. State the bounded task, file ownership, dependencies, contract changes and acceptance evidence before implementation.

## Audio and state invariants

- Native audio state and the engine sample clock are authoritative. UI animation is not musical time.
- No allocation, file/network/database I/O, mutex waits or model inference in the real-time device callback.
- Live stem inference runs outside the callback but remains protected active workload if it supplies audible audio. Only optional preparation jobs may be paused automatically under resource pressure.
- Use stable deck IDs, deck generations, stream epochs and ordered acknowledgements. A held touch cannot change decks because focus changed.
- Scheduled automation requires an engine-owned execution revision checked when every event runs. Manual takeover invalidates pending events before they can reassert old values; batch admission is atomic and cancellation is acknowledged.
- Preserve unaffected audio on recoverable errors. Follow the explicit route-loss table; never automatically redirect private cue audio to master.
- A process crash can stop audio. Restore preparation and session state honestly and resume audibly only by the defined action.

## Product and music invariants

- No external MIDI/HID DJ-controller integration. DVS/timecode exclusion is a proposed interpretation to confirm.
- Android first; C Crystal Current is the selected art direction and Galaxy S26 Ultra is the first test device, with software currency reported by the owner. Capture its actual variant/build and audio route; no hardware has been certified. USB audio interfaces and DJ splitters are confirmed. Mic, video/karaoke, broadcast and third-party plugin hosting are selected; lighting is excluded. Exact hardware, formats and compatibility still require evidence.
- Per-provider grants and hardware capabilities decide eligible operations. Ordinary playback API availability is not permission to make a DJ integration.
- Provider-controlled unknown permissions fail closed for the affected operation. Do not demand ownership-proof uploads for user-managed local files.
- Keep imported originals, user preparation and derived caches distinct. Never silently overwrite user-corrected grids or cue points during analysis.
- ParDay is the AI assistant name, not the app name. Read Documents 13-16 for model authority, provider provenance, acquisition and specialist modules. ParDay preparation plus explicitly armed assisted performance is selected; keep immediate manual takeover and read/propose until each bounded plan is armed. Never send prohibited source content to a model or turn a model proposal directly into audible action.
- Requested in-app link-to-file acquisition includes unofficial extractor/adapter candidates. Do not replace it with official-source-only discovery or assume an official API is the only technical path. Track technical verification, provider access, content rights and distribution review separately; a working file does not automatically settle the other statuses. Use Document 16 and the acquisition job contract.
- No fake meters, generated-looking waveforms, simulated transport or inert controls may be presented as implemented functionality.

## Personal operation and optional source publication

- Personal-tool delivery is confirmed. Public commercial distribution, app billing and Google Play submission are not current completion gates.
- The owner is open to a future GitHub source release so others can home lab their own solutions. Prepare reproducible build/deployment instructions and dependency/asset provenance; do not claim a licence, repository name or public release is selected or published.
- Local version first is confirmed: build the phone-native Android app and evaluate on-device acquisition D first, with no required server. Preserve a reproducible local baseline for a later D-versus-AWS comparison. This delivery order does not claim a measured runtime winner. Use contracts/acquisition_comparison_protocol.json and Document 16; no earlier immediate-comparison or backend-first wording overrides the latest sequence.
- AWS is a later optional extension, with a planning target of about US$35/month excluding ParDay AI-provider charges. Account, region, runtime and deployment remain open; this target is neither a hard cap nor spending/provisioning authorization. Local LAN/remote home-lab profiles remain optional portability references. AWS and home-lab service-specific variants do not gate initial local design or personal release; applicable local build, isolation, recovery and AI-independence cases remain required. Read Document 18 and the deployment/cost contracts when that extension is in scope.
- Acquisition runtime and ParDay's model/gateway placement are independent. Server/model outage must not stop a prepared local set.
- Personal installation still needs stable signing, upgrade/migration checks, backups and recovery. Shared examples contain no keys, music library or private user configuration. See Document 17.

## Design handoff

- No unanswered owner question blocks the first design pass. Use Document 19 defaults, mark them as proposals and keep a change log instead of repeating closed questions.
- C Crystal Current is the production direction; A is historical, not an automatically selected dark theme. Create portrait adaptation and landscape performance layouts from real Android window constraints, not the screenshot pixel dimensions.
- Design one complete local import/preparation/mix/record/recovery journey first. Two visible decks are a focus mode; four-deck capability and the selected specialist modules remain in the complete target.
- Local first is not a promise that downloading, broadcasting or provider AI works offline. Prepared local audio must remain independent of those services.
- Resolve physical audio, source feasibility, live stems, third-party plugins and paid-provider choices before their relevant implementation/release claims, not as a new design questionnaire.

## Assets and validation

- Production assets need exact provenance, rights, version/hash, fallback and acceptance evidence.
- Generated concept art is a visual proposal, not an exact UI asset or completed implementation.
- Device claims need actual device/OS/route/workload measurements. Emulator tests do not certify physical latency or cue routing.
- Validate functional behavior and visual quality separately. Preserve target size, accessibility and contrast when reducing decoration.
- Check native dependencies for the applicable ABI, package alignment and page-size requirements.

## Handoff

Report changed files, interface/migration changes, requirement IDs, tests actually run, device/build evidence, untested cases and remaining blockers. Keep `verified` distinct from `implemented`, `proposed`, `blocked` and `deferred`. Do not invent approval, test results, partner access, license purchases, repository state or public deployment.

Use the user's existing skills where relevant: Council for expensive or disputed decisions; Product Lens for evidence and prioritization; Premium Product UI with native-mobile guidance for design and interaction; Learning Engine for clear tradeoffs and optional rehearsal. Do not force irrelevant workflows into the performance interface.
