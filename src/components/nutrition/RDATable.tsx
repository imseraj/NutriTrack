import { useNutrition } from "@/context/NutritionContext";
import { formatNum } from "@/lib/nutrition";
import { motion } from "framer-motion";

const ROWS: { key: string; label: string; unit: string; group: "macro" | "micro" }[] = [
  { key: "calories", label: "Calories", unit: "kcal", group: "macro" },
  { key: "protein", label: "Protein", unit: "g", group: "macro" },
  { key: "carbohydrates", label: "Carbohydrates", unit: "g", group: "macro" },
  { key: "fat", label: "Fat", unit: "g", group: "macro" },
  { key: "fiber", label: "Fiber", unit: "g", group: "macro" },
  { key: "sugar", label: "Sugar", unit: "g", group: "macro" },
  // Fat-soluble vitamins
  { key: "vitaminA", label: "Vitamin A", unit: "µg", group: "micro" },
  { key: "vitaminD", label: "Vitamin D", unit: "µg", group: "micro" },
  { key: "vitaminE", label: "Vitamin E", unit: "mg", group: "micro" },
  { key: "vitaminK", label: "Vitamin K", unit: "µg", group: "micro" },
  // Water-soluble vitamins
  { key: "vitaminC", label: "Vitamin C", unit: "mg", group: "micro" },
  { key: "vitaminB1", label: "Vitamin B1 (Thiamin)", unit: "mg", group: "micro" },
  { key: "vitaminB2", label: "Vitamin B2 (Riboflavin)", unit: "mg", group: "micro" },
  { key: "vitaminB3", label: "Vitamin B3 (Niacin)", unit: "mg", group: "micro" },
  { key: "vitaminB5", label: "Vitamin B5 (Pantothenic)", unit: "mg", group: "micro" },
  { key: "vitaminB6", label: "Vitamin B6", unit: "mg", group: "micro" },
  { key: "vitaminB7", label: "Vitamin B7 (Biotin)", unit: "µg", group: "micro" },
  { key: "vitaminB9", label: "Vitamin B9 (Folate)", unit: "µg", group: "micro" },
  { key: "vitaminB12", label: "Vitamin B12", unit: "µg", group: "micro" },
  // Major minerals
  { key: "calcium", label: "Calcium", unit: "mg", group: "micro" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg", group: "micro" },
  { key: "magnesium", label: "Magnesium", unit: "mg", group: "micro" },
  { key: "sodium", label: "Sodium", unit: "mg", group: "micro" },
  { key: "potassium", label: "Potassium", unit: "mg", group: "micro" },
  { key: "chloride", label: "Chloride", unit: "mg", group: "micro" },
  { key: "sulfur", label: "Sulfur", unit: "mg", group: "micro" },
  // Trace minerals
  { key: "iron", label: "Iron", unit: "mg", group: "micro" },
  { key: "zinc", label: "Zinc", unit: "mg", group: "micro" },
  { key: "iodine", label: "Iodine", unit: "µg", group: "micro" },
  { key: "selenium", label: "Selenium", unit: "µg", group: "micro" },
  { key: "copper", label: "Copper", unit: "mg", group: "micro" },
  { key: "manganese", label: "Manganese", unit: "mg", group: "micro" },
  { key: "fluoride", label: "Fluoride", unit: "mg", group: "micro" },
  { key: "chromium", label: "Chromium", unit: "µg", group: "micro" },
  { key: "molybdenum", label: "Molybdenum", unit: "µg", group: "micro" },
  { key: "cobalt", label: "Cobalt", unit: "µg", group: "micro" },
];

export function RDATable() {
  const { totals, rda } = useNutrition();

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">RDA Comparison</h3>
          <p className="text-xs text-muted-foreground">All 36 nutrients · personalised to your profile</p>
        </div>
      </div>
      <div className="divide-y divide-border/40 max-h-[640px] overflow-y-auto scrollbar-thin">
        {ROWS.map((r) => {
          const value = ((totals as Record<string, number>)[r.key] as number) ?? 0;
          const target = ((rda as unknown as Record<string, number>)[r.key] as number) ?? 0;
          const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
          const overflow = target > 0 && value > target;
          return (
            <div key={r.key} className="p-3 hover:bg-secondary/40 transition-colors">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${r.group === "macro" ? "bg-primary" : "bg-accent"}`} />
                  <span className="font-medium">{r.label}</span>
                </div>
                <div className="text-xs tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{formatNum(value)}</span>
                  <span className="mx-1">/</span>
                  <span>{formatNum(target)} {r.unit}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${overflow ? "bg-destructive/15 text-destructive" : pct >= 80 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {Math.round(pct)}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${overflow ? "bg-destructive" : r.group === "macro" ? "gradient-primary" : "gradient-accent"}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
