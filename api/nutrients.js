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
