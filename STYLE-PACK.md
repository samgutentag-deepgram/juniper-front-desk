# Style pack

Active pack: **`flux-2026-light`** (`src/styles/packs/flux-2026-light.css`), imported once by `src/styles/theme.css`.
The dark original, `flux-2026`, sits beside it; swap the import to go back.

Literal colors, fonts, and radii live only in `src/styles/packs/`. Everywhere else uses
`var(--dg-*)`. `make check` enforces this.

To rebrand, add a pack next to it and change the one `@import` line in `theme.css`.
