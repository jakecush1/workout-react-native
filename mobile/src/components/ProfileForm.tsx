import { useState } from "react";
import { View } from "react-native";
import { Chip, ChipGroup, Field, OptionCard, Row, SectionTitle } from "./ui";
import { EQUIPMENT, EXPERIENCE, GOALS } from "../lib/labels";
import type { User } from "../lib/types";
import { cmToFeetInches, feetInchesToCm, fromDisplayWeight, toDisplayWeight } from "../lib/units";
import { space } from "../lib/theme";

export type ProfileDraft = Pick<User, "name" | "birthYear" | "sex" | "heightCm" | "weightKg" | "experience" | "goal" | "equipment" | "daysPerWeek" | "units">;

export function profileDraftFrom(u: User): ProfileDraft {
  const { name, birthYear, sex, heightCm, weightKg, experience, goal, equipment, daysPerWeek, units } = u;
  return { name, birthYear, sex, heightCm, weightKg, experience, goal, equipment, daysPerWeek, units };
}

type Section = "about" | "goal" | "training";

const int = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};
const dec = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function ProfileForm({ value, onChange, sections }: { value: ProfileDraft; onChange: (v: ProfileDraft) => void; sections: Section[] }) {
  const set = <K extends keyof ProfileDraft>(k: K, v: ProfileDraft[K]) => onChange({ ...value, [k]: v });
  const imperial = value.units === "IMPERIAL";

  // Keep raw text for numeric inputs so partially typed values aren't reformatted mid-typing.
  const initialHeight = value.heightCm ? cmToFeetInches(value.heightCm) : null;
  const [ft, setFt] = useState(initialHeight ? String(initialHeight.ft) : "");
  const [inch, setInch] = useState(initialHeight ? String(initialHeight.inch) : "");
  const [cm, setCm] = useState(value.heightCm ? String(Math.round(value.heightCm)) : "");
  const [weight, setWeight] = useState(value.weightKg ? String(toDisplayWeight(value.weightKg, value.units)) : "");
  const [birthYear, setBirthYear] = useState(value.birthYear ? String(value.birthYear) : "");

  const switchUnits = (units: ProfileDraft["units"]) => {
    if (units === value.units) return;
    if (value.weightKg) setWeight(String(toDisplayWeight(value.weightKg, units)));
    if (value.heightCm) {
      const fi = cmToFeetInches(value.heightCm);
      setFt(String(fi.ft));
      setInch(String(fi.inch));
      setCm(String(Math.round(value.heightCm)));
    }
    set("units", units);
  };

  return (
    <View style={{ gap: space(4) }}>
      {sections.includes("about") && (
        <>
          <Field label="Name" value={value.name} onChangeText={(t) => set("name", t)} autoComplete="given-name" />
          <View style={{ gap: space(2) }}>
            <SectionTitle>Units</SectionTitle>
            <ChipGroup>
              <Chip label="lb / ft / mi" selected={imperial} onPress={() => switchUnits("IMPERIAL")} />
              <Chip label="kg / cm / km" selected={!imperial} onPress={() => switchUnits("METRIC")} />
            </ChipGroup>
          </View>
          {imperial ? (
            <Row gap={3}>
              <View style={{ flex: 1 }}>
                <Field label="Height" suffix="ft" keyboardType="number-pad" value={ft} onChangeText={(t) => { setFt(t); const f = int(t); set("heightCm", f !== null ? feetInchesToCm(f, int(inch) ?? 0) : null); }} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label=" " suffix="in" keyboardType="number-pad" value={inch} onChangeText={(t) => { setInch(t); const f = int(ft); if (f !== null) set("heightCm", feetInchesToCm(f, int(t) ?? 0)); }} />
              </View>
            </Row>
          ) : (
            <Field label="Height" suffix="cm" keyboardType="number-pad" value={cm} onChangeText={(t) => { setCm(t); set("heightCm", int(t)); }} />
          )}
          <Field
            label="Weight"
            suffix={imperial ? "lb" : "kg"}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={(t) => {
              setWeight(t);
              const w = dec(t);
              set("weightKg", w !== null ? Math.round(fromDisplayWeight(w, value.units) * 100) / 100 : null);
            }}
          />
          <Field label="Birth year" placeholder="e.g. 1995" keyboardType="number-pad" maxLength={4} value={birthYear} onChangeText={(t) => { setBirthYear(t); const y = int(t); set("birthYear", y && y > 1900 ? y : null); }} hint="Optional. Helps tailor your plans." />
          <View style={{ gap: space(2) }}>
            <SectionTitle>Sex (optional)</SectionTitle>
            <ChipGroup>
              {(["MALE", "FEMALE", "OTHER"] as const).map((s) => (
                <Chip key={s} label={s === "MALE" ? "Male" : s === "FEMALE" ? "Female" : "Other / prefer not to say"} selected={value.sex === s} onPress={() => set("sex", value.sex === s ? null : s)} />
              ))}
            </ChipGroup>
          </View>
        </>
      )}

      {sections.includes("goal") && (
        <>
          <SectionTitle>Main goal</SectionTitle>
          {GOALS.map((g) => (
            <OptionCard key={g.value} title={g.label} blurb={g.blurb} icon={g.icon as never} selected={value.goal === g.value} onPress={() => set("goal", g.value)} />
          ))}
          <SectionTitle>Experience</SectionTitle>
          {EXPERIENCE.map((e) => (
            <OptionCard key={e.value} title={e.label} blurb={e.blurb} selected={value.experience === e.value} onPress={() => set("experience", e.value)} />
          ))}
        </>
      )}

      {sections.includes("training") && (
        <>
          <SectionTitle>Where do you train?</SectionTitle>
          {EQUIPMENT.map((e) => (
            <OptionCard key={e.value} title={e.label} blurb={e.blurb} selected={value.equipment === e.value} onPress={() => set("equipment", e.value)} />
          ))}
          <SectionTitle>Days per week you can train</SectionTitle>
          <ChipGroup>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Chip key={d} label={String(d)} selected={value.daysPerWeek === d} onPress={() => set("daysPerWeek", d)} />
            ))}
          </ChipGroup>
        </>
      )}
    </View>
  );
}
