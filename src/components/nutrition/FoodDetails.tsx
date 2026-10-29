import { useEffect, useMemo, useState } from "react";
import { Food, FoodMicros } from "@/data/foods";
import { useNutrition } from "@/context/NutritionContext";
import { calcNutrition, DetailNutrientKey, MICRO_KEYS, SelectedFood } from "@/lib/nutrition";
import { FdcFoodDetails, getFoodDataCentralFullDetails } from "@/lib/foodDataCentral";
import { Loader2 } from "lucide-react";

const GROUPS = [
  "Energy",
  "General composition",
  "Lipids",
  "Vitamins",
  "Minerals",
  "Protein and amino acids",
  "Other nutrients",
] as const;

type NutrientGroup = typeof GROUPS[number];

function nutrientGroup(name: string): NutrientGroup {
  const value = name.toLowerCase();
  if (value.includes("energy")) return "Energy";
  if (/fatty acid|cholesterol|lipid|saturated|monounsaturated|polyunsaturated|linolenic|linoleic|oleic/.test(value)) return "Lipids";
  if (/vitamin|thiamin|riboflavin|niacin|folate|folic|biotin|pantothenic|choline/.test(value)) return "Vitamins";
  if (/calcium|iron|magnesium|phosphorus|potassium|sodium|zinc|selenium|copper|manganese|iodine|chloride|molybdenum/.test(value)) return "Minerals";
  if (/protein|amino acid|alanine|arginine|aspartic|cystine|glutamic|glycine|histidine|isoleucine|leucine|lysine|methionine|phenylalanine|proline|serine|threonine|tryptophan|tyrosine|valine|hydroxyproline/.test(value)) return "Protein and amino acids";
  if (/carbohydrate|fiber|fibre|sugar|starch|water|moisture|ash|alcohol|caffeine|theobromine/.test(value)) return "General composition";
  return "Other nutrients";
}

function localNutrientRows(food: Food): Array<{ name: string; value: number; unit: string }> {
  const rows: Array<{ name: string; value: number; unit: string }> = [
    { name: "Energy", value: food.nutrition.calories, unit: "kcal" },
    { name: "Protein", value: food.nutrition.macros.protein, unit: "g" },
    { name: "Carbohydrate", value: food.nutrition.macros.carbohydrates, unit: "g" },
    { name: "Total fat", value: food.nutrition.macros.fat, unit: "g" },
    { name: "Fiber", value: food.nutrition.macros.fiber, unit: "g" },
    { name: "Total sugars", value: food.nutrition.macros.sugar, unit: "g" },
    { name: "Saturated fat", value: food.nutrition.macros.saturatedFat ?? 0, unit: "g" },
    { name: "Monounsaturated fat", value: food.nutrition.macros.monounsaturatedFat ?? 0, unit: "g" },
    { name: "Polyunsaturated fat", value: food.nutrition.macros.polyunsaturatedFat ?? 0, unit: "g" },
    { name: "ALA omega-3", value: food.nutrition.macros.omega3Ala ?? 0, unit: "g" },
  ];
  if (food.nutrition.cholesterol !== undefined) {
    rows.push({ name: "Cholesterol", value: food.nutrition.cholesterol, unit: "mg" });
  }

  const labels: Partial<Record<keyof FoodMicros, string>> = {
    vitaminA: "Vitamin A", vitaminD: "Vitamin D", vitaminE: "Vitamin E", vitaminK: "Vitamin K",
    vitaminC: "Vitamin C", vitaminB1: "Vitamin B1 (Thiamin)", vitaminB2: "Vitamin B2 (Riboflavin)",
    vitaminB3: "Vitamin B3 (Niacin)", vitaminB5: "Vitamin B5 (Pantothenic acid)", vitaminB6: "Vitamin B6",
    vitaminB7: "Vitamin B7 (Biotin)", vitaminB9: "Vitamin B9 (Folate)", vitaminB12: "Vitamin B12",
    choline: "Choline", calcium: "Calcium", phosphorus: "Phosphorus", magnesium: "Magnesium",
    sodium: "Sodium", potassium: "Potassium", chloride: "Chloride", iron: "Iron", zinc: "Zinc",
    iodine: "Iodine", selenium: "Selenium", copper: "Copper", manganese: "Manganese", molybdenum: "Molybdenum",
  };
  const units: Partial<Record<keyof FoodMicros, string>> = {
    vitaminA: "ug", vitaminD: "ug", vitaminE: "mg", vitaminK: "ug", vitaminC: "mg",
    vitaminB1: "mg", vitaminB2: "mg", vitaminB3: "mg", vitaminB5: "mg", vitaminB6: "mg",
    vitaminB7: "ug", vitaminB9: "ug", vitaminB12: "ug", choline: "mg", calcium: "mg",
    phosphorus: "mg", magnesium: "mg", sodium: "mg", potassium: "mg", chloride: "mg",
    iron: "mg", zinc: "mg", iodine: "ug", selenium: "ug", copper: "mg", manganese: "mg", molybdenum: "ug",
  };
  for (const key of MICRO_KEYS) {
    const value = food.nutrition.micros[key];
    if (value !== undefined) rows.push({ name: labels[key] ?? key, value, unit: units[key] ?? "" });
  }
  return rows;
}

