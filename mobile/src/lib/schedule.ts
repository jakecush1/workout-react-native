// Calendar bookings, shared by the Calendar tab, the scheduler and reminders.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { tzOffset } from "./dates";
import type { ScheduledWorkout } from "./types";

export const SCHEDULE_KEY = ["schedule"];

/** All bookings from a year back to a year ahead. */
export function useSchedule() {
  return useQuery({ queryKey: SCHEDULE_KEY, queryFn: () => api.get<ScheduledWorkout[]>(`/schedule?tzOffset=${tzOffset()}`) });
}

export function useScheduleMutations() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries();
  const book = useMutation({
    mutationFn: (body: { planDayId?: string | null; name?: string; dates: string[]; time?: string | null; notes?: string }) =>
      api.post<{ created: number; skipped: number; items: ScheduledWorkout[] }>("/schedule", { ...body, tzOffset: tzOffset() }),
    onSuccess: done,
  });
  const move = useMutation({
    mutationFn: ({ id, ...body }: { id: string; date?: string; time?: string | null; name?: string; notes?: string }) =>
      api.put<ScheduledWorkout>(`/schedule/${id}`, { ...body, tzOffset: tzOffset() }),
    onSuccess: done,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.del(`/schedule/${id}`), onSuccess: done });
  return { book, move, remove };
}
