(function () {
  'use strict';

  const DATA = window.__DATA__;
  const mealQuantities = new Map();
  const MEAL_SLOT_LABELS = { morning: 'breakfast', midday: 'lunch', evening: 'dinner' };
  let popupReturnFn = null;

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

  function nutrientDrvDisplay(total, drv, unit) {
    if (!drv || drv <= 0) {
      return {
        metWidth: 0,
        excessWidth: 0,
        valueHtml: `${total.toFixed(1)} ${unit}`,
        itemClass: 'nutrient-item',
        valueClass: 'nutrient-value',
      };
    }

    const pct = (total / drv) * 100;
    const metWidth = Math.min(pct, 100);
    const excessWidth = pct > 100 ? Math.min(pct - 100, 100) : 0;
    const roundedPct = Math.round(pct);

    return {
      pct,
      metWidth,
      excessWidth,
      valueHtml: `${total.toFixed(1)} ${unit} · <strong>${roundedPct}%</strong> DRV`,
      itemClass: pct > 100 ? 'nutrient-item nutrient-item--excess' : 'nutrient-item',
      valueClass: pct > 100 ? 'nutrient-value nutrient-value--excess' : 'nutrient-value',
    };
  }

  function nutrientBarHtml(metWidth, excessWidth) {
    const excessHtml = excessWidth > 0
      ? `<div class="progress-bar-excess-segment" style="width:calc(var(--bar-base) * ${excessWidth} / 100)">
          <div class="progress-bar progress-bar--excess"></div>
        </div>`
      : '';
    return `<div class="progress-bar-wrapper${excessWidth > 0 ? ' progress-bar-wrapper--excess' : ''}">
      <div class="progress-bar-container">
        <div class="progress-bar progress-bar--met" style="width:${metWidth}%"></div>
      </div>
      ${excessHtml}
    </div>`;
  }

  function nutrientAmount(foodName, quantity, nutrientName) {
    const food = getFood(foodName);
    if (!food || !quantity) return 0;
    const per100 = food.nutrients[nutrientName];
    if (per100 == null) return 0;
    return per100 * quantity / 100;
  }

  function formatMealSource(source) {
    const day = source.day.charAt(0).toUpperCase() + source.day.slice(1);
    const slot = MEAL_SLOT_LABELS[source.meal] || source.meal;
    const servings = source.servings > 1 ? `, ${source.servings}×` : '';
    return `${source.mealTitle} · ${day} ${slot}${servings}`;
  }

  function renderNutrientContributors(container, nutrientName, sources, onBack, hint) {
    const meta = DATA.drv[nutrientName];
    if (!meta) return;

    const contributors = sources
      .map((source) => ({
        ...source,
        amount: nutrientAmount(source.foodName, source.quantity, nutrientName),
        displayName: getFood(source.foodName)?.display_name || source.foodName,
      }))
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const total = contributors.reduce((sum, entry) => sum + entry.amount, 0);
    let html = '';
    if (onBack) {
      html += `<button type="button" class="nutrient-back">← All nutrients</button>`;
    }
    html += `<h3>${nutrientName}</h3>`;
    html += `<p class="nutrient-hint">${hint || 'Top food sources across your selected meals'}</p>`;

    if (contributors.length === 0) {
      html += '<p class="empty-hint">No tracked sources for this nutrient.</p>';
    } else {
      html += '<div class="contributor-list">';
      for (const entry of contributors) {
        const pct = total > 0 ? (entry.amount / total) * 100 : 0;
        html += `<div class="contributor-item">
          <div class="contributor-header">
            <span class="contributor-food">${entry.displayName}</span>
            <span class="contributor-amount">${entry.amount.toFixed(1)} ${meta.unit} (${pct.toFixed(0)}%)</span>
          </div>
          <div class="contributor-meal">${formatMealSource(entry)} · ${entry.quantity.toFixed(0)}g</div>
          <div class="contributor-bar-container">
            <div class="contributor-bar" style="width:${pct}%"></div>
          </div>
        </div>`;
      }
      html += '</div>';
    }

    container.innerHTML = html;
    if (onBack) {
      container.querySelector('.nutrient-back')?.addEventListener('click', onBack);
    }
  }

  function openNutrientContributorsPopup(nutrientName, sources, onBack, hint) {
    const popup = document.getElementById('popup');
    const overlay = document.getElementById('overlay');
    const content = document.getElementById('popup-content');

    content.innerHTML = `
      <button type="button" class="popup-close" aria-label="Close">×</button>
      ${onBack ? '<button type="button" class="nutrient-back">← Back to recipe</button>' : ''}
      <div class="popup-contributors"></div>`;
    content.querySelector('.popup-close').addEventListener('click', closePopups);
    if (onBack) {
      content.querySelector('.nutrient-back').addEventListener('click', () => {
        popupReturnFn = null;
        onBack();
      });
    }
    renderNutrientContributors(
      content.querySelector('.popup-contributors'),
      nutrientName,
      sources,
      null,
      hint,
    );

    popupReturnFn = onBack
      ? () => {
          popupReturnFn = null;
          onBack();
        }
      : null;

    popup.style.display = 'block';
    overlay.style.display = 'block';
  }

  function openIngredientNutrientsPopup(foodName, quantity, title, onBack) {
    const content = document.getElementById('popup-content');
    content.innerHTML = `
      <button type="button" class="popup-close" aria-label="Close">×</button>
      <button type="button" class="nutrient-back">← Back to recipe</button>
      <div class="popup-ingredient-nutrients"></div>`;
    content.querySelector('.popup-close').addEventListener('click', closePopups);
    content.querySelector('.nutrient-back').addEventListener('click', () => {
      popupReturnFn = null;
      onBack();
    });
    renderNutrientPanel(
      content.querySelector('.popup-ingredient-nutrients'),
      [{ foodName, quantity }],
      title,
      { embedded: true },
    );
    popupReturnFn = () => {
      popupReturnFn = null;
      onBack();
    };
  }

  function renderNutrientPanel(container, foodList, title, options) {
    const opts = options || {};
    const agg = aggregateNutrients(foodList);
    const byCategory = {};
    for (const [name, total] of Object.entries(agg)) {
      const meta = DATA.drv[name];
      if (!meta) continue;
      const cat = meta.category || 'Other';
      (byCategory[cat] = byCategory[cat] || []).push({ name, total, ...meta });
    }

    let html = '';
    if (!opts.embedded) {
      html += `<button class="close-btn" onclick="this.parentElement.style.display='none'">×</button>`;
    }
    html += `<h3>${title}</h3>`;
    if (opts.interactive) {
      html += '<p class="nutrient-hint">Click a nutrient to see which ingredients contribute. Green fills to 100% DRV; amber extends past it for excess.</p>';
    }
    html += '<div class="nutrient-list">';
    for (const [cat, items] of Object.entries(byCategory)) {
      items.sort((a, b) => (a.order || 0) - (b.order || 0));
      html += `<div class="category-section"><div class="category-title">${cat}</div>`;
      for (const n of items) {
        const drv = nutrientDrvDisplay(n.total, n.drv, n.unit);
        const nameClass = opts.interactive ? 'nutrient-name clickable' : 'nutrient-name';
        html += `<div class="${drv.itemClass}">
          <span class="${nameClass}" data-nutrient="${n.name}">${n.name}</span>
          ${nutrientBarHtml(drv.metWidth, drv.excessWidth)}
          <span class="${drv.valueClass}">${drv.valueHtml}</span>
        </div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
    if (!opts.embedded) container.style.display = 'block';

    if (opts.interactive && opts.sources) {
      container.querySelectorAll('.nutrient-name.clickable').forEach((el) => {
        el.addEventListener('click', () => {
          openNutrientContributorsPopup(
            el.dataset.nutrient,
            opts.sources,
            opts.onContributorBack,
            opts.contributorHint,
          );
        });
      });
    }
  }

  function openRecipe(day, meal, version) {
    const item = DATA.mealData[day][meal][version];
    const key = mealKey(day, meal, version);
    let people = Math.max(1, mealQuantities.get(key) || 1);
    const popup = document.getElementById('popup');
    const overlay = document.getElementById('overlay');
    const content = document.getElementById('popup-content');

    function render() {
      popupReturnFn = null;
      const scaled = scaleContent(item.contentHtml, people);
      content.innerHTML = `
        <button type="button" class="popup-close" aria-label="Close">×</button>
        <div class="popup-header">
          <h2>${item.title} for <span id="popup-people">${people}</span> people</h2>
          <div class="quantity-control">
            <button class="decrement">−</button>
            <input type="number" min="1" step="1" value="${people}" id="popup-people-input">
            <button class="increment">+</button>
          </div>
        </div>
        <div class="popup-body">${scaled}</div>
        <div class="popup-nutrients" id="popup-nutrients"></div>`;

      content.querySelector('.popup-close').addEventListener('click', closePopups);

      const foodList = item.ingredients.map((ing) => ({
        foodName: ing.foodName,
        quantity: ing.quantity,
      }));
      const sources = item.ingredients.map((ing) => ({
        foodName: ing.foodName,
        quantity: ing.quantity,
        day,
        meal,
        version,
        mealTitle: item.title,
        servings: 1,
      }));
      renderNutrientPanel(
        content.querySelector('#popup-nutrients'),
        foodList,
        'Nutrition per person',
        {
          embedded: true,
          interactive: true,
          sources,
          onContributorBack: render,
          contributorHint: 'Ingredients contributing to this nutrient in this recipe',
        },
      );

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
          ev.preventDefault();
          const food = el.dataset.food;
          const qty = parseFloat(el.dataset.qty);
          const display = getFood(food)?.display_name || food;
          openIngredientNutrientsPopup(food, qty, `${qty}g of ${display}`, render);
        };
      });
    }

    render();
    popup.style.display = 'block';
    overlay.style.display = 'block';
  }

  function closePopups() {
    popupReturnFn = null;
    document.getElementById('popup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
  }

  function handleOverlayClick() {
    if (popupReturnFn) {
      popupReturnFn();
      return;
    }
    closePopups();
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
    const sources = [];
    for (const [key, qty] of mealQuantities) {
      if (qty <= 0) continue;
      const [day, meal, version] = key.split('-');
      const item = DATA.mealData[day]?.[meal]?.[version];
      if (!item) continue;
      for (const ing of item.ingredients) {
        const quantity = ing.quantity * qty;
        allFoods.push({ foodName: ing.foodName, quantity });
        sources.push({
          foodName: ing.foodName,
          quantity,
          day,
          meal,
          version,
          mealTitle: item.title,
          servings: qty,
        });
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
          const popup = document.getElementById('popup');
          const content = document.getElementById('popup-content');
          popupReturnFn = null;
          content.innerHTML = `
            <button type="button" class="popup-close" aria-label="Close">×</button>
            <div class="popup-ingredient-nutrients"></div>`;
          content.querySelector('.popup-close').addEventListener('click', closePopups);
          renderNutrientPanel(
            content.querySelector('.popup-ingredient-nutrients'),
            [{ foodName: food, quantity: qty }],
            `${qty}g of ${getFood(food)?.display_name || food}`,
            { embedded: true },
          );
          popup.style.display = 'block';
          document.getElementById('overlay').style.display = 'block';
        };
      });
    }

    const nutEl = document.getElementById('nutrient-aggregate');
    if (allFoods.length === 0) {
      nutEl.innerHTML = '<p class="empty-hint">Select meals to see aggregated nutrients.</p>';
    } else {
      renderNutrientPanel(nutEl, allFoods, 'Nutrients for selected plan', {
        interactive: true,
        sources,
      });
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

    document.getElementById('overlay').addEventListener('click', handleOverlayClick);

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

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    async function checkForAppUpdate(reg) {
      const current = window.__APP_VERSION__;
      if (!current) return;
      try {
        const res = await fetch('./version.json', { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version && version !== current) {
          await reg.update();
        }
      } catch {
        // Offline or unreachable — keep serving cached app.
      }
    }

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js');
        await checkForAppUpdate(reg);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForAppUpdate(reg);
        });
      } catch (err) {
        console.warn('Service worker registration failed:', err);
      }
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
