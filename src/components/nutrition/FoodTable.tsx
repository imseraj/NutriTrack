import { useState, Fragment, useRef, useEffect } from "react";
import { useNutrition } from "@/context/NutritionContext";
import { Unit } from "@/data/foods";
import { calcNutrition, DetailNutrientKey, formatNum, SelectedUnit, sumNutrition, SelectedFood } from "@/lib/nutrition";
import { orderMealItems } from "@/lib/mealGroups";
import { MealWrapControls } from "@/components/nutrition/MealWrapControls";
import { Trash2, Plus, Minus, X, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";

type NutrientCol = { key: DetailNutrientKey; label: string; unit: string };
const DETAIL_COLS: NutrientCol[] = [
  { key: "saturatedFat", label: "Sat. fat", unit: "g" },
  { key: "monounsaturatedFat", label: "Mono fat", unit: "g" },
  { key: "polyunsaturatedFat", label: "Poly fat", unit: "g" },
  { key: "omega3Ala", label: "ALA", unit: "g" },
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
  { key: "choline", label: "Choline", unit: "mg" },
  { key: "calcium", label: "Calcium", unit: "mg" },
  { key: "phosphorus", label: "Phosph.", unit: "mg" },
  { key: "magnesium", label: "Magnes.", unit: "mg" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "potassium", label: "Potass.", unit: "mg" },
  { key: "chloride", label: "Chloride", unit: "mg" },
  { key: "iron", label: "Iron", unit: "mg" },
  { key: "zinc", label: "Zinc", unit: "mg" },
  { key: "iodine", label: "Iodine", unit: "μg" },
  { key: "selenium", label: "Selenium", unit: "μg" },
  { key: "copper", label: "Copper", unit: "mg" },
  { key: "manganese", label: "Mangan.", unit: "mg" },
  { key: "molybdenum", label: "Molybd.", unit: "μg" },
  { key: "cholesterol", label: "Cholest.", unit: "mg" },
];

function sliderRange(unit: SelectedUnit): { min: number; max: number; step: number } {
  if (unit === "pieces" || unit === "bowl" || unit === "serving" || unit === "portion") return { min: 0, max: 10, step: 0.5 };
  if (unit === "kg") return { min: 0, max: 2, step: 0.05 };
  return { min: 0, max: 500, step: 5 }; // g, ml
}

const UNITS: Unit[] = ["g", "kg", "ml", "pieces", "bowl", "serving"];

export function FoodTable() {
  const { selected, updateItem, removeItem, recentQuantities, clearAll, rda, logDay, totals, plateBusy } = useNutrition();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const ordered = orderMealItems(selected);
  const hasGroups = selected.some((item) => item.mealGroup);
  const unlogged = selected.filter((item) => !item.loggedDate);

  const handleLogDay = async () => {
    try {
      await logDay();
      const kcal = Math.round(sumNutrition(unlogged).calories);
      toast({
        title: "Calories logged",
        description: `Added ${kcal} kcal to history. Previously logged foods were not added again.`,
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
  const fixedWidth = (isMobile ? 325 : 815) + (hasGroups ? 36 : 0);
  const groupEdges = (index: number) => ({
    first: !!ordered[index].mealGroup && ordered[index - 1]?.mealGroup?.id !== ordered[index].mealGroup?.id,
    last: !!ordered[index].mealGroup && ordered[index + 1]?.mealGroup?.id !== ordered[index].mealGroup?.id,
  });
  const rowClass = (index: number) => {
    const { first, last } = groupEdges(index);
    return ordered[index].mealGroup
      ? `bg-secondary/10 cursor-pointer ${first ? "border-t border-t-primary/50" : ""} ${last && !expanded[ordered[index].uid] ? "border-b border-b-primary/50" : ""}`
      : "";
  };
  const rowHeight = (item: SelectedFood) => item.mealGroup &&
    ordered.filter((member) => member.mealGroup?.id === item.mealGroup?.id).length === 1 && !expanded[item.uid] ? 96 : 56;
  const openGroup = (event: React.MouseEvent, item: SelectedFood) => {
    if (item.mealGroup && !(event.target as HTMLElement).closest("button, input, select, [role=slider]")) {
      setActiveGroupId(item.mealGroup.id);
    }
  };

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
      <div className="flex flex-wrap gap-3 items-center justify-between p-4 border-b border-border/60">
        <div>
          <h3 className="font-semibold">Selected Foods</h3>
          <p className="text-xs text-muted-foreground">{selected.length} items · edit quantities to recalc nutrition</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={plateBusy || unlogged.length === 0}
            onClick={handleLogDay}
            className="text-xs font-semibold text-primary-foreground hover:opacity-90 flex items-center gap-1.5 gradient-primary disabled:opacity-50 disabled:pointer-events-none px-3.5 py-1.5 rounded-xl transition-all shadow-glow"
          >
            <Check className="h-3.5 w-3.5" /> Add Today's Calories
          </button>

          <MealWrapControls activeGroupId={activeGroupId} onClose={() => setActiveGroupId(null)}
            deleteGroupId={deleteGroupId} onDeleteClose={() => setDeleteGroupId(null)} />

          <button disabled={plateBusy} onClick={clearAll} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> Clear all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
      <div className="flex flex-col text-sm bg-card rounded-2xl overflow-hidden border border-border/40" style={{ minWidth: fixedWidth + 100 }}>
        {/* TOP SECTION: Headers and Food Rows */}
        <div className="flex items-stretch">
          {/* Top Left: Macros & Inputs (Fixed) */}
          <div className="flex-shrink-0 bg-card z-10 flex flex-col justify-between border-r border-border/40" style={{ width: fixedWidth }}>
            <table className="text-sm border-collapse table-fixed w-full">
              <colgroup>
                {[...(hasGroups ? [36] : []), ...(isMobile ? [110, 95, 70, 50] : [200, 130, 85, 60, 65, 65, 65, 65, 80])].map((width, index) => (
                  <col key={`${width}-${index}`} style={{ width: `${width}px` }} />
                ))}
              </colgroup>
              <thead>
                <tr className="text-xs text-muted-foreground bg-muted/40 h-[52px]">
                  {hasGroups && <th aria-label="Meal" />}
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
                  {ordered.map((item, index) => {
                    const n = calcNutrition(item.food, item.quantity, item.unit, item.portion);
                    const step = item.unit === "pieces" || item.unit === "bowl" || item.unit === "serving" || item.unit === "portion" ? 0.5 : 10;
                    const portionOptions = item.food.portions ?? [];
                    const unitSelectValue = item.unit === "portion" && item.portion
                      ? `portion:${item.portion.id}`
                      : item.unit;
                    const handleUnitChange = (value: string) => {
                      const portionId = value.startsWith("portion:") ? value.slice("portion:".length) : null;
                      const portion = portionId ? portionOptions.find((option) => option.id === portionId) : undefined;
                      if (portion) {
                        updateItem(item.uid, { unit: "portion", quantity: 1, portion });
                      } else {
                        const quantity = item.unit === "portion" && item.portion
                          ? item.quantity * item.portion.gramWeight
                          : item.quantity;
                        updateItem(item.uid, { unit: value as Unit, quantity });
                      }
                    };
                    const incBy = (delta: number) => updateItem(item.uid, { quantity: Math.max(0, +(item.quantity + delta).toFixed(2)) });
                    return (
                      <Fragment key={item.uid}>
                        <motion.tr
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                          onMouseEnter={() => setHoveredUid(item.uid)}
                          onMouseLeave={() => setHoveredUid(null)}
                          onClick={(event) => openGroup(event, item)}
                          style={{ height: rowHeight(item) }}
                          className={`border-t border-border/40 transition-colors h-[56px] ${rowClass(index)} ${hoveredUid === item.uid ? "bg-secondary/40" : ""}`}
                        >
                          {hasGroups && (groupEdges(index).first ? (
                            <td rowSpan={ordered.filter((member) => member.mealGroup?.id === item.mealGroup?.id)
                              .reduce((count, member) => count + 1 + (expanded[member.uid] ? 1 : 0), 0)}
                              className="relative border border-primary/50 bg-secondary/20 align-middle text-center">
                              <div className="absolute inset-0 flex flex-col items-center gap-1 py-1 overflow-hidden">
                                <button aria-label={`Delete ${item.mealGroup!.name}`} title={`Delete ${item.mealGroup!.name}`} disabled={plateBusy}
                                  onClick={() => setDeleteGroupId(item.mealGroup!.id)}
                                  className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setActiveGroupId(item.mealGroup!.id)}
                                  aria-label={`Actions for ${item.mealGroup!.name}`}
                                  className="text-xs font-semibold text-primary min-h-0 flex-1 max-h-40 truncate"
                                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                                  {item.mealGroup!.name}{item.loggedDate ? " · Logged" : ""}
                                </button>
                              </div>
                            </td>
                          ) : !item.mealGroup ? <td /> : null)}
                          <td className="px-2 h-[56px] align-middle py-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button aria-label={`Adjust portion for ${item.food.name}`} onClick={() => toggle(item.uid)}
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
                              <button disabled={plateBusy || !!item.loggedDate} onClick={() => incBy(-step)} className={`${isMobile ? "h-6 w-6" : "h-7 w-7"} grid place-items-center rounded-lg bg-secondary hover:bg-muted disabled:opacity-40`}>
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <input disabled={plateBusy || !!item.loggedDate} type="number" min={0} step={0.1} value={item.quantity}
                                onChange={(e) => updateItem(item.uid, { quantity: parseFloat(e.target.value) || 0 })}
                                className={`${isMobile ? "w-10 h-7 text-xs px-1" : "w-16 h-8 px-2 text-sm"} rounded-lg bg-background border border-border text-center outline-none focus:border-primary`} />
                              <button disabled={plateBusy || !!item.loggedDate} onClick={() => incBy(step)} className={`${isMobile ? "h-6 w-6" : "h-7 w-7"} grid place-items-center rounded-lg bg-secondary hover:bg-muted disabled:opacity-40`}>
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          {isMobile ? (
                            <>
                              <td className="px-1 h-[56px] align-middle py-0">
                                <select disabled={plateBusy || !!item.loggedDate} value={unitSelectValue} onChange={(e) => handleUnitChange(e.target.value)}
                                  title={item.portion ? `${item.portion.label} (${item.portion.gramWeight} g)` : item.food.servingSize}
                                  className="h-7 w-full max-w-[60px] min-w-0 truncate overflow-hidden text-ellipsis whitespace-nowrap px-1 rounded-lg bg-background border border-border text-[10px] outline-none focus:border-primary">
                                  <option value={item.food.baseUnit}>{item.food.baseUnit}</option>
                                  {portionOptions.map((portion) => (
                                    <option key={portion.id} value={`portion:${portion.id}`} title={`${portion.label} (${portion.gramWeight} g)`}>
                                      {portion.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-2 h-[56px] align-middle py-0 text-right font-semibold">{formatNum(n.calories, 0)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 h-[56px] align-middle py-0">
                                <select disabled={plateBusy || !!item.loggedDate} value={unitSelectValue} onChange={(e) => handleUnitChange(e.target.value)}
                                  title={item.portion ? `${item.portion.label} (${item.portion.gramWeight} g)` : item.food.servingSize}
                                  className="h-8 w-[68px] max-w-[68px] min-w-0 truncate overflow-hidden text-ellipsis whitespace-nowrap px-1 rounded-lg bg-background border border-border text-xs outline-none focus:border-primary">
                                  <option value={item.food.baseUnit}>{item.food.baseUnit}</option>
                                  {portionOptions.map((portion) => (
                                    <option key={portion.id} value={`portion:${portion.id}`} title={`${portion.label} (${portion.gramWeight} g)`}>
                                      {portion.label}
                                    </option>
                                  ))}
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
                                className={`bg-secondary/20 border-t border-border/30 h-[92px] ${groupEdges(index).last ? "border-b border-b-primary/50" : ""}`}>
                                {hasGroups && !item.mealGroup && <td />}
                                <td colSpan={isMobile ? 4 : 9} className="px-6 py-3 h-[92px] align-middle">
                                  <div className="flex items-center gap-4">
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                      Adjust portion
                                    </div>
                                    <Slider
                                      disabled={plateBusy || !!item.loggedDate}
                                      value={[item.quantity]}
                                      min={r.min}
                                      max={sliderMax}
                                      step={r.step}
                                      onValueChange={(v) => updateItem(item.uid, { quantity: +v[0].toFixed(2) })}
                                      className="flex-1"
                                    />
                                    <div className="text-sm font-semibold tabular-nums whitespace-nowrap min-w-[80px] text-right">
                                      {formatNum(item.quantity)} {item.unit === "portion" ? item.portion?.label ?? "portion" : item.unit}
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
            <table className="text-sm border-collapse table-fixed" style={{ width: `${(isMobile ? 340 : 0) + DETAIL_COLS.length * 65 + 50}px` }}>
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
                {DETAIL_COLS.map((c) => (
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
                  {DETAIL_COLS.map((c, idx) => (
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
                  {ordered.map((item, index) => {
                    const n = calcNutrition(item.food, item.quantity, item.unit, item.portion);
                    return (
                      <Fragment key={item.uid}>
                        <motion.tr
                          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }}
                          onMouseEnter={() => setHoveredUid(item.uid)}
                          onMouseLeave={() => setHoveredUid(null)}
                          onClick={(event) => openGroup(event, item)}
                          style={{ height: rowHeight(item) }}
                          className={`border-t border-border/40 transition-colors h-[56px] ${rowClass(index)} ${hoveredUid === item.uid ? "bg-secondary/40" : ""}`}
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
                          {DETAIL_COLS.map((c, idx) => (
                            <td key={c.key} className={`px-2 h-[56px] align-middle py-0 text-right tabular-nums ${(idx === 0 && !isMobile) ? "pl-4" : ""}`}>{formatNum(n[c.key])}</td>
                          ))}
                          <td className={`px-4 h-[56px] align-middle py-0 text-center ${item.mealGroup ? "border-r border-r-primary/50" : ""}`}>
                            <button disabled={plateBusy || !!item.loggedDate} aria-label={`Remove ${item.food.name}`} onClick={() => removeItem(item.uid)} className="h-7 w-7 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </motion.tr>

                        <AnimatePresence initial={false}>
                          {expanded[item.uid] && (
                            <motion.tr key={item.uid + "-exp"}
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className={`bg-secondary/20 border-t border-border/30 h-[92px] ${groupEdges(index).last ? "border-b border-b-primary/50" : ""} ${item.mealGroup ? "border-r border-r-primary/50" : ""}`}>
                              <td colSpan={(isMobile ? 5 : 0) + DETAIL_COLS.length + 1} className="h-[92px]"></td>
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
          <div className="flex-shrink-0 bg-card z-10 border-r border-border/40" style={{ width: fixedWidth }}>
            <table className="text-sm border-collapse table-fixed w-full">
              <colgroup>
                {[...(hasGroups ? [36] : []), ...(isMobile ? [110, 95, 70, 50] : [200, 130, 85, 60, 65, 65, 65, 65, 80])].map((width, index) => (
                  <col key={`${width}-${index}`} style={{ width: `${width}px` }} />
                ))}
              </colgroup>
              <tfoot className="text-xs">
                <tr className="bg-muted/30 font-semibold h-[40px]">
                  {hasGroups && <td />}
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
                  {hasGroups && <td />}
                  <td className="px-4 h-[40px] align-middle py-0">Target / limit</td>
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
                  {hasGroups && <td />}
                  <td className="px-4 h-[40px] align-middle py-0">% Completed</td>
                  <td colSpan={2} className="h-[40px] align-middle py-0"></td>
                  {isMobile ? (
                    <td className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${pctClass(pct(totals.calories, rda.calories))}`}>{pct(totals.calories, rda.calories)}%</td>
                  ) : (
                    <>
                      {(["calories", "protein", "carbohydrates", "fat", "fiber", "sugar"] as const).map((k) => {
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
            <table className="text-sm border-collapse table-fixed" style={{ width: `${(isMobile ? 340 : 0) + DETAIL_COLS.length * 65 + 50}px` }}>
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
                {DETAIL_COLS.map((c) => (
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
                  {DETAIL_COLS.map((c, idx) => (
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
                  {DETAIL_COLS.map((c, idx) => (
                    <td key={c.key} className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${(idx === 0 && !isMobile) ? "pl-4" : ""}`}>
                      {((rda as Record<string, number>)[c.key] ?? 0) > 0
                        ? `${formatNum((rda as Record<string, number>)[c.key])}${c.key === "saturatedFat" ? " max" : ""}`
                        : "—"}
                    </td>
                  ))}
                  <td className="px-4 h-[40px] align-middle py-0"></td>
                </tr>
                <tr className="bg-muted/30 font-medium h-[40px]">
                  {isMobile && (
                    <>
                      {(["protein", "carbohydrates", "fat", "fiber", "sugar"] as const).map((k) => {
                        const p = pct(totals[k], (rda as Record<string, number>)[k] ?? 0);
                        return <td key={k} className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${pctClass(p)} ${k === 'sugar' ? 'pr-4' : ''}`}>{p}%</td>;
                      })}
                    </>
                  )}
                  {DETAIL_COLS.map((c, idx) => {
                    const target = (rda as Record<string, number>)[c.key] ?? 0;
                    const p = target > 0 ? pct(totals[c.key], target) : null;
                    const overLimit = c.key === "saturatedFat" && p !== null && p > 100;
                    return <td key={c.key} className={`px-2 h-[40px] align-middle py-0 text-right tabular-nums ${overLimit ? "text-destructive" : p === null ? "text-muted-foreground" : pctClass(p)} ${(idx === 0 && !isMobile) ? "pl-4" : ""}`}>{p === null ? "—" : `${p}%`}</td>;
                  })}
                  <td className="px-4 h-[40px] align-middle py-0"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
