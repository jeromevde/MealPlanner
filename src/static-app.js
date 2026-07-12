(function () {
  'use strict';

  const DATA = window.__DATA__;
  const mealQuantities = new Map();

  function mealKey(day, meal, version) {
    return `${day}-${meal}-${version}`;
  }

  function getCookie(name) {
    const prefix = name + '=';
    for (const part of document.cookie.split(';')) {
      const c = part.trim();
      if (c.startsWith(prefix)) return c.slice(prefix.length);
    }
    return null;
  }

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
  }

  function encodeSelections() {
    const parts = [];
    for (const [key, qty] of mealQuantities) {
      if (qty > 0) {
        const [day, meal, version] = key.split('-');
        parts.push(`${DATA.days.indexOf(day)}-${DATA.meals.indexOf(meal)}-${version}-${qty}`);
      }
    }
    return parts.join('|');
  }

  function decodeSelections(encoded) {
    if (!encoded) return;
    for (const part of encoded.split('|')) {
      if (!part) continue;
      const [di, mi, vi, qty] = part.split('-').map(Number);
      const key = mealKey(DATA.days[di], DATA.meals[mi], String(vi));
      mealQuantities.set(key, qty);
    }
  }

  function saveState() {
    const encoded = encodeSelections();
    setCookie('mealSelections', encoded, 7);
    location.hash = encoded;
  }

  function loadState() {
    const encoded = location.hash.slice(1) || getCookie('mealSelections') || '';
    if (encoded && !location.hash.slice(1)) location.hash = encoded;
    decodeSelections(encoded);
  }

  function getFood(id) {
    return DATA.foods[id];
  }

  function scaleContent(html, factor) {
    return html.replace(/data-qty="([\d.]+)"/g, (_, q) => {
      const scaled = (parseFloat(q) * factor).toFixed(2).replace(/\.00$/, '');
      return `data-qty="${scaled}"`;
    }).replace(/<span class="qty">([\d.]+)g<\/span>/g, (_, q) => {
      const scaled = (parseFloat(q) * factor).toFixed(2).replace(/\.00$/, '');
      return `<span class="qty">${scaled}g</span>`;
    });
  }

  function aggregateNutrients(foodList) {
    const agg = {};
    for (const { foodName, quantity } of foodList) {
      const food = getFood(foodName);
      if (!food || !quantity) continue;
      const scale = quantity / 100;
      for (const [name, amount] of Object.entries(food.nutrients)) {
        agg[name] = (agg[name] || 0) + amount * scale;
      }
    }
    return agg;
  }

  function renderNutrientPanel(container, foodList, title) {
    const agg = aggregateNutrients(foodList);
    const byCategory = {};
    for (const [name, total] of Object.entries(agg)) {
      const meta = DATA.drv[name];
      if (!meta) continue;
      const cat = meta.category || 'Other';
      (byCategory[cat] = byCategory[cat] || []).push({ name, total, ...meta });
    }

    let html = `<button class="close-btn" onclick="this.parentElement.style.display='none'">×</button>`;
    html += `<h3>${title}</h3><div class="nutrient-list">`;
    for (const [cat, items] of Object.entries(byCategory)) {
      html += `<div class="category-section"><div class="category-title">${cat}</div>`;
      for (const n of items) {
        const pct = n.drv > 0 ? Math.min((n.total / n.drv) * 100, 100) : 100;
        html += `<div class="nutrient-item">
          <span class="nutrient-name">${n.name}</span>
          <div class="progress-bar-container"><div class="progress-bar" style="width:${pct}%"></div></div>
          <span class="nutrient-value">${n.total.toFixed(1)} / ${n.drv} ${n.unit}</span>
        </div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
  }

  function openRecipe(day, meal, version) {
    const item = DATA.mealData[day][meal][version];
    const key = mealKey(day, meal, version);
    let people = Math.max(1, mealQuantities.get(key) || 1);
    const popup = document.getElementById('popup');
    const overlay = document.getElementById('overlay');
    const content = document.getElementById('popup-content');
    const nutrientPanel = document.getElementById('nutrient-panel');
    nutrientPanel.style.display = 'none';

    function render() {
      const scaled = scaleContent(item.contentHtml, people);
      content.innerHTML = `
        <div class="popup-header">
          <h2>${item.title} for <span id="popup-people">${people}</span> people</h2>
          <div class="quantity-control">
            <button class="decrement">−</button>
            <input type="number" min="1" step="1" value="${people}" id="popup-people-input">
            <button class="increment">+</button>
          </div>
        </div>
        <div class="popup-body">${scaled}</div>`;

      content.querySelector('.decrement').onclick = () => {
        if (people > 1) { people--; mealQuantities.set(key, people); saveState(); refreshCards(); updateAggregations(); render(); }
      };
      content.querySelector('.increment').onclick = () => {
        people++; mealQuantities.set(key, people); saveState(); refreshCards(); updateAggregations(); render();
      };
      content.querySelector('#popup-people-input').onchange = (e) => {
        const v = parseInt(e.target.value, 10);
        if (v >= 1) { people = v; mealQuantities.set(key, people); saveState(); refreshCards(); updateAggregations(); render(); }
      };

      content.querySelectorAll('.ingredient-link').forEach((el) => {
        el.onclick = (ev) => {
          ev.stopPropagation();
          const food = el.dataset.food;
          const qty = parseFloat(el.dataset.qty);
          const display = getFood(food)?.display_name || food;
          renderNutrientPanel(nutrientPanel, [{ foodName: food, quantity: qty }],
            `${qty}g of ${display}`);
        };
      });
    }

    render();
    popup.style.display = 'block';
    overlay.style.display = 'block';
  }

  function closePopups() {
    document.getElementById('popup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('nutrient-panel').style.display = 'none';
  }

  function refreshCards() {
    document.querySelectorAll('.meal').forEach((card) => {
      const key = mealKey(card.dataset.day, card.dataset.meal, card.dataset.version);
      const qty = mealQuantities.get(key) || 0;
      const circle = card.querySelector('.quantity-circle');
      circle.textContent = qty > 0 ? qty : '';
      card.classList.toggle('selected', qty > 0);
      circle.classList.toggle('active', qty > 0);
    });
  }

  function updateAggregations() {
    const allFoods = [];
    for (const [key, qty] of mealQuantities) {
      if (qty <= 0) continue;
      const [day, meal, version] = key.split('-');
      const item = DATA.mealData[day]?.[meal]?.[version];
      if (!item) continue;
      for (const ing of item.ingredients) {
        allFoods.push({ foodName: ing.foodName, quantity: ing.quantity * qty });
      }
    }

    const shopEl = document.getElementById('shopping-list');
    if (allFoods.length === 0) {
      shopEl.innerHTML = '<p class="empty-hint">Select meals above to build your shopping list.</p>';
    } else {
      const totals = new Map();
      for (const { foodName, quantity } of allFoods) {
        totals.set(foodName, (totals.get(foodName) || 0) + quantity);
      }
      const byCat = {};
      for (const [id, total] of totals) {
        const cat = getFood(id)?.category || 'Other';
        (byCat[cat] = byCat[cat] || []).push({ id, total, name: getFood(id)?.display_name || id });
      }
      let html = '<div class="food-list"><h2>Ingredients to buy</h2><div class="categories-wrapper">';
      for (const cat of Object.keys(byCat).sort()) {
        html += `<div class="category-section"><div class="category-title">${cat}</div><div class="food-items-container">`;
        for (const f of byCat[cat]) {
          html += `<div class="food-item"><span class="ingredient-link" data-food="${f.id}" data-qty="${f.total.toFixed(0)}"><strong>${f.name}</strong> <span class="qty">${f.total.toFixed(0)}g</span></span></div>`;
        }
        html += '</div></div>';
      }
      html += '</div></div>';
      shopEl.innerHTML = html;
      shopEl.querySelectorAll('.ingredient-link').forEach((el) => {
        el.onclick = () => {
          const food = el.dataset.food;
          const qty = parseFloat(el.dataset.qty);
          const panel = document.getElementById('nutrient-panel');
          panel.style.display = 'block';
          document.getElementById('popup').style.display = 'block';
          document.getElementById('overlay').style.display = 'block';
          renderNutrientPanel(panel, [{ foodName: food, quantity: qty }],
            `${qty}g of ${getFood(food)?.display_name || food}`);
        };
      });
    }

    const nutEl = document.getElementById('nutrient-aggregate');
    if (allFoods.length === 0) {
      nutEl.innerHTML = '<p class="empty-hint">Select meals to see aggregated nutrients.</p>';
    } else {
      renderNutrientPanel(nutEl, allFoods, 'Nutrients for selected plan');
      nutEl.style.display = 'block';
      nutEl.querySelector('.close-btn')?.remove();
    }

    saveState();
  }

  function init() {
    loadState();
    refreshCards();
    updateAggregations();

    document.querySelectorAll('.meal').forEach((card) => {
      const { day, meal, version } = card.dataset;
      const key = mealKey(day, meal, version);
      if (!mealQuantities.has(key)) mealQuantities.set(key, 0);

      card.querySelector('.quantity-circle').addEventListener('click', (e) => {
        e.stopPropagation();
        const qty = (mealQuantities.get(key) || 0) + 1;
        mealQuantities.set(key, qty);
        refreshCards();
        updateAggregations();
      });

      card.addEventListener('click', () => openRecipe(day, meal, version));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRecipe(day, meal, version); }
      });
    });

    document.querySelectorAll('.section-reset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mealType = btn.dataset.meal;
        for (const day of DATA.days) {
          const versions = DATA.mealData[day]?.[mealType] || {};
          for (const version of Object.keys(versions)) {
            mealQuantities.set(mealKey(day, mealType, version), 0);
          }
        }
        refreshCards();
        updateAggregations();
      });
    });

    document.getElementById('overlay').addEventListener('click', closePopups);

    document.querySelectorAll('.tab-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
      });
    });

    registerServiceWorker();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
