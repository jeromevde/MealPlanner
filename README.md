
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

Todo
- block nutrient popup within parent popup -> by moving it to the meal-element and calling function from there
- copy link mealplan button (it's enough, no need for share)
- make mealplanner full screen in pc mode

OPTIONAL
- add a selector of meals in the aggregation componenent
- add a displayer of meals in the ingredients aggregation component
- add a displayer of meals & ingredients in the nutrients list
