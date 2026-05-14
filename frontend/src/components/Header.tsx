import React from 'react';
import { Bell, Settings } from 'lucide-react';

interface HeaderProps {
  viewMode: 'list' | 'calendar';
  onSwitchView: (mode: 'list' | 'calendar') => void;
  hideCalendarToggle?: boolean;
}

export function Header({ viewMode, onSwitchView, hideCalendarToggle }: HeaderProps) {
  const isListView = viewMode === 'list';

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm h-16 flex items-center justify-between px-8 w-full">
      <div className="flex items-center gap-8 h-full">
        <span className="text-[20px] font-bold text-primary tracking-tight">FocusFlow</span>
        <nav className="flex items-center gap-6 h-full">
          <button
            onClick={() => onSwitchView('list')}
            className={`h-full flex items-center px-1 border-b-2 font-semibold text-[14px] transition-all ${
              viewMode === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-primary'
            }`}
          >
            List
          </button>
          {!hideCalendarToggle && (
            <button
              onClick={() => onSwitchView('calendar')}
              className={`h-full flex items-center px-1 border-b-2 font-semibold text-[14px] transition-all ${
                viewMode === 'calendar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              Calendar
            </button>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-all">
            <Bell size={20} />
          </button>
          <button className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-all">
            <Settings size={20} />
          </button>
        </div>
        
        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary-fixed ml-2 shrink-0">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop" 
            alt="User Profile" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
