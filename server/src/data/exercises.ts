// Built-in exercise library. IDs are stable slugs so templates and the AI can reference them.

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "full_body",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type EquipmentTag =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "none";

export interface LibraryExercise {
  id: string;
  name: string;
  type: "STRENGTH" | "CARDIO" | "MOBILITY";
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentTag;
  instructions: string;
}

type Row = [
  id: string,
  name: string,
  type: LibraryExercise["type"],
  primary: MuscleGroup,
  secondary: MuscleGroup[],
  equipment: EquipmentTag,
  instructions: string,
];

const rows: Row[] = [
  // Chest
  ["barbell-bench-press", "Barbell Bench Press", "STRENGTH", "chest", ["triceps", "shoulders"], "barbell", "Lie on the bench, lower the bar to mid-chest with elbows ~45°, press back up."],
  ["incline-barbell-bench-press", "Incline Barbell Bench Press", "STRENGTH", "chest", ["shoulders", "triceps"], "barbell", "Bench at 30-45°. Lower the bar to upper chest and press up."],
  ["dumbbell-bench-press", "Dumbbell Bench Press", "STRENGTH", "chest", ["triceps", "shoulders"], "dumbbell", "Press dumbbells from chest level to lockout, keeping shoulder blades pinched."],
  ["incline-dumbbell-press", "Incline Dumbbell Press", "STRENGTH", "chest", ["shoulders", "triceps"], "dumbbell", "Bench at 30-45°. Press dumbbells up and slightly together."],
  ["dumbbell-fly", "Dumbbell Fly", "STRENGTH", "chest", ["shoulders"], "dumbbell", "Slight bend in elbows, open arms wide until you feel a chest stretch, squeeze back up."],
  ["cable-crossover", "Cable Crossover", "STRENGTH", "chest", ["shoulders"], "cable", "Step forward between cables and bring handles together in a hugging motion."],
  ["machine-chest-press", "Machine Chest Press", "STRENGTH", "chest", ["triceps", "shoulders"], "machine", "Adjust seat so handles are at mid-chest. Press forward under control."],
  ["push-up", "Push-Up", "STRENGTH", "chest", ["triceps", "shoulders", "core"], "bodyweight", "Hands under shoulders, body in a straight line, lower chest to the floor and push up."],
  ["incline-push-up", "Incline Push-Up", "STRENGTH", "chest", ["triceps", "shoulders"], "bodyweight", "Hands on a bench or counter. Easier push-up variation for building up."],
  ["dips", "Dips", "STRENGTH", "chest", ["triceps", "shoulders"], "bodyweight", "Lean slightly forward on parallel bars, lower until shoulders are below elbows, press up."],

  // Back
  ["deadlift", "Deadlift", "STRENGTH", "back", ["hamstrings", "glutes", "core"], "barbell", "Bar over mid-foot, hinge to grip, brace, and stand up driving through the floor."],
  ["barbell-row", "Barbell Row", "STRENGTH", "back", ["biceps"], "barbell", "Hinge to ~45°, pull the bar to your lower ribs, lower under control."],
  ["pull-up", "Pull-Up", "STRENGTH", "back", ["biceps"], "bodyweight", "Overhand grip, pull until chin clears the bar, lower fully."],
  ["chin-up", "Chin-Up", "STRENGTH", "back", ["biceps"], "bodyweight", "Underhand grip, pull chin over the bar, lower fully."],
  ["lat-pulldown", "Lat Pulldown", "STRENGTH", "back", ["biceps"], "cable", "Pull the bar to upper chest while driving elbows down, control the return."],
  ["seated-cable-row", "Seated Cable Row", "STRENGTH", "back", ["biceps"], "cable", "Sit tall, pull the handle to your stomach, squeeze shoulder blades together."],
  ["dumbbell-row", "One-Arm Dumbbell Row", "STRENGTH", "back", ["biceps"], "dumbbell", "Support on a bench, row the dumbbell to your hip, lower with control."],
  ["t-bar-row", "T-Bar Row", "STRENGTH", "back", ["biceps"], "barbell", "Straddle the bar, hinge, and row the handle to your chest."],
  ["inverted-row", "Inverted Row", "STRENGTH", "back", ["biceps", "core"], "bodyweight", "Hang under a bar or sturdy table, body straight, pull chest up to it."],
  ["face-pull", "Face Pull", "STRENGTH", "shoulders", ["back"], "cable", "Rope at face height, pull toward your forehead with elbows high, rotate hands out."],
  ["band-pull-apart", "Band Pull-Apart", "STRENGTH", "back", ["shoulders"], "band", "Hold a band at shoulder height and pull it apart until it touches your chest."],
  ["superman", "Superman Hold", "STRENGTH", "back", ["glutes"], "bodyweight", "Lie face down and lift arms and legs off the floor, hold briefly."],

  // Shoulders
  ["overhead-press", "Overhead Press", "STRENGTH", "shoulders", ["triceps", "core"], "barbell", "Press the bar from collarbone to overhead lockout, keep ribs down."],
  ["dumbbell-shoulder-press", "Dumbbell Shoulder Press", "STRENGTH", "shoulders", ["triceps"], "dumbbell", "Seated or standing, press dumbbells from ear level to overhead."],
  ["arnold-press", "Arnold Press", "STRENGTH", "shoulders", ["triceps"], "dumbbell", "Start palms facing you, rotate out as you press overhead."],
  ["lateral-raise", "Lateral Raise", "STRENGTH", "shoulders", [], "dumbbell", "Raise dumbbells out to the sides to shoulder height, slight bend in elbows."],
  ["cable-lateral-raise", "Cable Lateral Raise", "STRENGTH", "shoulders", [], "cable", "Single arm, raise the handle out to the side to shoulder height."],
  ["rear-delt-fly", "Rear Delt Fly", "STRENGTH", "shoulders", ["back"], "dumbbell", "Hinge forward and raise dumbbells out to the sides, squeezing rear shoulders."],
  ["pike-push-up", "Pike Push-Up", "STRENGTH", "shoulders", ["triceps"], "bodyweight", "Hips high in an inverted V, lower head toward the floor and press back."],
  ["machine-shoulder-press", "Machine Shoulder Press", "STRENGTH", "shoulders", ["triceps"], "machine", "Press handles overhead under control."],

  // Biceps
  ["barbell-curl", "Barbell Curl", "STRENGTH", "biceps", [], "barbell", "Elbows pinned at your sides, curl the bar up, lower slowly."],
  ["dumbbell-curl", "Dumbbell Curl", "STRENGTH", "biceps", [], "dumbbell", "Curl dumbbells with palms up, avoid swinging."],
  ["hammer-curl", "Hammer Curl", "STRENGTH", "biceps", [], "dumbbell", "Palms facing each other, curl dumbbells up."],
  ["incline-dumbbell-curl", "Incline Dumbbell Curl", "STRENGTH", "biceps", [], "dumbbell", "Sit back on an incline bench, arms hanging, curl up."],
  ["cable-curl", "Cable Curl", "STRENGTH", "biceps", [], "cable", "Curl a straight bar or rope from a low pulley."],
  ["band-curl", "Band Curl", "STRENGTH", "biceps", [], "band", "Stand on a band and curl the handles up."],

  // Triceps
  ["close-grip-bench-press", "Close-Grip Bench Press", "STRENGTH", "triceps", ["chest"], "barbell", "Hands shoulder-width apart, elbows tucked, press."],
  ["tricep-pushdown", "Tricep Pushdown", "STRENGTH", "triceps", [], "cable", "Elbows at your sides, push the bar or rope down to full extension."],
  ["overhead-tricep-extension", "Overhead Tricep Extension", "STRENGTH", "triceps", [], "dumbbell", "Hold one dumbbell overhead with both hands, lower behind head, extend."],
  ["skull-crusher", "Skull Crusher", "STRENGTH", "triceps", [], "barbell", "Lying down, lower an EZ-bar toward your forehead, extend arms."],
  ["bench-dip", "Bench Dip", "STRENGTH", "triceps", ["chest"], "bodyweight", "Hands on a bench behind you, lower your body and press back up."],
  ["diamond-push-up", "Diamond Push-Up", "STRENGTH", "triceps", ["chest"], "bodyweight", "Hands together under your chest forming a diamond, do a push-up."],

  // Quads
  ["back-squat", "Barbell Back Squat", "STRENGTH", "quads", ["glutes", "core"], "barbell", "Bar on upper back, sit down and back to at least parallel, drive up."],
  ["front-squat", "Front Squat", "STRENGTH", "quads", ["glutes", "core"], "barbell", "Bar on front of shoulders, elbows high, squat upright."],
  ["goblet-squat", "Goblet Squat", "STRENGTH", "quads", ["glutes", "core"], "dumbbell", "Hold a dumbbell at your chest and squat between your knees."],
  ["leg-press", "Leg Press", "STRENGTH", "quads", ["glutes"], "machine", "Feet shoulder-width on the platform, lower until knees are ~90°, press."],
  ["walking-lunge", "Walking Lunge", "STRENGTH", "quads", ["glutes"], "dumbbell", "Step forward into a lunge, back knee near the floor, alternate legs."],
  ["bulgarian-split-squat", "Bulgarian Split Squat", "STRENGTH", "quads", ["glutes"], "dumbbell", "Rear foot on a bench, lower until front thigh is parallel."],
  ["leg-extension", "Leg Extension", "STRENGTH", "quads", [], "machine", "Extend legs to straight, squeeze quads, lower slowly."],
  ["bodyweight-squat", "Bodyweight Squat", "STRENGTH", "quads", ["glutes"], "bodyweight", "Feet shoulder-width, sit back and down, stand up tall."],
  ["reverse-lunge", "Reverse Lunge", "STRENGTH", "quads", ["glutes"], "bodyweight", "Step back into a lunge and return to standing."],
  ["step-up", "Step-Up", "STRENGTH", "quads", ["glutes"], "dumbbell", "Step onto a box or bench driving through the front heel."],
  ["wall-sit", "Wall Sit", "STRENGTH", "quads", [], "bodyweight", "Back against a wall, thighs parallel to the floor, hold."],

  // Hamstrings
  ["romanian-deadlift", "Romanian Deadlift", "STRENGTH", "hamstrings", ["glutes", "back"], "barbell", "Soft knees, hinge at the hips sliding the bar down your thighs, stand up."],
  ["dumbbell-romanian-deadlift", "Dumbbell Romanian Deadlift", "STRENGTH", "hamstrings", ["glutes"], "dumbbell", "Hinge with dumbbells close to your legs until you feel a hamstring stretch."],
  ["lying-leg-curl", "Lying Leg Curl", "STRENGTH", "hamstrings", [], "machine", "Curl the pad toward your glutes, lower slowly."],
  ["seated-leg-curl", "Seated Leg Curl", "STRENGTH", "hamstrings", [], "machine", "Curl the pad down and back, control the return."],
  ["single-leg-rdl", "Single-Leg Romanian Deadlift", "STRENGTH", "hamstrings", ["glutes", "core"], "bodyweight", "Balance on one leg and hinge forward, extending the other leg behind you."],
  ["nordic-curl", "Nordic Hamstring Curl", "STRENGTH", "hamstrings", [], "bodyweight", "Kneel with ankles anchored, lower your torso forward as slowly as possible."],

  // Glutes
  ["hip-thrust", "Barbell Hip Thrust", "STRENGTH", "glutes", ["hamstrings"], "barbell", "Upper back on a bench, bar over hips, drive hips up and squeeze."],
  ["glute-bridge", "Glute Bridge", "STRENGTH", "glutes", ["hamstrings"], "bodyweight", "Lie on your back, feet flat, lift hips until body is straight."],
  ["cable-kickback", "Cable Glute Kickback", "STRENGTH", "glutes", [], "cable", "Ankle strap on, kick your leg straight back and squeeze."],
  ["kettlebell-swing", "Kettlebell Swing", "STRENGTH", "glutes", ["hamstrings", "core"], "kettlebell", "Hinge and snap your hips forward to swing the bell to chest height."],
  ["sumo-deadlift", "Sumo Deadlift", "STRENGTH", "glutes", ["quads", "hamstrings", "back"], "barbell", "Wide stance, hands inside knees, push the floor away."],
  ["banded-lateral-walk", "Banded Lateral Walk", "STRENGTH", "glutes", [], "band", "Band around knees or ankles, stay low, step sideways."],

  // Calves
  ["standing-calf-raise", "Standing Calf Raise", "STRENGTH", "calves", [], "machine", "Rise onto your toes as high as possible, lower for a full stretch."],
  ["seated-calf-raise", "Seated Calf Raise", "STRENGTH", "calves", [], "machine", "Knees under the pad, raise heels, lower slowly."],
  ["bodyweight-calf-raise", "Bodyweight Calf Raise", "STRENGTH", "calves", [], "bodyweight", "On a step edge, raise up on your toes and lower below the step."],

  // Core
  ["plank", "Plank", "STRENGTH", "core", [], "bodyweight", "Forearms down, body straight from head to heels, brace and hold."],
  ["side-plank", "Side Plank", "STRENGTH", "core", [], "bodyweight", "On one forearm, hips lifted in a straight line, hold each side."],
  ["hanging-leg-raise", "Hanging Leg Raise", "STRENGTH", "core", [], "bodyweight", "Hang from a bar and raise legs to hip height or higher."],
  ["cable-crunch", "Cable Crunch", "STRENGTH", "core", [], "cable", "Kneel facing the cable, crunch down bringing elbows to knees."],
  ["russian-twist", "Russian Twist", "STRENGTH", "core", [], "bodyweight", "Sit leaning back, feet up, rotate torso side to side."],
  ["dead-bug", "Dead Bug", "STRENGTH", "core", [], "bodyweight", "On your back, extend opposite arm and leg while keeping low back flat."],
  ["bicycle-crunch", "Bicycle Crunch", "STRENGTH", "core", [], "bodyweight", "Alternate elbow to opposite knee in a pedaling motion."],
  ["ab-wheel-rollout", "Ab Wheel Rollout", "STRENGTH", "core", ["back"], "none", "Kneel, roll the wheel forward as far as you can control, pull back."],
  ["mountain-climber", "Mountain Climbers", "CARDIO", "core", ["shoulders", "full_body"], "bodyweight", "From a push-up position, drive knees to chest alternately at pace."],

  // Full body / conditioning
  ["burpee", "Burpee", "CARDIO", "full_body", ["chest", "quads"], "bodyweight", "Squat, kick back to plank, push-up, jump feet in, jump up."],
  ["jumping-jacks", "Jumping Jacks", "CARDIO", "full_body", ["calves"], "bodyweight", "Jump feet out while raising arms overhead, return."],
  ["jump-squat", "Jump Squat", "CARDIO", "quads", ["glutes", "calves"], "bodyweight", "Squat down then explode into a jump, land softly."],
  ["thruster", "Dumbbell Thruster", "STRENGTH", "full_body", ["quads", "shoulders"], "dumbbell", "Front squat with dumbbells, drive up and press them overhead in one motion."],
  ["farmers-carry", "Farmer's Carry", "STRENGTH", "full_body", ["core", "back"], "dumbbell", "Hold heavy weights at your sides and walk tall."],
  ["battle-ropes", "Battle Ropes", "CARDIO", "full_body", ["shoulders", "core"], "none", "Alternate arms whipping the ropes in waves."],

  // Cardio
  ["easy-run", "Easy Run", "CARDIO", "full_body", ["calves", "quads"], "none", "Conversational pace. You should be able to talk in full sentences."],
  ["long-run", "Long Run", "CARDIO", "full_body", ["calves", "quads"], "none", "Slow, steady pace to build endurance. Focus on time on your feet."],
  ["tempo-run", "Tempo Run", "CARDIO", "full_body", ["calves", "quads"], "none", "Comfortably hard pace you could hold for about an hour."],
  ["interval-run", "Interval Run", "CARDIO", "full_body", ["calves", "quads"], "none", "Alternate fast efforts with easy recovery jogs."],
  ["walk", "Brisk Walk", "CARDIO", "full_body", [], "none", "Walk at a brisk pace that raises your heart rate."],
  ["cycling", "Cycling", "CARDIO", "full_body", ["quads"], "machine", "Steady ride on a bike or stationary bike."],
  ["rowing-machine", "Rowing Machine", "CARDIO", "full_body", ["back", "quads"], "machine", "Push with legs, then lean back and pull the handle to your ribs."],
  ["jump-rope", "Jump Rope", "CARDIO", "full_body", ["calves"], "none", "Small, quick hops on the balls of your feet."],
  ["stair-climber", "Stair Climber", "CARDIO", "full_body", ["glutes", "quads"], "machine", "Steady climbing pace, avoid leaning on the rails."],
  ["elliptical", "Elliptical", "CARDIO", "full_body", [], "machine", "Low-impact steady cardio."],

  // Mobility
  ["hip-flexor-stretch", "Hip Flexor Stretch", "MOBILITY", "quads", ["glutes"], "none", "Half-kneeling, tuck your pelvis and shift forward gently."],
  ["worlds-greatest-stretch", "World's Greatest Stretch", "MOBILITY", "full_body", [], "none", "Lunge, place hand down, rotate the other arm to the sky, alternate sides."],
  ["foam-roll", "Foam Rolling", "MOBILITY", "full_body", [], "none", "Slowly roll major muscle groups, pausing on tight spots."],
];

export const EXERCISE_LIBRARY: LibraryExercise[] = rows.map(
  ([id, name, type, primaryMuscle, secondaryMuscles, equipment, instructions]) => ({
    id,
    name,
    type,
    primaryMuscle,
    secondaryMuscles,
    equipment,
    instructions,
  }),
);

export const EXERCISE_BY_ID = new Map(EXERCISE_LIBRARY.map((e) => [e.id, e]));

/** Which equipment tags a user can use given their access level. */
export function allowedEquipment(access: "FULL_GYM" | "DUMBBELLS" | "BODYWEIGHT"): Set<EquipmentTag> {
  switch (access) {
    case "FULL_GYM":
      return new Set(["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "band", "none"]);
    case "DUMBBELLS":
      return new Set(["dumbbell", "bodyweight", "kettlebell", "band", "none"]);
    case "BODYWEIGHT":
      return new Set(["bodyweight", "band", "none"]);
  }
}
