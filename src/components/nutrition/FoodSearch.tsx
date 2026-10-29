import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Sparkles, Tag, Loader2 } from "lucide-react";
import { Food } from "@/data/foods";
import { useNutrition, SavedMeal } from "@/context/NutritionContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { FdcCategoryResults, getFoodDataCentralDetails, searchFoodDataCentral } from "@/lib/foodDataCentral";

type SearchItem = 
  | { type: "food"; item: Food; isCustom?: boolean; isFdc?: boolean; source?: string }
  | { type: "meal"; item: SavedMeal };

export function FoodSearch() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [fdcCategories, setFdcCategories] = useState<FdcCategoryResults[]>([]);
  const [showingOtherSources, setShowingOtherSources] = useState(false);
  const [fdcLoading, setFdcLoading] = useState(false);
  const [fdcMoreLoading, setFdcMoreLoading] = useState(false);
  const [fdcError, setFdcError] = useState<string | null>(null);
  const [loadingFoodId, setLoadingFoodId] = useState<string | null>(null);

  const { addFood, recentFoods, customFoods, savedMeals, loadMealToPlate, globalFoods } = useNutrition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const term = debounced.trim();
    if (term.length < 2) {
      setFdcCategories([]);
      setFdcError(null);
      setFdcLoading(false);
      return;
    }

    let activeRequest = true;
    setFdcCategories([]);
    setShowingOtherSources(false);
    setActive(0);
    setFdcLoading(true);
    setFdcError(null);
    searchFoodDataCentral(term, "SR Legacy")
      .then((categories) => {
        if (activeRequest) setFdcCategories(categories);
      })
      .catch((error: unknown) => {
        if (!activeRequest) return;
        setFdcCategories([]);
        setFdcError(error instanceof Error ? error.message : "Food search failed. Try again.");
      })
      .finally(() => {
        if (activeRequest) setFdcLoading(false);
      });

    return () => { activeRequest = false; };
  }, [debounced]);

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
  }, [customFoods, globalFoods, savedMeals]);

  const results = useMemo<SearchItem[]>(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return [];
    const fdcResults: SearchItem[] = fdcCategories.flatMap((category) =>
      category.foods.map((item) => ({ type: "food" as const, item, isFdc: true, source: category.dataType })),
    );
    const localResults = searchablePool
      .filter((x) => {
        if (x.type === "food") {
          return x.item.name.toLowerCase().includes(term) || x.item.category.toLowerCase().includes(term);
        } else {
          return x.item.name.toLowerCase().includes(term) || "meal".includes(term);
        }
      });
    return [...fdcResults, ...localResults];
  }, [debounced, fdcCategories, searchablePool]);

  const hasMoreFdcFoods = fdcCategories.some((category) => category.currentPage < category.totalPages);
  const loadedFdcRecordCount = fdcCategories.reduce((count, category) => count + category.foods.length, 0);

  const loadMoreFdcFoods = async () => {
    if (fdcMoreLoading) return;
    const categoriesToLoad = fdcCategories.filter((category) => category.currentPage < category.totalPages);
    if (categoriesToLoad.length === 0) return;

    setFdcMoreLoading(true);
    try {
      const nextPages = await Promise.all(categoriesToLoad.map((category) =>
        searchFoodDataCentral(debounced.trim(), category.dataType, category.currentPage + 1),
      ));
      const pagesByType = nextPages.flat();
      setFdcCategories((current) => current.map((category) => {
        const nextPage = pagesByType.find((page) => page.dataType === category.dataType);
        return nextPage ? { ...nextPage, foods: [...category.foods, ...nextPage.foods] } : category;
      }));
    } catch (error) {
      toast({
        title: "Couldn't load more foods",
        description: error instanceof Error ? error.message : "Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setFdcMoreLoading(false);
    }
  };

  const searchOtherSources = async () => {
    setFdcLoading(true);
    setFdcError(null);
    setShowingOtherSources(true);
    try {
      const categories = await searchFoodDataCentral(debounced.trim());
      setFdcCategories((current) => {
        const byType = new Map(current.map((category) => [category.dataType, category]));
        categories.forEach((category) => byType.set(category.dataType, category));
        return [...byType.values()];
      });
    } catch (error) {
      setShowingOtherSources(false);
      setFdcCategories([]);
      toast({
        title: "Couldn't search other USDA databases",
        description: error instanceof Error ? error.message : "Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setFdcLoading(false);
    }
  };

  const showRecent = open && !q && recentFoods.length > 0;
  const showResults = open && (results.length > 0 || fdcCategories.length > 0);
  const showSearchStatus = open && debounced.trim().length >= 2;

  const handlePick = async (x: SearchItem) => {
    if (x.type === "food") {
      if (x.isFdc) {
        setLoadingFoodId(x.item.id);
        try {
          const fdcId = Number(x.item.id.replace(/^fdc-/, ""));
          const detailedFood = await getFoodDataCentralDetails(fdcId);
          addFood(detailedFood);
        } catch (error) {
          addFood(x.item);
          toast({
            title: "USDA portions unavailable",
            description: error instanceof Error ? `${error.message} Added the food using its standard serving.` : "Added the food using its standard serving.",
          });
        } finally {
          setLoadingFoodId(null);
        }
      } else {
        addFood(x.item);
      }
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

  return (
    <div className="relative w-full space-y-4" ref={ref}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search SR Legacy foods, custom foods or saved meals..."
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
        {(showResults || showRecent || showSearchStatus) && (
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
              <>
                <div className="p-2 max-h-[350px] overflow-y-auto pr-1">
                  {results.map((x, i) => (
                    <button key={x.type === "food" ? x.item.id : x.item.id} onClick={() => handlePick(x)} onMouseEnter={() => setActive(i)} disabled={loadingFoodId !== null}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${active === i ? "bg-secondary" : "hover:bg-secondary/60"}`}>
                      <span className="text-2xl">{x.type === "food" ? x.item.emoji : "🍱"}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {x.type === "food" ? x.item.name : x.item.name}
                          {x.type === "food" && x.isCustom && (
                            <span className="text-[9px] bg-accent/25 text-accent-foreground px-1.5 py-0.5 rounded font-bold">Custom</span>
                          )}
                          {x.type === "food" && x.isFdc && (
                            <span className="text-[9px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded font-bold">USDA · {x.source}</span>
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
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                        {loadingFoodId === x.item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {loadingFoodId === x.item.id ? "Loading" : "+ Add"}
                      </span>
                    </button>
                  ))}
                </div>
                {fdcCategories.length > 0 && (
                  <div className="border-t border-border/50 p-2">
                    <p className="px-2 pb-1 text-[10px] text-muted-foreground">
                      {loadedFdcRecordCount} USDA records loaded; similar names may be from different databases.
                    </p>
                    {hasMoreFdcFoods ? (
                      <button
                        type="button"
                        onClick={loadMoreFdcFoods}
                        disabled={fdcMoreLoading}
                        className="w-full rounded-md px-3 py-2 text-xs font-semibold text-primary hover:bg-secondary disabled:opacity-60"
                      >
                        {fdcMoreLoading ? "Loading more foods..." : "Load more results"}
                      </button>
                    ) : (
                      <p className="px-3 py-2 text-center text-xs text-muted-foreground">All available results loaded</p>
                    )}
                    {!showingOtherSources && (
                      <button
                        type="button"
                        onClick={searchOtherSources}
                        disabled={fdcLoading}
                        className="w-full rounded-md px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-60"
                      >
                        {fdcLoading ? "Searching..." : "Search other USDA databases"}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            {showSearchStatus && (
              <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground">
                {fdcLoading && <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching FoodData Central...</span>}
                {!fdcLoading && fdcError && <span role="status">{fdcError}</span>}
                {!fdcLoading && !fdcError && results.length === 0 && !showingOtherSources && <span>No SR Legacy foods found.</span>}
                {!fdcLoading && !fdcError && results.length === 0 && showingOtherSources && <span>No USDA foods found. Try another search.</span>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Common search shortcuts */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 max-w-full overflow-x-auto scrollbar-hide py-1">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1 shrink-0"><Tag className="h-3 w-3" /> Popular searches:</span>
          {["Chicken", "Fruit", "Vegetables", "Grains", "Dairy", "Nuts"].map((c) => (
            <button
              key={c}
              onClick={() => { setQ(c); setOpen(true); setActive(0); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all bg-secondary/60 hover:bg-secondary text-primary"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
