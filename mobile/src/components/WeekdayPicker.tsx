import { View } from "react-native";
import { Chip, ChipGroup, Small } from "./ui";
import { WEEK_ORDER, WEEKDAYS_SHORT } from "../lib/labels";
import { colors } from "../lib/theme";

/** Multi-select of training days. `count` is how many days the plan needs. */
export function WeekdayPicker({ value, onChange, count }: { value: number[]; onChange: (v: number[]) => void; count?: number }) {
  const toggle = (d: number) => {
    if (value.includes(d)) onChange(value.filter((x) => x !== d));
    else if (!count || value.length < count) onChange([...value, d]);
    else onChange([...value.slice(1), d]); // drop the oldest pick to make room
  };
  return (
    <View style={{ gap: 8 }}>
      <ChipGroup>
        {WEEK_ORDER.map((d) => (
          <Chip key={d} label={WEEKDAYS_SHORT[d]} selected={value.includes(d)} onPress={() => toggle(d)} />
        ))}
      </ChipGroup>
      {count ? (
        <Small style={{ color: value.length === count ? colors.success : colors.muted }}>
          {value.length}/{count} days picked
        </Small>
      ) : null}
    </View>
  );
}

/** Sort picks Monday-first so day 1 of the plan lands early in the week. */
export const sortWeekdays = (days: number[]) => [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
