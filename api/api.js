export * from './fooddata.js';
export * from './markdown.js';
export * from './longpress.js';

export const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const meals = ["morning", "midday", "evening"];
export const versions = ["1", "2", "3"];
export const data = {};
export const food_csv = "./fooddata/food.csv";
export const nutrient_csv = "./fooddata/nutrient.csv";
export const food_nutrient_csv = "./fooddata/food_nutrient.csv";
export const food_category_csv = "./fooddata/food_category.csv";

export const selected_meals = new Set();
export const mealQuantities = new Map();


export const selected_foods = {}
export const selected_nutrients = {}

export const foodRegex = /\{(\d+(?:\.\d+)?)\s*[a-zA-Z]+\s*of\s*[^\{]*?\{([^}]+)\}\}/g;
