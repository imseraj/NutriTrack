import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Scale, Pencil } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNutrition } from "@/context/NutritionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export function WeightHistoryChart() {
  const { weightHistory, saveWeightEntry, user } = useNutrition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const first = weightHistory[0];
  const latest = weightHistory[weightHistory.length - 1];
  const change = first && latest ? latest.weight - first.weight : 0;

  const selectDate = (nextDate: string) => {
    setDate(nextDate);
    const entry = weightHistory.find((item) => item.date === nextDate);
    setWeight(entry ? String(entry.weight) : "");
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-accent/20 grid place-items-center">
            <Scale className="h-4 w-4 text-accent" />
          </div>
          <h3 className="font-semibold">Weight History &amp; Progress</h3>
        </div>
        <Dialog open={open} onOpenChange={(nextOpen) => {
          if (saving) return;
          if (nextOpen) selectDate(latest?.date ?? today);
          setOpen(nextOpen);
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!user} className="rounded-xl gap-1.5">
              <Pencil className="h-3 w-3" /> Add / Modify
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Add / Modify Weight</DialogTitle>
              <DialogDescription>Save one weight per date. This does not change your profile weight or nutrition targets.</DialogDescription>
            </DialogHeader>
            <form onSubmit={async (event) => {
              event.preventDefault();
              if (saving) return;
              setSaving(true);
              try {
                await saveWeightEntry(date, Number(weight));
                toast({ title: "Weight saved", description: `Weight for ${date} saved as ${Number(weight)} kg.` });
                setOpen(false);
              } catch (error) {
                console.error("Failed to save weight entry:", error);
                toast({
                  title: "Unable to save weight",
                  description: error instanceof Error ? error.message : "Please try again.",
                  variant: "destructive",
                });
              } finally {
                setSaving(false);
              }
            }} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="weight-date">Date</Label>
                <Input id="weight-date" type="date" required max={today} value={date} onChange={(event) => selectDate(event.target.value)} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight-kg">Weight (kg)</Label>
                <Input id="weight-kg" type="number" required min="0.01" step="any" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="e.g. 70.5" disabled={saving} />
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Weight"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="h-44">
        {weightHistory.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            {user ? "Add your first weight entry to track progress" : "Sign in to track your weight"}
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={weightHistory} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickFormatter={(value: string) => format(parseISO(value), "dd MMM yy")} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis unit=" kg" domain={["auto", "auto"]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                formatter={(value: number) => `${value} kg`}
              />
              <Line dataKey="weight" name="Weight" type="linear" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {latest && first && (
        <p className="text-xs text-muted-foreground mt-3">
          Latest: {latest.weight} kg · {weightHistory.length > 1
            ? `Change since ${first.date}: ${change > 0 ? "+" : ""}${change.toFixed(2)} kg`
            : "Add another dated entry to see your progress"}
        </p>
      )}
    </div>
  );
}
