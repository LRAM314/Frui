import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import {
  getIntake, getGetIntakeQueryKey, getGetProfileQueryKey, useGetIntake, useSaveIntake,
  type IntakeState,
} from '@workspace/api-client-react';
import { IntakeSchema, completionErrors, type IntakeData } from '@workspace/api-zod';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
type Blocked = { to: string | null; kind: 'error' | 'conflict' } | null;
type Session = { revision: number; dirty: boolean; edit: number; hydrated: boolean; step: number };

interface Ctx {
  intake: IntakeState | undefined;
  intakeLoading: boolean;
  intakeError: boolean;
  refetchIntake: () => void;
  hydrated: boolean;
  data: IntakeData;
  step: number;
  status: SaveStatus;
  update: (fn: (d: IntakeData) => IntakeData) => void;
  goStep: (n: number, opts?: { wait?: boolean }) => Promise<boolean>;
  jumpStep: (n: number) => void;
  flush: () => Promise<boolean>;
  complete: () => Promise<'ok' | 'conflict' | 'error' | 'invalid'>;
  resolveConflict: (mode: 'reload' | 'keep') => Promise<void>;
  navigate: (to: string) => void;
  goBack: () => void;
  setBackOverride: (fn: (() => void) | null) => void;
  optedOut: boolean;
  optOut: () => void;
  isDirty: () => boolean;
}
const OnboardingCtx = createContext<Ctx | null>(null);
export function useOnboarding() {
  const c = useContext(OnboardingCtx);
  if (!c) throw new Error('OnboardingProvider missing');
  return c;
}

