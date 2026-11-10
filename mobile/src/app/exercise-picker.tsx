import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Chip, ChipGroup, ErrorView, Field, Loading, tap } from "../components/ui";
import { MuscleDiagram } from "../components/MuscleDiagram";
import { api, errorMessage } from "../lib/api";
import { MUSCLES, MUSCLE_LABEL } from "../lib/labels";
import { exercisePicker } from "../lib/pickers";
import type { Exercise, ExerciseType, MuscleGroup } from "../lib/types";
import { colors, space } from "../lib/theme";

export default function ExercisePicker() {
  const router = useRouter();
  const qc = useQueryClient();
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: () => api.get<Exercise[]>("/exercises"), staleTime: 5 * 60_000 });
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (exercises.data ?? []).filter((e) => (!muscle || e.primaryMuscle === muscle) && (!q || e.name.toLowerCase().includes(q)));
  }, [exercises.data, search, muscle]);

  const toggle = (e: Exercise) => {
    tap();
    setSelected((s) => (s.some((x) => x.id === e.id) ? s.filter((x) => x.id !== e.id) : [...s, e]));
  };

  const done = () => {
    exercisePicker.resolve(selected);
    router.back();
  };

  if (exercises.isPending) return <Loading />;
  if (exercises.isError) return <ErrorView message={errorMessage(exercises.error)} onRetry={() => exercises.refetch()} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: space(4), paddingBottom: space(2), gap: space(3) }}>
        <Field placeholder="Search exercises" value={search} onChangeText={setSearch} autoCorrect={false} clearButtonMode="while-editing" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space(2) }}>
          <Chip label="All" selected={!muscle} onPress={() => setMuscle(null)} />
          {MUSCLES.map((m) => (
            <Chip key={m.value} label={m.label} selected={muscle === m.value} onPress={() => setMuscle(muscle === m.value ? null : m.value)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(4), gap: space(2) }}
        ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: "center", marginTop: space(6) }}>No exercises match.</Text>}
        ListFooterComponent={
          creating ? (
            <CustomExerciseForm
              initialName={search}
              onCreated={(ex) => {
                setCreating(false);
                setSelected((s) => [...s, ex]);
                void qc.invalidateQueries({ queryKey: ["exercises"] });
              }}
              onCancel={() => setCreating(false)}
            />
          ) : (
            <Button title="Create a custom exercise" icon="add" variant="ghost" size="md" style={{ marginTop: space(2) }} onPress={() => setCreating(true)} />
          )
        }
        renderItem={({ item }) => {
          const on = selected.some((s) => s.id === item.id);
          return (
            <Pressable onPress={() => toggle(item)} style={{ flexDirection: "row", alignItems: "center", gap: space(3), backgroundColor: colors.card, padding: space(3), borderRadius: 14, borderWidth: 2, borderColor: on ? colors.primary : "transparent" }}>
              <MuscleDiagram primary={item.primaryMuscle} secondary={item.secondaryMuscles} size={42} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{item.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>
                  {MUSCLE_LABEL[item.primaryMuscle]} · {item.equipment}
                  {item.ownerId ? " · custom" : ""}
                </Text>
              </View>
              <Ionicons name={on ? "checkmark-circle" : "add-circle-outline"} size={26} color={on ? colors.primary : colors.faint} />
            </Pressable>
          );
        }}
      />
      <View style={{ padding: space(4), paddingBottom: space(8), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg }}>
        <Button title={selected.length ? `Add ${selected.length} exercise${selected.length > 1 ? "s" : ""}` : "Select exercises"} disabled={!selected.length} onPress={done} />
      </View>
    </View>
  );
}

function CustomExerciseForm({ initialName, onCreated, onCancel }: { initialName: string; onCreated: (e: Exercise) => void; onCancel: () => void }) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<MuscleGroup>("chest");
  const [type, setType] = useState<ExerciseType>("STRENGTH");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) return Alert.alert("Name your exercise");
    setSaving(true);
    try {
      onCreated(await api.post<Exercise>("/exercises", { name: name.trim(), primaryMuscle: muscle, type, equipment: type === "CARDIO" ? "none" : "bodyweight" }));
    } catch (e) {
      setSaving(false);
      Alert.alert("Couldn't create exercise", errorMessage(e));
    }
  };
  return (
    <Card style={{ marginTop: space(2), gap: space(3) }}>
      <Text style={{ fontWeight: "800", fontSize: 16, color: colors.text }}>New custom exercise</Text>
      <Field placeholder="Exercise name" value={name} onChangeText={setName} autoFocus />
      <ChipGroup>
        {(["STRENGTH", "CARDIO", "MOBILITY"] as const).map((t) => (
          <Chip key={t} label={t.charAt(0) + t.slice(1).toLowerCase()} selected={type === t} onPress={() => setType(t)} />
        ))}
      </ChipGroup>
      <ChipGroup>
        {MUSCLES.map((m) => (
          <Chip key={m.value} label={m.label} selected={muscle === m.value} onPress={() => setMuscle(m.value)} />
        ))}
      </ChipGroup>
      <View style={{ flexDirection: "row", gap: space(2) }}>
        <Button title="Cancel" variant="ghost" size="md" style={{ flex: 1 }} onPress={onCancel} />
        <Button title="Create" size="md" style={{ flex: 1 }} onPress={save} loading={saving} />
      </View>
    </Card>
  );
}
