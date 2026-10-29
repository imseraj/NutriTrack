import { Food, FoodPortion, Unit } from "@/data/foods";
import { auth } from "@/lib/firebase";

interface FdcNutrient {
  id?: number;
  nutrientNumber?: string | number;
  nutrientName?: string;
  unitName?: string;
  value?: number;
  derivation?: string;
}

export interface FdcFoodAttribute {
  name: string;
  value?: string;
  description?: string;
}

export interface FdcFoodComponent {
  name?: string;
  gramWeight?: number;
  percentWeight?: number;
  dataPoints?: number;
  isRefuse?: boolean;
}

export interface FdcFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FdcNutrient[];
  portions?: FoodPortion[];
  foodClass?: string;
  brandOwner?: string;
  gtinUpc?: string;
  ingredients?: string;
  publicationDate?: string;
  modifiedDate?: string;
  wweiaFoodCategory?: string;
  foodAttributes?: FdcFoodAttribute[];
  foodComponents?: FdcFoodComponent[];
}

export interface FdcFoodDetails {
  food: Food;
  portions: FoodPortion[];
  fdcId: number;
  dataType: string;
  foodClass?: string;
  foodCategory?: string;
  brandOwner?: string;
  gtinUpc?: string;
  ingredients?: string;
  publicationDate?: string;
  modifiedDate?: string;
  wweiaFoodCategory?: string;
  nutrients: FdcNutrient[];
  attributes: FdcFoodAttribute[];
  components: FdcFoodComponent[];
}

export const FDC_DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"] as const;
export type FdcDataType = typeof FDC_DATA_TYPES[number];

export interface FdcCategoryResults {
  dataType: FdcDataType;
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: Food[];
}

interface FdcSearchResponse {
  categories: Array<{
    dataType: FdcDataType;
    totalHits: number;
    currentPage: number;
    totalPages: number;
    foods: FdcFood[];
  }>;
}

interface FdcSearchError {
  error?: string;
}

interface FdcFoodDetailsResponse {
  food: FdcFood;
}

const nutrientNumbers = {
  calories: ["208", "1008", "2047"],
  cholesterol: ["601"],
  protein: ["203"],
  fat: ["204"],
  saturatedFat: ["606"],
  monounsaturatedFat: ["645"],
  polyunsaturatedFat: ["646"],
  omega3Ala: ["851"],
  carbohydrates: ["205"],
  fiber: ["291"],
  sugar: ["269"],
  vitaminA: ["320"],
  vitaminD: ["328"],
  vitaminE: ["323"],
  vitaminK: ["430"],
  vitaminC: ["401"],
  vitaminB1: ["404"],
  vitaminB2: ["405"],
  vitaminB3: ["406"],
  vitaminB5: ["410"],
  vitaminB6: ["415"],
  vitaminB7: ["416"],
  vitaminB9: ["417"],
  vitaminB12: ["418"],
  choline: ["421"],
  calcium: ["301"],
  phosphorus: ["305"],
  magnesium: ["304"],
  sodium: ["307"],
  potassium: ["306"],
  iron: ["303"],
  zinc: ["309"],
  selenium: ["317"],
  copper: ["312"],
  manganese: ["315"],
} as const;

function valueFor(food: FdcFood, numbers: readonly string[]): number {
  const nutrient = food.foodNutrients?.find((item) =>
    numbers.includes(String(item.nutrientNumber)) && Number.isFinite(item.value),
  );
  return nutrient?.value ?? 0;
}

