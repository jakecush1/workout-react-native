import { useState } from "react";
import { Alert, Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, ErrorView, Field, IconButton, Loading, Row, Screen, SectionTitle, Small } from "../components/ui";
import { LineChart } from "../components/charts";
import { api, errorMessage } from "../lib/api";
import { useAuth, useUser } from "../lib/auth";
import { relativeDay, shortDate } from "../lib/dates";
import type { BodyMetric, User } from "../lib/types";
import { formatWeight, fromDisplayWeight, toDisplayWeight, weightUnit } from "../lib/units";
import { colors } from "../lib/theme";

export default function BodyWeight() {
  const user = useUser();
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const body = useQuery({ queryKey: ["body"], queryFn: () => api.get<BodyMetric[]>("/metrics/body") });

  const refreshUser = async () => {
    await qc.invalidateQueries();
    setUser(await api.get<User>("/me"));
  };
  const add = useMutation({
    mutationFn: (kg: number) => api.post("/metrics/body", { weightKg: kg }),
    onSuccess: async () => {
      setValue("");
      await refreshUser();
    },
    onError: (e) => Alert.alert("Couldn't save", errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/metrics/body/${id}`),
    onSuccess: refreshUser,
  });

  if (body.isPending) return <Loading />;
  if (body.isError) return <ErrorView message={errorMessage(body.error)} onRetry={() => body.refetch()} />;

  const submit = () => {
    const n = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return Alert.alert("Enter your weight");
    add.mutate(Math.round(fromDisplayWeight(n, user.units) * 100) / 100);
  };

  return (
    <Screen>
      <Card>
        <Field label="Today's weight" value={value} onChangeText={setValue} keyboardType="decimal-pad" suffix={weightUnit(user.units)} placeholder={user.weightKg ? String(toDisplayWeight(user.weightKg, user.units)) : ""} onSubmitEditing={submit} />
        <Button title="Save" onPress={submit} loading={add.isPending} />
      </Card>
      {body.data.length > 0 && (
        <Card>
          <LineChart data={body.data.map((b) => ({ label: shortDate(b.date), value: toDisplayWeight(b.weightKg, user.units) }))} />
        </Card>
      )}
      <SectionTitle>Entries</SectionTitle>
      {body.data.length === 0 && <Small>No entries yet.</Small>}
      {[...body.data].reverse().map((b) => (
        <Card key={b.id}>
          <Row>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: colors.text }}>{formatWeight(b.weightKg, user.units)}</Text>
            <Small>{relativeDay(b.date)}</Small>
            <IconButton label="Delete entry" icon="trash-outline" size={18} color={colors.faint} onPress={() => remove.mutate(b.id)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
