import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { applyCoreTargetOverrides, CoreTargetOverrides, Food, FoodPortion, Unit, RDA, computeRDA, RDA_DEFAULT } from "@/data/foods";
import { SelectedFood, sumNutrition, emptyTotals } from "@/lib/nutrition";
import { auth as fbAuth, db as fbDb, isFirebaseConfigured } from "@/lib/firebase";
import { format, isValid, parseISO } from "date-fns";
import { addToDailyEntry, mealTemplateItems, unloggedMealItems, wrapMealItems } from "@/lib/mealGroups";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  runTransaction
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from "firebase/auth";

interface Profile {
  name?: string;
  age: number;
  gender: "male" | "female";
  weight: number;
  height: number;
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  goal: "maintain" | "lose" | "gain" | "muscle_gain";
  isPregnant?: boolean;
  isLactating?: boolean;
  gestationalWeeks?: number;
  prepregnancyWeight?: number;
  lactationStage?: "firstSixMonths" | "sevenToTwelveMonths";
  useCustomTargets?: boolean;
  customTargets?: CoreTargetOverrides;
}

interface FirebaseSettingsPatch {
  profile?: Profile;
  waterIntake?: number;
  waterGoal?: number;
  selected?: SelectedFood[];
  recentFoods?: Food[];
  recentQuantities?: number[];
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

export interface WeightEntry {
  date: string;
  weight: number;
}

interface Ctx {
  selected: SelectedFood[];
  addFood: (food: Food, groupId?: string | null) => Promise<void>;
  updateItem: (uid: string, patch: Partial<Pick<SelectedFood, "quantity" | "unit" | "portion">>) => void;
  removeItem: (uid: string) => void;
  clearAll: () => void;
  totals: ReturnType<typeof sumNutrition>;
  rda: RDA;
  profile: Profile;
  setProfile: (p: Profile) => void;
  savedMeals: SavedMeal[];
  saveMeal: (name: string, items?: SelectedFood[]) => Promise<void>;
  loadMeal: (id: string) => Promise<string>;
  loadMealToPlate: (meal: SavedMeal, groupId?: string | null) => Promise<string>;
  wrapMeal: (name: string) => Promise<void>;
  unwrapMeal: (id: string) => Promise<void>;
  deleteWrappedMeal: (id: string) => Promise<void>;
  logWrappedMeal: (id?: string) => Promise<void>;
  plateBusy: boolean;
  addingToMeal: string | null;
  setAddingToMeal: (id: string | null) => void;
  deleteMeal: (id: string) => void;
  recentFoods: Food[];
  recentQuantities: number[];
  logDay: (customTotals?: ReturnType<typeof sumNutrition>, customCount?: number, targetDate?: string) => Promise<void>;
  updateLogCalories: (date: string, calories: number) => Promise<void>;
  history: DailyEntry[];
  weightHistory: WeightEntry[];
  saveWeightEntry: (date: string, weight: number) => Promise<void>;
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
  signUp: (email: string, pass: string, name?: string) => Promise<void>;
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
  const [selected, setSelected] = useState<SelectedFood[]>([]);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const plateLock = useRef(false);
  const [plateBusy, setPlateBusy] = useState(false);
  const [addingToMeal, setAddingToMeal] = useState<string | null>(null);
  const [profile, setProfileState] = useState<Profile>({ name: "", age: 28, gender: "male", weight: 70, height: 175, activityLevel: 1.375, goal: "maintain" });
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [recentQuantities, setRecentQuantities] = useState<number[]>([50, 100, 150, 200]);
  const [history, setHistory] = useState<DailyEntry[]>([]);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">(() => load("theme", "light"));
  const [customFoods, setCustomFoods] = useState<Food[]>([]);
  const [waterIntake, setWaterIntake] = useState<number>(0);
  const [waterGoal, setWaterGoalState] = useState<number>(2000);

