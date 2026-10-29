import { Food, FoodPortion, Unit } from "@/data/foods";

export interface SelectedFood {
  uid: string;
  food: Food;
  quantity: number;
  unit: SelectedUnit;
  portion?: FoodPortion;
}

export type SelectedUnit = Unit | "portion";

// Convert a quantity in the user-selected unit to the food's base unit equivalent
// Returns the multiplier to apply to base nutrition values.
export function quantityFactor(food: Food, quantity: number, unit: SelectedUnit, portion?: FoodPortion): number {
  // Normalize to grams or ml or pieces depending on baseUnit
  let normalized = quantity;
  if (unit === "portion") return (quantity * (portion?.gramWeight ?? food.baseQuantity)) / food.baseQuantity;
  // Unit conversions
  if (unit === "kg") normalized = quantity * 1000; // -> g
  if (unit === "bowl") normalized = quantity * 180; // approx 180g per bowl
  if (unit === "serving") {
    // serving size based on baseQuantity
    return quantity * 1; // 1 serving = 1 baseQuantity
  }
  // pieces: only valid if baseUnit is pieces — treat 1 piece as baseQuantity
  if (unit === "pieces" && food.baseUnit !== "pieces") {
    // assume 1 piece ~ baseQuantity grams
    return quantity * 1;
  }
  if (food.baseUnit === "pieces") {
    if (unit === "pieces") return quantity / food.baseQuantity;
    // fall back: treat as serving
    return quantity * 1;
  }
  // base unit is g or ml
  return normalized / food.baseQuantity;
}

export const MICRO_KEYS = [
  "vitaminA","vitaminD","vitaminE","vitaminK","vitaminC",
  "vitaminB1","vitaminB2","vitaminB3","vitaminB5","vitaminB6","vitaminB7","vitaminB9","vitaminB12",
  "choline",
  "calcium","phosphorus","magnesium","sodium","potassium","chloride",
  "iron","zinc","iodine","selenium","copper","manganese","molybdenum",
] as const;
export type MicroKey = typeof MICRO_KEYS[number];

export const FAT_PROFILE_KEYS = [
  "saturatedFat", "monounsaturatedFat", "polyunsaturatedFat", "omega3Ala",
] as const;
export type FatProfileKey = typeof FAT_PROFILE_KEYS[number];
export type DetailNutrientKey = MicroKey | FatProfileKey | "cholesterol";

export type NutritionTotals = {
  calories: number;
  cholesterol: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
} & Record<MicroKey, number> & Record<FatProfileKey, number>;

export function calcNutrition(food: Food, quantity: number, unit: SelectedUnit, portion?: FoodPortion): NutritionTotals {
  const k = quantityFactor(food, quantity, unit, portion);
  const m = food.nutrition.macros;
  const mi = food.nutrition.micros as Record<string, number | undefined>;
  const out: Record<string, number> = {
    calories: food.nutrition.calories * k,
    cholesterol: (food.nutrition.cholesterol ?? 0) * k,
    protein: m.protein * k,
    carbohydrates: m.carbohydrates * k,
    fat: m.fat * k,
    fiber: m.fiber * k,
    sugar: m.sugar * k,
    saturatedFat: (m.saturatedFat ?? 0) * k,
    monounsaturatedFat: (m.monounsaturatedFat ?? 0) * k,
    polyunsaturatedFat: (m.polyunsaturatedFat ?? 0) * k,
    omega3Ala: (m.omega3Ala ?? 0) * k,
  };
  for (const key of MICRO_KEYS) {
    out[key] = (mi[key] ?? 0) * k;
  }
  return out as NutritionTotals;
}

export function emptyTotals(): NutritionTotals {
  const out: Record<string, number> = {
    calories: 0, cholesterol: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0,
    saturatedFat: 0, monounsaturatedFat: 0, polyunsaturatedFat: 0, omega3Ala: 0,
  };
  for (const key of MICRO_KEYS) out[key] = 0;
  return out as NutritionTotals;
}

export function sumNutrition(items: SelectedFood[]): NutritionTotals {
  const t = emptyTotals();
  for (const it of items) {
    const n = calcNutrition(it.food, it.quantity, it.unit, it.portion);
    (Object.keys(t) as (keyof NutritionTotals)[]).forEach((k) => { (t as Record<string, number>)[k] += (n as Record<string, number>)[k]; });
  }
  return t;
}

export const formatNum = (n: number, digits = 1) =>
  n >= 100 ? Math.round(n).toString() : n.toFixed(digits);
