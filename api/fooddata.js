import * as foodapi from './api.js';

// Variables to store the JSON data and loading promise
export let foodData = null;
let loadingDataPromise = null;

// Load the preprocessed JSON data
export async function loadData() {
    if (foodData === null) {
        if (!loadingDataPromise) {
            loadingDataPromise = (async () => {
                try {
                    const response = await fetch('./fooddata/fooddata.json');
                    console.log("ela")
                    console.log(response)
                    if (!response.ok) {
                        throw new Error(`Could not fetch fooddata.json, received ${response.status}`);
                    }
                    foodData = await response.json();
                } catch (error) {
                    console.error("Error loading data:", error);
                    throw error; // Re-throw to allow caller handling
                } finally {
                    loadingDataPromise = null; // Reset promise for potential reloads
                }
            })();
        }
        return loadingDataPromise;
    }
}

// Ensure data is loaded before proceeding
export async function ensureDataLoaded() {
    if (foodData === null) {
        await loadData();
    }
}

// Find up to 10 food descriptions matching the partial name
export async function findClosestMatches(partialName) {
    await ensureDataLoaded();
    const normalizedPartialName = partialName.toLowerCase();
    return Object.keys(foodData)
        .filter(description => description.toLowerCase().includes(normalizedPartialName))
        .slice(0, 10);
}

export async function fetchData() {
    const fetchPromises = [];

    for (const day of foodapi.days) {
        for (const meal of foodapi.meals) {
            for (const version of foodapi.versions) {
                const filePath = `meals/${day}_${meal}_${version}.md`;
                fetchPromises.push(fetch(filePath).then(async (response) => {
                    if (response.ok) {
                        const fileContent = await response.text();
                        const lines = fileContent.split('\n');
                        const title = lines[0];
                        const expandedContent = lines.slice(1).join('\n');

                        if (!foodapi.data[day]) foodapi.data[day] = {};
                        if (!foodapi.data[day][meal]) foodapi.data[day][meal] = {};
                        foodapi.data[day][meal][version] = { title, content: expandedContent };
                    }
                }).catch(error => {
                    console.error(`Error fetching ${filePath}:`, error.message);
                }));
            }
        }
    }

    await Promise.all(fetchPromises);
}


// Parse meal content and create clickable nutrient links
export async function parseAndLinkMealContent(content) {
    let match;
    let newContent = content;

    while ((match = api.foodRegex.exec(content)) !== null) {
        const [, amount, foodName] = match;
        const originalText = match[0];
        // Create a foodList array with one item
        const foodList = [{ foodName: foodName, quantity: amount }];
        // Convert to JSON string, escaping double quotes for HTML attributes
        const foodListJson = JSON.stringify(foodList).replace(/"/g, '&quot;');
        // Use double quotes for the attribute
        const componentHTML = `<food-nutrient-link food-list="${foodListJson}"></food-nutrient-link>`;
        // Replace the original text with the component
        newContent = newContent.replace(originalText, componentHTML);
    }
    return newContent;
}

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
        unit_name: details.unit_name,
        category: details.category,
        drv: details.drv
    }));
}