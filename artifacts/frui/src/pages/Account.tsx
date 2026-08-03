import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/react';
import { useGetProfile, useUpdateProfile, useListCategories, getGetProfileQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Account() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { data: profile, isLoading: isProfileLoading } = useGetProfile();
  const { data: categories } = useListCategories();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [athleteStatus, setAthleteStatus] = useState<string>('');
  const [preferredIds, setPreferredIds] = useState<string[]>([]);
  const [dislikedIds, setDislikedIds] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setAthleteStatus(profile.athleteStatus || 'beginner');
      setPreferredIds(profile.preferredModalities || []);
      setDislikedIds(profile.dislikedModalities || []);
    }
  }, [profile]);

  const handleTogglePref = (id: string) => {
    setPreferredIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    // Remove from disliked if adding to preferred
    if (!preferredIds.includes(id)) {
      setDislikedIds(prev => prev.filter(c => c !== id));
    }
  };

  const handleToggleDislike = (id: string) => {
    setDislikedIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    // Remove from preferred if adding to disliked
    if (!dislikedIds.includes(id)) {
      setPreferredIds(prev => prev.filter(c => c !== id));
    }
  };

  const handleSave = () => {
    updateProfile.mutate(
      {
        data: {
          athleteStatus,
          preferredModalities: preferredIds,
          dislikedModalities: dislikedIds,
        }
      },
      {
        onSuccess: (updatedProfile) => {
          queryClient.setQueryData(getGetProfileQueryKey(), updatedProfile);
          toast({ title: "Profile updated" });
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        }
      }
    );
  };

  if (!isUserLoaded || isProfileLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-24 w-24 rounded-full mx-auto bg-[#3A3A3A]" />
        <Skeleton className="h-8 w-1/2 mx-auto bg-[#3A3A3A]" />
        <div className="space-y-4 mt-8">
          <Skeleton className="h-12 w-full rounded-xl bg-[#3A3A3A]" />
          <Skeleton className="h-32 w-full rounded-xl bg-[#3A3A3A]" />
          <Skeleton className="h-32 w-full rounded-xl bg-[#3A3A3A]" />
        </div>
      </div>
    );
  }

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const groupedCategories = categories?.reduce((acc, cat) => {
    if (!acc[cat.parentModality]) {
      acc[cat.parentModality] = [];
    }
    acc[cat.parentModality].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>) || {};

  return (
    <div className="flex flex-col min-h-full pb-20">
      <div className="flex flex-col items-center gap-4 bg-[#3A3A3A] p-8 pb-10 rounded-b-[40px] shadow-lg">
        <Avatar className="h-24 w-24 border-4 border-charcoal shadow-xl">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="bg-charcoal text-camel text-2xl font-serif">
            {getInitials(user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold text-light-text">
            {user?.fullName || 'Athlete'}
          </h2>
          <p className="text-muted-text text-sm">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-6 -mt-4">
        
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-text">Athlete Status</h3>
          <Select value={athleteStatus} onValueChange={setAthleteStatus}>
            <SelectTrigger className="w-full bg-[#3A3A3A] border-[#4A4A4A] text-light-text h-14 rounded-xl px-4">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent className="bg-[#3A3A3A] border-[#4A4A4A] text-light-text rounded-xl">
              <SelectItem value="beginner">Beginner (0-1 years)</SelectItem>
              <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
              <SelectItem value="advanced">Advanced (3+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-text">Preferred Modalities</h3>
            <p className="text-xs text-muted-text/70">What do you enjoy training?</p>
          </div>
          <div className="flex flex-col gap-3">
            {Object.entries(groupedCategories).map(([modality, cats]) => (
              <div key={`pref-${modality}`} className="flex flex-wrap gap-2">
                {cats.map((cat) => {
                  const isSelected = preferredIds.includes(cat.id);
                  return (
                    <button
                      key={`pref-${cat.id}`}
                      onClick={() => handleTogglePref(cat.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-camel bg-camel/10 text-camel'
                          : 'border-[#4A4A4A] bg-[#2D2D2D] text-muted-text'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {cat.subCategory}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-text">Disliked Modalities</h3>
            <p className="text-xs text-muted-text/70">What do you want to avoid?</p>
          </div>
          <div className="flex flex-col gap-3">
            {Object.entries(groupedCategories).map(([modality, cats]) => (
              <div key={`dis-${modality}`} className="flex flex-wrap gap-2">
                {cats.map((cat) => {
                  const isSelected = dislikedIds.includes(cat.id);
                  return (
                    <button
                      key={`dis-${cat.id}`}
                      onClick={() => handleToggleDislike(cat.id)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-rust bg-rust/10 text-rust'
                          : 'border-[#4A4A4A] bg-[#2D2D2D] text-muted-text'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                      {cat.subCategory}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </div>
      
      <div className="fixed bottom-[80px] left-0 right-0 p-6 bg-gradient-to-t from-charcoal via-charcoal to-transparent md:absolute md:bottom-0">
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="flex h-14 w-full items-center justify-center rounded-xl bg-terracotta text-lg font-medium text-white transition-transform hover:bg-rust active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg"
        >
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}