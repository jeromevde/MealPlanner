class FoodNutrientLink extends HTMLElement {
  // Define observed attributes
  static get observedAttributes() {
    return ['food-name'];
  }

  // Constructor: Set up shadow DOM and initial structure
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: relative;
          display: inline-block;
        }
        a {
          color: #007bff;
          text-decoration: underline;
          cursor: pointer;
        }
        #popup {
          position: absolute;
          z-index: 1000;
          background: white;
          border: 1px solid #ccc;
          padding: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          display: none;
        }
        #close {
          cursor: pointer;
          float: right;
          font-size: 16px;
          border: none;
          background: none;
          padding: 0 5px;
        }
      </style>
      <a href="#" id="link"></a>
      <div id="popup">
        <button id="close">×</button>
        <nutrient-html id="nutrient-display"></nutrient-html>
      </div>
    `;
  }

  // Called when the element is added to the DOM
  connectedCallback() {
    const link = this.shadowRoot.querySelector('#link');
    const popup = this.shadowRoot.querySelector('#popup');
    const closeButton = this.shadowRoot.querySelector('#close');

    // Event listener for link click
    link.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent navigation
      console.log("testt")
      this.showPopup();
    });

    // Event listener for close button
    closeButton.addEventListener('click', () => {
      this.hidePopup();
    });

    // Initialize with food-name if already set
    const foodName = this.getAttribute('food-name');
    if (foodName) {
      this.updateFoodName(foodName);
    }
  }

  // Handle attribute changes
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'food-name' && newValue !== oldValue) {
      this.updateFoodName(newValue);
    }
  }

  // Update link text and nutrient-html component
  updateFoodName(foodName) {
    const link = this.shadowRoot.querySelector('#link');
    const nutrientDisplay = this.shadowRoot.querySelector('#nutrient-display');
    link.textContent = foodName;
    nutrientDisplay.setAttribute('food-name', foodName);
  }

  // Show the popup below the link
  showPopup() {
    const link = this.shadowRoot.querySelector('#link');
    const popup = this.shadowRoot.querySelector('#popup');
    const top = link.offsetTop + link.offsetHeight; // Position below the link
    const left = link.offsetLeft; // Align with the link's left edge
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    popup.style.display = 'block';
  }

  // Hide the popup
  hidePopup() {
    const popup = this.shadowRoot.querySelector('#popup');
    popup.style.display = 'none';
  }
}

// Register the custom element
customElements.define('food-nutrient-link', FoodNutrientLink);