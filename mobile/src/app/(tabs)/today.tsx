import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Body, Button, Card, Empty, ErrorView, Loading, Row, Screen, SectionTitle, Small, Stat } from "../../components/ui";
import { ProgressRing } from "../../components/charts";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { activeWorkoutStore } from "../../lib/activeWorkout";
import { useStartWorkout } from "../../lib/useStartWorkout";
import { dayKey, dayLabel, formatClockTime, relativeDay, tzOffset } from "../../lib/dates";
import { WEEKDAYS_LONG, WEEKDAYS_SHORT } from "../../lib/labels";
import type { DayStatus, NextWorkout, ProgressSummary } from "../../lib/types";
import { colors, radius, space } from "../../lib/theme";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Today() {
  const user = useUser();
  const router = useRouter();
  const active = activeWorkoutStore.use();
  const { startNext, startEmpty, starting } = useStartWorkout();
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => api.get<ProgressSummary>(`/progress/summary?tzOffset=${tzOffset()}`),
  });

  if (summary.isPending) return <Loading />;
  if (summary.isError) return <ErrorView message={errorMessage(summary.error)} onRetry={() => summary.refetch()} />;
  const s = summary.data;
  const missed = s.thisWeek.days.filter((d) => d.status === "missed");
  const remaining = Math.max(0, s.thisWeek.target - s.thisWeek.done);

  return (
    <Screen
      tabRoot
      title={`${greeting()}, ${user.name}`}
      subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      refreshing={summary.isRefetching}
      onRefresh={() => summary.refetch()}
    >
      {active && (
        <Card onPress={() => router.push("/workout")} style={{ backgroundColor: colors.dark }}>
          <Row>
            <Ionicons name="play-circle" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Resume {active.name}</Text>
              <Small style={{ color: "#9CA3AF" }}>Workout in progress</Small>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Row>
        </Card>
      )}

      {s.nextWorkout ? (
        <NextUp s={s} starting={starting} onStart={(n) => void startNext(n)} />
      ) : !s.activePlan ? (
        <Empty
          icon="sparkles-outline"
          title="Let's build your plan"
          body="Pick a pre-made plan, answer a few questions for a custom one, or build your own from scratch."
          action={<Button title="Create a plan" icon="add" onPress={() => router.push("/plan/new")} />}
        />
      ) : (
        <NextUp s={s} starting={starting} onStart={(n) => void startNext(n)} />
      )}

      {s.activePlan && missed.length > 0 && !s.todayDone && (
        <Card style={{ backgroundColor: colors.warningSoft }}>
          <Row style={{ alignItems: "flex-start" }}>
            <Ionicons name="alert-circle" size={22} color={colors.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontWeight: "700", color: colors.text }}>
                You missed {missed.map((d) => WEEKDAYS_LONG[d.weekday]).join(" and ")}
              </Text>
              <Small style={{ color: colors.text }}>
                No stress. Get a session in today and you're back on track. {remaining > 0 ? `${remaining} to go this week.` : ""}
              </Small>
            </View>
          </Row>
        </Card>
      )}

      <SectionTitle>This week</SectionTitle>
      <Card>
        <Row gap={4}>
          <ProgressRing value={s.thisWeek.done} max={s.thisWeek.target}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>
              {s.thisWeek.done}/{s.thisWeek.target}
            </Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: space(1) }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>
              {remaining === 0 ? "Weekly goal hit! 🎉" : `${remaining} workout${remaining === 1 ? "" : "s"} to go`}
            </Text>
            <Small>{remaining === 0 ? "Anything extra is a bonus." : "Hit your weekly target to grow your streak."}</Small>
            {s.weekStreak > 0 && <Badge tone="primary" icon="flame" label={`${s.weekStreak}-week streak`} />}
          </View>
        </Row>
        <WeekStrip days={s.thisWeek.days} />
      </Card>

      <Row gap={3}>
        <Stat label="All time" value={s.totalWorkouts} icon="trophy-outline" tone={colors.text} onPress={() => router.push("/stats")} />
        <Stat label="This month" value={s.workoutsThisMonth} icon="calendar-outline" tone={colors.text} onPress={() => router.push("/stats")} />
        <Stat label="Week streak" value={s.weekStreak} icon="flame-outline" tone={colors.primary} onPress={() => router.push("/stats")} />
      </Row>

      <SectionTitle action={<Button title="Schedule" icon="calendar-outline" size="sm" variant="secondary" onPress={() => router.push("/schedule/new")} />}>
        Coming up
      </SectionTitle>
      {s.upcoming.length ? (
        <Card onPress={() => router.push("/history")} style={{ gap: space(2.5) }}>
          {s.upcoming.slice(0, 4).map((u) => (
            <Row key={u.id} gap={3}>
              <View style={{ width: 84 }}>
                <Text numberOfLines={1} style={{ fontWeight: "800", color: u.date === dayKey(new Date()) ? colors.primary : colors.text, fontSize: 14 }}>
                  {dayLabel(u.date)}
                </Text>
                {u.time ? <Small>{formatClockTime(u.time)}</Small> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: "700" }}>{u.name}</Body>
                <Small>{u.planDayId ? `${u.exerciseCount} exercises` : "Custom workout"}</Small>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Row>
          ))}
        </Card>
      ) : (
        <Card onPress={() => router.push("/schedule/new")}>
          <Row>
            <Ionicons name="calendar-outline" size={22} color={colors.faint} />
            <Small style={{ flex: 1 }}>Nothing booked yet. Put workouts on specific days to plan your week ahead.</Small>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Row>
        </Card>
      )}

      <SectionTitle>Quick actions</SectionTitle>
      <Row gap={3}>
        <Button title="Freestyle" icon="flash-outline" variant="ghost" size="md" style={{ flex: 1 }} onPress={() => startEmpty()} />
        <Button title="Weight" icon="scale-outline" variant="ghost" size="md" style={{ flex: 1 }} onPress={() => router.push("/body-weight")} />
        <Button title="Coach" icon="chatbubbles-outline" variant="ghost" size="md" style={{ flex: 1 }} onPress={() => router.push("/coach")} />
      </Row>

      {s.lastWorkout && (
        <Card onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.lastWorkout!.id } })}>
          <Small>Last workout</Small>
          <Row>
            <Body style={{ flex: 1, fontWeight: "700" }}>{s.lastWorkout.name}</Body>
            <Small>{relativeDay(s.lastWorkout.completedAt)}</Small>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Row>
        </Card>
      )}
    </Screen>
  );
}

