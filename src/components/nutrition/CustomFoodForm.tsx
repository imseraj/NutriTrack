import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNutrition } from "@/context/NutritionContext";
import { Unit, Food } from "@/data/foods";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const emptyToUndefined = (val: unknown) => (val === "" || val === null ? undefined : val);

const foodFormSchema = z.object({
  name: z.string().min(1, "Food name is required"),
  category: z.string().min(1, "Category is required"),
  emoji: z.string().default("🍲"),
  baseQuantity: z.coerce.number().positive("Must be > 0"),
  baseUnit: z.string().min(1),
  servingSize: z.string().optional(),
  
  calories: z.coerce.number().min(0, "Cannot be negative"),
  protein: z.coerce.number().min(0, "Cannot be negative"),
  carbohydrates: z.coerce.number().min(0, "Cannot be negative"),
  fat: z.coerce.number().min(0, "Cannot be negative"),
  fiber: z.coerce.number().min(0, "Cannot be negative"),
  sugar: z.coerce.number().min(0, "Cannot be negative"),
  
  publishGlobally: z.boolean().default(false),
  
  vitaminA: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminC: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminD: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminE: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminK: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminB1: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminB2: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminB3: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminB5: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminB6: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminB7: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminB9: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  vitaminB12: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  
  calcium: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  iron: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  magnesium: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  potassium: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  sodium: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  zinc: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  phosphorus: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  selenium: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  chloride: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  sulfur: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  iodine: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  copper: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  manganese: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  fluoride: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  chromium: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  molybdenum: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  cobalt: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
});

type FoodFormValues = z.infer<typeof foodFormSchema>;

interface CustomFoodFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  foodToEdit?: Food | null;
}

