import { Food, Unit } from "@/data/foods";

export interface SelectedFood {
  uid: string;
  food: Food;
  quantity: number;
  unit: Unit;
}

// Convert a quantity in the user-selected unit to the food's base unit equivalent
// Returns the multiplier to apply to base nutrition values.
export function quantityFactor(food: Food, quantity: number, unit: Unit): number {
  // Normalize to grams or ml or pieces depending on baseUnit
  let normalized = quantity;
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
  "calcium","phosphorus","magnesium","sodium","potassium","chloride","sulfur",
  "iron","zinc","iodine","selenium","copper","manganese","fluoride","chromium","molybdenum","cobalt",
] as const;
export type MicroKey = typeof MICRO_KEYS[number];

export function calcNutrition(food: Food, quantity: number, unit: Unit) {
  const k = quantityFactor(food, quantity, unit);
  const m = food.nutrition.macros;
  const mi = food.nutrition.micros as Record<string, number | undefined>;
  const out: Record<string, number> = {
    calories: food.nutrition.calories * k,
    protein: m.protein * k,
    carbohydrates: m.carbohydrates * k,
    fat: m.fat * k,
    fiber: m.fiber * k,
    sugar: m.sugar * k,
  };
  for (const key of MICRO_KEYS) {
    out[key] = (mi[key] ?? 0) * k;
  }
  return out as { calories: number; protein: number; carbohydrates: number; fat: number; fiber: number; sugar: number; } & Record<MicroKey, number>;
}

export type NutritionTotals = ReturnType<typeof calcNutrition>;

export function emptyTotals(): NutritionTotals {
  const out: Record<string, number> = {
    calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0,
  };
  for (const key of MICRO_KEYS) out[key] = 0;
  return out as NutritionTotals;
}

export function sumNutrition(items: SelectedFood[]): NutritionTotals {
  const t = emptyTotals();
  for (const it of items) {
    const n = calcNutrition(it.food, it.quantity, it.unit);
    (Object.keys(t) as (keyof NutritionTotals)[]).forEach((k) => { (t as Record<string, number>)[k] += (n as Record<string, number>)[k]; });
  }
  return t;
}

export const formatNum = (n: number, digits = 1) =>
  n >= 100 ? Math.round(n).toString() : n.toFixed(digits);
