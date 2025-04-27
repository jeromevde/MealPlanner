// Custom CSV-based food data API
export let foodData = null;
export let nutrientMeta = null;
let loadingDataPromise = null;

// --- CSV Parsing Utility ---
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field);
                field = '';
            } else if (char === '\n' || char === '\r') {
                if (field !== '' || row.length > 0) {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                }
                // Handle \r\n
                if (char === '\r' && text[i + 1] === '\n') i++;
            } else {
                field += char;
            }
        }
        i++;
    }
    // Add last row if needed
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

// --- Data Loading ---
export async function loadData() {
    if (foodData === null || nutrientMeta === null) {
        if (!loadingDataPromise) {
            loadingDataPromise = (async () => {
                try {
                    // Load both CSVs in parallel
                    const [foodResp, nutResp] = await Promise.all([
                        fetch('./data/fooddata.csv'),
                        fetch('./data/nutrients.csv')
                    ]);
                    const [foodText, nutText] = await Promise.all([
                        foodResp.text(),
                        nutResp.text()
                    ]);
                    // Parse nutrients.csv
                    const nutRows = parseCSV(nutText.trim());
                    const nutHeader = nutRows[0];
                    nutrientMeta = {};
                    for (let i = 1; i < nutRows.length; ++i) {
                        const row = nutRows[i];
                        const name = row[nutHeader.indexOf('nutrientName')];
                        nutrientMeta[name] = {
                            id: row[nutHeader.indexOf('nutrient_id')],
                            unit_name: row[nutHeader.indexOf('unit_name')],
                            category: row[nutHeader.indexOf('nutrient_category')],
                            drv: parseFloat(row[nutHeader.indexOf('drv')]),
                            order: parseInt(row[nutHeader.indexOf('nutrient_order')], 10)
                        };
                    }
                    // Parse fooddata.csv
                    const foodRows = parseCSV(foodText.trim());
                    const foodHeader = foodRows[0];
                    foodData = {};
                    for (let i = 1; i < foodRows.length; ++i) {
                        const row = foodRows[i];
                        const foodName = row[foodHeader.indexOf('foodName')].toLowerCase();
                        const category = row[foodHeader.indexOf('food_category')];
                        const portion_unit_name = row[foodHeader.indexOf('portion_unit_name')];
                        const portion_gram_weight = row[foodHeader.indexOf('portion_gram_weight')];
                        // Nutrients: collect all columns that match a nutrient in nutrientMeta
                        let nutrients = {};
                        for (const nutName in nutrientMeta) {
                            const idx = foodHeader.indexOf(nutName);
                            if (idx !== -1 && row[idx] !== undefined && row[idx] !== '') {
                                nutrients[nutName] = {
                                    amount: parseFloat(row[idx]),
                                    unit_name: nutrientMeta[nutName].unit_name,
                                    category: nutrientMeta[nutName].category,
                                    drv: nutrientMeta[nutName].drv
                                };
                            }
                        }
                        foodData[foodName] = {
                            category,
                            portion_unit_name,
                            portion_gram_weight,
                            nutrients
                        };
                    }
                } catch (error) {
                    console.error('Error loading CSV data:', error);
                    throw error;
                } finally {
                    loadingDataPromise = null;
                }
            })();
        }
        return loadingDataPromise;
    }
}

export async function ensureDataLoaded() {
    if (foodData === null || nutrientMeta === null) {
        await loadData();
    }
}

export function get_category(foodName) {
    return foodData[foodName.toLowerCase()]?.category || 'Other';
}

export function get_nutrients(foodName) {
    return foodData[foodName.toLowerCase()]?.nutrients;
}

export function get_portion_gram_weight(foodName) {
    return parseFloat(foodData[foodName.toLowerCase()]?.portion_gram_weight);
}

export function get_portion_unit_name(foodName) {
    return foodData[foodName.toLowerCase()]?.portion_unit_name;
}

export function find_closest_matches(partialName) {
    return Object.keys(foodData)
        .filter(description => description.includes(partialName.toLowerCase()))
        .slice(0, 10);
} 