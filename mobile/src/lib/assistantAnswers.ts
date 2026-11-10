import type { Questionnaire } from "./types";

/** The last questionnaire answers, so the preview can suggest matching templates. */
export const assistantAnswers: { current: Questionnaire | null } = { current: null };
