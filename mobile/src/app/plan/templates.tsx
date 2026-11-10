import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Card, Chip, ErrorView, Loading, Row, Screen, Small } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { EQUIPMENT, EQUIPMENT_LABEL, GOALS, GOAL_LABEL } from "../../lib/labels";
import type { EquipmentAccess, Goal, TemplateSummary } from "../../lib/types";
import { colors, space } from "../../lib/theme";

export default function Templates() {
  const user = useUser();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(user.goal);
  const [days, setDays] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<EquipmentAccess>(user.equipment);

  const params = new URLSearchParams({ equipment, experience: user.experience });
  if (goal) params.set("goal", goal);
  if (days) params.set("days", String(days));
  const templates = useQuery({
    queryKey: ["templates", params.toString()],
    queryFn: () => api.get<TemplateSummary[]>(`/templates?${params}`),
  });

  return (
    <Screen>
      <FilterRow>
        <Chip label="All goals" selected={!goal} onPress={() => setGoal(null)} />
        {GOALS.map((g) => (
          <Chip key={g.value} label={g.label} selected={goal === g.value} onPress={() => setGoal(g.value)} />
        ))}
      </FilterRow>
      <FilterRow>
        <Chip label="Any days" selected={!days} onPress={() => setDays(null)} />
        {[2, 3, 4, 5, 6].map((d) => (
          <Chip key={d} label={`${d} days`} selected={days === d} onPress={() => setDays(d)} />
        ))}
      </FilterRow>
      <FilterRow>
        {EQUIPMENT.map((e) => (
          <Chip key={e.value} label={e.label} selected={equipment === e.value} onPress={() => setEquipment(e.value)} />
        ))}
      </FilterRow>

      {templates.isPending ? (
        <Loading />
      ) : templates.isError ? (
        <ErrorView message={errorMessage(templates.error)} onRetry={() => templates.refetch()} />
      ) : (
        templates.data.map((t, i) => (
          <Card key={t.id} onPress={() => router.push({ pathname: "/plan/template/[id]", params: { id: t.id } })}>
            <Row>
              <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: colors.text }}>{t.name}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Row>
            {i === 0 && t.score >= 60 && <Badge tone="primary" icon="star" label="Best match for you" />}
            <Small>{t.description}</Small>
            <Row gap={1.5} style={{ flexWrap: "wrap", marginTop: space(1) }}>
              <Badge label={GOAL_LABEL[t.goal]} />
              <Badge label={`${t.daysPerWeek} days/week`} />
              <Badge label={t.level.charAt(0) + t.level.slice(1).toLowerCase()} />
              <Badge label={EQUIPMENT_LABEL[t.equipment]} />
            </Row>
            {t.reasons.length > 0 && (
              <View style={{ gap: 2, marginTop: space(1) }}>
                {t.reasons.map((r) => (
                  <Row key={r} gap={1.5}>
                    <Ionicons name="checkmark" size={14} color={colors.success} />
                    <Small style={{ color: colors.success }}>{r}</Small>
                  </Row>
                ))}
              </View>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

function FilterRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space(4) }} contentContainerStyle={{ gap: space(2), paddingHorizontal: space(4) }}>
      {children}
    </ScrollView>
  );
}
