import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { Food } from "@/data/foods";
import { NutritionProvider, useNutrition } from "@/context/NutritionContext";
import { mealTemplateItems, orderMealItems } from "@/lib/mealGroups";
import { SelectedFood, sumNutrition } from "@/lib/nutrition";
import { format } from "date-fns";

type Document = Record<string, unknown>;
interface Transaction {
  get: (path: string) => Promise<{ data: () => Document | undefined }>;
  set: (path: string, value: Document, options?: { merge: boolean }) => void;
}

const backend = vi.hoisted(() => ({
  authListener: undefined as ((user: unknown) => void) | undefined,
  documents: new Map<string, Document>(),
  transaction: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ auth: {}, db: {}, isFirebaseConfigured: true }));
vi.mock("firebase/auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/auth")>(),
  onAuthStateChanged: (_auth: unknown, callback: (user: unknown) => void) => {
    backend.authListener = callback;
    return vi.fn();
  },
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  collection: (_db: unknown, ...parts: string[]) => parts.join("/"),
  getDoc: vi.fn().mockResolvedValue({ exists: () => true }),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: backend.setDoc,
  onSnapshot: vi.fn((path: string, callback: (snapshot: unknown) => void) => {
    if (path.endsWith("/profile/settings")) {
      callback({ exists: () => true, data: () => backend.documents.get(path) });
    }
    return vi.fn();
  }),
  runTransaction: backend.transaction,
}));

const food: Food = {
  id: "rice", name: "Rice", category: "Grain", emoji: "", baseQuantity: 100, baseUnit: "g", servingSize: "100 g",
  nutrition: { calories: 130, macros: { protein: 3, carbohydrates: 28, fat: 1, fiber: 1, sugar: 0 }, micros: {} },
};
const settings = "users/user-1/profile/settings";
const wrapper = ({ children }: { children: ReactNode }) => <NutritionProvider>{children}</NutritionProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  backend.documents.clear();
  backend.documents.set(settings, { selected: [] });
  backend.setDoc.mockImplementation(async (path: string, value: Document) => backend.documents.set(path, value));
  backend.transaction.mockImplementation(async (_db: unknown, action: (transaction: Transaction) => Promise<unknown>) => {
    const pending = new Map(backend.documents);
    const result = await action({
      get: async (path) => ({ data: () => pending.get(path) }),
      set: (path, value, options) => pending.set(path, options?.merge ? { ...pending.get(path), ...value } : value),
    });
    backend.documents = pending;
    return result;
  });
});
afterEach(cleanup);

async function setup() {
  const hook = renderHook(() => useNutrition(), { wrapper });
  await act(async () => backend.authListener?.({
    uid: "user-1", getIdTokenResult: async () => ({ claims: { admin: true } }),
  }));
  return hook;
}

async function rejects(action: () => Promise<unknown>, message: string) {
  await act(async () => { await expect(action()).rejects.toThrow(message); });
}

