import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, Button, Card, Chip, ChipGroup, Field, IconButton, Row, Screen, SectionTitle, Small, Stat } from "../components/ui";
import { prescription } from "../components/PlanBits";
import { MuscleDiagram } from "../components/MuscleDiagram";
import { api, errorMessage } from "../lib/api";
import { useUser } from "../lib/auth";
import {
  activeWorkoutStore,
  addSet,
  buildActiveExercise,
  clearActiveWorkout,
  toWorkoutPayload,
  type ActiveExercise,
  type ActiveWorkout,
  type LoggedSet,
} from "../lib/activeWorkout";
import { exercisePicker } from "../lib/pickers";
import type { PersonalRecord, SetEntry, Units, WorkoutSummary } from "../lib/types";
import { clock, distanceUnit, formatDistance, formatDuration, formatVolume, formatWeight, toDisplayDistance, toDisplayWeight, weightUnit } from "../lib/units";
import { colors, radius, space } from "../lib/theme";

type Phase = "logging" | "finishing" | "done";

export default function WorkoutScreen() {
  const user = useUser();
  const router = useRouter();
  const qc = useQueryClient();
  const workout = activeWorkoutStore.use();
  const [phase, setPhase] = useState<Phase>("logging");
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null);
  const [result, setResult] = useState<{ workout: WorkoutSummary; prs: PersonalRecord[] } | null>(null);

  // `workout` becomes null once saved; keep showing the summary.
  if (phase === "done" && result) {
    return (
      <Done
        result={result}
        units={user.units}
        onClose={() => {
          void qc.invalidateQueries();
          router.back();
        }}
      />
    );
  }
  if (!workout) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Workout" }} />
        <Card>
          <Text style={{ fontSize: 16, color: colors.text }}>No workout in progress.</Text>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const update = (fn: (w: ActiveWorkout) => ActiveWorkout) => activeWorkoutStore.set((w) => (w ? fn(w) : w));
  const updateExercise = (key: string, fn: (e: ActiveExercise) => ActiveExercise) =>
    update((w) => ({ ...w, exercises: w.exercises.map((e) => (e.key === key ? fn(e) : e)) }));

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  const toggleSet = (ex: ActiveExercise, set: LoggedSet) => {
    const nowDone = !set.done;
    updateExercise(ex.key, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === set.id ? { ...s, done: nowDone } : s)) }));
    if (nowDone) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (ex.restSec > 0) setRest({ endsAt: Date.now() + ex.restSec * 1000, total: ex.restSec });
    }
  };

  const addExercises = () => {
    exercisePicker.open(async (picked) => {
      let last: Record<string, { sets: SetEntry[] }> = {};
      try {
        last = await api.get(`/workouts/last?exerciseIds=${picked.map((p) => p.id).join(",")}`);
      } catch {
        // Pre-fill is a nicety; carry on without it.
      }
      const added = picked.map((ex) => {
        const cardio = ex.type === "CARDIO" && (ex.equipment === "none" || ex.equipment === "machine");
        return buildActiveExercise(
          { exercise: ex, sets: cardio ? 1 : 3, reps: "10", restSec: cardio ? 0 : 90, durationSec: cardio ? 1200 : null, distanceKm: null, notes: "" },
          last[ex.id]?.sets ?? null,
          user.units,
        );
      });
      update((w) => ({ ...w, exercises: [...w.exercises, ...added] }));
    });
    router.push("/exercise-picker");
  };

  const leave = () => {
    Alert.alert("Leave workout?", "Your progress is saved. You can resume from the Today tab.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave", onPress: () => router.back() },
      {
        text: "Discard workout",
        style: "destructive",
        onPress: () =>
          Alert.alert("Discard this workout?", "Logged sets will be lost.", [
            { text: "Cancel", style: "cancel" },
            { text: "Discard", style: "destructive", onPress: () => { void clearActiveWorkout(); router.back(); } },
          ]),
      },
    ]);
  };

  const startFinish = () => {
    const filledButUndone = workout.exercises.some((e) => e.sets.some((s) => !s.done && hasValues(e, s)));
    if (doneSets === 0 && !filledButUndone) return Alert.alert("No sets completed", "Tap the check next to a set to mark it done.");
    if (filledButUndone) {
      Alert.alert("Some sets aren't checked off", "Mark every filled-in set as done?", [
        { text: "Cancel", style: "cancel" },
        { text: "Only checked sets", onPress: () => (doneSets ? setPhase("finishing") : Alert.alert("No sets completed")) },
        {
          text: "Mark all done",
          onPress: () => {
            update((w) => ({ ...w, exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => (hasValues(e, s) ? { ...s, done: true } : s)) })) }));
            setPhase("finishing");
          },
        },
      ]);
      return;
    }
    setPhase("finishing");
  };

  if (phase === "finishing") {
    return (
      <Finish
        workout={workout}
        units={user.units}
        onBack={() => setPhase("logging")}
        onSaved={(r) => {
          setResult(r);
          setPhase("done");
          void clearActiveWorkout();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen
        options={{
          title: workout.name,
          headerLeft: () => <IconButton label="Leave workout" icon="chevron-down" color={colors.primary} onPress={leave} />,
          headerRight: () => <Button title="Finish" size="sm" onPress={startFinish} />,
        }}
      />
      <Screen>
        <Row gap={3}>
          <View style={[statBox]}>
            <Small>Time</Small>
            <Elapsed since={workout.startedAt} />
          </View>
          <View style={[statBox]}>
            <Small>Sets done</Small>
            <Text style={statText}>
              {doneSets}/{totalSets}
            </Text>
          </View>
        </Row>

        {workout.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.key}
            ex={ex}
            index={i}
            units={user.units}
            onToggle={(s) => toggleSet(ex, s)}
            onChangeSet={(id, patch) => updateExercise(ex.key, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }))}
            onAddSet={() => updateExercise(ex.key, (e) => addSet(e, user.units))}
            onRemoveSet={() => updateExercise(ex.key, (e) => ({ ...e, sets: e.sets.slice(0, -1) }))}
            onRemove={() => update((w) => ({ ...w, exercises: w.exercises.filter((e) => e.key !== ex.key) }))}
          />
        ))}
        <Button title="Add exercise" icon="add" variant="secondary" onPress={addExercises} />
        <Button title="Finish workout" icon="flag" variant="dark" onPress={startFinish} />
        {rest && <View style={{ height: 80 }} />}
      </Screen>
      {rest && <RestTimer rest={rest} onChange={setRest} />}
    </View>
  );
}

