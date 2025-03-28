#%%
import pandas as pd

# Read the CSV files
food_df = pd.read_csv('FoodData_Central_October_2024/food.csv')
food_nutrient_df = pd.read_csv('FoodData_Central_October_2024/food_nutrient.csv')
nutrient_df = pd.read_csv('nutrients_with_categories_and_drv.csv')
food_category_df = pd.read_csv('FoodData_Central_October_2024/food_category.csv')

# Rename 'description' in food_category_df to 'category_description' to avoid confusion
food_category_df = food_category_df.rename(columns={'description': 'category_description'})

# Merge food_df with food_category_df to add the food category
food_df = pd.merge(food_df, food_category_df[['id', 'category_description']],
 left_on='food_category_id', right_on='id', how='left')

# Filter for foundation foods
foundation_foods = food_df[food_df['data_type'] == 'foundation_food']

# Merge food data with nutrient data
foundation_nutrients = pd.merge(foundation_foods, food_nutrient_df, on='fdc_id', how='left')
foundation_nutrients = pd.merge(foundation_nutrients, nutrient_df, left_on='nutrient_id', right_on='id', how='inner')

# Aggregate data to handle duplicates, including the food category
nutrient_data = foundation_nutrients.groupby(['description', 'name']).agg({
 'amount': 'mean', # Average amount if multiple entries
 'unit_name': 'first', # Take the first unit (should be consistent)
 'category': 'first', # Nutrient category from CSV
 'drv': 'first', # DRV from CSV
 'category_description': 'first' # Food category description
}).reset_index()

# Construct the final dictionary with category and nutrients
final_dict = {}
for description, group in nutrient_data.groupby('description'):
 category_desc = group['category_description'].iloc[0] # Same for all rows in the group
 group = group.rename(columns={'unit_name': 'unit'}) # Rename unit_name to unit
 group = group.set_index('name') # Set nutrient name as index
 nutrients = group[['amount', 'unit', 'category', 'drv']].to_dict(orient='index')
 final_dict[description] = {
 'category': category_desc,
 'nutrients': nutrients
 }

import json

with open('fooddata.json', 'w') as fp:
 json.dump(final_dict, fp)
#%%