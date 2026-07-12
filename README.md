# MealPlanner

Quick, micronutrient-rich recipes. Built as a **single static HTML file** — no server, no fetches, works offline.

## Build

```bash
pip install -r requirements.txt
python scripts/build.py          # → dist/index.html (+ PWA assets)
open dist/index.html             # or serve dist/ with any static server
```

The `dist/` folder is a **Progressive Web App** (offline-capable) and is what GitHub Pages deploys.

### PWA / GitHub Pages

Yes — fully compatible. The CI workflow builds `dist/` and deploys it as the site root over HTTPS (required for service workers).

- `manifest.webmanifest` — install to home screen
- `sw.js` — caches the app shell, recipes, and images for offline use
- Relative paths (`./`) work for both `username.github.io` and `username.github.io/MealPlanner/` project pages

After deploy, open the site in Chrome/Safari → **Install app** / **Add to Home Screen**.

To refresh nutrition data from pyfooda:

```bash
pip install -e ../Pyfooda
cd data && python fooddata.py    # regenerate data/fooddata.csv
python scripts/build.py          # rebuild static site
```

## Source layout

| Path | Purpose |
|------|---------|
| `meals/*.md` | Recipe source files |
| `data/fooddata.csv` | Ingredient nutrition (from pyfooda) |
| `scripts/build.py` | Builds self-contained `dist/index.html` |
| `src/static-app.js` | Client app (inlined at build time) |
| `dist/index.html` | **Deploy this** |

## Recipe format

```markdown
# Liver Bolognese
<!-- quick:20 -->

Sauté {80g {onion}} with {150g {liver}} and {100g {beef}}...
```

Ingredients use pyfooda ids: `liver`, `natto`, `brown_rice`, etc.
