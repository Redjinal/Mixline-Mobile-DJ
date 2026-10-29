# Design — Crystal Current prototype

The first connected design for the Mobile DJ app (working label), built as a no-build HTML prototype from a web-component library. It is **design evidence only**: no audio engine, no source adapter, no model, no device measurement. Every waveform, meter, level, progress and analysis value is a labelled fixture.

Specification: `docs/superpowers/specs/2026-10-29-crystal-current-design-prototype.md`. Brief: Document 19 in `docs/planning/v1_0/`.

## Layout

| Path | Contents |
| --- | --- |
| `prototype/` | The runnable prototype (`index.html`, `app/`, `components/`, `screens/`, `tokens/`, `fixtures/`, `assets/`) and `CONVENTIONS.md` for authors |
| `spec/` | Screen/state index, control→requirement map, interaction notes, asset manifest updates, verification report |
| `previews/` | PNG exports and contact sheet |
| `tools/` | `serve.py`, `build_tokens.py`, `gen_waveforms.py`, `smoke.mjs`, `export_previews.mjs`, `audit.mjs`, `build_spec.mjs` |

## Run

```sh
python3 design/tools/serve.py                 # http://127.0.0.1:8765/
python3 design/tools/serve.py 8765 0.0.0.0    # open from the phone on the same network
```

On the phone, set the switcher's viewport to **Fill this window**: 1 CSS px = 1 dp, so a 48 px target is 48 dp on the device. The default desktop canvas is an **assumed** 412 × 892 dp; the S26 Ultra has not been measured.

## Regenerate and check

```sh
python3 design/tools/build_tokens.py          # tokens.json -> tokens.css
python3 design/tools/gen_waveforms.py         # deterministic fixture peaks
node design/tools/smoke.mjs --all             # screenshot every screen, fail on console errors
node design/tools/audit.mjs                   # hit bounds, overlaps, contrast, required states, FR ids
node design/tools/export_previews.mjs         # previews + contact sheet
node design/tools/build_spec.mjs              # regenerate design/spec tables
```

Requirements: Python 3, Node 22 with Playwright and its Chromium (pre-installed in the cloud session; otherwise `npx playwright install chromium`).

## Status vocabulary

`verified` ≠ `implemented` ≠ `proposed` ≠ `drawn`. The verification report in `spec/` states functional status (not implemented), visual status (prototype; native unverified), physical-device evidence (none) and asset-rights status separately.
