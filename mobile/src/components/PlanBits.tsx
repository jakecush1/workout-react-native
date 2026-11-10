import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Card, Row, Small } from "./ui";
import { GOAL_LABEL, MUSCLE_LABEL, SOURCE_LABEL, WEEKDAYS_LONG, WEEKDAYS_SHORT } from "../lib/labels";
import type { Plan, PlanExercise, Units } from "../lib/types";
import { formatDistance, formatDuration } from "../lib/units";
import { colors, space } from "../lib/theme";

/** "3 × 8-12", "1 × 20 min · 3 km", "3 × 45s". */
export function prescription(e: Pick<PlanExercise, "sets" | "reps" | "durationSec" | "distanceKm">, units: Units) {
  const parts: string[] = [];
  if (e.durationSec) parts.push(e.sets > 1 ? `${e.sets} × ${formatDuration(e.durationSec)}` : formatDuration(e.durationSec));
  else parts.push(`${e.sets} × ${e.reps}`);
  if (e.distanceKm) parts.push(formatDistance(e.distanceKm, units));
  return parts.join(" · ");
}

export function DayCard({
  day,
  units,
  action,
  index,
}: {
  day: { name: string; weekday: number | null; notes?: string; exercises: PlanExercise[] };
  units: Units;
  action?: ReactNode;
  index?: number;
}) {
  return (
    <Card>
      <Row>
        <View style={{ flex: 1 }}>
          <Small style={{ fontWeight: "700", color: colors.primary }}>
            {day.weekday !== null ? WEEKDAYS_LONG[day.weekday] : index !== undefined ? `Day ${index + 1}` : "Any day"}
          </Small>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{day.name}</Text>
        </View>
        {action}
      </Row>
      {day.notes ? <Small>{day.notes}</Small> : null}
      <View style={{ gap: space(2.5), marginTop: space(1) }}>
        {day.exercises.map((e, i) => (
          <View key={`${e.exerciseId}-${i}`} style={{ flexDirection: "row", gap: space(3), alignItems: "flex-start" }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{e.exercise.name}</Text>
              <Small>
                {prescription(e, units)}
                {e.restSec ? ` · rest ${formatDuration(e.restSec)}` : ""} · {MUSCLE_LABEL[e.exercise.primaryMuscle] ?? e.exercise.primaryMuscle}
              </Small>
              {e.notes ? <Small style={{ fontStyle: "italic" }}>{e.notes}</Small> : null}
            </View>
          </View>
        ))}
        {day.exercises.length === 0 && <Small>No exercises yet.</Small>}
      </View>
    </Card>
  );
}

export function PlanCard({ plan, onPress }: { plan: Plan; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={plan.isActive ? { borderWidth: 2, borderColor: colors.primary } : undefined}>
      <Row>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: colors.text }}>{plan.name}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Row>
      <Row gap={1.5} style={{ flexWrap: "wrap" }}>
        {plan.isActive && <Badge tone="primary" label="Active" icon="checkmark-circle" />}
        <Badge label={SOURCE_LABEL[plan.source]} tone={plan.source === "AI" ? "info" : "neutral"} icon={plan.source === "AI" ? "sparkles" : undefined} />
        {plan.goal && <Badge label={GOAL_LABEL[plan.goal]} />}
        <Badge label={`${plan.days.length} days/week`} />
      </Row>
      <View style={{ gap: space(1), marginTop: space(1) }}>
        {plan.days.map((d) => (
          <Row key={d.id} gap={2}>
            <Text style={{ width: 36, color: colors.muted, fontWeight: "700", fontSize: 13 }}>{d.weekday !== null ? WEEKDAYS_SHORT[d.weekday] : "-"}</Text>
            <Small style={{ color: colors.text, flex: 1 }}>{d.name}</Small>
            <Small>{d.exercises.length} exercises</Small>
          </Row>
        ))}
      </View>
    </Card>
  );
}
