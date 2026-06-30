import { useState } from "react";
import { useNutrition } from "@/context/NutritionContext";
import { Droplet, Plus, RefreshCw, Sparkles, CupSoda } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

export function WaterTracker() {
  const { waterIntake, waterGoal, addWater, resetWater, setWaterGoal } = useNutrition();
  const [customAmount, setCustomAmount] = useState("");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(waterGoal.toString());

  const pct = Math.min(100, Math.round((waterIntake / waterGoal) * 100)) || 0;

  // Wave height controls (from bottom to top)
  const waveHeight = `${100 - pct}%`;

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(customAmount);
    if (amt && amt > 0) {
      addWater(amt);
      setCustomAmount("");
      toast({
        title: "Logged Hydration",
        description: `Added ${amt}ml of water to your daily log.`,
      });
    }
  };

  const handleSaveGoal = () => {
    const goalVal = parseInt(newGoal);
    if (goalVal && goalVal > 0) {
      setWaterGoal(goalVal);
      setIsEditingGoal(false);
      toast({
        title: "Goal Updated",
        description: `Your daily water goal is now ${goalVal}ml.`,
      });
    }
  };

  return (
    <div className="bento-tile p-6 flex flex-col justify-between relative overflow-hidden h-full min-h-[340px]">
      <div className="flex justify-between items-start z-10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-accent font-semibold">Hydration</p>
          <h3 className="font-display font-semibold text-primary text-xl mt-0.5">Water Intake</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Keep your performance optimized</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditingGoal ? (
            <div className="flex items-center gap-1.5 bg-background border border-border p-1 rounded-xl">
              <Input
                type="number"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="w-16 h-7 text-xs border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-center"
              />
              <button
                onClick={handleSaveGoal}
                className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] rounded-lg font-bold hover:opacity-90 transition-opacity"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingGoal(true)}
              className="text-[10px] text-accent hover:text-primary transition-colors font-semibold"
            >
              Goal: {waterGoal}ml
            </button>
          )}
          
          <button
            onClick={() => {
              resetWater();
              toast({ title: "Reset", description: "Water intake reset for today." });
            }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
            title="Reset log"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Center visual: SVG Water glass with wave effect */}
      <div className="relative flex justify-center py-5 z-10">
        <div className="relative w-36 h-48 border-4 border-muted rounded-b-[2rem] rounded-t-lg overflow-hidden shadow-card bg-secondary/20 flex flex-col justify-end">
          {/* SVG liquid fill with wave */}
          <motion.div
            animate={{
              y: waveHeight,
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-x-0 bottom-0 top-0 pointer-events-none"
          >
            <div className="relative w-full h-full bg-gradient-to-t from-blue-500/80 to-sky-400/90">
              {/* Wave SVG elements moving horizontally via CSS */}
              <svg
                className="absolute left-0 w-[200%] h-12 fill-sky-400/90 -top-8 animate-wave"
                viewBox="0 0 120 28"
                preserveAspectRatio="none"
              >
                <path d="M0 15 Q 30 0, 60 15 T 120 15 T 180 15 T 240 15 L 240 28 L 0 28 Z" />
              </svg>
              <svg
                className="absolute left-0 w-[200%] h-12 fill-blue-500/30 -top-8 animate-wave-slow opacity-60"
                viewBox="0 0 120 28"
                preserveAspectRatio="none"
              >
                <path d="M0 10 Q 30 20, 60 10 T 120 10 T 180 10 T 240 10 L 240 28 L 0 28 Z" />
              </svg>
            </div>
          </motion.div>

          {/* Centered Percentage Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <span className="text-3xl font-display font-bold mix-blend-difference text-white select-none tabular-nums">
              {pct}%
            </span>
            <span className="text-[10px] font-semibold mix-blend-difference text-white/80 select-none tracking-widest uppercase mt-0.5">
              {waterIntake} / {waterGoal}ml
            </span>
          </div>
        </div>
      </div>

      {/* Bottom controls: Logging buttons */}
      <div className="space-y-3 z-10">
        <div className="flex gap-2">
          {[
            { label: "Glass", amount: 250, emoji: "🥛" },
            { label: "Bottle", amount: 500, emoji: "🥤" },
            { label: "Shaker", amount: 750, emoji: "🫙" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                addWater(item.amount);
                toast({
                  title: "Water Added",
                  description: `+${item.amount}ml logged via ${item.label}.`,
                });
              }}
              className="flex-1 h-11 rounded-xl bg-secondary hover:bg-muted text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-border/40"
            >
              <span>{item.emoji}</span>
              <span>+{item.amount}ml</span>
            </button>
          ))}
        </div>

        {/* Custom entry form */}
        <form onSubmit={handleCustomAdd} className="flex gap-2">
          <Input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Custom amount (ml)..."
            className="h-9 px-3 rounded-lg text-xs"
          />
          <button
            type="submit"
            disabled={!customAmount}
            className="px-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Log
          </button>
        </form>
      </div>

      {/* Styled background blur */}
      <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-sky-200/15 rounded-full blur-3xl pointer-events-none" />

      {/* Style overrides for moving wave */}
      <style>{`
        @keyframes wave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave-slow {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-wave {
          animation: wave 12s linear infinite;
        }
        .animate-wave-slow {
          animation: wave-slow 18s linear infinite;
        }
      `}</style>
    </div>
  );
}
