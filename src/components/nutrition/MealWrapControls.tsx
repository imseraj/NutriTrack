import { useState } from "react";
import { Bookmark, Check, Package, Plus, UnfoldVertical } from "lucide-react";
import { useNutrition } from "@/context/NutritionContext";
import { sumNutrition } from "@/lib/nutrition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Props {
  activeGroupId: string | null;
  onClose: () => void;
  deleteGroupId: string | null;
  onDeleteClose: () => void;
}

export function MealWrapControls({ activeGroupId, onClose, deleteGroupId, onDeleteClose }: Props) {
  const { selected, wrapMeal, unwrapMeal, deleteWrappedMeal, logWrappedMeal, saveMeal, setAddingToMeal, plateBusy } = useNutrition();
  const [wrapOpen, setWrapOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const unwrapped = selected.filter((item) => !item.mealGroup && !item.loggedDate);
  const members = selected.filter((item) => item.mealGroup?.id === activeGroupId);
  const group = members[0]?.mealGroup;
  const logged = members.some((item) => item.loggedDate);
  const deleting = selected.find((item) => item.mealGroup?.id === deleteGroupId)?.mealGroup;
  const busy = pending || plateBusy;

  const perform = async (action: () => Promise<void>, success: string, close: () => void) => {
    if (busy) return;
    setPending(true);
    try {
      await action();
      toast({ title: success });
      close();
    } catch (error) {
      console.error("Meal action failed:", error);
      toast({ title: "Unable to update meal", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Dialog open={wrapOpen} onOpenChange={(open) => {
        if (busy) return;
        if (open) setName("");
        setWrapOpen(open);
      }}>
        <DialogTrigger asChild>
          <button disabled={busy || unwrapped.length === 0} className="text-xs font-semibold text-primary flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none px-3 py-1.5 rounded-xl border border-border/20">
            <Package className="h-3.5 w-3.5" /> Wrap as Meal
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md rounded-3xl" overlayClassName="bg-background/50 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle>Wrap foods as a meal</DialogTitle>
            <DialogDescription>Combine all {unwrapped.length} unwrapped, unlogged foods into a named meal. Existing wraps stay unchanged. Wrapping does not log calories or save a template.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => {
            event.preventDefault();
            void perform(() => wrapMeal(name), "Meal wrapped", () => setWrapOpen(false));
          }} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wrap-meal-name">Meal name</Label>
              <Input id="wrap-meal-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Breakfast" disabled={busy} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setWrapOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy || !name.trim()}>Wrap Meal</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!group} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
        <DialogContent className="sm:max-w-lg rounded-3xl" overlayClassName="bg-background/50 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle>{group?.name}</DialogTitle>
            <DialogDescription>
              {members.length} foods · {Math.round(sumNutrition(members).calories)} kcal
              {logged ? ` · Logged ${members.find((item) => item.loggedDate)?.loggedDate}. Foods are read-only; unwrapping or deleting does not remove recorded calories.` : " · Choose an action for this meal."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" disabled={busy} onClick={() => {
              if (group) void perform(() => unwrapMeal(group.id), "Meal unwrapped", onClose);
            }}><UnfoldVertical className="h-4 w-4 mr-2" /> Unwrap</Button>
            <Button variant="outline" disabled={busy || logged} onClick={() => {
              if (group) {
                setAddingToMeal(group.id);
                onClose();
              }
            }}><Plus className="h-4 w-4 mr-2" /> Add food</Button>
            <Button disabled={busy || logged} onClick={() => {
              if (group) void perform(() => logWrappedMeal(group.id), "Meal added to calories", onClose);
            }}><Check className="h-4 w-4 mr-2" /> {logged ? "Already logged" : "Add to Calories"}</Button>
            <Button variant="outline" disabled={busy} onClick={() => {
              if (group) void perform(() => saveMeal(group.name, members), "Meal saved to your library", onClose);
            }}><Bookmark className="h-4 w-4 mr-2" /> Save as Meal</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !busy) onDeleteClose(); }}>
        <DialogContent className="sm:max-w-md rounded-3xl" overlayClassName="bg-background/50 backdrop-blur-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>This removes the wrap and all its foods from your plate. Recorded calories and saved meal templates will not be deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={busy} onClick={onDeleteClose}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={() => {
              if (deleting) void perform(() => deleteWrappedMeal(deleting.id), "Meal removed from plate", onDeleteClose);
            }}>Delete meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
