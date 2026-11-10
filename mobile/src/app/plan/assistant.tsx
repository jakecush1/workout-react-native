import { useEffect, useState } from "react";
import { Alert, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Chip, ChipGroup, Field, OptionCard, Row, Screen, SectionTitle, Small } from "../../components/ui";
import { WeekdayPicker, sortWeekdays } from "../../components/WeekdayPicker";
import { api, errorMessage } from "../../lib/api";
import { useUser } from "../../lib/auth";
import { DEFAULT_WEEKDAYS, EQUIPMENT, EXPERIENCE, GOALS, MUSCLES } from "../../lib/labels";
import { draftHolder } from "../../lib/pickers";
import { assistantAnswers } from "../../lib/assistantAnswers";
import type { MuscleGroup, PlanDraft, Questionnaire } from "../../lib/types";
import { colors, space } from "../../lib/theme";

const STEPS = ["Goal", "Schedule", "Focus", "Details", "Finish"] as const;
const LENGTHS = [20, 30, 45, 60, 75, 90];

const LOADING_LINES = [
  "Reviewing your goals…",
  "Balancing your training week…",
  "Picking the right exercises…",
  "Setting sets, reps and rest…",
  "Almost there…",
];

export default function Assistant() {
  const user = useUser();
  const router = useRouter();
  const health = useQuery({ queryKey: ["health"], queryFn: () => api.get<{ ok: boolean; ai: boolean; provider: string | null }>("/health") });
  const aiReady = health.data?.ai ?? false;

  const [step, setStep] = useState(0);
  const [q, setQ] = useState<Questionnaire>(() => ({
    goal: user.goal,
    daysPerWeek: user.daysPerWeek,
    focusMuscles: [],
    sessionMinutes: 45,
    equipment: user.equipment,
    experience: user.experience,
    preferredWeekdays: DEFAULT_WEEKDAYS[user.daysPerWeek],
    notes: "",
    useAI: true,
  }));
  const [building, setBuilding] = useState(false);
  const [line, setLine] = useState(0);
  const set = <K extends keyof Questionnaire>(k: K, v: Questionnaire[K]) => setQ((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!building) return;
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 4000);
    return () => clearInterval(t);
  }, [building]);

  const toggleMuscle = (m: MuscleGroup) =>
    set("focusMuscles", q.focusMuscles.includes(m) ? q.focusMuscles.filter((x) => x !== m) : [...q.focusMuscles, m]);

  const build = async () => {
    setBuilding(true);
    setLine(0);
    try {
      const body = { ...q, preferredWeekdays: sortWeekdays(q.preferredWeekdays), useAI: q.useAI && aiReady };
      // The AI coach can take up to a couple of minutes.
      const res = await api.post<{ draft: PlanDraft; notice: string | null }>("/plans/generate", body, 180_000);
      draftHolder.draft = res.draft;
      draftHolder.notice = res.notice;
      assistantAnswers.current = body;
      router.push("/plan/preview");
    } catch (e) {
      Alert.alert("Couldn't build your plan", errorMessage(e));
    } finally {
      setBuilding(false);
    }
  };

  const next = () => {
    if (step === 1 && q.preferredWeekdays.length !== q.daysPerWeek) {
      return Alert.alert(`Pick ${q.daysPerWeek} days`, "Or change how many days per week you want to train.");
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else void build();
  };

  if (building) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space(4), padding: space(8), backgroundColor: colors.bg }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={q.useAI && aiReady ? "sparkles" : "construct"} size={34} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center" }}>
          {q.useAI && aiReady ? "Your AI coach is building your plan" : "Building your plan"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>{LOADING_LINES[line]}</Text>
      </View>
    );
  }

  return (
    <Screen
      footer={
        <View style={{ flexDirection: "row", gap: space(3) }}>
          {step > 0 && <Button title="Back" variant="ghost" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
          <Button title={step === STEPS.length - 1 ? "Build my plan" : "Continue"} icon={step === STEPS.length - 1 ? "sparkles" : undefined} onPress={next} style={{ flex: 2 }} />
        </View>
      }
    >
      <View style={{ flexDirection: "row", gap: space(2) }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.border }} />
        ))}
      </View>

      {step === 0 && (
        <>
          <Heading title="What do you want to achieve?" />
          {GOALS.map((g) => (
            <OptionCard key={g.value} icon={g.icon as never} title={g.label} blurb={g.blurb} selected={q.goal === g.value} onPress={() => set("goal", g.value)} />
          ))}
        </>
      )}

      {step === 1 && (
        <>
          <Heading title="How often can you train?" subtitle="Be realistic. Consistency beats intensity." />
          <ChipGroup>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Chip
                key={d}
                label={`${d} day${d > 1 ? "s" : ""}`}
                selected={q.daysPerWeek === d}
                onPress={() => setQ((prev) => ({ ...prev, daysPerWeek: d, preferredWeekdays: DEFAULT_WEEKDAYS[d] }))}
              />
            ))}
          </ChipGroup>
          <SectionTitle>Which days?</SectionTitle>
          <WeekdayPicker value={q.preferredWeekdays} onChange={(v) => set("preferredWeekdays", v)} count={q.daysPerWeek} />
          <SectionTitle>How long per session?</SectionTitle>
          <ChipGroup>
            {LENGTHS.map((m) => (
              <Chip key={m} label={`${m} min`} selected={q.sessionMinutes === m} onPress={() => set("sessionMinutes", m)} />
            ))}
          </ChipGroup>
        </>
      )}

      {step === 2 && (
        <>
          <Heading title="Any muscles you want to focus on?" subtitle="Optional. Leave empty for a balanced plan." />
          <ChipGroup>
            <Chip label="Balanced" icon="git-merge-outline" selected={q.focusMuscles.length === 0} onPress={() => set("focusMuscles", [])} />
            {MUSCLES.map((m) => (
              <Chip key={m.value} label={m.label} selected={q.focusMuscles.includes(m.value)} onPress={() => toggleMuscle(m.value)} />
            ))}
          </ChipGroup>
        </>
      )}

      {step === 3 && (
        <>
          <Heading title="Equipment and experience" />
          <SectionTitle>Equipment</SectionTitle>
          {EQUIPMENT.map((e) => (
            <OptionCard key={e.value} title={e.label} blurb={e.blurb} selected={q.equipment === e.value} onPress={() => set("equipment", e.value)} />
          ))}
          <SectionTitle>Experience</SectionTitle>
          {EXPERIENCE.map((e) => (
            <OptionCard key={e.value} title={e.label} blurb={e.blurb} selected={q.experience === e.value} onPress={() => set("experience", e.value)} />
          ))}
        </>
      )}

      {step === 4 && (
        <>
          <Heading title="Anything else?" subtitle="Injuries, exercises you love or hate, sports you play…" />
          <Field
            value={q.notes}
            onChangeText={(t) => set("notes", t)}
            placeholder="e.g. Bad left knee, no jumping. I love deadlifts."
            multiline
            style={{ minHeight: 100, textAlignVertical: "top" }}
            maxLength={1000}
          />
          <Card>
            <Row>
              <Ionicons name="sparkles" size={22} color={aiReady ? colors.info : colors.faint} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>Use AI coach</Text>
                <Small>
                  {aiReady
                    ? `Personalizes the plan using your profile and notes. Takes up to a minute. Powered by ${health.data?.provider ?? "AI"}.`
                    : "Not set up on this server. We'll use our built-in plan generator instead."}
                </Small>
              </View>
              <Switch value={q.useAI && aiReady} disabled={!aiReady} onValueChange={(v) => set("useAI", v)} trackColor={{ true: colors.info }} />
            </Row>
          </Card>
        </>
      )}
    </Screen>
  );
}

function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>{title}</Text>
      {subtitle ? <Text style={{ color: colors.muted, fontSize: 15 }}>{subtitle}</Text> : null}
    </View>
  );
}
