import React, { useState } from 'react';
import { Link } from 'wouter';
import { useUser, useClerk } from '@clerk/react';
import { Menu } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export default function Header({ onOpenSidebar }: HeaderProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#3A3A3A] bg-charcoal px-4 z-20">
      <button 
        type="button" 
        onClick={onOpenSidebar}
        className="flex h-10 w-10 items-center justify-center rounded-full text-ochre hover:bg-[#3A3A3A] transition-colors"
        data-testid="button-open-sidebar"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="flex-1 text-center">
        <h1 className="text-2xl font-serif font-bold tracking-wider text-light-text">
          FRUI
        </h1>
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button" 
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#3A3A3A] bg-[#3A3A3A] transition-colors focus:outline-none focus:ring-2 focus:ring-terracotta"
            data-testid="button-profile"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-[#3A3A3A] text-camel text-xs font-medium">
                {getInitials(user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress)}
              </AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 rounded-xl border-[#3A3A3A] bg-[#3A3A3A] p-4 text-light-text shadow-xl z-[100] mr-4 mt-2"
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
            
            <div className="h-px w-full bg-[#2D2D2D]" />
            
            <Link 
              href="/account" 
              onClick={() => setIsOpen(false)}
              className="text-left font-medium text-light-text hover:text-camel transition-colors py-1"
            >
              View Account
            </Link>
            
            <button
              type="button"
              className="text-left font-medium text-terracotta hover:text-rust transition-colors py-1"
              onClick={() => signOut({ redirectUrl: basePath || '/' })}
            >
              Sign Out
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </header>
  );
}