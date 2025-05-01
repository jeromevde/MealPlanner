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
        window.api.mealQuantities.set(mealKey, i);
        if (window.saveState) {
          window.saveState(window.api.mealQuantities, window.api.days, window.api.meals);
        }
        this.refresh();
        this.customDropdown.style.display = 'none';
        this.quantityCircle.style.display = 'block';
        window.calculateAggregations();
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
      this.customDropdown.style.display = 'block';
      this.quantityCircle.style.display = 'none';
      // After opening dropdown, reset longPress after a short delay to avoid recipe popup
      setTimeout(() => { longPress = false; }, 0);
    };
    const incrementQuantity = () => {
      const mealKey = this.getMealKey();
      const quantity = window.api.mealQuantities.get(mealKey) || 0;
      window.api.mealQuantities.set(mealKey, quantity + 1);
      if (window.saveState) {
        window.saveState(window.api.mealQuantities, window.api.days, window.api.meals);
      }
      this.refresh();
      window.calculateAggregations();
    };
    const startPress = (event) => {
      event.stopPropagation();
      longPress = false;
      pressTimer = setTimeout(openDropdown, 500);
    };
    const endPress = (event) => {
      clearTimeout(pressTimer);
      if (!longPress) {
        incrementQuantity();
      }
    };
    this.quantityCircle.addEventListener('mousedown', startPress);
    this.quantityCircle.addEventListener('touchstart', startPress);
    this.quantityCircle.addEventListener('mouseup', endPress);
    this.quantityCircle.addEventListener('touchend', endPress);
    this.quantityCircle.addEventListener('mouseleave', () => clearTimeout(pressTimer));
    this.quantityCircle.addEventListener('touchmove', () => clearTimeout(pressTimer));

    // Prevent popup from opening when clicking the quantity circle
    this.quantityCircle.addEventListener('click', (event) => event.stopPropagation());

    // Handle meal click to show popup
    this.mealDiv.addEventListener('click', async (event) => {
      // Prevent popup if click originated from quantityCircle or was a long press
      if (event.target === this.quantityCircle) {
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
}

customElements.define('meal-element', MealElement);