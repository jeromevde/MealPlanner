
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




1)
- restructure, creatre components for the meals
- separated css for comonents
- improve layout after restructuring (for example the #meals amounts)


2)
- improve nutrient data & display
- improve portions data & display

3)
- cleanup & improve all recipes

4)
- save state with cookies ? If posssible, then add also a refresh state button
- save state to url with code (day,meal,version,#people)
    --> state to url
    --> url to state on render
