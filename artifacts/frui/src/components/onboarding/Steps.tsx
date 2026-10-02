import React, { useContext, useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  GOALS, MODALITIES, RESOURCES, LIFTS, HIGH_DURATIONS, LOW_DURATIONS, resourceWarnings, type IntakeData,
} from '@workspace/api-zod';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Chip, DecimalInput, FieldErrCtx, Group, Notice, Segmented, TimeInput, inputCls } from './fields';
import {
  AEROBIC_LABELS, CM_PER_IN, KG_PER_LB, LIFT_LABELS, WEEKDAYS, modalityLabel, outliers, utcToday,
} from '@/lib/intake-ui';

export interface StepProps {
  data: IntakeData;
  update: (fn: (d: IntakeData) => IntakeData) => void;
  confirmed: Set<string>;
  toggleConfirm: (key: string) => void;
}
type Bio = NonNullable<IntakeData['biometrics']>;
type Baselines = NonNullable<IntakeData['baselines']>;

const Confirmations = ({ data, step, confirmed, toggleConfirm }: StepProps & { step: number }) => {
  const list = outliers(data).filter((o) => o.step === step);
  if (!list.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {list.map((o) => (
        <label key={o.key} className="flex min-h-11 items-start gap-3 rounded-xl border border-clay bg-clay/10 p-3 text-sm text-[#E4CDBB]">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#5A7D9A]" checked={confirmed.has(o.key)} onChange={() => toggleConfirm(o.key)} data-testid={`confirm-${o.key}`} />
          <span>{o.msg} Unusual values can be real. Tick to confirm this is correct.</span>
        </label>
      ))}
    </div>
  );
};

