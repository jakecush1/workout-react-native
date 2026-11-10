import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../lib/auth";
import { loadActiveWorkout } from "../lib/activeWorkout";
import { Loading } from "../components/ui";
import { colors } from "../lib/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  useEffect(() => {
    void loadActiveWorkout();
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { loading, user } = useAuth();
  if (loading) return <Loading />;
  const signedIn = !!user;
  const ready = signedIn && user.onboarded;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={ready} redirectTo={signedIn ? "/onboarding" : "/welcome"}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plan/new" options={{ title: "New plan" }} />
        <Stack.Screen name="plan/templates" options={{ title: "Pre-made plans" }} />
        <Stack.Screen name="plan/template/[id]" options={{ title: "" }} />
        <Stack.Screen name="plan/assistant" options={{ title: "Plan builder" }} />
        <Stack.Screen name="plan/preview" options={{ title: "Your new plan" }} />
        <Stack.Screen name="plan/[id]" options={{ title: "" }} />
        <Stack.Screen name="plan/edit" options={{ title: "Edit plan" }} />
        <Stack.Screen name="workout" options={{ title: "Workout", gestureEnabled: false }} />
        <Stack.Screen name="session/[id]" options={{ title: "" }} />
        <Stack.Screen name="exercise/[id]" options={{ title: "" }} />
        <Stack.Screen name="exercise-picker" options={{ title: "Add exercises", presentation: "modal" }} />
        <Stack.Screen name="body-weight" options={{ title: "Body weight" }} />
        <Stack.Screen name="coach" options={{ title: "AI Coach" }} />
        <Stack.Screen name="schedule/new" options={{ title: "Schedule workouts", presentation: "modal" }} />
        <Stack.Screen name="stats" options={{ title: "All-time stats" }} />
        <Stack.Screen name="edit-profile" options={{ title: "Edit profile" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !user?.onboarded} redirectTo={signedIn ? "/" : "/welcome"}>
        <Stack.Screen name="onboarding" options={{ title: "Your profile", headerBackVisible: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Sign in" }} />
        <Stack.Screen name="register" options={{ title: "Create account" }} />
      </Stack.Protected>
    </Stack>
  );
}
