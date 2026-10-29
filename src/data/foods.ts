export type Unit = "g" | "kg" | "ml" | "pieces" | "bowl" | "serving";

export interface FoodPortion {
  id: string;
  label: string;
  gramWeight: number;
}

export interface FoodMicros {
  // Fat-soluble vitamins
  vitaminA?: number; vitaminD?: number; vitaminE?: number; vitaminK?: number;
  // Water-soluble vitamins
  vitaminC?: number;
  vitaminB1?: number; vitaminB2?: number; vitaminB3?: number; vitaminB5?: number;
  vitaminB6?: number; vitaminB7?: number; vitaminB9?: number; vitaminB12?: number;
  choline?: number;
  // Macrominerals
  calcium?: number; phosphorus?: number; magnesium?: number; sodium?: number;
  potassium?: number; chloride?: number; sulfur?: number;
  // Trace minerals
  iron?: number; zinc?: number; iodine?: number; selenium?: number;
  copper?: number; manganese?: number; fluoride?: number; chromium?: number;
  molybdenum?: number; cobalt?: number;
  // Legacy (kept for backward compatibility with existing seed data)
  vitaminB?: number;
}
export interface FoodMacros {
  protein: number; carbohydrates: number; fat: number; fiber: number; sugar: number;
  saturatedFat?: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;
  omega3Ala?: number;
}
export interface Food {
  id: string;
  name: string;
  category: string;
  emoji: string;
  baseQuantity: number;
  baseUnit: Unit;
  servingSize: string;
  portions?: FoodPortion[];
  nutrition: {
    calories: number;
    cholesterol?: number;
    macros: FoodMacros;
    micros: FoodMicros;
  };
}



// Recommended Daily Allowance — NIH DRI reference values (adult baseline, male).
// Dynamic adjustments applied in computeRDA() for age/gender/pregnancy/lactation.
export const RDA_DEFAULT = {
  // MACROS (Base values, overwritten by computeRDA)
  calories: 2000,
  protein: 50,
  carbohydrates: 275,
  fat: 78,
  fiber: 28,
  sugar: 50,
  saturatedFat: 0,
  monounsaturatedFat: 0,
  polyunsaturatedFat: 0,
  omega3Ala: 1.6, // g/day AI for adult men

  // FAT-SOLUBLE VITAMINS
  vitaminA: 900,   // μg RAE (700 for women)
  vitaminD: 15,    // μg (20 for elderly)
  vitaminE: 15,    // mg
  vitaminK: 120,   // μg (90 for women)

  // WATER-SOLUBLE VITAMINS
  vitaminC: 90,    // mg (75 for women)
  vitaminB1: 1.2,  // mg
  vitaminB2: 1.3,  // mg
  vitaminB3: 16,   // mg
  vitaminB5: 5,    // mg
  vitaminB6: 1.3,  // mg
  vitaminB7: 30,   // μg
  vitaminB9: 400,  // μg DFE (Folate)
  vitaminB12: 2.4, // μg

  // Other essential nutrients (Adequate Intake)
  choline: 550,   // mg (adult male AI)

  // MACROMINERALS
  calcium: 1000,   // mg
  phosphorus: 700, // mg
  magnesium: 400,  // mg (310-320 for women)
  sodium: 2300,    // mg (UL guideline)
  potassium: 3400, // mg (FDA updated from 3500)

  // TRACE MINERALS
  iron: 8,         // mg (18 for menstruating women, 27 pregnant)
  zinc: 11,        // mg (8 for women)
  iodine: 150,     // μg
  selenium: 55,    // μg
  copper: 0.9,     // mg
  manganese: 2.3,  // mg

  // ADEQUATE INTAKES (AI) / ESTIMATES — no official NIH RDA
  chloride: 2300,  // mg (AI)
  molybdenum: 45,  // μg

  // Legacy
  vitaminB: 2.4,
};

export type RDA = typeof RDA_DEFAULT;
export const CORE_TARGET_KEYS = ["calories", "protein", "carbohydrates", "fat", "fiber", "sugar"] as const;
export type CoreTargetKey = typeof CORE_TARGET_KEYS[number];
export type CoreTargetOverrides = Partial<Record<CoreTargetKey, number>>;

export function applyCoreTargetOverrides(estimated: RDA, overrides?: CoreTargetOverrides): RDA {
  if (!overrides) return estimated;
  const targets = { ...estimated };
  CORE_TARGET_KEYS.forEach((key) => {
    const value = overrides[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) targets[key] = value;
  });
  return targets;
}

