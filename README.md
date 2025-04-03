
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

- fix click in touch mode

- fix nutrient poup gravity
- click outside closes popup's
- layout of aggregations needs to improve
- add number of people normalization to the meal squares
- add modifyable quantities to the aggregated foods
- add calory normalization to the nutrient popup
- add grams to unit conversion of the food to the ingredient nutrient poup

- improve precesssing data
    - more foods
    - include all nutrients for every food
    - units better displayed 
    - drv's 
    - ordering of the nutrient categories
    - aggregated some of the nutrients (pufa)
    - rename some of the nutrients (vitamin C)


- cleanup & improve all recipes