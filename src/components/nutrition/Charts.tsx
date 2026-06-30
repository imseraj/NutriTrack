import { useNutrition } from "@/context/NutritionContext";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Cell, PieChart, Pie } from "recharts";
import { TrendingUp, Activity, Award, FlaskConical, Pencil } from "lucide-react";

export function MicroBarChart() {
  const { totals, rda } = useNutrition();
  const keys: { k: string; label: string }[] = [
    { k: "vitaminA", label: "Vit A" },
    { k: "vitaminC", label: "Vit C" },
    { k: "vitaminD", label: "Vit D" },
    { k: "vitaminE", label: "Vit E" },
    { k: "vitaminK", label: "Vit K" },
    { k: "vitaminB6", label: "B6" },
    { k: "vitaminB9", label: "B9" },
    { k: "vitaminB12", label: "B12" },
    { k: "calcium", label: "Ca" },
    { k: "iron", label: "Fe" },
    { k: "magnesium", label: "Mg" },
    { k: "potassium", label: "K" },
    { k: "zinc", label: "Zn" },
    { k: "sodium", label: "Na" },
    { k: "selenium", label: "Se" },
  ];
  const data = keys.map(({ k, label }) => {
    const v = (totals as Record<string, number>)[k] ?? 0;
    const t = (rda as unknown as Record<string, number>)[k] ?? 0;
    return { name: label, pct: t > 0 ? Math.min(200, Math.round((v / t) * 100)) : 0 };
  });
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-accent/20 grid place-items-center">
          <FlaskConical className="h-4 w-4 text-accent" />
        </div>
        <h3 className="font-semibold">Micronutrient Coverage (% of RDA)</h3>
      </div>
      <div className="h-72">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval={0} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(v: number) => `${v}%`} />
            <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pct >= 100 ? "hsl(var(--primary))" : d.pct >= 50 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MacroPie() {
  const { totals } = useNutrition();
  const data = [
    { name: "Protein", value: Math.max(0, totals.protein * 4), color: "hsl(var(--protein))" },
    { name: "Carbs", value: Math.max(0, totals.carbohydrates * 4), color: "hsl(var(--carbs))" },
    { name: "Fat", value: Math.max(0, totals.fat * 9), color: "hsl(var(--fat))" },
  ];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
          <Activity className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold">Macro Breakdown</h3>
      </div>
      <div className="h-44">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={3} stroke="none">
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-around text-xs mt-2">
        {data.map((d) => (
          <div key={d.name} className="text-center">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
              <span className="font-medium">{d.name}</span>
            </div>
            <div className="text-muted-foreground tabular-nums">{Math.round((d.value / total) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoryChart() {
  const { history, rda, updateLogCalories } = useNutrition();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [caloriesVal, setCaloriesVal] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (history.length > 0 && !selectedDate) {
      const lastEntry = history[history.length - 1];
      setSelectedDate(lastEntry.date);
      setCaloriesVal(Math.round(lastEntry.totals.calories).toString());
    }
  }, [history, selectedDate]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const entry = history.find((h) => h.date === date);
    if (entry) {
      setCaloriesVal(Math.round(entry.totals.calories).toString());
    }
  };

  const data = history.map((h) => ({
    date: h.date.slice(5),
    calories: Math.round(h.totals.calories),
  }));
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent/20 grid place-items-center">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <h3 className="font-semibold">Weekly Calorie Trend</h3>
        </div>

        {history.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (open && history.length > 0) {
              const lastEntry = history[history.length - 1];
              setSelectedDate(lastEntry.date);
              setCaloriesVal(Math.round(lastEntry.totals.calories).toString());
            }
          }}>
            <DialogTrigger asChild>
              <button className="text-xs font-semibold text-primary hover:text-primary-glow flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-xl transition-all border border-border/20">
                <Pencil className="h-3 w-3" />
                Modify Calories
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Modify Logged Calories</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Select a logged date and enter the corrected calorie intake.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="logDate" className="text-xs font-bold text-muted-foreground">Logged Date</Label>
                  <select
                    id="logDate"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary"
                  >
                    {history.map((h) => (
                      <option key={h.date} value={h.date}>
                        {h.date} ({Math.round(h.totals.calories)} kcal)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="logCalories" className="text-xs font-bold text-muted-foreground">Calorie Intake (kcal)</Label>
                  <Input
                    id="logCalories"
                    type="number"
                    value={caloriesVal}
                    onChange={(e) => setCaloriesVal(e.target.value)}
                    placeholder="e.g. 2000"
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!selectedDate) return;
                    const parsedVal = parseInt(caloriesVal) || 0;
                    await updateLogCalories(selectedDate, parsedVal);
                    setDialogOpen(false);
                    toast({
                      title: "Calories Updated",
                      description: `Logged calories for ${selectedDate} updated to ${parsedVal} kcal.`,
                    });
                  }}
                  className="rounded-xl gradient-primary text-primary-foreground"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="h-44">
        {data.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Log your day to start tracking trends
          </div>
        ) : (
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function StatCards() {
  const { totals, selected, rda } = useNutrition();
  const stats = [
    { label: "Items", value: selected.length, hint: "in this meal", color: "from-primary to-primary-glow" },
    { label: "Calories", value: Math.round(totals.calories), hint: `${Math.round((totals.calories / rda.calories) * 100)}% of goal`, color: "from-accent to-orange-400" },
    { label: "Protein", value: `${Math.round(totals.protein)}g`, hint: `goal ${rda.protein}g`, color: "from-protein to-blue-400" },
    { label: "Fiber", value: `${Math.round(totals.fiber)}g`, hint: `goal ${rda.fiber}g`, color: "from-fiber to-green-400" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4 hover-lift">
          <div className={`h-1 w-10 rounded-full bg-gradient-to-r ${s.color} mb-3`} />
          <div className="text-2xl font-bold tabular-nums">{s.value}</div>
          <div className="text-xs font-medium mt-0.5">{s.label}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{s.hint}</div>
        </div>
      ))}
    </div>
  );
}
