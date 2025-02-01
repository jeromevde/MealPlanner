const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const meals = ["morning", "midday", "evening"];
const versions = ["1", "2", "3"];
const data = {};

window.fetchData = async function() {
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

window.renderMealPlan = async function() {
    const mealPlanContainer = document.getElementById('meal-plan');
    const popup = document.getElementById('popup');
    const popupContent = document.getElementById('popup-content');
    const popupClose = document.getElementById('popup-close');
    const overlay = document.getElementById('overlay');
    const nutrientPopup = document.getElementById('nutrient-popup');
    const nutrientPopupClose = document.getElementById('nutrient-popup-close');

    const fragment = document.createDocumentFragment();

    for (const day of days) {
        if (data[day]) { 
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day');
            const dayTitle = document.createElement('h2');
            dayTitle.textContent = day.charAt(0).toUpperCase() + day.slice(1);
            dayDiv.appendChild(dayTitle);

            for (const meal of meals) { 
                if (data[day][meal]){
                    const mealDiv = document.createElement('div');
                    mealDiv.classList.add('schedule');
                    const mealTitle = document.createElement('h3');
                    mealTitle.textContent = meal.charAt(0).toUpperCase() + meal.slice(1);
                    mealDiv.appendChild(mealTitle);

                    const mealsDiv = document.createElement('div');
                    mealsDiv.classList.add('meals');

                    for (const version of Object.keys(data[day][meal])) {
                        const versionDiv = document.createElement('div');
                        versionDiv.classList.add('meal');

                        const mealData = data[day][meal][version];
                        versionDiv.textContent = mealData.title;
                        versionDiv.addEventListener('click', async () => {
                            let parsedContent = await parseAndLinkMealContent(mealData.content);
                            popupContent.innerHTML = `<h2>${mealData.title}</h2><p>${parsedContent}</p>`;
                            popup.style.display = 'block';
                            overlay.style.display = 'block';
                        });
                        mealsDiv.appendChild(versionDiv);
                    }

                    mealDiv.appendChild(mealsDiv);
                    dayDiv.appendChild(mealDiv);
                }
            }
            fragment.appendChild(dayDiv);
        }
    }

    mealPlanContainer.appendChild(fragment);

    popupClose.addEventListener('click', () => {
        popup.style.display = 'none';
        overlay.style.display = 'none';
    });

    overlay.addEventListener('click', () => {
        popup.style.display = 'none';
        overlay.style.display = 'none';
        nutrientPopup.style.display = 'none';
    });

    nutrientPopupClose.addEventListener('click', () => {
        nutrientPopup.style.display = 'none';
        overlay.style.display = 'none';
    });
}

window.parseAndLinkMealContent = async function(content) {
    const regex = /\[([^;]+);\s*(\d+(?:\.\d+)?);\s*(\w+)\]/g;
    // match something like [Pears, raw, bartlett; 200; g]
    let match;
    let newContent = content;
    while ((match = regex.exec(content)) !== null) {
        console.log("eyy")
        console.log(match)
        const [, food, quantity, unit] = match;
        const originalText = match[0];
        const nutrientData = await getNutrientsForName(food);
        
        if (nutrientData) {
            const nutrientHTML = `<span class="nutrient-link" data-food="${food}">${originalText}</span>`;
            newContent = newContent.replace(originalText, nutrientHTML);
        }
    }

    return newContent;
}

document.addEventListener('click', async function(event) {
    if (event.target.classList.contains('nutrient-link')) {
        const food = event.target.getAttribute('data-food');
        const nutrientPopup = document.getElementById('nutrient-popup');
        const nutrientPopupContent = document.getElementById('nutrient-popup-content');
        
        const nutrientHtml = await getNutrientHtml(food);
        nutrientPopupContent.innerHTML = nutrientHtml;
        nutrientPopup.style.display = 'block';
        overlay.style.display = 'block';
    }
});