const statBox = { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space(3), gap: 2 } as const;
const statText = { fontSize: 22, fontWeight: "800" as const, color: colors.text, fontVariant: ["tabular-nums" as const] };

function hasValues(e: ActiveExercise, s: LoggedSet) {
  if (e.mode === "weights") return !!s.reps;
  if (e.mode === "timed") return !!s.seconds;
  return !!s.minutes || !!s.distance;
}

function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const h = Math.floor(sec / 3600);
  return <Text style={statText}>{h ? `${h}:${clock(sec % 3600).padStart(5, "0")}` : clock(sec)}</Text>;
}

function previousLabel(ex: ActiveExercise, units: Units) {
  if (!ex.previous?.length) return null;
  if (ex.mode === "weights") {
    return ex.previous.map((s) => (s.weightKg ? `${toDisplayWeight(s.weightKg, units)}×${s.reps ?? "?"}` : `${s.reps ?? "?"} reps`)).join(", ");
  }
  if (ex.mode === "timed") return ex.previous.map((s) => formatDuration(s.durationSec)).join(", ");
  return ex.previous.map((s) => [s.durationSec ? formatDuration(s.durationSec) : null, s.distanceKm ? formatDistance(s.distanceKm, units) : null].filter(Boolean).join(" · ")).join(", ");
}

