import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Chip, ChipGroup, Empty, ErrorView, Loading, Row, Screen, SectionTitle, Small } from "../../components/ui";
import { BarChart, LineChart } from "../../components/charts";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { shortDate, tzOffset } from "../../lib/dates";
import { MUSCLE_LABEL } from "../../lib/labels";
import type { AllTimeStats, BodyMetric, Exercise, WeeklyStat } from "../../lib/types";
import { formatVolume, formatWeight, toDisplayWeight, weightUnit } from "../../lib/units";
import { colors } from "../../lib/theme";

type Metric = "workouts" | "minutes" | "volume";

export default function Progress() {
  const user = useUser();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("workouts");
  const weekly = useQuery({ queryKey: ["weekly"], queryFn: () => api.get<WeeklyStat[]>(`/progress/weekly?weeks=12&tzOffset=${tzOffset()}`) });
  const body = useQuery({ queryKey: ["body"], queryFn: () => api.get<BodyMetric[]>("/metrics/body") });
  const alltime = useQuery({ queryKey: ["alltime"], queryFn: () => api.get<AllTimeStats>(`/progress/alltime?tzOffset=${tzOffset()}`) });
  const logged = useQuery({
    queryKey: ["loggedExercises"],
    queryFn: () => api.get<{ exercise: Pick<Exercise, "id" | "name" | "type" | "primaryMuscle">; setCount: number }[]>("/progress/exercises"),
  });

  if (weekly.isPending) return <Loading />;
  if (weekly.isError) return <ErrorView message={errorMessage(weekly.error)} onRetry={() => weekly.refetch()} />;

  const bars = weekly.data.map((w) => ({
    label: `${+w.weekStart.slice(5, 7)}/${+w.weekStart.slice(8, 10)}`,
    value: metric === "workouts" ? w.workouts : metric === "minutes" ? w.minutes : toDisplayWeight(w.volumeKg, user.units),
  }));
  const thisWeek = weekly.data[weekly.data.length - 1];
  const avg = weekly.data.slice(0, -1).reduce((n, w) => n + w.workouts, 0) / Math.max(1, weekly.data.length - 1);
  const weights = (body.data ?? []).map((b) => ({ label: shortDate(b.date), value: toDisplayWeight(b.weightKg, user.units) }));
  const latest = body.data?.[body.data.length - 1];
  const first = body.data?.[0];

  return (
    <Screen
      tabRoot
      title="Progress"
      refreshing={weekly.isRefetching}
      onRefresh={() => {
        void weekly.refetch();
        void body.refetch();
        void logged.refetch();
        void alltime.refetch();
      }}
    >
      <Card onPress={() => router.push("/stats")} style={{ backgroundColor: colors.dark }}>
        <Row>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: "#fff" }}>All-time stats</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Row>
        <Row gap={4}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#fff" }}>{alltime.data?.totals.workouts ?? "-"}</Text>
            <Small style={{ color: "#9CA3AF" }}>workouts</Small>
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#fff" }}>{alltime.data ? Math.round(alltime.data.totals.minutes / 60) : "-"}</Text>
            <Small style={{ color: "#9CA3AF" }}>hours</Small>
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#fff" }}>{alltime.data ? formatVolume(alltime.data.totals.volumeKg, user.units) : "-"}</Text>
            <Small style={{ color: "#9CA3AF" }}>lifted</Small>
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary }}>{alltime.data?.longestStreak ?? "-"}</Text>
            <Small style={{ color: "#9CA3AF" }}>best streak</Small>
          </View>
        </Row>
      </Card>
      <Card>
        <Row>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: colors.text }}>Last 12 weeks</Text>
        </Row>
        <ChipGroup>
          <Chip label="Workouts" selected={metric === "workouts"} onPress={() => setMetric("workouts")} />
          <Chip label="Minutes" selected={metric === "minutes"} onPress={() => setMetric("minutes")} />
          <Chip label={`Volume (${weightUnit(user.units)})`} selected={metric === "volume"} onPress={() => setMetric("volume")} />
        </ChipGroup>
        <BarChart data={bars} />
        <Small>
          This week: {thisWeek?.workouts ?? 0} workout{thisWeek?.workouts === 1 ? "" : "s"} · 11-week average: {avg.toFixed(1)}/week
        </Small>
      </Card>

      <SectionTitle action={<Button title="Log" icon="add" size="sm" variant="secondary" onPress={() => router.push("/body-weight")} />}>Body weight</SectionTitle>
      <Card onPress={() => router.push("/body-weight")}>
        {weights.length ? (
          <>
            <Row>
              <Text style={{ flex: 1, fontSize: 24, fontWeight: "800", color: colors.text }}>{formatWeight(latest!.weightKg, user.units)}</Text>
              {first && latest && first.id !== latest.id && (
                <Small style={{ color: latest.weightKg <= first.weightKg ? colors.success : colors.warning, fontWeight: "700" }}>
                  {latest.weightKg <= first.weightKg ? "▼" : "▲"} {formatWeight(Math.abs(latest.weightKg - first.weightKg), user.units)} since {shortDate(first.date)}
                </Small>
              )}
            </Row>
            <LineChart data={weights.slice(-30)} />
          </>
        ) : (
          <Small>Log your weight to see your trend.</Small>
        )}
      </Card>

      <SectionTitle>Exercises</SectionTitle>
      {logged.data?.length ? (
        logged.data.map(({ exercise, setCount }) => (
          <Card key={exercise.id} onPress={() => router.push({ pathname: "/exercise/[id]", params: { id: exercise.id } })}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{exercise.name}</Text>
                <Small>
                  {MUSCLE_LABEL[exercise.primaryMuscle]} · {setCount} sets logged
                </Small>
              </View>
              <Ionicons name="trending-up" size={20} color={colors.primary} />
            </Row>
          </Card>
        ))
      ) : (
        <Empty icon="stats-chart-outline" title="No exercise data yet" body="Finish a workout and your strength and endurance progress will show up here." />
      )}
    </Screen>
  );
}
