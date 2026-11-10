import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../components/ui";
import { colors, space } from "../lib/theme";

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }[] = [
  { icon: "sparkles-outline", text: "Plans built for your goal, schedule and equipment" },
  { icon: "checkmark-done-outline", text: "Log sets in seconds, with last time's numbers filled in" },
  { icon: "trending-up-outline", text: "Track progress, personal records and streaks" },
  { icon: "notifications-outline", text: "Reminders that keep you accountable" },
];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.dark, paddingTop: insets.top + space(10), paddingBottom: insets.bottom + space(4), paddingHorizontal: space(6) }}>
      <View style={{ flex: 1, gap: space(6) }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="barbell" size={34} color="#fff" />
        </View>
        <Text style={{ color: "#fff", fontSize: 40, fontWeight: "800", letterSpacing: -1, lineHeight: 44 }}>
          Train smarter.{"\n"}Stay consistent.
        </Text>
        <View style={{ gap: space(4) }}>
          {FEATURES.map((f) => (
            <View key={f.text} style={{ flexDirection: "row", gap: space(3), alignItems: "center" }}>
              <Ionicons name={f.icon} size={22} color={colors.primary} />
              <Text style={{ color: "#D1D5DB", fontSize: 16, flex: 1 }}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: space(3) }}>
        <Button title="Get started" onPress={() => router.push("/register")} />
        <Button title="I already have an account" variant="onDark" onPress={() => router.push("/login")} />
      </View>
    </View>
  );
}
