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
    const regex = /\{(\d+(?:\.\d+)?)g\s*of\s*[^\{]*?\{([^}]+)\}\}/g;
    let match;
    let newContent = content;

    while ((match = regex.exec(content)) !== null) {
        const [, amount, foodName] = match;
        const originalText = match[0];
        const nutrientData = await api.getNutrientsForName(foodName);
        if (Array.isArray(nutrientData)) {
            // Truncate and flip the food name for display
            const parts = foodName.split(',').map(part => part.trim());
            let displayName = foodName; // Default to original if less than 2 parts
            if (parts.length >= 2) {
                const truncated = parts.slice(0, 2);
                const flipped = [truncated[1], truncated[0]].join(' ').toLowerCase();
                displayName = flipped;
            }
            const nutrientHTML = `<food-nutrient-link food-name="${foodName}"> <span style="color: black; font-weight: bold;">${amount}g of ${displayName}</span> </food-nutrient-link>`;
            newContent = newContent.replace(originalText, nutrientHTML);
        }
    }
    return newContent;
}