function NextUp({ s, onStart, starting }: { s: ProgressSummary; onStart: (n: NextWorkout) => void; starting: boolean }) {
  const router = useRouter();
  const n = s.nextWorkout;
  if (!n) {
    return (
      <Card>
        <Body>Your plan has no workout days yet.</Body>
        <Button title="Edit plan" icon="create-outline" variant="secondary" size="md" onPress={() => router.push({ pathname: "/plan/[id]", params: { id: s.activePlan!.id } })} />
      </Card>
    );
  }
  if (s.todayDone && !n.isToday) {
    return (
      <Card style={{ backgroundColor: colors.successSoft }}>
        <Row>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Done for today. Nice work!</Text>
            <Small style={{ color: colors.text }}>
              Next up: {n.name} {dayLabel(n.date).toLowerCase() === "tomorrow" ? "tomorrow" : `on ${dayLabel(n.date)}`}
            </Small>
          </View>
        </Row>
      </Card>
    );
  }
  const today = n.isToday;
  const booked = !!n.scheduledId;
  const detail = [n.planDayId ? `${n.exerciseCount} exercises` : "Custom workout", booked ? "Booked on your calendar" : s.activePlan?.name].filter(Boolean).join(" · ");
  return (
    <Card style={{ backgroundColor: today ? colors.primary : colors.card, gap: space(3) }}>
      <Text style={{ color: today ? "#FFE1D9" : colors.muted, fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {today ? "Today's workout" : `Rest day · next up ${dayLabel(n.date)}`}
      </Text>
      <Text style={{ color: today ? "#fff" : colors.text, fontSize: 26, fontWeight: "800" }}>{n.name}</Text>
      <Text style={{ color: today ? "#FFE1D9" : colors.muted }}>{detail}</Text>
      <Button title={today ? "Start workout" : "Train anyway"} icon="play" variant={today ? "dark" : "secondary"} loading={starting} onPress={() => onStart(n)} />
    </Card>
  );
}

const STATUS_STYLE: Record<DayStatus, { bg: string; fg: string; icon?: React.ComponentProps<typeof Ionicons>["name"] }> = {
  done: { bg: colors.success, fg: "#fff", icon: "checkmark" },
  missed: { bg: colors.dangerSoft, fg: colors.danger, icon: "close" },
  today: { bg: colors.primarySoft, fg: colors.primary },
  planned: { bg: colors.bg, fg: colors.text },
  rest: { bg: "transparent", fg: colors.faint },
};

function WeekStrip({ days }: { days: ProgressSummary["thisWeek"]["days"] }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space(3) }}>
      {days.map((d) => {
        const st = STATUS_STYLE[d.status];
        const isToday = d.date === dayKey(new Date());
        return (
          <View key={d.date} style={{ alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: isToday ? "800" : "600", color: isToday ? colors.primary : colors.muted }}>{WEEKDAYS_SHORT[d.weekday][0]}</Text>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: radius.pill,
                backgroundColor: st.bg,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: d.status === "planned" || d.status === "today" ? 1.5 : 0,
                borderColor: d.status === "today" ? colors.primary : colors.border,
                borderStyle: d.status === "planned" ? "dashed" : "solid",
              }}
            >
              {st.icon ? <Ionicons name={st.icon} size={16} color={st.fg} /> : <Text style={{ color: st.fg, fontWeight: "700", fontSize: 12 }}>{d.date.slice(8)}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
