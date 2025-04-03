function startLongPress(event) {
    const mealDiv = event.currentTarget;
    // Only call preventDefault for touch events, and we'll handle taps manually
    if (event.type === 'touchstart') {
        mealDiv._isTouching = true; // Flag to track touch in progress
    } else {
        event.preventDefault(); // Keep preventDefault for mouse events if needed
    }
    mealDiv._longPressTriggered = false;
    mealDiv._longPressTimeout = setTimeout(() => {
        mealDiv.classList.toggle('selected');
        const day = mealDiv.dataset.day;
        const meal = mealDiv.dataset.meal;
        const version = mealDiv.dataset.version;
        const mealKey = `${day}-${meal}-${version}`;

        if (mealDiv.classList.contains('selected')) {
            api.selected_meals.add(mealKey);
        } else {
            api.selected_meals.delete(mealKey);
        }

        window.calculateAggregations();
        mealDiv._longPressTriggered = true;
        mealDiv._isTouching = false; // Reset touch flag
    }, 500);
}

function endPress(event) {
    const mealDiv = event.currentTarget;
    clearTimeout(mealDiv._longPressTimeout);
    // Handle short tap on touch devices
    if (event.type === 'touchend' && mealDiv._isTouching && !mealDiv._longPressTriggered) {
        // Simulate the click event for a short tap
        mealDiv.click();
    }
    mealDiv._isTouching = false;
}

function cancelLongPress(event) {
    const mealDiv = event.currentTarget;
    clearTimeout(mealDiv._longPressTimeout);
    mealDiv._isTouching = false;
}

export function addLongPressListeners(versionDiv) {
    versionDiv.addEventListener('mousedown', startLongPress);
    versionDiv.addEventListener('touchstart', startLongPress);
    versionDiv.addEventListener('mouseup', endPress);
    versionDiv.addEventListener('touchend', endPress);
    versionDiv.addEventListener('mouseleave', cancelLongPress);
    versionDiv.addEventListener('touchcancel', cancelLongPress);
}