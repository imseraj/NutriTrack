import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CustomFoodForm } from "./CustomFoodForm";

interface CustomFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomFoodDialog({ open, onOpenChange }: CustomFoodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-semibold text-primary">
            Create Custom Food
          </DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <CustomFoodForm
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
