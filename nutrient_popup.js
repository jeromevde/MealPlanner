class NutrientPopup extends HTMLElement {
    constructor() {
      super();
      // Attach Shadow DOM for encapsulation
      this.attachShadow({ mode: 'open' });
      // Initially hide the popup
      this.style.display = 'none';
    }
  
    // Method to show the popup with a specific food name
    async show(foodName) {
      const html = `
        <style>
          :host {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: white;
            padding: 30px;
            box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            z-index: 1000;
            min-width: 300px;
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
          }
          :host(.show) {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          .popup-content {
            text-align: center;
          }
          .close-button {
            margin-top: 20px;
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius finita
            border-radius: 5px;
            cursor: pointer;
          }
          .close-button:hover {
            background: #0056b3;
          }
        </style>
        <div class="popup-content">
          <h2>Dummy Nutrient Popup for ${foodName}</h2>
          <p>This is a placeholder for the nutrient information of ${foodName}.</p>
          <button class="close-button">Close</button>
        </div>
      `;
      // Insert the HTML into the Shadow DOM
      this.shadowRoot.innerHTML = html;
      this.style.display = 'block'; // Make the popup visible
      // Trigger the animation after a slight delay
      setTimeout(() => {
        this.classList.add('show');
      }, 10);
  
      // Add event listener to the close button
      const closeButton = this.shadowRoot.querySelector('.close-button');
      if (closeButton) {
        closeButton.addEventListener('click', () => this.hide());
      }
    }
  
    // Method to hide the popup
    hide() {
      this.style.display = 'none';
      this.classList.remove('show');
    }
  }
  
  // Register the custom element with the browser
  customElements.define('nutrient-popup', NutrientPopup);