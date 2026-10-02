import { z } from "zod";

export const GOALS = [
  ["max-strength", "Increase Max Strength"], ["hypertrophy", "Hypertrophy"],
  ["aerobic-endurance", "Aerobic Endurance"], ["anaerobic-capacity", "Anaerobic Capacity"],
  ["body-control", "Body Control & Gymnastics"], ["agility", "Athletic Agility & Field Performance"],
  ["general-health", "General Health"], ["fat-loss", "Fat Loss"],
] as const;
export const MODALITIES = [
  ["barbell", "Barbell Lifts", "Strength"], ["olympic", "Olympic Weightlifting", "Strength"],
  ["machines", "Machine/Bodybuilding", "Strength"], ["calisthenics", "Calisthenics", "Strength"],
  ["kettlebells", "Kettlebells", "Strength"], ["distance-running", "Long-Distance Running", "Cardio"],
  ["track-sprints", "Track Sprints", "Cardio"], ["swimming", "Swimming", "Cardio"],
  ["cycling", "Cycling", "Cardio"], ["rowing", "Rowing", "Cardio"],
  ["jump-rope", "Jump Rope", "Cardio"], ["rucking", "Rucking/Hiking", "Cardio"],
  ["walking", "Walking", "Cardio"], ["yoga", "Yoga", "Mobility"],
  ["pilates", "Pilates", "Mobility"], ["stretching", "Stretching", "Mobility"],
] as const;
export const RESOURCES = [
  ["commercial-gym", "Full Commercial Gym"], ["home-gym", "Home Gym (Dumbbells/Kettlebells)"],
  ["treadmill", "Treadmill"], ["stationary-bike", "Stationary Bike"], ["track", "Public Track"],
  ["pool", "Pool"], ["calisthenics-park", "Calisthenics Park"], ["field", "Open Grass Field"],
  ["bike-routes", "Biking Trails/Roads"], ["nature-trails", "Hiking/Nature Trails"],
  ["bodyweight", "Bodyweight Only"],
] as const;
export const LIFTS = ["squat", "bench", "deadlift", "overheadPress"] as const;
export const HIGH_DURATIONS = [30, 45, 60, 75, 90];
export const LOW_DURATIONS = [30, 45, 60, 90, 120, 150, 180, 240];

const known = (ids: readonly string[]) => z.string().refine((v) => ids.includes(v), "Unknown option");
const choices = (ids: readonly string[], max: number) => z.array(known(ids)).max(max)
  .refine((v) => new Set(v).size === v.length, "Choose each option once");
const number = (min: number, max: number) => z.number().finite().min(min).max(max);
const assessmentDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const date = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v &&
    v <= new Date().toISOString().slice(0, 10);
}, "Use a valid date, not in the future");
const lift = z.object({
  loadKg: number(0.1, 1000), reps: number(1, 5).int(), date: assessmentDate.nullable().optional(),
}).strict();
const aerobic = z.object({
  test: z.enum(["mile", "5k", "row2k", "yoyo"]),
  seconds: number(1, 86400).nullable().optional(),
  variant: z.enum(["IR1", "IR2", "IE1", "IE2"]).nullable().optional(),
  distanceMeters: number(40, 30000).multipleOf(40).nullable().optional(),
  date: assessmentDate.nullable().optional(),
}).strict().superRefine((v, ctx) => {
  if (v.test === "yoyo" ? !v.variant || !v.distanceMeters : !v.seconds)
    ctx.addIssue({ code: "custom", message: "Enter the test result and Yo-Yo variant where applicable" });
});
export const IntakeDataSchema = z.object({
  biometrics: z.object({
    age: number(18, 120).int().nullable().optional(),
    sex: z.enum(["Male", "Female"]).nullable().optional(),
    heightCm: number(50, 280).nullable().optional(),
    weightKg: number(15, 500).nullable().optional(),
    heightUnit: z.enum(["cm", "ft"]).optional(),
    weightUnit: z.enum(["kg", "lb"]).optional(),
    assessedOn: assessmentDate.nullable().optional(),
  }).strict().optional(),
  goals: choices(GOALS.map((g) => g[0]), 2).optional(),
  primaryGoal: known(GOALS.map((g) => g[0])).nullable().optional(),
  preferredModalities: choices(MODALITIES.map((m) => m[0]), 5).optional(),
  dislikedModalities: choices(MODALITIES.map((m) => m[0]), 5).optional(),
  availableResources: choices(RESOURCES.map((r) => r[0]), 11).optional(),
  homeEquipment: choices(["dumbbells", "kettlebells"], 2).optional(),
  frequencyDays: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).nullable().optional(),
  weekdays: z.array(number(0, 6).int()).max(6).refine((v) => new Set(v).size === v.length).optional(),
  highMinutes: known(HIGH_DURATIONS.map(String)).transform(Number).optional(),
  lowMinutes: known(LOW_DURATIONS.map(String)).transform(Number).optional(),
  timezone: z.string().max(100).refine((v) => {
    try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; }
  }, "Choose a valid timezone").optional(),
  baselines: z.object({
    strength: z.object({ squat: lift.nullable().optional(), bench: lift.nullable().optional(),
      deadlift: lift.nullable().optional(), overheadPress: lift.nullable().optional() }).strict().optional(),
    aerobic: aerobic.nullable().optional(),
    pushUps: number(0, 10000).int().nullable().optional(),
    pullUps: number(0, 10000).int().nullable().optional(),
    toeTouch: z.enum(["Yes", "No", "Not sure"]).nullable().optional(),
    skipped: z.boolean().optional(),
    weightUnit: z.enum(["kg", "lb"]).optional(),
  }).strict().optional(),
  limitations: z.object({
    answer: z.enum(["Yes", "No", "Prefer not to say"]).nullable().optional(),
    areas: choices(["lower-back", "knee", "other"], 3).optional(),
    description: z.string().max(500).optional(),
  }).strict().optional(),
}).strict();

