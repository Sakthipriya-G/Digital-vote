import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Globe, LogOut, Menu, Shield, UserCheck, X } from 'lucide-react';
import { useApp, type AppRoute } from '../context/AppContext';
import { t } from '../i18n/translations';
import type { LanguageCode, NotificationItem } from '../types';
import { apiFetch, getDashboardRouteForRole } from '../utils/api';

export function Navbar() {
  const {
    user,
    unreadNotifications,
    language,
    route,
    navigate,
    setLanguage,
    logout,
    refreshSession,
    showToast,
  } = useApp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const navItems: Array<{ route: AppRoute; label: string }> = [
    { route: 'home', label: t(language, 'navHome') },
    { route: 'services', label: t(language, 'navServices') },
    { route: 'candidates', label: t(language, 'navCandidates') },
    { route: 'parties', label: t(language, 'navParties') },
    { route: 'polling-stations', label: t(language, 'navStations') },
    { route: 'election-info', label: t(language, 'navInfo') },
    { route: 'help-centre', label: t(language, 'navHelp') },
  ];

  const loadNotifications = async () => {
    if (!user) return;
    setLoadingNotif(true);
    try {
      const res = await apiFetch<{ notifications: NotificationItem[] }>('/api/notifications');
      setNotifications(res.notifications);
    } catch {
      // ignore
    } finally {
      setLoadingNotif(false);
    }
  };

  useEffect(() => {
    if (notifOpen && user) {
      void loadNotifications();
    }
  }, [notifOpen, user]);

  const markRead = async (id: number) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      await refreshSession();
    } catch {
      showToast('error', 'Could not update notification.');
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      await refreshSession();
      showToast('success', 'All notifications marked as read.');
    } catch {
      showToast('error', 'Could not mark notifications as read.');
    }
  };

  const handleNav = (r: AppRoute) => {
    setMobileOpen(false);
    setNotifOpen(false);
    navigate(r);
  };

  return (
    <div className="border-b border-slate-200 bg-white">
      {/* Slim Civic Utility Strip */}
      <div className="bg-[#0F2544] text-slate-200">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-1.5 text-xs sm:px-6 lg:px-8">
          <p className="truncate font-medium text-slate-200">
            {t(language, 'disclaimerLabel')} — Fictional Academic Project
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNav('verification')}
              className="hidden sm:inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 whitespace-nowrap shrink-0 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{t(language, 'navVerify')}</span>
            </button>
            <div className="flex items-center gap-1 rounded bg-white/10 p-0.5" role="group" aria-label="Language selector">
              <Globe className="mx-1 h-3.5 w-3.5 text-slate-300 hidden sm:block" />
              {(['en', 'ta', 'hi'] as LanguageCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => void setLanguage(code)}
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    language === code ? 'bg-amber-500 text-slate-950' : 'text-slate-200 hover:bg-white/15'
                  }`}
                >
                  {code === 'en' ? 'EN' : code === 'ta' ? 'தமிழ்' : 'हिन्दी'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Single-Row Header */}
      <header className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded-md"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 36 36"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="36" height="36" rx="8" fill="#0F2544" />
            <circle cx="18" cy="18" r="10" stroke="#F59E0B" strokeWidth="2.2" />
            <path d="M13.5 18.2L16.5 21.2L22.8 14.8" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-display text-base font-bold tracking-tight text-[#0F2544] sm:text-lg">
            {t(language, 'brand')}
          </span>
        </button>

        {/* Desktop Nav Links */}
        <nav className="hidden xl:flex items-center gap-5" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = route === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`border-b-2 py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'border-[#1D4ED8] text-[#0F2544]'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-[#0F2544]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {user ? (
            <>
              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label="Notifications"
                  className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[10px] font-bold text-slate-950 tabular-nums">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                      <span className="text-xs font-semibold text-slate-900">
                        {t(language, 'notifications')} ({unreadNotifications})
                      </span>
                      <button
                        type="button"
                        onClick={() => void markAllRead()}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:underline"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        {t(language, 'markAllRead')}
                      </button>
                    </div>
                    <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                      {loadingNotif ? (
                        <p className="p-4 text-center text-xs text-slate-500">Loading notifications...</p>
                      ) : notifications.length === 0 ? (
                        <p className="p-4 text-center text-xs text-slate-500">No notifications yet.</p>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n.id}
                            className={`px-4 py-3 text-xs transition-colors ${
                              n.is_read ? 'bg-white text-slate-600' : 'bg-blue-50/50 text-slate-900'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold">{n.title}</p>
                              {!n.is_read && (
                                <button
                                  type="button"
                                  onClick={() => void markRead(n.id)}
                                  className="shrink-0 text-[11px] font-medium text-[#1D4ED8] hover:underline"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                            <p className="mt-1 text-slate-600">{n.message}</p>
                            <p className="mt-1 font-mono text-[10px] text-slate-400">
                              {n.event_type} · {n.created_at.slice(0, 16).replace('T', ' ')}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleNav(getDashboardRouteForRole(user.role) as AppRoute)}
                className="hidden sm:inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F2544] px-3.5 text-sm font-medium text-white hover:bg-[#16345E] whitespace-nowrap shrink-0 transition-colors"
              >
                <UserCheck className="h-4 w-4 text-amber-400" />
                <span>{t(language, 'dashboard')}</span>
              </button>

              <button
                type="button"
                onClick={() => void logout()}
                aria-label={t(language, 'logout')}
                className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>{t(language, 'logout')}</span>
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNav('login')}
                className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-[#0F2544] hover:bg-slate-50 whitespace-nowrap shrink-0 transition-colors"
              >
                {t(language, 'login')}
              </button>
              <button
                type="button"
                onClick={() => handleNav('register')}
                className="h-10 rounded-lg bg-[#0F2544] px-4 text-sm font-semibold text-white hover:bg-[#16345E] whitespace-nowrap shrink-0 transition-colors"
              >
                {t(language, 'register')}
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 xl:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 xl:hidden">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {navItems.map((item) => (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                className={`flex h-11 items-center rounded-lg px-3 text-left text-sm font-medium ${
                  route === item.route ? 'bg-blue-50 text-[#1D4ED8]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNav('verification')}
              className={`flex h-11 items-center rounded-lg px-3 text-left text-sm font-medium ${
                route === 'verification' ? 'bg-blue-50 text-[#1D4ED8]' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t(language, 'navVerify')}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleNav(getDashboardRouteForRole(user.role) as AppRoute)}
                  className="h-11 flex-1 rounded-lg bg-[#0F2544] px-4 text-sm font-semibold text-white"
                >
                  {t(language, 'dashboard')}
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700"
                >
                  {t(language, 'logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleNav('login')}
                  className="h-11 flex-1 rounded-lg border border-slate-300 px-4 text-sm font-medium text-[#0F2544]"
                >
                  {t(language, 'login')}
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('register')}
                  className="h-11 flex-1 rounded-lg bg-[#0F2544] px-4 text-sm font-semibold text-white"
                >
                  {t(language, 'register')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
