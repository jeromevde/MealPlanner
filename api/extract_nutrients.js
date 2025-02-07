import { ensureDataLoaded } from "./fetch_fooddata.js";
import { foods, foods_nutrients, nutrients } from "./fetch_fooddata.js";

export async function parseAndLinkMealContent(content) {
    const regex = /\[([^;]+);\s*(\d+(?:\.\d+)?);\s*(\w+)\]/g;
    // match something like [Pears, raw, bartlett; 200; g]
    let match;
    let newContent = content;
    while ((match = regex.exec(content)) !== null) {
        console.log("eyy")
        console.log(match)
        const [, food, quantity, unit] = match;
        const originalText = match[0];
        const nutrientData = await getNutrientsForName(food);
        
        if (nutrientData) {
            const nutrientHTML = `<span class="nutrient-link" data-food="${food}">${originalText}</span>`;
            newContent = newContent.replace(originalText, nutrientHTML);
        }
    }

    return newContent;
}


export async function getNutrientsForName(foodName) {
    "use strict";
    await ensureDataLoaded();
    const normalizedFoodName = foodName.toLowerCase();
    const food = foods.find(food => 
        food.description && food.description.toLowerCase() === normalizedFoodName
    );
    if (!food) {
        return { error: "Food not found" };
    }
    const nutrientInfo = foods_nutrients.filter(nutrient => nutrient.fdc_id == food.fdc_id);
    return nutrientInfo.map(nutrient => {
        const nutrientDetail = nutrients.find(n => n.id == nutrient.nutrient_id);
        return {
            name: nutrientDetail ? nutrientDetail.name : 'Unknown Nutrient',
            amount: nutrient.amount || 'N/A',
            unit: nutrientDetail ? nutrientDetail.unit_name : 'Unknown Unit',
            data_points: nutrient.data_points || 'N/A',
            min: nutrient.min || 'N/A',
        };
    });
}

export async function getNutrientHtml(ingredientName) {
    const DRV = {
        "Energy": 2000, // kcal
        "Protein": 50, // g
        "Total lipid (fat)": 70, // g
        "Carbohydrate": 275, // g
        "Fiber": 28, // g
        "Sugars": 50, // g
        "Calcium": 1300, // mg
        "Iron": 18, // mg
        "Sodium": 2300, // mg
        "Potassium": 4700, // mg
        "Vitamin C": 90, // mg
        "Vitamin D": 20, // mcg
    };

const nutrients = await getNutrientsForName(ingredientName);
    if (nutrients.error) {
        alert(nutrients.error);
        return;
    }

    const myhtml = `
        <div class="popup-content">
        <style>
        .nutrient-popup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
            border-radius: 10px;
            z-index: 1000;
        }
        .popup-content {
            text-align: center;
        }
        .nutrient-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .nutrient-item {
            margin-bottom: 10px;
        }
        .progress-bar-container {
            width: 100%;
            background: #eee;
            border-radius: 5px;
            height: 10px;
            overflow: hidden;
        }
        .progress-bar {
            height: 100%;
            background: green;
        }
            </style>
            <h2>Nutrients in ${ingredientName}</h2>
            <div class="nutrient-list">
                ${nutrients.map(n => {
                    let percentage = DRV[n.name] ? (parseFloat(n.amount) / DRV[n.name]) * 100 : 0;
                    percentage = Math.min(percentage, 100); // Cap at 100%
                    return `
                        <div class="nutrient-item">
                            <span class="nutrient-name">${n.name} (${n.amount} ${n.unit})</span>
                            <div class="progress-bar-container">
                                <div class="progress-bar" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <button onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;
    return myhtml;
}