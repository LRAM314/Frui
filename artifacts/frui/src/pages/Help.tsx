import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function Help() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center gap-6">
      <div className="rounded-full bg-[#3A3A3A] p-6 shadow-inner">
        <HelpCircle className="h-12 w-12 text-muted-text opacity-50" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-serif font-bold text-light-text">Help & Support</h2>
        <p className="text-muted-text max-w-[240px] mx-auto">
          Help coming soon. If you need immediate assistance, please reach out to our team.
        </p>
      </div>
    </div>
  );
}