import { useState } from "react";
import { Moon, Sun, Leaf, User, Save, LogOut, Loader2, LogIn, ChevronDown, Key, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useNutrition } from "@/context/NutritionContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { exportPDF } from "@/lib/pdf";
import { CoreTargetKey, CoreTargetOverrides, computeRDA } from "@/data/foods";
import { formatNum } from "@/lib/nutrition";
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

const coreTargetFields: Array<{ key: CoreTargetKey; label: string; unit: string }> = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbohydrates", label: "Carbohydrates", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "sugar", label: "Total sugar", unit: "g" },
];

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
    loading,
    openProfile,
    setOpenProfile
  } = useNutrition();
  const estimatedTargets = computeRDA(profile);
  const [customTargetDrafts, setCustomTargetDrafts] = useState<Partial<Record<CoreTargetKey, string>>>({});
  const [mealName, setMealName] = useState("");
  const [openSave, setOpenSave] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const navigate = useNavigate();

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({ title: "Error", description: "Please enter your current password.", variant: "destructive" });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import("firebase/auth");
      
      if (user?.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      await updatePassword(user!, newPassword);
      toast({ title: "Success", description: "Password updated successfully." });
      setOpenPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        toast({ title: "Error", description: "Incorrect current password.", variant: "destructive" });
      } else if (error.code === 'auth/requires-recent-login') {
        toast({ title: "Authentication required", description: "Please log out and log back in to change your password.", variant: "destructive" });
      } else {
         toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

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
        <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="h-10 w-10 rounded-2xl bg-primary grid place-items-center shadow-card">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-display font-semibold tracking-tight text-primary block">NutriTrack</span>
            <p className="text-[10px] text-accent -mt-0.5 hidden sm:block uppercase tracking-[0.18em] font-semibold">Track · Learn · Thrive</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {loading ? (
              <button className="h-9 px-3 rounded-full bg-secondary flex items-center gap-1.5 text-xs font-medium cursor-wait" disabled>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
              </button>
            ) : user ? (
              <>
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
                  <DropdownMenuItem onClick={() => setOpenPasswordDialog(true)} className="text-xs cursor-pointer gap-2">
                    <Key className="h-3.5 w-3.5" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-xs cursor-pointer text-destructive focus:text-destructive gap-2">
                    <LogOut className="h-3.5 w-3.5" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={openPasswordDialog} onOpenChange={setOpenPasswordDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Current Password</Label>
                      <div className="relative">
                        <Input 
                          type={showCurrentPassword ? "text" : "password"} 
                          value={currentPassword} 
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password" 
                          className="pr-10"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">New Password</Label>
                      <div className="relative">
                        <Input 
                          type={showNewPassword ? "text" : "password"} 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password" 
                          className="pr-10"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Confirm Password</Label>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          value={confirmPassword} 
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password" 
                          className="pr-10"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setOpenPasswordDialog(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}>Cancel</Button>
                    <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                      {isChangingPassword && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      Update Password
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </>
            ) : (
              <Link to="/login">
                <Button variant="outline" className="h-9 px-4 rounded-full flex items-center gap-1.5 text-xs font-medium">
                  <LogIn className="h-3.5 w-3.5" /> Log In
                </Button>
              </Link>
            )}

          {/* Profile Dialog */}
          {user && <Dialog open={openProfile} onOpenChange={setOpenProfile}>
            <DialogTrigger asChild>
              <button className="h-9 px-3 rounded-full bg-secondary hover:bg-muted flex items-center gap-1.5 text-xs font-medium transition-colors">
                <User className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Profile</span>
              </button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
              <DialogHeader className="shrink-0">
                <DialogTitle>Your Profile</DialogTitle>
              </DialogHeader>
              <div className="-mr-3 min-h-0 flex-1 overflow-y-auto scrollbar-sage pr-1">
                <div className="mr-6 grid grid-cols-2 gap-3 pt-2 text-sm">
                <label className="space-y-1 col-span-2">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <Input type="text" value={profile.name || ""} placeholder="e.g. John Doe"
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-muted-foreground">Age</span>
                  <Input type="number" min="0" max="120" step="0.1" value={profile.age || ""} placeholder="e.g. 25"
                    onChange={(e) => setProfile({ ...profile, age: parseFloat(e.target.value) || 0 })} />
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
                  <select value={profile.age < 19 || profile.isPregnant || profile.isLactating ? "maintain" : profile.goal}
                    disabled={profile.age < 19 || !!profile.isPregnant || !!profile.isLactating}
                    onChange={(e) => setProfile({ ...profile, goal: e.target.value as "maintain" | "lose" | "gain" | "muscle_gain" })}
                    className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm outline-none focus:border-primary">
                    <option value="maintain">Maintain</option>
                    <option value="lose">Lose weight</option>
                    <option value="gain">Gain weight</option>
                    <option value="muscle_gain">Build muscle</option>
                  </select>
                  {(profile.age < 19 || profile.isPregnant || profile.isLactating) && (
                    <span className="block text-[11px] text-muted-foreground">Adult weight-change adjustments are disabled for this life stage.</span>
                  )}
                </label>
                {profile.gender === "female" && (
                  <div className="col-span-2 space-y-3 border-t border-border/50 pt-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={!!profile.isPregnant}
                        onChange={(e) => setProfile({
                          ...profile,
                          isPregnant: e.target.checked,
                          isLactating: e.target.checked ? false : profile.isLactating,
                          useCustomTargets: e.target.checked ? false : profile.useCustomTargets,
                        })} />
                      Pregnant
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={!!profile.isLactating}
                        onChange={(e) => setProfile({
                          ...profile,
                          isLactating: e.target.checked,
                          lactationStage: e.target.checked ? profile.lactationStage ?? "firstSixMonths" : profile.lactationStage,
                          isPregnant: e.target.checked ? false : profile.isPregnant,
                          useCustomTargets: e.target.checked ? false : profile.useCustomTargets,
                        })} />
                      Lactating
                    </label>
                    </div>
                    {profile.isPregnant && (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">Gestational week</span>
                          <Input type="number" min="1" max="42" step="1" value={profile.gestationalWeeks ?? ""}
                            onChange={(e) => setProfile({ ...profile, gestationalWeeks: parseInt(e.target.value, 10) || undefined })} />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs text-muted-foreground">Pre-pregnancy weight (kg)</span>
                          <Input type="number" min="1" step="0.1" value={profile.prepregnancyWeight ?? ""}
                            onChange={(e) => setProfile({ ...profile, prepregnancyWeight: parseFloat(e.target.value) || undefined })} />
                        </label>
                        <p className="col-span-2 text-[11px] text-muted-foreground">
                          Enter both values for the trimester-specific estimate. Without them, the calculator uses the non-pregnant baseline.
                        </p>
                      </div>
                    )}
                    {profile.isLactating && (
                      <label className="block space-y-1">
                        <span className="text-xs text-muted-foreground">Lactation stage</span>
                        <select value={profile.lactationStage ?? "firstSixMonths"}
                          onChange={(e) => setProfile({ ...profile, lactationStage: e.target.value as "firstSixMonths" | "sevenToTwelveMonths" })}
                          className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm outline-none focus:border-primary">
                          <option value="firstSixMonths">0–6 months, exclusive breastfeeding</option>
                          <option value="sevenToTwelveMonths">7–12 months, partial breastfeeding</option>
                        </select>
                      </label>
                    )}
                  </div>
                )}
                <div className="col-span-2 border-t border-border/50 pt-3">
                  <div className="mb-3 rounded-lg bg-secondary/30 p-3">
                    <h3 className="text-xs font-semibold text-primary">
                      {profile.useCustomTargets ? "Calculated daily targets" : "Estimated daily targets"}
                    </h3>
                    {profile.useCustomTargets && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">Profile-based estimate before your custom edits.</p>
                    )}
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                      {coreTargetFields.map((field) => (
                        <div key={field.key} className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{field.label}</span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {formatNum(estimatedTargets[field.key], field.key === "calories" ? 0 : 1)} {field.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {profile.age >= 19 && !profile.isPregnant && !profile.isLactating ? (
                    <>
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          checked={!!profile.useCustomTargets}
                          onCheckedChange={(checked) => {
                            const enabled = checked === true;
                            setCustomTargetDrafts({});
                            const customTargets = enabled
                              ? coreTargetFields.reduce((targets, field) => ({
                                  ...targets,
                                  [field.key]: profile.customTargets?.[field.key] ?? estimatedTargets[field.key],
                                }), {} as CoreTargetOverrides)
                              : profile.customTargets;
                            setProfile({ ...profile, useCustomTargets: enabled, customTargets });
                          }}
                        />
                        Edit estimated daily targets
                      </label>
                      <p className="mt-1 text-[11px] text-muted-foreground">Micronutrient targets remain profile-based. Custom core targets replace estimates in comparisons and reports.</p>
                      {profile.useCustomTargets && (
                        <div className="mt-3 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {coreTargetFields.map((field) => (
                              <label key={field.key} className="space-y-1">
                                <span className="text-xs text-muted-foreground">{field.label} ({field.unit})</span>
                                <Input type="number" min="0" step="any"
                                  value={customTargetDrafts[field.key] ?? String(profile.customTargets?.[field.key] ?? estimatedTargets[field.key])}
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    setCustomTargetDrafts((drafts) => ({ ...drafts, [field.key]: rawValue }));
                                    if (rawValue !== "") {
                                      const value = Number(rawValue);
                                      if (Number.isFinite(value) && value >= 0) {
                                        setProfile({
                                          ...profile,
                                          useCustomTargets: true,
                                          customTargets: { ...profile.customTargets, [field.key]: value },
                                        });
                                      }
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const rawValue = e.currentTarget.value;
                                    if (rawValue === "") {
                                      setCustomTargetDrafts((drafts) => {
                                        const next = { ...drafts };
                                        delete next[field.key];
                                        return next;
                                      });
                                      setProfile({
                                        ...profile,
                                        useCustomTargets: true,
                                        customTargets: { ...profile.customTargets, [field.key]: estimatedTargets[field.key] },
                                      });
                                    } else {
                                      setCustomTargetDrafts((drafts) => {
                                        const next = { ...drafts };
                                        delete next[field.key];
                                        return next;
                                      });
                                    }
                                  }} />
                              </label>
                            ))}
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomTargetDrafts({});
                                setProfile({
                                  ...profile,
                                  useCustomTargets: true,
                                  customTargets: coreTargetFields.reduce((targets, field) => ({
                                    ...targets,
                                    [field.key]: estimatedTargets[field.key],
                                  }), {} as CoreTargetOverrides),
                                });
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-secondary"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Reset to calculated estimates
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Custom calorie and macro targets are unavailable for profiles under 19, pregnancy, or lactation. Micronutrient targets remain estimated from age and life stage.</p>
                  )}
                </div>
                </div>
              </div>
              <DialogFooter className="shrink-0">
                <Button onClick={() => setOpenProfile(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>}

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