  // Firebase auth & global foods states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalFoods, setGlobalFoods] = useState<Food[]>([]);

  // Profile modal control state
  const [openProfile, setOpenProfile] = useState(false);

  // Master Admin state
  const [isAdmin, setIsAdmin] = useState(false);

  // Helper to update Firebase settings
  const updateFirebaseSettings = async (patch: FirebaseSettingsPatch) => {
    if (user && fbDb) {
      const userRef = doc(fbDb, "users", user.uid, "profile", "settings");
      await setDoc(userRef, patch, { merge: true });
    }
  };

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

    // Fallback: If Firebase Auth fails to initialize (e.g., IndexedDB blocked on mobile),
    // force unlock the UI after 8 seconds.
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(fbAuth, async (u) => {
      clearTimeout(fallbackTimer);
      setUser(u);
      if (u) {
        setLoading(true);
        try {
          // Wrap in timeouts to prevent infinite loading and clear timeout to prevent unhandled rejections
          const withTimeout = <T,>(promise: Promise<T>, ms: number, msg: string): Promise<T> => {
            let timer: ReturnType<typeof setTimeout>;
            const timeoutPromise = new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error(msg)), ms);
            });
            return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
          };
          
          await withTimeout(checkAndMigrate(u), 5000, "checkAndMigrate timeout");

          // Verify admin status dynamically from both custom claims and 'admins' collection
          let adminStatus = false;
          try {
            const idTokenResult = await withTimeout(u.getIdTokenResult(), 3000, "getIdTokenResult timeout");
            if (idTokenResult && idTokenResult.claims.admin === true) {
              adminStatus = true;
            }
          } catch (tokenErr) {
            console.error("Failed to fetch id token claims:", tokenErr);
          }

