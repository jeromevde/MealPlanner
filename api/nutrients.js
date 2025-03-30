import * as foodapi from './api.js';

// Get nutrients for a specific food name using foodData from JSON
export async function getNutrientsForName(foodName) {
    await foodapi.ensureDataLoaded();
    const normalizedFoodName = foodName.toLowerCase();
    const foodKey = Object.keys(foodapi.foodData).find(key => key.toLowerCase() === normalizedFoodName);
    if (!foodKey) {
        return { error: "Food not found" };
    }
    const nutrients = foodapi.foodData[foodKey].nutrients;
    return Object.entries(nutrients).map(([name, details]) => ({
        name,
        amount: details.amount,
        unit: details.unit,
        category: details.category,
        drv: details.drv
    }));
}

// Parse meal content and create clickable nutrient links
// Parse meal content and create clickable nutrient links
export async function parseAndLinkMealContent(content) {
    const regex = /\{(\d+(?:\.\d+)?)g\s*of\s*[^\{]*?\{([^}]+)\}\}/g;
    let match;
    let newContent = content;

    while ((match = regex.exec(content)) !== null) {
        const [, amount, foodName] = match;
        const originalText = match[0];
        const nutrientData = await getNutrientsForName(foodName);
        if (Array.isArray(nutrientData)) {
            // Truncate and flip the food name for display
            const parts = foodName.split(',').map(part => part.trim());
            let displayName = foodName; // Default to original if less than 2 parts
            if (parts.length >= 2) {
                const truncated = parts.slice(0, 2);
                const flipped = [truncated[1], truncated[0]].join(' ').toLowerCase();
                displayName = flipped;
            }
            const nutrientHTML = `<span class="nutrient-link" data-food="${foodName}"> <span style="color: black; font-weight: bold;">${amount}g of ${displayName}</span> </span>`;
            newContent = newContent.replace(originalText, nutrientHTML);
        }
    }
    return newContent;
}

// Generate HTML for the nutrient popup
export async function getNutrientHtml(ingredientName) {
    const normalizedFoodName = ingredientName.toLowerCase();
    const foodKey = Object.keys(foodapi.foodData).find(key => key.toLowerCase() === normalizedFoodName);
    if (!foodKey) {
        alert("Food not found");
        return null;
    }
    const foodCategory = foodapi.foodData[foodKey].category;
    const nutrients = await getNutrientsForName(ingredientName);
    if (nutrients.error) {
        alert(nutrients.error);
        return null;
    }

    // Group nutrients by their category
    const nutrientsByCategory = {};
    nutrients.forEach(n => {
        const cat = n.category || 'Other';
        if (!nutrientsByCategory[cat]) {
            nutrientsByCategory[cat] = [];
        }
        nutrientsByCategory[cat].push(n);
    });

    const myhtml = `
        <div class="popup-content">
        <style>
            .nutrient-popup {
                position: fixed;
                top: 100%;
                left: 100%;
                transform: translate(-50%, -50%) scale(0.9);
                background: white;
                padding: 30px;
                box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.2);
                border-radius: 12px;
                z-index: 1000;
                min-width: 50000px; /* Larger width */
                max-width: 70000px;
                opacity: 0;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            .nutrient-popup.show {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            .popup-content {
                text-align: center;
            }
            .nutrient-list {
                max-height: 400px; /* Larger height */
                overflow-y: auto;
                text-align: left;
                margin-top: 15px;
            }
            .category-section {
                margin-bottom: 20px;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: #f9f9f9;
            }
            .category-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
            }
            .nutrient-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
                font-size: 14px;
            }
            .nutrient-name {
                width: 180px; /* Wider for spacing */
                font-weight: bold;
            }
            .progress-bar-container {
                width: 200px; /* Larger progress bar */
                background: #eee;
                border-radius: 5px;
                height: 14px;
                overflow: hidden;
            }
            .progress-bar {
                height: 100%;
                background: linear-gradient(to right, lightgreen, green);
                transition: width 0.5s ease-in-out;
            }
            .nutrient-value {
                width: 150px;
                text-align: right;
                font-size: 12px;
                color: #555;
            }
            .close-button {
                margin-top: 20px;
                padding: 8px 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            }
            .close-button:hover {
                background: #0056b3;
            }
        </style>
        
        <h2>${ingredientName} (${foodCategory})</h2>
        <div class="nutrient-list">
            ${Object.entries(nutrientsByCategory).map(([category, catNutrients]) => `
                <div class="category-section">
                    <div class="category-title">${category}</div>
                    ${catNutrients.map(n => {
                        const drvValue = parseFloat(n.drv);
                        const percentage = !isNaN(drvValue) && drvValue > 0 ? 
                            Math.min((parseFloat(n.amount) / drvValue) * 100, 100) : 0;
                        return `
                            <div class="nutrient-item">
                                <span class="nutrient-name">${n.name}</span>
                                <div class="progress-bar-container">
                                    <div class="progress-bar" style="width: ${percentage}%;"></div>
                                </div>
                                <span class="nutrient-value">${n.amount} ${n.unit} / ${n.drv || 'N/A'} ${n.unit}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            `).join('')}
        </div>
        <button class="close-button" onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;

    // Trigger animation
    setTimeout(() => {
        const popup = document.querySelector('.nutrient-popup');
        if (popup) {
            popup.classList.add('show');
        }
    }, 10);

    return myhtml;
}

const overlay = document.getElementById('overlay');

document.addEventListener('click', async function(event) {
    const nutrientLink = event.target.closest('.nutrient-link');
    if (nutrientLink) {
        const food = nutrientLink.getAttribute('data-food');
        const nutrientPopup = document.getElementById('nutrient-popup');
        const nutrientPopupContent = document.getElementById('nutrient-popup-content');
        
        const nutrientHtml = await getNutrientHtml(food);
        if (nutrientHtml) {
            nutrientPopupContent.innerHTML = nutrientHtml;
            nutrientPopup.style.display = 'block';
            if (overlay) { // Assuming overlay is defined elsewhere
                overlay.style.display = 'block';
            }
        }
    }
});