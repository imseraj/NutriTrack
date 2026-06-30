import { useState, Fragment, useRef, useEffect } from "react";
import { useNutrition } from "@/context/NutritionContext";
import { Unit } from "@/data/foods";
import { calcNutrition, formatNum, MicroKey, sumNutrition } from "@/lib/nutrition";
import { Trash2, Plus, Minus, X, ChevronDown, Bookmark, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type MicroCol = { key: MicroKey; label: string; unit: string };
const MICRO_COLS: MicroCol[] = [
  { key: "vitaminA", label: "Vit A", unit: "μg" },
  { key: "vitaminD", label: "Vit D", unit: "μg" },
  { key: "vitaminE", label: "Vit E", unit: "mg" },
  { key: "vitaminK", label: "Vit K", unit: "μg" },
  { key: "vitaminC", label: "Vit C", unit: "mg" },
  { key: "vitaminB1", label: "B1", unit: "mg" },
  { key: "vitaminB2", label: "B2", unit: "mg" },
  { key: "vitaminB3", label: "B3", unit: "mg" },
  { key: "vitaminB5", label: "B5", unit: "mg" },
  { key: "vitaminB6", label: "B6", unit: "mg" },
  { key: "vitaminB7", label: "B7", unit: "μg" },
  { key: "vitaminB9", label: "B9", unit: "μg" },
  { key: "vitaminB12", label: "B12", unit: "μg" },
  { key: "calcium", label: "Calcium", unit: "mg" },
  { key: "phosphorus", label: "Phosph.", unit: "mg" },
  { key: "magnesium", label: "Magnes.", unit: "mg" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "potassium", label: "Potass.", unit: "mg" },
  { key: "chloride", label: "Chloride", unit: "mg" },
  { key: "sulfur", label: "Sulfur", unit: "mg" },
  { key: "iron", label: "Iron", unit: "mg" },
  { key: "zinc", label: "Zinc", unit: "mg" },
  { key: "iodine", label: "Iodine", unit: "μg" },
  { key: "selenium", label: "Selenium", unit: "μg" },
  { key: "copper", label: "Copper", unit: "mg" },
  { key: "manganese", label: "Mangan.", unit: "mg" },
  { key: "fluoride", label: "Fluoride", unit: "mg" },
  { key: "chromium", label: "Chrom.", unit: "μg" },
  { key: "molybdenum", label: "Molybd.", unit: "μg" },
  { key: "cobalt", label: "Cobalt", unit: "μg" },
];

function sliderRange(unit: Unit): { min: number; max: number; step: number } {
  if (unit === "pieces" || unit === "bowl" || unit === "serving") return { min: 0, max: 10, step: 0.5 };
  if (unit === "kg") return { min: 0, max: 2, step: 0.05 };
  return { min: 0, max: 500, step: 5 }; // g, ml
}

const UNITS: Unit[] = ["g", "kg", "ml", "pieces", "bowl", "serving"];

export function FoodTable() {
  const { selected, updateItem, removeItem, recentQuantities, clearAll, rda, saveMeal, logDay, totals } = useNutrition();
  const [mealName, setMealName] = useState("");

  const handleLogDay = async () => {
    try {
      await logDay();
      const kcal = Math.round(totals.calories);
      toast({
        title: "Day Logged!",
        description: `Successfully logged today's intake of ${kcal} kcal to your history.`,
      });
    } catch (err) {
      console.error("Failed to log day:", err);
      toast({
        title: "Logging failed",
        description: "An error occurred while logging today's calories.",
        variant: "destructive"
      });
    }
  };
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  const [saveMealOpen, setSaveMealOpen] = useState(false);
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const handleTopScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      const target = topScrollRef.current.scrollLeft;
      if (bottomScrollRef.current.scrollLeft !== target) {
        bottomScrollRef.current.scrollLeft = target;
      }
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      const target = bottomScrollRef.current.scrollLeft;
      if (topScrollRef.current.scrollLeft !== target) {
        topScrollRef.current.scrollLeft = target;
      }
    }
  };


  const pct = (got: number, target: number) => (target > 0 ? Math.round((got / target) * 100) : 0);
  const pctClass = (p: number) =>
    p >= 100 ? "text-fiber" : p >= 70 ? "text-protein" : p >= 30 ? "text-carbs" : "text-muted-foreground";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (uid: string) => setExpanded((e) => ({ ...e, [uid]: !e[uid] }));

  if (selected.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <div className="text-6xl mb-4">🥗</div>
        <h3 className="text-lg font-semibold mb-1">No foods added yet</h3>
        <p className="text-sm text-muted-foreground">Search above to start building your meal.</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/60">
        <div>
          <h3 className="font-semibold">Selected Foods</h3>
          <p className="text-xs text-muted-foreground">{selected.length} items · edit quantities to recalc nutrition</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={selected.length === 0}
            onClick={handleLogDay}
            className="text-xs font-semibold text-primary-foreground hover:opacity-90 flex items-center gap-1.5 gradient-primary disabled:opacity-50 disabled:pointer-events-none px-3.5 py-1.5 rounded-xl transition-all shadow-glow"
          >
            <Check className="h-3.5 w-3.5" /> Log Today's Calories
          </button>

          <Dialog open={saveMealOpen} onOpenChange={setSaveMealOpen}>
            <DialogTrigger asChild>
              <button
                disabled={selected.length === 0}
                className="text-xs font-semibold text-primary hover:text-primary-glow flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none px-3 py-1.5 rounded-xl transition-all border border-border/20"
              >
                <Bookmark className="h-3.5 w-3.5" /> Save as Meal
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Save Plate as Custom Meal</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  This combines all {selected.length} items on your plate into a custom named meal so you can search and log it instantly later.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="mealName" className="text-xs font-bold text-muted-foreground">Meal Name</Label>
                  <Input
                    id="mealName"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g. My Recovery Breakfast"
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSaveMealOpen(false)} className="rounded-xl">Cancel</Button>
                <Button
                  onClick={() => {
                    const nameToUse = mealName.trim() || `Meal ${new Date().toLocaleDateString()}`;
                    saveMeal(nameToUse);
                    setMealName("");
                    setSaveMealOpen(false);
                    toast({
                      title: "Meal Saved!",
                      description: `"${nameToUse}" has been added to your library and search bar.`,
                    });
                  }}
                  className="rounded-xl gradient-primary text-primary-foreground"
                >
                  Save Meal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Clear all
          </button>
        </div>
      </div>

      <div className="flex flex-col text-sm bg-card rounded-2xl overflow-hidden border border-border/40">
        {/* TOP SECTION: Headers and Food Rows */}
        <div className="flex items-stretch">
          {/* Top Left: Macros & Inputs (Fixed) */}
          <div className={`flex-shrink-0 bg-card z-10 flex flex-col justify-between border-r border-border/40 ${isMobile ? "w-[325px]" : "w-[815px]"}`}>
            <table className={`text-sm border-collapse table-fixed ${isMobile ? "w-[325px]" : "w-[815px]"}`}>
              <colgroup>
                {isMobile ? (
                  <>
                    <col style={{ width: "110px" }} /> {/* Food */}
                    <col style={{ width: "95px" }} />  {/* Quantity */}
                    <col style={{ width: "70px" }} />  {/* Unit */}
                    <col style={{ width: "50px" }} />  {/* Cal */}
                  </>
                ) : (
                  <>
                    <col style={{ width: "200px" }} /> {/* Food */}
                    <col style={{ width: "130px" }} /> {/* Quantity */}
                    <col style={{ width: "85px" }} />  {/* Unit */}
                    <col style={{ width: "60px" }} />  {/* Cal */}
                    <col style={{ width: "65px" }} />  {/* Protein */}
                    <col style={{ width: "65px" }} />  {/* Carbs */}
                    <col style={{ width: "65px" }} />  {/* Fat */}
                    <col style={{ width: "65px" }} />  {/* Fiber */}
                    <col style={{ width: "80px" }} />  {/* Sugar */}
                  </>
                )}
              </colgroup>
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40 h-[52px]">
                  <th className="text-left px-4 h-[52px] align-middle py-0 font-medium">Food</th>
                  <th className="text-left px-2 h-[52px] align-middle py-0 font-medium">Quantity</th>
                  {isMobile ? (
                    <>
                      <th className="text-left px-2 h-[52px] align-middle py-0 font-medium">Unit</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium">Cal</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-2 h-[52px] align-middle py-0 font-medium">Unit</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium">Cal</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium text-protein">Protein</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium text-carbs">Carbs</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium text-fat">Fat</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium text-fiber">Fiber</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium pr-4">Sugar</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {selected.map((item) => {
                    const n = calcNutrition(item.food, item.quantity, item.unit);
                    const step = item.unit === "pieces" || item.unit === "bowl" || item.unit === "serving" ? 0.5 : 10;
                    const incBy = (delta: number) => updateItem(item.uid, { quantity: Math.max(0, +(item.quantity + delta).toFixed(2)) });
                    return (
                      <Fragment key={item.uid}>
                        <motion.tr
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                          onMouseEnter={() => setHoveredUid(item.uid)}
                          onMouseLeave={() => setHoveredUid(null)}
                          className={`border-t border-border/40 transition-colors h-[56px] ${hoveredUid === item.uid ? "bg-secondary/40" : ""}`}
                        >
                          <td className="px-2 h-[56px] align-middle py-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button onClick={() => toggle(item.uid)}
                                className="h-6 w-6 flex-shrink-0 grid place-items-center rounded-md hover:bg-secondary transition-colors">
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded[item.uid] ? "rotate-180" : ""}`} />
                              </button>
                              {!isMobile && <span className="text-xl flex-shrink-0">{item.food.emoji}</span>}
                              <div className="min-w-0 leading-tight">
                                <div className={`font-medium ${isMobile ? "text-xs whitespace-normal break-words line-clamp-2" : "truncate max-w-[140px]"}`} title={item.food.name}>
                                  {item.food.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">{item.food.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 h-[56px] align-middle py-0">
                            <div className={`flex items-center ${isMobile ? "gap-0.5" : "gap-1"}`}>
                              <button onClick={() => incBy(-step)} className={`${isMobile ? "h-6 w-6" : "h-7 w-7"} grid place-items-center rounded-lg bg-secondary hover:bg-muted`}>
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <input type="number" min={0} step={0.1} value={item.quantity}
                                onChange={(e) => updateItem(item.uid, { quantity: parseFloat(e.target.value) || 0 })}
                                className={`${isMobile ? "w-10 h-7 text-xs px-1" : "w-16 h-8 px-2 text-sm"} rounded-lg bg-background border border-border text-center outline-none focus:border-primary`} />
                              <button onClick={() => incBy(step)} className={`${isMobile ? "h-6 w-6" : "h-7 w-7"} grid place-items-center rounded-lg bg-secondary hover:bg-muted`}>
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          {isMobile ? (
                            <>
                              <td className="px-1 h-[56px] align-middle py-0">
                                <select value={item.unit} onChange={(e) => updateItem(item.uid, { unit: e.target.value as Unit })}
                                  className="h-7 w-full px-1 rounded-lg bg-background border border-border text-[10px] outline-none focus:border-primary">
                                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right font-semibold">{formatNum(n.calories, 0)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 h-[56px] align-middle py-0">
                                <select value={item.unit} onChange={(e) => updateItem(item.uid, { unit: e.target.value as Unit })}
                                  className="h-8 px-2 rounded-lg bg-background border border-border text-xs outline-none focus:border-primary">
                                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right font-semibold">{formatNum(n.calories, 0)}</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-protein">{formatNum(n.protein)}g</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-carbs">{formatNum(n.carbohydrates)}g</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-fat">{formatNum(n.fat)}g</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-fiber">{formatNum(n.fiber)}g</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-muted-foreground pr-4">{formatNum(n.sugar)}g</td>
                            </>
                          )}
                        </motion.tr>
                        
                        <AnimatePresence initial={false}>
                          {expanded[item.uid] && (() => {
                            const r = sliderRange(item.unit);
                            const sliderMax = Math.max(r.max, item.quantity);
                            return (
                              <motion.tr key={item.uid + "-exp"}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="bg-secondary/20 border-t border-border/30 h-[92px]">
                                <td colSpan={isMobile ? 4 : 9} className="px-6 py-3 h-[92px] align-middle">
                                  <div className="flex items-center gap-4">
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                      Adjust portion
                                    </div>
                                    <Slider
                                      value={[item.quantity]}
                                      min={r.min}
                                      max={sliderMax}
                                      step={r.step}
                                      onValueChange={(v) => updateItem(item.uid, { quantity: +v[0].toFixed(2) })}
                                      className="flex-1"
                                    />
                                    <div className="text-sm font-semibold tabular-nums whitespace-nowrap min-w-[80px] text-right">
                                      {formatNum(item.quantity)} {item.unit}
                                    </div>
                                  </div>
                                  <div className="mt-2 grid grid-cols-4 gap-2 text-[11px]">
                                    <div className="px-2 py-1 rounded-md bg-background/60">
                                      <span className="text-muted-foreground">Cal </span>
                                      <span className="font-semibold">{formatNum(n.calories, 0)}</span>
                                    </div>
                                    <div className="px-2 py-1 rounded-md bg-background/60">
                                      <span className="text-protein">P </span>
                                      <span className="font-semibold">{formatNum(n.protein)}g</span>
                                    </div>
                                    <div className="px-2 py-1 rounded-md bg-background/60">
                                      <span className="text-carbs">C </span>
                                      <span className="font-semibold">{formatNum(n.carbohydrates)}g</span>
                                    </div>
                                    <div className="px-2 py-1 rounded-md bg-background/60">
                                      <span className="text-fat">F </span>
                                      <span className="font-semibold">{formatNum(n.fat)}g</span>
                                    </div>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })()}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            <div className="h-[6px] bg-secondary/40 rounded-full" />
          </div>

          {/* Top Right: Scrollable Vitamins */}
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="flex-1 overflow-x-auto scrollbar-sage pb-2 bg-card"
          >
            <table className="text-sm border-collapse table-fixed" style={{ width: `${(isMobile ? 340 : 0) + 30 * 65 + 50}px` }}>
              <colgroup>
                {isMobile && (
                  <>
                    <col style={{ width: "65px" }} />  {/* Protein */}
                    <col style={{ width: "65px" }} />  {/* Carbs */}
                    <col style={{ width: "65px" }} />  {/* Fat */}
                    <col style={{ width: "65px" }} />  {/* Fiber */}
                    <col style={{ width: "80px" }} />  {/* Sugar */}
                  </>
                )}
                {MICRO_COLS.map((c) => (
                  <col key={c.key} style={{ width: "65px" }} />
                ))}
                <col style={{ width: "50px" }} />
              </colgroup>
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40 h-[52px]">
                  {isMobile && (
                    <>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium text-protein">Protein</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium text-carbs">Carbs</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium text-fat">Fat</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium text-fiber">Fiber</th>
                      <th className="text-right px-2 h-[52px] align-middle py-0 font-medium pr-4">Sugar</th>
                    </>
                  )}
                  {MICRO_COLS.map((c, idx) => (
                    <th key={c.key} className={`text-right px-2 h-[52px] align-middle py-0 font-medium whitespace-nowrap ${(idx === 0 && !isMobile) ? "pl-4" : ""}`}>
                      {c.label}
                      <div className="text-[9px] opacity-60">{c.unit}</div>
                    </th>
                  ))}
                  <th className="px-4 h-[52px] align-middle py-0"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {selected.map((item) => {
                    const n = calcNutrition(item.food, item.quantity, item.unit);
                    return (
                      <Fragment key={item.uid}>
                        <motion.tr
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
                          onMouseEnter={() => setHoveredUid(item.uid)}
                          onMouseLeave={() => setHoveredUid(null)}
                          className={`border-t border-border/40 transition-colors h-[56px] ${hoveredUid === item.uid ? "bg-secondary/40" : ""}`}
                        >
                          {isMobile && (
                            <>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-protein">{formatNum(n.protein)}g</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-carbs">{formatNum(n.carbohydrates)}g</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-fat">{formatNum(n.fat)}g</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-fiber">{formatNum(n.fiber)}g</td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right text-muted-foreground pr-4">{formatNum(n.sugar)}g</td>
                            </>
                          )}
                          {MICRO_COLS.map((c, idx) => (
                            <td key={c.key} className={`px-2 h-[56px] align-middle py-0 text-right tabular-nums ${(idx === 0 && !isMobile) ? "pl-4" : ""}`}>{formatNum(n[c.key])}</td>
                          ))}
                          <td className="px-4 h-[56px] align-middle py-0 text-center">
                            <button onClick={() => removeItem(item.uid)} className="h-7 w-7 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </motion.tr>
                        
                        <AnimatePresence initial={false}>
                          {expanded[item.uid] && (
                            <motion.tr key={item.uid + "-exp"}
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="bg-secondary/20 border-t border-border/30 h-[92px]">
                              <td colSpan={(isMobile ? 5 : 0) + MICRO_COLS.length + 1} className="h-[92px]"></td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* BOTTOM SECTION: Footer / Totals */}
        <div className="flex items-stretch">
          {/* Bottom Left: Macros & Inputs Totals */}
          <div className={`flex-shrink-0 bg-card z-10 border-r border-border/40 ${isMobile ? "w-[325px]" : "w-[815px]"}`}>
            <table className={`text-sm border-collapse table-fixed ${isMobile ? "w-[325px]" : "w-[815px]"}`}>
              <colgroup>
                {isMobile ? (
                  <>
                    <col style={{ width: "110px" }} /> {/* Food */}
                    <col style={{ width: "95px" }} />  {/* Quantity */}
                    <col style={{ width: "70px" }} />  {/* Unit */}
                    <col style={{ width: "50px" }} />  {/* Cal */}
                  </>
                ) : (
                  <>
                    <col style={{ width: "200px" }} /> {/* Food */}
                    <col style={{ width: "130px" }} /> {/* Quantity */}
                    <col style={{ width: "85px" }} />  {/* Unit */}
                    <col style={{ width: "60px" }} />  {/* Cal */}
                    <col style={{ width: "65px" }} />  {/* Protein */}
                    <col style={{ width: "65px" }} />  {/* Carbs */}
                    <col style={{ width: "65px" }} />  {/* Fat */}
                    <col style={{ width: "65px" }} />  {/* Fiber */}
                    <col style={{ width: "80px" }} />  {/* Sugar */}
                  </>
                )}
              </colgroup>
              <tfoot className="text-xs">
                <tr className="bg-muted/30 font-semibold h-[40px]">
                  <td className="px-4 h-[40px] align-middle py-0">Total</td>
                  <td colSpan={2} className="h-[40px] align-middle py-0"></td>
                  {isMobile ? (
                    <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{formatNum(totals.calories, 0)}</td>
                  ) : (
                    <>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{formatNum(totals.calories, 0)}</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-protein tabular-nums">{formatNum(totals.protein)}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-carbs tabular-nums">{formatNum(totals.carbohydrates)}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-fat tabular-nums">{formatNum(totals.fat)}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-fiber tabular-nums">{formatNum(totals.fiber)}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-muted-foreground pr-4 tabular-nums">{formatNum(totals.sugar)}g</td>
                    </>
                  )}
                </tr>
                <tr className="bg-muted/20 text-muted-foreground h-[40px]">
                  <td className="px-4 h-[40px] align-middle py-0">RDA target</td>
                  <td colSpan={2} className="h-[40px] align-middle py-0"></td>
                  {isMobile ? (
                    <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.calories}</td>
                  ) : (
                    <>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.calories}</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.protein}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.carbohydrates}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.fat}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.fiber}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right pr-4 tabular-nums">{rda.sugar}g</td>
                    </>
                  )}
                </tr>
                <tr className="bg-muted/30 font-medium h-[40px]">
                  <td className="px-4 h-[40px] align-middle py-0">% Completed</td>
                  <td colSpan={2} className="h-[40px] align-middle py-0"></td>
                  {isMobile ? (
                    <td className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${pctClass(pct(totals.calories, rda.calories))}`}>{pct(totals.calories, rda.calories)}%</td>
                  ) : (
                    <>
                      {(["calories","protein","carbohydrates","fat","fiber","sugar"] as const).map((k) => {
                        const p = pct(totals[k], (rda as Record<string, number>)[k] ?? 0);
                        return <td key={k} className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${pctClass(p)} ${k === 'sugar' ? 'pr-4' : ''}`}>{p}%</td>;
                      })}
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Bottom Right: Vitamins Scrollable Footer */}
          <div
            ref={bottomScrollRef}
            onScroll={handleBottomScroll}
            className="flex-1 overflow-x-auto scrollbar-hide bg-card"
          >
            <table className="text-sm border-collapse table-fixed" style={{ width: `${(isMobile ? 340 : 0) + 30 * 65 + 50}px` }}>
              <colgroup>
                {isMobile && (
                  <>
                    <col style={{ width: "65px" }} />  {/* Protein */}
                    <col style={{ width: "65px" }} />  {/* Carbs */}
                    <col style={{ width: "65px" }} />  {/* Fat */}
                    <col style={{ width: "65px" }} />  {/* Fiber */}
                    <col style={{ width: "80px" }} />  {/* Sugar */}
                  </>
                )}
                {MICRO_COLS.map((c) => (
                  <col key={c.key} style={{ width: "65px" }} />
                ))}
                <col style={{ width: "50px" }} />
              </colgroup>
              <tfoot className="text-xs">
                <tr className="bg-muted/30 font-semibold h-[40px]">
                  {isMobile && (
                    <>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-protein tabular-nums">{formatNum(totals.protein)}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-carbs tabular-nums">{formatNum(totals.carbohydrates)}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-fat tabular-nums">{formatNum(totals.fat)}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-fiber tabular-nums">{formatNum(totals.fiber)}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right text-muted-foreground pr-4 tabular-nums">{formatNum(totals.sugar)}g</td>
                    </>
                  )}
                  {MICRO_COLS.map((c, idx) => (
                    <td key={c.key} className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${(idx === 0 && !isMobile) ? "pl-4" : ""}`}>{formatNum(totals[c.key])}</td>
                  ))}
                  <td className="px-4 h-[40px] align-middle py-0"></td>
                </tr>
                <tr className="bg-muted/20 text-muted-foreground h-[40px]">
                  {isMobile && (
                    <>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.protein}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.carbohydrates}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.fat}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right tabular-nums">{rda.fiber}g</td>
                      <td className="px-2 h-[40px] align-middle py-0 text-right pr-4 tabular-nums">{rda.sugar}g</td>
                    </>
                  )}
                  {MICRO_COLS.map((c, idx) => (
                    <td key={c.key} className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${(idx === 0 && !isMobile) ? "pl-4" : ""}`}>
                      {formatNum((rda as Record<string, number>)[c.key] ?? 0)}
                    </td>
                  ))}
                  <td className="px-4 h-[40px] align-middle py-0"></td>
                </tr>
                <tr className="bg-muted/30 font-medium h-[40px]">
                  {isMobile && (
                    <>
                      {(["protein","carbohydrates","fat","fiber","sugar"] as const).map((k) => {
                        const p = pct(totals[k], (rda as Record<string, number>)[k] ?? 0);
                        return <td key={k} className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${pctClass(p)} ${k === 'sugar' ? 'pr-4' : ''}`}>{p}%</td>;
                      })}
                    </>
                  )}
                  {MICRO_COLS.map((c, idx) => {
                    const p = pct(totals[c.key], (rda as Record<string, number>)[c.key] ?? 0);
                    return <td key={c.key} className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${pctClass(p)} ${(idx === 0 && !isMobile) ? "pl-4" : ""}`}>{p}%</td>;
                  })}
                  <td className="px-4 h-[40px] align-middle py-0"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
