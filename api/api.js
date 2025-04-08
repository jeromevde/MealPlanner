export * from './fooddata.js';
export * from './markdown.js';
export * from './longpress.js';

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

const foodRegex = /(?:\{([^{}]+)\s*of\s*[^{]*\{([^{}]+)\}\})|(?:\{{2}([^{}]+)\}{2})/g;

/*
    {pinch each of {dried oregano}} → [null, "dried oregano", "{pinch each of {dried oregano}}"]
    {{thyme}} → [null, "thyme", "{{thyme}}"]
    {{red pepper flakes}} → [null, "red pepper flakes", "{{red pepper flakes}}"]
    {1-2 cloves of {garlic}} → [null, "garlic", "{1-2 cloves of {garlic}}"]
    {2 1/4 teaspoons of {instant yeast}} → [null, "instant yeast", "{2 1/4 teaspoons of {instant yeast}}"]
    {150 g of {salt}} → [150, "salt", "{150 g of {salt}}"]
    {150g of {salt}} → [150, "salt", "{150g of {salt}}"]
    {120g of ripe {Bananas, ripe and slightly ripe, raw}} [120, "Bananas, ripe and slightly ripe, raw", "{120g of ripe {Bananas, ripe and slightly ripe, raw}}"]
*/

export function parseIngredients(content) {
    const matches = [];
    let match;
    while ((match = foodRegex.exec(content)) !== null) {
        const fullMatch = match[0]; // The whole matched string
        if (match[1] && match[2]) { // From the first pattern
            const prefix = match[1].trim(); // e.g., "120g"
            const ingredient = match[2];    // e.g., "Bananas, ripe and slightly ripe, raw"
            const quantityMatch = prefix.match(/^(\d+(?:\.\d+)?)\s*g$/);

            if (quantityMatch) {
                const quantity = parseFloat(quantityMatch[1]); // e.g., 120
                matches.push([quantity, ingredient, fullMatch]);
            } else {
                matches.push([null, ingredient, fullMatch]);
            }
        }
    }
    return matches;
}