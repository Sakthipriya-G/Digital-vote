import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldAlert, UserCheck, UserPlus } from 'lucide-react';
import { useApp, type AppRoute } from '../context/AppContext';
import { t } from '../i18n/translations';
import type { UserRole } from '../types';
import { apiFetch, getDashboardRouteForRole } from '../utils/api';

interface DemoAccount {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  district: string;
  constituency: string;
  is_active: number;
}

const STATE_DISTRICT_CONSTITUENCIES: Record<string, Record<string, string[]>> = {
  'Tamil Nadu': {
    Chennai: ['Chennai Central Demo'],
    Coimbatore: ['Coimbatore North Demo'],
    Madurai: ['Madurai East Demo'],
  },
  Karnataka: {
    'Bengaluru Urban': ['Bengaluru South Demo'],
  },
  Delhi: {
    'New Delhi': ['New Delhi Civic Demo'],
  },
};

export function LoginPage() {
  const { language, navigate, refreshSession, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | UserRole>('all');

  // Forgot / Reset Password flow
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [demoGeneratedToken, setDemoGeneratedToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    apiFetch<{ accounts: DemoAccount[] }>('/api/auth/demo-accounts')
      .then((res) => setDemoAccounts(res.accounts.filter((a) => a.role !== 'voter')))
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ user: { role: UserRole; full_name: string } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await refreshSession();
      showToast('success', `Signed in as ${res.user.full_name} (${res.user.role}).`);
      navigate(getDashboardRouteForRole(res.user.role) as AppRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword('DemoPass@2026');
    setError('');
    setMode('login');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string; demoResetToken: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail }),
      });
      setDemoGeneratedToken(res.demoResetToken);
      setResetToken(res.demoResetToken);
      setResetMessage(res.message);
      setMode('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: resetEmail, token: resetToken, new_password: newPassword }),
      });
      showToast('success', res.message);
      setEmail(resetEmail);
      setPassword('');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDemos =
    selectedRoleFilter === 'all'
      ? demoAccounts
      : demoAccounts.filter((d) => d.role === selectedRoleFilter);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      {/* Required Disclaimer on Login Page */}
      <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <p className="leading-relaxed">
          <strong className="font-semibold">{t(language, 'disclaimerLabel')}: </strong>
          {t(language, 'disclaimerText')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Login / Forgot / Reset Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-5">
          {mode === 'login' && (
            <>
              <div className="flex items-center gap-2.5 text-[#0F2544]">
                <Lock className="h-5 w-5 text-[#1D4ED8]" />
                <h1 className="font-display text-2xl font-bold">{t(language, 'login')}</h1>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">
                Sign in with your demonstration account. You will be redirected to your role-specific dashboard.
              </p>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                  <div className="relative mt-1.5">
                    <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-10 w-full rounded-lg border border-slate-300 pl-3 pr-10 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-700"
                    >
                      {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setError('');
                      setMode('forgot');
                    }}
                    className="font-medium text-[#1D4ED8] hover:underline"
                  >
                    Forgot password?
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('register')}
                    className="font-medium text-slate-600 hover:text-[#0F2544] hover:underline"
                  >
                    Create demo voter account
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-lg bg-[#0F2544] text-sm font-semibold text-white hover:bg-[#16345E] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Signing in...' : 'Sign In to Portal'}
                </button>
              </form>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <div className="flex items-center gap-2.5 text-[#0F2544]">
                <KeyRound className="h-5 w-5 text-[#1D4ED8]" />
                <h1 className="font-display text-xl font-bold">Forgot Password (Demo)</h1>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">
                Enter your registered demonstration email to generate a 15-minute reset code.
              </p>
              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                  {error}
                </div>
              )}
              <form onSubmit={handleForgotSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-10 flex-1 rounded-lg bg-[#0F2544] text-sm font-semibold text-white hover:bg-[#16345E]"
                  >
                    {loading ? 'Generating...' : 'Generate Reset Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700"
                  >
                    Back
                  </button>
                </div>
              </form>
            </>
          )}

          {mode === 'reset' && (
            <>
              <div className="flex items-center gap-2.5 text-[#0F2544]">
                <KeyRound className="h-5 w-5 text-[#1D4ED8]" />
                <h1 className="font-display text-xl font-bold">Reset Password</h1>
              </div>
              {resetMessage && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <p>{resetMessage}</p>
                  {demoGeneratedToken && (
                    <p className="mt-1 font-mono font-bold">Demo Reset Code: {demoGeneratedToken}</p>
                  )}
                </div>
              )}
              {error && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  {error}
                </div>
              )}
              <form onSubmit={handleResetSubmit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Reset Code</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">New Password (min 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-10 flex-1 rounded-lg bg-[#0F2544] text-sm font-semibold text-white"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Right: Staff & Admin Demo Account Selector (Voter details removed) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 lg:col-span-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-[#0F2544]">
                <UserCheck className="h-5 w-5 text-amber-600" />
                <h2 className="font-display text-lg font-bold">Officer & Admin Account Selector</h2>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Select an Election Officer, Admin, or Super Admin test account to prefill sign-in credentials. Standard password:{' '}
                <span className="font-mono font-semibold text-slate-900">DemoPass@2026</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              {(
                [
                  ['all', `All (${demoAccounts.length})`],
                  ['officer', `Officers (${demoAccounts.filter((d) => d.role === 'officer').length})`],
                  ['admin', `Admins (${demoAccounts.filter((d) => d.role === 'admin').length})`],
                  ['super_admin', `Super Admin (${demoAccounts.filter((d) => d.role === 'super_admin').length})`],
                ] as const
              ).map(([roleKey, label]) => (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => setSelectedRoleFilter(roleKey)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedRoleFilter === roleKey
                      ? 'bg-white text-[#0F2544] shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid max-h-[420px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {filteredDemos.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
                  email === acc.email
                    ? 'border-[#1D4ED8] bg-blue-50/60'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">{acc.full_name}</span>
                  <span className="shrink-0 font-mono text-[11px] font-semibold uppercase text-[#1D4ED8]">
                    {acc.role.replace('_', ' ')}
                  </span>
                </div>
                <span className="mt-1 truncate font-mono text-xs text-slate-600">{acc.email}</span>
                <span className="mt-1 truncate text-[11px] text-slate-500">
                  {acc.district} · {acc.constituency}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { language, navigate, refreshSession, showToast } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [regionMap, setRegionMap] = useState<Record<string, Record<string, string[]>>>(STATE_DISTRICT_CONSTITUENCIES);

  const states = Object.keys(regionMap);
  const [stateName, setStateName] = useState(states[0]);
  const districts = Object.keys(regionMap[stateName] || {});
  const [district, setDistrict] = useState(districts[0] || '');
  const constituencies = regionMap[stateName]?.[district] || [];
  const [constituency, setConstituency] = useState(constituencies[0] || '');

  useEffect(() => {
    apiFetch<{ constituencies: Array<{ name: string; district: string; state: string }> }>('/api/public/constituencies')
      .then((res) => {
        if (!res.constituencies?.length) return;
        const grouped: Record<string, Record<string, string[]>> = {};
        for (const c of res.constituencies) {
          if (!grouped[c.state]) grouped[c.state] = {};
          if (!grouped[c.state][c.district]) grouped[c.state][c.district] = [];
          if (!grouped[c.state][c.district].includes(c.name)) {
            grouped[c.state][c.district].push(c.name);
          }
        }
        setRegionMap(grouped);
        if (grouped['Tamil Nadu']) {
          const defaultDist = grouped['Tamil Nadu']['Chennai'] ? 'Chennai' : Object.keys(grouped['Tamil Nadu'])[0];
          setStateName('Tamil Nadu');
          setDistrict(defaultDist);
          setConstituency(grouped['Tamil Nadu'][defaultDist]?.[0] || '');
        }
      })
      .catch(() => {});
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStateChange = (nextState: string) => {
    setStateName(nextState);
    const nextDistricts = Object.keys(regionMap[nextState] || {});
    const nextDist = nextDistricts[0] || '';
    setDistrict(nextDist);
    setConstituency((regionMap[nextState]?.[nextDist] || [])[0] || '');
  };

  const handleDistrictChange = (nextDist: string) => {
    setDistrict(nextDist);
    setConstituency((regionMap[stateName]?.[nextDist] || [])[0] || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Password and Confirm Password must match.');
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      setError('Please enter a 10-digit test mobile number (e.g., 9876543210).');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          mobile,
          password,
          confirm_password: confirmPassword,
          state: stateName,
          district,
          constituency,
        }),
      });
      await refreshSession();
      showToast('success', res.message);
      navigate('voter-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2.5 text-[#0F2544]">
          <UserPlus className="h-5 w-5 text-[#1D4ED8]" />
          <h1 className="font-display text-2xl font-bold">{t(language, 'register')}</h1>
        </div>
        <p className="mt-1.5 text-sm text-slate-600">
          Create a fictional demonstration voter account. Duplicate email or mobile attempts are flagged by the Anti-Fraud system.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Priya Ramanathan"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@demo.edu"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Mobile Number (Test Data, 10 digits)</label>
            <input
              type="tel"
              required
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              placeholder="9876501234"
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Password (min 8 chars)</label>
            <div className="relative mt-1">
              <input
                type={showPass ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 pl-3 pr-10 text-sm focus:border-[#1D4ED8] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-2.5 text-slate-500"
              >
                {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Confirm Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">State</label>
            <select
              value={stateName}
              onChange={(e) => handleStateChange(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">District</label>
            <select
              value={district}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">Constituency (Demo)</label>
            <select
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              {constituencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-[#0F2544] text-sm font-semibold text-white hover:bg-[#16345E] disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Register Demonstration Voter Account'}
            </button>
            <p className="mt-3 text-center text-xs text-slate-600">
              Already registered?{' '}
              <button type="button" onClick={() => navigate('login')} className="font-semibold text-[#1D4ED8] hover:underline">
                Sign in here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
