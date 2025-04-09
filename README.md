
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


1) IMROVE DATA
- find missing foods & nutrients ?


2) IMPROVE CODE
- make foodData keys lowercase & lowercase the access to it
- fix link formatting and encoding, not satisfying
- remove aggregation function from index.html
- improve layout after restructuring (for example the #meals amounts)
- add "for 1 person to title of meal"


3) OPTIONAL
- fix broken link logic & cookies (& move it to a separate .js file for clarity)
- add a selector of meals in the aggregation componenent
- add a displayer of meals in the ingredients aggregation component
- modify the meal-element component to adapt to changing #people for that meal


