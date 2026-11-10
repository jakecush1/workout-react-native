import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, Empty, ErrorView, IconButton, Loading, Row, Screen, SectionTitle, Small } from "../../components/ui";
import { CalendarLegend, MonthCalendar, type DayMark } from "../../components/MonthCalendar";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { dayKey, formatClockTime, longDayLabel, relativeDay, timeOfDay, tzOffset } from "../../lib/dates";
import { useSchedule, useScheduleMutations } from "../../lib/schedule";
import { useStartWorkout } from "../../lib/useStartWorkout";
import type { ScheduledWorkout, WorkoutSummary } from "../../lib/types";
import { formatVolume } from "../../lib/units";
import { colors, space } from "../../lib/theme";

export default function CalendarScreen() {
  const user = useUser();
  const router = useRouter();
  const { startNext, starting } = useStartWorkout();
  const { remove } = useScheduleMutations();
  const [selected, setSelected] = useState(dayKey(new Date()));
  const days = useQuery({ queryKey: ["days"], queryFn: () => api.get<Record<string, number>>(`/workouts/days?days=730&tzOffset=${tzOffset()}`) });
  const schedule = useSchedule();
  const list = useInfiniteQuery({
    queryKey: ["workouts"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => api.get<{ items: WorkoutSummary[]; nextCursor: string | null }>(`/workouts?limit=20${pageParam ? `&cursor=${pageParam}` : ""}`),
    getNextPageParam: (last) => last.nextCursor,
  });

  if (list.isPending) return <Loading />;
  if (list.isError) return <ErrorView message={errorMessage(list.error)} onRetry={() => list.refetch()} />;
  const items = list.data.pages.flatMap((p) => p.items);

  const marks: Record<string, DayMark> = {};
  for (const [k, n] of Object.entries(days.data ?? {})) marks[k] = { done: n };
  for (const s of schedule.data ?? []) {
    const m = (marks[s.date] ??= {});
    if (s.status === "missed") m.missed = (m.missed ?? 0) + 1;
    else if (s.status !== "done") m.scheduled = (m.scheduled ?? 0) + 1;
  }
  const todayKey = dayKey(new Date());
  const bookedThatDay = (schedule.data ?? []).filter((s) => s.date === selected);
  const doneThatDay = items.filter((w) => dayKey(new Date(w.completedAt)) === selected);
  const isPast = selected < todayKey;

  const bookingMenu = (s: ScheduledWorkout) =>
    Alert.alert(s.name, s.planName ? `From ${s.planName}` : undefined, [
      { text: "Move to another day", onPress: () => router.push({ pathname: "/schedule/new", params: { moveId: s.id, date: s.date } }) },
      {
        text: "Remove from calendar",
        style: "destructive",
        onPress: () => remove.mutate(s.id, { onError: (e) => Alert.alert("Couldn't remove", errorMessage(e)) }),
      },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <Screen
      tabRoot
      title="Calendar"
      right={<Button title="Schedule" icon="add" size="sm" onPress={() => router.push({ pathname: "/schedule/new", params: { date: isPast ? todayKey : selected } })} />}
      refreshing={list.isRefetching}
      onRefresh={() => {
        void list.refetch();
        void days.refetch();
        void schedule.refetch();
      }}
    >
      <Card>
        <MonthCalendar marks={marks} selected={[selected]} onSelect={setSelected} allowFuture />
        <CalendarLegend />
      </Card>

      <SectionTitle>{longDayLabel(selected)}</SectionTitle>
      {bookedThatDay.map((s) => (
        <Card key={s.id} style={s.status === "missed" ? { backgroundColor: colors.dangerSoft } : undefined}>
          <Row>
            <View style={{ flex: 1 }}>
              <Row gap={1.5} style={{ flexWrap: "wrap" }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{s.name}</Text>
                {s.status === "done" && <Badge tone="success" icon="checkmark" label="Done" />}
                {s.status === "missed" && <Badge tone="danger" icon="close" label="Missed" />}
              </Row>
              <Small>
                {s.time ? `${formatClockTime(s.time)} · ` : ""}
                {s.planDayId ? `${s.exerciseCount} exercises${s.planName ? ` · ${s.planName}` : ""}` : "Custom workout"}
              </Small>
            </View>
            {s.status === "done" && s.sessionId ? (
              <Button title="View" size="sm" variant="secondary" onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.sessionId! } })} />
            ) : (
              <>
                {!isPast && <Button title="Start" icon="play" size="sm" loading={starting} onPress={() => void startNext({ ...s, scheduledId: s.id })} />}
                <IconButton label="Booking options" icon="ellipsis-horizontal-circle" color={colors.muted} onPress={() => bookingMenu(s)} />
              </>
            )}
          </Row>
        </Card>
      ))}
      {doneThatDay.map((w) => (
        <WorkoutRow key={w.id} w={w} units={user.units} onPress={() => router.push({ pathname: "/session/[id]", params: { id: w.id } })} />
      ))}
      {bookedThatDay.length === 0 && doneThatDay.length === 0 && (
        <Card>
          <Row>
            <Ionicons name={isPast ? "bed-outline" : "calendar-outline"} size={22} color={colors.faint} />
            <Small style={{ flex: 1 }}>{isPast ? "No workout on this day." : "Nothing booked. Pick a workout and put it on this day."}</Small>
          </Row>
          {!isPast && (
            <Button title="Schedule a workout" icon="add" variant="secondary" size="md" onPress={() => router.push({ pathname: "/schedule/new", params: { date: selected } })} />
          )}
        </Card>
      )}

      {items.length === 0 ? (
        <Empty icon="time-outline" title="No workouts yet" body="Finished workouts show up here so you can look back on your progress." />
      ) : (
        <>
          <SectionTitle>Past workouts</SectionTitle>
          {items.map((w) => (
            <WorkoutRow key={w.id} w={w} units={user.units} onPress={() => router.push({ pathname: "/session/[id]", params: { id: w.id } })} />
          ))}
          {list.hasNextPage && <Button title="Load more" variant="ghost" size="md" loading={list.isFetchingNextPage} onPress={() => list.fetchNextPage()} />}
        </>
      )}
    </Screen>
  );
}

function WorkoutRow({ w, units, onPress }: { w: WorkoutSummary; units: "IMPERIAL" | "METRIC"; onPress: () => void }) {
  return (
    <Card onPress={onPress}>
      <Row>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{w.name}</Text>
          <Small>
            {relativeDay(w.completedAt)} · {timeOfDay(w.startedAt)}
            {w.planName ? ` · ${w.planName}` : ""}
          </Small>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Row>
      <Row gap={1.5} style={{ flexWrap: "wrap", marginTop: space(1) }}>
        <Badge icon="time-outline" label={`${w.durationMin} min`} />
        <Badge icon="layers-outline" label={`${w.exerciseCount} exercise${w.exerciseCount === 1 ? "" : "s"} · ${w.setCount} set${w.setCount === 1 ? "" : "s"}`} />
        {w.volumeKg > 0 && <Badge icon="barbell-outline" label={formatVolume(w.volumeKg, units)} />}
      </Row>
    </Card>
  );
}
