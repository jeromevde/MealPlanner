#!/usr/bin/env python3
"""Build a self-contained static MealPlanner HTML file."""

from __future__ import annotations

import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
MEALS_DIR = ROOT / "meals"
DATA_DIR = ROOT / "data"
DIST_DIR = ROOT / "dist"
SRC_DIR = ROOT / "src"

INGREDIENT_RE = re.compile(r"\{(\d+(?:\.\d+)?)\s*g\s*\{([^{}]+)\}\}")
META_RE = re.compile(r"<!--\s*([\s\S]*?)\s*-->")

MEAL_LABELS = {"morning": "Breakfast", "midday": "Lunch", "evening": "Dinner"}
DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
MEALS = ["morning", "midday", "evening"]

MICRONUTRIENTS = [
    "Protein", "Iron", "Vitamin A, RAE", "Vitamin B-12", "Vitamin C",
    "Vitamin D (D2 + D3)", "Calcium", "Magnesium", "Zinc", "Selenium",
    "Potassium", "Folate, total", "Choline",
]

CATEGORIES = {
    "beef": "Meat & Offal", "liver": "Meat & Offal", "kidney": "Meat & Offal",
    "bone_marrow": "Meat & Offal",
    "sardine": "Fish & Seafood", "herring": "Fish & Seafood", "mackerel": "Fish & Seafood",
    "anchovy": "Fish & Seafood", "salmon_roe": "Fish & Seafood", "oyster": "Fish & Seafood",
    "clam": "Fish & Seafood", "cod_liver": "Fish & Seafood", "natto": "Fish & Seafood",
    "egg": "Dairy & Eggs", "duck_egg": "Dairy & Eggs", "butter": "Dairy & Eggs",
    "parmesan_cheese": "Dairy & Eggs",
    "brown_rice": "Grains & Starches", "pasta": "Grains & Starches", "bread": "Grains & Starches",
    "potato": "Vegetables & Herbs", "sweet_potato": "Vegetables & Herbs", "broccoli": "Vegetables & Herbs",
    "spinach": "Vegetables & Herbs", "kale": "Vegetables & Herbs", "tomato": "Vegetables & Herbs",
    "onion": "Vegetables & Herbs", "garlic": "Vegetables & Herbs", "cucumber": "Vegetables & Herbs",
    "mushroom": "Vegetables & Herbs", "parsley": "Vegetables & Herbs", "scallion": "Vegetables & Herbs",
    "ginger": "Vegetables & Herbs", "avocado": "Vegetables & Herbs",
    "tofu": "Legumes & Soy", "black_bean": "Legumes & Soy", "kimchi": "Legumes & Soy",
    "miso": "Pantry & Ferments", "light_soy_sauce": "Pantry & Ferments",
    "chicken_broth": "Pantry & Ferments", "olive_oil": "Pantry & Ferments",
    "sesame_oil": "Pantry & Ferments", "nori": "Pantry & Ferments", "wakame": "Pantry & Ferments",
    "cumin": "Spices & Herbs", "salt": "Spices & Herbs", "black_pepper": "Spices & Herbs",
    "lemon": "Fruits", "wakame": "Pantry & Ferments",
}


def load_food_db() -> tuple[dict, dict]:
    """Load foods and display names from committed CSV data."""
    food_df = pd.read_csv(DATA_DIR / "fooddata.csv")
    nut_df = pd.read_csv(DATA_DIR / "nutrients.csv")
    nutrient_cols = []
    seen = set()
    for name in nut_df["nutrientName"]:
        if name not in seen:
            seen.add(name)
            nutrient_cols.append(name)

    foods = {}
    display_names = {}
    for _, row in food_df.iterrows():
        fid = str(row["foodName"])
        nutrients = {}
        for col in nutrient_cols:
            if col in row and pd.notna(row[col]):
                nutrients[col] = float(row[col])
        foods[fid] = {
            "display_name": str(row["display_name"]),
            "category": str(row.get("food_category", categorize(fid))),
            "nutrients": nutrients,
        }
        display_names[fid] = foods[fid]["display_name"]

    drv = {}
    seen = set()
    for _, row in nut_df.iterrows():
        name = row["nutrientName"]
        if name in seen:
            continue
        seen.add(name)
        drv[name] = {
            "unit": row["unit_name"],
            "category": row["nutrient_category"],
            "drv": float(row["drv"]),
            "order": int(row["nutrient_order"]),
        }
    return foods, drv


