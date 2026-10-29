import { describe, expect, it } from "vitest";
import { normalizeFdcFood } from "@/lib/foodDataCentral";
import { calcNutrition } from "@/lib/nutrition";

describe("normalizeFdcFood", () => {
  it("maps USDA nutrient numbers to the app food model", () => {
    const food = normalizeFdcFood({
      fdcId: 123,
      description: "Test food",
      dataType: "Foundation",
      foodCategory: "Vegetables",
      foodNutrients: [
        { nutrientNumber: "208", value: 42 },
        { nutrientNumber: "203", value: 3 },
        { nutrientNumber: "205", value: 8 },
        { nutrientNumber: "204", value: 1 },
        { nutrientNumber: "291", value: 2 },
        { nutrientNumber: "269", value: 4 },
        { nutrientNumber: "601", value: 15 },
        { nutrientNumber: "606", value: 0.3 },
        { nutrientNumber: "645", value: 0.2 },
        { nutrientNumber: "646", value: 0.1 },
        { nutrientNumber: "851", value: 0.05 },
        { nutrientNumber: "421", value: 12 },
        { nutrientNumber: "301", value: 15 },
      ],
    });

    expect(food.id).toBe("fdc-123");
    expect(food.baseQuantity).toBe(100);
    expect("portions" in food).toBe(false);
    expect(food.nutrition).toMatchObject({
      calories: 42,
      cholesterol: 15,
      macros: {
        protein: 3,
        carbohydrates: 8,
        fat: 1,
        fiber: 2,
        sugar: 4,
        saturatedFat: 0.3,
        monounsaturatedFat: 0.2,
        polyunsaturatedFat: 0.1,
        omega3Ala: 0.05,
      },
      micros: { calcium: 15, choline: 12 },
    });
  });

  it("uses a branded serving as the nutrition base quantity", () => {
    const food = normalizeFdcFood({
      fdcId: 456,
      description: "Test snack",
      dataType: "Branded",
      servingSize: 55,
      servingSizeUnit: "g",
      householdServingFullText: "1 bar",
      foodNutrients: [{ nutrientNumber: "208", value: 210 }],
    });

    expect(food.baseQuantity).toBe(55);
    expect(food.servingSize).toBe("1 bar (55 g)");
    expect(food.nutrition.calories).toBe(210);
  });

  it("calculates USDA portion nutrition from its gram weight", () => {
    const food = normalizeFdcFood({
      fdcId: 789,
      description: "Test grain",
      dataType: "SR Legacy",
      foodNutrients: [
        { nutrientNumber: "208", value: 250 },
        { nutrientNumber: "203", value: 8 },
      ],
    });
    const portion = { id: "portion-1", label: "1 cup", gramWeight: 160 };

    expect(calcNutrition(food, 1, "portion", portion)).toMatchObject({
      calories: 400,
      protein: 12.8,
    });
  });

  it("keeps USDA portion labels and gram weights on the normalized food", () => {
    const food = normalizeFdcFood({
      fdcId: 790,
      description: "Test fruit",
      dataType: "SR Legacy",
      portions: [{ id: "5", label: "1 cup, sliced", gramWeight: 166 }],
    });

    expect(food.portions).toEqual([{ id: "5", label: "1 cup, sliced", gramWeight: 166 }]);
  });
});