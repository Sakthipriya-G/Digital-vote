import React, { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, KeyRound, ScrollText, Settings, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import type { AuditLog, User, UserRole } from '../types';
import { apiFetch } from '../utils/api';

interface SettingItem {
  key: string;
  value: string;
  description: string;
  updated_at: string;
}

export function SuperAdminDashboardPage() {
  const { user, language, navigate, setRoute, showToast } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    role: 'admin' as 'admin' | 'officer',
    district: 'Chennai',
    constituency: 'Chennai Central Demo',
    designation: 'Portal Administrator (Demo)',
  });

  const loadData = async () => {
    try {
      const [uRes, sRes, lRes] = await Promise.all([
        apiFetch<{ users: User[] }>('/api/admin/users'),
        apiFetch<{ settings: SettingItem[] }>('/api/superadmin/settings'),
        apiFetch<{ logs: AuditLog[] }>('/api/admin/audit-logs?limit=25'),
      ]);
      setUsers(uRes.users);
      setSettings(sRes.settings);
      setLogs(lRes.logs);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to load Super Admin console.');
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRoleChange = async (targetUser: User, nextRole: UserRole) => {
    try {
      await apiFetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      showToast('success', `Updated ${targetUser.full_name} role to ${nextRole}.`);
      await loadData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Role update failed.');
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    try {
      await apiFetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: targetUser.is_active === 1 ? 0 : 1 }),
      });
      showToast('success', `Account ${targetUser.is_active === 1 ? 'deactivated' : 'activated'}.`);
      await loadData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Status update failed.');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ message: string }>('/api/admin/officers', {
        method: 'POST',
        body: JSON.stringify(newStaff),
      });
      showToast('success', res.message);
      setNewStaff({
        full_name: '',
        email: '',
        mobile: '',
        password: '',
        role: 'admin',
        district: 'Chennai',
        constituency: 'Chennai Central Demo',
        designation: 'Portal Administrator (Demo)',
      });
      await loadData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Account creation failed.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ settings: SettingItem[]; message: string }>('/api/superadmin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          updates: settings.map((s) => ({ key: s.key, value: s.value })),
        }),
      });
      setSettings(res.settings);
      showToast('success', res.message);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Settings update failed.');
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <button
            type="button"
            onClick={() => setRoute('home')}
            aria-label={t(language, 'backToHome')}
            className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-[#0F2544] transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{t(language, 'backToHome')}</span>
          </button>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <span>Protected Super Admin Governance · {user?.email}</span>
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#0F2544]">
            {t(language, 'superAdminDashTitle')}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate('admin-dashboard')}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white hover:bg-[#16345E]"
        >
          <BarChart3 className="h-4 w-4 text-amber-400" />
          <span>Open Full Admin Analytics & Modules</span>
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Create Administrator or Officer Account */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
            <UserPlus className="h-5 w-5 text-[#1D4ED8]" />
            <span>Create Admin or Officer Account</span>
          </h2>
          <form onSubmit={handleCreateStaff} className="mt-4 space-y-3">
            <select
              value={newStaff.role}
              onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as 'admin' | 'officer' })}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"
            >
              <option value="admin">Administrator Account</option>
              <option value="officer">Election Officer Account</option>
            </select>
            <input
              required
              placeholder="Full Name"
              value={newStaff.full_name}
              onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <input
              required
              type="email"
              placeholder="Email Address"
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <input
              required
              placeholder="Test Mobile (10 digits)"
              value={newStaff.mobile}
              onChange={(e) => setNewStaff({ ...newStaff, mobile: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
            />
            <input
              required
              type="password"
              minLength={8}
              placeholder="Password (min 8 chars)"
              value={newStaff.password}
              onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <input
              placeholder="Assigned District"
              value={newStaff.district}
              onChange={(e) => setNewStaff({ ...newStaff, district: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
            />
            <button type="submit" className="h-10 w-full rounded-lg bg-[#1D4ED8] text-sm font-semibold text-white">
              Create Staff Account
            </button>
          </form>
        </div>

        {/* System Settings & Modules */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
            <Settings className="h-5 w-5 text-amber-600" />
            <span>System Settings & Module Controls</span>
          </h2>
          <form onSubmit={handleSaveSettings} className="mt-4 space-y-3">
            {settings.map((s, idx) => (
              <div key={s.key} className="grid grid-cols-1 items-center gap-2 border-b border-slate-100 pb-3 sm:grid-cols-12">
                <div className="sm:col-span-7">
                  <p className="font-mono text-xs font-semibold text-slate-900">{s.key}</p>
                  <p className="text-[11px] text-slate-500">{s.description}</p>
                </div>
                <div className="sm:col-span-5">
                  {s.key.startsWith('module_') || s.key === 'demo_mode_banner' ? (
                    <select
                      value={s.value}
                      onChange={(e) => {
                        const copy = [...settings];
                        copy[idx] = { ...s, value: e.target.value };
                        setSettings(copy);
                      }}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium"
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={s.value}
                      onChange={(e) => {
                        const copy = [...settings];
                        copy[idx] = { ...s, value: e.target.value };
                        setSettings(copy);
                      }}
                      className="h-9 w-full rounded-lg border border-slate-300 px-2.5 font-mono text-xs"
                    />
                  )}
                </div>
              </div>
            ))}
            <button type="submit" className="h-10 rounded-lg bg-[#0F2544] px-5 text-xs font-semibold text-white">
              Save System Configuration
            </button>
          </form>
        </div>
      </div>

      {/* Role & Permission Assignment Table */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
          <KeyRound className="h-5 w-5 text-[#1D4ED8]" />
          <span>Role Assignment & Account Status ({users.length} Accounts)</span>
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Account</th>
                <th className="py-2 px-3">Constituency</th>
                <th className="py-2 px-3">Assigned Role</th>
                <th className="py-2 px-3">State</th>
                <th className="py-2 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold text-slate-900">{u.full_name}</div>
                    <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{u.constituency}</td>
                  <td className="py-2.5 px-3">
                    <select
                      value={u.role}
                      disabled={u.id === user?.id}
                      onChange={(e) => void handleRoleChange(u, e.target.value as UserRole)}
                      className="h-8 rounded border border-slate-300 bg-white px-2 font-mono text-xs"
                    >
                      <option value="voter">voter</option>
                      <option value="officer">officer</option>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">{u.is_active === 1 ? 'Active' : 'Inactive'}</td>
                  <td className="py-2.5 pl-3 text-right">
                    <button
                      type="button"
                      disabled={u.id === user?.id}
                      onClick={() => void handleToggleActive(u)}
                      className="h-8 rounded border border-slate-300 px-2.5 disabled:opacity-40"
                    >
                      {u.is_active === 1 ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Activity & Audit Logs */}
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
          <ScrollText className="h-5 w-5 text-[#1D4ED8]" />
          <span>Recent System Activity & Audit Trail</span>
        </h2>
        <div className="mt-4 divide-y divide-slate-100 text-xs">
          {logs.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <span className="font-mono font-bold text-[#0F2544]">{l.action}</span> ·{' '}
                <span className="text-slate-700">{l.details}</span>
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                {l.actor_email} ({l.actor_role}) · {l.created_at.slice(0, 19).replace('T', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
