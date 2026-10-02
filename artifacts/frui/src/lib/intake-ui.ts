import {
  GOALS, MODALITIES, RESOURCES, LIFTS, IntakeSchema, stepErrors, type IntakeData,
} from '@workspace/api-zod';

export const STEP_TITLES = [
  'Biometrics', 'Primary goals', 'Training styles', 'Styles to avoid',
  'Resources', 'Schedule', 'Baselines & limits',
] as const;
export const REVIEW_STEP = 7;

export const WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'Monday', short: 'Mon' }, { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' }, { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' }, { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];
export const LIFT_LABELS: Record<string, string> = {
  squat: 'Squat', bench: 'Bench press', deadlift: 'Deadlift', overheadPress: 'Overhead press',
};
export const AEROBIC_LABELS: Record<string, string> = {
  mile: '1-Mile run', '5k': '5K run', row2k: '2000m row', yoyo: 'Yo-Yo test',
};
export const goalLabel = (id: string) => GOALS.find((g) => g[0] === id)?.[1] ?? id;
export const modalityLabel = (id: string) => MODALITIES.find((m) => m[0] === id)?.[1] ?? id;
export const resourceLabel = (id: string) => RESOURCES.find((r) => r[0] === id)?.[1] ?? id;

export const utcToday = () => new Date().toISOString().slice(0, 10);

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

function pathStep(key: string | number | undefined): number {
  switch (key) {
    case 'biometrics': return 0;
    case 'goals': case 'primaryGoal': return 1;
    case 'preferredModalities': return 2;
    case 'dislikedModalities': return 3;
    case 'availableResources': case 'homeEquipment': return 4;
    case 'frequencyDays': case 'weekdays': case 'highMinutes': case 'lowMinutes': case 'timezone': return 5;
    default: return 6;
  }
}

export function schemaErrors(data: IntakeData, step: number): string[] {
  const res = IntakeSchema.safeParse(data);
  if (res.success) return [];
  const out = new Set<string>();
  for (const issue of res.error.issues) {
    const p = issue.path;
    if (pathStep(p[0] as string) !== step) continue;
    if (p[0] === 'baselines' && p[1] === 'strength' && p[2]) {
      out.add(`${LIFT_LABELS[p[2] as string] ?? 'Lift'}: enter a load (0.1–1000) and exact reps from 1 to 5, or clear it.`);
    } else if (p[0] === 'baselines' && p[1] === 'aerobic') {
      out.add('Aerobic result: finish the time (or Yo-Yo variant and distance in 40 m steps), or clear it.');
    } else if (p[0] === 'baselines') {
      out.add(`Baseline value out of range (${p.slice(1).join(' / ')}).`);
    } else if (p[0] === 'biometrics') {
      const f = String(p[1] ?? '');
      const label: Record<string, string> = { age: 'Age must be a whole number from 18 to 120.', heightCm: 'Height must be between 50 and 280 cm.', weightKg: 'Weight must be between 15 and 500 kg.', assessedOn: 'Assessment date is invalid.' };
      out.add(label[f] ?? 'Check your biometrics.');
    } else if (p[0] === 'limitations') {
      out.add('Limitations description must be 500 characters or fewer.');
    } else {
      out.add(issue.message);
    }
  }
  return [...out];
}

export function blockingErrors(data: IntakeData, step: number): string[] {
  if (step > 6) return [];
  return Array.from(new Set([...stepErrors(data, step), ...schemaErrors(data, step)]));
}

export interface Outlier { key: string; msg: string; step: number }
export function outliers(data: IntakeData): Outlier[] {
  const out: Outlier[] = [];
  const b = data.biometrics;
  if (b?.heightCm != null && (b.heightCm < 120 || b.heightCm > 220))
    out.push({ key: `h:${b.heightCm}`, step: 0, msg: `Height of ${Math.round(b.heightCm * 10) / 10} cm is uncommon.` });
  if (b?.weightKg != null && (b.weightKg < 35 || b.weightKg > 200))
    out.push({ key: `w:${b.weightKg}`, step: 0, msg: `Weight of ${Math.round(b.weightKg * 10) / 10} kg is uncommon.` });
  const s = data.baselines?.strength ?? {};
  for (const id of Object.keys(s) as (keyof typeof s)[]) {
    const l = s[id];
    if (l && l.loadKg != null && (l.loadKg > 350 || l.loadKg < 10))
      out.push({ key: `l:${id}:${l.loadKg}`, step: 6, msg: `${LIFT_LABELS[id]} load of ${Math.round(l.loadKg * 10) / 10} kg is uncommon.` });
  }
  const a = data.baselines?.aerobic;
  if (a?.seconds) {
    const range: Record<string, [number, number]> = { mile: [240, 1200], '5k': [900, 3600], row2k: [330, 720] };
    const r = range[a.test];
    if (r && (a.seconds < r[0] || a.seconds > r[1]))
      out.push({ key: `a:${a.test}:${a.seconds}`, step: 6, msg: `${AEROBIC_LABELS[a.test]} time is outside the usual range.` });
  }
  if ((data.baselines?.pushUps ?? 0) > 100) out.push({ key: `pu:${data.baselines?.pushUps}`, step: 6, msg: 'Push-up count above 100 is uncommon.' });
  if ((data.baselines?.pullUps ?? 0) > 50) out.push({ key: `pl:${data.baselines?.pullUps}`, step: 6, msg: 'Pull-up count above 50 is uncommon.' });
  return out;
}

