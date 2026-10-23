# Style pack

Active pack: **`flux-2026`** (`src/styles/packs/flux-2026.css`), imported once by `src/styles/theme.css`.

Literal colors, fonts, and radii live only in `src/styles/packs/`. Everywhere else uses
`var(--dg-*)`. `make check` enforces this.

To rebrand, add a pack next to it and change the one `@import` line in `theme.css`.
