import React from 'react';
import { Link, useLocation } from 'wouter';
import { FileText, CheckSquare } from 'lucide-react';

export default function BottomNav() {
  const [location] = useLocation();

  const tabs = [
    { href: '/', label: 'My plan', icon: FileText },
    { href: '/todo', label: 'To do', icon: CheckSquare },
  ];

  return (
    <nav className="flex h-[80px] shrink-0 items-center justify-around bg-clay px-6 pb-safe border-t border-[#6B4B34] z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location === tab.href || (tab.href === '/' && location.startsWith('/plan/'));
        
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-1 min-w-[72px] transition-colors ${
              isActive ? 'text-camel' : 'text-[#D0B8A8]'
            }`}
          >
            <div className="relative">
              <Icon className={`h-6 w-6 ${isActive ? 'fill-camel/20' : ''}`} />
              {isActive && (
                <div className="absolute -bottom-4 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-camel" />
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}