// Hand-off between a screen and a modal it opens (exercise picker, plan draft preview).
import type { Exercise, PlanDraft } from "./types";

let exerciseCallback: ((picked: Exercise[]) => void) | null = null;

export const exercisePicker = {
  open(cb: (picked: Exercise[]) => void) {
    exerciseCallback = cb;
  },
  resolve(picked: Exercise[]) {
    exerciseCallback?.(picked);
    exerciseCallback = null;
  },
};

/** A plan being reviewed or edited before saving. */
export const draftHolder: { draft: PlanDraft | null; notice: string | null } = { draft: null, notice: null };
