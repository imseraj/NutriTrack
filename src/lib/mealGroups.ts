import { SelectedFood, sumNutrition } from "@/lib/nutrition";

export function mealTemplateItems(items: SelectedFood[]): SelectedFood[] {
  return items.map(({ mealGroup, loggedDate, ...item }) => item);
}

export function orderMealItems(items: SelectedFood[]): SelectedFood[] {
  const groups = new Map<string, SelectedFood[]>();
  const unwrapped: SelectedFood[] = [];
  for (const item of items) {
    if (!item.mealGroup) {
      unwrapped.push(item);
    } else {
      let group = groups.get(item.mealGroup.id);
      if (!group) {
        group = [];
        groups.set(item.mealGroup.id, group);
      }
      group.push(item);
    }
  }
  return [...Array.from(groups.values()).flat(), ...unwrapped];
}

export function wrapMealItems(items: SelectedFood[], id: string, name: string): SelectedFood[] {
  if (!name.trim()) throw new Error("Enter a meal name.");
  if (!items.some((item) => !item.mealGroup && !item.loggedDate)) {
    throw new Error("Add unwrapped foods before wrapping a meal.");
  }
  return items.map((item) => item.mealGroup || item.loggedDate
    ? item : { ...item, mealGroup: { id, name: name.trim() } });
}

export function unloggedMealItems(items: SelectedFood[], groupId?: string): SelectedFood[] {
  const eligible = items.filter((item) => !item.loggedDate && (!groupId || item.mealGroup?.id === groupId));
  if (eligible.length === 0) throw new Error("These foods have already been logged, or there are no foods to log.");
  return eligible;
}

export function addToDailyEntry(
  existing: { totals: ReturnType<typeof sumNutrition>; itemCount: number } | undefined,
  totals: ReturnType<typeof sumNutrition>,
  count: number,
  date: string,
) {
  const merged = { ...totals };
  for (const key of Object.keys(merged) as (keyof typeof merged)[]) {
    merged[key] += existing?.totals[key] ?? 0;
  }
  return { date, totals: merged, itemCount: (existing?.itemCount ?? 0) + count };
}
