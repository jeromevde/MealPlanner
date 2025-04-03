import * as foodapi from './api.js';

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