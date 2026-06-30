import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Sparkles, FolderOpen, Plus, Tag } from "lucide-react";
import { Food } from "@/data/foods";
import { useNutrition, SavedMeal } from "@/context/NutritionContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

type SearchItem = 
  | { type: "food"; item: Food; isCustom?: boolean }
  | { type: "meal"; item: SavedMeal };

export function FoodSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const { addFood, recentFoods, customFoods, savedMeals, loadMealToPlate, globalFoods } = useNutrition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Combine default, custom foods and saved meals for searchable index
  const searchablePool = useMemo<SearchItem[]>(() => {
    const pool: SearchItem[] = [];
    
    // Default foods
    globalFoods.forEach((f) => pool.push({ type: "food", item: f, isCustom: false }));
    
    // Custom foods
    customFoods.forEach((f) => pool.push({ type: "food", item: f, isCustom: true }));
    
    // Saved meals
    savedMeals.forEach((m) => pool.push({ type: "meal", item: m }));

    return pool;
  }, [customFoods, savedMeals]);

  const results = useMemo<SearchItem[]>(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return [];
    
    return searchablePool
      .filter((x) => {
        if (x.type === "food") {
          return x.item.name.toLowerCase().includes(term) || x.item.category.toLowerCase().includes(term);
        } else {
          return x.item.name.toLowerCase().includes(term) || "meal".includes(term);
        }
      })
      .slice(0, 8);
  }, [debounced, searchablePool]);

  // Browse category items
  const categoryFoods = useMemo<Food[]>(() => {
    const allFoods = [...globalFoods, ...customFoods];
    if (selectedCategory === "All") return [];
    if (selectedCategory === "Custom Foods") return customFoods;
    return allFoods.filter((f) => f.category === selectedCategory);
  }, [selectedCategory, customFoods]);

  const showRecent = open && !q && recentFoods.length > 0;
  const showResults = open && results.length > 0;

  const handlePick = (x: SearchItem) => {
    if (x.type === "food") {
      addFood(x.item);
    } else {
      loadMealToPlate(x.item);
    }
    setQ("");
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!showResults) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); handlePick(results[active]); }
    if (e.key === "Escape") setOpen(false);
  };

  const categories = ["All", "Protein", "Fruit", "Vegetable", "Grain", "Dairy", "Nut", "Fat", "Beverage", "Custom Foods"];

  return (
    <div className="relative w-full space-y-4" ref={ref}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search foods, custom foods or your saved meals..."
          className="w-full h-14 pl-12 pr-12 rounded-2xl bg-card border border-border/60 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-card"
        />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Auto-suggest dropdown */}
      <AnimatePresence>
        {(showResults || showRecent) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-2 w-full glass-card overflow-hidden shadow-soft"
          >
            {showRecent && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Recent
                </div>
                {recentFoods.map((f) => (
                  <button key={f.id} onClick={() => handlePick({ type: "food", item: f })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary text-left transition-colors">
                    <span className="text-2xl">{f.emoji}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{f.category} · {f.nutrition.calories} kcal / {f.servingSize}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showResults && (
              <div className="p-2 max-h-[350px] overflow-y-auto pr-1">
                {results.map((x, i) => (
                  <button key={x.type === "food" ? x.item.id : x.item.id} onClick={() => handlePick(x)} onMouseEnter={() => setActive(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${active === i ? "bg-secondary" : "hover:bg-secondary/60"}`}>
                    <span className="text-2xl">{x.type === "food" ? x.item.emoji : "🍱"}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        {x.type === "food" ? x.item.name : x.item.name}
                        {x.type === "food" && x.isCustom && (
                          <span className="text-[9px] bg-accent/25 text-accent-foreground px-1.5 py-0.5 rounded font-bold">Custom</span>
                        )}
                        {x.type === "meal" && (
                          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">Meal</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {x.type === "food" ? (
                          `${x.item.category} · ${x.item.nutrition.calories} kcal / ${x.item.servingSize}`
                        ) : (
                          `${x.item.items.length} items · Saved Meal`
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-primary font-semibold">+ Add</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories chips and Custom Food Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 max-w-full overflow-x-auto scrollbar-hide py-1">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 shrink-0"><Tag className="h-3 w-3" /> Browse:</span>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c === selectedCategory ? "All" : c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === c
                  ? "gradient-primary text-primary-foreground shadow-glow"
                  : "bg-secondary/60 hover:bg-secondary text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Food Shelf for Selected Category */}
      <AnimatePresence>
        {selectedCategory !== "All" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-secondary/25 border border-border/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Showing {selectedCategory} ({categoryFoods.length} items)
                </span>
                <button
                  onClick={() => setSelectedCategory("All")}
                  className="text-muted-foreground hover:text-primary font-semibold transition-colors"
                >
                  Close
                </button>
              </div>

              {categoryFoods.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No foods registered in this category yet. Click "Add Custom Food" to log one!
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {categoryFoods.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        addFood(f);
                        toast({
                          title: "Added to Plate",
                          description: `${f.emoji} ${f.name} added.`,
                        });
                      }}
                      className="flex flex-col items-center justify-center p-3 bg-card border border-border/60 hover:border-primary rounded-xl min-w-[110px] text-center transition-all hover:-translate-y-0.5 hover:shadow-card shrink-0"
                    >
                      <span className="text-3xl mb-1">{f.emoji}</span>
                      <span className="text-xs font-semibold text-primary truncate w-full">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground">{f.nutrition.calories} kcal</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
