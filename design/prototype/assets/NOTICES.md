# Notices for `design/prototype/assets/icons.svg`

This file records the provenance and licences of every symbol in the prototype icon sprite (asset work orders AS-04 "general icons" and AS-05 "DJ symbols" in `docs/planning/v1_0/sources/08_Asset_Creation_and_Sourcing.md`). The sprite notices appear below. Barlow and IBM Plex Mono are packaged locally under `fonts/` so the prototype does not require an external font service.

Status: **implemented in the design prototype, proposed as production assets**. The DJ-comprehension review that AS-05 requires and the native vector conversion that AS-04 requires have not been done. Nothing here is a claim that the icons have been accepted for release.

The sprite is self-describing: every `<symbol>` carries `data-source="lucide"` (with `data-src` naming the Lucide icon it was copied from) or `data-source="original"`. The icon gallery screen (`#/s/foundation/icons`) reads those attributes at runtime, so the lists below can be checked against the file itself.

## 1. Lucide subset (66 symbols)

- Source package: `lucide-static` version **1.64.0** from the public npm registry (`npm pack lucide-static@1.64.0`, fetched 31 October 2026). Homepage <https://lucide.dev>, repository <https://github.com/lucide-icons/lucide>.
- Tarball checksums as fetched: npm `shasum 4e673aa08d67c2b5f7943dd95577af2e2c75c1a0`; `sha256 ab8e3f449fcba2b8797e65864ff8db44befc73476dbb7038b355793bda4672fa`; npm integrity `sha512-UxWmMteOXbKHI5E4f2qVtxCAAsI9gsInYK1lNw0nrOA0w4FkJeOVZ+UOV6aGA2377FZe3qyiFYq3lqjBKZ6OuA==`. The tarball and its extracted package are not in the repository.
- What was copied: the path/shape elements of each selected icon from `package/icons/<name>.svg`, verbatim. The elements were wrapped in a `<symbol id="…" viewBox="0 0 24 24">`, the `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin` and `fill="none"` presentation attributes were left to the prototype's `.icon` CSS rule (which sets the same values Lucide uses: `currentColor`, 2, round, round), the ids were renamed to the prototype vocabulary, and `data-source`/`data-src` attributes were added. No geometry was altered.
- Lucide's `LICENSE` file states that Lucide is ISC and that the icons it lists as derived from the Feather project are additionally covered by Feather's MIT licence. Both notices are reproduced in §3. The table marks the selected icons that appear in that Feather list (matching on the current Lucide name, or on the former name where Lucide renamed the icon: `alert-triangle` → `triangle-alert`, `more-horizontal` → `ellipsis`).

| Sprite id | Lucide icon | Licence |
| --- | --- | --- |
| `home` | `house` | ISC |
| `search` | `search` | MIT (Feather-derived, listed as `search`) |
| `settings` | `settings` | ISC |
| `folder` | `folder` | ISC |
| `library` | `library` | ISC |
| `queue` | `list-end` | ISC |
| `playlist` | `list-music` | ISC |
| `list` | `list` | ISC |
| `grid` | `layout-grid` | ISC |
| `more` | `ellipsis` | MIT (Feather-derived, listed as `more-horizontal`) |
| `drag` | `grip-vertical` | ISC |
| `pin` | `pin` | ISC |
| `history` | `history` | ISC |
| `filter` | `funnel` | ISC |
| `chevron-left` | `chevron-left` | MIT (Feather-derived, listed as `chevron-left`) |
| `chevron-right` | `chevron-right` | MIT (Feather-derived, listed as `chevron-right`) |
| `chevron-down` | `chevron-down` | MIT (Feather-derived, listed as `chevron-down`) |
| `chevron-up` | `chevron-up` | MIT (Feather-derived, listed as `chevron-up`) |
| `close-sheet` | `chevron-down` | MIT (Feather-derived, listed as `chevron-down`) |
| `arrow-up` | `arrow-up` | MIT (Feather-derived, listed as `arrow-up`) |
| `arrow-down` | `arrow-down` | MIT (Feather-derived, listed as `arrow-down`) |
| `external` | `external-link` | MIT (Feather-derived, listed as `external-link`) |
| `link` | `link` | MIT (Feather-derived, listed as `link`) |
| `share` | `share-2` | ISC |
| `import` | `import` | ISC |
| `download` | `download` | MIT (Feather-derived, listed as `download`) |
| `save` | `save` | ISC |
| `edit` | `pencil` | ISC |
| `duplicate` | `copy` | ISC |
| `trash` | `trash-2` | MIT (Feather-derived, listed as `trash-2`) |
| `undo` | `undo-2` | ISC |
| `redo` | `redo-2` | ISC |
| `refresh` | `refresh-cw` | ISC |
| `plus` | `plus` | MIT (Feather-derived, listed as `plus`) |
| `minus` | `minus` | MIT (Feather-derived, listed as `minus`) |
| `check` | `check` | MIT (Feather-derived, listed as `check`) |
| `x` | `x` | MIT (Feather-derived, listed as `x`) |
| `lock` | `lock` | MIT (Feather-derived, listed as `lock`) |
| `unlock` | `lock-open` | ISC |
| `key` | `key-round` | ISC |
| `hand` | `hand` | ISC |
| `info` | `info` | MIT (Feather-derived, listed as `info`) |
| `warning` | `triangle-alert` | MIT (Feather-derived, listed as `alert-triangle`) |
| `unavailable` | `ban` | ISC |
| `loader` | `loader-circle` | ISC |
| `clock` | `clock` | MIT (Feather-derived, listed as `clock`) |
| `star` | `star` | ISC |
| `battery` | `battery` | ISC |
| `thermal` | `thermometer` | ISC |
| `storage` | `hard-drive` | ISC |
| `wifi-off` | `wifi-off` | ISC |
| `cloud` | `cloud` | ISC |
| `cloud-off` | `cloud-off` | ISC |
| `plugin` | `plug` | ISC |
| `music` | `music` | MIT (Feather-derived, listed as `music`) |
| `mic` | `mic` | ISC |
| `video` | `video` | ISC |
| `display` | `monitor` | MIT (Feather-derived, listed as `monitor`) |
| `caption` | `captions` | ISC |
| `singer` | `user` | ISC |
| `headphones` | `headphones` | MIT (Feather-derived, listed as `headphones`) |
| `speaker` | `volume-2` | ISC |
| `bluetooth` | `bluetooth` | ISC |
| `usb` | `usb` | ISC |
| `broadcast` | `radio` | MIT (Feather-derived, listed as `radio`) |
| `demo` | `square-play` | ISC |

