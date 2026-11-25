import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { LanguageCode, User, VoterProfile } from '../types';
import { apiFetch, getDashboardRouteForRole } from '../utils/api';

export type AppRoute =
  | 'home'
  | 'services'
  | 'candidates'
  | 'parties'
  | 'polling-stations'
  | 'election-info'
  | 'help-centre'
  | 'verification'
  | 'login'
  | 'register'
  | 'voter-dashboard'
  | 'officer-dashboard'
  | 'admin-dashboard'
  | 'super-admin-dashboard';

const VALID_ROUTES: AppRoute[] = [
  'home',
  'services',
  'candidates',
  'parties',
  'polling-stations',
  'election-info',
  'help-centre',
  'verification',
  'login',
  'register',
  'voter-dashboard',
  'officer-dashboard',
  'admin-dashboard',
  'super-admin-dashboard',
];

function getInitialRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, '') as AppRoute;
  return VALID_ROUTES.includes(hash) ? hash : 'home';
}

interface ToastState {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextValue {
  user: User | null;
  profile: VoterProfile | null;
  unreadNotifications: number;
  authLoading: boolean;
  language: LanguageCode;
  route: AppRoute;
  pollbotOpen: boolean;
  setPollbotOpen: (open: boolean) => void;
  navigate: (route: AppRoute) => void;
  setRoute: (route: AppRoute) => void;
  goBack: (fallback?: AppRoute) => void;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  refreshSession: () => Promise<User | null>;
  logout: () => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<VoterProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('sep_lang');
    return saved === 'ta' || saved === 'hi' ? saved : 'en';
  });
  const [route, setRoute] = useState<AppRoute>(getInitialRoute);
  const currentRouteRef = useRef<AppRoute>(route);
  const routeHistoryRef = useRef<AppRoute[]>([]);
  const [pollbotOpen, setPollbotOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    currentRouteRef.current = route;
  }, [route]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute) => {
    const prevRoute = currentRouteRef.current;
    if (prevRoute && prevRoute !== nextRoute) {
      routeHistoryRef.current.push(prevRoute);
      if (routeHistoryRef.current.length > 30) {
        routeHistoryRef.current.shift();
      }
    }
    currentRouteRef.current = nextRoute;
    setRoute(nextRoute);
    window.location.hash = `#/${nextRoute}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(
    (fallback: AppRoute = 'home') => {
      const current = currentRouteRef.current;
      let target: AppRoute | undefined;
      while (routeHistoryRef.current.length > 0) {
        const candidate = routeHistoryRef.current.pop()!;
        if (candidate !== current && candidate !== 'login' && candidate !== 'register') {
          target = candidate;
          break;
        }
      }
      const nextRoute = target || fallback;
      currentRouteRef.current = nextRoute;
      setRoute(nextRoute);
      window.location.hash = `#/${nextRoute}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = getInitialRoute();
      const prevRoute = currentRouteRef.current;
      if (prevRoute && prevRoute !== nextRoute) {
        routeHistoryRef.current.push(prevRoute);
        if (routeHistoryRef.current.length > 30) {
          routeHistoryRef.current.shift();
        }
      }
      currentRouteRef.current = nextRoute;
      setRoute(nextRoute);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const refreshSession = useCallback(async (): Promise<User | null> => {
    try {
      const res = await apiFetch<{
        user: User | null;
        profile?: VoterProfile | null;
        unreadNotifications?: number;
      }>('/api/auth/me');
      setUser(res.user);
      setProfile(res.profile || null);
      setUnreadNotifications(res.unreadNotifications || 0);
      if (res.user?.language_pref) {
        setLanguageState(res.user.language_pref);
        localStorage.setItem('sep_lang', res.user.language_pref);
      }
      return res.user;
    } catch {
      setUser(null);
      setProfile(null);
      setUnreadNotifications(0);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  // Role-based route guard
  useEffect(() => {
    if (authLoading) return;
    const protectedRoutes: Record<string, string[]> = {
      'voter-dashboard': ['voter', 'officer', 'admin', 'super_admin'],
      'officer-dashboard': ['officer', 'admin', 'super_admin'],
      'admin-dashboard': ['admin', 'super_admin'],
      'super-admin-dashboard': ['super_admin'],
    };

    const allowed = protectedRoutes[route];
    if (allowed) {
      if (!user) {
        showToast('error', 'Please sign in to access your portal dashboard.');
        navigate('login');
      } else if (!allowed.includes(user.role)) {
        showToast('error', 'Access restricted. Redirecting to your authorized dashboard.');
        navigate(getDashboardRouteForRole(user.role) as AppRoute);
      }
    }
  }, [route, user, authLoading, navigate, showToast]);

  const setLanguage = useCallback(
    async (lang: LanguageCode) => {
      setLanguageState(lang);
      localStorage.setItem('sep_lang', lang);
      if (user) {
        try {
          await apiFetch('/api/auth/language', {
            method: 'PATCH',
            body: JSON.stringify({ language: lang }),
          });
        } catch {
          // ignore if offline
        }
      }
    },
    [user]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setUser(null);
    setProfile(null);
    setUnreadNotifications(0);
    showToast('info', 'You have been signed out.');
    navigate('home');
  }, [navigate, showToast]);

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        unreadNotifications,
        authLoading,
        language,
        route,
        pollbotOpen,
        setPollbotOpen,
        navigate,
        setRoute: navigate,
        goBack,
        setLanguage,
        refreshSession,
        logout,
        showToast,
      }}
    >
      {children}

      {/* Accessible live toast stack */}
      <div
        aria-live="polite"
        className="fixed bottom-4 left-4 z-50 flex max-w-md flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-blue-200 bg-white text-slate-900'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