function ExerciseCard({
  ex,
  index,
  units,
  onToggle,
  onChangeSet,
  onAddSet,
  onRemoveSet,
  onRemove,
}: {
  ex: ActiveExercise;
  index: number;
  units: Units;
  onToggle: (s: LoggedSet) => void;
  onChangeSet: (id: string, patch: Partial<LoggedSet>) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
  onRemove: () => void;
}) {
  const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.done);
  const prev = previousLabel(ex, units);
  const bodyweight = ex.exercise.equipment === "bodyweight" || ex.exercise.equipment === "none" || ex.exercise.equipment === "band";
  const columns =
    ex.mode === "weights"
      ? [weightUnit(units), "reps"]
      : ex.mode === "timed"
        ? ["seconds"]
        : ["minutes", distanceUnit(units)];

  return (
    <Card style={allDone ? { borderWidth: 2, borderColor: colors.success } : undefined}>
      <Row style={{ alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>
            {index + 1}. {ex.exercise.name}
          </Text>
          <Small>
            Target {prescription({ sets: ex.sets.length, reps: ex.targetReps, durationSec: ex.targetDurationSec, distanceKm: ex.targetDistanceKm }, units)}
            {ex.restSec ? ` · rest ${formatDuration(ex.restSec)}` : ""}
          </Small>
          {prev && (
            <Small style={{ color: colors.info }}>
              <Ionicons name="time-outline" size={12} /> Last time: {prev}
            </Small>
          )}
          {ex.notes ? <Small style={{ fontStyle: "italic" }}>{ex.notes}</Small> : null}
        </View>
        <MuscleDiagram primary={ex.exercise.primaryMuscle} secondary={ex.exercise.secondaryMuscles} size={46} />
        <IconButton
          label="Exercise options"
          icon="ellipsis-horizontal"
          color={colors.muted}
          onPress={() =>
            Alert.alert(ex.exercise.name, ex.exercise.instructions || "No instructions for this exercise.", [
              { text: "Remove from workout", style: "destructive", onPress: onRemove },
              { text: "Close", style: "cancel" },
            ])
          }
        />
      </Row>

      <View style={{ flexDirection: "row", paddingHorizontal: 4, marginTop: space(1) }}>
        <Text style={[colHead, { width: 36 }]}>SET</Text>
        {columns.map((c) => (
          <Text key={c} style={[colHead, { flex: 1, textAlign: "center" }]}>
            {c.toUpperCase()}
          </Text>
        ))}
        <View style={{ width: 44 }} />
      </View>

      {ex.sets.map((s, i) => (
        <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: space(2), paddingVertical: 4, paddingHorizontal: 4, borderRadius: radius.sm, backgroundColor: s.done ? colors.successSoft : "transparent" }}>
          <Text style={{ width: 28, fontWeight: "800", color: colors.muted, textAlign: "center" }}>{i + 1}</Text>
          {ex.mode === "weights" && (
            <>
              <SetInput value={s.weight} placeholder={bodyweight ? "BW" : "0"} decimal onChange={(t) => onChangeSet(s.id, { weight: t })} done={s.done} />
              <SetInput value={s.reps} placeholder={/^\d+/.test(ex.targetReps) ? ex.targetReps.split("-")[0] : "0"} onChange={(t) => onChangeSet(s.id, { reps: t })} done={s.done} />
            </>
          )}
          {ex.mode === "timed" && <SetInput value={s.seconds} placeholder={String(ex.targetDurationSec ?? 30)} onChange={(t) => onChangeSet(s.id, { seconds: t })} done={s.done} />}
          {ex.mode === "cardio" && (
            <>
              <SetInput value={s.minutes} placeholder="0" decimal onChange={(t) => onChangeSet(s.id, { minutes: t })} done={s.done} />
              <SetInput value={s.distance} placeholder={ex.targetDistanceKm ? String(toDisplayDistance(ex.targetDistanceKm, units)) : "-"} decimal onChange={(t) => onChangeSet(s.id, { distance: t })} done={s.done} />
            </>
          )}
          <Pressable
            accessibilityLabel={s.done ? "Mark set not done" : "Mark set done"}
            onPress={() => onToggle(s)}
            hitSlop={6}
            style={{ width: 40, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: s.done ? colors.success : colors.bg }}
          >
            <Ionicons name="checkmark" size={22} color={s.done ? "#fff" : colors.faint} />
          </Pressable>
        </View>
      ))}

      <Row gap={2} style={{ marginTop: space(1) }}>
        <Button title="Add set" icon="add" variant="ghost" size="sm" style={{ flex: 1 }} onPress={onAddSet} />
        {ex.sets.length > 1 && <Button title="Remove set" icon="remove" variant="ghost" size="sm" style={{ flex: 1 }} onPress={onRemoveSet} />}
      </Row>
    </Card>
  );
}

const colHead = { fontSize: 11, fontWeight: "700" as const, color: colors.faint, letterSpacing: 0.5 };

function SetInput({ value, onChange, placeholder, decimal, done }: { value: string; onChange: (t: string) => void; placeholder: string; decimal?: boolean; done: boolean }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ""))}
      placeholder={placeholder}
      placeholderTextColor={colors.faint}
      keyboardType={decimal ? "decimal-pad" : "number-pad"}
      selectTextOnFocus
      maxLength={6}
      style={{
        flex: 1,
        minWidth: 0,
        height: 38,
        borderRadius: radius.sm,
        backgroundColor: done ? "transparent" : colors.bg,
        textAlign: "center",
        fontSize: 17,
        fontWeight: "700",
        color: colors.text,
        fontVariant: ["tabular-nums"],
      }}
    />
  );
}

