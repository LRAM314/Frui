import React, { useState } from 'react';
import { useLocation } from 'wouter';
import GuardedLink from '@/components/onboarding/GuardedLink';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { useUser, useClerk } from '@clerk/react';
import { ChevronLeft, Menu } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const [location] = useLocation();
  const ob = useOnboarding();
  const showBack = location !== '/';

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-20 grid h-16 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[#363636] bg-charcoal px-2">
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          className="flex h-11 w-11 items-center justify-center rounded-full text-camel transition-colors hover:bg-[#363636] active:scale-95"
          data-testid="button-open-sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>
        {showBack && (
          <button
            type="button"
            onClick={() => ob.goBack()}
            aria-label="Go back"
            className="flex h-11 w-11 items-center justify-center rounded-full text-light-text transition-colors hover:bg-[#363636] active:scale-95"
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
      </div>

      <GuardedLink href="/" className="flex min-h-11 items-center px-3" data-testid="link-logo">
        <span className="font-serif text-2xl font-bold tracking-wide text-light-text">Frui</span>
      </GuardedLink>

      <div className="flex justify-end">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button" 
            aria-label="Account menu" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#4A4F54] bg-[#363636] transition-colors"
            data-testid="button-profile"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-[#363636] text-camel text-xs font-medium">
                {getInitials(user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress)}
              </AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 rounded-xl border-[#363636] bg-[#363636] p-4 text-light-text shadow-xl z-[100] mr-4 mt-2"
          align="end"
        >
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col">
              <span className="font-medium text-light-text truncate">
                {user?.fullName || 'Athlete'}
              </span>
              <span className="text-muted-text truncate text-xs">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
            
            <div className="h-px w-full bg-[#2B2B2B]" />
            
            <GuardedLink 
              href="/account" 
              onClick={() => setIsOpen(false)}
              className="text-left font-medium text-light-text hover:text-camel transition-colors py-3 min-h-11"
            >
              View Account
            </GuardedLink>
            
            <button
              type="button"
              disabled={signingOut || ob.status === 'saving'}
              className="text-left font-medium text-camel hover:text-light-text transition-colors py-3 min-h-11"
              onClick={async () => {
                setSigningOut(true);
                setSignOutError(false);
                try {
                  if (!await ob.flush()) { setSignOutError(true); return; }
                  await signOut({ redirectUrl: basePath || '/' });
                } catch { setSignOutError(true); }
                finally { setSigningOut(false); }
              }}
            >
              {signingOut ? 'Saving before sign out…' : 'Sign Out'}
            </button>
            {signOutError && <p role="alert" className="text-sm text-[#F4B4B4]">We could not save your draft or sign you out. Your answers are still here. Retry, or continue editing.</p>}
          </div>
        </PopoverContent>
      </Popover>
      </div>
    </header>
  );
}