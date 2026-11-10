import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button, Screen } from "../components/ui";
import { ProfileForm, profileDraftFrom, type ProfileDraft } from "../components/ProfileForm";
import { useUser, useAuth } from "../lib/auth";
import { errorMessage } from "../lib/api";
import { colors, space } from "../lib/theme";

const STEPS = [
  { key: "about", title: "Tell us about you", subtitle: "We use this to tailor your plans and track your progress." },
  { key: "goal", title: "What's your goal?", subtitle: "You can change this any time." },
  { key: "training", title: "How do you train?", subtitle: "We'll only suggest exercises you can actually do." },
] as const;

export default function Onboarding() {
  const user = useUser();
  const { updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraftFrom(user));
  const [saving, setSaving] = useState(false);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  const next = async () => {
    if (step === 0 && !draft.name.trim()) return Alert.alert("Please enter your name");
    if (!last) return setStep(step + 1);
    setSaving(true);
    try {
      // Flipping `onboarded` swaps the navigator over to the main app.
      await updateProfile({ ...draft, name: draft.name.trim(), onboarded: true });
    } catch (e) {
      setSaving(false);
      Alert.alert("Couldn't save your profile", errorMessage(e));
    }
  };

  return (
    <Screen
      footer={
        <View style={{ flexDirection: "row", gap: space(3) }}>
          {step > 0 && <Button title="Back" variant="ghost" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
          <Button title={last ? "Finish" : "Continue"} onPress={next} loading={saving} style={{ flex: 2 }} />
        </View>
      }
    >
      <View style={{ flexDirection: "row", gap: space(2) }}>
        {STEPS.map((s, i) => (
          <View key={s.key} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.primary : colors.border }} />
        ))}
      </View>
      <View style={{ gap: space(1) }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{current.title}</Text>
        <Text style={{ fontSize: 15, color: colors.muted }}>{current.subtitle}</Text>
      </View>
      <ProfileForm key={current.key} value={draft} onChange={setDraft} sections={[current.key]} />
    </Screen>
  );
}