export interface UserProfile {
  age: number;
  gender: "male" | "female";
  weight: number; // kg
  height: number; // cm
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  goal: "maintain" | "lose" | "gain" | "muscle_gain";
  isPregnant?: boolean;
  isLactating?: boolean;
  gestationalWeeks?: number;
  prepregnancyWeight?: number;
  lactationStage?: "firstSixMonths" | "sevenToTwelveMonths";
}

type ActivityBand = "inactive" | "lowActive" | "active" | "veryActive";

function activityBand(age: number, level: UserProfile["activityLevel"]): ActivityBand {
  const [inactiveLimit, lowActiveLimit, activeLimit] = age < 9
    ? [1.31, 1.44, 1.59]
    : age < 14
      ? [1.44, 1.59, 1.77]
      : age < 19
        ? [1.56, 1.73, 1.92]
        : [1.53, 1.68, 1.85];
  if (level < inactiveLimit) return "inactive";
  if (level < lowActiveLimit) return "lowActive";
  if (level < activeLimit) return "active";
  return "veryActive";
}

function baseEER(profile: UserProfile, band: ActivityBand = activityBand(profile.age, profile.activityLevel)): number {
  const { age, gender, weight, height } = profile;
  const male = gender === "male";

  if (age < 3) {
    const growth = male
      ? age < 0.25 ? 200 : age < 0.5 ? 50 : 20
      : age < 0.25 ? 180 : age < 0.5 ? 60 : age < 1 ? 20 : 15;
    return male
      ? -716.45 - age + 17.82 * height + 15.06 * weight + growth
      : -69.15 + 80 * age + 2.65 * height + 54.15 * weight + growth;
  }

  if (age < 19) {
    const growth = age < 4 ? (male ? 20 : 15)
      : age < 9 ? 15
      : age < 14 ? (male ? 25 : 30)
      : 20;
    if (male) {
      const equations = {
        inactive: -447.51 + 3.68 * age + 13.01 * height + 13.15 * weight,
        lowActive: 19.12 + 3.68 * age + 8.62 * height + 20.28 * weight,
        active: -388.19 + 3.68 * age + 12.66 * height + 20.46 * weight,
        veryActive: -671.75 + 3.68 * age + 15.38 * height + 23.25 * weight,
      };
      return equations[band] + growth;
    }
    const equations = {
      inactive: 55.59 - 22.25 * age + 8.43 * height + 17.07 * weight,
      lowActive: -297.54 - 22.25 * age + 12.77 * height + 14.73 * weight,
      active: -189.55 - 22.25 * age + 11.74 * height + 18.34 * weight,
      veryActive: -709.59 - 22.25 * age + 18.22 * height + 14.25 * weight,
    };
    return equations[band] + growth;
  }

  if (male) {
    const equations = {
      inactive: 753.07 - 10.83 * age + 6.50 * height + 14.10 * weight,
      lowActive: 581.47 - 10.83 * age + 8.30 * height + 14.94 * weight,
      active: 1004.82 - 10.83 * age + 6.52 * height + 15.91 * weight,
      veryActive: -517.88 - 10.83 * age + 15.61 * height + 19.11 * weight,
    };
    return equations[band];
  }
  const equations = {
    inactive: 584.90 - 7.01 * age + 5.72 * height + 11.71 * weight,
    lowActive: 575.77 - 7.01 * age + 6.60 * height + 12.14 * weight,
    active: 710.25 - 7.01 * age + 6.54 * height + 12.34 * weight,
    veryActive: 511.83 - 7.01 * age + 9.07 * height + 12.56 * weight,
  };
  return equations[band];
}

function pregnancyEER(profile: UserProfile): number {
  const age = profile.age;
  const height = profile.height;
  const weight = profile.weight;
  const gestation = profile.gestationalWeeks ?? 0;
  const equations = {
    inactive: 1131.20 - 2.04 * age + 0.34 * height + 12.15 * weight + 9.16 * gestation,
    lowActive: 693.35 - 2.04 * age + 5.73 * height + 10.20 * weight + 9.16 * gestation,
    active: -223.84 - 2.04 * age + 13.23 * height + 8.15 * weight + 9.16 * gestation,
    veryActive: -779.72 - 2.04 * age + 18.45 * height + 8.73 * weight + 9.16 * gestation,
  };
  const bmiBeforePregnancy = (profile.prepregnancyWeight ?? weight) / ((height / 100) ** 2);
  const energyDeposition = bmiBeforePregnancy < 18.5 ? 300
    : bmiBeforePregnancy < 25 ? 200
    : bmiBeforePregnancy < 30 ? 150
    : -50;
  return equations[activityBand(19, profile.activityLevel)] + energyDeposition;
}

