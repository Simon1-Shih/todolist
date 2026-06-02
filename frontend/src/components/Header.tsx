import React, { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Settings } from 'lucide-react';

interface HeaderProps {
  viewMode: 'list' | 'calendar';
  onSwitchView: (mode: 'list' | 'calendar') => void;
  hideCalendarToggle?: boolean;
  user: {
    email: string;
    name?: string;
    picture?: string;
  };
  onLogout: () => void;
}

export function Header({ viewMode, onSwitchView, hideCalendarToggle, user, onLogout }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const displayName = user.name || user.email;
  const fallbackInitial = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        
        <div ref={profileRef} className="relative ml-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsProfileOpen(prev => !prev)}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary-fixed bg-primary-fixed text-on-primary-fixed grid place-items-center text-[14px] font-semibold hover:border-primary transition-colors"
            aria-label="Open profile menu"
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              fallbackInitial
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-md border border-slate-200 bg-white shadow-lg py-2 z-30">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[14px] font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="text-[12px] text-slate-500 truncate mt-1">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-[14px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
