import { TEMPLATES, type AccessKey, type WorkoutTemplate } from "../data/templates.js";
import type { MuscleGroup } from "../data/exercises.js";

const ACCESS_RANK: Record<AccessKey, number> = { BODYWEIGHT: 0, DUMBBELLS: 1, FULL_GYM: 2 };
const LEVEL_RANK = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 } as const;

export interface TemplateFilter {
  goal?: WorkoutTemplate["goal"];
  daysPerWeek?: number;
  equipment?: AccessKey;
  experience?: WorkoutTemplate["level"];
  focus?: MuscleGroup[];
}

export interface ScoredTemplate {
  template: WorkoutTemplate;
  score: number;
  reasons: string[];
}

/** Rank templates by how well they fit. Templates needing equipment the user lacks are excluded. */
export function recommendTemplates(f: TemplateFilter): ScoredTemplate[] {
  return TEMPLATES.filter((t) => !f.equipment || ACCESS_RANK[t.equipment] <= ACCESS_RANK[f.equipment])
    .map((t) => {
      let score = 0;
      const reasons: string[] = [];
      if (f.goal) {
        if (t.goal === f.goal) {
          score += 50;
          reasons.push("Matches your goal");
        } else if (f.goal === "GENERAL_FITNESS" || t.goal === "GENERAL_FITNESS") {
          score += 15;
        }
      }
      if (f.daysPerWeek) {
        const diff = Math.abs(t.days.length - f.daysPerWeek);
        if (diff === 0) {
          score += 30;
          reasons.push(`${t.days.length} days a week`);
        } else if (diff === 1) score += 12;
        else score -= diff * 5;
      }
      if (f.experience) {
        const diff = LEVEL_RANK[t.level] - LEVEL_RANK[f.experience];
        if (diff === 0) {
          score += 12;
          reasons.push(`Built for ${f.experience.toLowerCase()}s`);
        } else if (diff > 0) score -= diff * 12; // too advanced is worse than too easy
        else score -= 4;
      }
      if (f.focus?.length) {
        const hits = f.focus.filter((m) => t.focus.includes(m));
        // Reward overlap, plus extra when the template specializes in those muscles.
        score += hits.length * 10 + (hits.length / t.focus.length) * 20;
        if (hits.length) reasons.push(`Targets ${hits.join(", ").replace(/_/g, " ")}`);
      }
      return { template: t, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
