import { nutrientMeta as drvMeta } from './fooddata_csv.js';

const MICRONUTRIENTS = [
    'Protein', 'Iron', 'Vitamin A, RAE', 'Vitamin B-12', 'Vitamin C',
    'Vitamin D (D2 + D3)', 'Calcium', 'Magnesium', 'Zinc', 'Selenium',
    'Potassium', 'Folate, total', 'Choline'
];

export function scoreIngredients(ingredientList, getNutrients) {
    const aggregated = {};
    let calories = 0;

    for (const { foodName, quantity } of ingredientList) {
        if (!foodName || !quantity) continue;
        const nutrients = getNutrients(foodName);
        if (!nutrients) continue;
        const scale = quantity / 100;
        for (const [name, details] of Object.entries(nutrients)) {
            if (!aggregated[name]) aggregated[name] = 0;
            aggregated[name] += details.amount * scale;
        }
    }
    calories = aggregated['Energy'] || 0;
    if (calories <= 0) return { score: 0, calories: 0, drvPercent: 0, ingredientCount: ingredientList.length };

    let drvSum = 0;
    for (const name of MICRONUTRIENTS) {
        const amount = aggregated[name] || 0;
        const drv = drvMeta[name]?.drv || 1;
        if (drv > 0) drvSum += amount / drv;
    }

    const score = (drvSum / calories) * 1000;
    return {
        score: Math.round(score * 10) / 10,
        calories: Math.round(calories),
        drvPercent: Math.round(drvSum * 100),
        ingredientCount: ingredientList.filter(i => i.quantity).length
    };
}

export function densityLabel(score) {
    if (score >= 8) return 'ultra-dense';
    if (score >= 5) return 'dense';
    if (score >= 3) return 'good';
    return '';
}

export function parseMealMeta(content) {
    const match = content.match(/<!--\s*([\s\S]*?)\s*-->/);
    if (!match) return {};
    const meta = {};
    for (const part of match[1].split(/\s+/)) {
        const [k, v] = part.split(':');
        if (k && v) meta[k] = v;
    }
    return meta;
}

export async function computeMealStats(content, parseIngredients, foodapi) {
    await foodapi.ensureDataLoaded();

    const ingredients = [];
    for (const [quantity, name] of parseIngredients(content)) {
        if (quantity && name) ingredients.push({ foodName: name, quantity });
    }

    const meta = parseMealMeta(content);
    const stats = scoreIngredients(ingredients, foodapi.get_nutrients);
    return { ...stats, meta, ingredients };
}
