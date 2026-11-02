import { describe, expect, it } from "vitest";
import { computeRDA, UserProfile } from "@/data/foods";

const activityLevels: UserProfile["activityLevel"][] = [1.2, 1.375, 1.55, 1.725, 1.9];
const goals: UserProfile["goal"][] = ["maintain", "lose", "gain", "muscle_gain"];
const ageBands = [0.2, 0.75, 2, 3, 7, 10, 16, 30, 50, 51, 70, 71];

describe("profile nutrition estimates", () => {
  it("returns finite, non-negative targets across supported ages, sexes, activities, and goals", () => {
    for (const age of ageBands) {
      for (const gender of ["male", "female"] as const) {
        for (const activityLevel of activityLevels) {
          for (const goal of goals) {
            const targets = computeRDA({
              age,
              gender,
              weight: age < 3 ? 12 : age < 19 ? 45 : 70,
              height: age < 3 ? 85 : age < 19 ? 155 : 170,
              activityLevel,
              goal,
            });

            for (const [nutrient, value] of Object.entries(targets)) {
              expect(Number.isFinite(value), `${nutrient} for ${JSON.stringify({ age, gender, activityLevel, goal })}`).toBe(true);
              expect(value, `${nutrient} for ${JSON.stringify({ age, gender, activityLevel, goal })}`).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    }
  });

  it.each([
    ["male", 1.2, 2726],
    ["male", 1.375, 2726],
    ["male", 1.55, 2946],
    ["male", 1.725, 3126],
    ["male", 1.9, 3496],
    ["female", 1.2, 2341],
    ["female", 1.375, 2341],
    ["female", 1.55, 2525],
    ["female", 1.725, 2664],
    ["female", 1.9, 2939],
  ] as const)("uses the expected adult energy estimate for %s at activity %s", (gender, activityLevel, calories) => {
    const profile = {
      age: 30,
      gender,
      weight: 80,
      height: 180,
      activityLevel,
    } as const;
    const expectedByGoal = {
      maintain: calories,
      lose: calories - 500,
      gain: calories + 500,
      muscle_gain: calories + 200,
    } as const;

    for (const goal of goals) {
      expect(computeRDA({ ...profile, goal }).calories).toBe(expectedByGoal[goal]);
    }
  });

  it("does not apply adult goal adjustments to anyone under 19", () => {
    for (const age of ageBands.filter((value) => value < 19)) {
      for (const gender of ["male", "female"] as const) {
        for (const activityLevel of activityLevels) {
          const base = computeRDA({ age, gender, weight: 45, height: 155, activityLevel, goal: "maintain" });
          for (const goal of goals) {
            expect(computeRDA({ age, gender, weight: 45, height: 155, activityLevel, goal }).calories)
              .toBe(base.calories);
          }
        }
      }
    }
  });

  it("keeps pregnancy and lactation estimates independent of adult weight goals", () => {
    for (const activityLevel of activityLevels) {
      const lifeStageProfiles: UserProfile[] = [
        {
          age: 30,
          gender: "female",
          weight: 65,
          height: 165,
          activityLevel,
          goal: "maintain",
          isPregnant: true,
          gestationalWeeks: 24,
          prepregnancyWeight: 60,
        },
        {
          age: 30,
          gender: "female",
          weight: 60,
          height: 165,
          activityLevel,
          goal: "maintain",
          isLactating: true,
          lactationStage: "firstSixMonths",
        },
        {
          age: 30,
          gender: "female",
          weight: 60,
          height: 165,
          activityLevel,
          goal: "maintain",
          isLactating: true,
          lactationStage: "sevenToTwelveMonths",
        },
      ];

      for (const profile of lifeStageProfiles) {
        const estimated = computeRDA(profile);
        for (const goal of goals) {
          expect(computeRDA({ ...profile, goal }).calories).toBe(estimated.calories);
        }
      }
    }
  });
});
