export * from './markdown.js';

export const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const meals = ["morning", "midday", "evening"];
export const versions = ["1", "2", "3"];
export const data = {};
export const food_csv = "./fooddata/food.csv";
export const nutrient_csv = "./fooddata/nutrient.csv";
export const food_nutrient_csv = "./fooddata/food_nutrient.csv";
export const food_category_csv = "./fooddata/food_category.csv";

export const selected_meals = new Set();
export const mealQuantities = new Map();

export const selected_foods = {}
export const selected_nutrients = {}

// Regex to match two patterns:
// 1. {quantity g {ingredient}} (e.g., {150g {salt}})
// 2. {{ingredient}} (e.g., {{thyme}})
const foodRegex = /(?:\{(\d+(?:\.\d+)?)\s*g\s*\{([^{}]+)\}\})|(?:\{{2}([^{}]+)\}{2})/g;
export function parseIngredients(content) {
    const matches = [];
    let match;
    while ((match = foodRegex.exec(content)) !== null) {
        let quantity, ingredient, fullMatch;
        if (match[1] && match[2]) {
            quantity = parseFloat(match[1]);
            ingredient = match[2].trim();
        } else if (match[3]) {
            quantity = null;
            ingredient = match[3].trim();
        }
        fullMatch = match[0];
        console.log([quantity, ingredient, fullMatch]);
        matches.push([quantity, ingredient, fullMatch]);
    }
    return matches;
}


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

    for (const day of days) {
        for (const meal of  meals) {
            for (const version of  versions) {
                const filePath = `meals/${day}_${meal}_${version}.md`;
                fetchPromises.push(fetch(filePath).then(async (response) => {
                    if (response.ok) {
                        const fileContent = await response.text();
                        const lines = fileContent.split('\n');
                        const title = lines[0];
                        const expandedContent = lines.slice(1).join('\n');

                        if (!data[day]) data[day] = {};
                        if (!data[day][meal]) data[day][meal] = {};
                        data[day][meal][version] = { title, content: expandedContent };
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
    for (const [amount, foodName, originalText] of api.parseIngredients(content)){
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
    await ensureDataLoaded();
    const normalizedFoodName = foodName.toLowerCase();
    const foodKey = Object.keys(foodData).find(key => key.toLowerCase() === normalizedFoodName);
    if (!foodKey) {
        return { error: "Food not found" };
    }
    const nutrients = foodData[foodKey].nutrients;
    return Object.entries(nutrients).map(([name, details]) => ({
        name,
        amount: details.amount,
        unit_name: details.unit_name,
        category: details.category,
        drv: details.drv
    }));
}