// Numeric durations in the wire contract; strings are accepted only by the UI before normalization.
export const IntakeSchema = IntakeDataSchema.extend({
  highMinutes: z.number().refine((v) => HIGH_DURATIONS.includes(v), "Choose an available duration").nullable().optional(),
  lowMinutes: z.number().refine((v) => LOW_DURATIONS.includes(v), "Choose an available duration").nullable().optional(),
});
export type IntakeData = z.infer<typeof IntakeSchema>;

export function stepErrors(data: IntakeData, step: number): string[] {
  const errors: string[] = [];
  if (step === 0) {
    if (!data.biometrics?.age) errors.push("Enter your age (18 or older).");
    if (!data.biometrics?.sex) errors.push("Select Male or Female.");
  } else if (step === 1) {
    if (!data.goals?.length) errors.push("Choose one or two goals.");
    if (!data.primaryGoal || !data.goals?.includes(data.primaryGoal)) errors.push("Choose your primary goal.");
  } else if (step === 2) {
    const selected = data.preferredModalities ?? [];
    if (selected.length < 2) errors.push("Choose 2–5 modalities.");
    if (new Set(selected.map((id) => MODALITIES.find((m) => m[0] === id)?.[2])).size < 2)
      errors.push("Frui builds Hybrid Athletes. Pick at least one alternate training style to proceed!");
  } else if (step === 3) {
    if (data.dislikedModalities?.some((id) => data.preferredModalities?.includes(id)))
      errors.push("Resolve the overlap between preferred and avoided modalities.");
  } else if (step === 4) {
    if (!data.availableResources?.length) errors.push("Choose a resource or Bodyweight Only.");
    if (data.availableResources?.includes("home-gym") && !data.homeEquipment?.length)
      errors.push("Specify your home gym equipment.");
  } else if (step === 5) {
    if (!data.frequencyDays) errors.push("Choose 3–6 training days.");
    if (!data.weekdays || data.weekdays.length !== data.frequencyDays) errors.push("Choose weekdays matching your training frequency.");
    if (!data.highMinutes || !data.lowMinutes) errors.push("Choose both session duration limits.");
    if (!data.timezone) errors.push("Choose your timezone.");
  } else if (step === 6 && !data.limitations?.answer) errors.push("Answer the separate pain and limitations question.");
  return errors;
}
export function completionErrors(data: IntakeData): string[] {
  return Array.from({ length: 7 }, (_, i) => stepErrors(data, i)).flat();
}
export function resourceWarnings(data: IntakeData): string[] {
  const r = data.availableResources ?? [];
  const warnings: string[] = [];
  if (data.preferredModalities?.includes("swimming") && !r.includes("pool")) warnings.push("Swimming usually needs pool access. You can keep the preference, but your plan will need alternatives.");
  const strength = r.some((id) => ["commercial-gym", "home-gym", "calisthenics-park", "bodyweight"].includes(id));
  const aerobic = r.some((id) => ["commercial-gym", "treadmill", "stationary-bike", "track", "pool", "field", "bike-routes", "nature-trails", "bodyweight"].includes(id));
  if (r.length && (!strength || !aerobic)) warnings.push("You might be missing equipment for a balanced plan. Consider adding 'Bodyweight Only' or an outdoor space.");
  return warnings;
}