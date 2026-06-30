import { useState } from "react";
import { useNutrition } from "@/context/NutritionContext";
import { Bookmark, Plus, Trash2, FileDown, History as HistoryIcon } from "lucide-react";
import { exportPDF } from "@/lib/pdf";

export function SavedMeals() {
  const { savedMeals, saveMeal, loadMeal, deleteMeal, selected, totals, rda, profile, logDay } = useNutrition();
  const [name, setName] = useState("");

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
          <Bookmark className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold">Save & Export</h3>
      </div>

      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name (e.g. Lunch)"
          className="flex-1 h-10 px-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary" />
        <button onClick={() => { saveMeal(name); setName(""); }}
          disabled={!name.trim() || selected.length === 0}
          className="h-10 px-4 rounded-xl gradient-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 shadow-glow disabled:opacity-50 disabled:shadow-none">
          <Plus className="h-4 w-4" /> Save
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => logDay()} disabled={selected.length === 0}
          className="h-10 px-3 rounded-xl bg-secondary hover:bg-muted text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
          <HistoryIcon className="h-4 w-4" /> Log Today
        </button>
        <button onClick={() => exportPDF({ selected, totals, rda, profile })} disabled={selected.length === 0}
          className="h-10 px-3 rounded-xl bg-accent text-accent-foreground hover:opacity-90 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 transition-opacity">
          <FileDown className="h-4 w-4" /> Export PDF
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
        {savedMeals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No saved meals yet</p>
        ) : savedMeals.map((m) => (
          <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
            <button onClick={() => loadMeal(m.id)} className="flex-1 text-left">
              <div className="text-sm font-medium">{m.name}</div>
              <div className="text-[10px] text-muted-foreground">{m.items.length} items · {new Date(m.savedAt).toLocaleDateString()}</div>
            </button>
            <button onClick={() => deleteMeal(m.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
