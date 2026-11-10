import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { OptionCard, Screen } from "../../components/ui";
import { draftHolder } from "../../lib/pickers";
import { colors, space } from "../../lib/theme";

export default function NewPlan() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ gap: space(1) }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>How do you want to start?</Text>
        <Text style={{ color: colors.muted, fontSize: 15 }}>You can edit any plan after it's created.</Text>
      </View>
      <OptionCard
        icon="sparkles-outline"
        title="Build it for me"
        blurb="Answer a few questions and get a plan made for your goal, schedule and equipment."
        onPress={() => router.push("/plan/assistant")}
        right={<View />}
      />
      <OptionCard
        icon="albums-outline"
        title="Pick a pre-made plan"
        blurb="Proven programs for muscle, fat loss, running and more."
        onPress={() => router.push("/plan/templates")}
        right={<View />}
      />
      <OptionCard
        icon="construct-outline"
        title="Build my own"
        blurb="Choose your days and exercises yourself."
        onPress={() => {
          draftHolder.draft = {
            name: "My plan",
            description: "",
            goal: null,
            source: "MANUAL",
            days: [{ name: "Day 1", weekday: 1, notes: "", exercises: [] }],
          };
          router.push("/plan/edit");
        }}
        right={<View />}
      />
    </Screen>
  );
}
