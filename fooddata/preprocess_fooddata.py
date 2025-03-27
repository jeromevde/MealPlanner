#%%
import pandas as pd

# Function to categorize nutrients based on the provided list
def get_nutrient_category(name):
    name_lower = name.lower()
    
    # Vitamins
    if "vitamin" in name_lower or any(v in name_lower for v in ["retinol", "carotene", "tocopherol", 
                                                               "tocotrienol", "thiamin", "riboflavin", 
                                                               "niacin", "pantothenic", "pyridox", 
                                                               "biotin", "folate", "folic", "choline", 
                                                               "ascorbic", "menaquinone", "phylloquinone"]):
        return "Vitamins"
    
    # Minerals
    elif any(mineral in name_lower for mineral in ["calcium", "iron", "magnesium", "phosphorus", 
                                                   "potassium", "sodium", "zinc", "copper", 
                                                   "manganese", "selenium", "chromium", "cobalt", 
                                                   "fluoride", "iodine", "molybdenum", "chlorine", 
                                                   "sulfur", "aluminum", "antimony", "arsenic", 
                                                   "barium", "beryllium", "boron", "bromine", 
                                                   "cadmium", "gold", "lead", "lithium", "mercury", 
                                                   "nickel", "rubidium", "salt", "silicon", "silver", 
                                                   "strontium", "tin", "titanium", "vanadium"]):
        return "Minerals"
    
    # Proteins (including amino acids)
    elif "protein" in name_lower or any(aa in name_lower for aa in ["tryptophan", "threonine", "isoleucine", 
                                                                    "leucine", "lysine", "methionine", "cystine", 
                                                                    "phenylalanine", "tyrosine", "valine", "arginine", 
                                                                    "histidine", "alanine", "aspartic", "glutamic", 
                                                                    "glycine", "proline", "serine", "hydroxyproline", 
                                                                    "cysteine", "glutamine", "taurine", "asparagine"]):
        return "Proteins"
    
    # Lipids
    elif any(lipid in name_lower for lipid in ["lipid", "fat", "fatty acid", "cholesterol", "glyceride", 
                                               "phospholipid", "glycolipid", "phytosterol", "sterol", 
                                               "sfa", "mufa", "pufa", "tfa"]):
        return "Lipids"
    
    # Carbs
    elif any(carb in name_lower for carb in ["carbohydrate", "sugar", "fiber", "starch", "sucrose", 
                                             "glucose", "fructose", "lactose", "maltose", "amylose", 
                                             "amylopectin", "pectin", "pentosan", "pentose", 
                                             "hemicellulose", "cellulose", "glycogen", "oligosaccharide", 
                                             "arabinose", "xylose", "galactose", "raffinose", "stachyose", 
                                             "xylitol", "lignin", "ribose", "mannitol", "sorbitol", 
                                             "mannose", "triose", "tetrose", "inulin"]):
        return "Carbs"
    
    # Energy
    elif "energy" in name_lower:
        return "Energy"
    
    # Other (catch-all for remaining nutrients)
    else:
        return "Other"

# Read the CSV files
food_df = pd.read_csv('food.csv')
food_nutrient_df = pd.read_csv('food_nutrient.csv')
nutrient_df = pd.read_csv('nutrient.csv')

# Filter for foundation foods
foundation_foods = food_df[food_df['data_type'] == 'foundation_food']

# Merge food data with nutrient data
foundation_nutrients = pd.merge(foundation_foods, food_nutrient_df, on='fdc_id', how='left')
foundation_nutrients = pd.merge(foundation_nutrients, nutrient_df, left_on='nutrient_id', right_on='id', how='inner')

# Add nutrient category
foundation_nutrients['category_of_nutrient'] = foundation_nutrients['name'].apply(get_nutrient_category)

# Aggregate data to handle duplicates
nutrient_data = foundation_nutrients.groupby(['description', 'name']).agg({
    'amount': 'mean',              # Average amount if multiple entries
    'unit_name': 'first',          # Take the first unit (should be consistent)
    'category_of_nutrient': 'first' # Take the first category (should be consistent)
}).reset_index()

# Construct the final dictionary
final_dict = {}
for description, group in nutrient_data.groupby('description'):
    group = group.rename(columns={'unit_name': 'unit'})  # Rename unit_name to unit
    group = group.set_index('name')                      # Set nutrient name as index
    nutrients = group[['amount', 'unit', 'category_of_nutrient']].to_dict(orient='index')
    final_dict[description] = nutrients

import json

with open('fooddata.json', 'w') as fp:
    json.dump(final_dict, fp)
# %%
