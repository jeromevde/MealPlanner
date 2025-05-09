import * as api from './api.js';

class FoodNutrientLink extends HTMLElement {
  static maxZIndex = 1000;

  static get observedAttributes() {
    return ['food-list', 'display-mode'];
  }

  constructor() {
    super();
    this.foodList = [];
    this.attachShadow({ mode: 'open' });
    const styleUrl = new URL('food-nutrient-link.css', import.meta.url).href;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${styleUrl}">
      <a href="#" id="link"></a>

    `;
  }

  connectedCallback() {
    const link = this.shadowRoot.querySelector('#link');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.showPopup();
    });
    this.updateFoodListAndText();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'food-list' || name === 'display-mode') {
        this.updateFoodListAndText();
      }
    }
  }

  updateFoodListAndText() {
    const foodListAttr = this.getAttribute('food-list');
    if (foodListAttr) {
      try {
        this.foodList = JSON.parse(foodListAttr);
      } catch (e) {
        console.error('Invalid food-list JSON:', foodListAttr);
        this.foodList = [];
      }
    } else {
      this.foodList = [];
    }
    this.updateLinkText();
  }

  // Removed getTransformedFoodName: now using foodName as-is for display.

  /** Rounds a number to the nearest 0.25 increment */
  roundToNearestQuarter(value) {
    return (Math.round(value * 4) / 4).toFixed(2);
  }

  /** Generates HTML for a single food item */
  generateFoodItemHTML(food, foodKey) {
    const { foodName, quantity } = food;
    // Show the food name as-is, split by spaces for styling, but do not reorder or lowercase
    const words = foodName.split(' ');
    const nameClass = foodKey ? 'food-word' : 'food-word not-found';
    const wordHTML = words.map(word => `<span class="${nameClass}">${word}</span>`).join(' ');
    const quantityHTML = quantity ? `<span class="quantity">${quantity}g</span>`: `<span/>` ;

    let portionHTML = '';
    const portionUnitName = api.get_portion_unit_name(foodKey)
    const portionGramWeight = api.get_portion_gram_weight(foodKey);
    if (foodKey && portionUnitName && portionGramWeight) {
      if (!isNaN(portionGramWeight) && portionGramWeight > 0) {
        const numPortions = quantity / portionGramWeight;
        const roundedPortions = this.roundToNearestQuarter(numPortions);
        const unitText = parseFloat(roundedPortions) <= 1 ? portionUnitName : portionUnitName + 's';
        portionHTML = `<span class="portion">${roundedPortions} ${unitText}</span>`;
      }
    }

    return `${wordHTML} ${quantityHTML} ${portionHTML}`;
  }

  updateLinkText() {
    const link = this.shadowRoot.querySelector('#link');
    link.innerHTML = ''; // Clear existing content

    if (this.foodList.length === 0) {
      link.textContent = 'No food specified';
      return;
    }

    api.ensureDataLoaded();

    this.foodList.forEach((food, index) => {
      const foodKey = food.foodName.toLowerCase();
      const foodItemHTML = this.generateFoodItemHTML(food, foodKey);
      link.insertAdjacentHTML('beforeend', foodItemHTML);
      if (index < this.foodList.length - 1) {
        link.insertAdjacentHTML('beforeend', ', '); // Separate items with commas
      }
    });
  }

  showPopup() {
    // Remove any existing nutrient popups in the container
    const container = this.getContainer();
    const prev = container.querySelector('.nutrient-popup-dynamic');
    if (prev) prev.remove();

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'nutrient-popup-dynamic';
    popup.style.position = 'absolute';
    popup.style.left = '200px';
    popup.style.top = '100px';
    popup.style.zIndex = (this.constructor.maxZIndex = (this.constructor.maxZIndex || 1000) + 1);
    popup.style.background = '#fff';
    popup.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    popup.style.borderRadius = '8px';
    popup.style.padding = '20px';
    popup.style.width = '50%';
    popup.style.maxHeight = '90vh';
    popup.style.overflowY = 'auto';
    popup.style.display = 'block';
    popup.style.marginTop = '0';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.float = 'right';
    closeBtn.style.fontSize = '1.5em';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => popup.remove();
    popup.appendChild(closeBtn);

    // Nutrient display
    const nutrientDisplay = container.ownerDocument.createElement('nutrient-html');
    nutrientDisplay.setAttribute('food-list', JSON.stringify(this.foodList));
    nutrientDisplay.setAttribute('normalization-default', 'false');
    popup.appendChild(nutrientDisplay);

    // Add to container
    container.appendChild(popup);
  }

  getContainer() {
    // Always use the main popup content container in the main DOM
    return document.getElementById('popup-content');
  }
}

customElements.define('food-nutrient-link', FoodNutrientLink);