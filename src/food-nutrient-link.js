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
      <div id="popup">
        <button id="close">×</button>
        <nutrient-html id="nutrient-display" normalization-default="false"></nutrient-html>
      </div>
    `;
  }

  connectedCallback() {
    const link = this.shadowRoot.querySelector('#link');
    const popup = this.shadowRoot.querySelector('#popup');
    const closeButton = this.shadowRoot.querySelector('#close');

    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.showPopup();
    });

    closeButton.addEventListener('click', () => this.hidePopup());

    popup.addEventListener('click', (event) => {
      if (event.target === popup) {
        this.bringToFront();
      }
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
    const nutrientDisplay = this.shadowRoot.querySelector('#nutrient-display');
    nutrientDisplay.setAttribute('food-list', JSON.stringify(this.foodList));
    const popup = this.shadowRoot.querySelector('#popup');
    
    this.constructor.maxZIndex += 1;
    popup.style.zIndex = this.constructor.maxZIndex;

    popup.style.display = 'block';

  }

  hidePopup() {
    const popup = this.shadowRoot.querySelector('#popup');
    popup.style.display = 'none';
  }

  bringToFront() {
    const popup = this.shadowRoot.querySelector('#popup');
    this.constructor.maxZIndex += 1;
    popup.style.zIndex = this.constructor.maxZIndex;
  }

  getContainer() {
    let current = this.parentElement;
    while (current) {
      // Only match the meal popup container, not the nutrient popup itself
      if (current.id && (current.id === 'popup-content' || current.id === 'popup')) {
        return current;
      }
      current = current.parentElement;
    }
    return this;
  }
}

customElements.define('food-nutrient-link', FoodNutrientLink);