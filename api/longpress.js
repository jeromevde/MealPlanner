function startLongPress(event) {
    event.preventDefault();
    const mealDiv = event.currentTarget;
    mealDiv._longPressTriggered = false;
    mealDiv._longPressTimeout = setTimeout(() => {
        mealDiv.classList.toggle('selected');
        const day = mealDiv.dataset.day;
        const meal = mealDiv.dataset.meal;
        const version = mealDiv.dataset.version;
        const mealKey = `${day}-${meal}-${version}`;

        if (mealDiv.classList.contains('selected')) {
            api.selected_meals.add(mealKey);
        } else {
            api.selected_meals.delete(mealKey);
        }

        calculateAggregations();

        mealDiv._longPressTriggered = true;
    }, 500);
}

function endPress(event) {
    const mealDiv = event.currentTarget;
    clearTimeout(mealDiv._longPressTimeout);
}

function cancelLongPress(event) {
    const mealDiv = event.currentTarget;
    clearTimeout(mealDiv._longPressTimeout);
}

export function addLongPressListeners(versionDiv){
    versionDiv.addEventListener('mousedown', startLongPress);
    versionDiv.addEventListener('touchstart', startLongPress);
    versionDiv.addEventListener('mouseup', endPress);
    versionDiv.addEventListener('touchend', endPress);
    versionDiv.addEventListener('mouseleave', cancelLongPress);
    versionDiv.addEventListener('touchcancel', cancelLongPress);
}


function parseIngredients(content) {
    const regex = /{(\d+)g of .*? {([^}]+)}}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        const quantity = parseInt(match[1], 10);
        const ingredientName = match[2];
        matches.push([quantity, ingredientName]);
    }
    return matches;
}

async function calculateAggregations() {
    const ingredientsList = document.getElementById('ingredients-list');
    const nutrientsList = document.getElementById('nutrients-list');

    if (api.selected_meals.size === 0) {
        ingredientsList.innerHTML = '<li>No meals selected</li>';
        nutrientsList.innerHTML = '<li>No meals selected</li>';
        return;
    }

    const ingredientTotals = new Map();
    for (const mealKey of api.selected_meals) {
        const [day, mealTime, version] = mealKey.split('-');
        const content = api.data[day][mealTime][version].content;
        const ingredients = parseIngredients(content);
        for (const [quantity, ingredientName] of ingredients) {
            const currentTotal = ingredientTotals.get(ingredientName) || 0;
            ingredientTotals.set(ingredientName, currentTotal + quantity);
        }
    }

    const uniqueIngredients = Array.from(ingredientTotals.keys());
    const nutrientPromises = uniqueIngredients.map(name => api.getNutrientsForName(name));
    const nutrientDataArray = await Promise.all(nutrientPromises);
    const nutrientDataMap = new Map(uniqueIngredients.map((name, index) => [
        name,
        Array.isArray(nutrientDataArray[index]) ? nutrientDataArray[index] : []
    ]));

    const nutrientTotals = new Map();
    for (const [ingredientName, totalQuantity] of ingredientTotals) {
        const nutrientData = nutrientDataMap.get(ingredientName);
        for (const nutrient of nutrientData) {
            const scaledAmount = nutrient.amount * (totalQuantity / 100);
            if (nutrientTotals.has(nutrient.name)) {
                nutrientTotals.get(nutrient.name).totalAmount += scaledAmount;
            } else {
                nutrientTotals.set(nutrient.name, { totalAmount: scaledAmount, unit: nutrient.unit });
            }
        }
    }

    let ingredientsHtml = '';
    for (const [name, quantity] of ingredientTotals) {
        ingredientsHtml += `<li>${name}: ${quantity}g</li>`;
    }
    ingredientsList.innerHTML = ingredientsHtml;

    let nutrientsHtml = '';
    for (const [name, { totalAmount, unit }] of nutrientTotals) {
        nutrientsHtml += `<li>${name}: ${totalAmount.toFixed(2)} ${unit}</li>`;
    }
    nutrientsList.innerHTML = nutrientsHtml;
}