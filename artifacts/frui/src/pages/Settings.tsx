import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center gap-6">
      <div className="rounded-full bg-[#3A3A3A] p-6 shadow-inner">
        <SettingsIcon className="h-12 w-12 text-muted-text opacity-50" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-serif font-bold text-light-text">Settings</h2>
        <p className="text-muted-text max-w-[240px] mx-auto">
          Settings coming soon. We're working on giving you more control over your experience.
        </p>
      </div>
    </div>
  );
}