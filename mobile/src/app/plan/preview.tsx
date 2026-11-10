import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, Empty, Row, Screen, SectionTitle, Small } from "../../components/ui";
import { DayCard } from "../../components/PlanBits";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { draftHolder } from "../../lib/pickers";
import { assistantAnswers } from "../../lib/assistantAnswers";
import type { Plan, TemplateSummary } from "../../lib/types";
import { colors } from "../../lib/theme";

export default function Preview() {
  const user = useUser();
  const router = useRouter();
  const qc = useQueryClient();
  const [draft] = useState(draftHolder.draft);
  const [notice] = useState(draftHolder.notice);
  const [saving, setSaving] = useState(false);
  const answers = assistantAnswers.current;

  const matches = useQuery({
    queryKey: ["templates", "match", answers],
    enabled: !!answers,
    queryFn: () => {
      const p = new URLSearchParams({ goal: answers!.goal, days: String(answers!.daysPerWeek), equipment: answers!.equipment, experience: answers!.experience });
      if (answers!.focusMuscles.length) p.set("focus", answers!.focusMuscles.join(","));
      return api.get<TemplateSummary[]>(`/templates?${p}`);
    },
  });

  if (!draft) return <Empty icon="alert-circle-outline" title="Nothing to preview" action={<Button title="Go back" onPress={() => router.back()} />} />;

  const save = async () => {
    setSaving(true);
    try {
      const plan = await api.post<Plan>("/plans", {
        ...draft,
        activate: true,
        days: draft.days.map((d) => ({ ...d, exercises: d.exercises.map(({ exercise: _e, ...rest }) => rest) })),
      });
      await qc.invalidateQueries();
      router.dismissAll();
      router.push({ pathname: "/plan/[id]", params: { id: plan.id, created: "1" } });
    } catch (e) {
      setSaving(false);
      Alert.alert("Couldn't save plan", errorMessage(e));
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button title="Save & make active" icon="checkmark" onPress={save} loading={saving} />
          <Row gap={3}>
            <Button title="Customize" icon="create-outline" variant="ghost" size="md" style={{ flex: 1 }} onPress={() => router.push("/plan/edit")} />
            <Button title="Start over" icon="refresh" variant="ghost" size="md" style={{ flex: 1 }} onPress={() => router.back()} />
          </Row>
        </>
      }
    >
      {notice && (
        <Card style={{ backgroundColor: colors.infoSoft }}>
          <Row style={{ alignItems: "flex-start" }}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
            <Small style={{ flex: 1, color: colors.text }}>{notice}</Small>
          </Row>
        </Card>
      )}
      <View style={{ gap: 8 }}>
        {draft.source === "AI" && <Badge tone="info" icon="sparkles" label="Designed by your AI coach" />}
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{draft.name}</Text>
        {draft.description ? <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>{draft.description}</Text> : null}
      </View>
      {draft.days.map((d, i) => (
        <DayCard key={i} index={i} day={d} units={user.units} />
      ))}

      {matches.data && matches.data.length > 0 && (
        <>
          <SectionTitle>Or try a proven program</SectionTitle>
          {matches.data.slice(0, 2).map((t) => (
            <Card key={t.id} onPress={() => router.push({ pathname: "/plan/template/[id]", params: { id: t.id } })}>
              <Row>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>{t.name}</Text>
                  <Small>{t.daysPerWeek} days/week · {t.reasons.join(" · ") || t.description}</Small>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