function RestTimer({ rest, onChange }: { rest: { endsAt: number; total: number }; onChange: (r: { endsAt: number; total: number } | null) => void }) {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [rest.endsAt]);
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const t = setTimeout(() => onChange(null), 1500);
      return () => clearTimeout(t);
    }
  }, [left, onChange]);
  const pct = Math.min(1, 1 - (rest.endsAt - now) / (rest.total * 1000));

  return (
    <View style={{ position: "absolute", left: space(4), right: space(4), bottom: insets.bottom + space(3), backgroundColor: colors.dark, borderRadius: radius.lg, padding: space(4), gap: space(2), shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16 }}>
      <Row>
        <Ionicons name="timer-outline" size={22} color={colors.primary} />
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"], flex: 1 }}>{left === 0 ? "Go! Next set" : `Rest ${clock(left)}`}</Text>
        <Button title="+15s" size="sm" variant="secondary" onPress={() => onChange({ endsAt: rest.endsAt + 15_000, total: rest.total + 15 })} />
        <Button title="Skip" size="sm" variant="onDark" onPress={() => onChange(null)} />
      </Row>
      <View style={{ height: 4, backgroundColor: "#374151", borderRadius: 2, overflow: "hidden" }}>
        <View style={{ width: `${pct * 100}%`, height: 4, backgroundColor: colors.primary }} />
      </View>
    </View>
  );
}

const EFFORT = [
  { value: 3, label: "Easy" },
  { value: 5, label: "Moderate" },
  { value: 7, label: "Hard" },
  { value: 9, label: "Very hard" },
  { value: 10, label: "All out" },
];

function Finish({ workout, units, onBack, onSaved }: { workout: ActiveWorkout; units: Units; onBack: () => void; onSaved: (r: { workout: WorkoutSummary; prs: PersonalRecord[] }) => void }) {
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState(workout.notes);
  const [saving, setSaving] = useState(false);
  const payload = toWorkoutPayload(workout, units, { effort, notes });
  const sets = payload.exercises.reduce((n, e) => n + e.sets.length, 0);

  const save = async () => {
    setSaving(true);
    try {
      onSaved(await api.post("/workouts", payload));
    } catch (e) {
      setSaving(false);
      Alert.alert("Couldn't save workout", `${errorMessage(e)}\n\nYour workout is still saved on this phone. Try again when you're back online.`);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button title="Save workout" icon="checkmark" onPress={save} loading={saving} />
          <Button title="Keep logging" variant="ghost" size="md" onPress={onBack} />
        </>
      }
    >
      <Stack.Screen options={{ title: "Finish workout", headerLeft: () => null, headerRight: () => null }} />
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>Nice work! 💪</Text>
      <Small>
        {payload.exercises.length} exercises · {sets} sets · {Math.max(1, Math.round((Date.now() - new Date(workout.startedAt).getTime()) / 60000))} min
      </Small>
      <SectionTitle>How hard was it?</SectionTitle>
      <ChipGroup>
        {EFFORT.map((e) => (
          <Chip key={e.value} label={e.label} selected={effort === e.value} onPress={() => setEffort(effort === e.value ? null : e.value)} />
        ))}
      </ChipGroup>
      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="How did it feel? Anything to remember next time?" multiline style={{ minHeight: 90, textAlignVertical: "top" }} />
    </Screen>
  );
}

function Done({ result, units, onClose }: { result: { workout: WorkoutSummary; prs: PersonalRecord[] }; units: Units; onClose: () => void }) {
  const w = result.workout;
  return (
    <Screen footer={<Button title="Done" onPress={onClose} />}>
      <Stack.Screen options={{ title: "", headerLeft: () => null, headerRight: () => null }} />
      <View style={{ alignItems: "center", gap: space(2), paddingVertical: space(4) }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="trophy" size={42} color={colors.success} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text }}>Workout complete!</Text>
        <Small>{w.name}</Small>
      </View>
      <Row gap={3}>
        <Stat label="Minutes" value={w.durationMin} icon="time-outline" />
        <Stat label="Sets" value={w.setCount} icon="layers-outline" />
        <Stat label="Volume" value={w.volumeKg ? formatVolume(w.volumeKg, units) : "-"} icon="barbell-outline" />
      </Row>
      {result.prs.length > 0 && (
        <Card style={{ backgroundColor: colors.warningSoft }}>
          <Row>
            <Ionicons name="star" size={20} color={colors.warning} />
            <Text style={{ fontWeight: "800", fontSize: 16, color: colors.text }}>New personal records!</Text>
          </Row>
          {result.prs.map((p) => (
            <Row key={p.exerciseId}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: "600" }}>{p.name}</Text>
              <Badge
                tone="warning"
                label={p.kind === "distance" ? formatDistance(p.value, units) : `${p.kind === "e1rm" ? "Est. 1RM " : ""}${formatWeight(p.value, units)}`}
              />
            </Row>
          ))}
        </Card>
      )}
      <Small style={{ textAlign: "center" }}>Every session counts. See you next time!</Small>
    </Screen>
  );
}
