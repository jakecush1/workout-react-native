import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { IconButton, Row, tap } from "./ui";
import { dayKey, fromDayKey } from "../lib/dates";
import { colors, space } from "../lib/theme";

const HEAD = ["M", "T", "W", "T", "F", "S", "S"];

/** What happened (or is booked) on a day. */
export interface DayMark {
  done?: number;
  scheduled?: number;
  missed?: number;
}

/**
 * Month grid. Days are keyed by local "YYYY-MM-DD".
 * Done days are filled, booked days have a dashed ring, missed bookings are red, selected days get a dark ring.
 */
export function MonthCalendar({
  marks,
  selected = [],
  onSelect,
  allowFuture = false,
  initialMonth,
}: {
  marks: Record<string, DayMark>;
  selected?: string[];
  onSelect?: (key: string) => void;
  /** Allow browsing and selecting days after today (for scheduling). */
  allowFuture?: boolean;
  /** "YYYY-MM-DD" whose month to open first. */
  initialMonth?: string;
}) {
  const today = new Date();
  const todayKey = dayKey(today);
  const start = initialMonth ? fromDayKey(initialMonth) : today;
  const [offset, setOffset] = useState((start.getFullYear() - today.getFullYear()) * 12 + start.getMonth() - today.getMonth());
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const monthPrefix = dayKey(first).slice(0, 7);
  const monthDone = Object.entries(marks).filter(([k]) => k.startsWith(monthPrefix)).reduce((n, [, m]) => n + (m.done ?? 0), 0);
  const monthBooked = Object.entries(marks).filter(([k]) => k.startsWith(monthPrefix)).reduce((n, [, m]) => n + (m.scheduled ?? 0), 0);
  const canGoForward = allowFuture ? offset < 24 : offset < 0;
  const selectedSet = new Set(selected);

  return (
    <View style={{ gap: space(2) }}>
      <Row>
        <IconButton label="Previous month" icon="chevron-back" color={offset > -36 ? colors.primary : colors.border} onPress={() => offset > -36 && setOffset(offset - 1)} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {monthDone} workout{monthDone === 1 ? "" : "s"}
            {monthBooked ? ` · ${monthBooked} booked` : ""}
          </Text>
        </View>
        <IconButton label="Next month" icon="chevron-forward" color={canGoForward ? colors.primary : colors.border} onPress={() => canGoForward && setOffset(offset + 1)} />
      </Row>
      <View style={{ flexDirection: "row" }}>
        {HEAD.map((h, i) => (
          <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: "700", color: colors.faint }}>
            {h}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {cells.slice(row * 7, row * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={{ flex: 1, height: 40 }} />;
            const k = dayKey(d);
            const m = marks[k] ?? {};
            const isToday = k === todayKey;
            const future = k > todayKey;
            const did = !!m.done;
            const booked = !did && !!m.scheduled;
            const missed = !did && !!m.missed;
            const isSelected = selectedSet.has(k);
            const selectable = !!onSelect && (allowFuture || !future);
            const bg = did ? colors.primary : missed ? colors.dangerSoft : isSelected && !booked ? colors.dark : "transparent";
            const fg = did ? "#fff" : missed ? colors.danger : isSelected && !booked ? "#fff" : booked ? colors.primary : future && !allowFuture ? colors.faint : colors.text;
            return (
              <Pressable
                key={i}
                disabled={!selectable}
                accessibilityLabel={d.toDateString()}
                onPress={() => {
                  tap();
                  onSelect?.(k);
                }}
                style={{ flex: 1, height: 40, alignItems: "center", justifyContent: "center" }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: bg,
                    borderWidth: isSelected ? 2 : booked || (isToday && !did) ? 1.5 : 0,
                    borderColor: isSelected ? colors.dark : colors.primary,
                    borderStyle: booked && !isSelected ? "dashed" : "solid",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: did || isToday || booked || isSelected ? "800" : "500", color: fg }}>{d.getDate()}</Text>
                </View>
                {isToday && <View style={{ position: "absolute", bottom: 1, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function Dot({ bg, border, dashed }: { bg?: string; border?: string; dashed?: boolean }) {
  return (
    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: bg ?? "transparent", borderWidth: border ? 1.5 : 0, borderColor: border, borderStyle: dashed ? "dashed" : "solid" }} />
  );
}

/** Legend for the calendar's colors. */
export function CalendarLegend() {
  return (
    <Row gap={4} style={{ flexWrap: "wrap" }}>
      <Row gap={1.5}><Dot bg={colors.primary} /><Text style={{ fontSize: 12, color: colors.muted }}>Done</Text></Row>
      <Row gap={1.5}><Dot border={colors.primary} dashed /><Text style={{ fontSize: 12, color: colors.muted }}>Booked</Text></Row>
      <Row gap={1.5}><Dot bg={colors.dangerSoft} /><Text style={{ fontSize: 12, color: colors.muted }}>Missed</Text></Row>
    </Row>
  );
}