export function CustomFoodForm({ onSuccess, onCancel, foodToEdit }: CustomFoodFormProps) {
  const { addCustomFood, addGlobalFood, isAdmin, updateCustomFood, updateGlobalFood, deleteCustomFood } = useNutrition();
  const [showMicros, setShowMicros] = useState(false);

  const form = useForm<FoodFormValues>({
    resolver: zodResolver(foodFormSchema),
    defaultValues: {
      name: "",
      category: "Protein",
      emoji: "🍲",
      baseQuantity: 100,
      baseUnit: "g",
      servingSize: "",
      calories: "" as any,
      protein: "" as any,
      carbohydrates: "" as any,
      fat: "" as any,
      fiber: "" as any,
      sugar: "" as any,
      publishGlobally: false,
    }
  });
  
  const { register, handleSubmit, formState: { errors }, reset } = form;

  useEffect(() => {
    if (foodToEdit) {
      const micros = foodToEdit.nutrition.micros || {};
      const isGlobal = !foodToEdit.id.startsWith("custom-food-");
      
      reset({
        name: foodToEdit.name || "",
        category: foodToEdit.category || "Protein",
        emoji: foodToEdit.emoji || "🍲",
        baseQuantity: foodToEdit.baseQuantity || 100,
        baseUnit: foodToEdit.baseUnit || "g",
        servingSize: foodToEdit.servingSize || "",
        publishGlobally: isGlobal,
        calories: foodToEdit.nutrition.calories ?? 0,
        protein: foodToEdit.nutrition.macros.protein ?? 0,
        carbohydrates: foodToEdit.nutrition.macros.carbohydrates ?? 0,
        fat: foodToEdit.nutrition.macros.fat ?? 0,
        fiber: foodToEdit.nutrition.macros.fiber ?? 0,
        sugar: foodToEdit.nutrition.macros.sugar ?? 0,
        ...micros
      });
      
      const hasMicros = Object.values(micros).some((v) => v !== undefined && v !== null && v !== 0);
      setShowMicros(hasMicros);
    } else {
      reset({
        name: "",
        category: "Protein",
        emoji: "🍲",
        baseQuantity: 100,
        baseUnit: "g",
        servingSize: "",
        calories: "" as any,
        protein: "" as any,
        carbohydrates: "" as any,
        fat: "" as any,
        fiber: "" as any,
        sugar: "" as any,
        publishGlobally: false,
      });
      setShowMicros(false);
    }
  }, [foodToEdit, reset]);

  const onSubmit = async (data: FoodFormValues) => {
    const micros: Record<string, number> = {};
    const microKeys = [
      "vitaminA", "vitaminC", "vitaminD", "vitaminE", "vitaminK",
      "vitaminB1", "vitaminB2", "vitaminB3", "vitaminB5", "vitaminB6",
      "vitaminB7", "vitaminB9", "vitaminB12", "calcium", "iron",
      "magnesium", "potassium", "sodium", "zinc", "phosphorus",
      "selenium", "chloride", "sulfur", "iodine", "copper",
      "manganese", "fluoride", "chromium", "molybdenum", "cobalt"
    ] as const;

    microKeys.forEach(key => {
      const val = data[key];
      if (typeof val === "number") {
        micros[key] = val;
      }
    });

    const foodData = {
      name: data.name,
      category: data.category,
      emoji: data.emoji || "🍲",
      baseQuantity: data.baseQuantity || 100,
      baseUnit: data.baseUnit as Unit,
      servingSize: data.servingSize || `${data.baseQuantity}${data.baseUnit}`,
      nutrition: {
        calories: data.calories,
        macros: {
          protein: data.protein,
          carbohydrates: data.carbohydrates,
          fat: data.fat,
          fiber: data.fiber,
          sugar: data.sugar,
        },
        micros,
      },
    };

    try {
      if (foodToEdit) {
        const wasCustom = foodToEdit.id.startsWith("custom-food-");

        if (data.publishGlobally && isAdmin) {
          if (wasCustom) {
            await addGlobalFood(foodData);
            await deleteCustomFood(foodToEdit.id);
            toast({
              title: "Published Globally!",
              description: `"${data.name}" has been published to the centralized global database.`,
            });
          } else {
            await updateGlobalFood({ ...foodData, id: foodToEdit.id });
            toast({
              title: "Global Food Updated!",
              description: `"${data.name}" changes have been saved to the global database.`,
            });
          }
        } else {
          if (wasCustom) {
            await updateCustomFood({ ...foodData, id: foodToEdit.id });
            toast({
              title: "Food Updated!",
              description: `"${data.name}" has been updated in your Custom Foods database.`,
            });
          } else {
            await updateGlobalFood({ ...foodData, id: foodToEdit.id });
            toast({
              title: "Global Food Updated!",
              description: `"${data.name}" changes have been saved to the global database.`,
            });
          }
        }
      } else {
        if (data.publishGlobally && isAdmin) {
          await addGlobalFood(foodData);
          toast({
            title: "Published Globally!",
            description: `"${data.name}" has been published to the centralized global database.`,
          });
        } else {
          await addCustomFood(foodData);
          toast({
            title: "Food Created!",
            description: `"${data.name}" has been added to your Custom Foods database.`,
          });
        }
      }

      reset();
      setShowMicros(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "An error occurred while saving.",
        variant: "destructive",
      });
    }
  };

  const categories = ["Protein", "Fruit", "Vegetable", "Grain", "Dairy", "Nut", "Fat", "Beverage", "Sweetener", "Snack"];

  const ErrorMsg = ({ field }: { field: keyof FoodFormValues }) => {
    const error = errors[field];
    return error ? <p className="text-destructive text-[10px] mt-1">{error.message as string}</p> : null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section 1: Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="inlineFoodName" className="text-xs font-semibold text-muted-foreground">Food Name *</Label>
          <Input
            id="inlineFoodName"
            {...register("name")}
            placeholder="e.g. Whey Protein Isolate"
            className="h-10 rounded-xl"
          />
          <ErrorMsg field="name" />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="inlineCategory" className="text-xs font-semibold text-muted-foreground">Category</Label>
          <select
            id="inlineCategory"
            {...register("category")}
            className="w-full h-10 px-3 rounded-xl bg-background border border-input text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ErrorMsg field="category" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="inlineEmoji" className="text-xs font-semibold text-muted-foreground">Emoji Icon</Label>
          <Input
            id="inlineEmoji"
            {...register("emoji")}
            placeholder="e.g. 🥚, 🥩, 🥛"
            className="h-10 rounded-xl text-center"
          />
          <ErrorMsg field="emoji" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="inlineBaseQty" className="text-xs font-semibold text-muted-foreground">Base Quantity</Label>
          <Input
            id="inlineBaseQty"
            type="number"
            step="any"
            {...register("baseQuantity")}
            placeholder="100"
            className="h-10 rounded-xl"
          />
          <ErrorMsg field="baseQuantity" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="inlineBaseUnit" className="text-xs font-semibold text-muted-foreground">Base Unit</Label>
          <select
            id="inlineBaseUnit"
            {...register("baseUnit")}
            className="w-full h-10 px-3 rounded-xl bg-background border border-input text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="g">Grams (g)</option>
            <option value="ml">Milliliters (ml)</option>
            <option value="pieces">Pieces</option>
            <option value="serving">Serving</option>
            <option value="bowl">Bowl</option>
          </select>
          <ErrorMsg field="baseUnit" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="inlineServingSize" className="text-xs font-semibold text-muted-foreground">Serving Size Desc.</Label>
          <Input
            id="inlineServingSize"
            {...register("servingSize")}
            placeholder="e.g. 1 scoop (30g)"
            className="h-10 rounded-xl"
          />
          <ErrorMsg field="servingSize" />
        </div>
      </div>

      {/* Section 2: Macros */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-primary border-b pb-1">Macronutrients (per base quantity)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="space-y-1">
            <Label htmlFor="inlineCal" className="text-xs font-semibold text-muted-foreground">Calories (kcal)</Label>
            <Input
              id="inlineCal"
              type="number"
              step="any"
              {...register("calories")}
              placeholder="0"
              className="h-10 rounded-xl"
            />
            <ErrorMsg field="calories" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inlineProtein" className="text-xs font-semibold text-protein">Protein (g)</Label>
            <Input
              id="inlineProtein"
              type="number"
              step="any"
              {...register("protein")}
              placeholder="0"
              className="h-10 rounded-xl border-protein/30 focus:border-protein"
            />
            <ErrorMsg field="protein" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inlineCarbs" className="text-xs font-semibold text-carbs">Carbs (g)</Label>
            <Input
              id="inlineCarbs"
              type="number"
              step="any"
              {...register("carbohydrates")}
              placeholder="0"
              className="h-10 rounded-xl border-carbs/30 focus:border-carbs"
            />
            <ErrorMsg field="carbohydrates" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inlineFat" className="text-xs font-semibold text-fat">Fat (g)</Label>
            <Input
              id="inlineFat"
              type="number"
              step="any"
              {...register("fat")}
              placeholder="0"
              className="h-10 rounded-xl border-fat/30 focus:border-fat"
            />
            <ErrorMsg field="fat" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inlineFiber" className="text-xs font-semibold text-fiber">Fiber (g)</Label>
            <Input
              id="inlineFiber"
              type="number"
              step="any"
              {...register("fiber")}
              placeholder="0"
              className="h-10 rounded-xl border-fiber/30 focus:border-fiber"
            />
            <ErrorMsg field="fiber" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="inlineSugar" className="text-xs font-semibold text-muted-foreground">Sugar (g)</Label>
            <Input
              id="inlineSugar"
              type="number"
              step="any"
              {...register("sugar")}
              placeholder="0"
              className="h-10 rounded-xl"
            />
            <ErrorMsg field="sugar" />
          </div>
        </div>
      </div>

      {/* Section 3: Micronutrients Accordion */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMicros(!showMicros)}
          className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition-colors text-sm font-semibold text-primary"
        >
          <span>Optional Micronutrients (Vitamins & Minerals)</span>
          {showMicros ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {showMicros && (
          <div className="p-4 space-y-4 bg-card divide-y">
            <div>
              <h5 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Vitamins</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "vitaminA", label: "Vitamin A (μg RAE)" },
                  { id: "vitaminC", label: "Vitamin C (mg)" },
                  { id: "vitaminD", label: "Vitamin D (μg)" },
                  { id: "vitaminE", label: "Vitamin E (mg)" },
                  { id: "vitaminK", label: "Vitamin K (μg)" },
                  { id: "vitaminB1", label: "B1 - Thiamin (mg)" },
                  { id: "vitaminB2", label: "B2 - Riboflavin (mg)" },
                  { id: "vitaminB3", label: "B3 - Niacin (mg)" },
                  { id: "vitaminB5", label: "B5 - Pantothenic (mg)" },
                  { id: "vitaminB6", label: "B6 (mg)" },
                  { id: "vitaminB7", label: "B7 - Biotin (μg)" },
                  { id: "vitaminB9", label: "B9 - Folate (μg DFE)" },
                  { id: "vitaminB12", label: "B12 (μg)" },
                ].map((v) => (
                  <div key={v.id} className="space-y-1">
                    <Label htmlFor={v.id} className="text-[11px] text-muted-foreground">{v.label}</Label>
                    <Input id={v.id} type="number" step="any" {...register(v.id as any)} placeholder="0" className="h-9 rounded-lg" />
                    <ErrorMsg field={v.id as any} />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <h5 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Minerals & Trace Elements</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "calcium", label: "Calcium (mg)" },
                  { id: "iron", label: "Iron (mg)" },
                  { id: "magnesium", label: "Magnesium (mg)" },
                  { id: "potassium", label: "Potassium (mg)" },
                  { id: "sodium", label: "Sodium (mg)" },
                  { id: "zinc", label: "Zinc (mg)" },
                  { id: "phosphorus", label: "Phosphorus (mg)" },
                  { id: "selenium", label: "Selenium (μg)" },
                  { id: "chloride", label: "Chloride (mg)" },
                  { id: "sulfur", label: "Sulfur (mg)" },
                  { id: "iodine", label: "Iodine (μg)" },
                  { id: "copper", label: "Copper (mg)" },
                  { id: "manganese", label: "Manganese (mg)" },
                  { id: "fluoride", label: "Fluoride (mg)" },
                  { id: "chromium", label: "Chromium (μg)" },
                  { id: "molybdenum", label: "Molybdenum (μg)" },
                  { id: "cobalt", label: "Cobalt (μg)" },
                ].map((m) => (
                  <div key={m.id} className="space-y-1">
                    <Label htmlFor={m.id} className="text-[11px] text-muted-foreground">{m.label}</Label>
                    <Input id={m.id} type="number" step="any" {...register(m.id as any)} placeholder="0" className="h-9 rounded-lg" />
                    <ErrorMsg field={m.id as any} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center pt-2 gap-4">
        {isAdmin ? (
          <div className="flex items-center space-x-2 pt-2 border-t border-border w-full sm:w-auto">
            <input
              type="checkbox"
              id="publishGlobally"
              {...register("publishGlobally")}
              className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-primary"
            />
            <Label htmlFor="publishGlobally" className="text-sm font-medium text-foreground">
              Publish to Global Database
            </Label>
          </div>
        ) : <div />}

        <div className="flex gap-2 w-full sm:w-auto justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="min-w-[120px] font-semibold">
            {foodToEdit ? "Update Food" : "Save Food"}
          </Button>
        </div>
      </div>
    </form>
  );
}