export const fmtNum = (n: number, d = 1) => String(Math.round(n * 10 ** d) / 10 ** d);
export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60); const s = Math.round((sec % 60) * 10) / 10;
  return `${m}:${String(s).padStart(s < 10 ? 2 : 0, '0')}`;
}

export interface Summary { step: number; title: string; lines: string[] }
export function summaries(data: IntakeData): Summary[] {
  const b = data.biometrics ?? {};
  const bio = [
    b.age != null ? `Age ${b.age}` : 'Age not set',
    b.sex ?? 'Biological sex not set',
    b.heightCm != null ? (b.heightUnit === 'ft' ? `${fmtNum(b.heightCm / CM_PER_IN / 12 - ((b.heightCm / CM_PER_IN) % 12) / 12, 0)} ft ${fmtNum((b.heightCm / CM_PER_IN) % 12)} in` : `${fmtNum(b.heightCm)} cm`) : 'Height not shared',
    b.weightKg != null ? (b.weightUnit === 'lb' ? `${fmtNum(b.weightKg / KG_PER_LB)} lb` : `${fmtNum(b.weightKg)} kg`) : 'Weight not shared',
  ];
  const goals = (data.goals ?? []).map((g) => goalLabel(g) + (g === data.primaryGoal && (data.goals?.length ?? 0) > 1 ? ' (primary)' : ''));
  const wd = (data.weekdays ?? []).slice().sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7))
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.short).join(', ');
  const bl = data.baselines;
  const base: string[] = [];
  if (bl?.skipped && !bl.strength && !bl.aerobic) base.push('Baselines skipped for now');
  for (const id of LIFTS) {
    const l = bl?.strength?.[id];
    if (l) base.push(`${LIFT_LABELS[id]}: ${bl?.weightUnit === 'lb' ? fmtNum(l.loadKg / KG_PER_LB) + ' lb' : fmtNum(l.loadKg) + ' kg'} x ${l.reps}`);
  }
  if (bl?.aerobic) {
    const a = bl.aerobic;
    base.push(a.test === 'yoyo' ? `Yo-Yo ${a.variant}: ${a.distanceMeters} m` : `${AEROBIC_LABELS[a.test]}: ${a.seconds ? fmtTime(a.seconds) : '-'}`);
  }
  if (bl?.pushUps != null) base.push(`Push-ups: ${bl.pushUps}`);
  if (bl?.pullUps != null) base.push(`Pull-ups: ${bl.pullUps}`);
  if (bl?.toeTouch) base.push(`Toe touch: ${bl.toeTouch}`);
  const lim = data.limitations;
  base.push(`Pain or limits: ${lim?.answer ?? 'not answered'}${lim?.answer === 'Yes' && lim.areas?.length ? ` (${lim.areas.join(', ')})` : ''}`);
  return [
    { step: 0, title: 'Biometrics', lines: bio },
    { step: 1, title: 'Primary goals', lines: goals.length ? goals : ['None chosen'] },
    { step: 2, title: 'Preferred styles', lines: (data.preferredModalities ?? []).map(modalityLabel) },
    { step: 3, title: 'Styles to avoid', lines: (data.dislikedModalities ?? []).length ? (data.dislikedModalities ?? []).map(modalityLabel) : ['No avoid list'] },
    { step: 4, title: 'Resources', lines: [...(data.availableResources ?? []).map(resourceLabel), ...(data.homeEquipment?.length ? [`Home gym: ${data.homeEquipment.join(' + ')}`] : [])] },
    { step: 5, title: 'Schedule', lines: [`${data.frequencyDays ?? '-'} days: ${wd || '-'}`, `High intensity up to ${data.highMinutes ?? '-'} min`, `Low intensity up to ${data.lowMinutes ?? '-'} min`, data.timezone ?? ''] .filter(Boolean) },
    { step: 6, title: 'Baselines & limits', lines: base },
  ];
}
