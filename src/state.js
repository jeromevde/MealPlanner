// STATE
export const mealQuantities = new Map();


export function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

export function getUrlFragment() {
    return location.hash.slice(1);
}

// Moved and modified encoding function
export function encodeSelections(mealQuantities, days, meals) {
    const selections = [];
    for (const [mealKey, quantity] of mealQuantities) {
        if (quantity > 0) {
            const [day, meal, version] = mealKey.split('-');
            const dayIndex = days.indexOf(day);
            const mealIndex = meals.indexOf(meal);
            const versionIndex = parseInt(version, 10);
            selections.push(`${dayIndex}-${mealIndex}-${versionIndex}-${quantity}`);
        }
    }
    return selections.join('|');
}

// Moved and modified decoding function
export function decodeSelections(encoded, days, meals) {
    if (!encoded) return new Map();
    const parts = encoded.split('|');
    const mealQuantities = new Map();
    for (const part of parts) {
        if (part) {
            const [dayIndex, mealIndex, versionIndex, quantity] = part.split('-').map(Number);
            const day = days[dayIndex];
            const meal = meals[mealIndex];
            const version = versionIndex.toString();
            const mealKey = `${day}-${meal}-${version}`;
            mealQuantities.set(mealKey, quantity);
        }
    }
    return mealQuantities;
}

// Updated loadState to decode state
export function loadState(days, meals) {
    const fragment = getUrlFragment();
    let encoded;
    if (fragment) {
        encoded = fragment;
    } else {
        encoded = getCookie('mealSelections');
    }
    return decodeSelections(encoded, days, meals);
}

// Updated saveState to encode state
export function saveState(mealQuantities, days, meals) {
    const encoded = encodeSelections(mealQuantities, days, meals);
    setCookie('mealSelections', encoded, 7);
}