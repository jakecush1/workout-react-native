import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";

/** Entry point: send people to the right place for their auth state. */
export default function Index() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/welcome" />;
  if (!user.onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/today" />;
}
