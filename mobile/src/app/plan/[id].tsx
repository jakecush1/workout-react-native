import { Alert, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, ErrorView, IconButton, Loading, Row, Screen, Small } from "../../components/ui";
import { DayCard } from "../../components/PlanBits";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { GOAL_LABEL, SOURCE_LABEL } from "../../lib/labels";
import { draftHolder } from "../../lib/pickers";
import { useStartWorkout } from "../../lib/useStartWorkout";
import type { Plan } from "../../lib/types";
import { colors } from "../../lib/theme";

export default function PlanDetail() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const user = useUser();
  const router = useRouter();
  const qc = useQueryClient();
  const { startDay, starting } = useStartWorkout();
  const plan = useQuery({ queryKey: ["plan", id], queryFn: () => api.get<Plan>(`/plans/${id}`) });

  const activate = useMutation({
    mutationFn: () => api.post<Plan>(`/plans/${id}/activate`),
    onSuccess: () => qc.invalidateQueries(),
    onError: (e) => Alert.alert("Couldn't activate plan", errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/plans/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries();
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't delete plan", errorMessage(e)),
  });

  if (plan.isPending) return <Loading />;
  if (plan.isError) return <ErrorView message={errorMessage(plan.error)} onRetry={() => plan.refetch()} />;
  const p = plan.data;

  const menu = () =>
    Alert.alert(p.name, undefined, [
      {
        text: "Edit plan",
        onPress: () => {
          draftHolder.draft = { name: p.name, description: p.description, goal: p.goal, source: p.source, days: p.days };
          router.push({ pathname: "/plan/edit", params: { id: p.id } });
        },
      },
      {
        text: "Delete plan",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete this plan?", "Your logged workouts stay in your history.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => remove.mutate() },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);

  return (
    <Screen refreshing={plan.isRefetching} onRefresh={() => plan.refetch()}>
      <Stack.Screen options={{ title: "", headerRight: () => <IconButton label="Plan options" icon="ellipsis-horizontal-circle" color={colors.primary} onPress={menu} /> }} />
      {created && (
        <Card style={{ backgroundColor: colors.successSoft }}>
          <Row>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Small style={{ flex: 1, color: colors.text }}>Plan saved and set as your active plan. Turn on reminders in Profile so you never miss a day.</Small>
          </Row>
        </Card>
      )}
      <View style={{ gap: 8 }}>
        <Row gap={1.5} style={{ flexWrap: "wrap" }}>
          {p.isActive && <Badge tone="primary" icon="checkmark-circle" label="Active" />}
          <Badge tone={p.source === "AI" ? "info" : "neutral"} icon={p.source === "AI" ? "sparkles" : undefined} label={SOURCE_LABEL[p.source]} />
          {p.goal && <Badge label={GOAL_LABEL[p.goal]} />}
        </Row>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{p.name}</Text>
        {p.description ? <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>{p.description}</Text> : null}
      </View>
      {!p.isActive && <Button title="Make this my active plan" variant="secondary" icon="flag-outline" loading={activate.isPending} onPress={() => activate.mutate()} />}
      <Row gap={3}>
        <Button
          title="Edit plan"
          icon="create-outline"
          variant="ghost"
          size="md"
          style={{ flex: 1 }}
          onPress={() => {
            draftHolder.draft = { name: p.name, description: p.description, goal: p.goal, source: p.source, days: p.days };
            router.push({ pathname: "/plan/edit", params: { id: p.id } });
          }}
        />
        <Button title="Schedule" icon="calendar-outline" variant="ghost" size="md" style={{ flex: 1 }} onPress={() => router.push("/schedule/new")} />
      </Row>
      {p.days.map((d, i) => (
        <DayCard
          key={d.id}
          index={i}
          day={d}
          units={user.units}
          action={
            <Row gap={1}>
              <IconButton label="Put on calendar" icon="calendar-outline" color={colors.primary} onPress={() => router.push({ pathname: "/schedule/new", params: { planDayId: d.id } })} />
              <Button title="Start" icon="play" size="sm" disabled={starting || d.exercises.length === 0} onPress={() => startDay(p.id, d.id, p)} />
            </Row>
          }
        />
      ))}
      <Small style={{ textAlign: "center" }}>Weekdays here are your usual routine. Use the calendar to move a workout to a different date without changing the plan.</Small>
    </Screen>
  );
}