describe("meal wrapping and logging", () => {
  it("wraps only unwrapped foods, allows duplicates across wraps, and preserves quantities", async () => {
    const { result } = await setup();
    await act(async () => result.current.addFood(food));
    await rejects(() => result.current.addFood(food), "already here");
    await act(async () => result.current.wrapMeal("Breakfast"));
    const breakfast = result.current.selected[0].mealGroup!;
    await act(async () => result.current.addFood(food, null));
    await act(async () => result.current.wrapMeal("Lunch"));
    expect(result.current.selected.map((item) => item.mealGroup?.name)).toEqual(["Breakfast", "Lunch"]);
    expect(new Set(result.current.selected.map((item) => item.uid)).size).toBe(2);
    expect(sumNutrition(result.current.selected).calories).toBe(260);
    await act(async () => result.current.unwrapMeal(breakfast.id));
    expect(result.current.selected[0].mealGroup).toBeUndefined();
    expect(result.current.selected[0].quantity).toBe(100);
    expect(result.current.selected[1].mealGroup?.name).toBe("Lunch");
    expect(backend.documents.get(settings)?.selected).toEqual(result.current.selected);
  });

  it("adds into the requested wrap, rejects missing targets, and keeps totals independent", async () => {
    const { result } = await setup();
    await act(async () => result.current.addFood(food));
    await act(async () => result.current.wrapMeal("Breakfast"));
    const group = result.current.selected[0].mealGroup!;
    await act(async () => result.current.addFood({ ...food, id: "egg", name: "Egg" }, group.id));
    expect(result.current.selected.every((item) => item.mealGroup?.id === group.id)).toBe(true);
    await rejects(() => result.current.addFood(food, "missing"), "no longer");
    expect(result.current.selected).toHaveLength(2);
  });

  it("logs a wrap and its markers atomically, skips it in whole-plate logging, and preserves logs on delete", async () => {
    const { result } = await setup();
    await act(async () => result.current.addFood(food));
    await act(async () => result.current.wrapMeal("Breakfast"));
    const id = result.current.selected[0].mealGroup!.id;
    const logPath = `users/user-1/daily_logs/${format(new Date(), "yyyy-MM-dd")}`;
    await act(async () => result.current.logWrappedMeal(id));
    expect(result.current.selected[0].loggedDate).toBeTruthy();
    await rejects(() => result.current.logWrappedMeal(id), "already been logged");
    await rejects(() => result.current.addFood({ ...food, id: "egg" }, id), "cannot be edited");
    await act(async () => result.current.addFood(food, null));
    await act(async () => result.current.logDay());
    expect(backend.documents.get(logPath)?.totals).toMatchObject({ calories: 260 });
    expect(backend.documents.get(logPath)?.itemCount).toBe(2);
    await act(async () => result.current.unwrapMeal(id));
    expect(result.current.selected[0].loggedDate).toBeTruthy();
    await rejects(() => result.current.logDay(), "already been logged");
    // Restore the wrap in the stored plate to exercise deletion without removing its log.
    backend.documents.set(settings, { selected: [{ ...result.current.selected[0], mealGroup: { id, name: "Breakfast" } }] });
    await act(async () => result.current.deleteWrappedMeal(id));
    expect(result.current.selected).toEqual([]);
    expect(backend.documents.get(logPath)?.totals).toMatchObject({ calories: 260 });
  });

  it("does not mark foods logged when the transaction fails", async () => {
    const { result } = await setup();
    await act(async () => result.current.addFood(food));
    backend.transaction.mockRejectedValueOnce(new Error("Network error"));
    await rejects(() => result.current.logWrappedMeal(), "Network error");
    expect(result.current.selected[0].loggedDate).toBeUndefined();
    expect(result.current.plateBusy).toBe(false);
    expect([...backend.documents.keys()]).toEqual([settings]);
  });

  it("rechecks persisted markers rather than trusting stale local state", async () => {
    const { result } = await setup();
    await act(async () => result.current.addFood(food));
    backend.documents.set(settings, { selected: result.current.selected.map((item) => ({ ...item, loggedDate: "2026-01-01" })) });
    await rejects(() => result.current.logWrappedMeal(), "already been logged");
    expect([...backend.documents.keys()]).toEqual([settings]);
  });

  it("restores wrapped foods and logged markers from account settings on reload", async () => {
    const first = await setup();
    await act(async () => first.result.current.addFood(food));
    await act(async () => first.result.current.wrapMeal("Breakfast"));
    await act(async () => first.result.current.logWrappedMeal());
    first.unmount();
    const restored = await setup();
    expect(restored.result.current.selected[0].mealGroup?.name).toBe("Breakfast");
    expect(restored.result.current.selected[0].loggedDate).toBeTruthy();
    await rejects(() => restored.result.current.logWrappedMeal(), "already been logged");
  });

  it("saves only requested wrap items without logged metadata and appends reusable templates", async () => {
    const { result } = await setup();
    await act(async () => result.current.addFood(food));
    await act(async () => result.current.wrapMeal("Breakfast"));
    await act(async () => result.current.logWrappedMeal());
    await act(async () => result.current.saveMeal("Usual breakfast", result.current.selected));
    const template = [...backend.documents.values()].find((value) => value.name === "Usual breakfast")!;
    const items = template.items as SelectedFood[];
    expect(items[0].mealGroup).toBeUndefined();
    expect(items[0].loggedDate).toBeUndefined();
    await act(async () => result.current.loadMealToPlate({
      id: "saved-1", name: "Usual breakfast", items, savedAt: "2026-01-01",
    }, null));
    expect(result.current.selected).toHaveLength(2);
    expect(result.current.selected[1].loggedDate).toBeUndefined();
    expect(result.current.selected[1].mealGroup?.name).toBe("Usual breakfast");
    expect(result.current.selected[1].uid).not.toBe(items[0].uid);
  });
});

describe("meal group presentation", () => {
  it("places scattered unwrapped foods below all wraps while preserving relative order", () => {
    const base: SelectedFood = { uid: "loose-1", food, quantity: 100, unit: "g" };
    const items: SelectedFood[] = [
      base,
      { ...base, uid: "a-1", mealGroup: { id: "a", name: "Breakfast" } },
      { ...base, uid: "loose-2" },
      { ...base, uid: "b-1", mealGroup: { id: "b", name: "Lunch" } },
      { ...base, uid: "a-2", mealGroup: { id: "a", name: "Breakfast" } },
      { ...base, uid: "loose-3", loggedDate: "2026-01-01" },
    ];
    expect(orderMealItems(items).map((item) => item.uid)).toEqual([
      "a-1", "a-2", "b-1", "loose-1", "loose-2", "loose-3",
    ]);
    expect(sumNutrition(orderMealItems(items))).toEqual(sumNutrition(items));

    const afterUnwrap = items.map((item) => {
      if (item.mealGroup?.id !== "a") return item;
      const { mealGroup, ...unwrapped } = item;
      return unwrapped;
    });
    expect(orderMealItems(afterUnwrap).map((item) => item.uid)).toEqual([
      "b-1", "loose-1", "a-1", "loose-2", "a-2", "loose-3",
    ]);
    expect(orderMealItems([])).toEqual([]);
    expect(orderMealItems([base])).toEqual([base]);
  });

  it("keeps all members contiguous without changing totals or the source array", () => {
    const base: SelectedFood = { uid: "1", food, quantity: 100, unit: "g", mealGroup: { id: "a", name: "Breakfast" } };
    const items = [base, { ...base, uid: "2", mealGroup: undefined }, { ...base, uid: "3" }];
    expect(orderMealItems(items).map((item) => item.uid)).toEqual(["1", "3", "2"]);
    expect(items.map((item) => item.uid)).toEqual(["1", "2", "3"]);
    expect(sumNutrition(orderMealItems(items))).toEqual(sumNutrition(items));
    expect(mealTemplateItems([{ ...base, loggedDate: "2026-01-01" }])[0]).not.toHaveProperty("loggedDate");
  });
});
