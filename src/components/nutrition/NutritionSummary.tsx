import { useNutrition } from "@/context/NutritionContext";
import { formatNum } from "@/lib/nutrition";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Flame, Drumstick, Wheat, Droplet, Leaf } from "lucide-react";

const macroMeta = [
  { key: "protein", label: "Protein", color: "hsl(var(--protein))", icon: Drumstick, suffix: "g" },
  { key: "carbohydrates", label: "Carbs", color: "hsl(var(--carbs))", icon: Wheat, suffix: "g" },
  { key: "fat", label: "Fat", color: "hsl(var(--fat))", icon: Droplet, suffix: "g" },
  { key: "fiber", label: "Fiber", color: "hsl(var(--fiber))", icon: Leaf, suffix: "g" },
] as const;

export function NutritionSummary() {
  const { totals, rda } = useNutrition();

  const calPct = Math.min(100, (totals.calories / rda.calories) * 100);
  const data = [
    { name: "Protein", value: Math.max(0, totals.protein * 4), color: "hsl(var(--protein))" },
    { name: "Carbs", value: Math.max(0, totals.carbohydrates * 4), color: "hsl(var(--carbs))" },
    { name: "Fat", value: Math.max(0, totals.fat * 9), color: "hsl(var(--fat))" },
  ];
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="sticky top-4 space-y-4">
      <div className="glass-card p-5 gradient-hero">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Today</p>
            <h3 className="text-lg font-bold">Nutrition Summary</h3>
          </div>
          <div className="h-10 w-10 rounded-xl gradient-primary grid place-items-center shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative h-32 w-32">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={hasData ? data : [{ name: "empty", value: 1, color: "hsl(var(--muted))" }]}
                  innerRadius={42} outerRadius={60} paddingAngle={hasData ? 3 : 0} dataKey="value" stroke="none">
                  {(hasData ? data : [{ color: "hsl(var(--muted))" }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-2xl font-bold leading-none">{Math.round(totals.calories)}</div>
                <div className="text-[10px] text-muted-foreground mt-1">/ {rda.calories} kcal</div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {macroMeta.map((m) => {
              const value = totals[m.key as keyof typeof totals] as number;
              const target = rda[m.key as keyof typeof rda] as number;
              const pct = Math.min(100, (value / target) * 100);
              const Icon = m.icon;
              return (
                <div key={m.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3" style={{ color: m.color }} />
                      <span className="font-medium">{m.label}</span>
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatNum(value)}/{target}{m.suffix}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: m.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/40">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Daily calorie goal</span>
            <span className="font-semibold tabular-nums">{Math.round(calPct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${calPct}%` }}
              transition={{ duration: 0.7 }} className="h-full gradient-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
