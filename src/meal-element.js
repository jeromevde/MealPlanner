import { saveState } from './state.js';
import * as api from './api.js';
import { computeMealStats, densityLabel } from './nutrient-density.js';

class MealElement extends HTMLElement {
  closePopups() {
    if (this.customDropdown) this.customDropdown.style.display = 'none';
    if (this.quantityCircle) this.quantityCircle.style.display = 'block';
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const styleUrl = new URL('./meal-element.css', import.meta.url).href;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${styleUrl}">
      <div class="meal">
        <div class="meal-info">
          <span class="meal-title"></span>
          <span class="meal-badges"></span>
        </div>
        <span class="quantity-circle"></span>
      </div>
    `;
    this.mealDiv = this.shadowRoot.querySelector('.meal');
    this.titleSpan = this.shadowRoot.querySelector('.meal-title');
    this.badgesSpan = this.shadowRoot.querySelector('.meal-badges');
    this.quantityCircle = this.shadowRoot.querySelector('.quantity-circle');
  }

  connectedCallback() {
    this.titleSpan.textContent = this.getAttribute('title');
    this.mealDiv.dataset.day = this.getAttribute('day');
    this.mealDiv.dataset.meal = this.getAttribute('meal');
    this.mealDiv.dataset.version = this.getAttribute('version');

    const mealKey = this.getMealKey();
    if (!window.api.mealQuantities.has(mealKey)) {
      window.api.mealQuantities.set(mealKey, 0);
    }
    this.refresh();
    this.loadBadges();

    this.quantityCircle.addEventListener('click', (event) => {
      event.stopPropagation();
      const key = this.getMealKey();
      const quantity = api.mealQuantities.get(key) || 0;
      api.mealQuantities.set(key, quantity + 1);
      saveState(api.mealQuantities, api.days, api.meals);
      this.refresh();
      window.updateAggregations();
    });

    this.mealDiv.addEventListener('click', async (event) => {
      if (event.target === this.quantityCircle || this.suppressNextPopup) {
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

  async loadBadges() {
    const day = this.getAttribute('day');
    const meal = this.getAttribute('meal');
    const version = this.getAttribute('version');
    const mealData = api.data[day]?.[meal]?.[version];
    if (!mealData) return;

    const stats = await computeMealStats(mealData.content, api.parseIngredients, api);
    const badges = [];

    const mins = stats.meta.quick;
    if (mins) badges.push(`<span class="badge badge-time">${mins} min</span>`);

    const label = densityLabel(stats.score);
    if (label) badges.push(`<span class="badge badge-${label}">${label.replace('-', ' ')}</span>`);

    if (stats.ingredientCount > 0) {
      badges.push(`<span class="badge badge-ing">${stats.ingredientCount} ingr.</span>`);
    }
    if (stats.calories > 0) {
      badges.push(`<span class="badge badge-kcal">${stats.calories} kcal</span>`);
    }

    this.badgesSpan.innerHTML = badges.join('');
  }

  getMealKey() {
    return `${this.getAttribute('day')}-${this.getAttribute('meal')}-${this.getAttribute('version')}`;
  }

  refresh() {
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

  static refreshAll() {
    document.querySelectorAll('meal-element').forEach(el => {
      if (typeof el.refresh === 'function') el.refresh();
    });
  }
}

customElements.define('meal-element', MealElement);
