
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
    this.shadowRoot.innerHTML = `
      <style>
        :host { position: relative; }
        #link { text-decoration: none; color: #007bff; }
        #link:hover { text-decoration: underline; }
        #popup {
          display: none; position: absolute; background: white;
          border: 1px solid #ccc; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000; cursor: move;
        }
        #close { float: right; border: none; background: none; font-size: 16px; cursor: pointer; }
      </style>
      <a href="#" id="link"></a>
      <div id="popup">
        <button id="close">×</button>
        <nutrient-html id="nutrient-display"></nutrient-html>
      </div>
    `;
  }

  connectedCallback() {
    const link = this.shadowRoot.querySelector('#link');
    const popup = this.shadowRoot.querySelector('#popup');
    const closeButton = this.shadowRoot.querySelector('#close');

    // Show popup on link click
    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.showPopup();
    });

    // Hide popup on close button click
    closeButton.addEventListener('click', () => this.hidePopup());

    // Bring popup to front on click
    popup.addEventListener('click', (event) => {
      if (event.target === popup) {
        this.bringToFront();
      }
    });

    // Dragging functionality
    let isDragging = false;
    let offsetX, offsetY;
    let container;

    popup.addEventListener('mousedown', (event) => {
      if (event.target === popup) {
        event.preventDefault();
        isDragging = true;
        const popupRect = popup.getBoundingClientRect();
        container = this.getContainer();
        const containerRect = container.getBoundingClientRect();
        offsetX = event.clientX - popupRect.left;
        offsetY = event.clientY - popupRect.top;
        this.bringToFront();
      }
    });

    document.addEventListener('mousemove', (event) => {
      if (isDragging) {
        const containerRect = container.getBoundingClientRect();
        let newLeft = event.clientX - containerRect.left - offsetX;
        let newTop = event.clientY - containerRect.top - offsetY;
        popup.style.left = `${newLeft}px`;
        popup.style.top = `${newTop}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
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

  updateLinkText() {
    const link = this.shadowRoot.querySelector('#link');
    const displayMode = this.getAttribute('display-mode') || 'full';
    if (this.foodList.length === 1) {
      const { foodName, quantity } = this.foodList[0];
      const displayName = this.computeDisplayName(foodName, quantity);
      if (displayMode === 'name-only') {
        link.textContent = displayName;
      } else {
        link.textContent = `${quantity}g of ${displayName}`;
      }
      // set the link color
      api.ensureDataLoaded();
      const normalizedFoodName = foodName.toLowerCase();
      if (!Object.keys(api.foodData).find((key) => key.toLowerCase() === normalizedFoodName)){
        link.style.color = "red"
      }
    } else if (this.foodList.length > 1) {
      link.textContent = 'Mixed Foods';
    } else {
      link.textContent = 'No food specified';
    }
  }

  computeDisplayName(foodName, quantity) {
    let portionText = '';
  
    // Check if quantity is a valid number
    if (typeof quantity === 'number' && !isNaN(quantity)) {
      // Normalize foodName for case-insensitive lookup
      const normalizedFoodName = foodName.toLowerCase();
      // Find the matching food key in api.fooddata
      const foodKey = Object.keys(api.foodData).find(key => key.toLowerCase() === normalizedFoodName);
  
      // If food is found and has portion data
      if (foodKey && api.foodData[foodKey].portion_unit_name && api.foodData[foodKey].portion_gram_weight) {
        const portionUnitName = api.foodData[foodKey].portion_unit_name;
        const portionGramWeight = parseFloat(api.foodData[foodKey].portion_gram_weight);
  
        // Ensure portionGramWeight is a valid, positive number
        if (!isNaN(portionGramWeight) && portionGramWeight > 0) {
          const numPortions = quantity / portionGramWeight;
          // Singular if exactly 1, plural otherwise
          const unitText = numPortions === 1 ? portionUnitName : portionUnitName + 's';
          // Format number of portions to 2 decimal places
          portionText = `${numPortions.toFixed(2)} ${unitText} of `;
        }
      }
    }

    // Compute the base display name (original logic)
    const parts = foodName.split(',').map(part => part.trim());
    let baseDisplayName;
    if (parts.length >= 2) {
      baseDisplayName = [parts[1], parts[0]].join(' ').toLowerCase();
    } else {
      baseDisplayName = foodName.toLowerCase();
    }
  
    // Return the portion text prepended to the base display name
    return portionText + baseDisplayName;
  }

  showPopup() {
    const nutrientDisplay = this.shadowRoot.querySelector('#nutrient-display');
    nutrientDisplay.setAttribute('food-list', JSON.stringify(this.foodList));
    const link = this.shadowRoot.querySelector('#link');
    const popup = this.shadowRoot.querySelector('#popup');

    const container = this.getContainer();
    const hostRect = container.getBoundingClientRect();

    popup.style.position = 'absolute';
    popup.style.left = '-9999px';
    popup.style.top = '-9999px';
    popup.style.display = 'block';

    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;

    popup.style.display = 'none';

    let popupLeft = link.offsetLeft;
    let popupTop = link.offsetTop + link.offsetHeight;

    const popupRight = hostRect.left + popupLeft + popupWidth;

    if (popupRight > hostRect.right) {
      popupLeft = hostRect.right - hostRect.left - popupWidth;
    }

    if (popupLeft < 0) {
      popupLeft = 0;
    }

    popup.style.left = `${popupLeft}px`;
    popup.style.top = `${popupTop}px`;
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
      if (current.id && current.id.includes('popup')) {
        return current;
      }
      current = current.parentElement;
    }
    return this;
  }
}

customElements.define('food-nutrient-link', FoodNutrientLink);