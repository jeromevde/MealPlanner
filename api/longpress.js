function startLongPress(event) {
    const mealDiv = event.currentTarget;
    if (event.type === 'touchstart') {
        mealDiv._isTouching = true;
    } else {
        event.preventDefault();
    }
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
        setTimeout(() => {
            mealDiv._longPressTriggered = false;
        }, 100); // Reset flag after 100ms
    }, 500);
}

function endPress(event) {
    const mealDiv = event.currentTarget;
    clearTimeout(mealDiv._longPressTimeout);
    if (event.type === 'touchend' && mealDiv._isTouching && !mealDiv._longPressTriggered) {
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