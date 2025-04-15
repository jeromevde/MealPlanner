#%%
import pandas as pd
from itertools import product
import json

fooddata_folder = "FoodData_Central_October_2024"

# Merge food data with category descriptions
food_df = pd.read_csv(f'{fooddata_folder}/food.csv')
food_category_df = pd.read_csv(f'{fooddata_folder}/food_category.csv').rename(columns={"id":"category_id", "description": "category_description"})
food_df = pd.merge(food_df, food_category_df[['category_id', 'category_description']],
                   left_on='food_category_id', right_on='category_id', how='left')

# Filter for foundation foods
# foundation_foods = food_df[food_df['data_type'] == 'foundation_food']
foundation_foods = food_df

# Merge food data with nutrient data
food_nutrient_df = pd.read_csv(f'{fooddata_folder}/food_nutrient.csv')
nutrient_df = pd.read_csv('nutrients_with_categories_and_drv.csv').rename(columns={"id":"nutrient_id"})
nutrient_df["nutrient_order"] = nutrient_df.index
foundation_nutrients = pd.merge(foundation_foods, food_nutrient_df, on='fdc_id', how='left')
foundation_nutrients = pd.merge(foundation_nutrients, nutrient_df, on='nutrient_id', how='left')


# remove paranthesis content
foundation_nutrients['name'] = foundation_nutrients['name'].str.replace(r'\s*\(.*\)', '', regex=True)
# remove anything after comma's
foundation_nutrients['name'] = foundation_nutrients['name'].str.split(',').str[0].str.strip()


# get the portions of the foods
food_portion_df = pd.read_csv(f'{fooddata_folder}/food_portion.csv')
food_portion_df = food_portion_df.rename(columns={"amount": "portion_amount", 
                                                  "gram_weight": "portion_gram_weight"})
measure_unit_df = pd.read_csv(f'{fooddata_folder}/measure_unit.csv')
measure_unit_df = measure_unit_df.rename(columns={"id": "measure_unit_id", "name": "portion_unit_name"})
food_portion_df = pd.merge(food_portion_df, measure_unit_df, on='measure_unit_id', how='left')
# get unit portions for every row -> divide by portion amount
food_portion_df["portion_gram_weight"] = food_portion_df["portion_gram_weight"] / food_portion_df["portion_amount"]
food_portion_df  = food_portion_df[["fdc_id", 
                                   "portion_gram_weight", 
                                   "portion_unit_name"]]
foundation_nutrients = foundation_nutrients.merge(food_portion_df, on="fdc_id", how="left")


#%%

# Aggregate nutrient data to handle duplicates (for example energy) in the original dataset
foundation_nutrients = foundation_nutrients.groupby(['description', 'name'], sort=False).agg({
    'amount': 'mean',          # Average amount if multiple entries exist
    'unit_name': 'first',      # Take the first unit (assuming consistency)
    'category': 'first',       # Nutrient category
    'drv': 'max',            # DRV value
    'category_description': 'first',  # Food category description,
    'nutrient_order': 'first',
    'portion_unit_name': 'first',
    'portion_gram_weight': 'first',
}).reset_index()

# Lowercase unit names
foundation_nutrients['unit_name'] = foundation_nutrients['unit_name'].str.lower()

foundation_nutrients = foundation_nutrients.sort_values(by=['description', 'nutrient_order'])



#%%

# Set missing amounts to "N/A"
foundation_nutrients['amount'] = foundation_nutrients['amount'].fillna('N/A')
foundation_nutrients['portion_gram_weight'] = foundation_nutrients['portion_gram_weight'].fillna('N/A')

# remove nutrients without drv
foundation_nutrients = foundation_nutrients[foundation_nutrients['drv'].notna()]

# Remove duplicates of 'description' and 'name' pairs (safety step, should already be unique)
final_data = foundation_nutrients.drop_duplicates(subset=['description', 'name'])

#%%
# Construct the final dictionary
final_dict = {}
for description, group in final_data.groupby('description'):
    category_desc = group['category_description'].iloc[0]  
    portion_unit_name = group['portion_unit_name'].iloc[0]
    portion_gram_weight = group['portion_gram_weight'].iloc[0]

    group = group.set_index('name')
    
    # Convert nutrient details to dictionary
    nutrients = group[['amount', 'unit_name', 'category', 'drv']].to_dict(orient='index')
    final_dict[description] = {
        'category': category_desc,
        'portion_unit_name': portion_unit_name,
        'portion_gram_weight': portion_gram_weight,
        'nutrients': nutrients
    }




# %%
# Write to JSON file
with open('../data/fooddata.json', 'w') as fp:
    json.dump(final_dict, fp)

#%% 
# write to CSV file

import pandas as pd

# Step 1: Collect unique nutrient attributes
nutrient_attrs = {}
for food in final_dict:
    for nutrient, details in final_dict[food]['nutrients'].items():
        if nutrient not in nutrient_attrs:
            category = details['category']
            drv = details['drv']
            unit_name = details['unit_name']
            nutrient_attrs[nutrient] = f"{category}|{drv}|{unit_name}"

# Step 2: Create rows for each food item
rows = []
for food in final_dict:
    # General food information
    row = {
        'food_name': food.strip(),  # Removes leading/trailing spaces (optional)
        'category': final_dict[food]['category'],
        'portion_unit_name': final_dict[food]['portion_unit_name'],
        'portion_gram_weight': final_dict[food]['portion_gram_weight'],
    }
    # Add nutrient amounts for each unique nutrient
    for nutrient, attr in nutrient_attrs.items():
        col_name = f"{nutrient}|{attr}"
        if nutrient in final_dict[food]['nutrients']:
            row[col_name] = final_dict[food]['nutrients'][nutrient]['amount']
        else:
            row[col_name] = None  # Missing nutrient
    rows.append(row)

# Step 3: Create DataFrame and save to CSV
df = pd.DataFrame(rows)

min_nutrients = 10

if min_nutrients:
    general_columns = ['food_name', 'category', 'portion_unit_name', 'portion_gram_weight']
    nutrient_columns = [col for col in df.columns if col not in general_columns]
    df = df[df[nutrient_columns].notna().sum(axis=1) >= min_nutrients]



df.to_csv('../data/fooddata.csv', index=False, na_rep='')



# %%
