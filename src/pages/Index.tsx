import { useNutrition } from "@/context/NutritionContext";
import { Header } from "@/components/nutrition/Header";
import { FoodSearch } from "@/components/nutrition/FoodSearch";
import { FoodTable } from "@/components/nutrition/FoodTable";
import { RDATable } from "@/components/nutrition/RDATable";
import { MacroPie, HistoryChart, MicroBarChart } from "@/components/nutrition/Charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatNum, sumNutrition } from "@/lib/nutrition";
import { motion } from "framer-motion";
import { Flame, Sparkles, Bookmark, Utensils, BarChart3, Trash2, Plus, Loader2, Edit, Check } from "lucide-react";
import { WaterTracker } from "@/components/nutrition/WaterTracker";
import { InsightsPanel } from "@/components/nutrition/InsightsPanel";
import { CustomFoodForm } from "@/components/nutrition/CustomFoodForm";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Food } from "@/data/foods";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function DailyEnergyTile() {
  const { totals, rda } = useNutrition();
  const consumed = Math.round(totals.calories);
  const left = Math.max(0, rda.calories - consumed);
  const pct = Math.min(100, (consumed / rda.calories) * 100);
  const circumference = 2 * Math.PI * 100;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="bento-tile p-6 flex flex-col justify-between relative overflow-hidden h-full min-h-[340px]">
      <div className="z-10">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/70 font-semibold">Today</p>
        <h2 className="text-xl font-display font-semibold text-primary mt-1">Daily Energy</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Fueling your performance</p>
      </div>

      <div className="relative flex items-center justify-center py-4 z-10">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 224 224">
            <circle cx="112" cy="112" r="100" stroke="hsl(var(--secondary))" strokeWidth="14" fill="none" />
            <motion.circle
              cx="112" cy="112" r="100" stroke="hsl(var(--primary))" strokeWidth="14" fill="none"
              strokeLinecap="round" strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-3xl font-display font-bold text-primary tabular-nums">{left.toLocaleString()}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-accent font-medium mt-1">kcal left</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end z-10 pt-2">
        <div className="space-y-1">
          <p className="text-[10px] text-accent uppercase font-semibold tracking-[0.18em]">Consumed</p>
          <p className="text-base font-display font-semibold text-primary tabular-nums">{consumed.toLocaleString()}</p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div className="space-y-1 text-right">
          <p className="text-[10px] text-accent uppercase font-semibold tracking-[0.18em]">Goal</p>
          <p className="text-base font-display font-semibold text-primary tabular-nums">{rda.calories.toLocaleString()}</p>
        </div>
      </div>

      <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}

