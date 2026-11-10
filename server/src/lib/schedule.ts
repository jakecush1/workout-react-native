// Weekday numbers follow JS Date#getDay: 0 = Sunday ... 6 = Saturday.

const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** Pick a weekday for each training day, honoring the user's preferred days when they picked enough. */
export function assignWeekdays(dayCount: number, preferred?: number[] | null): (number | null)[] {
  const prefs = [...new Set((preferred ?? []).filter((d) => d >= 0 && d <= 6))].sort(
    // Sort Monday-first so a plan starts at the beginning of the training week.
    (a, b) => ((a + 6) % 7) - ((b + 6) % 7),
  );
  if (prefs.length >= dayCount) return prefs.slice(0, dayCount);
  const defaults = DEFAULT_WEEKDAYS[Math.min(Math.max(dayCount, 1), 7)];
  return Array.from({ length: dayCount }, (_, i) => defaults[i] ?? null);
}

// ---- Timezone-aware date helpers -------------------------------------------------
// The app sends its timezone offset (Date#getTimezoneOffset, in minutes) so the server
// can bucket workouts into the user's local days and weeks.

export function toLocal(date: Date, tzOffset: number): Date {
  return new Date(date.getTime() - tzOffset * 60_000);
}

/** "YYYY-MM-DD" for the user's local calendar day. */
export function localDayKey(date: Date, tzOffset: number): string {
  return toLocal(date, tzOffset).toISOString().slice(0, 10);
}

/** Local weekday 0-6 (Sunday = 0). */
export function localWeekday(date: Date, tzOffset: number): number {
  return toLocal(date, tzOffset).getUTCDay();
}

/** UTC instant of local midnight on the Monday that starts the week containing `date`. */
export function startOfLocalWeek(date: Date, tzOffset: number): Date {
  const local = toLocal(date, tzOffset);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocalMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - daysSinceMonday,
  );
  return new Date(mondayLocalMidnight + tzOffset * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}
