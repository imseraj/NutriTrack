import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { Food, Unit, RDA, computeRDA, RDA_DEFAULT } from "@/data/foods";
import { SelectedFood, sumNutrition } from "@/lib/nutrition";
import { auth as fbAuth, db as fbDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

interface Profile {
  age: number;
  gender: "male" | "female";
  weight: number;
  height: number;
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  goal: "maintain" | "lose" | "gain" | "muscle_gain";
  isPregnant?: boolean;
  isLactating?: boolean;
}

export interface SavedMeal {
  id: string;
  name: string;
  items: SelectedFood[];
  savedAt: string;
}

interface DailyEntry {
  date: string; // YYYY-MM-DD
  totals: ReturnType<typeof sumNutrition>;
  itemCount: number;
}

interface Ctx {
  selected: SelectedFood[];
  addFood: (food: Food) => void;
  updateItem: (uid: string, patch: Partial<Pick<SelectedFood, "quantity" | "unit">>) => void;
  removeItem: (uid: string) => void;
  clearAll: () => void;
  totals: ReturnType<typeof sumNutrition>;
  rda: RDA;
  profile: Profile;
  setProfile: (p: Profile) => void;
  savedMeals: SavedMeal[];
  saveMeal: (name: string) => void;
  loadMeal: (id: string) => void;
  loadMealToPlate: (meal: SavedMeal) => void;
  deleteMeal: (id: string) => void;
  recentFoods: Food[];
  recentQuantities: number[];
  logDay: (customTotals?: ReturnType<typeof sumNutrition>, customCount?: number) => Promise<void>;
  updateLogCalories: (date: string, calories: number) => Promise<void>;
  history: DailyEntry[];
  theme: "light" | "dark";
  toggleTheme: () => void;
  
  // Custom Food Creator
  customFoods: Food[];
  addCustomFood: (food: Omit<Food, "id">) => Promise<void>;
  updateCustomFood: (food: Food) => Promise<void>;
  deleteCustomFood: (id: string) => Promise<void>;
  
  // Hydration state
  waterIntake: number;
  waterGoal: number;
  addWater: (amount: number) => void;
  resetWater: () => void;
  setWaterGoal: (g: number) => void;

  // Firebase integration
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  globalFoods: Food[];
  isFirebaseConfigured: boolean;

  // Dialog controls
  openProfile: boolean;
  setOpenProfile: (open: boolean) => void;

  // Master Admin
  isAdmin: boolean;
  addGlobalFood: (food: Omit<Food, "id">) => Promise<void>;
  deleteGlobalFood: (id: string) => Promise<void>;
  updateGlobalFood: (food: Food) => Promise<void>;
}

const NutritionCtx = createContext<Ctx | null>(null);

const KEY = "nutritrack:v1";

function load<T>(k: string, def: T): T {
  try {
    const raw = localStorage.getItem(`${KEY}:${k}`);
    return raw ? JSON.parse(raw) : def;
  } catch {
    return def;
  }
}

function save(k: string, v: unknown) {
  try {
    localStorage.setItem(`${KEY}:${k}`, JSON.stringify(v));
  } catch (e) {
    console.warn("Failed to write to localStorage:", e);
  }
}

export function NutritionProvider({ children }: { children: ReactNode }) {
  // Local states
  const [selected, setSelected] = useState<SelectedFood[]>(() => load("selected", []));
  const [profile, setProfileState] = useState<Profile>(() =>
    load("profile", { age: 28, gender: "male", weight: 70, height: 175, activityLevel: 1.375, goal: "maintain" })
  );
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>(() => load("meals", []));
  const [recentFoods, setRecentFoods] = useState<Food[]>(() => load("recent", []));
  const [recentQuantities, setRecentQuantities] = useState<number[]>(() => load("recentQty", [50, 100, 150, 200]));
  const [history, setHistory] = useState<DailyEntry[]>(() => load("history", []));
  const [theme, setTheme] = useState<"light" | "dark">(() => load("theme", "light"));
  const [customFoods, setCustomFoods] = useState<Food[]>(() => load("customFoods", []));
  const [waterIntake, setWaterIntake] = useState<number>(() => load("waterIntake", 0));
  const [waterGoal, setWaterGoalState] = useState<number>(() => load("waterGoal", 2000));

  // Firebase auth & global foods states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalFoods, setGlobalFoods] = useState<Food[]>(() => load("globalFoods", []));

  // Profile modal control state
  const [openProfile, setOpenProfile] = useState(false);

  // Master Admin state
  const [isAdmin, setIsAdmin] = useState(false);

  // Helper to update Firebase settings
  const updateFirebaseSettings = async (patch: any) => {
    if (user && fbDb) {
      const userRef = doc(fbDb, "users", user.uid, "profile", "settings");
      await setDoc(userRef, patch, { merge: true });
    }
  };

  // Local storage synchronization (only for guest mode/when logged out)
  useEffect(() => { if (!user) save("selected", selected); }, [selected, user]);
  useEffect(() => { if (!user) save("profile", profile); }, [profile, user]);
  useEffect(() => { if (!user) save("meals", savedMeals); }, [savedMeals, user]);
  useEffect(() => { if (!user) save("recent", recentFoods); }, [recentFoods, user]);
  useEffect(() => { if (!user) save("recentQty", recentQuantities); }, [recentQuantities, user]);
  useEffect(() => { if (!user) save("history", history); }, [history, user]);
  useEffect(() => { if (!user) save("customFoods", customFoods); }, [customFoods, user]);
  useEffect(() => { if (!user) save("waterIntake", waterIntake); }, [waterIntake, user]);
  useEffect(() => { if (!user) save("waterGoal", waterGoal); }, [waterGoal, user]);

  useEffect(() => {
    save("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured || !fbAuth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(fbAuth, async (u) => {
      setUser(u);
      if (u) {
        setLoading(true);
        try {
          await checkAndMigrate(u.uid);

          // Verify admin status dynamically from both custom claims and 'admins' collection
          let adminStatus = false;
          try {
            const idTokenResult = await u.getIdTokenResult();
            if (idTokenResult.claims.admin === true) {
              adminStatus = true;
            }
          } catch (tokenErr) {
            console.error("Failed to fetch id token claims:", tokenErr);
          }

          if (!adminStatus && fbDb) {
            const adminDocRef = doc(fbDb, "admins", u.uid);
            const adminDocSnap = await getDoc(adminDocRef);
            adminStatus = adminDocSnap.exists();
          }
          console.log(`[Admin Check] UID: ${u.uid}, Email: ${u.email}, Is Admin: ${adminStatus}`);
          setIsAdmin(adminStatus);
        } catch (err) {
          console.error("Error checking admin status/migration during auth state change:", err);
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        // Clear session specific states and reload guest data from local storage
        setSelected(load("selected", []));
        setProfileState(load("profile", { age: 28, gender: "male", weight: 70, height: 175, activityLevel: 1.375, goal: "maintain" }));
        setSavedMeals(load("meals", []));
        setRecentFoods(load("recent", []));
        setRecentQuantities(load("recentQty", [50, 100, 150, 200]));
        setHistory(load("history", []));
        setCustomFoods(load("customFoods", []));
        setWaterIntake(load("waterIntake", 0));
        setWaterGoalState(load("waterGoal", 2000));
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Real-time Firestore sync for logged-in user
  useEffect(() => {
    if (!user || !fbDb) return;

    // 1. Settings listener
    const settingsRef = doc(fbDb, "users", user.uid, "profile", "settings");
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.profile) setProfileState(data.profile);
        if (data.waterIntake !== undefined) setWaterIntake(data.waterIntake);
        if (data.waterGoal !== undefined) setWaterGoalState(data.waterGoal);
        if (data.selected) setSelected(data.selected);
        if (data.recentFoods) setRecentFoods(data.recentFoods);
        if (data.recentQuantities) setRecentQuantities(data.recentQuantities);
      }
    });

    // 2. Saved meals listener
    const mealsRef = collection(fbDb, "users", user.uid, "saved_meals");
    const unsubMeals = onSnapshot(mealsRef, (snapshot) => {
      const list: SavedMeal[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as SavedMeal));
      list.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      setSavedMeals(list);
    });

    // 3. Custom foods listener
    const customRef = collection(fbDb, "users", user.uid, "custom_foods");
    const unsubCustom = onSnapshot(customRef, (snapshot) => {
      const list: Food[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as Food));
      list.sort((a, b) => b.id.localeCompare(a.id));
      setCustomFoods(list);
    });

    // 4. History (daily logs) listener
    const historyRef = collection(fbDb, "users", user.uid, "daily_logs");
    const unsubHistory = onSnapshot(historyRef, (snapshot) => {
      const list: DailyEntry[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as DailyEntry));
      list.sort((a, b) => a.date.localeCompare(b.date));
      setHistory(list);
    });

    return () => {
      unsubSettings();
      unsubMeals();
      unsubCustom();
      unsubHistory();
    };
  }, [user]);

  // Load global foods from Firebase (single source of truth)
  // Cached in localStorage so offline users see last-synced verified data
  useEffect(() => {
    if (!isFirebaseConfigured || !fbDb) {
      // Offline/no Firebase — use cached data from last sync
      setGlobalFoods(load("globalFoods", []));
      return;
    }

    const globalFoodsRef = collection(fbDb, "global_foods");
    const unsubscribe = onSnapshot(globalFoodsRef, (snapshot) => {
      const list: Food[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as Food));
      setGlobalFoods(list);
      // Cache to localStorage for offline access
      save("globalFoods", list);
    });

    return unsubscribe;
  }, []);

  // Sync selected and recent foods list with their latest database definitions when collections update
  useEffect(() => {
    if (globalFoods.length === 0 && customFoods.length === 0) return;

    const findLatestFood = (foodId: string): Food | null => {
      const custom = customFoods.find((f) => f.id === foodId);
      if (custom) return custom;
      const global = globalFoods.find((f) => f.id === foodId);
      if (global) return global;
      return null;
    };

    // Update plate items
    setSelected((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const latest = findLatestFood(item.food.id);
        if (latest && JSON.stringify(latest) !== JSON.stringify(item.food)) {
          changed = true;
          return { ...item, food: latest };
        }
        return item;
      });
      return changed ? next : prev;
    });

    // Update recent searches list
    setRecentFoods((prev) => {
      let changed = false;
      const next = prev.map((food) => {
        const latest = findLatestFood(food.id);
        if (latest && JSON.stringify(latest) !== JSON.stringify(food)) {
          changed = true;
          return latest;
        }
        return food;
      });
      return changed ? next : prev;
    });
  }, [globalFoods, customFoods]);

  // Initializes settings for a new user with empty/default values
  const checkAndMigrate = async (uid: string) => {
    if (!fbDb) return;

    // 1. Settings initialization
    const settingsRef = doc(fbDb, "users", uid, "profile", "settings");
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      // First time login: trigger configuration modal
      setOpenProfile(true);

      const emptyProfile: Profile = {
        age: 0,
        gender: "male",
        weight: 0,
        height: 0,
        activityLevel: 1.2,
        goal: "maintain"
      };

      await setDoc(settingsRef, {
        profile: emptyProfile,
        waterIntake: 0,
        waterGoal: 2000,
        selected: [],
        recentFoods: [],
        recentQuantities: [50, 100, 150, 200]
      });
    }
  };

  const totals = useMemo(() => sumNutrition(selected), [selected]);
  const rda = useMemo(() => computeRDA(profile) ?? RDA_DEFAULT, [profile]);

  // Auth Operations
  const signIn = async (email: string, pass: string) => {
    if (!isFirebaseConfigured || !fbAuth) throw new Error("Firebase is not configured");

    // Client-side rate limiting
    const now = Date.now();
    const lockoutUntilRaw = localStorage.getItem("nutritrack:login:lockout_until");
    const lockoutUntil = lockoutUntilRaw ? parseInt(lockoutUntilRaw, 10) : 0;

    if (lockoutUntil > now) {
      const secondsLeft = Math.ceil((lockoutUntil - now) / 1000);
      throw new Error(`Too many failed login attempts. Access is restricted. Please try again in ${secondsLeft} seconds.`);
    }

    try {
      await signInWithEmailAndPassword(fbAuth, email, pass);
      // On success, reset rate limit counters
      localStorage.removeItem("nutritrack:login:failed_attempts");
      localStorage.removeItem("nutritrack:login:lockout_until");
    } catch (err: any) {
      // Increment failed attempts on credential/auth failures
      const currentAttemptsRaw = localStorage.getItem("nutritrack:login:failed_attempts");
      const currentAttempts = currentAttemptsRaw ? parseInt(currentAttemptsRaw, 10) : 0;
      const nextAttempts = currentAttempts + 1;

      if (nextAttempts >= 5) {
        // Lock out for 60 seconds
        const lockoutTime = Date.now() + 60 * 1000;
        localStorage.setItem("nutritrack:login:failed_attempts", nextAttempts.toString());
        localStorage.setItem("nutritrack:login:lockout_until", lockoutTime.toString());
        throw new Error("Too many failed login attempts. Access has been temporarily restricted for 60 seconds.");
      } else {
        localStorage.setItem("nutritrack:login:failed_attempts", nextAttempts.toString());
        throw err;
      }
    }
  };

  const signUp = async (email: string, pass: string) => {
    if (!isFirebaseConfigured || !fbAuth) throw new Error("Firebase is not configured");
    await createUserWithEmailAndPassword(fbAuth, email, pass);
  };

  const signOut = async () => {
    if (!isFirebaseConfigured || !fbAuth) throw new Error("Firebase is not configured");
    await fbSignOut(fbAuth);
  };

  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured || !fbAuth) throw new Error("Firebase is not configured");
    await sendPasswordResetEmail(fbAuth, email);
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !fbAuth) throw new Error("Firebase is not configured");
    const provider = new GoogleAuthProvider();
    await signInWithPopup(fbAuth, provider);
  };

  // Master Admin helpers
  const addGlobalFood = async (food: Omit<Food, "id">) => {
    if (!isAdmin || !fbDb) return;
    const newFood: Food = {
      ...food,
      id: `global-food-${Date.now()}`
    };
    await setDoc(doc(fbDb, "global_foods", newFood.id), newFood);
  };

  const deleteGlobalFood = async (id: string) => {
    if (!isAdmin || !fbDb) return;
    await deleteDoc(doc(fbDb, "global_foods", id));
  };

  const updateGlobalFood = async (food: Food) => {
    if (!isAdmin || !fbDb) return;
    await setDoc(doc(fbDb, "global_foods", food.id), food);
  };

  // State modifying functions
  const addFood = async (food: Food) => {
    // Prevent adding the same food item multiple times
    const existing = selected.find((item) => item.food.id === food.id);
    if (existing) {
      toast({
        title: "Food Already Added",
        description: `"${food.name}" is already on your plate. You can adjust its quantity directly in the table below.`,
        variant: "destructive"
      });
      return;
    }

    const newItem: SelectedFood = {
      uid: `${food.id}-${Date.now()}`,
      food,
      quantity: food.baseUnit === "pieces" ? 1 : 100,
      unit: food.baseUnit,
    };
    const newSelected = [...selected, newItem];
    const prevSelected = selected;

    setSelected(newSelected);
    setRecentFoods((r) => [food, ...r.filter((f) => f.id !== food.id)].slice(0, 8));

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ selected: newSelected });
      } catch (err) {
        setSelected(prevSelected);
        console.error("Failed to sync food selection with Firebase:", err);
      }
    }
  };

  const updateItem: Ctx["updateItem"] = async (uid, patch) => {
    const newSelected = selected.map((it) => (it.uid === uid ? { ...it, ...patch } : it));
    let nextQty = recentQuantities;
    if (patch.quantity && Number.isFinite(patch.quantity)) {
      nextQty = Array.from(new Set([patch.quantity!, ...recentQuantities])).slice(0, 6);
    }

    const prevSelected = selected;
    const prevRecentQuantities = recentQuantities;

    setSelected(newSelected);
    if (patch.quantity && Number.isFinite(patch.quantity)) {
      setRecentQuantities(nextQty);
    }

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ selected: newSelected, recentQuantities: nextQty });
      } catch (err) {
        setSelected(prevSelected);
        setRecentQuantities(prevRecentQuantities);
        console.error("Failed to update item in Firebase:", err);
      }
    }
  };

  const removeItem = async (uid: string) => {
    const newSelected = selected.filter((it) => it.uid !== uid);
    const prevSelected = selected;

    setSelected(newSelected);

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ selected: newSelected });
      } catch (err) {
        setSelected(prevSelected);
        console.error("Failed to remove item in Firebase:", err);
      }
    }
  };

  const clearAll = async () => {
    const prevSelected = selected;
    setSelected([]);

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ selected: [] });
      } catch (err) {
        setSelected(prevSelected);
        console.error("Failed to clear selection in Firebase:", err);
      }
    }
  };

  const saveMeal = async (name: string) => {
    if (!name.trim() || selected.length === 0) return;
    const newMeal: SavedMeal = {
      id: `meal-${Date.now()}`,
      name,
      items: selected,
      savedAt: new Date().toISOString()
    };

    if (user && fbDb) {
      await setDoc(doc(fbDb, "users", user.uid, "saved_meals", newMeal.id), newMeal);
    } else {
      setSavedMeals((m) => [newMeal, ...m]);
    }
  };

  const loadMeal = async (id: string) => {
    const m = savedMeals.find((x) => x.id === id);
    if (m) {
      const loadedSelected = m.items.map((it) => ({
        ...it,
        uid: `${it.food.id}-${Date.now()}-${Math.random()}`
      }));
      if (user && fbDb) {
        await updateFirebaseSettings({ selected: loadedSelected });
      } else {
        setSelected(loadedSelected);
      }
    }
  };

  const loadMealToPlate = async (meal: SavedMeal) => {
    const loaded = meal.items.map((it) => ({
      ...it,
      uid: `${it.food.id}-${Date.now()}-${Math.random()}`
    }));
    const newSelected = [...selected, ...loaded];

    if (user && fbDb) {
      await updateFirebaseSettings({ selected: newSelected });
    } else {
      setSelected(newSelected);
    }
  };

  const deleteMeal = async (id: string) => {
    if (user && fbDb) {
      await deleteDoc(doc(fbDb, "users", user.uid, "saved_meals", id));
    } else {
      setSavedMeals((m) => m.filter((x) => x.id !== id));
    }
  };

  const logDay = async (customTotals?: ReturnType<typeof sumNutrition>, customCount?: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const newEntry = { 
      date: today, 
      totals: customTotals ?? totals, 
      itemCount: customCount ?? selected.length 
    };

    if (user && fbDb) {
      await setDoc(doc(fbDb, "users", user.uid, "daily_logs", today), newEntry);
    } else {
      setHistory((h) => {
        const others = h.filter((d) => d.date !== today);
        return [...others, newEntry].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
      });
    }
  };

  const updateLogCalories = async (date: string, calories: number) => {
    const entry = history.find((h) => h.date === date);
    if (!entry) return;

    const updatedEntry = {
      ...entry,
      totals: {
        ...entry.totals,
        calories: calories
      }
    };

    if (user && fbDb) {
      await setDoc(doc(fbDb, "users", user.uid, "daily_logs", date), updatedEntry);
    } else {
      setHistory((h) => h.map((d) => (d.date === date ? updatedEntry : d)));
    }
  };

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const addCustomFood = async (food: Omit<Food, "id">) => {
    const newFood: Food = {
      ...food,
      id: `custom-food-${Date.now()}`
    };

    if (user && fbDb) {
      await setDoc(doc(fbDb, "users", user.uid, "custom_foods", newFood.id), newFood);
    } else {
      setCustomFoods((prev) => [newFood, ...prev]);
    }
  };

  const updateCustomFood = async (food: Food) => {
    if (user && fbDb) {
      await setDoc(doc(fbDb, "users", user.uid, "custom_foods", food.id), food);
    } else {
      setCustomFoods((prev) => prev.map((f) => (f.id === food.id ? food : f)));
    }
  };

  const deleteCustomFood = async (id: string) => {
    if (user && fbDb) {
      await deleteDoc(doc(fbDb, "users", user.uid, "custom_foods", id));
    } else {
      setCustomFoods((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const addWater = async (amount: number) => {
    const newWater = Math.max(0, waterIntake + amount);
    const prevWater = waterIntake;
    setWaterIntake(newWater);

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ waterIntake: newWater });
      } catch (err) {
        setWaterIntake(prevWater);
        console.error("Failed to sync water intake with Firebase:", err);
      }
    }
  };

  const resetWater = async () => {
    const prevWater = waterIntake;
    setWaterIntake(0);

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ waterIntake: 0 });
      } catch (err) {
        setWaterIntake(prevWater);
        console.error("Failed to reset water intake in Firebase:", err);
      }
    }
  };

  const setWaterGoal = async (goal: number) => {
    const prevGoal = waterGoal;
    setWaterGoalState(goal);

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ waterGoal: goal });
      } catch (err) {
        setWaterGoalState(prevGoal);
        console.error("Failed to sync water goal with Firebase:", err);
      }
    }
  };

  const setProfile = async (p: Profile) => {
    const prevProfile = profile;
    setProfileState(p);

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ profile: p });
      } catch (err) {
        setProfileState(prevProfile);
        console.error("Failed to sync profile with Firebase:", err);
      }
    }
  };

  return (
    <NutritionCtx.Provider value={{
      selected, addFood, updateItem, removeItem, clearAll,
      totals, rda, profile, setProfile,
      savedMeals, saveMeal, loadMeal, loadMealToPlate, deleteMeal,
      recentFoods, recentQuantities,
      logDay, updateLogCalories, history,
      theme, toggleTheme,
      customFoods, addCustomFood, updateCustomFood, deleteCustomFood,
      waterIntake, waterGoal, addWater, resetWater, setWaterGoal,
      
      // Firebase specific states & actions
      user, loading, signIn, signUp, signOut, resetPassword, signInWithGoogle, globalFoods, isFirebaseConfigured,

      // Dialog controls
      openProfile, setOpenProfile,

      // Master Admin
      isAdmin, addGlobalFood, deleteGlobalFood, updateGlobalFood
    }}>
      {children}
    </NutritionCtx.Provider>
  );
}

export function useNutrition() {
  const ctx = useContext(NutritionCtx);
  if (!ctx) throw new Error("useNutrition must be used within NutritionProvider");
  return ctx;
}