export function normalizeFdcFood(food: FdcFood): Food {
  const branded = food.dataType === "Branded";
  const servingSize = Number(food.servingSize);
  const unit: Unit = food.servingSizeUnit?.toLowerCase() === "ml" ? "ml" : "g";
  const baseQuantity = branded && Number.isFinite(servingSize) && servingSize > 0 ? servingSize : 100;
  const servingDescription = food.householdServingFullText?.trim();
  const servingSizeLabel = branded && servingDescription
    ? `${servingDescription} (${baseQuantity} ${unit})`
    : `${baseQuantity} ${unit}`;
  const portions = (unit === "g" ? food.portions : undefined)?.filter((portion) =>
    Number.isFinite(portion.gramWeight) && portion.gramWeight > 0 && portion.label.trim().length > 0,
  ) ?? [];
  if (branded && unit === "g" && portions.length === 0 && baseQuantity > 0) {
    portions.push({
      id: `fdc-${food.fdcId}-serving`,
      label: servingDescription || `${baseQuantity} ${unit}`,
      gramWeight: baseQuantity,
    });
  }

  return {
    id: `fdc-${food.fdcId}`,
    name: food.description,
    category: food.foodCategory || food.dataType || "USDA FoodData Central",
    emoji: "🥗",
    baseQuantity,
    baseUnit: unit,
    servingSize: servingSizeLabel,
    ...(portions.length > 0 ? { portions } : {}),
    nutrition: {
      calories: valueFor(food, nutrientNumbers.calories),
      cholesterol: valueFor(food, nutrientNumbers.cholesterol),
      macros: {
        protein: valueFor(food, nutrientNumbers.protein),
        carbohydrates: valueFor(food, nutrientNumbers.carbohydrates),
        fat: valueFor(food, nutrientNumbers.fat),
        fiber: valueFor(food, nutrientNumbers.fiber),
        sugar: valueFor(food, nutrientNumbers.sugar),
        saturatedFat: valueFor(food, nutrientNumbers.saturatedFat),
        monounsaturatedFat: valueFor(food, nutrientNumbers.monounsaturatedFat),
        polyunsaturatedFat: valueFor(food, nutrientNumbers.polyunsaturatedFat),
        omega3Ala: valueFor(food, nutrientNumbers.omega3Ala),
      },
      micros: {
        vitaminA: valueFor(food, nutrientNumbers.vitaminA),
        vitaminD: valueFor(food, nutrientNumbers.vitaminD),
        vitaminE: valueFor(food, nutrientNumbers.vitaminE),
        vitaminK: valueFor(food, nutrientNumbers.vitaminK),
        vitaminC: valueFor(food, nutrientNumbers.vitaminC),
        vitaminB1: valueFor(food, nutrientNumbers.vitaminB1),
        vitaminB2: valueFor(food, nutrientNumbers.vitaminB2),
        vitaminB3: valueFor(food, nutrientNumbers.vitaminB3),
        vitaminB5: valueFor(food, nutrientNumbers.vitaminB5),
        vitaminB6: valueFor(food, nutrientNumbers.vitaminB6),
        vitaminB7: valueFor(food, nutrientNumbers.vitaminB7),
        vitaminB9: valueFor(food, nutrientNumbers.vitaminB9),
        vitaminB12: valueFor(food, nutrientNumbers.vitaminB12),
        choline: valueFor(food, nutrientNumbers.choline),
        calcium: valueFor(food, nutrientNumbers.calcium),
        phosphorus: valueFor(food, nutrientNumbers.phosphorus),
        magnesium: valueFor(food, nutrientNumbers.magnesium),
        sodium: valueFor(food, nutrientNumbers.sodium),
        potassium: valueFor(food, nutrientNumbers.potassium),
        iron: valueFor(food, nutrientNumbers.iron),
        zinc: valueFor(food, nutrientNumbers.zinc),
        selenium: valueFor(food, nutrientNumbers.selenium),
        copper: valueFor(food, nutrientNumbers.copper),
        manganese: valueFor(food, nutrientNumbers.manganese),
      },
    },
  };
}

export async function searchFoodDataCentral(
  query: string,
  dataType?: FdcDataType,
  pageNumber = 1,
): Promise<FdcCategoryResults[]> {
  const endpoint = import.meta.env.VITE_FDC_API_URL;
  const user = auth?.currentUser;
  if (!endpoint) throw new Error("USDA search is not configured. Set VITE_FDC_API_URL.");
  if (!user) throw new Error("Sign in to search USDA foods.");

  const token = await user.getIdToken();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, dataType, pageNumber }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as FdcSearchError;
    throw new Error(error.error || `USDA food search failed (${response.status}).`);
  }

  const result = await response.json() as FdcSearchResponse;
  return result.categories.map((category) => ({
    ...category,
    foods: category.foods.map(normalizeFdcFood),
  }));
}

export async function getFoodDataCentralFullDetails(fdcId: number): Promise<FdcFoodDetails> {
  const endpoint = import.meta.env.VITE_FDC_API_URL;
  const user = auth?.currentUser;
  if (!endpoint) throw new Error("USDA search is not configured. Set VITE_FDC_API_URL.");
  if (!user) throw new Error("Sign in to load USDA portion sizes.");

  const token = await user.getIdToken();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: "details", fdcId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as FdcSearchError;
    throw new Error(error.error || `USDA food details failed (${response.status}).`);
  }

  const result = await response.json() as FdcFoodDetailsResponse;
  const sourceFood = result.food;
  return {
    food: normalizeFdcFood(sourceFood),
    portions: sourceFood.portions ?? [],
    fdcId: sourceFood.fdcId,
    dataType: sourceFood.dataType,
    foodClass: sourceFood.foodClass,
    foodCategory: sourceFood.foodCategory,
    brandOwner: sourceFood.brandOwner,
    gtinUpc: sourceFood.gtinUpc,
    ingredients: sourceFood.ingredients,
    publicationDate: sourceFood.publicationDate,
    modifiedDate: sourceFood.modifiedDate,
    wweiaFoodCategory: sourceFood.wweiaFoodCategory,
    nutrients: sourceFood.foodNutrients ?? [],
    attributes: sourceFood.foodAttributes ?? [],
    components: sourceFood.foodComponents ?? [],
  };
}

export async function getFoodDataCentralDetails(fdcId: number): Promise<Food> {
  const details = await getFoodDataCentralFullDetails(fdcId);
  return details.food;
}