import { useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Chip, ChipGroup, Field, Loading, OptionCard, Row, Screen, SectionTitle, Small } from "../../components/ui";
import { CalendarLegend, MonthCalendar, type DayMark } from "../../components/MonthCalendar";
import { api, errorMessage } from "../../lib/api";
import { dayKey, dayLabel, formatClockTime, tzOffset } from "../../lib/dates";
import { useSchedule, useScheduleMutations } from "../../lib/schedule";
import type { Plan } from "../../lib/types";
import { colors } from "../../lib/theme";

const TIMES = ["06:00", "07:00", "08:00", "12:00", "17:00", "18:00", "19:00", "20:00"];
type Pick = { planDayId: string | null; name: string };
const CUSTOM: Pick = { planDayId: null, name: "" };

/**
 * Put a workout on the calendar. Pick a plan day (or name a custom workout), then tap
 * as many dates as you like. With `moveId`, re-dates an existing booking instead.
 */
export default function ScheduleWorkout() {
  const { date, planDayId, moveId } = useLocalSearchParams<{ date?: string; planDayId?: string; moveId?: string }>();
  const router = useRouter();
  const today = dayKey(new Date());
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api.get<Plan[]>("/plans") });
  const schedule = useSchedule();
  const days = useQuery({ queryKey: ["days"], queryFn: () => api.get<Record<string, number>>(`/workouts/days?days=730&tzOffset=${tzOffset()}`) });
  const { book, move } = useScheduleMutations();
  const moving = moveId ? schedule.data?.find((s) => s.id === moveId) : undefined;

  const [pick, setPick] = useState<Pick | null>(planDayId ? { planDayId, name: "" } : null);
  const [customName, setCustomName] = useState("");
  const [dates, setDates] = useState<string[]>(date && date >= today ? [date] : []);
  const [time, setTime] = useState<string | null>(null);
  const [timeInit, setTimeInit] = useState(false);
  if (moving && !timeInit) {
    setTimeInit(true);
    setTime(moving.time);
  }

  const marks = useMemo(() => {
    const m: Record<string, DayMark> = {};
    for (const [k, n] of Object.entries(days.data ?? {})) m[k] = { done: n };
    for (const s of schedule.data ?? []) {
      if (s.id === moveId) continue;
      const mark = (m[s.date] ??= {});
      if (s.status === "missed") mark.missed = (mark.missed ?? 0) + 1;
      else if (s.status !== "done") mark.scheduled = (mark.scheduled ?? 0) + 1;
    }
    return m;
  }, [days.data, schedule.data, moveId]);

  if (plans.isPending || (moveId && schedule.isPending)) return <Loading />;
  const ordered = [...(plans.data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive));
  const isCustom = pick !== null && pick.planDayId === null;
  const name = isCustom ? customName.trim() : pick?.name ?? "";

  const toggleDate = (k: string) => {
    if (k < today) return;
    if (moveId) return setDates([k]);
    setDates((ds) => (ds.includes(k) ? ds.filter((x) => x !== k) : [...ds, k].sort()));
  };

  const save = () => {
    if (!dates.length) return Alert.alert("Pick at least one date");
    if (moveId) {
      return move.mutate(
        { id: moveId, date: dates[0], time },
        { onSuccess: () => router.back(), onError: (e) => Alert.alert("Couldn't move it", errorMessage(e)) },
      );
    }
    if (!pick) return Alert.alert("Pick a workout first");
    if (isCustom && !name) return Alert.alert("Name your workout");
    book.mutate(
      { planDayId: pick.planDayId, name: isCustom ? name : undefined, dates, time },
      {
        onSuccess: (r) => {
          router.back();
          if (r.skipped) Alert.alert("Already booked", `${r.skipped} of those dates already had this workout, so ${r.created} ${r.created === 1 ? "was" : "were"} added.`);
        },
        onError: (e) => Alert.alert("Couldn't schedule", errorMessage(e)),
      },
    );
  };

  const count = dates.length;
  const footerTitle = moveId ? "Move workout" : count <= 1 ? "Schedule workout" : `Schedule ${count} workouts`;

  return (
    <Screen footer={<Button title={footerTitle} icon="calendar" onPress={save} loading={book.isPending || move.isPending} />}>
      {moving ? (
        <Card style={{ backgroundColor: colors.primarySoft }}>
          <Row>
            <Ionicons name="move-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>{moving.name}</Text>
              <Small style={{ color: colors.text }}>Currently on {dayLabel(moving.date)}. Tap the new day below.</Small>
            </View>
          </Row>
        </Card>
      ) : (
        <>
          <SectionTitle>1. Which workout?</SectionTitle>
          {ordered.length === 0 && <Small>You have no plans yet, so pick a custom workout below or create a plan first.</Small>}
          {ordered.map((p) => (
            <View key={p.id} style={{ gap: 8 }}>
              <Small style={{ fontWeight: "700" }}>
                {p.name}
                {p.isActive ? " · active plan" : ""}
              </Small>
              {p.days.map((d) => (
                <OptionCard
                  key={d.id}
                  title={d.name}
                  blurb={`${d.exercises.length} exercises${d.exercises.length ? ` · ${d.exercises.slice(0, 3).map((e) => e.exercise.name).join(", ")}${d.exercises.length > 3 ? "…" : ""}` : ""}`}
                  icon="barbell-outline"
                  selected={pick?.planDayId === d.id}
                  onPress={() => setPick({ planDayId: d.id, name: d.name })}
                />
              ))}
            </View>
          ))}
          <OptionCard title="Custom workout" blurb="Just a name, you log whatever you do" icon="flash-outline" selected={isCustom} onPress={() => setPick(CUSTOM)} />
          {isCustom && <Field label="Workout name" value={customName} onChangeText={setCustomName} placeholder="e.g. Hike, Swim, Yoga" maxLength={80} autoFocus />}
        </>
      )}

      <SectionTitle>{moveId ? "New day" : "2. Which days?"}</SectionTitle>
      <Card>
        <MonthCalendar marks={marks} selected={dates} onSelect={toggleDate} allowFuture initialMonth={dates[0] ?? date} />
        <CalendarLegend />
      </Card>
      {count > 0 && !moveId && (
        <ChipGroup>
          {dates.map((d) => (
            <Chip key={d} label={dayLabel(d)} icon="close" selected onPress={() => toggleDate(d)} />
          ))}
        </ChipGroup>
      )}

      <SectionTitle>{moveId ? "Reminder" : "3. Reminder time (optional)"}</SectionTitle>
      <ChipGroup>
        <Chip label="No reminder" selected={time === null} onPress={() => setTime(null)} />
        {TIMES.map((t) => (
          <Chip key={t} label={formatClockTime(t)} selected={time === t} onPress={() => setTime(t)} />
        ))}
      </ChipGroup>
      <Small>Reminders need notifications turned on in Profile.</Small>
    </Screen>
  );
}