const isConflict = (e: unknown) => (e as { status?: number } | null)?.status === 409;
const detectTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return undefined; } };

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, user } = useUser();
  const qc = useQueryClient();
  const intakeKey = useMemo(() => [...getGetIntakeQueryKey(), user?.id ?? 'signed-out'], [user?.id]);
  const [location, setLocation] = useLocation();
  const { data: intake, isLoading, isError, refetch } = useGetIntake({
    query: { enabled: !!isSignedIn, queryKey: intakeKey, refetchOnWindowFocus: true, staleTime: 30_000, retry: 1 },
  });
  const save = useSaveIntake();
  const saveRef = useRef(save.mutateAsync);
  saveRef.current = save.mutateAsync;

  const s = useRef<Session>({ revision: 0, dirty: false, edit: 0, hydrated: false, step: 0 });
  const dataRef = useRef<IntakeData>({});
  const [data, setData] = useState<IntakeData>({});
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [blocked, setBlocked] = useState<Blocked>(null);
  const [optedOut, setOptedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const conflictRef = useRef(false);
  const backOverride = useRef<(() => void) | null>(null);
  const stack = useRef<string[]>([]);
  const active = useRef(true);
  const publishing = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const applyServer = useCallback((res: IntakeState) => {
    const base = (res.draft ?? res.data ?? {}) as IntakeData;
    const next: IntakeData = { ...base };
    if (!next.timezone) next.timezone = detectTz();
    dataRef.current = next;
    setData(next);
    const st = res.draft ? Math.min(Math.max(res.step, 0), 7) : 0;
    s.current = { revision: res.revision, dirty: false, edit: 0, hydrated: true, step: st };
    setStep(st);
    setHydrated(true);
    conflictRef.current = false;
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (intake && (!s.current.hydrated || (!s.current.dirty && intake.revision !== s.current.revision))) applyServer(intake);
  }, [intake, applyServer]);

  const doSave = useCallback(async (): Promise<boolean> => {
    if (!active.current) return false;
    const cur = s.current;
    if (!cur.dirty) return true;
    if (conflictRef.current) return false;
    const editAt = cur.edit;
    setStatus('saving');
    try {
      const res = await saveRef.current({ data: { data: dataRef.current as Record<string, unknown>, step: cur.step, revision: cur.revision, complete: false } });
      if (!active.current) return false;
      cur.revision = res.revision;
      if (cur.edit === editAt) cur.dirty = false;
      qc.setQueryData(intakeKey, res);
      setStatus(cur.dirty ? 'idle' : 'saved');
      return true;
    } catch (e) {
      if (!active.current) return false;
      if (isConflict(e)) { conflictRef.current = true; setStatus('conflict'); setBlocked({ to: null, kind: 'conflict' }); } else setStatus('error');
      return false;
    }
  }, [qc, intakeKey]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    for (let i = 0; i < 3; i++) {
      chain.current = chain.current.then(doSave, doSave);
      const ok = await chain.current;
      if (!ok) return false;
      if (!s.current.dirty) return true;
    }
    return !s.current.dirty;
  }, [doSave]);

  const markDirty = useCallback(() => {
    s.current.dirty = true; s.current.edit++;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, 1200);
  }, [flush]);

  const update = useCallback((fn: (d: IntakeData) => IntakeData) => {
    if (!s.current.hydrated || publishing.current) return;
    const next = fn(dataRef.current);
    dataRef.current = next;
    setData(next);
    markDirty();
  }, [markDirty]);

  const goStep = useCallback(async (n: number, opts?: { wait?: boolean }) => {
    if (publishing.current) return false;
    const prev = s.current.step;
    s.current.step = n;
    markDirty();
    if (opts?.wait === false) { setStep(n); return true; }
    const ok = await flush();
    if (!ok) { s.current.step = prev; return false; }
    setStep(n);
    return true;
  }, [flush, markDirty]);

  const jumpStep = useCallback((n: number) => { s.current.step = n; setStep(n); }, []);

  const complete = useCallback(async () => {
    if (publishing.current) return 'error' as const;
    clearTimeout(timer.current);
    const parsed = IntakeSchema.safeParse(dataRef.current);
    if (!parsed.success || completionErrors(dataRef.current).length) return 'invalid' as const;
    if (conflictRef.current) { setStatus('conflict'); setBlocked({ to: null, kind: 'conflict' }); return 'conflict' as const; }
    publishing.current = true;
    await chain.current.catch(() => false);
    setStatus('saving');
    try {
      const res = await saveRef.current({ data: { data: dataRef.current as Record<string, unknown>, step: 7, revision: s.current.revision, complete: true } });
      if (!active.current) return 'error' as const;
      s.current.revision = res.revision; s.current.dirty = false;
      qc.setQueryData(intakeKey, res);
      void qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
      s.current.hydrated = false; // next visit rehydrates from published data
      setStatus('saved');
      return 'ok' as const;
    } catch (e) {
      if (!active.current) return 'error' as const;
      if (isConflict(e)) { conflictRef.current = true; setStatus('conflict'); setBlocked({ to: null, kind: 'conflict' }); return 'conflict' as const; }
      setStatus('error');
      return 'error' as const;
    } finally {
      publishing.current = false;
    }
  }, [qc, intakeKey]);

  const resolveConflict = useCallback(async (mode: 'reload' | 'keep') => {
    setBusy(true);
    try {
      const latest = await getIntake();
      qc.setQueryData(intakeKey, latest);
      if (mode === 'reload') {
        applyServer(latest);
        setBlocked((b) => { if (b?.to) { setLocation(b.to); } return null; });
      } else {
        s.current.revision = latest.revision; conflictRef.current = false;
        s.current.dirty = true; s.current.edit++;
        const ok = await flush();
        if (ok) setBlocked((b) => { if (b?.to) setLocation(b.to); return null; });
        else setBlocked((b) => (b ? { ...b, kind: conflictRef.current ? 'conflict' : 'error' } : b));
      }
    } catch { setStatus('error'); setBlocked((b) => (b ? { ...b, kind: 'error' } : b)); }
    setBusy(false);
  }, [applyServer, flush, qc, setLocation, intakeKey]);

  const discardAndGo = useCallback(async () => {
    const to = blocked?.to ?? null;
    setBusy(true);
    s.current.dirty = false; clearTimeout(timer.current); conflictRef.current = false;
    try { applyServer(await getIntake()); } catch { s.current.hydrated = false; setStatus('idle'); void refetch(); }
    setBusy(false); setBlocked(null);
    if (to) setLocation(to);
  }, [applyServer, blocked, refetch, setLocation]);

  const navigate = useCallback((to: string) => {
    if (publishing.current) return;
    if (location === '/onboarding' && to.split('?')[0] !== '/onboarding') setOptedOut(true);
    if (!s.current.dirty) { setLocation(to); return; }
    void flush().then((ok) => {
      if (ok) setLocation(to);
      else setBlocked({ to, kind: conflictRef.current ? 'conflict' : 'error' });
    });
  }, [flush, setLocation, location]);

  const goBack = useCallback(() => {
    if (backOverride.current) { backOverride.current(); return; }
    const st = stack.current;
    navigate(st.length > 1 ? st[st.length - 2] : '/');
  }, [navigate]);

  useEffect(() => {
    const st = stack.current;
    if (st[st.length - 1] === location) return;
    if (st[st.length - 2] === location) st.pop(); else st.push(location);
  }, [location]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => { if (s.current.dirty) { e.preventDefault(); e.returnValue = ''; } };
    const onPop = () => {
      if (!window.location.pathname.endsWith('/onboarding')) setOptedOut(true);
      if (!s.current.dirty) return;
      void flush().then((ok) => { if (!ok) setBlocked({ to: null, kind: conflictRef.current ? 'conflict' : 'error' }); });
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('beforeunload', onUnload); window.removeEventListener('popstate', onPop); clearTimeout(timer.current); };
  }, [flush]);

  const value = useMemo<Ctx>(() => ({
    intake, intakeLoading: isLoading, intakeError: isError, refetchIntake: () => { void refetch(); },
    hydrated, data, step, status, update, goStep, jumpStep, flush, complete, resolveConflict,
    navigate, goBack, setBackOverride: (fn) => { backOverride.current = fn; },
    optedOut, optOut: () => setOptedOut(true), isDirty: () => s.current.dirty,
  }), [intake, isLoading, isError, refetch, hydrated, data, step, status, update, goStep, jumpStep, flush, complete, resolveConflict, navigate, goBack, optedOut]);

  return (
    <OnboardingCtx.Provider value={value}>
      {children}
      {blocked && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="guard-title" data-testid="dialog-save-guard">
          <div className="w-full max-w-[400px] rounded-2xl border border-[#4A4F54] bg-[#363636] p-5 text-light-text shadow-2xl">
            <h2 id="guard-title" className="font-serif text-xl font-bold">
              {blocked.kind === 'conflict' ? 'Your draft changed elsewhere' : 'Your draft was not saved'}
            </h2>
            <p className="mt-2 text-sm text-muted-text">
              {blocked.kind === 'conflict'
                ? 'A newer version exists on another device or tab. Load it, or deliberately keep your answers and save over it.'
                : 'We could not reach the server. Your answers are still on this screen. Retry, or leave and lose the unsaved changes.'}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {blocked.kind === 'conflict' ? (
                <>
                  <DialogBtn primary disabled={busy} onClick={() => void resolveConflict('reload')} id="button-conflict-reload">Reload latest</DialogBtn>
                  <DialogBtn disabled={busy} onClick={() => void resolveConflict('keep')} id="button-conflict-keep">Keep my answers and save</DialogBtn>
                </>
              ) : (
                <DialogBtn primary disabled={busy} id="button-retry-save" onClick={() => {
                  setBusy(true);
                  void flush().then((ok) => { setBusy(false); if (ok) { const to = blocked.to; setBlocked(null); if (to) setLocation(to); } else setBlocked((b) => (b ? { ...b, kind: conflictRef.current ? 'conflict' : 'error' } : b)); });
                }}>{busy ? 'Retrying...' : 'Retry save'}</DialogBtn>
              )}
              <DialogBtn disabled={busy} onClick={() => void discardAndGo()} id="button-leave-unsaved">Leave without saving</DialogBtn>
              {blocked.to && <DialogBtn disabled={busy} onClick={() => setBlocked(null)} id="button-stay">Stay here</DialogBtn>}
            </div>
          </div>
        </div>
      )}
    </OnboardingCtx.Provider>
  );
}

function DialogBtn({ children, primary, ...p }: { children: React.ReactNode; primary?: boolean; id: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" data-testid={p.id} disabled={p.disabled} onClick={p.onClick}
      className={`min-h-12 rounded-xl px-4 text-base font-semibold transition active:scale-[0.98] disabled:opacity-50 ${primary ? 'bg-slate-deep text-white hover:bg-rust' : 'border border-[#5A7D9A] text-light-text hover:bg-[#2B2B2B]'}`}>
      {children}
    </button>
  );
}
