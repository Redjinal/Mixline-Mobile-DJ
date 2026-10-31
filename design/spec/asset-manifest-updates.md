# Asset manifest updates from the design prototype

Source register: `docs/planning/v1_0/assets/asset_register.json`. This file proposes status changes for that register; it does not edit it. Every row below keeps `verified: false`. "Prototype" means the asset exists as web vector/CSS geometry in `design/prototype/` and has been seen in renders. It is not a native Android asset, has not been checked on the Galaxy S26 Ultra, and has not passed the acceptance review the register asks for.

| ID | Asset | Register status | Proposed status | Where in the prototype | Rights and provenance | Still required before acceptance |
|---|---|---|---|---|---|---|
| AS-02 | UI font | proposed | prototype, candidate kept | `assets/fonts/Barlow-*.ttf` | SIL OFL 1.1, Google Fonts repository, unmodified, sha256 per file in `assets/fonts/provenance.json` | Android rendering and size check at 100/130/200 % on the device |
| AS-03 | Numeric font | proposed | prototype, candidate kept | `assets/fonts/IBMPlexMono-*.ttf` | SIL OFL 1.1, unmodified, sha256 in `provenance.json` | Tabular-numeral legibility at 12–14 sp on the device |
| AS-04 | General icons | proposed | prototype | `assets/icons.svg` (66 Lucide symbols) | Lucide 1.64.0, ISC; Feather-derived glyphs also MIT; notices and tarball checksums in `assets/NOTICES.md` | Native vector conversion; originality not required for licensed glyphs, but the licence text must ship |
| AS-05 | DJ symbols | proposed | prototype | `assets/icons.svg` (symbols marked `data-source="original"`) | Original to this project; drawn procedurally | DJ-comprehension review the register requires |
| AS-06 | Dial family | proposed | prototype | `components/mdj-dial.js`, `families/controls.css` | Original CSS/SVG geometry | Native drawing, touch tuning with a DJ |
| AS-07 | Faders and transport | proposed | prototype | `mdj-fader`, `mdj-pitch-rail`, `mdj-crossfader`, `mdj-transport`, `mdj-jog` | Original | Native drawing; fader and pitch laws are DSP contracts (Document 06) |
| AS-08 | Pads and XY surface | proposed | prototype | `mdj-pad`, `mdj-pad-bank`, `mdj-xy-pad`, `mdj-sample-slot` | Original | Haptics and latency on the device |
| AS-09 | Brass and titanium recipes | proposed | prototype | `components/materials.css`, `tokens/tokens.json` | Original CSS gradients | Native shader or bitmap budget check |
| AS-10 | Glass materials, 3 tiers | proposed | prototype | `materials.css` `.glass` with Essential / Balanced / Enhanced tiers | Original | GPU cost on the device per tier |
| AS-11 | Waveforms | proposed | prototype (fixture data) | `mdj-waveform`, `fixtures/waveforms.json` from `design/tools/gen_waveforms.py` | Deterministic generated peaks; no audio was analysed | Real analysis output; every render is labelled FIXTURE |
| AS-12 | Beat, phrase, cue markers | proposed | prototype | `mdj-marker` | Original | Comprehension check with a DJ |
| AS-13 | Meters | proposed | prototype (fixture levels) | `mdj-meter` compact and full scale | Original; levels are fixtures | Ballistics and taps are DSP contracts |
| AS-14 | FX and stem symbols | proposed | prototype | sprite symbols `stem-*`, `fx`, `roll`, `slicer` and others | Lucide subset plus originals, as AS-04/AS-05 | As AS-05 |
| AS-15 | Album-art placeholders | proposed | prototype | `mdj-art` deterministic procedural patterns | Original, generated from track id | Pattern count and variety review |
| AS-16 | Empty and error illustrations | proposed | not created | `mdj-empty-state` uses icon plus text only | n/a | Illustrations not drawn in this prototype |
| AS-17 | Haptic profiles | proposed | not created | none | n/a | Needs the device |
| AS-18 | Motion recipes | proposed | partial | CSS transitions within the 90–220 ms token ranges; reduced motion honoured | Original | Motion spec per component and device check |
| AS-19 to AS-22 | Factory audio, demo tracks, analytical fixtures | proposed | not created | Sampler and demo crate use names only | n/a | No audio exists in the prototype |
| AS-23 | Output-route diagrams | proposed | prototype | `mdj-route-diagram`, `mdj-route-card` | Original | Check against real USB devices |
| AS-27 | ParDay identity and states | proposed | prototype | `mdj-parday-button`, card, message, arm panel, stop automation | Original | Name and identity review |
| AS-29 | Video and karaoke validation media | proposed | not created | `mdj-video-frame` draws a labelled placeholder | n/a | Licensed test media |
| AS-30 | Link acquisition interface states and icons | proposed_not_created | prototype | `screens/sources/*`, `mdj-progress-row`, `mdj-provenance-tag` | Original | Legal review of each adapter is separate from the interface |

Not touched by this prototype: AS-01 (wordmark, waits on the name), AS-24 (help content), AS-25 and AS-26 (optional promotional and 3D), AS-28 (the A/C comparison stays a concept render).
