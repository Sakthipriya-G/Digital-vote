import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Download,
  FileText,
  IdCard,
  MapPin,
  MessageSquareWarning,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t, translateStatus } from '../i18n/translations';
import type {
  ApplicationRecord,
  ComplaintRecord,
  HistoryEntry,
  NotificationItem,
  VoterProfile,
} from '../types';
import { apiFetch, downloadVoterProfilePdf } from '../utils/api';

interface VoterDashResponse {
  profile: VoterProfile;
  counts: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    totalComplaints: number;
    unreadNotifications: number;
  };
  applications: ApplicationRecord[];
  complaints: ComplaintRecord[];
  notifications: NotificationItem[];
}

const COMPLAINT_CATEGORIES = [
  'Application Issue',
  'Polling Information',
  'Accessibility Issue',
  'Portal Technical Issue',
  'General Enquiry',
];

export function VoterDashboardPage() {
  const { language, navigate, setRoute, refreshSession, showToast } = useApp();
  const [tab, setTab] = useState<'overview' | 'profile' | 'applications' | 'complaints' | 'notifications'>('overview');
  const [data, setData] = useState<VoterDashResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('Not Specified');
  const [editAddress, setEditAddress] = useState('');
  const [editPin, setEditPin] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Selected Application History
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
  const [appHistory, setAppHistory] = useState<HistoryEntry[]>([]);

  // Submit Complaint State
  const [compCategory, setCompCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [compSubject, setCompSubject] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compAttach, setCompAttach] = useState('');
  const [submittingComp, setSubmittingComp] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<VoterDashResponse>('/api/voter/dashboard');
      setData(res);
      if (res.profile) {
        setEditName(res.profile.full_name || '');
        setEditMobile(res.profile.mobile || '');
        setEditDob(res.profile.date_of_birth || '1995-01-01');
        setEditGender(res.profile.gender || 'Not Specified');
        setEditAddress(res.profile.address || '');
        setEditPin(res.profile.pin_code || '');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/voter/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: editName,
          mobile: editMobile,
          date_of_birth: editDob,
          gender: editGender,
          address: editAddress,
          pin_code: editPin,
        }),
      });
      showToast('success', res.message);
      await loadDashboard();
      await refreshSession();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleAppHistory = async (appId: number) => {
    if (expandedAppId === appId) {
      setExpandedAppId(null);
      return;
    }
    try {
      const res = await apiFetch<{ history: HistoryEntry[] }>(`/api/applications/${appId}`);
      setAppHistory(res.history);
      setExpandedAppId(appId);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not load application history.');
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingComp(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({
          category: compCategory,
          subject: compSubject,
          description: compDesc,
          attachment_name: compAttach || 'demo_attachment.png',
        }),
      });
      showToast('success', res.message);
      setCompSubject('');
      setCompDesc('');
      setCompAttach('');
      await loadDashboard();
      await refreshSession();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to submit complaint.');
    } finally {
      setSubmittingComp(false);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      await loadDashboard();
      await refreshSession();
    } catch {
      // ignore
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      showToast('success', 'All notifications marked as read.');
      await loadDashboard();
      await refreshSession();
    } catch {
      // ignore
    }
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  const profile = data?.profile;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
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
          <p className="text-xs font-semibold text-[#1D4ED8]">
            {profile?.demo_ref_number || 'DEMO-VTR'} · {profile?.constituency}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[#0F2544]">
            {t(language, 'voterDashTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Welcome back, {profile?.full_name}.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => navigate('services')}
            className="h-10 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white hover:bg-[#16345E]"
          >
            New Application
          </button>
          <button
            type="button"
            onClick={() => navigate('verification')}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
          >
            Verification Demo
          </button>
        </div>
      </div>

      {/* 6 KPI Dashboard Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => setTab('profile')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#1D4ED8]"
        >
          <p className="text-xs font-medium text-slate-500">{t(language, 'myProfile')}</p>
          <p className="mt-1.5 truncate font-mono text-sm font-bold text-[#0F2544]">
            {profile?.verification_status || 'Pending'}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab('applications')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#1D4ED8]"
        >
          <p className="text-xs font-medium text-slate-500">{t(language, 'myApplications')}</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">
            {data?.counts.totalApplications ?? 0}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab('applications')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#1D4ED8]"
        >
          <p className="text-xs font-medium text-slate-500">{t(language, 'pendingApplications')}</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-amber-600">
            {data?.counts.pendingApplications ?? 0}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab('applications')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#1D4ED8]"
        >
          <p className="text-xs font-medium text-slate-500">{t(language, 'approvedApplications')}</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {data?.counts.approvedApplications ?? 0}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab('complaints')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#1D4ED8]"
        >
          <p className="text-xs font-medium text-slate-500">{t(language, 'myComplaints')}</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">
            {data?.counts.totalComplaints ?? 0}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab('notifications')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#1D4ED8]"
        >
          <p className="text-xs font-medium text-slate-500">{t(language, 'notifications')}</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#1D4ED8]">
            {data?.counts.unreadNotifications ?? 0}
          </p>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        {(
          [
            ['overview', 'Overview & Polling Station'],
            ['profile', 'Digital Voter Profile'],
            ['applications', 'Applications History'],
            ['complaints', 'Complaint Portal'],
            ['notifications', 'Notifications'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === key ? 'bg-white text-[#0F2544] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
                <MapPin className="h-5 w-5 text-[#1D4ED8]" />
                <span>Assigned Polling Station (Demo)</span>
              </h2>
              <button
                type="button"
                onClick={() => navigate('polling-stations')}
                className="text-xs font-semibold text-[#1D4ED8] hover:underline"
              >
                Explore all stations
              </button>
            </div>
            {profile?.polling_station_name ? (
              <div className="mt-4 space-y-2.5 text-sm">
                <p className="font-mono text-xs font-semibold text-[#1D4ED8]">
                  {profile.station_code} · PIN {profile.polling_station_pin}
                </p>
                <p className="font-display text-base font-bold text-slate-900">{profile.polling_station_name}</p>
                <p className="text-xs text-slate-600">{profile.polling_station_address}</p>
                <p className="text-xs text-slate-700">
                  <strong>Accessibility:</strong> {profile.accessibility_facilities}
                </p>
                <p className="text-xs text-slate-700">
                  <strong>Facilities:</strong> {profile.available_facilities}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No demonstration polling station assigned yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
                <IdCard className="h-5 w-5 text-amber-600" />
                <span>Digital Voter Profile Summary</span>
              </h2>
              {profile && (
                <button
                  type="button"
                  onClick={() => downloadVoterProfilePdf(profile)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F2544] px-3 text-xs font-semibold text-white hover:bg-[#16345E]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </button>
              )}
            </div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
              {t(language, 'nonOfficialLabel')}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-500">Demo Reference</dt>
                <dd className="mt-0.5 font-mono font-semibold text-slate-900">{profile?.demo_ref_number}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Verification Status</dt>
                <dd className="mt-0.5 font-semibold text-[#1D4ED8]">{profile?.verification_status}</dd>
              </div>
              <div>
                <dt className="text-slate-500">District / State</dt>
                <dd className="mt-0.5 text-slate-900">
                  {profile?.district}, {profile?.state}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Constituency</dt>
                <dd className="mt-0.5 text-slate-900">{profile?.constituency}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* TAB: DIGITAL VOTER PROFILE */}
      {tab === 'profile' && profile && (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-xs font-bold text-amber-950">
              {t(language, 'nonOfficialLabel')}
            </div>
            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#0F2544] font-display text-xl font-bold text-white">
                {(profile.full_name || 'V').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-[#0F2544]">{profile.full_name}</h2>
                <p className="font-mono text-xs font-semibold text-[#1D4ED8]">{profile.demo_ref_number}</p>
                <p className="mt-0.5 text-xs text-slate-500">Status: {profile.verification_status}</p>
              </div>
            </div>

            <dl className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-mono text-slate-900">{profile.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Test Mobile</dt>
                <dd className="font-mono text-slate-900">{profile.mobile}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Date of Birth</dt>
                <dd className="font-mono text-slate-900">{profile.date_of_birth}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Gender</dt>
                <dd className="text-slate-900">{profile.gender}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-slate-500">Demo Address</dt>
                <dd className="text-right text-slate-900">
                  {profile.address} — {profile.pin_code}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => downloadVoterProfilePdf(profile)}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0F2544] text-sm font-semibold text-white hover:bg-[#16345E]"
            >
              <Download className="h-4 w-4" />
              <span>{t(language, 'downloadPdf')}</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <UserCheck className="h-5 w-5 text-[#1D4ED8]" />
              <span>Edit Demonstration Profile</span>
            </h2>
            <form onSubmit={handleSaveProfile} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Test Mobile (10 digits)</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Gender</label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Not Specified">Not Specified</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">Demonstration Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">PIN Code (6 digits)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="h-11 rounded-lg bg-[#1D4ED8] px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : t(language, 'saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: APPLICATIONS */}
      {tab === 'applications' && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <FileText className="h-5 w-5 text-[#1D4ED8]" />
              <span>My Application History</span>
            </h2>
            <button
              type="button"
              onClick={() => navigate('services')}
              className="h-9 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white"
            >
              Submit New Application
            </button>
          </div>

          {!data?.applications.length ? (
            <p className="mt-6 text-center text-sm text-slate-500">You have not submitted any demonstration applications yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-200">
              {data.applications.map((app) => (
                <div key={app.id} className="py-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#1D4ED8]">{app.reference_number}</p>
                      <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{app.category}</h3>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {app.constituency} · Updated {app.updated_at.slice(0, 16).replace('T', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#0F2544]">
                        {translateStatus(language, app.status)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void toggleAppHistory(app.id)}
                        className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {expandedAppId === app.id ? 'Hide Timeline' : 'Track History'}
                      </button>
                    </div>
                  </div>
                  {expandedAppId === app.id && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-xs text-slate-700">{app.description}</p>
                      <div className="mt-3 space-y-2 border-l border-slate-300 pl-3">
                        {appHistory.map((h, i) => (
                          <div key={i} className="text-xs">
                            <p className="font-semibold text-slate-900">
                              {h.status} · <span className="font-mono text-[11px] text-slate-500">{h.created_at.slice(0, 16).replace('T', ' ')}</span>
                            </p>
                            <p className="text-slate-600">{h.remarks} ({h.changed_by_name})</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: COMPLAINTS */}
      {tab === 'complaints' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <MessageSquareWarning className="h-5 w-5 text-amber-600" />
              <span>{t(language, 'submitComplaint')}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Only you and authorized election officers can view your grievance records.
            </p>
            <form onSubmit={handleSubmitComplaint} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Complaint Category</label>
                <select
                  value={compCategory}
                  onChange={(e) => setCompCategory(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Subject</label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={compSubject}
                  onChange={(e) => setCompSubject(e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  placeholder="Provide details (minimum 10 characters)..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Demo Attachment Label (Optional)</label>
                <input
                  type="text"
                  value={compAttach}
                  onChange={(e) => setCompAttach(e.target.value)}
                  placeholder="e.g., demo_screenshot.png"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={submittingComp}
                className="h-11 w-full rounded-lg bg-[#0F2544] text-sm font-semibold text-white hover:bg-[#16345E]"
              >
                {submittingComp ? 'Submitting...' : t(language, 'submitComplaint')}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
            <h2 className="font-display text-lg font-bold text-[#0F2544]">My Complaint History</h2>
            {!data?.complaints.length ? (
              <p className="mt-6 text-center text-sm text-slate-500">No complaints submitted yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.complaints.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[#1D4ED8]">{c.reference_number}</span>
                      <span className="font-semibold text-[#0F2544]">{translateStatus(language, c.status)}</span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold text-slate-900">{c.subject}</h3>
                    <p className="mt-1 text-slate-600">
                      {c.category} · {c.description}
                    </p>
                    {c.officer_response && (
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-950">
                        <span className="font-semibold">Officer Response: </span>
                        {c.officer_response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <Bell className="h-5 w-5 text-[#1D4ED8]" />
              <span>Notification History</span>
            </h2>
            <button
              type="button"
              onClick={() => void markAllNotificationsRead()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
            >
              <CheckCheck className="h-4 w-4" />
              <span>{t(language, 'markAllRead')}</span>
            </button>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {(data?.notifications || []).map((n) => (
              <div
                key={n.id}
                className={`flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center ${
                  n.is_read ? 'opacity-75' : 'bg-blue-50/40 px-3 rounded-lg'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">
                    {n.event_type} · {n.created_at.slice(0, 19).replace('T', ' ')}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => void markNotificationRead(n.id)}
                    className="shrink-0 text-xs font-semibold text-[#1D4ED8] hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <span>{t(language, 'disclaimerText')}</span>
      </div>
    </div>
  );
}
