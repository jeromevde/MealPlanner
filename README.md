
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



1))PREPROCESSING:
- improve precesssing data
    - empty drv's ?
    - more foods
    - include all nutrients for every food
    - units better displayed 
    - ordering of the nutrient categories
    - aggregated some of the nutrients (pufa)
    - rename some of the nutrients (vitamin C)
    - add grams to unit conversion of the food to the ingredient nutrient poup

2)
- restructure, creatre components for the meals
- separated css for comonents
- improve layout after restructuring (for example the #meals amounts)


3)FINISHING TOUCHES:
- save state with cookies ? If posssible, then add also a refresh state button
- save state to url with code (day,meal,version,#people)
    --> state to url
    --> url to state on render
- cleanup & improve all recipes