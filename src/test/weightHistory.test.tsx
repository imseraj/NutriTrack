import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { NutritionProvider, useNutrition } from "@/context/NutritionContext";

const firebase = vi.hoisted(() => ({
  authListener: undefined as ((user: unknown) => void) | undefined,
  weightListener: undefined as ((snapshot: unknown) => void) | undefined,
  setDoc: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  auth: {}, db: {}, isFirebaseConfigured: true,
}));

vi.mock("firebase/auth", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase/auth")>(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    firebase.authListener = callback;
    return firebase.unsubscribe;
  }),
}));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  collection: (_db: unknown, ...parts: string[]) => parts.join("/"),
  getDoc: vi.fn().mockResolvedValue({ exists: () => true }),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: firebase.setDoc,
  onSnapshot: (path: string, callback: (snapshot: unknown) => void) => {
    if (path.endsWith("/weight_logs")) firebase.weightListener = callback;
    return firebase.unsubscribe;
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => <NutritionProvider>{children}</NutritionProvider>;

beforeEach(() => {
  vi.clearAllMocks();
  firebase.authListener = undefined;
  firebase.weightListener = undefined;
});

afterEach(cleanup);

async function signedInProvider() {
  const hook = renderHook(() => useNutrition(), { wrapper });
  await act(async () => firebase.authListener?.({
    uid: "user-1",
    getIdTokenResult: async () => ({ claims: { admin: true } }),
  }));
  await waitFor(() => expect(hook.result.current.user?.uid).toBe("user-1"));
  return hook;
}

describe("weight history persistence", () => {
  it("writes dated entries to the user's account without changing profile weight", async () => {
    const { result } = await signedInProvider();
    const originalWeight = result.current.profile.weight;
    await act(async () => result.current.saveWeightEntry("2026-01-01", 71.5));
    expect(firebase.setDoc).toHaveBeenCalledWith(
      "users/user-1/weight_logs/2026-01-01", { date: "2026-01-01", weight: 71.5 },
    );
    await act(async () => result.current.saveWeightEntry("2026-01-01", 71));
    expect(firebase.setDoc).toHaveBeenLastCalledWith(
      "users/user-1/weight_logs/2026-01-01", { date: "2026-01-01", weight: 71 },
    );
    expect(result.current.profile.weight).toBe(originalWeight);
  });

  it("loads history in chronological order and clears it on sign-out", async () => {
    const { result, unmount } = await signedInProvider();
    act(() => firebase.weightListener?.({
      docs: [
        { data: () => ({ date: "2026-01-02", weight: 71 }) },
        { data: () => ({ date: "2026-01-01", weight: 72 }) },
      ],
    }));
    expect(result.current.weightHistory.map((entry) => entry.weight)).toEqual([72, 71]);
    await act(async () => firebase.authListener?.(null));
    expect(result.current.weightHistory).toEqual([]);
    unmount();
    expect(firebase.unsubscribe).toHaveBeenCalled();
  });

  it("rejects invalid measurements and dates before writing", async () => {
    const { result } = await signedInProvider();
    for (const weight of [0, -1, NaN, Infinity]) {
      await expect(result.current.saveWeightEntry("2026-01-01", weight)).rejects.toThrow("greater than zero");
    }
    for (const date of ["", "2026-02-30", "2099-01-01", "2026/01/01"]) {
      await expect(result.current.saveWeightEntry(date, 70)).rejects.toThrow("valid date");
    }
    expect(firebase.setDoc).not.toHaveBeenCalled();
  });

  it("requires authentication and propagates failed writes", async () => {
    const { result } = renderHook(() => useNutrition(), { wrapper });
    await expect(result.current.saveWeightEntry("2026-01-01", 70)).rejects.toThrow("Sign in");
    await act(async () => firebase.authListener?.({
      uid: "user-1",
      getIdTokenResult: async () => ({ claims: { admin: true } }),
    }));
    firebase.setDoc.mockRejectedValueOnce(new Error("Permission denied"));
    await expect(result.current.saveWeightEntry("2026-01-01", 70)).rejects.toThrow("Permission denied");
  });
});
