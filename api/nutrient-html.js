import * as foodapi from './api.js'; // Adjust the import path as needed

class NutrientHtml extends HTMLElement {
  static get observedAttributes() {
    return ['food-name', 'nutrients']; // Add 'nutrients' to observed attributes
  }

  constructor() {
    super();
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

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'food-name' && newValue !== oldValue) {
      await this.renderNutrientHtml(newValue);
    } else if (name === 'nutrients' && newValue !== oldValue) {
      this.renderAggregatedNutrients(JSON.parse(newValue));
    }
  }

  async renderNutrientHtml(foodName) {
    const contentDiv = this.shadowRoot.querySelector('#nutrient-content');
    contentDiv.innerHTML = '';

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

    const nutrientsByCategory = {};
    Object.entries(nutrients).forEach(([name, details]) => {
      const cat = details.category || 'Other';
      nutrientsByCategory[cat] = nutrientsByCategory[cat] || [];
      nutrientsByCategory[cat].push({ name, ...details });
    });

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

  renderAggregatedNutrients(nutrients) {
    const contentDiv = this.shadowRoot.querySelector('#nutrient-content');
    contentDiv.innerHTML = '';

    const nutrientsByCategory = {};
    Object.entries(nutrients).forEach(([name, details]) => {
      const cat = details.category || 'Other';
      nutrientsByCategory[cat] = nutrientsByCategory[cat] || [];
      nutrientsByCategory[cat].push({ name, ...details });
    });

    const html = `
      <h2>Aggregated Nutrients</h2>
      <div class="nutrient-list">
        ${Object.entries(nutrientsByCategory)
          .map(
            ([category, catNutrients]) => `
          <div class="category-section">
            <div class="category-title">${category}</div>
            ${catNutrients
              .map((n) => {
                const amountValue = parseFloat(n.totalAmount);
                // For aggregated data, DRV might not apply, so skip progress bar or fetch DRV separately if available
                return `
                <div class="nutrient-item">
                  <span class="nutrient-name">${n.name}</span>
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width: 0%;"></div> <!-- Adjust if DRV is available -->
                  </div>
                  <span class="nutrient-value">${amountValue.toFixed(2)} ${n.unit}</span>
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

customElements.define('nutrient-html', NutrientHtml);