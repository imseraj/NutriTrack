export type Unit = "g" | "kg" | "ml" | "pieces" | "bowl" | "serving";

export interface FoodMicros {
  // Fat-soluble vitamins
  vitaminA?: number; vitaminD?: number; vitaminE?: number; vitaminK?: number;
  // Water-soluble vitamins
  vitaminC?: number;
  vitaminB1?: number; vitaminB2?: number; vitaminB3?: number; vitaminB5?: number;
  vitaminB6?: number; vitaminB7?: number; vitaminB9?: number; vitaminB12?: number;
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
}
export interface Food {
  id: string;
  name: string;
  category: string;
  emoji: string;
  baseQuantity: number;
  baseUnit: Unit;
  servingSize: string;
  nutrition: {
    calories: number;
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
  fluoride: 4,     // mg

  // ADEQUATE INTAKES (AI) / ESTIMATES — no official NIH RDA
  chloride: 2300,  // mg (AI)
  chromium: 35,    // μg (AI)
  molybdenum: 45,  // μg
  sulfur: 900,     // mg (estimated, from sulfur-amino acids)
  cobalt: 1,       // μg (trace, absorbed via B12)

  // Legacy
  vitaminB: 2.4,
};

export type RDA = typeof RDA_DEFAULT;

export interface UserProfile {
  age: number;
  gender: "male" | "female";
  weight: number; // kg
  height: number; // cm
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  goal: "maintain" | "lose" | "gain" | "muscle_gain";
  isPregnant?: boolean;
  isLactating?: boolean;
}

export function computeRDA(profile: UserProfile): RDA {
  const { age, gender, weight, height, activityLevel, goal, isPregnant, isLactating } = profile;

  // Fallback for unconfigured profiles (e.g. first-time login)
  if (!age || !weight || !height) {
    return RDA_DEFAULT;
  }

  // 1. BMR & CALORIES
  let bmr = 0;
  if (age < 18) {
    // Schofield equations (kcal/day)
    if (gender === "male") {
      bmr = age < 3 ? (59.512 * weight - 30.4)
          : age < 10 ? (22.706 * weight + 504.3)
          : (17.686 * weight + 658.2);
    } else {
      bmr = age < 3 ? (58.317 * weight - 31.1)
          : age < 10 ? (20.315 * weight + 485.9)
          : (13.384 * weight + 692.6);
    }
  } else {
    // Mifflin-St Jeor
    bmr = 10 * weight + 6.25 * height - 5 * age + (gender === "male" ? 5 : -161);
  }

  let cal = bmr * activityLevel;
  if (goal === "lose") cal -= 500;
  if (goal === "gain") cal += 500;
  if (goal === "muscle_gain") cal += 300;
  if (isPregnant) cal += 300;
  if (isLactating) cal += 500;
  
  // Safety floor for calories (1500 for men, 1200 for women)
  const minCal = gender === "male" ? 1500 : 1200;
  cal = Math.max(minCal, Math.round(cal));

  // 2. MACROS (Percentage-based AMDR for robust scaling across body weights)
  let proteinPct = 0.20; // 20% protein default
  let fatPct = 0.30;     // 30% fat default
  
  if (goal === "lose") {
    proteinPct = 0.30; // Higher protein to preserve muscle during deficit
    fatPct = 0.30;
  } else if (goal === "gain" || goal === "muscle_gain") {
    proteinPct = 0.25; 
    fatPct = 0.25;
  }
  
  if (age >= 65) {
    proteinPct = Math.max(proteinPct, 0.25); // Prevent sarcopenia
  }

  const protein = Math.round((cal * proteinPct) / 4);
  const fat = Math.round((cal * fatPct) / 9);
  const carbs = Math.max(0, Math.round((cal * (1 - proteinPct - fatPct)) / 4));
  
  // Fiber based on 14g per 1000 kcal guideline
  const fiber = Math.round((cal / 1000) * 14);

  // 3. MICROS — dynamic NIH DRI adjustments
  let {
    calcium, iron, vitaminD, vitaminB9, vitaminB12, vitaminC, vitaminA, zinc,
    vitaminK, vitaminB1, vitaminB2, vitaminB3, vitaminB6, magnesium, potassium
  } = RDA_DEFAULT;

  if (gender === "female") {
    vitaminA = 700;
    vitaminC = 75;
    vitaminK = 90;
    vitaminB1 = 1.1;
    vitaminB2 = 1.1;
    vitaminB3 = 14;
    zinc = 8;
    magnesium = age >= 31 ? 320 : 310;
    potassium = 2600;
    if (age >= 14 && age <= 50) iron = 18;
  } else {
    // Male age-specific
    magnesium = age >= 31 ? 420 : 400;
  }

  if (age >= 9 && age <= 18) {
    calcium = 1300;
  } else if (age > 70) {
    calcium = 1200;
  } else if (age > 50 && gender === "female") {
    calcium = 1200;
  }

  if (age > 70) {
    vitaminD = 20;
  }

  // Vitamin B6 increases for adults 51+
  if (age >= 51) {
    vitaminB6 = gender === "male" ? 1.7 : 1.5;
  }

  if (age > 50 && gender === "female") {
    iron = 8;
  }

  if (isPregnant) {
    iron = 27;
    vitaminB9 = 600;
    vitaminB12 = 2.6;
    vitaminC = 85;
    vitaminA = 770;
    zinc = 11;
  } else if (isLactating) {
    iron = 9;
    vitaminB9 = 500;
    vitaminB12 = 2.8;
    vitaminC = 120;
    vitaminA = 1300;
    zinc = 12;
  }

  return {
    ...RDA_DEFAULT,
    calories: cal,
    protein,
    fat,
    carbohydrates: carbs,
    fiber,
    sugar: 90, // Reference intake for Total Sugars (not just added sugars)
    calcium,
    iron,
    vitaminA,
    vitaminC,
    vitaminD,
    vitaminK,
    vitaminB1,
    vitaminB2,
    vitaminB3,
    vitaminB6,
    vitaminB9,
    vitaminB12,
    magnesium,
    potassium,
    zinc,
  };
}
