import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from 'wouter';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { FieldErrCtx, Notice } from '@/components/onboarding/fields';
import { StepAvoid, StepBaselines, StepBiometrics, StepGoals, StepPreferred, StepResources, StepSchedule, type StepProps } from '@/components/onboarding/Steps';
import Review from '@/components/onboarding/Review';
import { REVIEW_STEP, STEP_TITLES, blockingErrors, outliers } from '@/lib/intake-ui';

const STEPS = [StepBiometrics, StepGoals, StepPreferred, StepAvoid, StepResources, StepSchedule, StepBaselines];

export default function Onboarding() {
  const ob = useOnboarding();
  const search = useSearch();
  const { step, data, hydrated } = ob;
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [showErrors, setShowErrors] = useState(false);
  const [fromReview, setFromReview] = useState(false);
  const [advanceFail, setAdvanceFail] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const jumped = useRef(false);

  const setErr = useCallback((k: string, m: string | null) => {
    setFieldErrs((cur) => {
      if ((cur[k] ?? null) === m) return cur;
      const n = { ...cur }; if (m) n[k] = m; else delete n[k]; return n;
    });
  }, []);

  useEffect(() => {
    if (!hydrated || jumped.current) return;
    jumped.current = true;
    const q = new URLSearchParams(search);
    const n = Number(q.get('step'));
    if (q.has('step') && Number.isInteger(n) && n >= 0 && n <= 6) { ob.jumpStep(n); setFromReview(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const obRef = useRef(ob); obRef.current = ob;
  useEffect(() => {
    ob.setBackOverride(() => {
      const o = obRef.current;
      if (o.step > 0) { setFromReview(false); void o.goStep(o.step - 1, { wait: false }); }
      else { o.optOut(); o.navigate('/'); }
    });
    return () => ob.setBackOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { setShowErrors(false); setAdvanceFail(false); topRef.current?.scrollIntoView({ block: 'start' }); }, [step]);

  const toggleConfirm = (k: string) => setConfirmed((c) => { const n = new Set(c); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const errors = useMemo(() => {
    const e = [...blockingErrors(data, step), ...Object.values(fieldErrs)];
    if (step <= 6) for (const o of outliers(data)) if (o.step === step && !confirmed.has(o.key)) e.push(`Confirm: ${o.msg}`);
    return Array.from(new Set(e));
  }, [data, step, fieldErrs, confirmed]);

  if (ob.intakeLoading || (!hydrated && !ob.intakeError)) {
    return <div className="flex flex-col gap-4 p-6" aria-busy="true"><Skeleton className="h-3 w-full rounded bg-[#363636]" /><Skeleton className="h-8 w-2/3 rounded bg-[#363636]" /><Skeleton className="h-40 w-full rounded-2xl bg-[#363636]" /></div>;
  }
  if (ob.intakeError || !hydrated) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-light-text">We could not load your onboarding.</p>
        <button type="button" data-testid="button-retry-load" onClick={ob.refetchIntake} className="min-h-12 rounded-xl bg-slate-deep px-6 font-semibold text-white">Try again</button>
      </div>
    );
  }

  const pct = Math.round((Math.min(step, 6) / 6) * 100);
  const isReview = step === REVIEW_STEP;
  const Step = STEPS[step] as React.ComponentType<StepProps> | undefined;
  const next = async () => {
    if (advancing) return;
    if (errors.length) { setShowErrors(true); return; }
    setAdvancing(true); setAdvanceFail(false);
    const ok = await ob.goStep(fromReview ? REVIEW_STEP : step + 1);
    setAdvancing(false);
    if (!ok) setAdvanceFail(true);
  };
  const saveExit = () => { ob.optOut(); ob.navigate('/'); };
  const statusText = ob.status === 'saving' ? 'Saving draft...' : ob.status === 'saved' ? 'Draft saved' : ob.status === 'error' ? 'Save failed' : ob.status === 'conflict' ? 'Draft conflict' : '';

  return (
    <div className="flex min-h-full flex-col">
      <div ref={topRef} />
      <div className="sticky top-0 z-10 border-b border-[#363636] bg-charcoal/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-camel" data-testid="text-step-label">{isReview ? 'Review' : `Step ${step + 1} of 7`}{!isReview && ` · ${STEP_TITLES[step]}`}</span>
          <span className="tabular-nums text-muted-text" data-testid="text-progress">{pct}%</span>
        </div>
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Onboarding progress" className="mt-2 h-2 overflow-hidden rounded-full bg-[#363636]">
          <div className="h-full origin-left rounded-full bg-slate-blue transition-transform duration-500 ease-out" style={{ transform: `scaleX(${pct / 100})`, width: '100%' }} />
        </div>
      </div>

      <FieldErrCtx.Provider value={setErr}>
        <div className="flex-1 px-5 pb-6 pt-5" key={step}>
          <h1 className="mb-1 font-serif text-2xl font-bold text-light-text animate-in fade-in slide-in-from-bottom-2 duration-300">{isReview ? 'Review your answers' : STEP_TITLES[step]}</h1>
          <p className="mb-5 text-sm text-muted-text">Adults 18+ only. {isReview ? '' : 'We save a private draft on our server as you go.'}</p>
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isReview ? <Review onEdit={(n) => { setFromReview(true); void ob.goStep(n, { wait: false }); }} />
              : Step && <Step data={data} update={ob.update} confirmed={confirmed} toggleConfirm={toggleConfirm} />}
          </div>
          {!isReview && showErrors && errors.length > 0 && (
            <div className="mt-5"><Notice tone="error" id="step-errors"><ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul></Notice></div>
          )}
          {advanceFail && <div className="mt-4"><Notice tone="error">We could not save this step, so we stayed here. Check your connection and press Next to retry.</Notice></div>}
        </div>
      </FieldErrCtx.Provider>

      <div className="sticky bottom-0 z-10 border-t border-[#363636] bg-charcoal/95 px-5 py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-xs" aria-live="polite">
          <span data-testid="text-save-status" className={ob.status === 'error' || ob.status === 'conflict' ? 'font-semibold text-[#F4B4B4]' : 'text-muted-text'}>
            {ob.status === 'saving' && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}{ob.status === 'saved' && <Check className="mr-1 inline h-3 w-3" />}{statusText}
            {ob.status === 'error' && <button type="button" className="ml-2 min-h-11 font-bold underline" onClick={() => void ob.flush()} data-testid="button-retry-draft">Retry</button>}
          </span>
          <button type="button" className="min-h-11 px-2 font-semibold text-camel underline underline-offset-4" onClick={saveExit} data-testid="button-save-exit">Save and exit</button>
        </div>
        {!isReview && (
          <div className="flex gap-3">
            <button type="button" disabled={advancing} onClick={() => { if (step === 0) { saveExit(); return; } setFromReview(false); void ob.goStep(step - 1, { wait: false }); }} data-testid="button-back-step" className="flex min-h-14 items-center justify-center gap-1 rounded-xl border border-[#5A7D9A] px-5 font-semibold text-light-text transition active:scale-[0.97] hover:bg-[#363636]">
              <ArrowLeft className="h-5 w-5" /> {step === 0 ? 'Home' : 'Back'}
            </button>
            <button type="button" disabled={advancing} onClick={() => void next()} aria-disabled={errors.length > 0 || advancing || undefined} data-testid="button-next-step"
              className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-blue text-xl font-bold text-white transition active:scale-[0.98] hover:bg-rust aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
              {advancing ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : fromReview ? 'Back to review' : step === 6 ? 'Review' : <>Next <ArrowRight className="h-5 w-5" /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
