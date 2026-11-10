import { useEffect, useRef, useState, type ComponentRef } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip, ChipGroup, Empty, Loading, Small, tap } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import { useUser } from "../lib/auth";
import { colors, radius, space } from "../lib/theme";

interface Msg {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
}

const SUGGESTIONS = [
  "How do I know what weight to start with?",
  "I'm sore from last workout. Should I still train?",
  "I only have 20 minutes today. What should I do?",
  "How do I grow my biceps faster?",
];

export default function Coach() {
  const user = useUser();
  const insets = useSafeAreaInsets();
  const status = useQuery({
    queryKey: ["coachStatus"],
    queryFn: () => api.get<{ available: boolean; provider: string | null }>("/coach/status"),
  });
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length, sending]);

  if (status.isPending) return <Loading />;
  if (!status.data?.available) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: space(4) }}>
        <Empty
          icon="chatbubbles-outline"
          title="AI coach isn't set up yet"
          body={
            "Your server needs a free AI provider. Easiest: install Ollama on the computer running the server (ollama.com), run `ollama pull llama3.1:8b`, and restart the server. Groq and Gemini free API keys work too - see the project README."
          }
        />
      </View>
    );
  }

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    tap();
    setInput("");
    const history = [...messages.filter((m) => !m.failed), { role: "user" as const, content }];
    setMessages([...messages.filter((m) => !m.failed), { role: "user", content }]);
    setSending(true);
    try {
      const res = await api.post<{ reply: string }>("/coach/chat", { messages: history.map(({ role, content: c }) => ({ role, content: c })) }, 120_000);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: errorMessage(e), failed: true }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top + 48}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: space(4), gap: space(2.5), flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {messages.length === 0 && (
          <View style={{ gap: space(3), paddingTop: space(4) }}>
            <View style={{ alignItems: "center", gap: space(2) }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="chatbubbles" size={30} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text }}>Hey {user.name}! 👋</Text>
              <Small style={{ textAlign: "center" }}>
                Ask me anything about training, your plan, form or recovery. I know your goal and your schedule.
              </Small>
            </View>
            <ChipGroup>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => void send(s)} />
              ))}
            </ChipGroup>
          </View>
        )}
        {messages.map((m, i) => (
          <View
            key={i}
            style={{
              maxWidth: "85%",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              backgroundColor: m.role === "user" ? colors.primary : m.failed ? colors.dangerSoft : colors.card,
              borderRadius: radius.lg,
              borderBottomRightRadius: m.role === "user" ? 4 : radius.lg,
              borderBottomLeftRadius: m.role === "user" ? radius.lg : 4,
              paddingHorizontal: space(3.5),
              paddingVertical: space(2.5),
            }}
          >
            <Text style={{ fontSize: 15, lineHeight: 21, color: m.role === "user" ? "#fff" : m.failed ? colors.danger : colors.text }}>
              {m.content}
            </Text>
          </View>
        ))}
        {sending && (
          <View style={{ alignSelf: "flex-start", backgroundColor: colors.card, borderRadius: radius.lg, padding: space(3) }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        {messages.length > 0 && (
          <Small style={{ textAlign: "center", marginTop: space(2) }}>AI advice - double-check anything important.</Small>
        )}
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: space(2),
          padding: space(3),
          paddingBottom: Math.max(insets.bottom, space(3)),
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask your coach…"
          placeholderTextColor={colors.faint}
          multiline
          maxLength={2000}
          style={{
            flex: 1,
            minWidth: 0,
            maxHeight: 110,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: space(3.5),
            paddingVertical: space(2.5),
            fontSize: 16,
            color: colors.text,
          }}
        />
        <Pressable
          accessibilityLabel="Send"
          disabled={!input.trim() || sending}
          onPress={() => void send(input)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: input.trim() && !sending ? colors.primary : colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-up" size={22} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
