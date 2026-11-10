// Local workout reminders, scheduled on the days the active plan is planned for.
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { api } from "./api";
import { addDaysKey, dayKey, fromDayKey, tzOffset } from "./dates";
import type { ScheduledWorkout } from "./types";

const KEY = "reminder-settings";

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULTS: ReminderSettings = { enabled: false, hour: 18, minute: 0 };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function saveReminderSettings(s: ReminderSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return res.granted;
}

const MESSAGES = [
  "Your future self will thank you. Let's go!",
  "Show up today. That's how streaks are built.",
  "Small reps, big results. Time to train.",
  "You planned it. Now crush it.",
];

/**
 * Replace all scheduled reminders with one weekly reminder per planned training day,
 * plus a one-off reminder for each calendar booking that has a time (next 30 days).
 * `days` uses JS weekday numbers (0 = Sunday).
 */
export async function scheduleReminders(days: { weekday: number | null; name: string }[], settings?: ReminderSettings) {
  if (Platform.OS === "web") return 0;
  const s = settings ?? (await getReminderSettings());
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!s.enabled) return 0;
  const perms = await Notifications.getPermissionsAsync();
  if (!perms.granted) return 0;

  const scheduled = days.filter((d): d is { weekday: number; name: string } => d.weekday !== null);
  for (const [i, d] of scheduled.entries()) {
    // Notification weekdays run 1-7 starting on Sunday.
    const weekday = d.weekday + 1;
    await Notifications.scheduleNotificationAsync({
      content: { title: `Today: ${d.name} 💪`, body: MESSAGES[i % MESSAGES.length] },
      trigger:
        Platform.OS === "ios"
          ? { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, weekday, hour: s.hour, minute: s.minute, repeats: true }
          : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: s.hour, minute: s.minute },
    });
  }

  let booked = 0;
  try {
    const today = dayKey(new Date());
    const bookings = await api.get<ScheduledWorkout[]>(`/schedule?from=${today}&to=${addDaysKey(today, 30)}&tzOffset=${tzOffset()}`);
    for (const b of bookings) {
      if (!b.time || b.status === "done" || b.status === "missed") continue;
      const [h, m] = b.time.split(":").map(Number);
      const at = fromDayKey(b.date);
      at.setHours(h, m, 0, 0);
      if (at.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: `${b.name} is on the calendar 📅`, body: "You booked this one. Let's go!" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
      if (++booked >= 30) break;
    }
  } catch {
    // Offline or signed out: the weekly reminders are still set.
  }
  return scheduled.length + booked;
}

export async function clearReminders() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Not fatal (e.g. permissions never granted).
  }
}
