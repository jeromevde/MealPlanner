// DATA
export let foodData = null;

let loadingDataPromise = null;
// Load the preprocessed JSON data
export async function loadData() {
    if (foodData === null) {
        if (!loadingDataPromise) {
            loadingDataPromise = (async () => {
                try {
                    const response = await fetch('./data/fooddata.json');
                    if (!response.ok) {
                        throw new Error(`Could not fetch fooddata.json, received ${response.status}`);
                    }
                    const data = await response.json();
                    foodData = Object.fromEntries(
                        Object.entries(data).map(([key, value]) => [key.toLowerCase(), value])
                    );
                } catch (error) {
                    console.error("Error loading data:", error);
                    throw error; // Re-throw to allow caller handling
                } finally {
                    loadingDataPromise = null; // Reset promise for potential reloads
                }
            })();
        }
        return loadingDataPromise;
    }
}

// Ensure data is loaded before proceeding
export async function ensureDataLoaded() {
    if (foodData === null) {
        await loadData();
    }
}

// GETTERS

export function get_category(foodName){
    return foodData[foodName.toLowerCase()]?.category || 'Other';
};

export function get_nutrients(foodName){
    return  foodData[foodName.toLowerCase()]?.nutrients;
};

export function get_portion_gram_weight(foodName){
    return parseFloat(api.foodData[foodName.toLowerCase()]?.portion_gram_weight);

};

export function get_portion_unit_name(foodName){
    return api.foodData[foodName.toLowerCase()]?.portion_unit_name;
};


export function find_closest_matches(partialName) {
    return Object.keys(foodData)
        .filter(description => description.includes(partialName.toLowerCase()))
        .slice(0, 10);
} // sorted by relevant category and # nutrients with max search count



