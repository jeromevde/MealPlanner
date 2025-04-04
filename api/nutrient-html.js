import * as foodapi from './api.js';

class NutrientHtml extends HTMLElement {
  static get observedAttributes() {
    return ['food-list'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .nutrient-list {
          max-height: 400px; overflow-y: auto; text-align: left; margin-top: 15px;
        }
        .category-section {
          margin-bottom: 20px; padding: 10px; border: 1px solid #ddd;
          border-radius: 8px; background: #f9f9f9;
        }
        .category-title {
          font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #333;
        }
        .nutrient-item {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px; font-size: 14px;
        }
        .nutrient-name { width: 180px; font-weight: bold; }
        .progress-bar-container {
          width: 200px; background: #eee; border-radius: 5px; height: 14px; overflow: hidden;
        }
        .progress-bar { height: 100%; background: lightgreen; transition: width: 0.5s ease-in-out; }
        .nutrient-value { width: 150px; text-align: right; font-size: 12px; color: #555; }
      </style>
      <div id="nutrient-content"></div>
    `;
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'food-list' && newValue !== oldValue) {
      const foodList = JSON.parse(newValue);
      if (foodList.length > 0) {
        await this.renderNutrients(foodList);
      } else {
        this.shadowRoot.querySelector('#nutrient-content').innerHTML = '<p>No food data</p>';
      }
    }
  }

  async renderNutrients(foodList) {
    const contentDiv = this.shadowRoot.querySelector('#nutrient-content');
    contentDiv.innerHTML = '';

    await foodapi.ensureDataLoaded();

    // Aggregate nutrients from all food items
    const aggregatedNutrients = {};
    for (const { foodName, quantity } of foodList) {
      const normalizedFoodName = foodName.toLowerCase();
      const foodKey = Object.keys(foodapi.foodData).find(
        (key) => key.toLowerCase() === normalizedFoodName
      );
      if (foodKey) {
        const nutrients = foodapi.foodData[foodKey].nutrients;
        const scaleFactor = parseFloat(quantity) / 100;
        Object.entries(nutrients).forEach(([name, details]) => {
          const scaledAmount = parseFloat(details.amount) * scaleFactor;
          if (!aggregatedNutrients[name]) {
            aggregatedNutrients[name] = { ...details, totalAmount: 0 };
          }
          aggregatedNutrients[name].totalAmount += scaledAmount;
        });
      }
    }

    // Organize nutrients by category
    const nutrientsByCategory = {};
    Object.entries(aggregatedNutrients).forEach(([name, details]) => {
      const cat = details.category || 'Other';
      nutrientsByCategory[cat] = nutrientsByCategory[cat] || [];
      nutrientsByCategory[cat].push({
        name,
        ...details,
        amount: details.totalAmount.toFixed(2),
      });
    });

    // Set the header dynamically
    let header;
    if (foodList.length === 1) {
      const { foodName, quantity } = foodList[0];
      const normalizedFoodName = foodName.toLowerCase();
      const foodKey = Object.keys(foodapi.foodData).find(
        (key) => key.toLowerCase() === normalizedFoodName
      );
      const foodCategory = foodKey ? foodapi.foodData[foodKey].category : 'Unknown';
      header = `<h2>${quantity}g of ${foodName} (${foodCategory})</h2>`;
    } else {
      header = `<h2>Normalized nutrients of the selected plan</h2>`;
    }

    // Generate nutrient HTML using the single-food structure
    const nutrientHtml = Object.entries(nutrientsByCategory)
      .map(([category, catNutrients]) => `
        <div class="category-section">
          <div class="category-title">${category}</div>
          ${catNutrients
            .map((n) => {
              const amountValue = parseFloat(n.amount);
              const drvValue = parseFloat(n.drv);
              const percentage =
                !isNaN(amountValue) && !isNaN(drvValue) && drvValue > 0
                  ? Math.min((amountValue / drvValue) * 100, 100)
                  : 0;
              return `
                <div class="nutrient-item">
                  <span class="nutrient-name">${n.name}</span>
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%;"></div>
                  </div>
                  <span class="nutrient-value">${n.amount} ${n.unit} / ${n.drv || 'N/A'} ${n.unit}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      `)
      .join('');

    contentDiv.innerHTML = `${header}<div class="nutrient-list">${nutrientHtml}</div>`;
  }
}

customElements.define('nutrient-html', NutrientHtml);