## 2. Original symbols (114 symbols)

Every other symbol in the sprite was drawn for this prototype on the same 24-unit grid with the same 2-unit stroke, round caps and 2-unit padding, so the two sets read as one family. They are original work for the Mobile DJ design prototype (AS-05 and prototype-specific state symbols): no path data was taken from Lucide, from any other icon set or from any DJ software, and no symbol embeds a brand mark. Where a concept has only one sensible drawing (a circle with an X for `cancel`, a circle with a tick for `ready`, a play triangle), the geometry was drawn from scratch and is not a copy. The foundation sprite's first drawings (play, pause, cue, sync, stop, rec, loop, beatjump, slip, reverse, keylock, eq, gain, master, bars, marker, phrase, quantize, nudge, scratch, momentary, latch, arm, sampler, sequencer, bpm, pads, fx, stems, route, parday) were kept, some with small refinements, and remain original.

Ids: `play`, `pause`, `cue`, `sync`, `stop`, `rec`, `record-stop`, `resume`, `reverse`, `slip`, `scratch`, `nudge`, `keylock`, `deck-focus`, `takeover`, `arm`, `stop-automation`, `seek`, `seek-lock`, `marker`, `cue-memory`, `phrase`, `loop`, `loop-in`, `loop-out`, `reloop`, `roll`, `slicer`, `beatjump`, `pitch-play`, `quantize`, `phase`, `tempo-bend`, `bpm`, `momentary`, `latch`, `grid-uncertain`, `grid-locked`, `swing`, `eq`, `gain`, `master`, `bars`, `crossfader`, `bus`, `route`, `route-lost`, `split-mono`, `multichannel`, `cue-mix`, `isolation-check`, `preview`, `mono`, `stereo`, `mute`, `solo`, `channel-map`, `stems`, `stem-vocals`, `stem-drums`, `stem-bass`, `stem-other`, `pads`, `fx`, `sampler`, `sequencer`, `pattern`, `step-mute`, `velocity`, `segment`, `recover`, `export`, `backup`, `restore`, `paste`, `share-in`, `crate`, `smart-rule`, `color-tag`, `rating`, `explicit`, `sort`, `chip-remove`, `fixture`, `cancel`, `retry`, `validate`, `publish`, `ready`, `blocked`, `rate-limit`, `login-required`, `expiry`, `missing`, `permission`, `analysis-pending`, `discard`, `apply`, `dismiss`, `local-only`, `offline`, `cost-limit`, `parday`, `thinking`, `automix`, `transition-intro`, `transition-exit`, `provenance-measured`, `provenance-user`, `provenance-retrieved`, `provenance-inferred`, `talkover`, `duck`, `karaoke`.

The original symbols carry the same licence as the rest of this repository's design work. No project licence has been selected yet (Document 17); until it is, they are not offered for redistribution outside the project.

## 3. Licence texts reproduced from `lucide-static@1.64.0/LICENSE`

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, user, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 4. Maintenance

- Add a symbol on its own line inside one of the `<!-- group: … -->` sections of `icons.svg`; set `data-source` and, for Lucide, `data-src`. Update the table or the id list above in the same change.
- When upgrading Lucide, record the new version and checksums here and re-copy every `data-source="lucide"` symbol from the new package rather than editing paths by hand.
- Keep ids stable: components reference them by name, and `mdj-marker.js` exposes `iconId(preferred, fallback)` for ids that may not exist yet.

## 5. Local fonts (AS-02 / AS-03)

Unmodified Barlow Regular/Medium/SemiBold/Bold and IBM Plex Mono Regular/Medium/SemiBold TTF files were retrieved from the Google Fonts repository on 31 October 2026. Exact source URLs, byte counts and SHA-256 hashes are recorded in `fonts/provenance.json`. Their complete SIL Open Font License 1.1 notices are retained as `fonts/Barlow-OFL.txt` and `fonts/IBMPlexMono-OFL.txt`. No font was subsetted or renamed. System sans-serif/monospace remain fallbacks. These files are acquired for the prototype; native typography and device acceptance remain unverified.
