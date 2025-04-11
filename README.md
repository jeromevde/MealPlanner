
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

 IMPROVE CODE
- make foodData keys lowercase & lowercase the access to it
- remove aggregation function from index.html
- add "for 1 person to title of meal"

 IMROVE DATA
- find missing foods & nutrients ?

OPTIONAL
- fix broken link logic & cookies (& move it to a separate .js file for clarity)
- add a selector of meals in the aggregation componenent
- add a displayer of meals in the ingredients aggregation component
- add a displayer of meals & ingredients in the nutrients list
- modify the meal-element component to adapt to changing #people for that meal
- add checkbox button in front of the aggregated ingredients
- zoom in zoom out text recipe
- link to githubdev to adapt recipes
