import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Info } from 'lucide-react';

export const FieldErrCtx = createContext<(key: string, msg: string | null) => void>(() => {});

export function Chip({ selected, disabled, onClick, children, id, hint }: {
  selected: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; id: string; hint?: string;
}) {
  return (
    <button type="button" aria-pressed={selected} aria-disabled={disabled || undefined} data-testid={id}
      title={hint}
      onClick={() => { if (!disabled) onClick(); }}
      className={`group flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-left text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
        selected ? 'border-camel bg-slate-deep text-white shadow-[inset_0_0_0_1px_rgba(169,195,216,0.35)]'
          : disabled ? 'cursor-not-allowed border-dashed border-[#4A4F54] bg-transparent text-[#9AA1A7]'
            : 'border-[#4A4F54] bg-[#2B2B2B] text-light-text hover:border-slate-blue'
      }`}>
      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${selected ? 'border-white bg-white text-slate-deep' : 'border-[#7C858C]'}`}>
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

export function Notice({ tone, children, id }: { tone: 'error' | 'advisory' | 'info'; children: React.ReactNode; id?: string }) {
  const styles = {
    error: 'border-[#E58F8F] bg-[#E58F8F]/10 text-[#F4B4B4]',
    advisory: 'border-clay bg-clay/15 text-[#E4CDBB]',
    info: 'border-slate-blue bg-slate-blue/15 text-[#CFE0EE]',
  }[tone];
  const Icon = tone === 'error' ? AlertCircle : Info;
  return (
    <div role={tone === 'error' ? 'alert' : 'note'} data-testid={id}
      className={`flex gap-2 rounded-xl border-l-4 px-3 py-2.5 text-sm leading-snug animate-in fade-in slide-in-from-top-1 ${styles}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-bold uppercase tracking-wider text-camel">{title}</legend>
      {hint && <p className="-mt-1 text-sm text-muted-text">{hint}</p>}
      {children}
    </fieldset>
  );
}

export const inputCls = 'h-12 w-full rounded-xl border border-[#4A4F54] bg-[#2B2B2B] px-3 text-base text-light-text placeholder:text-[#8D959B] focus-visible:border-camel';

type Parsed = { ok: true; v: number | null } | { ok: false };
function parse(t: string, integer: boolean): Parsed {
  const x = t.trim();
  if (x === '') return { ok: true, v: null };
  if (!(integer ? /^\d+$/ : /^\d+(\.\d{1,2})?$/).test(x)) return { ok: false };
  const v = Number(x);
  return Number.isFinite(v) ? { ok: true, v } : { ok: false };
}

