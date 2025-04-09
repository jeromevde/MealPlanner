
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
- remove aggregation function from index.html
- improve layout after restructuring (for example the #meals amounts)
- make the first day of recipes unitary person

2) IMROVE DATA
- find missing foods & nutrients ?

3) IMPROVE MEALS
- cleanup & improve all recipes

4) OPTIONAL
- save state with cookies ? If posssible, then add also a refresh state button
- save state to url with code (day,meal,version,#people)
    --> state to url
    --> url to state on render