FOOD_DB: dict = {}
DRV_DB: dict = {}


def get_nutrients(ing: str) -> dict | None:
    food = FOOD_DB.get(ing)
    return food["nutrients"] if food else None


def get_display_name(ing: str) -> str | None:
    food = FOOD_DB.get(ing)
    return food["display_name"] if food else None


def categorize(ingredient_id: str) -> str:
    if ingredient_id in CATEGORIES:
        return CATEGORIES[ingredient_id]
    if "oil" in ingredient_id:
        return "Oils & Fats"
    if "cheese" in ingredient_id:
        return "Dairy & Eggs"
    return "Other"


def parse_meta(content: str) -> dict:
    match = META_RE.search(content)
    if not match:
        return {}
    meta = {}
    for part in match.group(1).split():
        if ":" in part:
            k, v = part.split(":", 1)
            meta[k] = v
    return meta


def parse_ingredients(content: str) -> list[tuple[float, str]]:
    return [(float(m.group(1)), m.group(2).strip()) for m in INGREDIENT_RE.finditer(content)]


def density_label(score: float) -> str:
    if score >= 8:
        return "ultra-dense"
    if score >= 5:
        return "dense"
    if score >= 3:
        return "good"
    return ""


def score_meal(ingredients: list[tuple[float, str]], drv: dict) -> dict:
    agg: dict[str, float] = {}
    for qty, ing in ingredients:
        nutrients = get_nutrients(ing)
        if not nutrients:
            continue
        for name, val in nutrients.items():
            if val is not None:
                agg[name] = agg.get(name, 0) + val * qty / 100

    calories = agg.get("Energy", 0)
    drv_sum = sum(agg.get(n, 0) / drv.get(n, 1) for n in MICRONUTRIENTS if drv.get(n, 0) > 0)
    score = (drv_sum / calories * 1000) if calories > 0 else 0
    return {
        "score": round(score, 1),
        "calories": round(calories),
        "ingredientCount": len(ingredients),
        "label": density_label(score),
    }


def link_ingredients(html: str) -> str:
    def repl(match: re.Match) -> str:
        qty, ing = match.group(1), match.group(2).strip()
        display = get_display_name(ing) or ing
        return (
            f'<span class="ingredient-link" data-food="{ing}" data-qty="{qty}">'
            f'<strong>{display}</strong> <span class="qty">{qty}g</span></span>'
        )
    return INGREDIENT_RE.sub(repl, html)


def stamped_image(path: str, stamp: str) -> str:
    return f"{path}?v={stamp}" if stamp else path


def markdown_to_html(text: str, stamp: str = "") -> str:
    text = META_RE.sub("", text).strip()
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    text_parts = []
    image_parts = []
    for p in paragraphs:
        if p.startswith("!["):
            m = re.match(r"!\[([^\]]*)\]\(([^)]+)\)", p)
            if m:
                image_parts.append(
                    f'<img src="{stamped_image(m.group(2), stamp)}" alt="{m.group(1)}" style="max-width:100%;border-radius:8px">'
                )
            continue
        text_parts.append(f"<p>{link_ingredients(p)}</p>")
    return "\n".join(image_parts + text_parts)


def load_meals(stamp: str = "") -> tuple[dict, set[str]]:
    data: dict = {}
    used_ingredients: set[str] = set()

    for path in sorted(MEALS_DIR.glob("*.md")):
        day, meal, version = path.stem.rsplit("_", 2)
        raw = path.read_text()
        lines = raw.split("\n")
        title = lines[0].lstrip("# ").strip()
        body = "\n".join(lines[1:])
        meta = parse_meta(body)
        ingredients = parse_ingredients(body)
        used_ingredients.update(ing for _, ing in ingredients)

        data.setdefault(day, {}).setdefault(meal, {})[version] = {
            "title": title,
            "meta": meta,
            "image": stamped_image(f"images/{path.stem}.jpg", stamp),
            "ingredients": [{"foodName": ing, "quantity": qty} for qty, ing in ingredients],
            "contentHtml": markdown_to_html(body, stamp),
        }

    return data, used_ingredients


