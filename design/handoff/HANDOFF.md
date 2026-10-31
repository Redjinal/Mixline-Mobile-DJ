# Handoff: Crystal Current design prototype

Branch: `design/crystal-current-prototype`. Read `CLAUDE.md`, then `design/prototype/CONVENTIONS.md` and the approved spec `docs/superpowers/specs/2026-10-29-crystal-current-design-prototype.md` before working.

## Owner decisions already made (do not re-ask)

- Art direction C, Crystal Current. HTML prototype, approach B: light-DOM web components, no build step.
- Hi-fi for all twelve screen families, portrait and landscape.
- First audio route is phone speaker / Bluetooth. "Not a cue route" leads the route-check scene.
- Planning pack stays intact at `docs/planning/v1_0/`.
- Commit and push every step so other agents can see the work. No PR unless the owner asks.
- The old remote branch `ccr-7ccfe905-r17l7y` may be deleted by the owner; agents must not delete it.

## Done

| Area | Status |
|---|---|
| Foundation: tokens, materials, base, shell, router, switcher, walkthrough, fixtures | implemented, smoke-rendered |
| Tools: serve, smoke, audit, export_previews, build_spec | implemented |
| Component families: controls, transport-pads, waveform, data, parday, routing-av | authored and self-checked by their authors |
| Icon sprite extended (Lucide subset, `assets/NOTICES.md`) and `#/s/foundation/icons` | authored |

None of this is `verified` in the planning-pack sense. No engine exists; every level, waveform and progress value is a fixture.

## Not done, in order

1. **Refuting review of each component family.** The reviewers never ran because of usage limits. Use the review prompt in the workflow script referenced below, or review by hand: render `#/s/foundation/gallery`, check hit bounds, contrast, 200 % font scale, fixture marks.
2. **Open shared change requests from component authors** (lead-owned files):
   - `app/app.css`: `:root[data-insets='off'] .device` collapses the outlet to 0 px; use rows that keep `1fr` for the outlet.
   - `tools/smoke.mjs`: include tier and hit-bounds in the output filename so renders do not overwrite each other.
   - `screens/foundation/gallery.js`: support per-state `variants`; consider splitting the gallery per family (it is ~30 000 dp tall).
   - `app/app.css` deck tab letter at 200 % font scale (use min sizes, not fixed).
   - Optional: move `.parday-btn` styles from app.css into `families/parday.css`; move icon-screen inline styles into `foundation.css`.
3. **Screens, wave 1** (launch, preparation, routing, performance, recording, system), then **wave 2** (pads, sampler, queue, sources, parday, av). Full briefs, ownership, ports and required states are in `design/handoff/build-screens.workflow.js` (a Workflow script; run with `args: {wave: 1}` then `{wave: 2}`, or use the briefs by hand). Screen stubs already exist under `screens/<family>/`.
4. **Integration:** walkthrough scenes resolve, `node design/tools/audit.mjs` clean, `export_previews.mjs`, `build_spec.mjs`, hand-written `design/spec/` docs (interaction notes, asset manifest updates AS-xx, verification report separating functional, visual, device and asset-rights status).
5. **Publish** the prototype as a private artifact the owner can open on the phone, then commit and push.

## Check commands

```sh
python3 design/tools/serve.py 8765
node design/tools/smoke.mjs --screen foundation/gallery --port 8795 --out previews/_smoke/check
node design/tools/smoke.mjs --all
node design/tools/audit.mjs
```

Last lead check: gallery and icon screens render in portrait and landscape with zero console errors; all component JS passes `node --check`.
