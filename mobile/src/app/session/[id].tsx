import { Alert, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Card, ErrorView, IconButton, Loading, Row, Screen, Small, Stat } from "../../components/ui";
import { MuscleDiagram } from "../../components/MuscleDiagram";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { relativeDay, timeOfDay } from "../../lib/dates";
import type { SetEntry, Units, WorkoutDetail } from "../../lib/types";
import { formatDistance, formatDuration, formatVolume, toDisplayWeight, weightUnit } from "../../lib/units";
import { colors, space } from "../../lib/theme";

const EFFORT_LABEL: Record<number, string> = { 3: "Easy", 5: "Moderate", 7: "Hard", 9: "Very hard", 10: "All out" };

function setLabel(s: SetEntry, units: Units) {
  const parts: string[] = [];
  if (s.weightKg) parts.push(`${toDisplayWeight(s.weightKg, units)} ${weightUnit(units)}`);
  if (s.reps != null) parts.push(`${s.reps} reps`);
  if (s.durationSec) parts.push(formatDuration(s.durationSec));
  if (s.distanceKm) parts.push(formatDistance(s.distanceKm, units));
  return parts.join(" × ") || "-";
}

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUser();
  const router = useRouter();
  const qc = useQueryClient();
  const w = useQuery({ queryKey: ["workout", id], queryFn: () => api.get<WorkoutDetail>(`/workouts/${id}`) });
  const remove = useMutation({
    mutationFn: () => api.del(`/workouts/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries();
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't delete", errorMessage(e)),
  });

  if (w.isPending) return <Loading />;
  if (w.isError) return <ErrorView message={errorMessage(w.error)} onRetry={() => w.refetch()} />;
  const d = w.data;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <IconButton
              label="Delete workout"
              icon="trash-outline"
              color={colors.danger}
              onPress={() =>
                Alert.alert("Delete this workout?", "This can't be undone.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
                ])
              }
            />
          ),
        }}
      />
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{d.name}</Text>
        <Small>
          {relativeDay(d.completedAt)} at {timeOfDay(d.startedAt)}
          {d.planName ? ` · ${d.planName}` : ""}
        </Small>
        {d.effort ? <Badge tone="primary" label={`Effort: ${EFFORT_LABEL[d.effort] ?? `${d.effort}/10`}`} /> : null}
      </View>
      <Row gap={3}>
        <Stat label="Minutes" value={d.durationMin} icon="time-outline" />
        <Stat label="Sets" value={d.setCount} icon="layers-outline" />
        <Stat label="Volume" value={d.volumeKg ? formatVolume(d.volumeKg, user.units) : "-"} icon="barbell-outline" />
      </Row>
      {d.notes ? (
        <Card>
          <Small>Notes</Small>
          <Text style={{ color: colors.text, fontSize: 15 }}>{d.notes}</Text>
        </Card>
      ) : null}
      {d.exercises.map((g, i) => (
        <Card key={i} onPress={() => router.push({ pathname: "/exercise/[id]", params: { id: g.exercise.id } })}>
          <Row>
            <MuscleDiagram primary={g.exercise.primaryMuscle} secondary={g.exercise.secondaryMuscles} size={38} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "800", color: colors.text }}>{g.exercise.name}</Text>
            <Small style={{ color: colors.primary }}>Progress ›</Small>
          </Row>
          <View style={{ gap: space(1) }}>
            {g.sets.map((s, j) => (
              <Row key={j}>
                <Text style={{ width: 24, color: colors.muted, fontWeight: "700" }}>{j + 1}</Text>
                <Text style={{ color: colors.text, fontSize: 15 }}>{setLabel(s, user.units)}</Text>
              </Row>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
