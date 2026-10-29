import { describe, expect, it } from "vitest";
import { applyCoreTargetOverrides, computeRDA, Food } from "@/data/foods";
import { calcNutrition } from "@/lib/nutrition";

describe("fat profile and AI targets", () => {
  it("scales fatty acids and informational cholesterol with portion size", () => {
    const food: Food = {
      id: "test-food",
      name: "Test food",
      category: "Test",
      emoji: "🥣",
      baseQuantity: 100,
      baseUnit: "g",
      servingSize: "100 g",
      nutrition: {
        calories: 100,
        cholesterol: 20,
        macros: {
          protein: 4,
          carbohydrates: 10,
          fat: 5,
          fiber: 1,
          sugar: 2,
          saturatedFat: 1,
          monounsaturatedFat: 2,
          polyunsaturatedFat: 1.5,
          omega3Ala: 0.2,
        },
        micros: { choline: 15 },
      },
    };

    expect(calcNutrition(food, 200, "g")).toMatchObject({
      saturatedFat: 2,
      monounsaturatedFat: 4,
      polyunsaturatedFat: 3,
      omega3Ala: 0.4,
      cholesterol: 40,
      choline: 30,
    });
  });

  it("uses age, sex, and life stage for ALA and choline AIs", () => {
    const adultFemale = computeRDA({
      age: 30,
      gender: "female",
      weight: 60,
      height: 165,
      activityLevel: 1.55,
      goal: "maintain",
    });
    const pregnantFemale = computeRDA({
      age: 30,
      gender: "female",
      weight: 60,
      height: 165,
      activityLevel: 1.55,
      goal: "maintain",
      isPregnant: true,
    });

    expect(adultFemale.choline).toBe(425);
    expect(adultFemale.omega3Ala).toBe(1.1);
    expect(pregnantFemale.choline).toBe(450);
    expect(pregnantFemale.omega3Ala).toBe(1.4);
    expect(pregnantFemale.saturatedFat).toBeGreaterThan(0);
    expect(pregnantFemale.monounsaturatedFat).toBe(0);
    expect(pregnantFemale.polyunsaturatedFat).toBe(0);
  });

  it("uses the 2023 adult EER equation for the selected activity band", () => {
    const target = computeRDA({
      age: 30,
      gender: "male",
      weight: 80,
      height: 180,
      activityLevel: 1.55,
      goal: "maintain",
    });

    expect(target.calories).toBe(2946);
  });

  it("does not apply adult weight-loss offsets to children", () => {
    const child = {
      age: 10,
      gender: "male" as const,
      weight: 40,
      height: 140,
      activityLevel: 1.55 as const,
    };
    const maintain = computeRDA({ ...child, goal: "maintain" });
    const lose = computeRDA({ ...child, goal: "lose" });

    expect(maintain.calories).toBe(lose.calories);
    expect(maintain.calories).toBe(2099);
  });

  it("uses child DRI values and omits the under-two saturated-fat limit", () => {
    const child = computeRDA({
      age: 10,
      gender: "male",
      weight: 40,
      height: 140,
      activityLevel: 1.55,
      goal: "maintain",
    });
    const toddler = computeRDA({
      age: 1.5,
      gender: "female",
      weight: 11,
      height: 82,
      activityLevel: 1.2,
      goal: "maintain",
    });

    expect(child.vitaminA).toBe(600);
    expect(child.calcium).toBe(1300);
    expect(child.choline).toBe(375);
    expect(child.saturatedFat).toBeGreaterThan(0);
    expect(toddler.saturatedFat).toBe(0);
  });

  it("uses gestational week and pre-pregnancy BMI for second-trimester EER", () => {
    const target = computeRDA({
      age: 30,
      gender: "female",
      weight: 65,
      height: 165,
      activityLevel: 1.55,
      goal: "maintain",
      isPregnant: true,
      gestationalWeeks: 24,
      prepregnancyWeight: 60,
    });

    expect(target.calories).toBe(2660);
  });

  it("adds a stage-specific lactation energy allowance", () => {
    const baseProfile = {
      age: 30,
      gender: "female" as const,
      weight: 60,
      height: 165,
      activityLevel: 1.55 as const,
      goal: "maintain" as const,
    };
    const base = computeRDA(baseProfile).calories;
    const early = computeRDA({ ...baseProfile, isLactating: true, lactationStage: "firstSixMonths" });
    const later = computeRDA({ ...baseProfile, isLactating: true, lactationStage: "sevenToTwelveMonths" });

    expect(early.calories - base).toBe(404);
    expect(later.calories - base).toBe(380);
  });

  it("overrides only provided core targets", () => {
    const estimated = computeRDA({
      age: 30,
      gender: "female",
      weight: 60,
      height: 165,
      activityLevel: 1.55,
      goal: "maintain",
    });
    const custom = applyCoreTargetOverrides(estimated, { calories: 1900, protein: 110 });

    expect(custom.calories).toBe(1900);
    expect(custom.protein).toBe(110);
    expect(custom.choline).toBe(estimated.choline);
    expect(custom.saturatedFat).toBe(estimated.saturatedFat);
  });
});