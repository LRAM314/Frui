import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, HelpCircle, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

  const links = [
    { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-black/50"
            data-testid="sidebar-backdrop"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 left-0 z-50 w-[280px] max-w-[80vw] bg-[#3A3A3A] shadow-2xl flex flex-col"
            data-testid="sidebar-container"
          >
            <div className="flex h-16 items-center justify-between px-6 border-b border-[#2D2D2D]">
              <span className="font-serif text-xl font-bold text-light-text">FRUI</span>
              <button 
                onClick={onClose}
                className="text-muted-text hover:text-light-text p-1 rounded-full hover:bg-[#2D2D2D] transition-colors"
                data-testid="button-close-sidebar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <nav className="flex-1 px-4 py-6 flex flex-col gap-2">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors ${
                      isActive 
                        ? 'bg-charcoal text-camel' 
                        : 'text-light-text hover:bg-charcoal hover:text-camel'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}