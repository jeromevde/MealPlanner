
#%%
import itables


import pyfooda as pf
fooddata_df = pf.get_fooddata_df()
itables.show(fooddata_df, column_filters="header", maxBytes="1MB")


categories = [

]

fooddata_df = fooddata_df[fooddata_df["food_category"].isin(categories)]