export function DecimalInput({ value, onChange, toDisplay = (c) => c, fromDisplay = (d) => d, unitKey = '', integer, label, suffix, errKey, id, placeholder }: {
  value: number | null | undefined; onChange: (n: number | null) => void;
  toDisplay?: (c: number) => number; fromDisplay?: (d: number) => number; unitKey?: string;
  integer?: boolean; label: string; suffix?: string; errKey: string; id: string; placeholder?: string;
}) {
  const setErr = useContext(FieldErrCtx);
  const fmt = (c: number | null | undefined) => (c == null ? '' : String(Math.round(toDisplay(c) * 100) / 100));
  const [text, setText] = useState(fmt(value));
  const [bad, setBad] = useState(false);
  const lastUnit = useRef(unitKey);
  useEffect(() => {
    if (lastUnit.current !== unitKey) { lastUnit.current = unitKey; setText(fmt(value)); setBad(false); setErr(errKey, null); return; }
    const p = parse(text, !!integer);
    const canon = p.ok && p.v != null ? fromDisplay(p.v) : null;
    const same = canon === (value ?? null) || (canon != null && value != null && Math.abs(canon - value) < 1e-9);
    if (!same && !(!p.ok && value == null)) { setText(fmt(value)); setBad(false); setErr(errKey, null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, unitKey]);
  useEffect(() => () => setErr(errKey, null), [errKey, setErr]);
  const msg = integer ? 'Use whole numbers only (digits, no signs or decimals).' : 'Enter a positive number such as 72.5.';
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-light-text">
      {label}
      <span className="relative">
        <input id={id} data-testid={id} inputMode={integer ? 'numeric' : 'decimal'} autoComplete="off" value={text} placeholder={placeholder}
          aria-invalid={bad} aria-describedby={bad ? `${id}-err` : undefined}
          className={`${inputCls} ${suffix ? 'pr-12' : ''} ${bad ? '!border-[#E58F8F]' : ''}`}
          onChange={(e) => {
            const t = e.target.value; setText(t);
            const p = parse(t, !!integer);
            if (!p.ok) { setBad(true); setErr(errKey, `${label}: ${msg}`); onChange(null); return; }
            setBad(false); setErr(errKey, null); onChange(p.v == null ? null : fromDisplay(p.v));
          }} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-text">{suffix}</span>}
      </span>
      {bad && <span id={`${id}-err`} className="text-xs text-[#F4B4B4]">{msg}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, id }: {
  value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; label: string; id: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-[#4A4F54] bg-[#2B2B2B] p-1">
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} data-testid={`${id}-${o.v}`} onClick={() => onChange(o.v)}
          className={`min-h-11 min-w-14 rounded-lg px-3 text-sm font-semibold transition ${value === o.v ? 'bg-slate-deep text-white' : 'text-muted-text hover:text-light-text'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TimeInput({ seconds, onChange, errKey, id, label }: {
  seconds: number | null | undefined; onChange: (s: number | null) => void; errKey: string; id: string; label: string;
}) {
  const setErr = useContext(FieldErrCtx);
  const split = (s: number | null | undefined): [string, string] => (s == null ? ['', ''] : [String(Math.floor(s / 60)), String(Math.round((s % 60) * 10) / 10)]);
  const [mm, setMm] = useState(split(seconds)[0]);
  const [ss, setSs] = useState(split(seconds)[1]);
  const calc = (m: string, s: string): { ok: boolean; v: number | null } => {
    if (m.trim() === '' && s.trim() === '') return { ok: true, v: null };
    if (!/^\d+$/.test(m.trim() || '0') || !/^\d+(\.\d)?$/.test(s.trim() || '0')) return { ok: false, v: null };
    const sec = Number(s || 0); const total = Number(m || 0) * 60 + sec;
    if (sec >= 60 || total <= 0) return { ok: false, v: null };
    return { ok: true, v: total };
  };
  const cur = calc(mm, ss);
  useEffect(() => {
    if (cur.v !== (seconds ?? null) && !(!cur.ok && seconds == null)) { const [a, b] = split(seconds); setMm(a); setSs(b); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);
  useEffect(() => { setErr(errKey, cur.ok ? null : `${label}: enter minutes and seconds (seconds under 60, total above zero).`); }, [cur.ok, errKey, label, setErr]);
  useEffect(() => () => setErr(errKey, null), [errKey, setErr]);
  const push = (m: string, s: string) => { const r = calc(m, s); onChange(r.ok ? r.v : null); };
  return (
    <div className="flex items-end gap-2" role="group" aria-label={label}>
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">Minutes
        <input data-testid={`${id}-min`} inputMode="numeric" className={`${inputCls} ${cur.ok ? '' : '!border-[#E58F8F]'}`} value={mm} onChange={(e) => { setMm(e.target.value); push(e.target.value, ss); }} /></label>
      <span className="pb-3 text-lg text-muted-text" aria-hidden>:</span>
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">Seconds
        <input data-testid={`${id}-sec`} inputMode="decimal" className={`${inputCls} ${cur.ok ? '' : '!border-[#E58F8F]'}`} value={ss} onChange={(e) => { setSs(e.target.value); push(mm, e.target.value); }} /></label>
    </div>
  );
}
