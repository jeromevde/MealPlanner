export let foods = null;
export let foods_nutrients = null;
export let nutrients = null;
export let loadingDataPromise = null;


export async function fetchCSV(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not fetch ${url}, received ${response.status}`);
    }
    const text = await response.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const parseCSVLine = (line) => {
        let result = [];
        let currentField = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            let c = line[i];
            if (c === '"' && line[i - 1] !== '\\') {
                inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
                result.push(currentField);
                currentField = '';
            } else {
                currentField += c;
            }
        }
        result.push(currentField);
        return result.map(field => 
            field.replace(/^"|"$/g, '').replace(/\\"/g, '"').trim()
        );
    };
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).map(line => {
        const columns = parseCSVLine(line);
        return headers.reduce((obj, header, index) => {
            obj[header] = columns[index] || undefined;
            return obj;
        }, {});
    });
}


export async function loadData() {
    if (foods === null || foods_nutrients === null || nutrients === null) {
        if (!loadingDataPromise) {
            loadingDataPromise = (async () => {
                try {
                    const [f_n, f, n] = await Promise.all([
                        fetchCSV('./FoodData_Central_October_2024/food_nutrient.csv'),
                        fetchCSV('./FoodData_Central_October_2024/food.csv'),
                        fetchCSV('./FoodData_Central_October_2024/nutrient.csv')
                    ]);
                    foods_nutrients = f_n;
                    foods = f;
                    nutrients = n;
                } catch (error) {
                    console.error("Error loading data:", error);
                    throw error; // re-throw to handle in caller functions
                } finally {
                    loadingDataPromise = null; // Reset promise so new load can be attempted if needed
                }
            })();
        }
        return loadingDataPromise;
    }
}


export async function ensureDataLoaded() {
    if (foods === null || foods_nutrients === null || nutrients === null) {
        await loadData();
    }
}


export async function findClosestMatches(partialName) {
    await ensureDataLoaded();
    const normalizedPartialName = partialName.toLowerCase();
    return foods
        .filter(food => 
            food.description && 
            food.description.toLowerCase().includes(normalizedPartialName) && 
            food.data_type === "foundation_food"
        )
        .slice(0, 10)
        .map(food => food.description);
}
