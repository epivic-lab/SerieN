# SerieN Autumn Railways — UI package v1.0.0

Handoff for the implementing developer (Sol). Replace the current prototype UI with the new brass-and-enamel interface.

## Setup in the repository

1. Unpack this folder into the game repository as `design/ui-v1/` and commit it unchanged.
2. Copy `AGENTS.md` to the **repository root** and fill in the run/test commands at the bottom.
3. Give Codex the prompts in `docs/CODEX-PROMPTS.md`, one task (one PR) per step.

## Start here (in this order)

1. `docs/SerieN-UI-Blueprint.pdf` — read sections 1–3 (golden rules + old → new mapping).
2. `reference/serien-ui-reference.html` — open in Chrome with internet (Google Fonts). Try `?trains=0` … `?trains=8`.
3. `library/serien-ui-library.html` — every component and state.
4. `spec/ui-spec.json` — machine-readable spec: components, state model, events, alarm rules, migration map, JS keep/adapt/mock list, acceptance tests.

## Golden rules

- The **reference HTML is the source of truth**. If documents disagree, follow the reference and report the mismatch.
- Load `tokens/tokens.css` **then** `css/serien-ui.css`. **Do not reorder, split or rewrite the CSS** (rules are order-dependent).
- **Keep all class names and ids** from the reference DOM.
- The **3D layout view is not in this package**: put the engine canvas inside `.win`, delete `.vph` and `svg.lay3d`.
- **Never hard-code** 3 trains or 7 switches. Render 0–8 trains and N switches from game data.
- Use the **game's switch IDs** (WX-A, WX-B, Y-IN, Y-2, Y-3, Y-R1, Y-R2, Y-4), not the IDs in the mock.
- The reference contains a **mock simulation**: replace MOCK parts, port KEEP parts (PDF section 8, `spec/ui-spec.json → referenceJs`).

## Folder map

```
README.md
AGENTS.md                           rules for Codex (copy to repo root)
docs/CODEX-PROMPTS.md               one prompt per implementation step
docs/SerieN-UI-Blueprint.pdf        blueprint + mapping + step-by-step plan
reference/serien-ui-reference.html  working reference (self-contained, mock data)
library/serien-ui-library.html      component gallery (uses ../css and ../tokens)
spec/ui-spec.json                   full specification
tokens/tokens.json                  design tokens + behaviour constants
tokens/tokens.css                   fonts @import + CSS variables (--sn-*)
css/serien-ui.css                   production stylesheet (order-dependent)
assets/svg/serien-sprite.svg        gradients, icons, loco silhouettes, edition emblem
assets/textures/*.jpg               brass, spun brass, enamel, steel, mahogany, parchment
screenshots/                        reference renders (00 = current prototype)
```

## Fonts

Cinzel Decorative 700, Federo, Cutive Mono — SIL Open Font License, loaded by `tokens.css` from Google Fonts. Self-host for production. Screenshots in the PDF were rendered without these fonts (fallback serif); sizes and layout are correct.

## Edition and version

- Edition plate: `EDITION = {name:'Autumn Railways', emblem:'maple'}` (emblem symbol `#emb-maple` in the sprite).
- Version label: `VERSION` constant → `#ver` (set from the build).
