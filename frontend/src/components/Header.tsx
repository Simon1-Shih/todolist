import React, { useEffect, useRef, useState } from 'react';
import { Bell, LogOut, Search, Settings } from 'lucide-react';
import type { AppUser, NotificationItem } from '../App';
import { api } from '../api';

interface HeaderProps {
  viewMode: 'list' | 'calendar';
  onSwitchView: (mode: 'list' | 'calendar') => void;
  hideCalendarToggle?: boolean;
  user: {
    id: number;
    email: string;
    name?: string;
    picture?: string;
  };
  onLogout: () => void;
  notifications?: NotificationItem[];
  onOpenNotifications?: () => void;
  onMarkNotificationsRead?: () => void;
  onSelectUser: (user: AppUser) => void;
}

export function Header({ viewMode, onSwitchView, hideCalendarToggle, user, onLogout, notifications = [], onOpenNotifications, onMarkNotificationsRead, onSelectUser }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userCandidates, setUserCandidates] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const displayName = user.name || user.email;
  const fallbackInitial = displayName.slice(0, 1).toUpperCase();
  const hasUnreadNotifications = notifications.some(notification => !notification.read);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setUserCandidates([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = userQuery.trim();
    if (!trimmed || selectedUser) {
      setUserCandidates([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const users = await api.searchUsers(trimmed);
        setUserCandidates((users || []).slice(0, 5));
      } catch (err) {
        console.error('Failed to search users:', err);
        setUserCandidates([]);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [userQuery, selectedUser]);

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm h-20 grid grid-cols-[auto_minmax(320px,620px)_auto] items-center gap-6 px-8 w-full">
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

      <div ref={searchRef} className="relative min-w-0">
        <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={userQuery}
              onChange={(event) => {
                setUserQuery(event.target.value);
                setSelectedUser(null);
              }}
          className="h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-12 pr-5 text-[15px] shadow-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
            {userCandidates.length > 0 && (
          <div className="absolute left-0 right-0 top-[56px] z-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                {userCandidates.map(candidate => {
                  const candidateName = candidate.name || candidate.email;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(candidate);
                        setUserQuery(candidateName);
                        setUserCandidates([]);
                    onSelectUser(candidate);
                      }}
                  className="w-full px-5 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <span className="block truncate text-[14px] font-semibold text-slate-900">{candidateName}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-slate-500">{candidate.email}</span>
                    </button>
                  );
                })}
              </div>
            )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={async () => {
                const nextOpen = !isNotificationsOpen;
                setIsNotificationsOpen(nextOpen);
                if (nextOpen) {
                  await onOpenNotifications?.();
                  onMarkNotificationsRead?.();
                }
              }}
              className="relative p-2 text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-all"
              aria-label="Open notifications"
            >
              <Bell size={20} />
              {hasUnreadNotifications && (
                <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-md border border-slate-200 bg-white shadow-lg py-2 z-30">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-[14px] font-semibold text-slate-900">Notifications</p>
                </div>
                <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                  {notifications.length === 0 ? (
                    <p className="px-2 py-6 text-center text-[13px] text-slate-500">No notifications</p>
                  ) : (
                    notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`rounded-md px-3 py-2 text-[13px] font-medium ${
                          notification.variant === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                            : 'bg-red-50 text-red-700 border border-red-100'
                        }`}
                      >
                        {notification.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