function FtIn({ cm, onChange }: { cm: number | null | undefined; onChange: (cm: number | null) => void }) {
  const setErr = useContext(FieldErrCtx);
  const split = (c: number | null | undefined): [string, string] => {
    if (c == null) return ['', ''];
    const t = c / CM_PER_IN; return [String(Math.floor(t / 12)), String(Math.round((t % 12) * 10) / 10)];
  };
  const [ft, setFt] = useState(split(cm)[0]);
  const [inch, setInch] = useState(split(cm)[1]);
  const calc = (f: string, i: string) => {
    if (!f.trim() && !i.trim()) return { ok: true, v: null as number | null };
    if (!/^\d+$/.test(f.trim() || '0') || !/^\d+(\.\d)?$/.test(i.trim() || '0') || Number(i || 0) >= 12) return { ok: false, v: null };
    const v = (Number(f || 0) * 12 + Number(i || 0)) * CM_PER_IN; return { ok: v > 0, v: v > 0 ? v : null };
  };
  const cur = calc(ft, inch);
  useEffect(() => {
    if (cur.v !== (cm ?? null) && !(!cur.ok && cm == null) && !(cur.v != null && cm != null && Math.abs(cur.v - cm) < 1e-9)) { const [a, b] = split(cm); setFt(a); setInch(b); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cm]);
  useEffect(() => { setErr('height-ftin', cur.ok ? null : 'Height: use whole feet and inches under 12.'); return () => setErr('height-ftin', null); }, [cur.ok, setErr]);
  const push = (f: string, i: string) => { const r = calc(f, i); onChange(r.ok ? r.v : null); };
  return (
    <div className="flex gap-2" role="group" aria-label="Height in feet and inches">
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">Feet
        <input data-testid="input-height-ft" inputMode="numeric" className={inputCls} value={ft} onChange={(e) => { setFt(e.target.value); push(e.target.value, inch); }} /></label>
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">Inches
        <input data-testid="input-height-in" inputMode="decimal" className={inputCls} value={inch} onChange={(e) => { setInch(e.target.value); push(ft, e.target.value); }} /></label>
    </div>
  );
}

export function StepBiometrics(p: StepProps) {
  const b: Bio = p.data.biometrics ?? {};
  const [tip, setTip] = useState(false);
  const set = (patch: Partial<Bio>) => p.update((d) => ({ ...d, biometrics: { ...d.biometrics, ...patch, assessedOn: utcToday() } }));
  const hu = b.heightUnit ?? 'cm'; const wu = b.weightUnit ?? 'kg';
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="info">Adults only: Frui is for athletes aged 18 and over. These numbers give context for future estimates. They are not a VO2 max assessment or a safety guarantee.</Notice>
      <Group title="Age (required)" hint="Whole years. We save your age as of today, not your birth date.">
        <DecimalInput integer value={b.age} onChange={(n) => set({ age: n })} label="Age in years" suffix="yrs" errKey="age" id="input-age" />
      </Group>
      <Group title="Biological sex (required)">
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Biological sex" className="flex flex-1 gap-2">
            {(['Male', 'Female'] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={b.sex === s} data-testid={`radio-sex-${s.toLowerCase()}`} onClick={() => set({ sex: s })}
                className={`min-h-12 flex-1 rounded-xl border text-base font-semibold transition active:scale-[0.98] ${b.sex === s ? 'border-camel bg-slate-deep text-white' : 'border-[#4A4F54] bg-[#2B2B2B] text-light-text hover:border-slate-blue'}`}>{s}</button>
            ))}
          </div>
          <Popover open={tip} onOpenChange={setTip}>
            <PopoverTrigger asChild>
              <button type="button" aria-label="Why we ask for biological sex" data-testid="button-sex-tooltip"
                onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4A4F54] text-camel hover:bg-[#2B2B2B]">
                <HelpCircle className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent role="tooltip" className="w-64 border-[#4A4F54] bg-[#2B2B2B] text-sm text-light-text" onOpenAutoFocus={(e) => e.preventDefault()}>
              This is required strictly for accurate physiological and relative strength calculations.
            </PopoverContent>
          </Popover>
        </div>
      </Group>
      <Group title="Height (optional)" hint="Used later for body-size context such as relative measures. Skip it if you prefer.">
        <Segmented label="Height unit" id="seg-height-unit" value={hu} options={[{ v: 'cm', label: 'cm' }, { v: 'ft', label: 'ft / in' }]} onChange={(v) => p.update((d) => ({ ...d, biometrics: { ...d.biometrics, heightUnit: v } }))} />
        {hu === 'cm'
          ? <DecimalInput value={b.heightCm} onChange={(n) => set({ heightCm: n })} label="Height" suffix="cm" errKey="height-cm" id="input-height-cm" />
          : <FtIn cm={b.heightCm} onChange={(n) => set({ heightCm: n })} />}
      </Group>
      <Group title="Weight (optional)" hint="Used later for load and pacing context. Skip it if you prefer.">
        <Segmented label="Weight unit" id="seg-weight-unit" value={wu} options={[{ v: 'kg', label: 'kg' }, { v: 'lb', label: 'lb' }]} onChange={(v) => p.update((d) => ({ ...d, biometrics: { ...d.biometrics, weightUnit: v } }))} />
        <DecimalInput value={b.weightKg} onChange={(n) => set({ weightKg: n })} unitKey={wu} toDisplay={wu === 'lb' ? (c) => c / KG_PER_LB : undefined} fromDisplay={wu === 'lb' ? (x) => x * KG_PER_LB : undefined} label="Weight" suffix={wu} errKey="weight" id="input-weight" />
      </Group>
      <Confirmations {...p} step={0} />
    </div>
  );
}

export function StepGoals({ data, update }: StepProps) {
  const goals = data.goals ?? [];
  const toggle = (id: string) => update((d) => {
    const cur = d.goals ?? [];
    const next = cur.includes(id) ? cur.filter((g) => g !== id) : cur.length >= 2 ? cur : [...cur, id];
    const primary = next.length === 1 ? next[0] : next.includes(d.primaryGoal ?? '') ? d.primaryGoal : null;
    return { ...d, goals: next, primaryGoal: primary };
  });
  return (
    <div className="flex flex-col gap-6">
      <Group title="What are you training for? (Select up to 2)">
        <div className="flex flex-wrap gap-2">
          {GOALS.map(([id, label]) => (
            <Chip key={id} id={`chip-goal-${id}`} selected={goals.includes(id)} disabled={goals.length >= 2 && !goals.includes(id)} hint={goals.length >= 2 && !goals.includes(id) ? 'Two goals selected. Deselect one first.' : undefined} onClick={() => toggle(id)}>{label}</Chip>
          ))}
        </div>
        {goals.length >= 2 && <p className="text-sm text-muted-text">Two goals selected. Deselect one to swap.</p>}
      </Group>
      {goals.length === 2 && (
        <Group title="Which one comes first?" hint="Your primary goal gets priority when time is tight.">
          <div role="radiogroup" aria-label="Primary goal" className="flex flex-col gap-2">
            {goals.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={data.primaryGoal === id} data-testid={`radio-primary-${id}`}
                onClick={() => update((d) => ({ ...d, primaryGoal: id }))}
                className={`min-h-12 rounded-xl border px-4 text-left text-base font-semibold transition ${data.primaryGoal === id ? 'border-camel bg-slate-deep text-white' : 'border-[#4A4F54] bg-[#2B2B2B] text-light-text hover:border-slate-blue'}`}>
                {GOALS.find((g) => g[0] === id)?.[1]}{data.primaryGoal === id ? '  (primary)' : ''}
              </button>
            ))}
          </div>
        </Group>
      )}
    </div>
  );
}

