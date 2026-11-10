import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, ChipGroup, Empty, Field, IconButton, Row, Screen, SectionTitle, Small, Stepper } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { WEEK_ORDER, WEEKDAYS_SHORT } from "../../lib/labels";
import { draftHolder, exercisePicker } from "../../lib/pickers";
import type { Exercise, Plan, PlanDay, PlanDraft, PlanExercise } from "../../lib/types";
import { colors, radius, space } from "../../lib/theme";

type EditDay = PlanDay & { key: string };
let keySeq = 0;
const k = () => `d${keySeq++}`;

function defaultsFor(ex: Exercise): Omit<PlanExercise, "exercise" | "exerciseId"> {
  if (ex.type === "CARDIO" && (ex.equipment === "none" || ex.equipment === "machine")) {
    return { sets: 1, reps: "1", restSec: 0, durationSec: 20 * 60, distanceKm: null, notes: "" };
  }
  if (ex.id === "plank" || ex.id === "side-plank" || ex.id === "wall-sit") {
    return { sets: 3, reps: "1", restSec: 45, durationSec: 30, distanceKm: null, notes: "" };
  }
  return { sets: 3, reps: "10", restSec: 90, durationSec: null, distanceKm: null, notes: "" };
}

export default function EditPlan() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const initial = draftHolder.draft;
  const [name, setName] = useState(initial?.name ?? "My plan");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [days, setDays] = useState<EditDay[]>(() => (initial?.days ?? []).map((d) => ({ ...d, key: k() })));
  const [saving, setSaving] = useState(false);

  if (!initial) return <Empty icon="alert-circle-outline" title="Nothing to edit" action={<Button title="Go back" onPress={() => router.back()} />} />;

  const updateDay = (key: string, patch: Partial<EditDay>) => setDays((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const updateEx = (key: string, idx: number, patch: Partial<PlanExercise>) =>
    setDays((ds) => ds.map((d) => (d.key === key ? { ...d, exercises: d.exercises.map((e, i) => (i === idx ? { ...e, ...patch } : e)) } : d)));
  const moveEx = (key: string, idx: number, dir: -1 | 1) =>
    setDays((ds) =>
      ds.map((d) => {
        if (d.key !== key) return d;
        const j = idx + dir;
        if (j < 0 || j >= d.exercises.length) return d;
        const ex = [...d.exercises];
        [ex[idx], ex[j]] = [ex[j], ex[idx]];
        return { ...d, exercises: ex };
      }),
    );

  const addExercises = (key: string) => {
    exercisePicker.open((picked) =>
      setDays((ds) =>
        ds.map((d) => (d.key === key ? { ...d, exercises: [...d.exercises, ...picked.map((ex) => ({ exerciseId: ex.id, exercise: ex, ...defaultsFor(ex) }))] } : d)),
      ),
    );
    router.push("/exercise-picker");
  };

  const addDay = () => {
    const used = new Set(days.map((d) => d.weekday));
    const free = WEEK_ORDER.find((w) => !used.has(w)) ?? null;
    setDays([...days, { key: k(), name: `Day ${days.length + 1}`, weekday: free, notes: "", exercises: [] }]);
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert("Give your plan a name");
    if (!days.length) return Alert.alert("Add at least one day");
    const emptyDay = days.find((d) => d.exercises.length === 0);
    if (emptyDay) return Alert.alert(`"${emptyDay.name}" has no exercises`, "Add exercises or remove the day.");
    const taken = days.map((d) => d.weekday).filter((w) => w !== null);
    if (new Set(taken).size !== taken.length) return Alert.alert("Two days are on the same weekday", "Each training day needs its own weekday (or none).");

    const body: Omit<PlanDraft, "days"> & { days: unknown[]; activate?: boolean; dayIds?: (string | null)[] } = {
      name: name.trim(),
      description,
      goal: initial.goal,
      source: initial.source,
      templateId: initial.templateId ?? null,
      days: days.map((d) => ({
        name: d.name.trim() || "Workout",
        weekday: d.weekday,
        notes: d.notes,
        exercises: d.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps.trim() || "10",
          restSec: e.restSec,
          durationSec: e.durationSec,
          distanceKm: e.distanceKm,
          notes: e.notes,
        })),
      })),
    };
    setSaving(true);
    try {
      let plan: Plan;
      if (id) {
        plan = await api.put<Plan>(`/plans/${id}`, { ...body, dayIds: days.map((d) => d.id ?? null) });
      } else {
        plan = await api.post<Plan>("/plans", { ...body, activate: true });
      }
      draftHolder.draft = null;
      await qc.invalidateQueries();
      if (id) router.back();
      else {
        router.dismissAll();
        router.push({ pathname: "/plan/[id]", params: { id: plan.id, created: "1" } });
      }
    } catch (e) {
      setSaving(false);
      Alert.alert("Couldn't save plan", errorMessage(e));
    }
  };

  return (
    <Screen footer={<Button title={id ? "Save changes" : "Save plan"} onPress={save} loading={saving} />}>
      <Field label="Plan name" value={name} onChangeText={setName} maxLength={80} />
      <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline style={{ minHeight: 60, textAlignVertical: "top" }} />

      {days.map((d) => (
        <Card key={d.key} style={{ gap: space(3) }}>
          <Row>
            <TextInput
              value={d.name}
              onChangeText={(t) => updateDay(d.key, { name: t })}
              style={{ flex: 1, fontSize: 18, fontWeight: "800", color: colors.text, paddingVertical: 4 }}
              maxLength={60}
            />
            <IconButton
              label="Remove day"
              icon="trash-outline"
              color={colors.danger}
              onPress={() =>
                Alert.alert(`Remove ${d.name}?`, undefined, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: () => setDays(days.filter((x) => x.key !== d.key)) },
                ])
              }
            />
          </Row>
          <ChipGroup>
            {WEEK_ORDER.map((w) => (
              <Chip key={w} label={WEEKDAYS_SHORT[w]} selected={d.weekday === w} onPress={() => updateDay(d.key, { weekday: d.weekday === w ? null : w })} />
            ))}
          </ChipGroup>

          {d.exercises.map((e, i) => {
            const timed = e.durationSec !== null;
            return (
              <View key={`${e.exerciseId}-${i}`} style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: space(3), gap: space(2) }}>
                <Row>
                  <Text style={{ flex: 1, fontWeight: "700", fontSize: 15, color: colors.text }}>{e.exercise.name}</Text>
                  <IconButton label="Move up" icon="chevron-up" size={18} color={i === 0 ? colors.border : colors.muted} onPress={() => moveEx(d.key, i, -1)} />
                  <IconButton label="Move down" icon="chevron-down" size={18} color={i === d.exercises.length - 1 ? colors.border : colors.muted} onPress={() => moveEx(d.key, i, 1)} />
                  <IconButton label="Remove" icon="close" size={18} color={colors.danger} onPress={() => updateDay(d.key, { exercises: d.exercises.filter((_, j) => j !== i) })} />
                </Row>
                <Row gap={3} style={{ flexWrap: "wrap" }}>
                  <View style={{ gap: 4 }}>
                    <Small>Sets</Small>
                    <Stepper value={e.sets} min={1} max={20} onChange={(v) => updateEx(d.key, i, { sets: v })} />
                  </View>
                  {timed ? (
                    <MiniField
                      label={e.durationSec! >= 300 ? "Minutes" : "Seconds"}
                      value={String(e.durationSec! >= 300 ? Math.round(e.durationSec! / 60) : e.durationSec)}
                      onChange={(t) => {
                        const n = parseInt(t, 10) || 0;
                        updateEx(d.key, i, { durationSec: Math.max(1, e.durationSec! >= 300 ? n * 60 : n) });
                      }}
                    />
                  ) : (
                    <MiniField label="Reps" value={e.reps} onChange={(t) => updateEx(d.key, i, { reps: t })} keyboard="default" />
                  )}
                  <MiniField label="Rest (s)" value={String(e.restSec)} onChange={(t) => updateEx(d.key, i, { restSec: Math.min(900, parseInt(t, 10) || 0) })} />
                </Row>
              </View>
            );
          })}
          <Button title="Add exercises" icon="add" variant="secondary" size="md" onPress={() => addExercises(d.key)} />
        </Card>
      ))}

      {days.length < 7 && <Button title="Add a day" icon="add-circle-outline" variant="ghost" onPress={addDay} />}
      <SectionTitle>Tip</SectionTitle>
      <Small>Reps can be a number, a range like 8-12, or AMRAP (as many reps as possible).</Small>
    </Screen>
  );
}

function MiniField({ label, value, onChange, keyboard = "number-pad" }: { label: string; value: string; onChange: (t: string) => void; keyboard?: "number-pad" | "default" }) {
  return (
    <View style={{ gap: 4 }}>
      <Small>{label}</Small>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        selectTextOnFocus
        maxLength={keyboard === "default" ? 20 : 4}
        style={{ width: 76, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space(3), paddingVertical: space(2), fontSize: 16, fontWeight: "600", color: colors.text, textAlign: "center" }}
      />
    </View>
  );
}
