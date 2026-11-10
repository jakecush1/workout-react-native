import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { scheduleReminders } from "../../lib/reminders";
import { useSchedule } from "../../lib/schedule";
import type { Plan } from "../../lib/types";
import { colors } from "../../lib/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const icon = (name: IconName) => ({ color, size }: { color: unknown; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  useReminderSync();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today", tabBarIcon: icon("flash-outline") }} />
      <Tabs.Screen name="plans" options={{ title: "Plans", tabBarIcon: icon("list-outline") }} />
      <Tabs.Screen name="history" options={{ title: "Calendar", tabBarIcon: icon("calendar-outline") }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: icon("stats-chart-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person-circle-outline") }} />
    </Tabs>
  );
}

/** Keep reminders in step with the active plan's weekly pattern and any calendar bookings. */
function useReminderSync() {
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => api.get<Plan[]>("/plans") });
  const { data: bookings } = useSchedule();
  const active = plans?.find((p) => p.isActive);
  const planSig = active ? active.days.map((d) => `${d.weekday}:${d.name}`).join("|") : "none";
  const bookingSig = (bookings ?? []).map((b) => `${b.id}:${b.date}:${b.time}:${b.status}`).join("|");
  useEffect(() => {
    if (!plans) return;
    void scheduleReminders(active?.days ?? []).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSig, bookingSig, !!plans]);
}
