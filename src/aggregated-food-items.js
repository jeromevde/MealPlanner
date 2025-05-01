import * as foodapi from './api.js';

class AggregatedFoodItems extends HTMLElement {
  static get observedAttributes() {
    return ['food-list'];
  }

  constructor() {
    super();
    this.innerHTML = `
      <div id="food-content"></div>
    `;
    const linkElem = document.createElement('link');
    linkElem.setAttribute('rel', 'stylesheet');
    const cssUrl = new URL('./aggregated-food-items.css', import.meta.url).href;
    linkElem.setAttribute('href', cssUrl);
    this.appendChild(linkElem);
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'food-list' && newValue !== oldValue) {
      const foodList = JSON.parse(newValue);
      await this.aggregateAndRender(foodList);
    }
  }

  async aggregateAndRender(foodList) {
    const contentDiv = this.querySelector('#food-content');
    if (foodList.length === 0) {
      contentDiv.innerHTML = '<p>No food items</p>';
      return;
    }

    await foodapi.ensureDataLoaded();

    // Aggregate quantities for each food item
    const aggregatedFoods = new Map();
    for (const { foodName, quantity } of foodList) {
      const currentTotal = aggregatedFoods.get(foodName) || 0;
      aggregatedFoods.set(foodName, currentTotal + parseFloat(quantity));
    }

    // Group by category
    const foodsByCategory = {};
    for (const [foodKey, totalQuantity] of aggregatedFoods) {
      const category = foodapi.get_category(foodKey);
      if (!foodsByCategory[category]) {
        foodsByCategory[category] = [];
      }
      foodsByCategory[category].push({ foodName: foodKey, totalQuantity });
    }

    this.render(foodsByCategory);
  }

  render(foodsByCategory) {
    const contentDiv = this.querySelector('#food-content');
    const sortedCategories = Object.keys(foodsByCategory).sort();

    const html = `
      <div class="food-list">
        <h2>Ingredients to buy</h2>
        <div class="categories-wrapper">
          ${sortedCategories
            .map((category) => `
              <div class="category-section">
                <div class="category-title">${category}</div>
                <div class="food-items-container">
                  ${foodsByCategory[category]
                    .map((food) => `
                      <div class="food-item">
                        <food-nutrient-link 
                          food-list='${JSON.stringify([{ foodName: food.foodName, quantity: food.totalQuantity }])}' 
                          display-mode="name-only">
                        </food-nutrient-link>
                      </div>
                    `)
                    .join('')}
                </div>
              </div>
            `)
            .join('')}
        </div>
      </div>
    `;
    contentDiv.innerHTML = html;
  }
}

customElements.define('aggregated-food-items', AggregatedFoodItems);

// --- Aggregation logic moved from index.html ---
window.updateAggregations = function updateAggregations() {
  const aggregatedFoodDisplay = document.getElementById('aggregated-food-display');
  const aggregatedNutrientsDisplay = document.getElementById('aggregated-nutrients-display');
  const allFoodItems = [];
  for (const [mealKey, quantity] of foodapi.mealQuantities) {
    if (quantity > 0) {
      const [day, mealTime, version] = mealKey.split('-');
      const content = foodapi.data[day][mealTime][version].content;
      const ingredients = parseIngredients(content);
      for (const [ingQuantity, ingredientName] of ingredients) {
        const totalQuantity = ingQuantity * quantity;
        allFoodItems.push({ foodName: ingredientName, quantity: totalQuantity });
      }
    }
  }
  aggregatedFoodDisplay.setAttribute('food-list', JSON.stringify(allFoodItems));
  aggregatedNutrientsDisplay.setAttribute('food-list', JSON.stringify(allFoodItems));
  // Encode and save state
  if (window.saveState) window.saveState(foodapi.mealQuantities, foodapi.days, foodapi.meals);
};

function parseIngredients(content) {
  const matches = [];
  for (const [quantity, ingredientName, originalText] of foodapi.parseIngredients(content)) {
    matches.push([quantity, ingredientName]);
  }
  return matches;
}