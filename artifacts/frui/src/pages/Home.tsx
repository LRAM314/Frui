import React from 'react';
import { Link } from 'wouter';
import { useListPlans, useListCategories } from '@workspace/api-client-react';
import { Plus, Calendar, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { data: plans, isLoading: isLoadingPlans, isError: isErrorPlans } = useListPlans();
  const { data: categories } = useListCategories();

  if (isLoadingPlans) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-1/3 bg-[#3A3A3A] rounded" />
        <Skeleton className="h-40 w-full bg-[#3A3A3A] rounded-2xl" />
        <Skeleton className="h-40 w-full bg-[#3A3A3A] rounded-2xl" />
      </div>
    );
  }

  if (isErrorPlans) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-text">Failed to load plans. Please try again.</p>
      </div>
    );
  }

  const activePlans = plans?.filter(p => p.status === 'active' || p.status === 'draft') || [];

  if (activePlans.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center gap-6">
        <div className="rounded-full bg-[#3A3A3A] p-6 shadow-inner">
          <Calendar className="h-12 w-12 text-muted-text opacity-50" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-serif font-bold text-light-text">No active plans</h2>
          <p className="text-muted-text max-w-[240px] mx-auto">
            Design your next training cycle and start building your hybrid foundation.
          </p>
        </div>
        <Link 
          href="/create-plan"
          className="mt-4 flex h-14 w-full max-w-[280px] items-center justify-center gap-2 rounded-xl bg-terracotta text-lg font-medium text-white transition-transform hover:bg-rust active:scale-95 shadow-lg"
        >
          <Plus className="h-5 w-5" />
          Create a plan
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-light-text">My Plans</h2>
        <Link 
          href="/create-plan"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta text-white transition-transform hover:bg-rust active:scale-95 shadow-md"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        {activePlans.map((plan) => {
          // Map category IDs to names
          const planCategories = plan.prescribedCategoryIds
            .map(id => categories?.find(c => c.id === id))
            .filter(Boolean);
          
          return (
            <Link 
              key={plan.id}
              href={`/plan/${plan.id}`}
              className="flex flex-col gap-4 rounded-2xl bg-[#3A3A3A] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.2)] border border-[#4A4A4A] transition-transform active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-camel">
                    {plan.mesocycleDurationWeeks} Weeks
                  </span>
                  <h3 className="text-lg font-medium text-light-text">
                    Hybrid Cycle
                  </h3>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                  plan.status === 'active' ? 'bg-terracotta/20 text-terracotta' : 'bg-[#2D2D2D] text-muted-text'
                }`}>
                  {plan.status}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {planCategories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-full bg-[#2D2D2D] px-3 py-1.5 text-xs font-medium text-light-text">
                    <Activity className="h-3 w-3 text-camel" />
                    <span>{cat?.subCategory}</span>
                  </div>
                ))}
                {planCategories.length === 0 && (
                  <span className="text-xs text-muted-text">No modalities selected</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}