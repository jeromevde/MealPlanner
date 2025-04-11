import * as foodapi from './api.js';

class AggregatedFoodItems extends HTMLElement {
  static get observedAttributes() {
    return ['food-list'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .categories-wrapper {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }
        .category-section {
          flex: 1;
          min-width: 200px; /* Ensures categories don’t get too narrow */
          display: flex;
          flex-direction: column;
        }
        .food-items-container {
          display: flex;
          flex-direction: column;
          gap: 10px; /* Adds space between food items */
        }
      </style>
      <div id="food-content"></div>
    `;
    const linkElem = document.createElement('link');
    linkElem.setAttribute('rel', 'stylesheet');
    const cssUrl = new URL('./aggregated-food-items.css', import.meta.url).href;
    linkElem.setAttribute('href', cssUrl);
    this.shadowRoot.appendChild(linkElem);
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'food-list' && newValue !== oldValue) {
      const foodList = JSON.parse(newValue);
      await this.aggregateAndRender(foodList);
    }
  }

  async aggregateAndRender(foodList) {
    const contentDiv = this.shadowRoot.querySelector('#food-content');
    if (foodList.length === 0) {
      contentDiv.innerHTML = '<p>No food items</p>';
      return;
    }

    await foodapi.ensureDataLoaded();

    // Aggregate quantities for each food item
    const aggregatedFoods = new Map();
    for (const { foodName, quantity } of foodList) {
      const normalizedFoodName = foodName.toLowerCase();
      const foodKey = Object.keys(foodapi.foodData).find(
        (key) => key === normalizedFoodName
      ) || normalizedFoodName;
      const currentTotal = aggregatedFoods.get(foodKey) || 0;
      aggregatedFoods.set(foodKey, currentTotal + parseFloat(quantity));
    }

    // Group by category
    const foodsByCategory = {};
    for (const [foodKey, totalQuantity] of aggregatedFoods) {
      const category = foodapi.foodData[foodKey]?.category || 'Other';
      if (!foodsByCategory[category]) {
        foodsByCategory[category] = [];
      }
      foodsByCategory[category].push({ foodName: foodKey, totalQuantity });
    }

    this.render(foodsByCategory);
  }

  render(foodsByCategory) {
    const contentDiv = this.shadowRoot.querySelector('#food-content');
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