          if (!adminStatus && fbDb) {
            const adminDocRef = doc(fbDb, "admins", u.uid);
            const adminDocSnap = await withTimeout(getDoc(adminDocRef), 3000, "admin getDoc timeout");
            adminStatus = adminDocSnap ? adminDocSnap.exists() : false;
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
        setSelected([]);
        setAddingToMeal(null);
        setProfileState({ name: "", age: 28, gender: "male", weight: 70, height: 175, activityLevel: 1.375, goal: "maintain" });
        setSavedMeals([]);
        setRecentFoods([]);
        setRecentQuantities([50, 100, 150, 200]);
        setHistory([]);
        setWeightHistory([]);
        setCustomFoods([]);
        setWaterIntake(0);
        setWaterGoalState(2000);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Real-time Firestore sync for logged-in user
  useEffect(() => {
    setWeightHistory([]);
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

    const weightRef = collection(fbDb, "users", user.uid, "weight_logs");
    const unsubWeight = onSnapshot(weightRef, (snapshot) => {
      const list = snapshot.docs.map((entry) => entry.data() as WeightEntry);
      list.sort((a, b) => a.date.localeCompare(b.date));
      setWeightHistory(list);
    }, (error) => {
      console.error("Failed to load weight history:", error);
      toast({ title: "Unable to load weight history", description: "Please reload and try again.", variant: "destructive" });
    });

    return () => {
      unsubSettings();
      unsubMeals();
      unsubCustom();
      unsubHistory();
      unsubWeight();
    };
  }, [user]);

  // Load admin-curated foods; USDA foods are searched on demand through the Worker.
  useEffect(() => {
    if (!isFirebaseConfigured || !fbDb) {
      return;
    }

    const globalFoodsRef = collection(fbDb, "global_foods");
    const unsubscribe = onSnapshot(globalFoodsRef, (snapshot) => {
      const list: Food[] = [];
      snapshot.forEach((doc) => list.push(doc.data() as Food));
      setGlobalFoods(list);
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
        if (item.loggedDate) return item;
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
  const checkAndMigrate = async (u: FirebaseUser) => {
    if (!fbDb) return;

    // 1. Settings initialization
    const settingsRef = doc(fbDb, "users", u.uid, "profile", "settings");
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      // First time login: trigger configuration modal
      setOpenProfile(true);

      const emptyProfile: Profile = {
        name: u.displayName || "",
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
  const rda = useMemo(() => {
    const estimated = computeRDA(profile) ?? RDA_DEFAULT;
    const supportsCustomTargets = profile.age >= 19 && !profile.isPregnant && !profile.isLactating;
    return profile.useCustomTargets && supportsCustomTargets
      ? applyCoreTargetOverrides(estimated, profile.customTargets)
      : estimated;
  }, [profile]);

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
    } catch (err: unknown) {
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

  const signUp = async (email: string, pass: string, name?: string) => {
    if (!isFirebaseConfigured || !fbAuth) throw new Error("Firebase is not configured");
    const cred = await createUserWithEmailAndPassword(fbAuth, email, pass);
    if (name && cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
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

  const reportPlateError = (error: unknown) => {
    console.error("Plate update failed:", error);
    toast({ title: "Plate update failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
  };

  // Read and write the plate transactionally so another tab cannot overwrite a logged marker.
  const changePlate = async (change: (items: SelectedFood[]) => SelectedFood[]) => {
    if (plateLock.current) throw new Error("Please wait for the current plate update.");
    plateLock.current = true;
    setPlateBusy(true);
    try {
      let next: SelectedFood[];
      if (user && fbDb) {
        const settingsRef = doc(fbDb, "users", user.uid, "profile", "settings");
        next = await runTransaction(fbDb, async (transaction) => {
          const settings = await transaction.get(settingsRef);
          const items: SelectedFood[] = settings.data()?.selected ?? [];
          const updated = change(items);
          transaction.set(settingsRef, { selected: updated }, { merge: true });
          return updated;
        });
      } else {
        next = change(selectedRef.current);
      }
      selectedRef.current = next;
      setSelected(next);
    } finally {
      plateLock.current = false;
      setPlateBusy(false);
    }
  };

  const getEditableGroup = (items: SelectedFood[], id: string) => {
    const members = items.filter((item) => item.mealGroup?.id === id);
    if (!members.length) throw new Error("This meal is no longer on your plate.");
    if (members.some((item) => item.loggedDate)) throw new Error("Logged meals cannot be edited. Add foods outside this meal instead.");
    return members[0].mealGroup!;
  };

  const addFood: Ctx["addFood"] = async (food, groupId = addingToMeal) => {
    const uid = crypto.randomUUID();
    await changePlate((items) => {
      const group = groupId ? getEditableGroup(items, groupId) : undefined;
      if (items.some((item) => item.food.id === food.id && !item.loggedDate && (item.mealGroup?.id ?? null) === (groupId ?? null))) {
        throw new Error(`"${food.name}" is already here. Adjust its quantity, or add it to another meal.`);
      }
      const item: SelectedFood = {
        uid, food, quantity: food.baseUnit === "pieces" ? 1 : food.baseQuantity, unit: food.baseUnit,
        ...(group ? { mealGroup: group } : {}),
      };
      return [...items, item];
    });
    setRecentFoods((r) => [food, ...r.filter((f) => f.id !== food.id)].slice(0, 8));
  };

  const updateItem: Ctx["updateItem"] = (uid, patch) => {
    void changePlate((items) => items.map((item) => {
      if (item.uid !== uid) return item;
      if (item.loggedDate) throw new Error("Logged foods are read-only to keep recorded calories unchanged.");
      const updated = { ...item, ...patch };
      if (patch.unit && patch.unit !== "portion") delete updated.portion;
      return updated;
    })).then(async () => {
      if (patch.quantity && Number.isFinite(patch.quantity)) {
        const next = Array.from(new Set([patch.quantity, ...recentQuantities])).slice(0, 6);
        await updateFirebaseSettings({ recentQuantities: next });
        setRecentQuantities(next);
      }
    }).catch(reportPlateError);
  };

  const removeItem = (uid: string) => {
    void changePlate((items) => {
      if (items.find((item) => item.uid === uid)?.loggedDate) throw new Error("Delete the logged wrap instead; its recorded calories will stay in history.");
      return items.filter((item) => item.uid !== uid);
    }).catch(reportPlateError);
  };

  const clearAll = () => {
    void changePlate(() => []).then(() => setAddingToMeal(null)).catch(reportPlateError);
  };

  const wrapMeal = async (name: string) => {
    const id = crypto.randomUUID();
    await changePlate((items) => wrapMealItems(items, id, name));
  };

  const unwrapMeal = async (id: string) => {
    await changePlate((items) => {
      if (!items.some((item) => item.mealGroup?.id === id)) throw new Error("This meal is no longer on your plate.");
      return items.map((item) => {
        if (item.mealGroup?.id !== id) return item;
        const { mealGroup, ...unwrapped } = item;
        return unwrapped;
      });
    });
    setAddingToMeal(null);
  };

  const deleteWrappedMeal = async (id: string) => {
    await changePlate((items) => {
      if (!items.some((item) => item.mealGroup?.id === id)) throw new Error("This meal is no longer on your plate.");
      return items.filter((item) => item.mealGroup?.id !== id);
    });
    if (addingToMeal === id) setAddingToMeal(null);
  };

  const saveMeal = async (name: string, items = selected) => {
    if (!name.trim() || items.length === 0) throw new Error("Enter a meal name and add at least one food.");
    const newMeal: SavedMeal = {
      id: `meal-${crypto.randomUUID()}`,
      name: name.trim(),
      items: mealTemplateItems(items),
      savedAt: new Date().toISOString()
    };

    if (user && fbDb) {
      await setDoc(doc(fbDb, "users", user.uid, "saved_meals", newMeal.id), newMeal);
    } else {
      setSavedMeals((m) => [newMeal, ...m]);
    }
  };

  const loadMealToPlate: Ctx["loadMealToPlate"] = async (meal, groupId = addingToMeal) => {
    const id = groupId ?? crypto.randomUUID();
    const template = mealTemplateItems(meal.items);
    if (!template.length) throw new Error("This saved meal has no foods to add.");
    const loaded = template.map((item) => ({ ...item, uid: crypto.randomUUID() }));
    await changePlate((items) => {
      const group = groupId ? getEditableGroup(items, groupId) : { id, name: meal.name };
      return [...items, ...loaded.map((item) => ({ ...item, mealGroup: group }))];
    });
    return id;
  };

  const loadMeal = async (id: string) => {
    const meal = savedMeals.find((item) => item.id === id);
    if (!meal) throw new Error("This saved meal is no longer available.");
    return loadMealToPlate(meal, null);
  };

  const deleteMeal = async (id: string) => {
    if (user && fbDb) {
      await deleteDoc(doc(fbDb, "users", user.uid, "saved_meals", id));
    } else {
      setSavedMeals((m) => m.filter((x) => x.id !== id));
    }
  };

  // Helper to get local date string (YYYY-MM-DD) without UTC shift
  const getLocalDateStr = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const logDay = async (customTotals?: ReturnType<typeof sumNutrition>, customCount?: number, targetDate?: string) => {
    if (!customTotals) return logWrappedMeal();
    const today = targetDate || getLocalDateStr();
    const currentTotals = customTotals;
    const currentCount = customCount ?? selected.length;
    if (user && fbDb) {
      const logRef = doc(fbDb, "users", user.uid, "daily_logs", today);
      await runTransaction(fbDb, async (transaction) => {
        const log = await transaction.get(logRef);
        transaction.set(logRef, addToDailyEntry(log.data() as DailyEntry | undefined, currentTotals, currentCount, today));
      });
    } else {
      setHistory((h) => {
        const next = addToDailyEntry(h.find((entry) => entry.date === today), currentTotals, currentCount, today);
        return [...h.filter((entry) => entry.date !== today), next].sort((a, b) => a.date.localeCompare(b.date));
      });
    }
  };

  const logWrappedMeal = async (id?: string) => {
    if (plateLock.current) throw new Error("Please wait for the current plate update.");
    plateLock.current = true;
    setPlateBusy(true);
    const date = getLocalDateStr();
    const prepareLog = (items: SelectedFood[], existing?: DailyEntry) => {
      const eligible = unloggedMealItems(items, id);
      const ids = new Set(eligible.map((item) => item.uid));
      return {
        items: items.map((item) => ids.has(item.uid) ? { ...item, loggedDate: date } : item),
        entry: addToDailyEntry(existing, sumNutrition(eligible), eligible.length, date),
      };
    };
    try {
      let next: SelectedFood[];
      if (user && fbDb) {
        const settingsRef = doc(fbDb, "users", user.uid, "profile", "settings");
        const logRef = doc(fbDb, "users", user.uid, "daily_logs", date);
        next = await runTransaction(fbDb, async (transaction) => {
          const settings = await transaction.get(settingsRef);
          const log = await transaction.get(logRef);
          const result = prepareLog(settings.data()?.selected ?? [], log.data() as DailyEntry | undefined);
          transaction.set(settingsRef, { selected: result.items }, { merge: true });
          transaction.set(logRef, result.entry);
          return result.items;
        });
      } else {
        const result = prepareLog(selectedRef.current, history.find((entry) => entry.date === date));
        next = result.items;
        setHistory((entries) => [...entries.filter((entry) => entry.date !== date), result.entry].sort((a, b) => a.date.localeCompare(b.date)));
      }
      selectedRef.current = next;
      setSelected(next);
      if (!id || addingToMeal === id) setAddingToMeal(null);
    } finally {
      plateLock.current = false;
      setPlateBusy(false);
    }
  };

  const updateLogCalories = async (date: string, calories: number) => {
    const entry = history.find((h) => h.date === date);
    let updatedEntry;
    
    if (entry) {
      updatedEntry = {
        ...entry,
        totals: {
          ...entry.totals,
          calories: calories
        }
      };
    } else {
      updatedEntry = {
        date,
        totals: {
          ...emptyTotals(),
          calories: calories
        },
        itemCount: 0
      };
    }

    if (user && fbDb) {
      await setDoc(doc(fbDb, "users", user.uid, "daily_logs", date), updatedEntry);
    } else {
      setHistory((h) => {
        const others = h.filter((d) => d.date !== date);
        return [...others, updatedEntry].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
      });
    }
  };

  const saveWeightEntry = async (date: string, weight: number) => {
    const parsedDate = parseISO(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValid(parsedDate) ||
      format(parsedDate, "yyyy-MM-dd") !== date || date > getLocalDateStr()) {
      throw new Error("Choose a valid date that is not in the future.");
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error("Enter a weight greater than zero in kg.");
    }
    if (!user || !fbDb) throw new Error("Sign in to save weight entries.");
    await setDoc(doc(fbDb, "users", user.uid, "weight_logs", date), { date, weight });
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
    const nextProfile = { ...p };
    if (nextProfile.age < 19 || nextProfile.isPregnant || nextProfile.isLactating) {
      nextProfile.useCustomTargets = false;
    }
    setProfileState(nextProfile);

    if (user && fbDb) {
      try {
        await updateFirebaseSettings({ profile: nextProfile });
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
      wrapMeal, unwrapMeal, deleteWrappedMeal, logWrappedMeal, plateBusy, addingToMeal, setAddingToMeal,
      recentFoods, recentQuantities,
      logDay, updateLogCalories, history,
      weightHistory, saveWeightEntry,
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
