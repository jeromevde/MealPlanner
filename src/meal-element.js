import { saveState } from './state.js';
import * as api from './api.js';

class MealElement extends HTMLElement {
  closePopups() {
    // Close the dropdown popup if open
    if (this.customDropdown) {
      this.customDropdown.style.display = 'none';
    }
    if (this.quantityCircle) {
      this.quantityCircle.style.display = 'block';
    }
  }
  constructor() {
    super();
    // Attach shadow root and set up template
    this.attachShadow({ mode: 'open' });
    const styleUrl = new URL('./meal-element.css', import.meta.url).href;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${styleUrl}">
      <div class="meal">
        <span class="meal-title"></span>
        <span class="quantity-circle"></span>
        <div class="custom-dropdown"></div>
      </div>
    `;
    // Store references for later use
    this.mealDiv = this.shadowRoot.querySelector('.meal');
    this.titleSpan = this.shadowRoot.querySelector('.meal-title');
    this.quantityCircle = this.shadowRoot.querySelector('.quantity-circle');
    this.customDropdown = this.shadowRoot.querySelector('.custom-dropdown');
    // Create quantity buttons ONCE
    for (let i = 0; i <= 15; i++) {
      const circleButton = document.createElement('button');
      circleButton.classList.add('circle-button');
      circleButton.textContent = i;
      circleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const mealKey = this.getMealKey();
        api.mealQuantities.set(mealKey, i);
        saveState(api.mealQuantities, api.days, api.meals)
        this.refresh();
        this.customDropdown.style.display = 'none';
        this.quantityCircle.style.display = 'block';
        window.updateAggregations();
      });
      this.customDropdown.appendChild(circleButton);
    }
  }

  connectedCallback() {
    // Set meal title and attributes
    this.titleSpan.textContent = this.getAttribute('title');
    this.mealDiv.dataset.day = this.getAttribute('day');
    this.mealDiv.dataset.meal = this.getAttribute('meal');
    this.mealDiv.dataset.version = this.getAttribute('version');
    // Initialize meal quantity if not set
    const mealKey = this.getMealKey();
    if (!window.api.mealQuantities.has(mealKey)) {
      window.api.mealQuantities.set(mealKey, 0);
    }
    this.refresh();
    // Set up dropdown toggle
    // Support both mouse and touch events
    let pressTimer = null;
    let longPress = false;
    const openDropdown = () => {
      longPress = true;
      this.suppressNextPopup = true;
      this.customDropdown.style.display = 'block';
      this.quantityCircle.style.display = 'none';
      // Reset longPress after dropdown closes (with a small delay to avoid popup)
      const closeHandler = () => {
        setTimeout(() => { longPress = false; }, 100);
        document.removeEventListener('click', closeHandler, true);
      };
      document.addEventListener('click', closeHandler, true);
    };
    let touchHandled = false;
    const incrementQuantity = () => {
      if (touchHandled || longPress) return; // Prevent double increment and increment on long press
      const mealKey = this.getMealKey();
      const quantity = api.mealQuantities.get(mealKey) || 0;
      api.mealQuantities.set(mealKey, quantity + 1);
      saveState(api.mealQuantities, api.days, api.meals);
      this.refresh();
      window.updateAggregations();
    };
    const startPress = (event) => {
      event.stopPropagation();
      longPress = false;
      pressTimer = setTimeout(openDropdown, 500);
      touchHandled = false;
    };
    const endPress = (event) => {
      clearTimeout(pressTimer);
      if (event.type === 'touchend') {
        touchHandled = true;
      }
      // Do not increment here; only handle increment in click event
      longPress = false; // Reset longPress after press ends
    };
    this.quantityCircle.addEventListener('mousedown', startPress);
    this.quantityCircle.addEventListener('touchstart', startPress);
    this.quantityCircle.addEventListener('mouseup', endPress);
    this.quantityCircle.addEventListener('touchend', endPress, { passive: false });
    this.quantityCircle.addEventListener('mouseleave', () => clearTimeout(pressTimer));
    this.quantityCircle.addEventListener('touchmove', () => clearTimeout(pressTimer));

    // Single click on quantityCircle increments (unless it was a long press)
    this.quantityCircle.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!longPress) {
        incrementQuantity();
      }
    });

    // Handle meal click to show popup
    this.mealDiv.addEventListener('click', async (event) => {
      // Prevent popup if click originated from quantityCircle, was a long press, or was just suppressed
      if (event.target === this.quantityCircle || longPress || this.suppressNextPopup) {
        this.suppressNextPopup = false;
        return;
      }
      await window.api.ensureDataLoaded();
      const day = this.getAttribute('day');
      const meal = this.getAttribute('meal');
      const version = this.getAttribute('version');
      const mealData = window.api.data[day][meal][version];
      const parsedTitle = window.api.parseMarkdown(mealData.title);
      const htmlContent = window.api.parseMarkdown(mealData.content);
      const linkedContent = await window.api.parseAndLinkMealContent(htmlContent);
      const popupContent = document.getElementById('popup-content');
      popupContent.innerHTML = `${parsedTitle}<p>${linkedContent}</p>`;
      document.getElementById('popup').style.display = 'block';
      document.getElementById('overlay').style.display = 'block';
    });
  }

  getMealKey() {
    return `${this.getAttribute('day')}-${this.getAttribute('meal')}-${this.getAttribute('version')}`;
  }

  refresh() {
    // Example refresh logic: update displayed quantity
    const mealKey = this.getMealKey();
    const quantity = window.api.mealQuantities.get(mealKey) || 0;
    this.quantityCircle.textContent = quantity > 0 ? quantity : '';
    if (quantity > 0) {
      this.mealDiv.classList.add('selected');
      this.quantityCircle.classList.add('active');
    } else {
      this.mealDiv.classList.remove('selected');
      this.quantityCircle.classList.remove('active');
    }
  }
  // Static method to refresh all meal elements (call after state is loaded)
  static refreshAll() {
    document.querySelectorAll('meal-element').forEach(el => {
      if (typeof el.refresh === 'function') el.refresh();
    });
  }
}

customElements.define('meal-element', MealElement);