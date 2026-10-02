import assert from "node:assert/strict";
import { IntakeSchema, completionErrors, stepErrors, resourceWarnings, MODALITIES } from "@workspace/api-zod";

const valid = {
  biometrics: { age: 30, sex: "Female", heightCm: 170, weightKg: 70 },
  goals: ["max-strength", "aerobic-endurance"], primaryGoal: "max-strength",
  preferredModalities: ["barbell", "walking"], dislikedModalities: [],
  availableResources: ["bodyweight"], frequencyDays: 3, weekdays: [1, 3, 5],
  highMinutes: 45, lowMinutes: 60, timezone: "America/Detroit",
  baselines: { skipped: true, pushUps: 0, pullUps: 0 },
  limitations: { answer: "No" },
};
const parsed = IntakeSchema.parse(valid);
assert.deepEqual(completionErrors(parsed), []);
assert(IntakeSchema.safeParse({}).success, "Partial drafts must be allowed");
assert(!IntakeSchema.safeParse({ ...valid, frequencyDays: 7 }).success);
assert(!IntakeSchema.safeParse({ ...valid, frequencyDays: 2 }).success);
assert(!IntakeSchema.safeParse({ ...valid, weekdays: [0, 1, 2, 3, 4, 5, 6] }).success);
assert(!IntakeSchema.safeParse({ ...valid, highMinutes: 240 }).success);
assert(!IntakeSchema.safeParse({ ...valid, lowMinutes: 75 }).success);
assert(!IntakeSchema.safeParse({ ...valid, biometrics: { age: 17, sex: "Female" } }).success);
assert(!IntakeSchema.safeParse({ ...valid, biometrics: { age: 30, sex: "Prefer not to say" } }).success);
assert(stepErrors({ ...parsed, biometrics: { age: 30 } }, 0).length);
assert(stepErrors({ ...parsed, goals: [] }, 1).length);
assert(stepErrors({ ...parsed, primaryGoal: "hypertrophy" }, 1).length);
assert(stepErrors({ ...parsed, preferredModalities: ["barbell", "kettlebells"] }, 2).length);
assert(stepErrors({ ...parsed, dislikedModalities: ["barbell"] }, 3).length);
assert(stepErrors({ ...parsed, availableResources: ["home-gym"] }, 4).length);
assert(stepErrors({ ...parsed, weekdays: [1, 3] }, 5).length);
assert(stepErrors({ ...parsed, limitations: undefined }, 6).length, "Skipping baselines cannot skip limitations");
assert(!IntakeSchema.safeParse({ ...valid, preferredModalities: ["barbell", "alien"] }).success);
assert(!IntakeSchema.safeParse({ ...valid, availableResources: ["imaginary"] }).success);
assert(!IntakeSchema.safeParse({ ...valid, weekdays: [1, 1, 3] }).success);
assert(!IntakeSchema.safeParse({ ...valid, userId: "other-user" }).success);
assert(!IntakeSchema.safeParse({ ...valid, timezone: "not-a-timezone" }).success);
assert(!IntakeSchema.safeParse({ ...valid, biometrics: { age: Number.NaN } }).success);
assert(!IntakeSchema.safeParse({ ...valid, baselines: { strength: { squat: { loadKg: 70, reps: 6 } } } }).success);
assert(!IntakeSchema.safeParse({ ...valid, baselines: { aerobic: { test: "5k" } } }).success);
assert(!IntakeSchema.safeParse({ ...valid, baselines: { aerobic: { test: "yoyo", distanceMeters: 800 } } }).success);
assert(!IntakeSchema.safeParse({ ...valid, baselines: { aerobic: { test: "yoyo", variant: "IR1", distanceMeters: 801 } } }).success);
assert(!IntakeSchema.safeParse({ ...valid, baselines: { aerobic: { test: "5k", seconds: 1200, date: "2025-02-31" } } }).success);
assert(IntakeSchema.safeParse({ ...valid, baselines: { aerobic: { test: "yoyo", variant: "IR1", distanceMeters: 800 } } }).success);
assert(IntakeSchema.safeParse({ ...valid, baselines: { strength: { squat: { loadKg: 70, reps: 3 } } } }).success);
assert(IntakeSchema.safeParse({ ...valid, biometrics: { age: 30, sex: "Male", heightCm: null, weightKg: null } }).success);
assert.equal(resourceWarnings(parsed).length, 0);
assert(resourceWarnings({ ...parsed, preferredModalities: ["barbell", "swimming"] }).length);
assert.equal(new Set(MODALITIES.map((m) => m[0])).size, MODALITIES.length);
console.log("Intake checks passed: required sex, six-day cap, hybrid rules, priorities, units, partial/skip baselines, limitations, resource advisories and invalid inputs.");