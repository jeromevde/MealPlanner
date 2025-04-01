// nutrient-html.js
import * as foodapi from './api.js'; // Replace with your actual API module path

class NutrientHtml extends HTMLElement {
  // Define which attributes to observe for changes
  static get observedAttributes() {
    return ['food-name'];
  }

  constructor() {
    super();
    // Attach a shadow DOM to encapsulate styles and content
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .nutrient-list {
          max-height: 400px;
          overflow-y: auto;
          text-align: left;
          margin-top: 15px;
        }
        .category-section {
          margin-bottom: 20px;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }
        .category-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
        }
        .nutrient-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .nutrient-name {
          width: 180px;
          font-weight: bold;
        }
        .progress-bar-container {
          width: 200px;
          background: #eee;
          border-radius: 5px;
          height: 14px;
          overflow: hidden;
        }
        .progress-bar {
          height: 100%;
          background: lightgreen;
          transition: width 0.5s ease-in-out;
        }
        .nutrient-value {
          width: 150px;
          text-align: right;
          font-size: 12px;
          color: #555;
        }
      </style>
      <div id="nutrient-content"></div>
    `;
  }

  // Handle changes to the 'food-name' attribute
  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'food-name' && newValue !== oldValue) {
      await this.renderNutrientHtml(newValue);
    }
  }

  // Fetch and render nutrient data based on the food name
  async renderNutrientHtml(foodName) {
    const contentDiv = this.shadowRoot.querySelector('#nutrient-content');
    contentDiv.innerHTML = ''; // Clear previous content

    // Ensure the API data is loaded (adjust based on your API)
    await foodapi.ensureDataLoaded();
    const normalizedFoodName = foodName.toLowerCase();
    const foodKey = Object.keys(foodapi.foodData).find(
      (key) => key.toLowerCase() === normalizedFoodName
    );

    if (!foodKey) {
      contentDiv.innerHTML = '<p>Food not found</p>';
      return;
    }

    const foodCategory = foodapi.foodData[foodKey].category;
    const nutrients = foodapi.foodData[foodKey].nutrients;

    // Group nutrients by category
    const nutrientsByCategory = {};
    Object.entries(nutrients).forEach(([name, details]) => {
      const cat = details.category || 'Other';
      nutrientsByCategory[cat] = nutrientsByCategory[cat] || [];
      nutrientsByCategory[cat].push({ name, ...details });
    });

    // Generate the HTML content
    const html = `
      <h2>${foodName} (${foodCategory})</h2>
      <div class="nutrient-list">
        ${Object.entries(nutrientsByCategory)
          .map(
            ([category, catNutrients]) => `
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
                  <span class="nutrient-value">${n.amount} ${n.unit} / ${
                  n.drv || 'N/A'
                } ${n.unit}</span>
                </div>
              `;
              })
              .join('')}
          </div>
        `
          )
          .join('')}
      </div>
    `;
    contentDiv.innerHTML = html;
  }
}

// Register the custom element
customElements.define('nutrient-html', NutrientHtml);