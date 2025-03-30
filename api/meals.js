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