function ageSpecificMicronutrientTargets(age: number, gender: UserProfile["gender"]): RDA {
  const male = gender === "male";
  const targets = { ...RDA_DEFAULT };

  if (age < 0.5) {
    Object.assign(targets, { vitaminA: 400, vitaminD: 10, vitaminE: 4, vitaminK: 2, vitaminC: 40, vitaminB1: 0.2, vitaminB2: 0.3, vitaminB3: 2, vitaminB5: 1.7, vitaminB6: 0.1, vitaminB7: 5, vitaminB9: 65, vitaminB12: 0.4, choline: 125, calcium: 200, phosphorus: 100, magnesium: 30, sodium: 120, potassium: 400, chloride: 180, iron: 0.27, zinc: 2, iodine: 110, selenium: 15, copper: 0.2, manganese: 0.003, molybdenum: 2 });
  } else if (age < 1) {
    Object.assign(targets, { vitaminA: 500, vitaminD: 10, vitaminE: 5, vitaminK: 2.5, vitaminC: 50, vitaminB1: 0.3, vitaminB2: 0.4, vitaminB3: 4, vitaminB5: 1.8, vitaminB6: 0.3, vitaminB7: 6, vitaminB9: 80, vitaminB12: 0.5, choline: 150, calcium: 260, phosphorus: 275, magnesium: 75, sodium: 370, potassium: 860, chloride: 570, iron: 11, zinc: 3, iodine: 130, selenium: 20, copper: 0.22, manganese: 0.6, molybdenum: 3 });
  } else if (age < 4) {
    Object.assign(targets, { vitaminA: 300, vitaminD: 15, vitaminE: 6, vitaminK: 30, vitaminC: 15, vitaminB1: 0.5, vitaminB2: 0.5, vitaminB3: 6, vitaminB5: 2, vitaminB6: 0.5, vitaminB7: 8, vitaminB9: 150, vitaminB12: 0.9, choline: 200, calcium: 700, phosphorus: 460, magnesium: 80, sodium: 800, potassium: 2000, chloride: 1500, iron: 7, zinc: 3, iodine: 90, selenium: 20, copper: 0.34, manganese: 1.2, molybdenum: 17 });
  } else if (age < 9) {
    Object.assign(targets, { vitaminA: 400, vitaminD: 15, vitaminE: 7, vitaminK: 55, vitaminC: 25, vitaminB1: 0.6, vitaminB2: 0.6, vitaminB3: 8, vitaminB5: 3, vitaminB6: 0.6, vitaminB7: 12, vitaminB9: 200, vitaminB12: 1.2, choline: 250, calcium: 1000, phosphorus: 500, magnesium: 130, sodium: 1000, potassium: 2300, chloride: 1900, iron: 10, zinc: 5, iodine: 90, selenium: 30, copper: 0.44, manganese: 1.5, molybdenum: 22 });
  } else if (age < 14) {
    Object.assign(targets, { vitaminA: 600, vitaminD: 15, vitaminE: 11, vitaminK: 60, vitaminC: 45, vitaminB1: 0.9, vitaminB2: 0.9, vitaminB3: 12, vitaminB5: 4, vitaminB6: 1.0, vitaminB7: 20, vitaminB9: 300, vitaminB12: 1.8, choline: 375, calcium: 1300, phosphorus: 1250, magnesium: 240, sodium: 1200, potassium: male ? 2500 : 2300, chloride: 2300, iron: 8, zinc: 8, iodine: 120, selenium: 40, copper: 0.7, manganese: male ? 1.9 : 1.6, molybdenum: 34 });
  } else if (age < 19) {
    Object.assign(targets, { vitaminA: male ? 900 : 700, vitaminD: 15, vitaminE: 15, vitaminK: 75, vitaminC: male ? 75 : 65, vitaminB1: male ? 1.2 : 1.0, vitaminB2: male ? 1.3 : 1.0, vitaminB3: male ? 16 : 14, vitaminB5: 5, vitaminB6: male ? 1.3 : 1.2, vitaminB7: 25, vitaminB9: 400, vitaminB12: 2.4, choline: male ? 550 : 400, calcium: 1300, phosphorus: 1250, magnesium: male ? 410 : 360, sodium: 1500, potassium: male ? 3000 : 2300, chloride: 2300, iron: male ? 11 : 15, zinc: male ? 11 : 9, iodine: 150, selenium: 55, copper: 0.89, manganese: male ? 2.2 : 1.6, molybdenum: 43 });
  } else {
    Object.assign(targets, {
      vitaminA: male ? 900 : 700,
      vitaminD: age > 70 ? 20 : 15,
      vitaminE: 15,
      vitaminK: male ? 120 : 90,
      vitaminC: male ? 90 : 75,
      vitaminB1: male ? 1.2 : 1.1,
      vitaminB2: male ? 1.3 : 1.1,
      vitaminB3: male ? 16 : 14,
      vitaminB5: 5,
      vitaminB6: age >= 51 ? male ? 1.7 : 1.5 : 1.3,
      vitaminB7: 30,
      vitaminB9: 400,
      vitaminB12: 2.4,
      choline: male ? 550 : 425,
      calcium: age > 70 || (!male && age > 50) ? 1200 : 1000,
      phosphorus: 700,
      magnesium: male ? age >= 31 ? 420 : 400 : age >= 31 ? 320 : 310,
      sodium: 2300,
      potassium: male ? 3400 : 2600,
      chloride: 2300,
      iron: !male && age <= 50 ? 18 : 8,
      zinc: male ? 11 : 8,
      iodine: 150,
      selenium: 55,
      copper: 0.9,
      manganese: male ? 2.3 : 1.8,
      molybdenum: 45,
    });
  }

  return targets;
}