def load_foods(used: set[str]) -> dict:
    foods = {}
    for ing in sorted(used):
        food = FOOD_DB.get(ing)
        if not food:
            print(f"WARNING: missing nutrients for {ing}", file=sys.stderr)
            continue
        foods[ing] = {
            "display_name": food["display_name"],
            "category": food["category"],
            "nutrients": food["nutrients"],
        }
    return foods


def load_drv() -> dict:
    return DRV_DB


def badge_html(stats: dict, meta: dict) -> str:
    badges = []
    if meta.get("quick"):
        badges.append(f'<span class="badge badge-time">{meta["quick"]} min</span>')
    if stats.get("label"):
        badges.append(f'<span class="badge badge-{stats["label"]}">{stats["label"].replace("-", " ")}</span>')
    if stats.get("ingredientCount"):
        badges.append(f'<span class="badge badge-ing">{stats["ingredientCount"]} ingr.</span>')
    if stats.get("calories"):
        badges.append(f'<span class="badge badge-kcal">{stats["calories"]} kcal</span>')
    return "".join(badges)


def render_meal_sections(meal_data: dict, drv: dict) -> str:
    sections = []
    for meal in MEALS:
        cards = []
        for day in DAYS:
            versions = meal_data.get(day, {}).get(meal, {})
            for version in sorted(versions, key=int):
                item = versions[version]
                ings = [(i["quantity"], i["foodName"]) for i in item["ingredients"]]
                stats = score_meal(ings, {k: v["drv"] for k, v in drv.items()})
                item["stats"] = stats
                image = item.get("image", "")
                image_file = Path(image.split("?")[0]).name
                img_html = (
                    f'<img class="meal-thumb" src="{image}" alt="{item["title"]}" loading="lazy">'
                    if image and (MEALS_DIR / "images" / image_file).exists()
                    else ""
                )
                cards.append(f"""
                <div class="meal" data-day="{day}" data-meal="{meal}" data-version="{version}"
                     role="button" tabindex="0">
                  {img_html}
                  <div class="meal-info">
                    <span class="meal-title">{item["title"]}</span>
                    <span class="meal-badges">{badge_html(stats, item["meta"])}</span>
                  </div>
                  <span class="quantity-circle"></span>
                </div>""")

        if not cards:
            continue

        sections.append(f"""
        <section class="meal-section" data-meal-type="{meal}">
          <div class="section-header">
            <h2>{MEAL_LABELS[meal]}</h2>
            <button class="section-reset" data-meal="{meal}">Reset</button>
          </div>
          <div class="meals">{''.join(cards)}</div>
        </section>""")

    return "\n".join(sections)


def read_css() -> str:
    files = [
        ROOT / "index.css",
        SRC_DIR / "meal-element.css",
        SRC_DIR / "nutrient-html.css",
        SRC_DIR / "aggregated-food-items.css",
    ]
    extra = """
.meal-thumb {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 8px 8px 0 0;
  margin: -14px -14px 8px -16px;
  width: calc(100% + 30px);
}
.meal:has(.meal-thumb) {
  flex-direction: column;
  align-items: stretch;
  padding-top: 14px;
}
.popup-body img {
  max-width: 100%;
  border-radius: 10px;
  margin-bottom: 14px;
}
.popup-nutrients {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  text-align: left;
}
.popup-nutrients h3 {
  margin: 0 0 12px;
  font-size: 1.05em;
  font-weight: 600;
}
.popup-nutrients .nutrient-list {
  margin-top: 0;
  max-height: none;
}
.ingredient-link {
  display: inline;
  color: #4a7cff;
  border: 1px solid #d0d5dd;
  border-radius: 3px;
  padding: 0 4px;
  margin: 0 2px;
  cursor: pointer;
}
.ingredient-link:hover { background: #eef3ff; }
.ingredient-link .qty { font-size: 0.85em; color: #667085; }
.empty-hint { color: #667085; font-style: italic; }
.meal, .meal-section, .popup, #aggregation-section, #nutrient-panel,
.category-section, .contributor-item {
  box-shadow: none;
}
#nutrient-panel {
  display: none;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  text-align: left;
}
#nutrient-panel .close-btn {
  float: right;
  border: none;
  background: none;
  font-size: 1.5em;
  cursor: pointer;
}
"""
    return "\n".join(f.read_text() for f in files) + extra