const CATS = ['Strength', 'Cardio', 'Mobility'] as const;
export function StepPreferred({ data, update }: StepProps) {
  const sel = data.preferredModalities ?? [];
  const dis = data.dislikedModalities ?? [];
  const cats = new Set(sel.map((id) => MODALITIES.find((m) => m[0] === id)?.[2]));
  const toggle = (id: string) => update((d) => {
    const cur = d.preferredModalities ?? [];
    return { ...d, preferredModalities: cur.includes(id) ? cur.filter((m) => m !== id) : cur.length >= 5 ? cur : [...cur, id] };
  });
  const conflicts = sel.filter((id) => dis.includes(id));
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="info">Preferences guide programming. Picking a style does not mean it appears every week. Strength plus cardio qualifies; mobility stays a future consideration, not a requirement.</Notice>
      {CATS.map((cat) => (
        <Group key={cat} title={cat}>
          <div className="flex flex-wrap gap-2">
            {MODALITIES.filter((m) => m[2] === cat).map(([id, label]) => (
              <Chip key={id} id={`chip-pref-${id}`} selected={sel.includes(id)} disabled={sel.length >= 5 && !sel.includes(id)} hint={sel.length >= 5 ? 'Five selected. Deselect one first.' : undefined} onClick={() => toggle(id)}>{label}</Chip>
            ))}
          </div>
        </Group>
      ))}
      <p className="text-sm text-muted-text" aria-live="polite">{sel.length} of 5 chosen (minimum 2).</p>
      {sel.length >= 2 && cats.size < 2 && <Notice tone="error" id="nudge-hybrid">Frui builds Hybrid Athletes. Pick at least one alternate training style to proceed!</Notice>}
      {conflicts.length > 0 && (
        <Notice tone="advisory">
          <p>You previously chose to avoid: {conflicts.map(modalityLabel).join(', ')}. Resolve this before you finish.</p>
          <button type="button" className="mt-2 min-h-11 rounded-lg border border-clay px-3 font-semibold text-[#E4CDBB] hover:bg-clay/20" data-testid="button-resolve-keep-pref"
            onClick={() => update((d) => ({ ...d, dislikedModalities: (d.dislikedModalities ?? []).filter((x) => !conflicts.includes(x)) }))}>
            Remove from my avoid list
          </button>
        </Notice>
      )}
    </div>
  );
}

