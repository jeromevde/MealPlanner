export * from './markdown.js';
export * from './fooddata.js'
export *  from './state.js'



// CONSTANTS
export const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const meals = ["morning", "midday", "evening"];
export const versions = ["1", "2", "3"];
export const data = {};
export const food_csv = "./fooddata/food.csv";
export const nutrient_csv = "./fooddata/nutrient.csv";
export const food_nutrient_csv = "./fooddata/food_nutrient.csv";
export const food_category_csv = "./fooddata/food_category.csv";


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




export async function fetchData() {
    const fetchPromises = [];
    for (const day of days) {
        for (const meal of  meals) {
            for (const version of versions) {
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
