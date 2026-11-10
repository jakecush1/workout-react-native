import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, ErrorView, Loading, Row, Screen, SectionTitle, Small } from "../../../components/ui";
import { DayCard } from "../../../components/PlanBits";
import { WeekdayPicker, sortWeekdays } from "../../../components/WeekdayPicker";
import { api, errorMessage } from "../../../lib/api";
import { useUser } from "../../../lib/auth";
import { DEFAULT_WEEKDAYS, EQUIPMENT_LABEL, GOAL_LABEL, MUSCLE_LABEL } from "../../../lib/labels";
import type { Plan, TemplateDetail } from "../../../lib/types";
import { colors } from "../../../lib/theme";

export default function TemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUser();
  const router = useRouter();
  const qc = useQueryClient();
  const t = useQuery({ queryKey: ["template", id], queryFn: () => api.get<TemplateDetail>(`/templates/${id}`) });
  const [weekdays, setWeekdays] = useState<number[] | null>(null);
  const [saving, setSaving] = useState(false);

  if (t.isPending) return <Loading />;
  if (t.isError) return <ErrorView message={errorMessage(t.error)} onRetry={() => t.refetch()} />;
  const tpl = t.data;
  const days = weekdays ?? DEFAULT_WEEKDAYS[tpl.daysPerWeek];
  const sorted = sortWeekdays(days);

  const use = async () => {
    if (days.length !== tpl.daysPerWeek) return Alert.alert(`Pick ${tpl.daysPerWeek} training days`);
    setSaving(true);
    try {
      const plan = await api.post<Plan>("/plans/from-template", { templateId: tpl.id, weekdays: sorted, activate: true });
      await qc.invalidateQueries();
      router.dismissAll();
      router.push({ pathname: "/plan/[id]", params: { id: plan.id, created: "1" } });
    } catch (e) {
      setSaving(false);
      Alert.alert("Couldn't create plan", errorMessage(e));
    }
  };

  return (
    <Screen footer={<Button title="Use this plan" icon="checkmark" onPress={use} loading={saving} />}>
      <Stack.Screen options={{ title: tpl.name }} />
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{tpl.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>{tpl.description}</Text>
        <Row gap={1.5} style={{ flexWrap: "wrap" }}>
          <Badge tone="primary" label={GOAL_LABEL[tpl.goal]} />
          <Badge label={`${tpl.daysPerWeek} days/week`} />
          <Badge label={EQUIPMENT_LABEL[tpl.equipment]} />
          {tpl.focus.slice(0, 4).map((m) => (
            <Badge key={m} label={MUSCLE_LABEL[m]} />
          ))}
        </Row>
      </View>
      <Card>
        <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>Which days will you train?</Text>
        <WeekdayPicker value={days} onChange={setWeekdays} count={tpl.daysPerWeek} />
      </Card>
      <SectionTitle>What's inside</SectionTitle>
      {tpl.days.map((d, i) => (
        <DayCard key={i} index={i} day={{ ...d, weekday: days.length === tpl.daysPerWeek ? sorted[i] : null }} units={user.units} />
      ))}
      <Small>Tip: weights are up to you. Pick a load you can lift for the target reps with 1-2 reps left in the tank.</Small>
    </Screen>
  );
}