export function computeRDA(profile: UserProfile): RDA {
  const { age, gender, weight, height, goal, isPregnant, isLactating } = profile;
  if (!Number.isFinite(age) || age < 0 || !weight || !height) return RDA_DEFAULT;

  const validPregnancyInputs = gender === "female" && isPregnant &&
    Number.isFinite(profile.gestationalWeeks) && (profile.gestationalWeeks ?? 0) >= 0 && (profile.gestationalWeeks ?? 0) <= 42 &&
    Number.isFinite(profile.prepregnancyWeight) && (profile.prepregnancyWeight ?? 0) > 0;
  let cal = baseEER(profile);
  if (validPregnancyInputs && (profile.gestationalWeeks ?? 0) >= 14) cal = pregnancyEER(profile);
  else if (gender === "female" && isLactating) cal += profile.lactationStage === "sevenToTwelveMonths" ? 380 : 404;

  if (age >= 19 && !isPregnant && !isLactating) {
    if (goal === "lose") cal -= 500;
    if (goal === "gain") cal += 500;
    if (goal === "muscle_gain") cal += 200;
  }
  cal = Math.max(0, Math.round(cal));

  let proteinPerKg = age < 0.5 ? 1.52
    : age < 1 ? 1.2
    : age < 4 ? 1.05
    : age < 14 ? 0.95
    : age < 19 ? 0.85
    : 1.2;
  if (age >= 19 && goal === "lose") proteinPerKg = 1.4;
  else if (age >= 19 && goal === "gain") proteinPerKg = 1.6;
  else if (age >= 19 && goal === "muscle_gain") proteinPerKg = 2.0;
  if (age >= 65) proteinPerKg = Math.max(proteinPerKg, 1.2);

  const proteinFromWeight = Math.round(weight * proteinPerKg);
  const protein = age >= 19
    ? Math.min(proteinFromWeight, Math.round((cal * 0.35) / 4))
    : proteinFromWeight;
  let fatPct = 0.28;
  if (age >= 19 && goal === "lose") fatPct = 0.30;
  else if (age >= 19 && (goal === "gain" || goal === "muscle_gain")) fatPct = 0.25;
  const fat = Math.round((cal * fatPct) / 9);
  const carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((cal / 1000) * 14);

  let omega3Ala = age < 1 ? 0.5
    : age < 4 ? 0.7
    : age < 9 ? 0.9
    : age < 14 ? (gender === "female" ? 1.0 : 1.2)
    : (gender === "female" ? 1.1 : 1.6);
  if (gender === "female" && isPregnant) omega3Ala = 1.4;
  if (gender === "female" && isLactating) omega3Ala = 1.3;

  const micronutrients = ageSpecificMicronutrientTargets(age, gender);
  if (gender === "female" && isPregnant) {
    Object.assign(micronutrients, { iron: 27, vitaminB9: 600, vitaminB12: 2.6, vitaminC: 85, vitaminA: 770, zinc: 11, choline: 450 });
  } else if (gender === "female" && isLactating) {
    Object.assign(micronutrients, { iron: 9, vitaminB9: 500, vitaminB12: 2.8, vitaminC: 120, vitaminA: 1300, zinc: 12, choline: 550 });
  }

  return {
    ...RDA_DEFAULT,
    ...micronutrients,
    calories: cal,
    protein,
    fat,
    carbohydrates: carbs,
    fiber,
    sugar: 90, // Reference intake for Total Sugars (not just added sugars)
    saturatedFat: age >= 2 ? Math.round((cal * 0.1 / 9) * 10) / 10 : 0,
    monounsaturatedFat: 0,
    polyunsaturatedFat: 0,
    omega3Ala,
  };
}