export function StepAvoid({ data, update }: StepProps) {
  const sel = data.dislikedModalities ?? [];
  const pref = data.preferredModalities ?? [];
  const toggle = (id: string) => update((d) => {
    const cur = d.dislikedModalities ?? [];
    return { ...d, dislikedModalities: cur.includes(id) ? cur.filter((m) => m !== id) : cur.length >= 5 ? cur : [...cur, id] };
  });
  const conflicts = sel.filter((id) => pref.includes(id));
  return (
    <div className="flex flex-col gap-6">
      <Group title="Which training styles would you prefer to avoid? (Select up to 5)" hint="Optional. These are preferences, not medical restrictions. Pain or injury limits come in the last step.">
        {CATS.map((cat) => (
          <div key={cat} className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-text">{cat}</h3>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.filter((m) => m[2] === cat).map(([id, label]) => {
                const isPref = pref.includes(id) && !sel.includes(id);
                return (
                  <Chip key={id} id={`chip-avoid-${id}`} selected={sel.includes(id)} disabled={isPref || (sel.length >= 5 && !sel.includes(id))}
                    hint={isPref ? 'Preferred in the previous step' : undefined} onClick={() => toggle(id)}>
                    {label}{isPref ? ' (preferred)' : ''}
                  </Chip>
                );
              })}
            </div>
          </div>
        ))}
      </Group>
      <p className="text-sm text-muted-text">Items marked preferred are unavailable here because you chose them as styles you want. Go back to change that.</p>
      {sel.length >= 5 && <Notice tone="advisory">Avoiding several training styles may limit your options. You can update these preferences later.</Notice>}
      {conflicts.length > 0 && (
        <Notice tone="error">
          <p>Preferred and avoided overlap: {conflicts.map(modalityLabel).join(', ')}. Choose one for each.</p>
          {conflicts.map((id) => (
            <div key={id} className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="min-h-11 rounded-lg border border-[#E58F8F] px-3 font-semibold" data-testid={`button-keep-pref-${id}`}
                onClick={() => update((d) => ({ ...d, dislikedModalities: (d.dislikedModalities ?? []).filter((x) => x !== id) }))}>Keep {modalityLabel(id)} as preferred</button>
              <button type="button" className="min-h-11 rounded-lg border border-[#E58F8F] px-3 font-semibold" data-testid={`button-keep-avoid-${id}`}
                onClick={() => update((d) => ({ ...d, preferredModalities: (d.preferredModalities ?? []).filter((x) => x !== id) }))}>Avoid {modalityLabel(id)} instead</button>
            </div>
          ))}
        </Notice>
      )}
    </div>
  );
}

export function StepResources({ data, update }: StepProps) {
  const sel = data.availableResources ?? [];
  const warnings = useMemo(() => resourceWarnings(data), [data]);
  const toggle = (id: string) => update((d) => {
    const cur = d.availableResources ?? [];
    const next = cur.includes(id) ? cur.filter((r) => r !== id) : [...cur, id];
    return { ...d, availableResources: next, homeEquipment: next.includes('home-gym') ? d.homeEquipment : [] };
  });
  const eq = data.homeEquipment ?? [];
  const toggleEq = (id: string) => update((d) => ({ ...d, homeEquipment: (d.homeEquipment ?? []).includes(id) ? (d.homeEquipment ?? []).filter((x) => x !== id) : [...(d.homeEquipment ?? []), id] }));
  return (
    <div className="flex flex-col gap-6">
      <Group title="What do you have access to?" hint="Pick everything that applies. Bodyweight Only means no equipment and can be combined with anything else.">
        <div className="flex flex-wrap gap-2">
          {RESOURCES.map(([id, label]) => (
            <Chip key={id} id={`chip-resource-${id}`} selected={sel.includes(id)} onClick={() => toggle(id)}>
              {id === 'bodyweight' ? 'Bodyweight Only (no equipment)' : label}
            </Chip>
          ))}
        </div>
      </Group>
      {sel.includes('home-gym') && (
        <Group title="Home gym equipment" hint="Dumbbells, kettlebells, or both.">
          <div className="flex flex-wrap gap-2">
            <Chip id="chip-equip-dumbbells" selected={eq.includes('dumbbells')} onClick={() => toggleEq('dumbbells')}>Dumbbells</Chip>
            <Chip id="chip-equip-kettlebells" selected={eq.includes('kettlebells')} onClick={() => toggleEq('kettlebells')}>Kettlebells</Chip>
          </div>
        </Group>
      )}
      {warnings.map((w) => <Notice key={w} tone="advisory">{w}</Notice>)}
      {warnings.length > 0 && <p className="text-sm text-muted-text">These notes never block you. Bodyweight work, walking and mobility can support a balanced plan.</p>}
    </div>
  );
}