def write_pwa_assets(images_dst: Path) -> list[str]:
    """Write manifest, service worker, and icons. Returns precache URL list."""
    pwa_src = SRC_DIR / "pwa"
    manifest = {
        "name": "MealPlanner",
        "short_name": "MealPlanner",
        "description": "Quick nutrient-dense recipes with shopping list and nutrient tracking",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "background_color": "#f7f8fa",
        "theme_color": "#1a1a2e",
        "orientation": "any",
        "icons": [
            {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    (DIST_DIR / "manifest.webmanifest").write_text(json.dumps(manifest, indent=2))

    for icon in ("icon-192.png", "icon-512.png", "apple-touch-icon.png"):
        shutil.copy2(pwa_src / icon, DIST_DIR / icon)

    precache = ["./index.html", "./manifest.webmanifest",
                "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"]
    if images_dst.exists():
        for img in sorted(images_dst.glob("*.jpg")):
            precache.append(f"./images/{img.name}")

    sw_template = (pwa_src / "sw.js").read_text()
    cache_version = datetime.now().strftime("%Y%m%d%H%M")
    sw_template = sw_template.replace("__CACHE_VERSION__", f"mealplanner-{cache_version}")
    precache_js = json.dumps(precache, separators=(",", ":"))
    sw_out = f"const PRECACHE_URLS = {precache_js};\n\n" + sw_template
    (DIST_DIR / "sw.js").write_text(sw_out)
    return precache


def build() -> Path:
    global FOOD_DB, DRV_DB
    FOOD_DB, DRV_DB = load_food_db()

    build_stamp = datetime.now().strftime("%Y%m%d%H%M")
    meal_data, used = load_meals(build_stamp)
    foods = load_foods(used)
    drv = load_drv()
    meal_sections = render_meal_sections(meal_data, drv)
    css = read_css()
    app_js = (SRC_DIR / "static-app.js").read_text()

    payload = {
        "days": DAYS,
        "meals": MEALS,
        "mealData": meal_data,
        "foods": foods,
        "drv": drv,
    }

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1a1a2e">
  <meta name="description" content="Quick nutrient-dense meal planner with offline support">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="MealPlanner">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <title>MealPlanner</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>{css}</style>
</head>
<body>
  <div class="meal-sections" id="meal-sections">{meal_sections}</div>

  <div id="aggregation-section">
    <div class="tabs">
      <button class="tab-button active" data-tab="ingredients">Shopping List</button>
      <button class="tab-button" data-tab="nutrients">Nutrients</button>
    </div>
    <div class="tab-content active" id="ingredients-tab">
      <div id="shopping-list"><p class="empty-hint">Select meals above to build your shopping list.</p></div>
    </div>
    <div class="tab-content" id="nutrients-tab">
      <div id="nutrient-aggregate"></div>
    </div>
  </div>

  <div id="overlay" class="overlay"></div>
  <div id="popup" class="popup">
    <div id="popup-content"></div>
  </div>

  <script>window.__DATA__ = {json.dumps(payload, separators=(",", ":"))};</script>
  <script>{app_js}</script>
</body>
</html>"""

    DIST_DIR.mkdir(exist_ok=True)
    out = DIST_DIR / "index.html"
    out.write_text(html)

    images_src = MEALS_DIR / "images"
    images_dst = DIST_DIR / "images"
    if images_src.exists():
        if images_dst.exists():
            shutil.rmtree(images_dst)
        shutil.copytree(images_src, images_dst)
        count = len(list(images_dst.glob("*.jpg")))
        print(f"Copied {count} images to {images_dst}")

    precache = write_pwa_assets(images_dst)
    print(f"PWA ready: manifest + service worker ({len(precache)} precache entries)")

    print(f"Built {out} ({out.stat().st_size // 1024} KB)")
    return out


if __name__ == "__main__":
    build()
