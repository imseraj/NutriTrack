import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SelectedFood, calcNutrition, formatNum, NutritionTotals, MICRO_KEYS, sumNutrition } from "@/lib/nutrition";
import { RDA } from "@/data/foods";

interface ExportArgs {
  selected: SelectedFood[];
  totals: NutritionTotals;
  rda: RDA;
  profile: { age: number; gender: string; weight: number; goal: string };
}

const MICRO_COLS: { key: typeof MICRO_KEYS[number]; label: string; unit: string }[] = [
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
  { key: "calcium", label: "Ca", unit: "mg" },
  { key: "phosphorus", label: "P", unit: "mg" },
  { key: "magnesium", label: "Mg", unit: "mg" },
  { key: "sodium", label: "Na", unit: "mg" },
  { key: "potassium", label: "K", unit: "mg" },
  { key: "chloride", label: "Cl", unit: "mg" },
  { key: "sulfur", label: "S", unit: "mg" },
  { key: "iron", label: "Fe", unit: "mg" },
  { key: "zinc", label: "Zn", unit: "mg" },
  { key: "iodine", label: "I", unit: "μg" },
  { key: "selenium", label: "Se", unit: "μg" },
  { key: "copper", label: "Cu", unit: "mg" },
  { key: "manganese", label: "Mn", unit: "mg" },
  { key: "fluoride", label: "F", unit: "mg" },
  { key: "chromium", label: "Cr", unit: "μg" },
  { key: "molybdenum", label: "Mo", unit: "μg" },
  { key: "cobalt", label: "Co", unit: "μg" },
];

export function exportPDF({ selected, totals: _totals, rda, profile }: ExportArgs) {
  // A3 landscape gives enough width for ~40 columns
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(34, 161, 110);
  doc.rect(0, 0, pageWidth, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.text("NutriTrack — Nutrition Report", 10, 12);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 10, 18);

  doc.setTextColor(20);
  doc.setFontSize(10);
  doc.text(
    `Profile: ${profile.gender}, ${profile.age}y, ${profile.weight}kg — Goal: ${profile.goal}`,
    10,
    30
  );

  const macroCols = [
    { label: "Cal", key: "calories", unit: "" },
    { label: "Protein", key: "protein", unit: "g" },
    { label: "Carbs", key: "carbohydrates", unit: "g" },
    { label: "Fat", key: "fat", unit: "g" },
    { label: "Fiber", key: "fiber", unit: "g" },
    { label: "Sugar", key: "sugar", unit: "g" },
  ] as const;

  const head = [
    [
      "Food",
      "Qty",
      "Unit",
      ...macroCols.map((c) => `${c.label}${c.unit ? ` (${c.unit})` : ""}`),
      ...MICRO_COLS.map((c) => `${c.label}\n${c.unit}`),
    ],
  ];

  const body: (string | number)[][] = selected.map((it) => {
    const n = calcNutrition(it.food, it.quantity, it.unit) as Record<string, number>;
    return [
      it.food.name,
      String(it.quantity),
      it.unit,
      formatNum(n.calories, 0),
      formatNum(n.protein),
      formatNum(n.carbohydrates),
      formatNum(n.fat),
      formatNum(n.fiber),
      formatNum(n.sugar),
      ...MICRO_COLS.map((c) => formatNum(n[c.key] ?? 0)),
    ];
  });

  const totals = sumNutrition(selected) as Record<string, number>;
  const rdaRec = rda as unknown as Record<string, number>;
  const pct = (g: number, t: number) => (t > 0 ? `${Math.round((g / t) * 100)}%` : "—");

  const totalRow: (string | number)[] = [
    "Total",
    "",
    "",
    formatNum(totals.calories, 0),
    formatNum(totals.protein),
    formatNum(totals.carbohydrates),
    formatNum(totals.fat),
    formatNum(totals.fiber),
    formatNum(totals.sugar),
    ...MICRO_COLS.map((c) => formatNum(totals[c.key] ?? 0)),
  ];
  const rdaRow: (string | number)[] = [
    "RDA",
    "",
    "",
    String(rdaRec.calories ?? "—"),
    String(rdaRec.protein ?? "—"),
    String(rdaRec.carbohydrates ?? "—"),
    String(rdaRec.fat ?? "—"),
    String(rdaRec.fiber ?? "—"),
    String(rdaRec.sugar ?? "—"),
    ...MICRO_COLS.map((c) => String(rdaRec[c.key] ?? "—")),
  ];
  const pctRow: (string | number)[] = [
    "% Completed",
    "",
    "",
    pct(totals.calories, rdaRec.calories ?? 0),
    pct(totals.protein, rdaRec.protein ?? 0),
    pct(totals.carbohydrates, rdaRec.carbohydrates ?? 0),
    pct(totals.fat, rdaRec.fat ?? 0),
    pct(totals.fiber, rdaRec.fiber ?? 0),
    pct(totals.sugar, rdaRec.sugar ?? 0),
    ...MICRO_COLS.map((c) => pct(totals[c.key] ?? 0, rdaRec[c.key] ?? 0)),
  ];

  autoTable(doc, {
    startY: 36,
    head,
    body,
    foot: [totalRow, rdaRow, pctRow],
    headStyles: { fillColor: [34, 161, 110], fontSize: 7, halign: "center" },
    footStyles: { fillColor: [240, 240, 240], textColor: 20, fontSize: 7, fontStyle: "bold" },
    styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 32, halign: "left" },
      1: { cellWidth: 10, halign: "right" },
      2: { cellWidth: 12, halign: "center" },
    },
    margin: { left: 6, right: 6 },
    tableWidth: "auto",
  });

  doc.save(`nutritrack-${new Date().toISOString().slice(0, 10)}.pdf`);
}
