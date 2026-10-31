# Handoff: Crystal Current design prototype

Branch: `design/crystal-current-prototype`. Read `CLAUDE.md`, then `design/prototype/CONVENTIONS.md` and the approved spec `docs/superpowers/specs/2026-10-29-crystal-current-design-prototype.md` before working.

## Owner decisions already made (do not re-ask)

- Art direction C, Crystal Current. HTML prototype, approach B: light-DOM web components, no build step.
- Hi-fi for all twelve screen families, portrait and landscape.
- First audio route is phone speaker / Bluetooth. "Not a cue route" leads the route-check scene.
- Planning pack stays intact at `docs/planning/v1_0/`.
- Commit and push every step so other agents can see the work. No PR unless the owner asks.
- The old remote branch `ccr-7ccfe905-r17l7y` may be deleted by the owner; agents must not delete it.

## Status (31 October 2026)

All five steps of the original plan are done on this branch. Nothing is `verified` in the planning-pack sense.

| Area | Status |
|---|---|
| Foundation, tools, tokens, fixtures | implemented, checked |
| Six component families and the icon sprite | implemented; checked by their authors and by the integrated audit; the planned independent refuting review did not run |
| Twelve screen families, 36 screens, portrait and landscape | implemented; each author ran smoke renders in four variants and the click-through checker |
| Integration audit | clean: 1,584 renders, no small/overlapping/unmarked targets, no contrast failures, no unmarked fixture data, no console errors, no overflow; required states present in all 12 families |
| Click-through | 272 of 272 declared paths, 11 of 11 walkthrough scenes |
| Previews and spec | `design/previews/` (144 PNGs and a contact sheet), `design/spec/` (state index, control map, component reference, interaction notes, asset manifest updates, verification report) |
| Private preview for the owner | https://claude.ai/artifact/C7KovRdPGxC9TPMpEuh35R (owner-only; opens in "Fill this window" on a phone) |

## Open, in priority order

1. Independent refuting review of the component families (never ran).
2. Component changes listed under "Open component changes" in `design/spec/interaction-notes.md`; each has a screen-level stand-in.
3. Device work: measure the S26 Ultra and walk the first-mix journey with a DJ. See "What would make any of this verified" in `design/spec/verification-report.md`.
4. To republish the private preview after changes, publish a page made from `design/prototype/index.html` without its outer document tags, with every file under `design/prototype/` except `index.html` and Markdown as supporting files, to the URL above.

## Check commands

```sh
python3 design/tools/serve.py 8765
node design/tools/smoke.mjs --screen foundation/gallery --port 8795 --out previews/_smoke/check
node design/tools/smoke.mjs --all
node design/tools/audit.mjs
```

Last lead check: gallery and icon screens render in portrait and landscape with zero console errors; all component JS passes `node --check`.
