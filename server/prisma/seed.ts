// Loads the built-in exercise library. Safe to run repeatedly.
import { PrismaClient } from "@prisma/client";
import { EXERCISE_LIBRARY } from "../src/data/exercises.js";
import { TEMPLATES } from "../src/data/templates.js";

const prisma = new PrismaClient();

async function main() {
  // Sanity check: every template must reference a real library exercise.
  const ids = new Set(EXERCISE_LIBRARY.map((e) => e.id));
  for (const t of TEMPLATES)
    for (const d of t.days)
      for (const e of d.exercises)
        if (!ids.has(e.exerciseId)) throw new Error(`Template ${t.id} uses unknown exercise ${e.exerciseId}`);

  for (const e of EXERCISE_LIBRARY) {
    const data = { ...e, ownerId: null };
    await prisma.exercise.upsert({ where: { id: e.id }, create: data, update: data });
  }
  console.log(`Seeded ${EXERCISE_LIBRARY.length} exercises.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
