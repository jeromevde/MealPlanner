class FoodNutrientLink extends HTMLElement {
  static get observedAttributes() {
    return ['food-list', 'display-mode'];
  }

  constructor() {
    super();
    this.foodList = [];
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        #link { text-decoration: none; color: #007bff; }
        #link:hover { text-decoration: underline; }
        #popup {
          display: none; position: absolute; background: white;
          border: 1px solid #ccc; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000;
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

    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.showPopup();
    });

    closeButton.addEventListener('click', () => this.hidePopup());

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
      const displayName = this.computeDisplayName(foodName);
      if (displayMode === 'name-only') {
        link.textContent = displayName;
      } else {
        link.textContent = `${quantity}g of ${displayName}`;
      }
    } else if (this.foodList.length > 1) {
      link.textContent = 'Mixed Foods';
    } else {
      link.textContent = 'No food specified';
    }
  }

  computeDisplayName(foodName) {
    const parts = foodName.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      return [parts[1], parts[0]].join(' ').toLowerCase();
    }
    return foodName.toLowerCase();
  }

  showPopup() {
    const nutrientDisplay = this.shadowRoot.querySelector('#nutrient-display');
    nutrientDisplay.setAttribute('food-list', JSON.stringify(this.foodList));
    const link = this.shadowRoot.querySelector('#link');
    const popup = this.shadowRoot.querySelector('#popup');
    const top = link.offsetTop + link.offsetHeight;
    const left = link.offsetLeft;
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.display = 'block';
  }

  hidePopup() {
    const popup = this.shadowRoot.querySelector('#popup');
    popup.style.display = 'none';
  }
}

customElements.define('food-nutrient-link', FoodNutrientLink);