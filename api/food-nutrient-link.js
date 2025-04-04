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
      </style>
      <a href="#" id="link"></a>
    `;

    // Create popup and append to body
    this.popup = document.createElement('div');
    this.popup.id = 'popup';
    this.popup.innerHTML = `
      <style>
        :host { display: none; position: absolute; background: white; border: 1px solid #ccc; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 1000; }
        #close { float: right; border: none; background: none; font-size: 16px; cursor: pointer; }
      </style>
      <button id="close">×</button>
      <nutrient-html id="nutrient-display"></nutrient-html>
    `;
    this.popup.style.display = 'none';
    this.popup.style.position = 'absolute';
    this.popup.style.background = 'white';
    this.popup.style.border = '1px solid #ccc';
    this.popup.style.padding = '10px';
    this.popup.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    this.popup.style.zIndex = '1000';
    document.body.appendChild(this.popup);

    this.closeButton = this.popup.querySelector('#close');
  }

  connectedCallback() {
    const link = this.shadowRoot.querySelector('#link');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.showPopup();
    });

    this.closeButton.addEventListener('click', () => this.hidePopup());

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
    const nutrientDisplay = this.popup.querySelector('#nutrient-display');
    nutrientDisplay.setAttribute('food-list', JSON.stringify(this.foodList));
    const link = this.shadowRoot.querySelector('#link');
    const linkRect = link.getBoundingClientRect();

    this.popup.style.display = 'block';
    const popupWidth = this.popup.offsetWidth;
    const popupHeight = this.popup.offsetHeight;

    let top = linkRect.bottom;
    let left = linkRect.left;

    if (top + popupHeight > window.innerHeight) {
      top = linkRect.top - popupHeight;
    }

    if (left + popupWidth > window.innerWidth) {
      left = linkRect.right - popupWidth;
    }

    if (left < 0) {
      left = 0;
    }

    this.popup.style.top = `${top}px`;
    this.popup.style.left = `${left}px`;
  }

  hidePopup() {
    this.popup.style.display = 'none';
  }
}

customElements.define('food-nutrient-link', FoodNutrientLink);