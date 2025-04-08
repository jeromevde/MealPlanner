
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




1) IMPROVE CODE
- make foodData keys lowercase & lowercase the access to it
- fix link formatting and encoding, not satisfying
- restructure
- create a components for
    - meals
    - agg-ingredients (adapt clicklisteners etc)
- separated css for components
- improve layout after restructuring (for example the #meals amounts)

2) IMROVE DATA
- find missing foods & nutrients ?

3) IMPROVE MEALS
- cleanup & improve all recipes

4) OPTIONAL
- save state with cookies ? If posssible, then add also a refresh state button
- save state to url with code (day,meal,version,#people)
    --> state to url
    --> url to state on render



