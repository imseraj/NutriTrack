import { useState } from "react";
import { Moon, Sun, Leaf, User, Save, LogOut, Loader2, LogIn, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useNutrition } from "@/context/NutritionContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportPDF } from "@/lib/pdf";
import { toast } from "@/hooks/use-toast";
import { AuthDialog } from "@/components/auth/AuthDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  const {
    theme,
    toggleTheme,
    profile,
    setProfile,
    selected,
    totals,
    rda,
    saveMeal,
    user,
    signOut,
    isFirebaseConfigured,
    loading,
    openProfile,
    setOpenProfile
  } = useNutrition();
  const [mealName, setMealName] = useState("");
  const [openSave, setOpenSave] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const handleSaveExport = () => {
    if (selected.length === 0) {
      toast({ title: "No foods to save", description: "Add some foods first." });
      return;
    }
    const name = mealName.trim() || `Meal ${new Date().toLocaleDateString()}`;
    saveMeal(name);
    exportPDF({ selected, totals, rda, profile });
    toast({ title: "Saved & exported", description: `"${name}" saved and PDF downloaded.` });
    setMealName("");
    setOpenSave(false);
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary grid place-items-center shadow-card">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-display font-semibold tracking-tight text-primary block">NutriTrack</span>
            <p className="text-[10px] text-accent -mt-0.5 hidden sm:block uppercase tracking-[0.18em] font-semibold">Track · Learn · Thrive</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* User auth state or guest indicators */}
          {isFirebaseConfigured && (
            loading ? (
              <button className="h-9 px-3 rounded-full bg-secondary flex items-center gap-1.5 text-xs font-medium cursor-wait" disabled>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
              </button>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-9 px-2.5 rounded-full bg-secondary hover:bg-muted flex items-center gap-1.5 text-xs font-medium transition-colors">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
                        {user.email ? user.email.slice(0, 2).toUpperCase() : "US"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline max-w-[100px] truncate">{user.email}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 mt-1">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">
                    Logged in as:<br/>
                    <span className="font-semibold text-primary">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-xs cursor-pointer text-destructive focus:text-destructive gap-2">
                    <LogOut className="h-3.5 w-3.5" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="outline" className="h-9 px-4 rounded-full flex items-center gap-1.5 text-xs font-medium">
                  <LogIn className="h-3.5 w-3.5" /> Log In
                </Button>
              </Link>
            )
          )}

          {/* Profile Dialog */}
          <Dialog open={openProfile} onOpenChange={setOpenProfile}>
            <DialogTrigger asChild>
              <button className="h-9 px-3 rounded-full bg-secondary hover:bg-muted flex items-center gap-1.5 text-xs font-medium transition-colors">
                <User className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Profile</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Your Profile</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm pt-2">
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Age</span>
                  <Input type="number" value={profile.age || ""} placeholder="e.g. 25"
                    onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Gender</span>
                  <select value={profile.gender}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value as "male" | "female", isPregnant: false, isLactating: false })}
                    className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm outline-none focus:border-primary">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Weight (kg)</span>
                  <Input type="number" value={profile.weight || ""} placeholder="e.g. 70"
                    onChange={(e) => setProfile({ ...profile, weight: parseFloat(e.target.value) || 0 })} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Height (cm)</span>
                  <Input type="number" value={profile.height || ""} placeholder="e.g. 175"
                    onChange={(e) => setProfile({ ...profile, height: parseFloat(e.target.value) || 0 })} />
                </label>
                <label className="space-y-1 col-span-2">
                  <span className="text-xs text-muted-foreground">Activity level</span>
                  <select value={profile.activityLevel}
                    onChange={(e) => setProfile({ ...profile, activityLevel: parseFloat(e.target.value) as 1.2 | 1.375 | 1.55 | 1.725 | 1.9 })}
                    className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm outline-none focus:border-primary">
                    <option value={1.2}>Sedentary (little/no exercise)</option>
                    <option value={1.375}>Lightly active (1-3 days/wk)</option>
                    <option value={1.55}>Moderately active (3-5 days/wk)</option>
                    <option value={1.725}>Very active (6-7 days/wk)</option>
                    <option value={1.9}>Extra active (physical job + training)</option>
                  </select>
                </label>
                <label className="space-y-1 col-span-2">
                  <span className="text-xs text-muted-foreground">Goal</span>
                  <select value={profile.goal}
                    onChange={(e) => setProfile({ ...profile, goal: e.target.value as "maintain" | "lose" | "gain" | "muscle_gain" })}
                    className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm outline-none focus:border-primary">
                    <option value="maintain">Maintain</option>
                    <option value="lose">Lose weight</option>
                    <option value="gain">Gain weight</option>
                    <option value="muscle_gain">Build muscle</option>
                  </select>
                </label>
                {profile.gender === "female" && profile.age >= 14 && profile.age <= 50 && (
                  <div className="col-span-2 flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={!!profile.isPregnant}
                        onChange={(e) => setProfile({ ...profile, isPregnant: e.target.checked, isLactating: e.target.checked ? false : profile.isLactating })} />
                      Pregnant
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={!!profile.isLactating}
                        onChange={(e) => setProfile({ ...profile, isLactating: e.target.checked, isPregnant: e.target.checked ? false : profile.isPregnant })} />
                      Lactating
                    </label>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setOpenProfile(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Save & Export */}
          {user && (
            <Dialog open={openSave} onOpenChange={setOpenSave}>
              <DialogTrigger asChild>
                <button className="h-9 px-3 rounded-full gradient-primary text-primary-foreground flex items-center gap-1.5 text-xs font-medium shadow-glow hover:opacity-90 transition-opacity">
                  <Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Save & Export</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Save & Export</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Meal name</Label>
                    <Input value={mealName} onChange={(e) => setMealName(e.target.value)}
                      placeholder={`Meal ${new Date().toLocaleDateString()}`} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will save the current meal to your library and download a PDF nutrition report.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenSave(false)}>Cancel</Button>
                  <Button onClick={handleSaveExport}>Save & Export PDF</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <button onClick={toggleTheme}
            className="h-10 w-10 rounded-full bg-secondary hover:bg-muted grid place-items-center transition-colors">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