function Amount({ value, unit }: { value?: number; unit?: string }) {
  if (value === undefined || !Number.isFinite(value)) return <span className="text-muted-foreground">Not reported</span>;
  return <span className="tabular-nums">{value.toLocaleString(undefined, { maximumFractionDigits: 4 })}{unit ? ` ${unit}` : ""}</span>;
}

function DataRows({ rows }: { rows: Array<{ name: string; value?: number; unit?: string; text?: string }> }) {
  return (
    <dl className="divide-y divide-border/40">
      {rows.map((row, index) => (
        <div key={`${row.name}-${index}`} className="flex items-baseline justify-between gap-4 py-2 text-sm">
          <dt className="text-foreground">{row.name}</dt>
          <dd className="max-w-[65%] text-right text-muted-foreground">
            {row.text ?? <Amount value={row.value} unit={row.unit} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function USDASections({ details }: { details: FdcFoodDetails }) {
  const grouped = new Map<NutrientGroup, Array<{ name: string; value?: number; unit?: string }>>();
  for (const nutrient of details.nutrients) {
    if (!nutrient.nutrientName) continue;
    const group = nutrientGroup(nutrient.nutrientName);
    const rows = grouped.get(group) ?? [];
    rows.push({ name: nutrient.nutrientName, value: nutrient.value, unit: nutrient.unitName });
    grouped.set(group, rows);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {GROUPS.filter((group) => (grouped.get(group)?.length ?? 0) > 0).map((group) => (
        <section key={group} className="border-t border-border/60 pt-3">
          <h3 className="mb-1 text-sm font-semibold text-primary">{group}</h3>
          <DataRows rows={grouped.get(group) ?? []} />
        </section>
      ))}
      {!!details.portions.length && (
        <section className="border-t border-border/60 pt-3">
          <h3 className="mb-1 text-sm font-semibold text-primary">USDA portions</h3>
          <DataRows rows={details.portions.map((portion) => ({
            name: portion.label,
            value: portion.gramWeight,
            unit: "g",
          }))} />
        </section>
      )}
      {!!details.components.length && (
        <section className="border-t border-border/60 pt-3">
          <h3 className="mb-1 text-sm font-semibold text-primary">Food components</h3>
          <DataRows rows={details.components.map((component) => ({
            name: component.name || "Component",
            value: component.gramWeight,
            unit: component.gramWeight === undefined ? undefined : "g",
          }))} />
        </section>
      )}
    </div>
  );
}

export function FoodDetails() {
  const { selected } = useNutrition();
  const [selectedUid, setSelectedUid] = useState("");
  const [details, setDetails] = useState<FdcFoodDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected.length === 0) {
      setSelectedUid("");
      return;
    }
    if (!selected.some((item) => item.uid === selectedUid)) setSelectedUid(selected[0].uid);
  }, [selected, selectedUid]);

  const selectedItem = useMemo<SelectedFood | undefined>(
    () => selected.find((item) => item.uid === selectedUid),
    [selected, selectedUid],
  );
  const fdcId = selectedItem?.food.id.match(/^fdc-(\d+)$/)?.[1];

  useEffect(() => {
    let active = true;
    setDetails(null);
    setError(null);
    if (!fdcId) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    getFoodDataCentralFullDetails(Number(fdcId))
      .then((result) => { if (active) setDetails(result); })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load food details.");
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [fdcId]);

  if (selected.length === 0) {
    return (
      <div className="py-16 text-center">
        <h2 className="font-display text-lg font-semibold text-primary">No foods on your plate</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add a food, then select it here to inspect its data.</p>
      </div>
    );
  }

  const food = selectedItem?.food;
  const currentNutrition = selectedItem
    ? calcNutrition(selectedItem.food, selectedItem.quantity, selectedItem.unit, selectedItem.portion)
    : null;
  const fallbackRows = food ? localNutrientRows(food) : [];
  const reportedNutrientCount = details?.nutrients.length ?? fallbackRows.length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-primary">Food details</h2>
          <p className="mt-1 text-sm text-muted-foreground">Inspect the selected plate item and values reported by its source.</p>
        </div>
        <label className="flex w-full flex-col gap-1 text-xs font-medium text-muted-foreground sm:w-[min(100%,360px)]">
          Selected food
          <select
            value={selectedUid}
            onChange={(event) => setSelectedUid(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            {selected.map((item) => <option key={item.uid} value={item.uid}>{item.food.name}</option>)}
          </select>
        </label>
      </section>

      {food && (
        <>
          <section className="grid grid-cols-1 gap-4 border-b border-border/60 pb-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Food</p>
              <p className="mt-1 text-sm font-medium">{food.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Source</p>
              <p className="mt-1 text-sm">{details?.dataType ?? food.category}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Category</p>
              <p className="mt-1 text-sm">{details?.foodCategory ?? food.category}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">USDA FDC ID</p>
              <p className="mt-1 text-sm tabular-nums">{details?.fdcId ?? "Not a USDA record"}</p>
            </div>
            {details?.brandOwner && <div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Brand owner</p><p className="mt-1 text-sm">{details.brandOwner}</p></div>}
            {details?.gtinUpc && <div><p className="text-[10px] font-semibold uppercase text-muted-foreground">GTIN / UPC</p><p className="mt-1 text-sm tabular-nums">{details.gtinUpc}</p></div>}
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Data basis</p>
              <p className="mt-1 text-sm">{food.servingSize || `${food.baseQuantity} ${food.baseUnit}`}</p>
            </div>
            {details?.publicationDate && <div><p className="text-[10px] font-semibold uppercase text-muted-foreground">Published</p><p className="mt-1 text-sm">{details.publicationDate}</p></div>}
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { label: "Energy", value: currentNutrition?.calories, unit: "kcal" },
              { label: "Protein", value: currentNutrition?.protein, unit: "g" },
              { label: "Carbohydrate", value: currentNutrition?.carbohydrates, unit: "g" },
              { label: "Fat", value: currentNutrition?.fat, unit: "g" },
              { label: "Fiber", value: currentNutrition?.fiber, unit: "g" },
              { label: "Saturated fat", value: currentNutrition?.saturatedFat, unit: "g" },
              { label: "Cholesterol", value: currentNutrition?.cholesterol, unit: "mg" },
            ].map((item) => (
              <div key={item.label} className="border-t border-border/60 pt-2">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">{item.value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"} {item.unit}</p>
              </div>
            ))}
          </section>

          <section className="border-t border-border/60 pt-4">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <h3 className="font-display text-lg font-semibold text-primary">{details ? "USDA nutrient data" : "Food nutrient data"}</h3>
              <span className="text-xs text-muted-foreground">{reportedNutrientCount} reported values</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading USDA details...</div>
            ) : error ? (
              <p role="status" className="py-4 text-sm text-destructive">{error}</p>
            ) : details ? (
              <USDASections details={details} />
            ) : (
              <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                <DataRows rows={fallbackRows.map(({ name, value, unit }) => ({ name, value, unit }))} />
              </div>
            )}
          </section>

          {details?.ingredients && (
            <section className="border-t border-border/60 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-primary">Ingredients</h3>
              <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">{details.ingredients}</p>
            </section>
          )}

          {!!details?.attributes.length && (
            <section className="border-t border-border/60 pt-4">
              <h3 className="mb-2 text-sm font-semibold text-primary">USDA attributes</h3>
              <DataRows rows={details.attributes.map((attribute) => ({
                name: attribute.name,
                  text: attribute.value || attribute.description || "—",
              }))} />
            </section>
          )}

          <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
            USDA only reports nutrients available for this food record. Missing values are not interpreted as zero.
          </p>
        </>
      )}
    </div>
  );
}