export function StepSchedule({ data, update }: StepProps) {
  const days = data.weekdays ?? [];
  const freq = data.frequencyDays ?? null;
  const tzList = useMemo(() => {
    let list: string[] = [];
    try { list = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf('timeZone'); } catch { /* fallback below */ }
    if (data.timezone && !list.includes(data.timezone)) list = [data.timezone, ...list];
    return list;
  }, [data.timezone]);
  const toggleDay = (v: number) => update((d) => {
    const cur = d.weekdays ?? [];
    if (cur.includes(v)) return { ...d, weekdays: cur.filter((x) => x !== v) };
    if (d.frequencyDays && cur.length >= d.frequencyDays) return d;
    return { ...d, weekdays: [...cur, v] };
  });
  return (
    <div className="flex flex-col gap-6">
      <Group title="Training days per week" hint="Frui programs 3 to 6 days. Six is the ceiling so at least one day always stays unprogrammed.">
        <div role="radiogroup" aria-label="Training days per week" className="grid grid-cols-4 gap-2">
          {([3, 4, 5, 6] as const).map((n) => (
            <button key={n} type="button" role="radio" aria-checked={freq === n} data-testid={`radio-freq-${n}`} onClick={() => update((d) => ({ ...d, frequencyDays: n }))}
              className={`min-h-14 rounded-xl border text-xl font-bold transition active:scale-95 ${freq === n ? 'border-camel bg-slate-deep text-white' : 'border-[#4A4F54] bg-[#2B2B2B] text-light-text hover:border-slate-blue'}`}>{n}</button>
          ))}
        </div>
      </Group>
      <Group title={`Which days? ${freq ? `(${days.length} of ${freq})` : ''}`} hint="Choose exactly as many weekdays as your training days.">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => {
            const on = days.includes(w.value); const full = !!freq && days.length >= freq && !on;
            return (
              <button key={w.value} type="button" aria-pressed={on} aria-label={w.label} aria-disabled={full || !freq || undefined} data-testid={`chip-day-${w.value}`}
                onClick={() => { if (!full && freq) toggleDay(w.value); }}
                className={`min-h-12 rounded-lg border text-xs font-bold transition active:scale-95 ${on ? 'border-camel bg-slate-deep text-white' : full || !freq ? 'border-dashed border-[#4A4F54] text-[#9AA1A7]' : 'border-[#4A4F54] bg-[#2B2B2B] text-light-text hover:border-slate-blue'}`}>{w.short}</button>
            );
          })}
        </div>
        {!freq && <p className="text-sm text-muted-text">Choose the number of days first.</p>}
      </Group>
      <Group title="High-intensity session limit" hint="Hard efforts and heavy training. This is the longest you could spend, warm-up and cooldown included, not a required length.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="High intensity minutes">
          {HIGH_DURATIONS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={data.highMinutes === m} data-testid={`radio-high-${m}`} onClick={() => update((d) => ({ ...d, highMinutes: m }))}
              className={`min-h-11 min-w-16 rounded-xl border px-3 text-sm font-semibold transition ${data.highMinutes === m ? 'border-camel bg-slate-deep text-white' : 'border-[#4A4F54] bg-[#2B2B2B] hover:border-slate-blue'}`}>{m} min</button>
          ))}
        </div>
      </Group>
      <Group title="Low-intensity session limit" hint="Easy aerobic sessions. Mobility does not automatically get the long duration. 180 to 240 minutes is for occasional long easy sessions, never a daily plan.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Low intensity minutes">
          {LOW_DURATIONS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={data.lowMinutes === m} data-testid={`radio-low-${m}`} onClick={() => update((d) => ({ ...d, lowMinutes: m }))}
              className={`min-h-11 min-w-16 rounded-xl border px-3 text-sm font-semibold transition ${data.lowMinutes === m ? 'border-camel bg-slate-deep text-white' : 'border-[#4A4F54] bg-[#2B2B2B] hover:border-slate-blue'}`}>{m} min</button>
          ))}
        </div>
        {(data.lowMinutes ?? 0) >= 180 && <Notice tone="info">Occasional long easy sessions only.</Notice>}
      </Group>
      <Group title="Timezone" hint="So weekdays line up with your calendar.">
        <select data-testid="select-timezone" className={inputCls} value={data.timezone ?? ''} onChange={(e) => update((d) => ({ ...d, timezone: e.target.value }))}>
          <option value="" disabled>Choose timezone</option>
          {tzList.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Group>
    </div>
  );
}

