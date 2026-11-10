import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Card, Empty, ErrorView, Loading, Row, Screen, SectionTitle, Small, Stat } from "../components/ui";
import { BarChart } from "../components/charts";
import { MuscleDiagram } from "../components/MuscleDiagram";
import { api, errorMessage } from "../lib/api";
import { useUser } from "../lib/auth";
import { shortDate, tzOffset } from "../lib/dates";
import { MUSCLE_LABEL, WEEKDAYS_LONG, WEEKDAYS_SHORT, WEEK_ORDER } from "../lib/labels";
import type { AllTimeStats } from "../lib/types";
import { formatDistance, formatVolume, formatWeight } from "../lib/units";
import { colors, radius, space } from "../lib/theme";

export default function Stats() {
  const user = useUser();
  const router = useRouter();
  const q = useQuery({ queryKey: ["alltime"], queryFn: () => api.get<AllTimeStats>(`/progress/alltime?tzOffset=${tzOffset()}`) });

  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorView message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const s = q.data;
  const t = s.totals;
  if (t.workouts === 0) {
    return (
      <Screen>
        <Empty icon="trophy-outline" title="No stats yet" body="Finish your first workout and your all-time numbers start adding up here." />
      </Screen>
    );
  }

  const hours = Math.round((t.minutes / 60) * 10) / 10;
  const since = s.firstWorkoutAt ? new Date(s.firstWorkoutAt) : null;
  const sinceLabel = since ? since.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  const maxMuscle = Math.max(1, ...s.muscles.map((m) => m.sets));
  const totalMuscleSets = Math.max(1, s.muscles.reduce((n, m) => n + m.sets, 0));
  const months = s.byMonth.map((m) => ({ label: new Date(`${m.month}-15T12:00:00`).toLocaleDateString(undefined, { month: "short" }), value: m.workouts }));
  const weekdays = WEEK_ORDER.map((w) => ({ label: WEEKDAYS_SHORT[w], value: s.byWeekday[w] ?? 0 }));
  const favouriteDay = WEEK_ORDER.reduce((best, w) => ((s.byWeekday[w] ?? 0) > (s.byWeekday[best] ?? 0) ? w : best), WEEK_ORDER[0]);

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <Card style={{ backgroundColor: colors.dark, gap: space(1) }}>
        <Text style={{ color: "#9CA3AF", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 }}>All time</Text>
        <Row style={{ alignItems: "flex-end" }}>
          <Text style={{ color: "#fff", fontSize: 56, fontWeight: "800", lineHeight: 60 }}>{t.workouts}</Text>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700", paddingBottom: 8 }}>workout{t.workouts === 1 ? "" : "s"}</Text>
        </Row>
        <Small style={{ color: "#9CA3AF" }}>
          Since {sinceLabel} · {s.avgPerWeek}/week on average · {s.activeWeeks} active week{s.activeWeeks === 1 ? "" : "s"}
        </Small>
      </Card>

      <Row gap={3}>
        <Stat label="Hours trained" value={hours} icon="time-outline" />
        <Stat label="Total volume" value={formatVolume(t.volumeKg, user.units)} icon="barbell-outline" />
      </Row>
      <Row gap={3}>
        <Stat label="Sets" value={t.sets.toLocaleString()} icon="layers-outline" />
        <Stat label="Reps" value={t.reps.toLocaleString()} icon="repeat-outline" />
      </Row>
      <Row gap={3}>
        <Stat label="Distance" value={t.distanceKm ? formatDistance(t.distanceKm, user.units) : "-"} icon="walk-outline" />
        <Stat label="Cardio minutes" value={t.cardioMinutes ? t.cardioMinutes.toLocaleString() : "-"} icon="heart-outline" />
      </Row>

      <SectionTitle>Consistency</SectionTitle>
      <Card>
        <Row gap={3}>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.primary }}>{s.currentStreak}</Text>
            <Small>Current streak</Small>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text }}>{s.longestStreak}</Text>
            <Small>Longest streak</Small>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text }}>{s.bestWeek?.workouts ?? 0}</Text>
            <Small>Best week</Small>
          </View>
        </Row>
        <Small>
          Streaks count weeks hitting your {s.weeklyTarget}-day target.
          {s.bestWeek ? ` Best week started ${shortDate(s.bestWeek.weekStart)}.` : ""} You train most often on {WEEKDAYS_LONG[favouriteDay]}s.
        </Small>
        <BarChart data={weekdays} height={120} highlightLast={false} labelEvery={1} />
      </Card>

      <SectionTitle>Last 12 months</SectionTitle>
      <Card>
        <BarChart data={months} height={150} />
      </Card>

      <SectionTitle>Personal bests</SectionTitle>
      {s.longestWorkout && (
        <RecordCard icon="time" label="Longest workout" value={`${s.longestWorkout.durationMin} min`} sub={`${s.longestWorkout.name} · ${shortDate(s.longestWorkout.date)}`} onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.longestWorkout!.id } })} />
      )}
      {s.biggestVolume && (
        <RecordCard icon="barbell" label="Biggest session" value={formatVolume(s.biggestVolume.volumeKg, user.units)} sub={`${s.biggestVolume.name} · ${shortDate(s.biggestVolume.date)}`} onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.biggestVolume!.id } })} />
      )}
      {s.farthest && (
        <RecordCard icon="walk" label="Farthest in one workout" value={formatDistance(s.farthest.distanceKm, user.units)} sub={`${s.farthest.name} · ${shortDate(s.farthest.date)}`} onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.farthest!.id } })} />
      )}

      <SectionTitle>Muscles trained</SectionTitle>
      <Card style={{ gap: space(2.5) }}>
        {s.muscles.map((m) => (
          <View key={m.muscle} style={{ gap: 4 }}>
            <Row>
              <Text style={{ flex: 1, fontWeight: "600", color: colors.text }}>{MUSCLE_LABEL[m.muscle] ?? m.muscle}</Text>
              <Small>
                {m.sets} sets · {Math.round((m.sets / totalMuscleSets) * 100)}%
              </Small>
            </Row>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.bg, overflow: "hidden" }}>
              <View style={{ width: `${Math.max(3, (m.sets / maxMuscle) * 100)}%`, height: "100%", backgroundColor: colors.primary, borderRadius: 4 }} />
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle>Most trained exercises</SectionTitle>
      {s.topExercises.map((x, i) => (
        <Card key={x.exercise.id} onPress={() => router.push({ pathname: "/exercise/[id]", params: { id: x.exercise.id } })}>
          <Row gap={3}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: i < 3 ? colors.primarySoft : colors.bg, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: i < 3 ? colors.primary : colors.muted }}>{i + 1}</Text>
            </View>
            <MuscleDiagram primary={x.exercise.primaryMuscle} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{x.exercise.name}</Text>
              <Small>
                {x.sessions} workout{x.sessions === 1 ? "" : "s"} · {x.sets} sets
              </Small>
            </View>
            {x.maxWeightKg > 0 ? (
              <Badge tone="primary" icon="trophy" label={formatWeight(x.maxWeightKg, user.units)} />
            ) : x.longestDistanceKm > 0 ? (
              <Badge tone="primary" icon="trophy" label={formatDistance(x.longestDistanceKm, user.units)} />
            ) : null}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

function RecordCard({ icon, label, value, sub, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string; sub: string; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <Row gap={3}>
        <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Small>{label}</Small>
          <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{value}</Text>
          <Small>{sub}</Small>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Row>
    </Card>
  );
}
