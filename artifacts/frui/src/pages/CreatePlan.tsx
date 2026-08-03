import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useListCategories, useCreatePlan, getListPlansQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Slider } from '@/components/ui/slider';
import { ChevronLeft, Check, Activity, Dumbbell, HeartPulse, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function CreatePlan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: categories, isLoading: isLoadingCategories } = useListCategories();
  const createPlan = useCreatePlan();

  const [step, setStep] = useState(1);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const handleToggleCategory = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step === 1) setStep(2);
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else setLocation('/');
  };

  const handleSubmit = () => {
    if (selectedCategoryIds.length === 0) {
      toast({
        title: "Select modalities",
        description: "Please select at least one training modality.",
        variant: "destructive"
      });
      return;
    }

    createPlan.mutate(
      { data: { mesocycleDurationWeeks: durationWeeks, prescribedCategoryIds: selectedCategoryIds } },
      {
        onSuccess: (newPlan) => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          setLocation(`/plan/${newPlan.id}`);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create plan. Please try again.",
            variant: "destructive"
          });
        }
      }
    );
  };

  // Group categories by parent modality
  const groupedCategories = categories?.reduce((acc, cat) => {
    if (!acc[cat.parentModality]) {
      acc[cat.parentModality] = [];
    }
    acc[cat.parentModality].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>) || {};

  const getModalityIcon = (modality: string) => {
    switch (modality.toLowerCase()) {
      case 'strength': return <Dumbbell className="h-5 w-5 text-camel" />;
      case 'cardio': return <HeartPulse className="h-5 w-5 text-terracotta" />;
      case 'mobility': return <Sparkles className="h-5 w-5 text-ochre" />;
      default: return <Activity className="h-5 w-5 text-camel" />;
    }
  };

  return (
    <div className="flex h-full flex-col bg-charcoal">
      {/* Header overrides standard shell header for this flow */}
      <div className="flex h-16 shrink-0 items-center border-b border-[#3A3A3A] px-4 sticky top-0 bg-charcoal z-10">
        <button 
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-light-text hover:bg-[#3A3A3A] transition-colors -ml-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="ml-2 font-serif text-xl font-bold text-light-text">
          {step === 1 ? 'Cycle Duration' : 'Training Focus'}
        </h2>
        <div className="ml-auto flex gap-1">
          <div className={`h-2 w-8 rounded-full ${step >= 1 ? 'bg-camel' : 'bg-[#3A3A3A]'}`} />
          <div className={`h-2 w-8 rounded-full ${step >= 2 ? 'bg-camel' : 'bg-[#3A3A3A]'}`} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 overflow-y-auto">
        {step === 1 && (
          <div className="flex flex-col gap-12 pt-8">
            <div className="flex flex-col gap-3 text-center">
              <span className="text-[64px] font-bold font-serif text-terracotta leading-none">
                {durationWeeks}
              </span>
              <span className="text-xl font-medium text-light-text uppercase tracking-widest">
                Weeks
              </span>
              <p className="mt-4 text-muted-text max-w-[280px] mx-auto text-sm">
                How long do you want to commit to this training block? We recommend 4-8 weeks for a standard mesocycle.
              </p>
            </div>

            <div className="px-4 py-8">
              <Slider
                value={[durationWeeks]}
                onValueChange={(val) => setDurationWeeks(val[0])}
                min={1}
                max={16}
                step={1}
                className="my-4"
              />
              <div className="flex justify-between text-xs font-bold text-muted-text mt-4 px-1">
                <span>1W</span>
                <span>8W</span>
                <span>16W</span>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="mt-auto flex h-14 w-full items-center justify-center rounded-xl bg-terracotta text-lg font-medium text-white transition-colors hover:bg-rust active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-8 pb-20">
            <p className="text-muted-text text-sm mb-2">
              Select the modalities you want to focus on for this cycle. We'll build your schedule around these priorities.
            </p>

            {isLoadingCategories ? (
              <div className="flex flex-col gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-col gap-3">
                    <Skeleton className="h-6 w-24 bg-[#3A3A3A]" />
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-24 bg-[#3A3A3A] rounded-full" />
                      <Skeleton className="h-10 w-32 bg-[#3A3A3A] rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              Object.entries(groupedCategories).map(([modality, cats]) => (
                <div key={modality} className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-[#3A3A3A] pb-2">
                    {getModalityIcon(modality)}
                    <h3 className="font-serif text-lg font-bold text-light-text">{modality}</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {cats.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleToggleCategory(cat.id)}
                          className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                            isSelected
                              ? 'border-terracotta bg-terracotta text-white shadow-[0_0_12px_rgba(196,98,45,0.3)]'
                              : 'border-[#4A4A4A] bg-[#2D2D2D] text-muted-text hover:border-camel hover:text-camel'
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                          {cat.subCategory}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            <div className="fixed bottom-[80px] left-0 right-0 p-6 bg-gradient-to-t from-charcoal via-charcoal to-transparent md:absolute md:bottom-0">
              <button
                onClick={handleSubmit}
                disabled={createPlan.isPending}
                className="flex h-14 w-full items-center justify-center rounded-xl bg-terracotta text-lg font-medium text-white transition-transform hover:bg-rust active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg"
              >
                {createPlan.isPending ? 'Creating Plan...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}