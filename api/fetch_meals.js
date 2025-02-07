import { days, meals, versions, data } from './constant.js';

export async function fetchData() {
    const fetchPromises = [];

    for (const day of days) {
        for (const meal of meals) {
            for (const version of versions) {
                const filePath = `meals/${day}_${meal}_${version}.txt`;
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