class MealElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const styleUrl = new URL('meal-element.css', import.meta.url).href;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${styleUrl}">
      <div class="meal">
        <span class="meal-title"></span>
        <div class="meal-control">
          <div class="quantity-circle"></div> <!-- No initial "0" -->
          <div class="custom-dropdown"></div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    const mealDiv = this.shadowRoot.querySelector('.meal');
    const titleSpan = this.shadowRoot.querySelector('.meal-title');
    const quantityCircle = this.shadowRoot.querySelector('.quantity-circle');
    const customDropdown = this.shadowRoot.querySelector('.custom-dropdown');

    // Set meal title and attributes
    titleSpan.textContent = this.getAttribute('title');
    mealDiv.dataset.day = this.getAttribute('day');
    mealDiv.dataset.meal = this.getAttribute('meal');
    mealDiv.dataset.version = this.getAttribute('version');

    // Initialize meal quantity
    const mealKey = `${this.getAttribute('day')}-${this.getAttribute('meal')}-${this.getAttribute('version')}`;
    window.api.mealQuantities.set(mealKey, 0);
    this.refresh(); // Set initial display

    // Create quantity selection buttons (0 to 15)
    for (let i = 0; i <= 15; i++) {
      const circleButton = document.createElement('button');
      circleButton.classList.add('circle-button');
      circleButton.textContent = i;
      circleButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const value = i;
        window.api.mealQuantities.set(mealKey, value);
        this.refresh(); // Update display after selection
        customDropdown.style.display = 'none';
        quantityCircle.style.display = 'block';
        window.calculateAggregations();
      });
      customDropdown.appendChild(circleButton);
    }

    // Toggle dropdown on quantity circle click
    quantityCircle.addEventListener('click', (event) => {
      event.stopPropagation();
      quantityCircle.style.display = 'none';
      customDropdown.style.display = 'flex';
    });

    // Handle meal click to show popup
    mealDiv.addEventListener('click', async (event) => {
      if (event.target.closest('.meal-control')) {
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

  refresh() {
    const mealKey = `${this.getAttribute('day')}-${this.getAttribute('meal')}-${this.getAttribute('version')}`;
    const quantity = window.api.mealQuantities.get(mealKey) || 0;
    const quantityCircle = this.shadowRoot.querySelector('.quantity-circle');
    const mealDiv = this.shadowRoot.querySelector('.meal');
    // Only display quantity if greater than 0, otherwise leave blank
    quantityCircle.textContent = quantity > 0 ? quantity : '';
    if (quantity > 0) {
      mealDiv.classList.add('selected');
      quantityCircle.classList.add('active');
    } else {
      mealDiv.classList.remove('selected');
      quantityCircle.classList.remove('active');
    }
  }
}

// Register the custom element
customElements.define('meal-element', MealElement);