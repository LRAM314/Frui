import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useUser } from '@clerk/react';
import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import type { IntakeData } from '@workspace/api-zod';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { Notice } from '@/components/onboarding/fields';
import { summaries } from '@/lib/intake-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Account() {
  const { user } = useUser();
  const { data: profile, isLoading, isError, refetch } = useGetProfile();
  const ob = useOnboarding();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState('beginner');

  useEffect(() => { if (profile?.athleteStatus) setStatus(profile.athleteStatus); }, [profile?.athleteStatus]);

  const saveStatus = (v: string) => {
    const prev = status; setStatus(v);
    updateProfile.mutate({ data: { athleteStatus: v } }, {
      onSuccess: (p) => { queryClient.setQueryData(getGetProfileQueryKey(), p); toast({ title: 'Experience level saved' }); },
      onError: () => { setStatus(prev); toast({ title: 'Could not save', description: 'Please try again.', variant: 'destructive' }); },
    });
  };

  const published = ob.intake?.data as IntakeData | null | undefined;
  const completedAt = ob.intake?.completedAt;
  const initials = (user?.firstName || user?.username || user?.primaryEmailAddress?.emailAddress || '?').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-8 p-6 pb-10">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-[#4A4F54]">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="bg-[#363636] text-camel">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate font-serif text-2xl font-bold text-light-text" data-testid="text-account-name">{user?.fullName || 'Athlete'}</h2>
          <p className="truncate text-sm text-muted-text">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      {isError ? (
        <Notice tone="error">Could not load your profile. <button type="button" className="min-h-11 font-bold underline" onClick={() => void refetch()}>Retry</button></Notice>
      ) : isLoading ? <Skeleton className="h-14 w-full rounded-xl bg-[#363636]" /> : (
        <div className="flex flex-col gap-2">
          <label htmlFor="select-status" className="text-sm font-bold uppercase tracking-wider text-camel">Experience level</label>
          <Select value={status} onValueChange={saveStatus} disabled={updateProfile.isPending}>
            <SelectTrigger id="select-status" className="h-12 rounded-xl border-[#4A4F54] bg-[#363636] text-light-text" data-testid="select-athlete-status"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl border-[#4A4F54] bg-[#363636] text-light-text">
              <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
              <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
              <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="intake-h">
        <div className="flex items-center justify-between gap-2">
          <h3 id="intake-h" className="text-sm font-bold uppercase tracking-wider text-camel">Training profile</h3>
          <Link href="/onboarding" data-testid="link-edit-intake" className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-camel hover:bg-[#363636]"><Pencil className="h-4 w-4" /> Edit all</Link>
        </div>
        {ob.intakeError ? (
          <Notice tone="error">Could not load your training profile. <button type="button" className="min-h-11 font-bold underline" onClick={ob.refetchIntake}>Retry</button></Notice>
        ) : ob.intakeLoading ? <Skeleton className="h-40 w-full rounded-2xl bg-[#363636]" /> : !completedAt ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-clay bg-[#363636] p-5" data-testid="card-intake-incomplete">
            <ClipboardList className="h-6 w-6 text-camel" />
            <p className="text-light-text">{ob.intake?.draft ? 'You have an unfinished draft.' : 'Your training profile is not complete yet.'} Plans need it.</p>
            <Link href="/onboarding" className="flex min-h-12 items-center rounded-xl bg-slate-deep px-5 font-semibold text-white hover:bg-rust" data-testid="link-continue-onboarding">{ob.intake?.draft ? 'Resume onboarding' : 'Start onboarding'}</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {summaries(published ?? {}).map((s) => (
              <div key={s.step} className="rounded-2xl border border-[#4A4F54] bg-[#363636] p-4" data-testid={`account-section-${s.step}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-serif text-lg font-bold text-light-text">{s.title}</h4>
                  <Link href={`/onboarding?step=${s.step}`} data-testid={`link-edit-section-${s.step}`} className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-camel hover:bg-[#2B2B2B]"><Pencil className="h-4 w-4" /> Edit<span className="sr-only"> {s.title}</span></Link>
                </div>
                <ul className="flex flex-wrap gap-1.5">{s.lines.map((l, i) => <li key={i} className="rounded-full bg-[#2B2B2B] px-3 py-1 text-sm text-light-text">{l}</li>)}</ul>
              </div>
            ))}
            <p className="text-xs text-muted-text">Completed {new Date(completedAt).toLocaleDateString()}. Stored privately on our server; edits use the same checks as onboarding.</p>
          </div>
        )}
      </section>
    </div>
  );
}
