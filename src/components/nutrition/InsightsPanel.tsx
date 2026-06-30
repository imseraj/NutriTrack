import { useNutrition } from "@/context/NutritionContext";
import { Brain, Lightbulb, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

interface InsightItem {
  type: "success" | "warning" | "info" | "danger";
  title: string;
  desc: string;
  source: string;
}

export function InsightsPanel() {
  const { totals, rda, selected } = useNutrition();

  const insights = useMemo(() => {
    const list: InsightItem[] = [];

    if (selected.length === 0) {
      list.push({
        type: "info",
        title: "Plate is empty",
        desc: "Add foods you've eaten today to start receiving smart coaching analysis.",
        source: "Coach AI",
      });
      return list;
    }

    // 1. Calorie Analysis
    const calPct = (totals.calories / rda.calories) * 100;
    if (calPct < 15) {
      list.push({
        type: "info",
        title: "Low Energy Logged",
        desc: "You have completed less than 15% of your daily energy goal. Fuel up with nutrient-dense foods.",
        source: "Energy",
      });
    } else if (calPct >= 80 && calPct <= 105) {
      list.push({
        type: "success",
        title: "Calorie Target Achieved!",
        desc: "Perfect energy balancing! You are currently sitting within your optimal target zone.",
        source: "Energy",
      });
    } else if (calPct > 110) {
      list.push({
        type: "danger",
        title: "Calorie Surplus",
        desc: "You have exceeded your daily energy RDA. Focus on light activities to balance energy expenditure.",
        source: "Energy",
      });
    }

    // 2. Macronutrient Insights
    // Protein
    const proteinPct = (totals.protein / rda.protein) * 100;
    if (proteinPct < 50) {
      list.push({
        type: "warning",
        title: "Protein Intake Lagging",
        desc: `Currently logged ${Math.round(totals.protein)}g of your ${rda.protein}g protein target. Try adding chicken breast, paneer, tofu, dal, or eggs to support muscle maintenance.`,
        source: "Protein",
      });
    } else if (proteinPct >= 95) {
      list.push({
        type: "success",
        title: "Protein Goal Complete!",
        desc: "Fantastic job! Your protein intake is optimal for tissue repair and satiety.",
        source: "Protein",
      });
    }

    // Fiber
    const fiberPct = (totals.fiber / rda.fiber) * 100;
    if (fiberPct < 40) {
      list.push({
        type: "warning",
        title: "Incorporate More Fiber",
        desc: `Fiber is low (${Math.round(totals.fiber)}g / ${rda.fiber}g). Oats, almonds, broccoli, spinach, and whole wheat roti are rich sources to boost digestion.`,
        source: "Fiber",
      });
    }

    // Sugar
    const sugarPct = (totals.sugar / rda.sugar) * 100;
    if (sugarPct > 100) {
      list.push({
        type: "danger",
        title: "High Sugar Logged",
        desc: `You have consumed ${Math.round(totals.sugar)}g sugar (RDA limit is ${rda.sugar}g). Try swapping sweet items for fresh fruits like strawberries or apples.`,
        source: "Sugar",
      });
    }

    // 3. Micronutrients Analysis (Vitamins and Minerals)
    const microsToCheck = [
      { key: "vitaminC", label: "Vitamin C", foods: "Oranges, strawberries, broccoli, tomatoes" },
      { key: "vitaminD", label: "Vitamin D", foods: "Salmon, whole milk, eggs" },
      { key: "vitaminA", label: "Vitamin A", foods: "Carrots, spinach, sweet potatoes, broccoli" },
      { key: "calcium", label: "Calcium", foods: "Paneer, tofu, cheddar cheese, whole milk, yogurt" },
      { key: "iron", label: "Iron", foods: "Dal, spinach, chickpeas, almonds, whole wheat roti" },
      { key: "magnesium", label: "Magnesium", foods: "Almonds, oats, walnuts, dark chocolate, spinach" },
      { key: "potassium", label: "Potassium", foods: "Bananas, avocados, potato, spinach, whole milk" },
      { key: "zinc", label: "Zinc", foods: "Chickpeas, dal, cheddar cheese, almonds, oats" },
    ];

    let lowMicrosCount = 0;
    microsToCheck.forEach(({ key, label, foods }) => {
      const val = (totals as Record<string, number>)[key] ?? 0;
      const target = (rda as unknown as Record<string, number>)[key] ?? 0;
      if (target > 0 && (val / target) * 100 < 35) {
        lowMicrosCount++;
        if (lowMicrosCount <= 2) {
          list.push({
            type: "info",
            title: `Boost ${label}`,
            desc: `Current level is low (<35% target). Incorporating ${foods.toLowerCase()} into your plan will help.`,
            source: label,
          });
        }
      }
    });

    // Sodium warning
    const sodiumPct = (totals.sodium / rda.sodium) * 100;
    if (sodiumPct > 100) {
      list.push({
        type: "danger",
        title: "High Sodium Warning",
        desc: `Sodium logged is ${Math.round(totals.sodium)}mg, exceeding the ${rda.sodium}mg RDA guideline. Drink extra water to help flush excess sodium.`,
        source: "Sodium",
      });
    }

    return list;
  }, [totals, rda, selected]);

  const getBadgeCls = (type: InsightItem["type"]) => {
    switch (type) {
      case "success": return "bg-primary/10 text-primary border border-primary/20";
      case "warning": return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "danger": return "bg-destructive/15 text-destructive border border-destructive/20";
      default: return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    }
  };

  const getIcon = (type: InsightItem["type"]) => {
    switch (type) {
      case "success": return <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0" />;
      case "warning": return <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
      case "danger": return <AlertTriangle className="h-4.5 w-4.5 text-destructive shrink-0" />;
      default: return <Lightbulb className="h-4.5 w-4.5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-accent/20 grid place-items-center">
            <Brain className="h-4 w-4 text-accent" />
          </div>
          <h3 className="font-semibold">Coaching & Insights</h3>
        </div>

        <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
          {insights.map((ins, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-secondary/35 border border-border/40 flex gap-3 hover:bg-secondary/50 transition-colors">
              {getIcon(ins.type)}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-primary">{ins.title}</h4>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${getBadgeCls(ins.type)}`}>
                    {ins.source}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-border/50 flex items-center gap-2 text-[10px] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-accent animate-pulse" />
        <span>Insights recalculate instantly as you modify foods and profile metrics.</span>
      </div>
    </div>
  );
}
