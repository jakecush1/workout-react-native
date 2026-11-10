import { useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card, Chip, ChipGroup, Empty, ErrorView, Loading, Row, Screen, SectionTitle, Small, Stat } from "../../components/ui";
import { LineChart } from "../../components/charts";
import { MuscleDiagram } from "../../components/MuscleDiagram";
import { MUSCLE_LABEL } from "../../lib/labels";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { relativeDay, shortDate } from "../../lib/dates";
import type { ExerciseProgress } from "../../lib/types";
import { distanceUnit, formatDistance, formatDuration, formatWeight, toDisplayDistance, toDisplayWeight, weightUnit } from "../../lib/units";
import { colors } from "../../lib/theme";

type View_ = "e1rm" | "weight" | "volume" | "reps" | "distance" | "duration";

export default function ExerciseProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUser();
  const router = useRouter();
  const q = useQuery({ queryKey: ["exerciseProgress", id], queryFn: () => api.get<ExerciseProgress>(`/progress/exercise/${id}`) });
  const [view, setView] = useState<View_ | null>(null);

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const { exercise, points, records } = q.data;
  const u = user.units;
  const isCardio = records.longestDistanceKm > 0 || (records.maxWeightKg === 0 && records.longestDurationSec > 0);
  const hasWeight = records.maxWeightKg > 0;
  const options: { key: View_; label: string }[] = isCardio
    ? [
        { key: "distance", label: `Distance (${distanceUnit(u)})` },
        { key: "duration", label: "Time (min)" },
      ]
    : hasWeight
      ? [
          { key: "e1rm", label: "Est. 1-rep max" },
          { key: "weight", label: "Top weight" },
          { key: "volume", label: "Volume" },
        ]
      : [{ key: "reps", label: "Best reps" }, { key: "duration", label: "Time (s)" }];
  const active = view && options.some((o) => o.key === view) ? view : options[0].key;

  const series = points.map((p) => ({
    label: shortDate(p.date),
    value:
      active === "e1rm" ? toDisplayWeight(p.est1RMKg, u)
      : active === "weight" ? toDisplayWeight(p.bestWeightKg, u)
      : active === "volume" ? toDisplayWeight(p.volumeKg, u)
      : active === "reps" ? p.bestReps
      : active === "distance" ? toDisplayDistance(p.totalDistanceKm, u)
      : isCardio ? Math.round(p.totalDurationSec / 6) / 10
      : p.totalDurationSec,
  }));

  return (
    <Screen>
      <Stack.Screen options={{ title: exercise.name }} />
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{exercise.name}</Text>
      <Card>
        <Row gap={4} style={{ alignItems: "flex-start" }}>
          <MuscleDiagram primary={exercise.primaryMuscle} secondary={exercise.secondaryMuscles} size={92} labels />
          <View style={{ flex: 1, gap: 4 }}>
            <Small style={{ fontWeight: "700", color: colors.primary }}>
              {MUSCLE_LABEL[exercise.primaryMuscle] ?? exercise.primaryMuscle}
              {exercise.secondaryMuscles?.length ? ` · also ${exercise.secondaryMuscles.map((m) => MUSCLE_LABEL[m] ?? m).join(", ")}` : ""}
            </Small>
            {exercise.instructions ? <Small style={{ color: colors.text }}>{exercise.instructions}</Small> : null}
          </View>
        </Row>
      </Card>
      {points.length === 0 ? (
        <Empty icon="stats-chart-outline" title="Not logged yet" body="Do this exercise in a workout to start tracking it." />
      ) : (
        <>
          <SectionTitle>Personal records</SectionTitle>
          <Row gap={3}>
            {isCardio ? (
              <>
                <Stat label="Longest distance" value={formatDistance(records.longestDistanceKm, u)} icon="navigate-outline" tone={colors.primary} />
                <Stat label="Longest time" value={formatDuration(records.longestDurationSec)} icon="time-outline" />
              </>
            ) : hasWeight ? (
              <>
                <Stat label="Top weight" value={formatWeight(records.maxWeightKg, u)} icon="barbell-outline" tone={colors.primary} />
                <Stat label="Est. 1RM" value={formatWeight(records.best1RMKg, u)} icon="trophy-outline" />
                <Stat label="Most reps" value={records.maxReps} icon="repeat-outline" />
              </>
            ) : (
              <>
                <Stat label="Most reps" value={records.maxReps} icon="repeat-outline" tone={colors.primary} />
                <Stat label="Longest hold" value={formatDuration(records.longestDurationSec)} icon="time-outline" />
              </>
            )}
          </Row>
          <Card>
            <ChipGroup>
              {options.map((o) => (
                <Chip key={o.key} label={o.label} selected={active === o.key} onPress={() => setView(o.key)} />
              ))}
            </ChipGroup>
            <LineChart data={series} />
            {active === "e1rm" && <Small>Estimated from your best set each session (Epley formula).</Small>}
          </Card>
          <SectionTitle>Sessions</SectionTitle>
          {[...points].reverse().map((p) => (
            <Card key={p.sessionId} onPress={() => router.push({ pathname: "/session/[id]", params: { id: p.sessionId } })}>
              <Row>
                <Text style={{ flex: 1, fontWeight: "700", color: colors.text }}>{relativeDay(p.date)}</Text>
                <Small>
                  {isCardio
                    ? [p.totalDistanceKm ? formatDistance(p.totalDistanceKm, u) : null, p.totalDurationSec ? formatDuration(p.totalDurationSec) : null].filter(Boolean).join(" · ")
                    : hasWeight
                      ? `Top ${toDisplayWeight(p.bestWeightKg, u)} ${weightUnit(u)} · best ${p.bestReps} reps`
                      : `Best ${p.bestReps} reps`}
                </Small>
              </Row>
            </Card>
          ))}
        </>
      )}
      <View />
    </Screen>
  );
}
