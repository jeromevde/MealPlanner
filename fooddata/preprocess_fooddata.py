#%%

import pandas as pd
import json

def load_and_merge_data(fooddata_folder):
    """Load and merge food, nutrient, and portion data from CSV files."""
    # Load food data and merge with category descriptions
    food_df = pd.read_csv(f'{fooddata_folder}/food.csv')
    food_category_df = pd.read_csv(f'{fooddata_folder}/food_category.csv').rename(
        columns={"id": "category_id", "description": "category_description"}
    )
    food_df = pd.merge(food_df, food_category_df[['category_id', 'category_description']],
                       left_on='food_category_id', right_on='category_id', how='left')
    
    # Use all foods (optionally filter for foundation foods by uncommenting)
    foundation_foods = food_df  # or food_df[food_df['data_type'] == 'foundation_food']
    
    # Merge with nutrient data
    food_nutrient_df = pd.read_csv(f'{fooddata_folder}/food_nutrient.csv')
    nutrient_df = pd.read_csv('nutrients_with_categories_and_drv.csv').rename(
        columns={"id": "nutrient_id"}
    )
    nutrient_df["nutrient_order"] = nutrient_df.index
    foundation_nutrients = pd.merge(foundation_foods, food_nutrient_df, on='fdc_id', how='left')
    foundation_nutrients = pd.merge(foundation_nutrients, nutrient_df, on='nutrient_id', how='left')
    
    # Merge with portion data
    food_portion_df = pd.read_csv(f'{fooddata_folder}/food_portion.csv')
    food_portion_df = food_portion_df.rename(
        columns={"amount": "portion_amount", "gram_weight": "portion_gram_weight"}
    )
    measure_unit_df = pd.read_csv(f'{fooddata_folder}/measure_unit.csv')
    measure_unit_df = measure_unit_df.rename(
        columns={"id": "measure_unit_id", "name": "portion_unit_name"}
    )
    food_portion_df = pd.merge(food_portion_df, measure_unit_df, on='measure_unit_id', how='left')
    food_portion_df["portion_gram_weight"] = food_portion_df["portion_gram_weight"] / food_portion_df["portion_amount"]
    food_portion_df = food_portion_df[["fdc_id", "portion_gram_weight", "portion_unit_name"]]
    foundation_nutrients = foundation_nutrients.merge(food_portion_df, on="fdc_id", how="left")
    
    return foundation_nutrients

def clean_and_process_data(df):
    """Clean and aggregate the merged data."""
    # Clean nutrient names by removing parentheses and content after commas
    df['name'] = df['name'].str.replace(r'\s*\(.*\)', '', regex=True)
    df['name'] = df['name'].str.split(',').str[0].str.strip()
    
    # Aggregate to handle duplicates
    df = df.groupby(['description', 'name'], sort=False).agg({
        'amount': 'mean',
        'unit_name': 'first',
        'category': 'first',
        'drv': 'max',
        'category_description': 'first',
        'nutrient_order': 'first',
        'portion_unit_name': 'first',
        'portion_gram_weight': 'first',
    }).reset_index()
    
    # Strip leading/trailing spaces from food descriptions for consistency
    df['description'] = df['description'].str.strip()
    
    # Lowercase unit names
    df['unit_name'] = df['unit_name'].str.lower()
    
    # Sort by description and nutrient order
    df = df.sort_values(by=['description', 'nutrient_order'])
    
    # Set missing values to "N/A"
    df['amount'] = df['amount'].fillna('N/A')
    df['portion_gram_weight'] = df['portion_gram_weight'].fillna('N/A')
    
    # Remove nutrients without DRV
    df = df[df['drv'].notna()]
    
    # Ensure no duplicates remain
    df = df.drop_duplicates(subset=['description', 'name'])
    
    return df

def filter_foods(df, min_nutrients=None):
    """Filter foods to include only those with at least min_nutrients non-missing nutrients."""
    if min_nutrients is None:
        return df
    # Count non-'N/A' nutrients per food
    nutrient_counts = df[df['amount'] != 'N/A'].groupby('description').size()
    selected_foods = nutrient_counts[nutrient_counts >= min_nutrients].index
    return df[df['description'].isin(selected_foods)]

def create_json_dict(df):
    """Create a dictionary for JSON output from the processed DataFrame."""
    final_dict = {}
    for description, group in df.groupby('description'):
        category_desc = group['category_description'].iloc[0]
        portion_unit_name = group['portion_unit_name'].iloc[0]
        portion_gram_weight = group['portion_gram_weight'].iloc[0]
        
        group = group.set_index('name')
        nutrients = group[['amount', 'unit_name', 'category', 'drv']].to_dict(orient='index')
        final_dict[description] = {
            'category': category_desc,
            'portion_unit_name': portion_unit_name,
            'portion_gram_weight': portion_gram_weight,
            'nutrients': nutrients
        }
    return final_dict

def create_csv(final_dict, output_csv):
    """Create a CSV file from the JSON dictionary."""
    # Collect unique nutrient attributes
    nutrient_attrs = {}
    for food in final_dict:
        for nutrient, details in final_dict[food]['nutrients'].items():
            if nutrient not in nutrient_attrs:
                category = details['category']
                drv = details['drv']
                unit_name = details['unit_name']
                nutrient_attrs[nutrient] = f"{category}|{drv}|{unit_name}"
    
    # Create rows for CSV
    rows = []
    for food in final_dict:
        row = {
            'food_name': food,  # Already stripped in clean_and_process_data
            'category': final_dict[food]['category'],
            'portion_unit_name': final_dict[food]['portion_unit_name'],
            'portion_gram_weight': final_dict[food]['portion_gram_weight'],
        }
        for nutrient, attr in nutrient_attrs.items():
            col_name = f"{nutrient}|{attr}"
            if nutrient in final_dict[food]['nutrients']:
                row[col_name] = final_dict[food]['nutrients'][nutrient]['amount']
            else:
                row[col_name] = None  # Missing nutrient
        rows.append(row)
    
    # Create DataFrame and save to CSV
    df = pd.DataFrame(rows)
    df.to_csv(output_csv, index=False, na_rep='')

def main(fooddata_folder, min_nutrients, output_json, output_csv):
    """Main function to process food data and generate JSON and CSV outputs."""
    # Load and merge data
    df = load_and_merge_data(fooddata_folder)
    
    # Clean and process data
    df = clean_and_process_data(df)
    
    # Apply filter based on minimum number of non-missing nutrients
    df = filter_foods(df, min_nutrients)
    print(f"Selected {len(df['description'].unique())} foods with at least {min_nutrients} non-missing nutrients.")
    
    # Create JSON dictionary and write to file
    json_dict = create_json_dict(df)
    with open(output_json, 'w') as fp:
        json.dump(json_dict, fp)
    
    # Create and write CSV
    create_csv(json_dict, output_csv)

# Run the script
if __name__ == "__main__":
    main('FoodData_Central_October_2024', 10, '../data/fooddata.json', '../data/fooddata.csv')
# %%

main('/Users/jf41043/Downloads/FoodData_Central_csv_2024-10-31', 10, '../data/fooddata.json', '../data/fooddata.csv')

# %%
