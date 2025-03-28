// Variables to store the JSON data and loading promise
export let foodData = null;
export let loadingDataPromise = null;

// Load the preprocessed JSON data
export async function loadData() {
    if (foodData === null) {
        if (!loadingDataPromise) {
            loadingDataPromise = (async () => {
                try {
                    const response = await fetch('../fooddata/fooddata.json');
                    if (!response.ok) {
                        throw new Error(`Could not fetch fooddata.json, received ${response.status}`);
                    }
                    foodData = await response.json();
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

// Find up to 10 food descriptions matching the partial name
export async function findClosestMatches(partialName) {
    await ensureDataLoaded();
    const normalizedPartialName = partialName.toLowerCase();
    return Object.keys(foodData)
        .filter(description => description.toLowerCase().includes(normalizedPartialName))
        .slice(0, 10);
}