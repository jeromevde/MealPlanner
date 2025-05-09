import * as foodapi from './api.js';

class NutrientHtml extends HTMLElement {
  static get observedAttributes() {
    return ['food-list'];
  }

  constructor() {
    super();
    // Only initialize state variables here, do NOT touch the DOM
    this.foodList = [];
    this.originalTotalCalories = 0;
    this.targetCalories = 2500; // Default to 2500 calories
    this.scalingFactor = 1;
    this._initialized = false;
  }

  connectedCallback() {
    console.debug('[NutrientHtml] connectedCallback called');
    if (this._initialized) return;
    this._initialized = true;
    // Set the basic HTML structure without embedded styles
    this.innerHTML = `
      <div id="normalization-controls">
        <label class="switch">
          <input type="checkbox" id="normalize-toggle" checked>
          <span class="slider"></span>
        </label>
        <span id="normalize-label">Normalize to</span>
        <input type="range" id="calorie-slider" min="1000" max="4000" step="50" value="2500">
        <input type="number" id="calorie-input" min="1000" max="4000" step="50" value="2500" style="width:70px;">
        <span id="calorie-value">kcal</span>
      </div>
      <div id="nutrient-content"></div>
    `;

    // Load the external CSS file
    const linkElem = document.createElement('link');
    linkElem.setAttribute('rel', 'stylesheet');
    const cssUrl = new URL('./nutrient-html.css', import.meta.url).href;
    linkElem.setAttribute('href', cssUrl);
    this.appendChild(linkElem);
    // Set normalization default based on attribute
    // If attribute 'normalization-default' is set to 'false', default is OFF, otherwise ON
    const normalizationAttr = this.getAttribute('normalization-default');
    this.normalizationEnabled = normalizationAttr === 'false' ? false : true;
    // Set the toggle state accordingly
    this.querySelector('#normalize-toggle').checked = this.normalizationEnabled;

    // UI references
    this.normalizeToggle = this.querySelector('#normalize-toggle');
    this.calorieSlider = this.querySelector('#calorie-slider');
    this.calorieInput = this.querySelector('#calorie-input');
    this.calorieValue = this.querySelector('#calorie-value');
    this.nutrientContentDiv = this.querySelector('#nutrient-content');

    // Event listeners for normalization controls
    this.normalizeToggle.addEventListener('change', () => {
      this.normalizationEnabled = this.normalizeToggle.checked;
      this.renderNutrients();
    });
    this.calorieSlider.addEventListener('input', () => {
      this.calorieInput.value = this.calorieSlider.value;
      this.targetCalories = parseInt(this.calorieSlider.value, 10);
      if (this.normalizationEnabled) this.renderNutrients();
    });
    this.calorieInput.addEventListener('input', () => {
      let val = parseInt(this.calorieInput.value, 10);
      if (isNaN(val) || val < 1000) val = 1000;
      if (val > 4000) val = 4000;
      this.calorieSlider.value = val;
      this.targetCalories = val;
      if (this.normalizationEnabled) this.renderNutrients();
    });

    // Check if food-list attribute is already present
    const foodListAttr = this.getAttribute('food-list');
    console.debug('[NutrientHtml] connectedCallback food-list attribute:', foodListAttr);
    if (foodListAttr) {
      try {
        this.foodList = JSON.parse(foodListAttr);
        console.debug('[NutrientHtml] Parsed foodList:', this.foodList);
      } catch (e) {
        this.foodList = [];
        console.error('[NutrientHtml] Error parsing food-list attribute:', e);
      }
    }
    this.renderNutrients();
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    console.debug('[NutrientHtml] attributeChangedCallback:', name, oldValue, newValue);
    if (!this.nutrientContentDiv) {
      console.warn('[NutrientHtml] attributeChangedCallback: nutrientContentDiv not ready');
      return; // Only update if DOM is ready
    }
    if (name === 'food-list' && oldValue !== newValue) {
      try {
        this.foodList = JSON.parse(newValue);
        console.debug('[NutrientHtml] attributeChangedCallback parsed foodList:', this.foodList);
      } catch (e) {
        this.foodList = [];
        console.error('[NutrientHtml] attributeChangedCallback error parsing food-list:', e);
      }
      this.renderNutrients();
    }
  }

  async renderNutrients() {
    console.debug('[NutrientHtml] renderNutrients called');
    if (!this.nutrientContentDiv) {
      console.warn('[NutrientHtml] renderNutrients: nutrientContentDiv not ready');
      return; // Only update if DOM is ready
    }
    const contentDiv = this.nutrientContentDiv;
    contentDiv.innerHTML = '';

    await foodapi.ensureDataLoaded();
    console.debug('[NutrientHtml] foodList for rendering:', this.foodList);

    // Aggregate nutrients from all food items
    const aggregatedNutrients = {};
    for (const { foodName, quantity } of this.foodList) {
      if (foodName) {
        const nutrients = foodapi.get_nutrients(foodName);
        console.debug('[NutrientHtml] get_nutrients for', foodName, ':', nutrients);
        const scaleFactor = parseFloat(quantity) / 100;
        if (nutrients) {
          Object.entries(nutrients).forEach(([name, details]) => {
            const scaledAmount = parseFloat(details.amount) * scaleFactor;
            if (!aggregatedNutrients[name]) {
              aggregatedNutrients[name] = { ...details, totalAmount: 0 };
            }
            aggregatedNutrients[name].totalAmount += scaledAmount;
          });
        } else {
          console.warn('[NutrientHtml] No nutrients found for', foodName);
        }
      } else {
        console.warn('[NutrientHtml] foodList entry missing foodName:', { foodName, quantity });
      }
    }
    console.debug('[NutrientHtml] aggregatedNutrients:', aggregatedNutrients);

    // Calculate original total calories
    this.originalTotalCalories = aggregatedNutrients["Energy"]?.totalAmount || 0;

    // Determine scaling factor based on normalization toggle
    if (this.normalizationEnabled && this.originalTotalCalories > 0) {
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
        displayAmount: this.normalizationEnabled
          ? (details.totalAmount * this.scalingFactor).toFixed(2)
          : details.totalAmount.toFixed(2),
      });
    });

    // Set the header dynamically
    let headerText;
    if (this.foodList.length === 1) {
      const { foodName, quantity } = this.foodList[0];
      const foodCategory = foodapi.get_category(foodName);
      headerText = `${quantity}g of ${foodName} (${foodCategory})`;
    } else {
      headerText = this.normalizationEnabled
        ? `Nutrients normalized to ${this.targetCalories} kcal`
        : `Nutrients for the selected plan (no normalization)`;
    }

    // Generate nutrient HTML
    const nutrientHtml = Object.entries(nutrientsByCategory)
      .map(([category, catNutrients]) => {
        return `
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
        `;
      })
      .join('');

    // Calculate displayed calories
    const displayedCalories = (aggregatedNutrients["Energy"]?.totalAmount * this.scalingFactor || 0).toFixed(0);

    // Remove the calorie button in the aggregated view
    // Only show the header and nutrient list
    const headerHtml = `
      <div class="header">
        <h2>${headerText}</h2>
      </div>
    `;
    
    // Render the content
    contentDiv.innerHTML = `${headerHtml}<div class="nutrient-list">${nutrientHtml}</div>`;
  }
}

customElements.define('nutrient-html', NutrientHtml);