"""Export pyfooda ingredients to MealPlanner CSV files."""

import pyfooda as pf

MEAT = {
    "beef", "pork", "chicken", "lamb", "duck", "turkey", "bacon", "prosciutto",
    "liver", "kidney", "bone_marrow", "ground_beef",
}
SEAFOOD = {
    "sardine", "salmon", "mackerel", "herring", "anchovy", "cod", "cod_liver",
    "oyster", "clam", "shrimp", "tuna", "natto",
}
DAIRY = {"butter", "cream", "milk", "yogurt", "cheese", "egg", "duck_egg", "quail_egg",
         "parmesan_cheese", "feta_cheese", "goat_cheese", "cottage_cheese"}
GRAINS = {"rice", "brown_rice", "basmati_rice", "pasta", "bread", "oat", "quinoa", "noodle"}
LEGUMES = {"lentil", "chickpea", "black_bean", "kidney_bean", "tofu", "tempeh"}
VEGETABLES = {
    "spinach", "kale", "broccoli", "tomato", "onion", "garlic", "carrot", "celery",
    "potato", "sweet_potato", "zucchini", "cabbage", "cucumber", "bell_pepper",
    "mushroom", "shiitake_mushroom", "asparagus", "cauliflower", "leek", "scallion",
    "shallot", "parsley", "basil", "ginger",
}
PANTRY = {
    "olive_oil", "butter", "sesame_oil", "coconut_oil", "ghee", "miso", "soy_sauce",
    "light_soy_sauce", "fish_sauce", "honey", "vinegar", "balsamic_vinegar",
    "cumin", "turmeric", "salt", "black_pepper", "white_pepper", "kimchi",
    "seaweed", "nori", "wakame", "kombu", "chicken_broth", "red_wine",
}
NUTS = {"walnut", "almond", "pecan", "cashew", "peanut", "hazelnut", "chia_seed",
        "flaxseed", "hemp_seed", "pumpkin_seed", "sunflower_seed"}


def categorize(ingredient_id: str) -> str:
    if ingredient_id in MEAT:
        return "Meat & Offal"
    if ingredient_id in SEAFOOD:
        return "Fish & Seafood"
    if ingredient_id in DAIRY:
        return "Dairy & Eggs"
    if ingredient_id in GRAINS:
        return "Grains & Starches"
    if ingredient_id in LEGUMES:
        return "Legumes & Soy"
    if ingredient_id in VEGETABLES:
        return "Vegetables & Herbs"
    if ingredient_id in PANTRY:
        return "Pantry & Ferments"
    if ingredient_id in NUTS:
        return "Nuts & Seeds"
    if "oil" in ingredient_id:
        return "Oils & Fats"
    if "cheese" in ingredient_id:
        return "Dairy & Eggs"
    if any(k in ingredient_id for k in ("pepper", "chili", "spice", "herb")):
        return "Spices & Herbs"
    if any(k in ingredient_id for k in ("fish", "seafood", "shrimp", "crab")):
        return "Fish & Seafood"
    if any(k in ingredient_id for k in ("meat", "beef", "pork", "chicken", "liver")):
        return "Meat & Offal"
    return "Other"


def export():
    ingredients_df = pf.get_ingredients_df()
    nutrients_df = pf.get_drv_df()

    # Only export ingredients with USDA backing
    ingredients_df = ingredients_df[ingredients_df["source_count"].fillna(0) > 0].copy()
    ingredients_df["food_category"] = ingredients_df["ingredient_id"].map(categorize)
    ingredients_df["portion_unit_name"] = ""
    ingredients_df["portion_gram_weight"] = ""

    # Rename for frontend compatibility
    out = ingredients_df.rename(columns={"ingredient_id": "foodName"})
    out["foodName"] = out["foodName"].astype(str)

    nutrient_cols = nutrients_df["nutrientName"].tolist()
    meta_cols = ["foodName", "display_name", "food_category", "portion_unit_name",
                 "portion_gram_weight", "source_count"]
    out = out[meta_cols + [c for c in nutrient_cols if c in out.columns]]

    out.to_csv("fooddata.csv", index=False)
    nutrients_df.to_csv("nutrients.csv", index=False)
    print(f"Exported {len(out)} ingredients")


if __name__ == "__main__":
    export()
