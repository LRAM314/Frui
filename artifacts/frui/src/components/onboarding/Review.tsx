import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Check, Loader2, Pencil } from 'lucide-react';
import { completionErrors } from '@workspace/api-zod';
import { useOnboarding } from './OnboardingProvider';
import { Notice } from './fields';
import { REVIEW_STEP, STEP_TITLES, blockingErrors, summaries } from '@/lib/intake-ui';

export default function Review({ onEdit }: { onEdit: (step: number) => void }) {
  const ob = useOnboarding();
  const [, setLocation] = useLocation();
  const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error' | 'conflict' | 'invalid'>('idle');
  const issues = Array.from(new Set([...completionErrors(ob.data), ...Array.from({ length: 7 }, (_, i) => blockingErrors(ob.data, i)).flat()]));
  const finish = async () => {
    setState('pending');
    const r = await ob.complete();
    if (r === 'ok') { setState('success'); setLocation('/'); } else setState(r);
  };
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-text">Check your answers. This is the review, not an eighth question. Everything stays editable from your Account.</p>
      {summaries(ob.data).map((s) => (
        <section key={s.step} className="rounded-2xl border border-[#4A4F54] bg-[#363636] p-4" data-testid={`review-section-${s.step}`}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold">{s.title}</h3>
            <button type="button" disabled={state === 'pending'} onClick={() => onEdit(s.step)} data-testid={`button-edit-${s.step}`} className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-camel hover:bg-[#2B2B2B]">
              <Pencil className="h-4 w-4" /> Edit<span className="sr-only"> {STEP_TITLES[s.step]}</span>
            </button>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {s.lines.map((l, i) => <li key={i} className="rounded-full bg-[#2B2B2B] px-3 py-1 text-sm">{l}</li>)}
          </ul>
        </section>
      ))}
      {issues.length > 0 && <Notice tone="error" id="review-issues"><p className="font-semibold">Before you finish:</p><ul className="ml-4 list-disc">{issues.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
      {state === 'error' && <Notice tone="error">We could not save. Your answers are kept. Try again.</Notice>}
      {state === 'conflict' && ob.status === 'conflict' && <Notice tone="error">Your intake changed elsewhere. Choose Reload latest or Keep my answers in the dialog.</Notice>}
      {state === 'success' && <Notice tone="info">Saved. Taking you home.</Notice>}
      <button type="button" data-testid="button-finish-onboarding" disabled={state === 'pending' || state === 'success'}
        aria-disabled={issues.length > 0 || undefined}
        onClick={() => { if (issues.length === 0) void finish(); }}
        className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-slate-blue text-xl font-bold text-white transition active:scale-[0.98] hover:bg-rust aria-disabled:opacity-50 disabled:opacity-70">
        {state === 'pending' ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : state === 'success' ? <><Check className="h-5 w-5" /> Done</> : state === 'error' || state === 'conflict' ? 'Try again' : 'Finish onboarding'}
      </button>
    </div>
  );
}
