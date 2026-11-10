import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { api, errorMessage } from "./api";
import { activeWorkoutStore, clearActiveWorkout, startWorkoutFromDay } from "./activeWorkout";
import { useUser } from "./auth";
import type { Plan, PlanDay, SetEntry } from "./types";

type LastSets = Record<string, { sets: SetEntry[] }>;

/** Starts logging a plan day (or an empty freestyle workout), asking first if one is already in progress. */
export function useStartWorkout() {
  const router = useRouter();
  const user = useUser();
  const [starting, setStarting] = useState(false);

  const confirmReplace = () =>
    new Promise<boolean>((resolve) => {
      if (!activeWorkoutStore.get()) return resolve(true);
      Alert.alert("Workout in progress", "You already have a workout going. Resume it or start fresh?", [
        { text: "Resume", onPress: () => { router.push("/workout"); resolve(false); } },
        { text: "Discard & start new", style: "destructive", onPress: () => { void clearActiveWorkout().then(() => resolve(true)); } },
      ]);
    });

  async function startDay(planId: string, planDayId: string, preloaded?: Plan, scheduledId?: string | null) {
    if (!(await confirmReplace())) return;
    setStarting(true);
    try {
      const plan = preloaded ?? (await api.get<Plan>(`/plans/${planId}`));
      const day = plan.days.find((d) => d.id === planDayId);
      if (!day) throw new Error("That workout day no longer exists");
      const ids = [...new Set(day.exercises.map((e) => e.exerciseId))];
      const last = ids.length ? await api.get<LastSets>(`/workouts/last?exerciseIds=${ids.join(",")}`) : {};
      activeWorkoutStore.set({ ...startWorkoutFromDay(day, plan.id, last, user.units), scheduledId: scheduledId ?? null });
      router.push("/workout");
    } catch (e) {
      Alert.alert("Couldn't start workout", errorMessage(e));
    } finally {
      setStarting(false);
    }
  }

  async function startEmpty(name = "Freestyle workout", scheduledId: string | null = null) {
    if (!(await confirmReplace())) return;
    activeWorkoutStore.set({ name, planId: null, planDayId: null, scheduledId, startedAt: new Date().toISOString(), notes: "", exercises: [] });
    router.push("/workout");
  }

  /** Start whatever a booking or "next up" points at: its plan day, or a freestyle workout with its name. */
  async function startNext(n: { planId: string | null; planDayId: string | null; scheduledId: string | null; name: string }) {
    if (n.planId && n.planDayId) return startDay(n.planId, n.planDayId, undefined, n.scheduledId);
    return startEmpty(n.name, n.scheduledId);
  }

  /** Start from an unsaved day (e.g. a template preview). */
  async function startFromDay(day: PlanDay) {
    if (!(await confirmReplace())) return;
    activeWorkoutStore.set(startWorkoutFromDay({ ...day, id: undefined }, null, {}, user.units));
    router.push("/workout");
  }

  return { starting, startDay, startEmpty, startFromDay, startNext };
}
