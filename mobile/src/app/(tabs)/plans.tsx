import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Empty, ErrorView, Loading, Screen, SectionTitle } from "../../components/ui";
import { PlanCard } from "../../components/PlanBits";
import { api, errorMessage } from "../../lib/api";
import type { Plan } from "../../lib/types";

export default function Plans() {
  const router = useRouter();
  const plans = useQuery({ queryKey: ["plans"], queryFn: () => api.get<Plan[]>("/plans") });

  if (plans.isPending) return <Loading />;
  if (plans.isError) return <ErrorView message={errorMessage(plans.error)} onRetry={() => plans.refetch()} />;
  const active = plans.data.find((p) => p.isActive);
  const others = plans.data.filter((p) => !p.isActive);

  return (
    <Screen
      tabRoot
      title="Plans"
      right={<Button title="New" icon="add" size="sm" onPress={() => router.push("/plan/new")} />}
      refreshing={plans.isRefetching}
      onRefresh={() => plans.refetch()}
    >
      {plans.data.length === 0 ? (
        <Empty
          icon="list-outline"
          title="No plans yet"
          body="Create a plan to get a weekly schedule, reminders and progress tracking."
          action={<Button title="Create a plan" icon="add" onPress={() => router.push("/plan/new")} />}
        />
      ) : null}
      {active && (
        <>
          <SectionTitle>Active plan</SectionTitle>
          <PlanCard plan={active} onPress={() => router.push({ pathname: "/plan/[id]", params: { id: active.id } })} />
        </>
      )}
      {others.length > 0 && (
        <>
          <SectionTitle>Other plans</SectionTitle>
          {others.map((p) => (
            <PlanCard key={p.id} plan={p} onPress={() => router.push({ pathname: "/plan/[id]", params: { id: p.id } })} />
          ))}
        </>
      )}
    </Screen>
  );
}
