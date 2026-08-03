import React, { useRef } from 'react';
import { useGetTodayWorkouts, useCompleteWorkout, getGetTodayWorkoutsQueryKey } from '@workspace/api-client-react';
import { Check, Clock, Activity, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

export default function ToDo() {
  const { data: workouts, isLoading, isError } = useGetTodayWorkouts();
  const completeWorkout = useCompleteWorkout();
  const queryClient = useQueryClient();

  const handleToggleComplete = (id: string, currentlyCompleted: boolean) => {
    completeWorkout.mutate(
      { id, data: { completed: !currentlyCompleted } },
      {
        onSuccess: (updatedWorkout) => {
          // Optimistically update the cache
          queryClient.setQueryData(getGetTodayWorkoutsQueryKey(), (oldData: any) => {
            if (!oldData) return oldData;
            return oldData.map((w: any) => w.id === id ? { ...w, completed: updatedWorkout.completed } : w);
          });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-1/3 bg-[#3A3A3A] rounded" />
        <Skeleton className="h-32 w-full bg-[#3A3A3A] rounded-2xl" />
        <Skeleton className="h-32 w-full bg-[#3A3A3A] rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-text">Failed to load today's workouts. Please try again.</p>
      </div>
    );
  }

  if (!workouts || workouts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center gap-6">
        <div className="rounded-full bg-[#3A3A3A] p-6 shadow-inner">
          <CheckCircle2 className="h-12 w-12 text-terracotta opacity-80" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-serif font-bold text-light-text">All done!</h2>
          <p className="text-muted-text max-w-[240px] mx-auto">
            You have no workouts scheduled for today. Rest and recover.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = workouts.filter(w => w.completed).length;
  const progress = Math.round((completedCount / workouts.length) * 100);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-serif font-bold text-light-text">Today's Workouts</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-text">{completedCount} of {workouts.length} completed</span>
          <span className="font-bold text-camel">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-[#3A3A3A] rounded-full overflow-hidden mt-1">
          <div 
            className="h-full bg-terracotta transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        {workouts.map((workout) => {
          const isCompleted = workout.completed;
          
          return (
            <div 
              key={workout.id}
              className={`flex items-center justify-between rounded-2xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.2)] border transition-all duration-300 ${
                isCompleted 
                  ? 'bg-[#2D2D2D] border-[#3A3A3A] opacity-70' 
                  : 'bg-[#3A3A3A] border-[#4A4A4A]'
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-camel font-medium text-sm">
                    <Clock className="h-4 w-4" />
                    {workout.targetDurationMinutes} min
                  </div>
                  <span className="text-[#4A4A4A]">•</span>
                  <div className="flex items-center gap-1.5 text-muted-text text-sm">
                    <span className="uppercase text-xs font-bold tracking-wider">Week {workout.weekNumber}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {workout.prescribedCategories?.map((cat, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                        isCompleted ? 'bg-[#2A2A2A] text-muted-text' : 'bg-[#2D2D2D] text-light-text'
                      }`}
                    >
                      <Activity className="h-3 w-3 text-camel opacity-80" />
                      <span>{cat.subCategory}</span>
                    </div>
                  ))}
                  {!workout.prescribedCategories?.length && (
                    <span className="text-sm text-light-text font-medium">Unspecified Session</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleToggleComplete(workout.id, workout.completed)}
                disabled={completeWorkout.isPending}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all active:scale-90 ${
                  isCompleted 
                    ? 'bg-rust/20 text-rust border-2 border-rust' 
                    : 'bg-terracotta text-white shadow-lg shadow-terracotta/20 hover:bg-rust'
                }`}
                aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
              >
                <Check className={`h-6 w-6 transition-transform ${isCompleted ? 'scale-100' : 'scale-75'}`} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}