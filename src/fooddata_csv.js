// CSV-based food data API (pyfooda ingredients)
export let foodData = null;
export let nutrientMeta = null;
export let displayNames = null;
let loadingDataPromise = null;

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
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += char;
        } else {
            if (char === '"') inQuotes = true;
            else if (char === ',') { row.push(field); field = ''; }
            else if (char === '\n' || char === '\r') {
                if (field !== '' || row.length > 0) { row.push(field); rows.push(row); row = []; field = ''; }
                if (char === '\r' && text[i + 1] === '\n') i++;
            } else field += char;
        }
        i++;
    }
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
}

function resolveKey(name) {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    if (foodData[key]) return key;
    const snake = key.replace(/\s+/g, '_');
    if (foodData[snake]) return snake;
    if (displayNames[key]) return displayNames[key];
    return null;
}

export async function loadData() {
    if (foodData !== null && nutrientMeta !== null) return;
    if (!loadingDataPromise) {
        loadingDataPromise = (async () => {
            try {
                const [foodResp, nutResp] = await Promise.all([
                    fetch('./data/fooddata.csv'),
                    fetch('./data/nutrients.csv')
                ]);
                const [foodText, nutText] = await Promise.all([foodResp.text(), nutResp.text()]);

                const nutRows = parseCSV(nutText.trim());
                const nutHeader = nutRows[0];
                nutrientMeta = {};
                const seenNutrients = new Set();
                for (let i = 1; i < nutRows.length; ++i) {
                    const row = nutRows[i];
                    const name = row[nutHeader.indexOf('nutrientName')];
                    if (seenNutrients.has(name)) continue;
                    seenNutrients.add(name);
                    nutrientMeta[name] = {
                        id: row[nutHeader.indexOf('nutrient_id')],
                        unit_name: row[nutHeader.indexOf('unit_name')],
                        category: row[nutHeader.indexOf('nutrient_category')],
                        drv: parseFloat(row[nutHeader.indexOf('drv')]),
                        order: parseInt(row[nutHeader.indexOf('nutrient_order')], 10)
                    };
                }

                const foodRows = parseCSV(foodText.trim());
                const foodHeader = foodRows[0];
                foodData = {};
                displayNames = {};

                for (let i = 1; i < foodRows.length; ++i) {
                    const row = foodRows[i];
                    const foodName = row[foodHeader.indexOf('foodName')].toLowerCase();
                    const displayName = row[foodHeader.indexOf('display_name')];
                    const category = row[foodHeader.indexOf('food_category')];
                    const portion_unit_name = row[foodHeader.indexOf('portion_unit_name')];
                    const portion_gram_weight = row[foodHeader.indexOf('portion_gram_weight')];

                    const nutrients = {};
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
                        display_name: displayName,
                        category,
                        portion_unit_name,
                        portion_gram_weight,
                        nutrients
                    };
                    if (displayName) {
                        displayNames[displayName.toLowerCase()] = foodName;
                    }
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

export async function ensureDataLoaded() {
    if (foodData === null || nutrientMeta === null) await loadData();
}

export function get_display_name(foodName) {
    const key = resolveKey(foodName);
    return key ? foodData[key].display_name : foodName;
}

export function get_category(foodName) {
    const key = resolveKey(foodName);
    return key ? foodData[key].category : 'Other';
}

export function get_nutrients(foodName) {
    const key = resolveKey(foodName);
    return key ? foodData[key].nutrients : null;
}

export function get_portion_gram_weight(foodName) {
    const key = resolveKey(foodName);
    return key ? parseFloat(foodData[key].portion_gram_weight) : NaN;
}

export function get_portion_unit_name(foodName) {
    const key = resolveKey(foodName);
    return key ? foodData[key].portion_unit_name : null;
}

export function find_closest_matches(partialName) {
    const q = partialName.toLowerCase();
    return Object.entries(foodData)
        .filter(([id, data]) =>
            id.includes(q) || (data.display_name && data.display_name.toLowerCase().includes(q))
        )
        .slice(0, 10)
        .map(([id]) => id);
}

export function has_food(foodName) {
    return resolveKey(foodName) !== null;
}
