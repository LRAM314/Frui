import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-charcoal shadow-2xl relative md:h-[90vh] md:max-h-[900px] md:rounded-[40px] md:border-8 md:border-[#1a1a1a] md:my-auto">
      <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 overflow-y-auto bg-charcoal relative">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
}
