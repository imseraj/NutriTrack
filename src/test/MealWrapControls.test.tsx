import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RDA_DEFAULT } from "@/data/foods";
import { useNutrition } from "@/context/NutritionContext";
import { SelectedFood, sumNutrition } from "@/lib/nutrition";
import { FoodTable } from "@/components/nutrition/FoodTable";
import { MealWrapControls } from "@/components/nutrition/MealWrapControls";

const { mockNutrition } = vi.hoisted(() => ({ mockNutrition: vi.fn() }));
vi.mock("@/context/NutritionContext", () => ({ useNutrition: mockNutrition }));
afterEach(cleanup);

const item: SelectedFood = {
  uid: "item-1", quantity: 100, unit: "g", mealGroup: { id: "breakfast", name: "Breakfast" },
  food: {
    id: "rice", name: "Rice", category: "Grain", emoji: "", baseQuantity: 100, baseUnit: "g", servingSize: "100 g",
    nutrition: { calories: 130, macros: { protein: 3, carbohydrates: 28, fat: 1, fiber: 1, sugar: 0 }, micros: {} },
  },
};

function setup(items: SelectedFood[] = [item]) {
  const nutrition = {
    selected: items, totals: sumNutrition(items), rda: RDA_DEFAULT,
    plateBusy: false, recentQuantities: [], updateItem: vi.fn(), removeItem: vi.fn(), clearAll: vi.fn(), logDay: vi.fn(),
    wrapMeal: vi.fn().mockResolvedValue(undefined), unwrapMeal: vi.fn().mockResolvedValue(undefined),
    deleteWrappedMeal: vi.fn().mockResolvedValue(undefined), logWrappedMeal: vi.fn().mockResolvedValue(undefined),
    saveMeal: vi.fn().mockResolvedValue(undefined), setAddingToMeal: vi.fn(),
  } satisfies Partial<ReturnType<typeof useNutrition>>;
  mockNutrition.mockReturnValue(nutrition);
  return nutrition;
}

describe("wrapped meal controls", () => {
  it("replaces top-level save with wrap and prompts for a name", async () => {
    const nutrition = setup([{ ...item, mealGroup: undefined }]);
    render(<FoodTable />);
    expect(screen.queryByRole("button", { name: "Save as Meal" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Wrap as Meal" }));
    fireEvent.change(screen.getByLabelText("Meal name"), { target: { value: "Lunch" } });
    fireEvent.click(screen.getByRole("button", { name: "Wrap Meal" }));
    await waitFor(() => expect(nutrition.wrapMeal).toHaveBeenCalledWith("Lunch"));
  });

  it("shows a vertical label, red delete icon, and all four actions in a blurred overlay", () => {
    setup();
    render(<FoodTable />);
    const label = screen.getByRole("button", { name: "Actions for Breakfast" });
    expect(label).toHaveStyle({ writingMode: "vertical-rl" });
    expect(screen.getByRole("button", { name: "Delete Breakfast" }).className).toContain("text-red-400");
    fireEvent.click(label);
    for (const name of ["Unwrap", "Add food", "Add to Calories", "Save as Meal"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(document.querySelector(".backdrop-blur-md")).toBeInTheDocument();
  });

  it("targets the wrap when Add food is clicked", () => {
    const nutrition = setup();
    const onClose = vi.fn();
    render(<MealWrapControls activeGroupId="breakfast" onClose={onClose} deleteGroupId={null} onDeleteClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Add food" }));
    expect(nutrition.setAddingToMeal).toHaveBeenCalledWith("breakfast");
    expect(onClose).toHaveBeenCalled();
  });

  it("confirms deletion before removing a wrap and its foods", async () => {
    const nutrition = setup();
    render(<FoodTable />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Breakfast" }));
    expect(nutrition.deleteWrappedMeal).not.toHaveBeenCalled();
    expect(screen.getByText(/Recorded calories and saved meal templates will not be deleted/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete meal" }));
    await waitFor(() => expect(nutrition.deleteWrappedMeal).toHaveBeenCalledWith("breakfast"));
  });

  it("locks logged foods and disables repeat logging or adding into a logged wrap", () => {
    setup([{ ...item, loggedDate: "2026-01-01" }]);
    render(<FoodTable />);
    expect(screen.getByRole("spinbutton")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add Today's Calories" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Actions for Breakfast" }));
    expect(screen.getByRole("button", { name: "Add food" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Already logged" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save as Meal" })).not.toBeDisabled();
  });

  it("saves only the chosen group and does not log or unwrap it", async () => {
    const nutrition = setup([item, { ...item, uid: "item-2", mealGroup: undefined }]);
    render(<MealWrapControls activeGroupId="breakfast" onClose={vi.fn()} deleteGroupId={null} onDeleteClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save as Meal" }));
    await waitFor(() => expect(nutrition.saveMeal).toHaveBeenCalledWith("Breakfast", [item]));
    expect(nutrition.logWrappedMeal).not.toHaveBeenCalled();
    expect(nutrition.unwrapMeal).not.toHaveBeenCalled();
  });
});
