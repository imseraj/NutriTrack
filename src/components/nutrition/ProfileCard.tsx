import { useNutrition } from "@/context/NutritionContext";
import { User } from "lucide-react";

export function ProfileCard() {
  const { profile, setProfile } = useNutrition();
  const inputCls = "w-full h-9 px-3 rounded-lg bg-background border border-border outline-none focus:border-primary text-sm";
  const showPregLact = profile.gender === "female" && profile.age >= 14 && profile.age <= 50;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
          <User className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold">Your Profile</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Age</span>
          <input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Gender</span>
          <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value as "male" | "female", isPregnant: false, isLactating: false })} className={inputCls}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Weight (kg)</span>
          <input type="number" value={profile.weight} onChange={(e) => setProfile({ ...profile, weight: parseFloat(e.target.value) || 0 })} className={inputCls} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Height (cm)</span>
          <input type="number" value={profile.height} onChange={(e) => setProfile({ ...profile, height: parseFloat(e.target.value) || 0 })} className={inputCls} />
        </label>
        <label className="space-y-1 col-span-2">
          <span className="text-xs text-muted-foreground">Activity level</span>
          <select value={profile.activityLevel} onChange={(e) => setProfile({ ...profile, activityLevel: parseFloat(e.target.value) as 1.2 | 1.375 | 1.55 | 1.725 | 1.9 })} className={inputCls}>
            <option value={1.2}>Sedentary (little/no exercise)</option>
            <option value={1.375}>Lightly active (1-3 days/wk)</option>
            <option value={1.55}>Moderately active (3-5 days/wk)</option>
            <option value={1.725}>Very active (6-7 days/wk)</option>
            <option value={1.9}>Extra active (physical job + training)</option>
          </select>
        </label>
        <label className="space-y-1 col-span-2">
          <span className="text-xs text-muted-foreground">Goal</span>
          <select value={profile.goal} onChange={(e) => setProfile({ ...profile, goal: e.target.value as "maintain" | "lose" | "gain" | "muscle_gain" })} className={inputCls}>
            <option value="maintain">Maintain</option>
            <option value="lose">Lose weight</option>
            <option value="gain">Gain weight</option>
            <option value="muscle_gain">Build muscle</option>
          </select>
        </label>
        {showPregLact && (
          <div className="col-span-2 flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!profile.isPregnant} onChange={(e) => setProfile({ ...profile, isPregnant: e.target.checked, isLactating: e.target.checked ? false : profile.isLactating })} />
              Pregnant
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!!profile.isLactating} onChange={(e) => setProfile({ ...profile, isLactating: e.target.checked, isPregnant: e.target.checked ? false : profile.isPregnant })} />
              Lactating
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
