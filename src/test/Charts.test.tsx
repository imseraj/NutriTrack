import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { User } from "firebase/auth";
import { RDA_DEFAULT } from "@/data/foods";
import { emptyTotals } from "@/lib/nutrition";
import { useNutrition } from "@/context/NutritionContext";
import { MacroPie, MicroBarChart, MacroTargetChart } from "@/components/nutrition/Charts";
import { WeightHistoryChart } from "@/components/nutrition/WeightHistoryChart";

vi.mock("@/context/NutritionContext", () => ({
  useNutrition: vi.fn(),
}));

vi.mock("recharts", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  const Data = ({ data, children }: { data: unknown; children?: ReactNode }) => (
    <div data-testid="chart-data" data-values={JSON.stringify(data)}>{children}</div>
  );
  const Empty = () => null;
  return {
    ResponsiveContainer: Container,
    BarChart: Data,
    LineChart: Data,
    Line: Empty,
    PieChart: Container,
    Pie: Data,
    Bar: Container,
    CartesianGrid: Empty,
    XAxis: Empty,
    YAxis: Empty,
    Legend: Empty,
    Cell: Empty,
    Tooltip: ({ formatter }: { formatter: (value: number) => ReactNode }) => (
      <div data-testid="tooltip">{formatter(8.549999999999999)}</div>
    ),
  };
});

afterEach(cleanup);

function setNutrition(totals = emptyTotals(), rda = { ...RDA_DEFAULT }) {
  const nutrition = {
    totals,
    rda,
  } as ReturnType<typeof useNutrition>;
  vi.mocked(useNutrition).mockReturnValue(nutrition);
  return nutrition;
}

describe("plate nutrition charts", () => {
  it("shows the same uncapped micronutrient percentage as the plate", () => {
    setNutrition({ ...emptyTotals(), vitaminC: 228.3 }, { ...RDA_DEFAULT, vitaminC: 90 });
    render(<MicroBarChart />);

    const data = JSON.parse(screen.getByTestId("chart-data").getAttribute("data-values")!);
    expect(data.find((item: { name: string }) => item.name === "Vit C").pct).toBe(254);
  });

  it("keeps micronutrient coverage finite when a target is zero", () => {
    setNutrition({ ...emptyTotals(), vitaminC: 228.3 }, { ...RDA_DEFAULT, vitaminC: 0 });
    render(<MicroBarChart />);

    const data = JSON.parse(screen.getByTestId("chart-data").getAttribute("data-values")!);
    expect(data.find((item: { name: string }) => item.name === "Vit C").pct).toBe(0);
  });

  it("shows plate grams alongside estimated macro calorie shares and rounded tooltips", () => {
    setNutrition({ ...emptyTotals(), calories: 68, protein: 2.55, carbohydrates: 14.32, fat: 0.95 });
    render(<MacroPie />);

    expect(screen.getByText("2.5 g")).toBeInTheDocument();
    expect(screen.getByText("14.3 g")).toBeInTheDocument();
    expect(screen.getByText("0.9 g")).toBeInTheDocument();
    expect(screen.getByText("11% of macro calories")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip")).toHaveTextContent("8.5 kcal (11%)");
    const data = JSON.parse(screen.getByTestId("chart-data").getAttribute("data-values")!);
    expect(data.find((item: { name: string }) => item.name === "Fat").value).toBeCloseTo(8.55);
    expect(screen.getByText(/estimate can differ/)).toBeInTheDocument();
  });

  it("shows zero shares for an empty plate instead of invalid percentages", () => {
    setNutrition();
    render(<MacroPie />);

    expect(screen.getAllByText("0% of macro calories")).toHaveLength(3);
    expect(screen.getAllByText("0.0 g")).toHaveLength(3);
  });

  it("compares current plate macro grams against daily targets without calorie conversion", () => {
    setNutrition({ ...emptyTotals(), protein: 25, carbohydrates: 40, fat: 12 });
    const { rerender } = render(<MacroTargetChart />);
    const getData = () => JSON.parse(screen.getByTestId("chart-data").getAttribute("data-values")!);
    expect(getData()).toEqual([
      { name: "Protein", consumed: 25, target: RDA_DEFAULT.protein },
      { name: "Carbs", consumed: 40, target: RDA_DEFAULT.carbohydrates },
      { name: "Fat", consumed: 12, target: RDA_DEFAULT.fat },
    ]);
    setNutrition({ ...emptyTotals(), protein: 50 });
    rerender(<MacroTargetChart />);
    expect(getData()[0].consumed).toBe(50);
  });
});

describe("weight history chart", () => {
  function setup() {
    const saveWeightEntry = vi.fn().mockResolvedValue(undefined);
    const user: User = {
      uid: "user-1", providerId: "firebase", email: null, displayName: null,
      phoneNumber: null, photoURL: null, emailVerified: false, isAnonymous: false,
      tenantId: null, refreshToken: "", metadata: {}, providerData: [],
      delete: vi.fn(), reload: vi.fn(), getIdToken: vi.fn(),
      getIdTokenResult: vi.fn(), toJSON: () => ({}),
    };
    const nutrition = setNutrition();
    vi.mocked(useNutrition).mockReturnValue({
      ...nutrition,
      user,
      weightHistory: [{ date: "2026-01-01", weight: 72 }, { date: "2026-01-02", weight: 71.5 }],
      saveWeightEntry,
    });
    render(<WeightHistoryChart />);
    return saveWeightEntry;
  }

  it("shows progress and preloads existing entries for editing", async () => {
    const saveWeightEntry = setup();
    expect(screen.getByText(/Latest: 71.5 kg/)).toHaveTextContent("Change since 2026-01-01: -0.50 kg");
    fireEvent.click(screen.getByRole("button", { name: "Add / Modify" }));
    expect(screen.getByLabelText("Date")).toHaveValue("2026-01-02");
    expect(screen.getByLabelText("Weight (kg)")).toHaveValue(71.5);
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "71.2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Weight" }));
    await waitFor(() => expect(saveWeightEntry).toHaveBeenCalledWith("2026-01-02", 71.2));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("clears the weight for a new date and saves a dated measurement", async () => {
    const saveWeightEntry = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add / Modify" }));
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-01-03" } });
    expect(screen.getByLabelText("Weight (kg)")).toHaveValue(null);
    fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "71" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Weight" }));
    await waitFor(() => expect(saveWeightEntry).toHaveBeenCalledWith("2026-01-03", 71));
  });

  it("keeps the editor open when saving fails", async () => {
    const saveWeightEntry = setup();
    saveWeightEntry.mockRejectedValueOnce(new Error("Network unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      fireEvent.click(screen.getByRole("button", { name: "Add / Modify" }));
      fireEvent.click(screen.getByRole("button", { name: "Save Weight" }));
      await waitFor(() => expect(log).toHaveBeenCalled());
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Weight" })).not.toBeDisabled();
    } finally {
      log.mockRestore();
    }
  });

  it("shows an empty state and requires sign-in", () => {
    const nutrition = setNutrition();
    vi.mocked(useNutrition).mockReturnValue({
      ...nutrition, weightHistory: [], user: null,
    });
    render(<WeightHistoryChart />);
    expect(screen.getByText("Sign in to track your weight")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add / Modify" })).toBeDisabled();
  });
});
