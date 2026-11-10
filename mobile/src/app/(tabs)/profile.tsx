import { useEffect, useState } from "react";
import { Alert, Linking, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Chip, ChipGroup, Row, Screen, SectionTitle, Small, Stepper } from "../../components/ui";
import { API_URL, api, errorMessage } from "../../lib/api";
import { useAuth, useUser } from "../../lib/auth";
import { EQUIPMENT_LABEL, EXPERIENCE, GOAL_LABEL } from "../../lib/labels";
import { getReminderSettings, requestReminderPermission, saveReminderSettings, scheduleReminders, type ReminderSettings } from "../../lib/reminders";
import type { Plan } from "../../lib/types";
import { formatHeight, formatWeight } from "../../lib/units";
import { colors, space } from "../../lib/theme";

const formatHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

export default function Profile() {
  const user = useUser();
  const { signOut, updateProfile } = useAuth();
  const router = useRouter();
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api.get<Plan[]>("/plans") });
  const active = plans.data?.find((p) => p.isActive);
  const [reminders, setReminders] = useState<ReminderSettings | null>(null);

  useEffect(() => {
    void getReminderSettings().then(setReminders);
  }, []);

  const applyReminders = async (next: ReminderSettings) => {
    if (next.enabled && !(await requestReminderPermission())) {
      Alert.alert("Notifications are off", "Allow notifications for this app in Settings to get workout reminders.", [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ]);
      next = { ...next, enabled: false };
    }
    setReminders(next);
    await saveReminderSettings(next);
    await scheduleReminders(active?.days ?? [], next);
  };

  const exp = EXPERIENCE.find((e) => e.value === user.experience)?.label;

  return (
    <Screen tabRoot title="Profile">
      <Card>
        <Row>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: colors.text }}>{user.name}</Text>
            <Small>{user.email}</Small>
          </View>
        </Row>
        <View style={{ gap: space(2), marginTop: space(2) }}>
          <InfoRow label="Goal" value={GOAL_LABEL[user.goal]} />
          <InfoRow label="Experience" value={exp ?? ""} />
          <InfoRow label="Equipment" value={EQUIPMENT_LABEL[user.equipment]} />
          <InfoRow label="Days per week" value={String(user.daysPerWeek)} />
          <InfoRow label="Height" value={formatHeight(user.heightCm, user.units)} />
          <InfoRow label="Weight" value={formatWeight(user.weightKg, user.units)} />
        </View>
        <Button title="Edit profile" icon="create-outline" variant="ghost" size="md" onPress={() => router.push("/edit-profile")} />
      </Card>

      <SectionTitle>Reminders</SectionTitle>
      <Card>
        <Row>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>Workout reminders</Text>
            <Small>{active ? `On your training days in "${active.name}"` : "Create a plan to schedule reminders"}</Small>
          </View>
          <Switch
            value={!!reminders?.enabled}
            disabled={!reminders}
            trackColor={{ true: colors.primary }}
            onValueChange={(v) => {
              if (reminders) void applyReminders({ ...reminders, enabled: v });
            }}
          />
        </Row>
        {reminders?.enabled && (
          <Row style={{ justifyContent: "space-between", marginTop: space(2) }}>
            <Small>Remind me at</Small>
            <Row gap={2}>
              <Stepper value={reminders.hour} min={4} max={22} format={formatHour} onChange={(h) => void applyReminders({ ...reminders, hour: h })} />
              <Chip label={reminders.minute === 0 ? ":00" : ":30"} onPress={() => void applyReminders({ ...reminders, minute: reminders.minute === 0 ? 30 : 0 })} />
            </Row>
          </Row>
        )}
      </Card>

      <SectionTitle>Units</SectionTitle>
      <ChipGroup>
        <Chip label="Imperial (lb, mi)" selected={user.units === "IMPERIAL"} onPress={() => void updateProfile({ units: "IMPERIAL" }).catch((e) => Alert.alert(errorMessage(e)))} />
        <Chip label="Metric (kg, km)" selected={user.units === "METRIC"} onPress={() => void updateProfile({ units: "METRIC" }).catch((e) => Alert.alert(errorMessage(e)))} />
      </ChipGroup>

      <SectionTitle>Account</SectionTitle>
      <Button title="Sign out" variant="ghost" icon="log-out-outline" onPress={() => Alert.alert("Sign out?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Sign out", onPress: () => void signOut() }])} />
      <Button
        title="Delete account"
        variant="danger"
        icon="trash-outline"
        onPress={() =>
          Alert.alert("Delete your account?", "This permanently deletes your profile, plans and workout history.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await api.del("/me");
                  await signOut();
                } catch (e) {
                  Alert.alert("Couldn't delete account", errorMessage(e));
                }
              },
            },
          ])
        }
      />
      <Small style={{ textAlign: "center" }}>Server: {API_URL}</Small>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Row>
      <Small style={{ flex: 1 }}>{label}</Small>
      <Text style={{ fontWeight: "600", color: colors.text }}>{value}</Text>
    </Row>
  );
}
