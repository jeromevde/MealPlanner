import * as foodapi from './api.js';

class NutrientHtml extends HTMLElement {
  static get observedAttributes() {
    return ['food-list'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // Set the basic HTML structure without embedded styles
    this.shadowRoot.innerHTML = '<div id="nutrient-content"></div>';
    
    // Load the external CSS file
    const linkElem = document.createElement('link');
    linkElem.setAttribute('rel', 'stylesheet');
    const cssUrl = new URL('./nutrient-html.css', import.meta.url).href;
    linkElem.setAttribute('href', cssUrl);
    this.shadowRoot.appendChild(linkElem);
    
    // Initialize state variables
    this.foodList = [];
    this.originalTotalCalories = 0;
    this.targetCalories = 2500; // Default to 2500 calories
    this.scalingFactor = 1;
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'food-list' && newValue !== oldValue) {
      this.foodList = JSON.parse(newValue);
      if (this.foodList.length > 0) {
        await this.renderNutrients();
      } else {
        this.shadowRoot.querySelector('#nutrient-content').innerHTML = '<p>No food data</p>';
      }
    }
  }

  async renderNutrients() {
    const contentDiv = this.shadowRoot.querySelector('#nutrient-content');
    contentDiv.innerHTML = '';

    await foodapi.ensureDataLoaded();

    // Aggregate nutrients from all food items
    const aggregatedNutrients = {};
    for (const { foodName, quantity } of this.foodList) {
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

    // Calculate original total calories
    this.originalTotalCalories = aggregatedNutrients["Energy"]?.totalAmount || 0;

    // Determine scaling factor based on target calories
    if (this.originalTotalCalories > 0) {
      this.scalingFactor = this.targetCalories / this.originalTotalCalories;
    } else {
      this.scalingFactor = 1;
    }

    // Organize nutrients by category with scaled amounts
    const nutrientsByCategory = {};
    Object.entries(aggregatedNutrients).forEach(([name, details]) => {
      const cat = details.category || 'Other';
      nutrientsByCategory[cat] = nutrientsByCategory[cat] || [];
      nutrientsByCategory[cat].push({
        name,
        ...details,
        displayAmount: (details.totalAmount * this.scalingFactor).toFixed(2),
      });
    });

    // Set the header dynamically
    let headerText;
    if (this.foodList.length === 1) {
      const { foodName, quantity } = this.foodList[0];
      const normalizedFoodName = foodName.toLowerCase();
      const foodKey = Object.keys(foodapi.foodData).find(
        (key) => key.toLowerCase() === normalizedFoodName
      );
      const foodCategory = foodKey ? foodapi.foodData[foodKey].category : 'Unknown';
      headerText = `${quantity}g of ${foodName} (${foodCategory})`;
    } else {
      headerText = `Normalized nutrients of the selected plan`;
    }

    // Generate nutrient HTML
    const nutrientHtml = Object.entries(nutrientsByCategory)
      .map(([category, catNutrients]) => `
        <div class="category-section">
          <div class="category-title">${category}</div>
          ${catNutrients
            .map((n) => {
              const displayAmount = parseFloat(n.displayAmount);
              const drvValue = parseFloat(n.drv);
              const percentage =
                !isNaN(displayAmount) && !isNaN(drvValue) && drvValue > 0
                  ? Math.min((displayAmount / drvValue) * 100, 100)
                  : 100;
              return `
                <div class="nutrient-item">
                  <span class="nutrient-name">${n.name}</span>
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${percentage}%;"></div>
                  </div>
                  <span class="nutrient-value">${n.displayAmount} / ${n.drv || 'N/A'} ${n.unit_name}</span>
                </div>
              `;
            })
            .join('')}
        </div>
      `)
      .join('');

    // Calculate displayed calories
    const displayedCalories = (aggregatedNutrients["Energy"]?.totalAmount * this.scalingFactor || 0).toFixed(0);

    // Check if the calorie button should be shown
    const showCalorieButton = this.hasAttribute('show-calorie-button');

    // Generate header HTML with optional button
    const headerHtml = `
      <div class="header">
        <h2>${headerText}</h2>
        ${showCalorieButton ? `<button id="calorie-button">Calories: ${displayedCalories} kcal</button>` : ''}
      </div>
    `;

    // Render the content
    contentDiv.innerHTML = `${headerHtml}<div class="nutrient-list">${nutrientHtml}</div>`;

    // Attach event listener to the calorie button if present
    if (showCalorieButton) {
      const button = this.shadowRoot.querySelector('#calorie-button');
      button.addEventListener('click', () => {
        const newTarget = prompt('Enter target calories (leave empty to reset to 2500):');
        if (newTarget === null || newTarget.trim() === '') {
          this.targetCalories = 2500; // Reset to default 2500
        } else {
          const parsed = parseFloat(newTarget);
          if (!isNaN(parsed) && parsed > 0) {
            this.targetCalories = parsed; // Set new target calories
          } else {
            alert('Invalid input');
            return;
          }
        }
        this.renderNutrients(); // Re-render with updated scaling
      });
    }
  }
}

customElements.define('nutrient-html', NutrientHtml);