function MacrosTile() {
  const { totals, rda } = useNutrition();
  const macros = [
    { key: "protein", label: "Protein", value: totals.protein, target: rda.protein, color: "hsl(var(--primary))" },
    { key: "carbohydrates", label: "Carbs", value: totals.carbohydrates, target: rda.carbohydrates, color: "hsl(var(--accent))" },
    { key: "fat", label: "Fat", value: totals.fat, target: rda.fat, color: "hsl(var(--primary) / 0.55)" },
  ];
  const overall = Math.min(100, Math.round(((totals.protein + totals.carbohydrates + totals.fat) /
    (rda.protein + rda.carbohydrates + rda.fat)) * 100) || 0);

  return (
    <div className="bento-tile p-6 bg-secondary border-transparent flex flex-col justify-between h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display font-semibold text-primary text-lg">Macronutrients</h3>
        <span className="text-xs font-semibold text-primary bg-card px-3 py-1 rounded-full">
          {overall}% of target
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {macros.map((m) => {
          const pct = Math.min(100, (m.value / m.target) * 100);
          return (
            <div key={m.key} className="space-y-2">
              <div className="h-1.5 w-full bg-card/70 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: m.color }}
                />
              </div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-primary">{m.label}</p>
              <p className="text-xl font-display font-bold text-primary tabular-nums leading-none">
                {formatNum(m.value, 0)}<span className="text-xs font-normal text-accent">g</span>
              </p>
              <p className="text-[10px] text-muted-foreground">of {m.target}g</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemsTile() {
  const { selected } = useNutrition();
  return (
    <div className="bento-tile md:col-span-1 p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-accent">Today's plate</p>
        <Sparkles className="h-4 w-4 text-accent" />
      </div>
      <div>
        <p className="text-4xl font-display font-semibold text-primary tabular-nums">{selected.length}</p>
        <p className="text-sm text-muted-foreground mt-1">foods logged</p>
      </div>
    </div>
  );
}

function MealsCountTile() {
  const { savedMeals } = useNutrition();
  return (
    <div className="bento-tile md:col-span-1 p-6 flex flex-col justify-between bg-primary text-primary-foreground border-transparent">
      <div className="flex items-start justify-between">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold opacity-80">Library</p>
        <Bookmark className="h-4 w-4 opacity-80" />
      </div>
      <div>
        <p className="text-4xl font-display font-semibold tabular-nums">{savedMeals.length}</p>
        <p className="text-sm opacity-90 mt-1">saved meals</p>
      </div>
    </div>
  );
}

function SavedMealsTab() {
  const { savedMeals, loadMeal, deleteMeal, logDay } = useNutrition();

  if (savedMeals.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <Bookmark className="h-10 w-10 text-accent mx-auto" />
        <h3 className="text-xl font-display font-semibold text-primary">No saved meals yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Add foods to your plate and save them as a meal to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {savedMeals.map((meal) => (
        <motion.div
          key={meal.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-tile p-5 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-display font-semibold text-primary text-lg leading-tight">{meal.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{meal.items.length} items</p>
            </div>
            <Bookmark className="h-4 w-4 text-accent" />
          </div>

          <div className="flex-1">
            <ul className="space-y-1">
              {meal.items.slice(0, 4).map((it) => (
                <li key={it.uid} className="text-sm text-primary/80 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-accent" />
                  {it.food.name}
                </li>
              ))}
              {meal.items.length > 4 && (
                <li className="text-xs text-muted-foreground pl-3">+{meal.items.length - 4} more</li>
              )}
            </ul>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border/50">
            <button
              onClick={() => {
                loadMeal(meal.id);
                toast({
                  title: "Plate Loaded",
                  description: `"${meal.name}" items have been loaded onto your plate.`,
                });
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              Load to plate
            </button>
            <button
              onClick={async () => {
                await loadMeal(meal.id);
                const mealTotals = sumNutrition(meal.items);
                await logDay(mealTotals, meal.items.length);
                toast({
                  title: "Meal Logged!",
                  description: `"${meal.name}" (${Math.round(mealTotals.calories)} kcal) has been logged to today's history.`,
                });
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-secondary text-secondary-foreground hover:bg-muted px-2.5 py-2 text-xs font-semibold transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              Log Today
            </button>
            <button
              onClick={() => deleteMeal(meal.id)}
              className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-xs font-semibold text-accent hover:bg-secondary transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function CustomFoodsTab() {
  const { customFoods, globalFoods, isAdmin, deleteGlobalFood, deleteCustomFood } = useNutrition();
  const [dbView, setDbView] = useState<"personal" | "global">("personal");
  const [foodToEdit, setFoodToEdit] = useState<Food | null>(null);

  const displayedFoods = dbView === "personal" ? customFoods : globalFoods;

  useEffect(() => {
    setFoodToEdit(null);
  }, [dbView]);

  const handleDeleteGlobal = async (foodId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from the global database? This action will affect all users.`)) {
      try {
        await deleteGlobalFood(foodId);
        toast({
          title: "Global Food Deleted",
          description: `"${name}" has been deleted from the centralized database.`,
        });
        if (foodToEdit && foodToEdit.id === foodId) {
          setFoodToEdit(null);
        }
      } catch (err: any) {
        toast({
          title: "Deletion failed",
          description: err.message || "An error occurred.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteCustom = async (foodId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" from your custom database?`)) {
      try {
        await deleteCustomFood(foodId);
        toast({
          title: "Food Deleted",
          description: `"${name}" has been deleted from your personal database.`,
        });
        if (foodToEdit && foodToEdit.id === foodId) {
          setFoodToEdit(null);
        }
      } catch (err: any) {
        toast({
          title: "Deletion failed",
          description: err.message || "An error occurred.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Custom food creator form */}
      <div className="lg:col-span-2 glass-card p-6 bg-card border border-border/60">
        <h3 className="text-lg font-display font-semibold text-primary mb-1">
          {foodToEdit ? "Edit Food Details" : "New Food Details"}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          {foodToEdit ? `Modifying "${foodToEdit.name}"` : "Complete the fields below to register this custom food"}
        </p>
        <CustomFoodForm
          foodToEdit={foodToEdit}
          onSuccess={() => {
            setFoodToEdit(null);
          }}
          onCancel={foodToEdit ? () => setFoodToEdit(null) : undefined}
        />
      </div>

      {/* Registered foods list */}
      <div className="lg:col-span-1 glass-card p-6 bg-card border border-border/60 flex flex-col h-[520px]">
        <h3 className="text-lg font-display font-semibold text-primary mb-1">Custom Database</h3>
        
        {isAdmin ? (
          <div className="flex bg-secondary/60 p-1 rounded-lg mb-4">
            <button
              onClick={() => setDbView("personal")}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                dbView === "personal"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Personal ({customFoods.length})
            </button>
            <button
              onClick={() => setDbView("global")}
              className={`flex-1 text-center py-1.5 text-xs font-semibold rounded-md transition-all ${
                dbView === "global"
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Global ({globalFoods.length})
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-4">Your registered foods ({customFoods.length})</p>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {displayedFoods.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-xs font-medium">
              {dbView === "personal" 
                ? "No custom foods created yet.\nFill the form to add one!" 
                : "No foods in the global database."}
            </div>
          ) : (
            displayedFoods.map((food) => (
              <div key={food.id} className="p-3 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{food.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-xs text-primary leading-tight truncate">{food.name}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {food.baseQuantity}{food.baseUnit} · {food.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 pl-2">
                  <div className="text-right">
                    <span className="text-xs font-bold text-primary">{Math.round(food.nutrition.calories)} kcal</span>
                    <p className="text-[9px] text-muted-foreground leading-none mt-0.5">
                      P: {Math.round(food.nutrition.macros.protein)}g · C: {Math.round(food.nutrition.macros.carbohydrates)}g · F: {Math.round(food.nutrition.macros.fat)}g
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {((dbView === "global" && isAdmin) || dbView === "personal") && (
                      <button
                        onClick={() => setFoodToEdit(food)}
                        className={`p-1 rounded-md transition-colors ${
                          foodToEdit?.id === food.id
                            ? "text-primary bg-secondary/80"
                            : "text-muted-foreground hover:text-primary hover:bg-secondary"
                        }`}
                        title="Edit Food Details"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isAdmin && dbView === "global" && (
                      <button
                        onClick={() => handleDeleteGlobal(food.id, food.name)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                        title="Delete from Global Database"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {dbView === "personal" && (
                      <button
                        onClick={() => handleDeleteCustom(food.id, food.name)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
                        title="Delete from Custom Database"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  const { user, loading, isFirebaseConfigured } = useNutrition();
  const navigate = useNavigate();

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => {
    if (!loading && isFirebaseConfigured) {
      const isGuest = sessionStorage.getItem("nutritrack:guest") === "true";
      if (!user && !isGuest) {
        navigate("/login");
      }
    }
  }, [user, loading, isFirebaseConfigured, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground animate-pulse">Syncing settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
        <section className="text-center max-w-2xl mx-auto space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          >
            <p className="text-xs uppercase tracking-[0.22em] text-primary/70 font-semibold mb-3">
              Nutrition · Mindfully tracked
            </p>
            <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight text-primary">
              What nourished you today?
            </h1>
            <p className="text-muted-foreground mt-3">
              Search any food, set your portion, and watch your day come into focus.
            </p>
          </motion.div>
          <FoodSearch />
        </section>

        <section>
          <Tabs defaultValue="plate" className="w-full">
            <TabsList className={`grid w-full max-w-xl ${user ? 'grid-cols-4' : 'grid-cols-2'}`}>
              <TabsTrigger value="plate" className="gap-2 text-xs sm:text-sm">
                <Utensils className="h-4 w-4" /> Your Plate
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4" /> Charts
              </TabsTrigger>
              {user && (
                <>
                  <TabsTrigger value="saved" className="gap-2 text-xs sm:text-sm">
                    <Bookmark className="h-4 w-4" /> Saved Meals
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-2 text-xs sm:text-sm">
                    <Plus className="h-4 w-4" /> Add Custom
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="plate" className="mt-6 space-y-6">
              <div className="flex items-end justify-between px-1">
                <div>
                  <h3 className="text-xl font-display font-semibold text-primary">Your plate</h3>
                  <p className="text-sm text-muted-foreground">Adjust portions to recalculate nutrients</p>
                </div>
                <Flame className="h-5 w-5 text-accent" />
              </div>
              
              <FoodTable />
              
              {/* 1. Daily Energy & Hydration (Water) side-by-side at the top */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DailyEnergyTile />
                <WaterTracker />
              </div>

              {/* 2. Today Plate & Library stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ItemsTile />
                <MealsCountTile />
              </div>

              {/* 3. Macros & Insights at the bottom */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MacrosTile />
                <InsightsPanel />
              </div>
            </TabsContent>

            <TabsContent value="charts" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MacroPie />
                <HistoryChart />
              </div>
              <MicroBarChart />
              <RDATable />
            </TabsContent>

            {user && (
              <>
                <TabsContent value="saved" className="mt-6 space-y-6">
                  <div className="flex items-end justify-between px-1">
                    <div>
                      <h3 className="text-xl font-display font-semibold text-primary">Saved meals</h3>
                      <p className="text-sm text-muted-foreground">Your library of custom meals</p>
                    </div>
                    <Bookmark className="h-5 w-5 text-accent" />
                  </div>
                  <SavedMealsTab />
                </TabsContent>

                <TabsContent value="custom" className="mt-6 space-y-6">
                  <div className="flex items-end justify-between px-1">
                    <div>
                      <h3 className="text-xl font-display font-semibold text-primary">Add Custom Food</h3>
                      <p className="text-sm text-muted-foreground">Create your own foods with precise macro & micro values</p>
                    </div>
                    <Plus className="h-5 w-5 text-accent" />
                  </div>

                  <CustomFoodsTab />
                </TabsContent>
              </>
            )}
          </Tabs>
        </section>

        <footer className="pt-8 mt-12 pb-6 border-t border-border/40 text-center text-xs text-muted-foreground space-y-4">
          <div className="flex justify-center space-x-6 text-sm">
            <button onClick={() => setShowPrivacy(true)} className="hover:text-primary transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <span className="text-border">|</span>
            <button onClick={() => setShowTerms(true)} className="hover:text-primary transition-colors cursor-pointer">
              Terms of Service
            </button>
            <span className="text-border">|</span>
            <button onClick={() => setShowContact(true)} className="hover:text-primary transition-colors cursor-pointer">
              Contact Us
            </button>
          </div>
          <p className="text-xs text-muted-foreground/80 mt-2">
            © {new Date().getFullYear()} NutriTrack. All rights reserved. · Track. Learn. Thrive.
          </p>
        </footer>
      </main>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-border/60 shadow-xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-semibold text-primary">Privacy Policy</DialogTitle>
            <DialogDescription>
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4 text-sm text-muted-foreground">
            <section className="space-y-2">
              <h4 className="font-semibold text-primary">1. Data Ownership & Storage</h4>
              <p>
                Your nutrition records, daily logs, water intake, and custom foods belong entirely to you. 
                When using guest mode, this data is saved strictly inside your browser's local cache (localStorage). 
                If you create an account, your data is securely stored and synchronized via Google Firebase.
              </p>
            </section>
            <section className="space-y-2">
              <h4 className="font-semibold text-primary">2. No Third-Party Sharing</h4>
              <p>
                We do not sell, trade, or share your personal logs, health data, or contact details with any third parties, advertisers, or external partners.
              </p>
            </section>
            <section className="space-y-2">
              <h4 className="font-semibold text-primary">3. Authentication & Security</h4>
              <p>
                We use Firebase Authentication for user accounts. Your credentials are securely managed and encrypted by Google's auth servers.
              </p>
            </section>
            <section className="space-y-2">
              <h4 className="font-semibold text-primary">4. Cookies and Cache</h4>
              <p>
                This application uses local storage cookies solely to manage your session authentication and keep your plate offline-compatible.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg rounded-2xl border border-border/60 shadow-xl backdrop-blur-md p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-b from-primary/5 to-transparent">
            <DialogTitle className="text-2xl font-display font-semibold text-primary">Terms & Conditions</DialogTitle>
            <DialogDescription>
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4 text-sm text-muted-foreground max-h-[60vh] overflow-y-auto scrollbar-sage">

            {/* Section 1 */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-2">
              <h4 className="flex items-center gap-2 font-semibold text-foreground">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0">1</span>
                Disclaimer (Not Medical Advice)
              </h4>
              <p className="text-destructive font-medium bg-destructive/5 p-3 rounded-lg border border-destructive/20 text-xs leading-relaxed">
                IMPORTANT: The dietary targets (RDA) and calculations provided by NutriTrack are for informational purposes only. This app does NOT provide medical advice, diagnosis, or clinical treatment plans. Always consult with a qualified physician or registered dietitian before making major changes to your diet.
              </p>
            </section>

            {/* Section 2 */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-2">
              <h4 className="flex items-center gap-2 font-semibold text-foreground">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0">2</span>
                Accuracy of Data
              </h4>
              <p className="leading-relaxed">
                While we strive to ensure the nutritional information in our database is accurate, food values may vary depending on brand, cooking method, and portions. User discretion is advised.
              </p>
            </section>

            {/* Section 3 */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-2">
              <h4 className="flex items-center gap-2 font-semibold text-foreground">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0">3</span>
                Account Responsibility
              </h4>
              <p className="leading-relaxed">
                If you create an account, you are responsible for maintaining the confidentiality of your login details. NutriTrack is not responsible for data loss due to compromised user accounts.
              </p>
            </section>

            {/* Section 4 */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-3">
              <h4 className="flex items-center gap-2 font-semibold text-foreground">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0">4</span>
                Nutrient RDA Evidence Basis
              </h4>
              <p className="leading-relaxed">
                NutriTrack tracks 36 nutrients (6 macros + 30 micros). Not all have an official Recommended Dietary Allowance (RDA) set by the NIH. Below is the classification:
              </p>
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                  <p className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                    <span className="text-sm">✅</span> Official NIH RDA (23 nutrients)
                  </p>
                  <p className="leading-relaxed">Protein, Carbohydrates, Fat, Vitamin A, D, E, K, C, B1 (Thiamin), B2 (Riboflavin), B3 (Niacin), B6, B9 (Folate), B12, Calcium, Phosphorus, Magnesium, Iron, Zinc, Iodine, Selenium, Copper, Molybdenum.</p>
                  <p className="mt-1.5 text-muted-foreground/80 italic">Personalised based on your age, gender, and life-stage.</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 dark:bg-amber-400/5 dark:border-amber-400/15">
                  <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
                    <span className="text-sm">⚠️</span> Adequate Intake only — no formal RDA (9 nutrients)
                  </p>
                  <p className="leading-relaxed">Fiber, Vitamin B5 (Pantothenic Acid), B7 (Biotin), Sodium, Potassium, Chloride, Manganese, Fluoride, Chromium.</p>
                  <p className="mt-1.5 text-muted-foreground/80 italic">Targets are Adequate Intakes (AI) — treat as approximations, not precise goals.</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/15">
                  <p className="font-semibold text-destructive mb-1 flex items-center gap-1.5">
                    <span className="text-sm">❌</span> No official NIH RDA or AI (4 nutrients)
                  </p>
                  <div className="space-y-1.5 leading-relaxed">
                    <p><strong>Sugar (Total):</strong> 90 g target is the EU Reference Intake for <em>total</em> sugars. The WHO 10% guideline is for <em>added</em> sugars only.</p>
                    <p><strong>Sulfur:</strong> 900 mg is estimated from sulfur-amino acid requirements.</p>
                    <p><strong>Cobalt:</strong> 1 µg is approximate. Nutritionally relevant only as part of Vitamin B12.</p>
                    <p><strong>Calories:</strong> Calculated via Mifflin-St Jeor / Schofield equations — an estimate, not absolute.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-2">
              <h4 className="flex items-center gap-2 font-semibold text-foreground">
                <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold shrink-0">5</span>
                Nutrients with Limited Food Data
              </h4>
              <p className="leading-relaxed">
                Certain nutrients have incomplete data in most food databases (including USDA FoodData Central):
              </p>
              <ul className="space-y-1.5 ml-1 text-xs leading-relaxed">
                <li className="flex gap-2"><span className="text-muted-foreground/50 select-none">•</span><span><strong>Cobalt</strong> — Rarely reported; B12 tracking covers it.</span></li>
                <li className="flex gap-2"><span className="text-muted-foreground/50 select-none">•</span><span><strong>Sulfur</strong> — Estimated from sulfur-amino acids; may be inaccurate.</span></li>
                <li className="flex gap-2"><span className="text-muted-foreground/50 select-none">•</span><span><strong>Chromium</strong> — Sparse data; treat as ballpark estimates.</span></li>
                <li className="flex gap-2"><span className="text-muted-foreground/50 select-none">•</span><span><strong>Fluoride</strong> — Mainly from water/dental products; food tracking underestimates intake.</span></li>
                <li className="flex gap-2"><span className="text-muted-foreground/50 select-none">•</span><span><strong>Chloride</strong> — Consumed as table salt; not directly reported by most databases.</span></li>
              </ul>
              <p className="text-[11px] text-muted-foreground/70 italic pt-1 border-t border-border/30">
                RDA bars may show 0 % for these nutrients even with a balanced diet — this reflects missing data, not a deficiency.
              </p>
            </section>

          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Us Dialog */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-md rounded-2xl border border-border/60 shadow-xl backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-semibold text-primary">Contact Us</DialogTitle>
            <DialogDescription>
              Have questions, feedback, or need help? We'd love to hear from you.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-5 bg-muted/40 border border-border/40 rounded-xl space-y-2 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">General Support & Feedback</p>
              <a 
                href="mailto:serajahmed117@gmail.com" 
                className="text-lg font-semibold text-primary hover:text-accent transition-colors block"
              >
                serajahmed117@gmail.com
              </a>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              We usually respond within 24–48 hours. Thank you for choosing NutriTrack!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
