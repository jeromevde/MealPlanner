
## Setup




## install local dev server

```
npm install -g live-server
```

## Run local dev server (automatic rebuild when files change)
### Mount it at the same path as your github pages setup
```
live-server --mount=/MealPlanner:.
```


TODO

1)AGGREGATIONS:
+ add number of people normalization to the meal squares
+ add modifyable quantities to the aggregated foods
+ add calory normalization to the nutrient popup


2)PREPROCESSING:
- improve precesssing data
    - empty drv's ?
    - more foods
    - include all nutrients for every food
    - units better displayed 
    - ordering of the nutrient categories
    - aggregated some of the nutrients (pufa)
    - rename some of the nutrients (vitamin C)
    - add grams to unit conversion of the food to the ingredient nutrient poup


3)FINISHING TOUCHES:
- add layout rules compatible on phone
- save state with cookies ? If posssible, then add also a refresh state button
- cleanup & improve all recipes