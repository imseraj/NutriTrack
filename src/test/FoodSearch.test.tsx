import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FoodSearch } from "@/components/nutrition/FoodSearch";
import { searchFoodDataCentral } from "@/lib/foodDataCentral";

vi.mock("@/context/NutritionContext", () => ({
  useNutrition: () => ({
    recentFoods: [], customFoods: [], savedMeals: [], globalFoods: [],
    selected: [], addingToMeal: null, setAddingToMeal: vi.fn(), plateBusy: false,
    addFood: vi.fn(), loadMealToPlate: vi.fn(),
  }),
}));

vi.mock("@/lib/foodDataCentral", () => ({
  searchFoodDataCentral: vi.fn(),
  getFoodDataCentralDetails: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(searchFoodDataCentral).mockReset();
  vi.mocked(searchFoodDataCentral).mockResolvedValue([]);
});
afterEach(cleanup);

describe("food search guidance", () => {
  it("provides an accessible search tip and clickable preparation examples", async () => {
    render(<FoodSearch />);
    const input = screen.getByRole("textbox", { name: "Search foods" });
    expect(input).toHaveAccessibleDescription(/comma-separated keywords/);
    expect(screen.queryByText("Popular searches:")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fruit" })).not.toBeInTheDocument();
    expect(input).toHaveAttribute("placeholder", "Try rice, white, cooked or chicken, breast...");
    fireEvent.click(screen.getByRole("button", { name: "rice, white, cooked" }));
    expect(input).toHaveValue("rice, white, cooked");
    expect(input).toHaveFocus();
    await waitFor(() => expect(searchFoodDataCentral).toHaveBeenCalledWith("rice, white, cooked", "SR Legacy"));
  });

  it("keeps a plain-language query unchanged until the user chooses the comma retry", async () => {
    render(<FoodSearch />);
    const input = screen.getByRole("textbox", { name: "Search foods" });
    fireEvent.change(input, { target: { value: "white rice" } });
    await waitFor(() => expect(searchFoodDataCentral).toHaveBeenCalledWith("white rice", "SR Legacy"));
    expect(input).toHaveValue("white rice");
    fireEvent.click(screen.getByRole("button", { name: 'Search for "white, rice"' }));
    expect(input).toHaveValue("white, rice");
    await waitFor(() => expect(searchFoodDataCentral).toHaveBeenCalledWith("white, rice", "SR Legacy"));
    expect(screen.queryByRole("button", { name: /^Search for "/ })).not.toBeInTheDocument();
  });

  it("does not suggest commas for a single keyword or an already comma-separated query", async () => {
    render(<FoodSearch />);
    const input = screen.getByRole("textbox", { name: "Search foods" });
    fireEvent.change(input, { target: { value: "rice" } });
    await waitFor(() => expect(searchFoodDataCentral).toHaveBeenCalledWith("rice", "SR Legacy"));
    expect(screen.queryByRole("button", { name: /^Search for "/ })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "rice, white" } });
    await waitFor(() => expect(searchFoodDataCentral).toHaveBeenCalledWith("rice, white", "SR Legacy"));
    expect(screen.queryByRole("button", { name: /^Search for "/ })).not.toBeInTheDocument();
  });
});
