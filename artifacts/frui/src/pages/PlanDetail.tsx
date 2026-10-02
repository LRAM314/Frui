import React from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { useGetPlan, useDeletePlan, getListPlansQueryKey, getGetPlanQueryKey, useListCategories } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Trash2, Calendar, Clock, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PlanDetail() {
  const [, params] = useRoute('/plan/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const id = params?.id || '';

  const { data: plan, isLoading, isError } = useGetPlan(id, {
    query: { enabled: !!id, queryKey: getGetPlanQueryKey(id) }
  });
  
  const { data: categories } = useListCategories();
  const deletePlan = useDeletePlan();

  const handleDelete = () => {
    deletePlan.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: "Plan deleted" });
          setLocation('/');
        },
        onError: () => {
          toast({ title: "Failed to delete plan", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 pt-2">
        <Skeleton className="h-10 w-10 rounded-full bg-[#363636]" />
        <Skeleton className="h-32 w-full rounded-2xl bg-[#363636]" />
        <div className="space-y-4 mt-4">
          <Skeleton className="h-16 w-full rounded-xl bg-[#363636]" />
          <Skeleton className="h-16 w-full rounded-xl bg-[#363636]" />
          <Skeleton className="h-16 w-full rounded-xl bg-[#363636]" />
        </div>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-text mb-4">Plan not found.</p>
        <Link href="/" className="text-camel font-medium hover:text-camel">Return to Home</Link>
      </div>
    );
  }

  // Group workouts by week
  const workoutsByWeek = plan.workouts.reduce((acc, workout) => {
    if (!acc[workout.weekNumber]) {
      acc[workout.weekNumber] = [];
    }
    acc[workout.weekNumber].push(workout);
    return acc;
  }, {} as Record<number, typeof plan.workouts>);

  const planCategories = plan.prescribedCategoryIds
    .map(cid => categories?.find(c => c.id === cid))
    .filter(Boolean);

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header overrides standard shell header for this flow */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#363636] px-4 sticky top-0 bg-charcoal z-10">
        <Link 
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full text-light-text hover:bg-[#363636] transition-colors -ml-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h2 className="font-serif text-xl font-bold text-light-text">
          Plan Details
        </h2>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-muted-text hover:text-light-text hover:bg-[#363636] transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-charcoal border-[#363636] text-light-text max-w-[340px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-text">
                This action cannot be undone. All workouts associated with this plan will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#363636] border-none text-light-text hover:bg-[#4A4F54] hover:text-light-text">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-rust text-white hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex flex-col p-6 gap-8">
        <div className="flex flex-col gap-6 rounded-3xl bg-[#363636] p-6 shadow-xl border border-[#4A4F54]">
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
              plan.status === 'active' ? 'bg-terracotta/20 text-camel' : 'bg-[#2B2B2B] text-muted-text'
            }`}>
              {plan.status}
            </div>
            <span className="text-sm font-medium text-muted-text">
              Created {format(parseISO(plan.createdAt), 'MMM d')}
            </span>
          </div>
          
          <div className="flex items-end gap-3">
            <span className="text-[56px] font-serif font-bold text-camel leading-none">
              {plan.mesocycleDurationWeeks}
            </span>
            <span className="text-xl font-medium text-muted-text uppercase tracking-widest pb-1">
              Weeks
            </span>
          </div>

          <div className="h-px w-full bg-[#2B2B2B]" />

          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-text">Modalities</h4>
            <div className="flex flex-wrap gap-2">
              {planCategories.map((cat, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-full bg-[#2B2B2B] px-3 py-1.5 text-xs font-medium text-light-text border border-[#4A4F54]">
                  <Activity className="h-3 w-3 text-camel" />
                  <span>{cat?.subCategory}</span>
                </div>
              ))}
              {planCategories.length === 0 && (
                <span className="text-sm text-muted-text italic">Unspecified</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="font-serif text-2xl font-bold text-light-text">Schedule</h3>
          
          {Object.entries(workoutsByWeek).map(([week, weekWorkouts]) => (
            <div key={week} className="flex flex-col gap-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-camel ml-2 border-l-2 border-camel pl-2">
                Week {week}
              </h4>
              <div className="flex flex-col gap-2 pl-2">
                {weekWorkouts.map((workout) => (
                  <div 
                    key={workout.id}
                    className={`flex items-center gap-4 rounded-xl p-4 transition-colors ${
                      workout.completed ? 'bg-[#2B2B2B] border border-[#363636]' : 'bg-[#363636]'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-[#2B2B2B] shrink-0 border border-[#4A4F54]">
                      <span className="text-[10px] font-bold uppercase text-muted-text">Day</span>
                      <span className="text-lg font-bold text-light-text">{workout.dayOfWeek + 1}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex flex-wrap gap-1">
                        {workout.prescribedCategories?.map((cat, i) => (
                          <span key={i} className={`text-xs font-bold ${workout.completed ? 'text-muted-text' : 'text-light-text'}`}>
                            {cat.subCategory}{i < (workout.prescribedCategories?.length || 0) - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-camel/80 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        {workout.targetDurationMinutes} min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}