type Lift = NonNullable<NonNullable<Baselines['strength']>['squat']>;
const dateInput = (value: string | null | undefined, onChange: (v: string | null) => void, id: string, label = 'Approximate date') => (
  <label className="flex flex-col gap-1.5 text-sm font-medium">{label}
    <input type="date" data-testid={id} max={utcToday()} value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} className={inputCls} />
  </label>
);

export function StepBaselines(p: StepProps) {
  const { data, update } = p;
  const bl: Baselines = data.baselines ?? {};
  const wu = bl.weightUnit ?? 'kg';
  const setBl = (patch: Partial<Baselines>) => update((d) => ({ ...d, baselines: { ...d.baselines, ...patch, skipped: false } }));
  const setLift = (id: string, patch: Partial<Lift> | null) => {
    const cur = (bl.strength as Record<string, Lift | null | undefined> | undefined)?.[id] ?? undefined;
    let next: Record<string, unknown> | null = patch === null ? null : { ...(cur ?? {}), ...patch };
    if (next) { for (const k of Object.keys(next)) if (next[k] === null || next[k] === undefined) delete next[k]; if (!Object.keys(next).length) next = null; }
    setBl({ strength: { ...bl.strength, [id]: next } as Baselines['strength'] });
  };
  const aero = bl.aerobic ?? null;
  const setAero = (patch: Record<string, unknown> | null) => {
    if (patch === null) { setBl({ aerobic: null }); return; }
    const next: Record<string, unknown> = { ...aero, ...patch };
    for (const k of Object.keys(next)) if (next[k] === null || next[k] === undefined) delete next[k];
    setBl({ aerobic: next as Baselines['aerobic'] });
  };
  const lim = data.limitations ?? {};
  const setLim = (patch: Partial<NonNullable<IntakeData['limitations']>>) => update((d) => ({ ...d, limitations: { ...d.limitations, ...patch } }));
  const [openBase, setOpenBase] = useState(!bl.skipped);
  const [clearAsk, setClearAsk] = useState(false);
  const hasAny = !!(bl.aerobic || bl.pushUps != null || bl.pullUps != null || bl.toeTouch || Object.values(bl.strength ?? {}).some(Boolean));
  const showBase = openBase && !(bl.skipped);
  const areas = lim.areas ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="perf-h" className="flex flex-col gap-4">
        <h2 id="perf-h" className="font-serif text-xl font-bold text-light-text">Performance baselines (optional)</h2>
        <Notice tone="info">Enter results you already know. You do not need to perform maximal tests to complete onboarding. Frui stores them as given; it does not estimate a 1RM or VO2 max.</Notice>
        <button type="button" data-testid="button-skip-baselines"
          onClick={() => { update((d) => ({ ...d, baselines: { ...d.baselines, skipped: true } })); setOpenBase(false); }}
          className="min-h-12 rounded-xl border-2 border-camel px-4 text-left text-base font-bold text-camel transition hover:bg-slate-deep/40 active:scale-[0.99]">
          Skip performance baselines for now — I'll add them later.
        </button>
        {bl.skipped && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-text">Skipped. {hasAny ? 'Your previously saved baselines are kept.' : ''} The pain and limits question below is still needed.</p>
            <button type="button" data-testid="button-show-baselines" className="min-h-11 self-start rounded-lg px-1 text-sm font-semibold text-camel underline underline-offset-4" onClick={() => { setOpenBase(true); update((d) => ({ ...d, baselines: { ...d.baselines, skipped: false } })); }}>Enter baselines instead</button>
          </div>
        )}
        {(showBase || (!bl.skipped)) && (
          <div className="flex flex-col gap-6">
            <Group title="Strength: heaviest known set" hint="Exact reps from 1 to 5, and roughly when.">
              <Segmented label="Load unit" id="seg-lift-unit" value={wu} options={[{ v: 'kg', label: 'kg' }, { v: 'lb', label: 'lb' }]} onChange={(v) => update((d) => ({ ...d, baselines: { ...d.baselines, weightUnit: v } }))} />
              {LIFTS.map((id) => {
                const l = bl.strength?.[id] as Lift | null | undefined;
                return (
                  <div key={id} className="flex flex-col gap-3 rounded-2xl border border-[#4A4F54] bg-[#363636] p-4" data-testid={`card-lift-${id}`}>
                    <div className="flex items-center justify-between"><h3 className="font-bold">{LIFT_LABELS[id]}</h3>
                      {l && <button type="button" className="min-h-11 px-2 text-sm font-semibold text-camel" data-testid={`button-clear-${id}`} onClick={() => setLift(id, null)}>Clear</button>}</div>
                    <DecimalInput value={l?.loadKg} unitKey={wu} toDisplay={wu === 'lb' ? (c) => c / KG_PER_LB : undefined} fromDisplay={wu === 'lb' ? (x) => x * KG_PER_LB : undefined}
                      onChange={(n) => setLift(id, { loadKg: n ?? undefined })} label={`Load (${wu})`} suffix={wu} errKey={`lift-${id}`} id={`input-load-${id}`} />
                    <div role="radiogroup" aria-label={`${LIFT_LABELS[id]} exact reps`} className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium">Exact reps</span>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button key={r} type="button" role="radio" aria-checked={l?.reps === r} data-testid={`radio-reps-${id}-${r}`} onClick={() => setLift(id, { reps: r })}
                            className={`min-h-11 flex-1 rounded-lg border text-sm font-bold transition ${l?.reps === r ? 'border-camel bg-slate-deep text-white' : 'border-[#4A4F54] bg-[#2B2B2B] hover:border-slate-blue'}`}>{r}</button>
                        ))}
                      </div>
                    </div>
                    {dateInput(l?.date, (v) => setLift(id, { date: v }), `input-date-${id}`)}
                  </div>
                );
              })}
            </Group>

            <Group title="Aerobic capacity: one known result" hint="Pick a single test. Results are kept as they are and are not converted between tests.">
              <div role="radiogroup" aria-label="Aerobic test" className="flex flex-wrap gap-2">
                {(['mile', '5k', 'row2k', 'yoyo'] as const).map((t) => (
                  <Chip key={t} id={`chip-aero-${t}`} selected={aero?.test === t} onClick={() => setAero(aero?.test === t ? null : { test: t, seconds: null, variant: null, distanceMeters: null })}>{AEROBIC_LABELS[t]}</Chip>
                ))}
              </div>
              {aero && aero.test !== 'yoyo' && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#4A4F54] bg-[#363636] p-4">
                  <TimeInput label={`${AEROBIC_LABELS[aero.test]} time`} seconds={aero.seconds} errKey="aero-time" id="input-aero" onChange={(s) => setAero({ seconds: s })} />
                  {dateInput(aero.date, (v) => setAero({ date: v }), 'input-date-aero')}
                </div>
              )}
              {aero?.test === 'yoyo' && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#4A4F54] bg-[#363636] p-4">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">Test variant
                    <select data-testid="select-yoyo-variant" className={inputCls} value={aero.variant ?? ''} onChange={(e) => setAero({ variant: e.target.value || null })}>
                      <option value="">Choose variant</option>
                      <option value="IR1">Intermittent Recovery Level 1 (IR1)</option><option value="IR2">Intermittent Recovery Level 2 (IR2)</option>
                      <option value="IE1">Intermittent Endurance Level 1 (IE1)</option><option value="IE2">Intermittent Endurance Level 2 (IE2)</option>
                    </select></label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">Total distance (meters, in 40 m steps)
                    <select data-testid="select-yoyo-distance" className={inputCls} value={aero.distanceMeters ?? ''} onChange={(e) => setAero({ distanceMeters: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">Choose distance</option>
                      {Array.from({ length: 100 }, (_, i) => (i + 1) * 40).map((m) => <option key={m} value={m}>{m} m</option>)}
                      {aero.distanceMeters && aero.distanceMeters > 4000 && <option value={aero.distanceMeters}>{aero.distanceMeters} m</option>}
                    </select></label>
                  {dateInput(aero.date, (v) => setAero({ date: v }), 'input-date-aero')}
                </div>
              )}
            </Group>

            <Group title="Bodyweight" hint="Zero is a real result. Leave empty if unknown.">
              <DecimalInput integer value={bl.pushUps} onChange={(n) => setBl({ pushUps: n })} label="Max unbroken push-ups (chest to floor, no rest)" errKey="pushups" id="input-pushups" />
              <DecimalInput integer value={bl.pullUps} onChange={(n) => setBl({ pullUps: n })} label="Max strict pull-ups (dead hang, chin over bar)" errKey="pullups" id="input-pullups" />
            </Group>

            <Group title="Mobility" hint="Can you touch your toes with straight legs? This is one narrow flexibility indicator, nothing more.">
              <div role="radiogroup" aria-label="Toe touch" className="flex flex-wrap gap-2">
                {(['Yes', 'No', 'Not sure'] as const).map((o) => (
                  <Chip key={o} id={`chip-toe-${o}`} selected={bl.toeTouch === o} onClick={() => setBl({ toeTouch: bl.toeTouch === o ? null : o })}>{o}</Chip>
                ))}
              </div>
            </Group>
            {hasAny && (
              <div>
                {!clearAsk ? <button type="button" data-testid="button-clear-all-baselines" className="min-h-11 text-sm font-semibold text-[#F4B4B4] underline underline-offset-4" onClick={() => setClearAsk(true)}>Clear all baselines</button>
                  : <div className="flex flex-wrap items-center gap-2 text-sm"><span>Remove every baseline you entered?</span>
                    <button type="button" data-testid="button-confirm-clear-baselines" className="min-h-11 rounded-lg border border-[#E58F8F] px-3 font-semibold text-[#F4B4B4]" onClick={() => { update((d) => ({ ...d, baselines: { weightUnit: d.baselines?.weightUnit, skipped: false } })); setClearAsk(false); }}>Yes, clear all</button>
                    <button type="button" className="min-h-11 px-3 font-semibold text-camel" onClick={() => setClearAsk(false)}>Keep them</button></div>}
              </div>
            )}
            <Confirmations {...p} step={6} />
          </div>
        )}
      </section>

      <section aria-labelledby="lim-h" className="flex flex-col gap-4 border-t border-[#4A4F54] pt-6">
        <h2 id="lim-h" className="font-serif text-xl font-bold text-light-text">Pain or limitations (required)</h2>
        <p className="text-sm text-muted-text">Everyone answers this, even if you skipped baselines. Do you have current pain or restrictions that limit exercise?</p>
        <div role="radiogroup" aria-label="Current pain or restrictions" className="flex flex-wrap gap-2">
          {(['Yes', 'No', 'Prefer not to say'] as const).map((o) => (
            <button key={o} type="button" role="radio" aria-checked={lim.answer === o} data-testid={`radio-limits-${o.replace(/ /g, '-').toLowerCase()}`} onClick={() => setLim({ answer: o })}
              className={`min-h-12 rounded-xl border px-4 text-base font-semibold transition active:scale-[0.97] ${lim.answer === o ? 'border-camel bg-slate-deep text-white' : 'border-[#4A4F54] bg-[#2B2B2B] hover:border-slate-blue'}`}>{o}</button>
          ))}
        </div>
        {lim.answer === 'Yes' && (
          <div className="flex flex-col gap-3 animate-in fade-in">
            <Group title="Affected areas">
              <div className="flex flex-wrap gap-2">
                {([['lower-back', 'Lower back'], ['knee', 'Knee'], ['other', 'Other']] as const).map(([id, label]) => (
                  <Chip key={id} id={`chip-area-${id}`} selected={areas.includes(id)} onClick={() => setLim({ areas: areas.includes(id) ? areas.filter((a) => a !== id) : [...areas, id] })}>{label}</Chip>
                ))}
              </div>
            </Group>
            <label className="flex flex-col gap-1.5 text-sm font-medium">Short description (optional)
              <textarea data-testid="input-limit-description" maxLength={500} rows={3} value={lim.description ?? ''} onChange={(e) => setLim({ description: e.target.value })} className={`${inputCls} h-auto py-2`} />
              <span className="text-xs text-muted-text">{(lim.description ?? '').length}/500</span></label>
          </div>
        )}
        {lim.answer === 'Prefer not to say' && <Notice tone="info">We will treat your limitation status as unknown, not as cleared.</Notice>}
        <Notice tone="advisory">This is not a diagnosis or medical clearance. Avoid movements that cause pain, and seek qualified advice for persistent or concerning symptoms.</Notice>
      </section>
    </div>
  );
}

