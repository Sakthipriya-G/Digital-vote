import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  FileSpreadsheet,
  Flag,
  Landmark,
  MapPin,
  MessageSquareWarning,
  Plus,
  ScrollText,
  Settings,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';
import {
  DonutDistributionChart,
  HorizontalBarChart,
  TrendColumnChart,
  type ChartDatum,
} from '../components/Charts';
import { AuditLogsPanel } from '../components/admin/AuditLogsPanel';
import { ReportsPanel } from '../components/admin/ReportsPanel';
import { SecurityMonitoringPanel } from '../components/admin/SecurityMonitoringPanel';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import type {
  ApplicationRecord,
  Candidate,
  ComplaintRecord,
  Constituency,
  ElectionEvent,
  PoliticalParty,
  PollingStation,
  User,
  VoterProfile,
} from '../types';
import { apiFetch } from '../utils/api';

type AdminModule =
  | 'analytics'
  | 'users'
  | 'profiles'
  | 'applications'
  | 'candidates'
  | 'parties'
  | 'constituencies'
  | 'stations'
  | 'complaints'
  | 'calendar'
  | 'notifications'
  | 'officers'
  | 'security'
  | 'audit'
  | 'reports';

interface AdminAnalyticsData {
  stats: {
    totalDemoUsers: number;
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    totalCandidates: number;
    totalPoliticalParties: number;
    totalPollingStations: number;
    openComplaints: number;
    securityAlerts: number;
  };
  charts: {
    applicationTrends: ChartDatum[];
    applicationStatusDistribution: ChartDatum[];
    complaintTrends: ChartDatum[];
    userRegistrationTrends: ChartDatum[];
    verificationOutcomes: ChartDatum[];
    securityEventTrends: ChartDatum[];
  };
}

interface OfficerRow {
  id: number;
  user_id: number;
  officer_code: string;
  full_name: string;
  email: string;
  mobile: string;
  assigned_district: string;
  assigned_constituency: string;
  designation: string;
  is_active: number;
}

export function AdminDashboardPage() {
  const { user, language, navigate, setRoute, showToast } = useApp();
  const [activeMod, setActiveMod] = useState<AdminModule>('analytics');

  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [usersList, setUsersList] = useState<Array<User & { demo_ref_number?: string; verification_status?: string }>>([]);
  const [profilesList, setProfilesList] = useState<VoterProfile[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [parties, setParties] = useState<PoliticalParty[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [elections, setElections] = useState<ElectionEvent[]>([]);
  const [officers, setOfficers] = useState<OfficerRow[]>([]);

  // Forms state
  const [userSearch, setUserSearch] = useState('');
  const [candForm, setCandForm] = useState({
    id: 0,
    name: '',
    photo_url: '/src/assets/images/candidate_portrait_1_1795605887697.jpg',
    party_id: '',
    constituency_id: '',
    education: '',
    experience: '',
    manifesto: '',
    age: '40',
  });
  const [partyForm, setPartyForm] = useState({
    id: 0,
    name: '',
    short_code: '',
    symbol_name: '',
    color_hex: '#1D4ED8',
    description: '',
    website: '',
    manifesto_summary: '',
  });
  const [constForm, setConstForm] = useState({ name: '', code: '', district: '', state: '' });
  const [stationForm, setStationForm] = useState({
    id: 0,
    name: '',
    address: '',
    pin_code: '',
    district: '',
    constituency_id: '',
    accessibility_facilities: 'Wheelchair Ramp, Tactile Path',
    available_facilities: 'Drinking Water, Help Desk',
    latitude: '13.0500',
    longitude: '80.2500',
  });
  const [calForm, setCalForm] = useState({
    title: '',
    election_type: 'Notice',
    phase: 'Phase I',
    event_date: '2026-12-28',
    constituency: 'All Demo Constituencies',
    status: 'Scheduled',
    description: '',
    is_announcement: true,
  });
  const [notifForm, setNotifForm] = useState({ target_role: 'voter', title: '', message: '' });
  const [officerForm, setOfficerForm] = useState({
    full_name: '',
    email: '',
    mobile: '',
    password: '',
    state: 'Tamil Nadu',
    district: 'Chennai',
    constituency: 'Chennai Central Demo',
    designation: 'Electoral Officer (Demo)',
  });

  // Complaint search/filter + response
  const [compFilter, setCompFilter] = useState('');
  const [compStatusFilter, setCompStatusFilter] = useState('');
  const [compReplyMap, setCompReplyMap] = useState<Record<number, { status: string; response: string; officerId: string }>>({});

  const loadAnalytics = async () => {
    try {
      const res = await apiFetch<AdminAnalyticsData>('/api/admin/analytics');
      setAnalytics(res);
    } catch {
      // ignore
    }
  };

  const loadSharedRefs = async () => {
    try {
      const [cRes, pRes, stRes] = await Promise.all([
        apiFetch<{ constituencies: Constituency[] }>('/api/public/constituencies'),
        apiFetch<{ parties: PoliticalParty[] }>('/api/public/parties'),
        apiFetch<{ pollingStations: PollingStation[] }>('/api/public/polling-stations'),
      ]);
      setConstituencies(cRes.constituencies);
      setParties(pRes.parties);
      setStations(stRes.pollingStations);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadAnalytics();
    void loadSharedRefs();
  }, []);

  const loadModuleData = async (mod: AdminModule) => {
    try {
      if (mod === 'analytics') await loadAnalytics();
      if (mod === 'users') {
        const res = await apiFetch<{ users: Array<User & { demo_ref_number?: string }> }>(
          `/api/admin/users?q=${encodeURIComponent(userSearch)}`
        );
        setUsersList(res.users);
      }
      if (mod === 'profiles') {
        const res = await apiFetch<{ profiles: VoterProfile[] }>('/api/admin/voter-profiles');
        setProfilesList(res.profiles);
      }
      if (mod === 'applications') {
        const res = await apiFetch<{ applications: ApplicationRecord[] }>('/api/applications');
        setApplications(res.applications);
      }
      if (mod === 'candidates') {
        const res = await apiFetch<{ candidates: Candidate[] }>('/api/public/candidates?include_unpublished=1');
        setCandidates(res.candidates);
      }
      if (mod === 'parties' || mod === 'constituencies' || mod === 'stations') {
        await loadSharedRefs();
      }
      if (mod === 'complaints') {
        const params = new URLSearchParams();
        if (compFilter) params.set('q', compFilter);
        if (compStatusFilter) params.set('status', compStatusFilter);
        const [cRes, oRes] = await Promise.all([
          apiFetch<{ complaints: ComplaintRecord[] }>(`/api/complaints?${params.toString()}`),
          apiFetch<{ officers: OfficerRow[] }>('/api/admin/officers'),
        ]);
        setComplaints(cRes.complaints);
        setOfficers(oRes.officers);
      }
      if (mod === 'calendar') {
        const res = await apiFetch<{ calendar: ElectionEvent[] }>('/api/public/overview');
        setElections(res.calendar);
      }
      if (mod === 'officers') {
        const res = await apiFetch<{ officers: OfficerRow[] }>('/api/admin/officers');
        setOfficers(res.officers);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load module data.');
    }
  };

  useEffect(() => {
    void loadModuleData(activeMod);
  }, [activeMod, userSearch, compFilter, compStatusFilter]);

  // Handlers
  const toggleUserActive = async (u: User) => {
    try {
      await apiFetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: u.is_active === 1 ? 0 : 1 }),
      });
      showToast('success', `Account ${u.is_active === 1 ? 'deactivated' : 'activated'}.`);
      await loadModuleData('users');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update user.');
    }
  };

  const updateVoterVerification = async (profileId: number, status: string) => {
    try {
      await apiFetch(`/api/admin/voter-profiles/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ verification_status: status }),
      });
      showToast('success', 'Voter profile verification status updated.');
      await loadModuleData('profiles');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const quickUpdateAppStatus = async (appId: number, status: string) => {
    try {
      await apiFetch(`/api/applications/${appId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, remarks: `Updated to ${status} by Administrator (${user?.full_name}).` }),
      });
      showToast('success', `Application updated to ${status}.`);
      await loadModuleData('applications');
      await loadAnalytics();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const saveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (candForm.id) {
        await apiFetch(`/api/admin/candidates/${candForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(candForm),
        });
        showToast('success', 'Candidate updated.');
      } else {
        await apiFetch('/api/admin/candidates', {
          method: 'POST',
          body: JSON.stringify({
            ...candForm,
            party_id: Number(candForm.party_id || parties[0]?.id),
            constituency_id: Number(candForm.constituency_id || constituencies[0]?.id),
          }),
        });
        showToast('success', 'Candidate created.');
      }
      setCandForm({
        id: 0,
        name: '',
        photo_url: '/src/assets/images/candidate_portrait_1_1795605887697.jpg',
        party_id: '',
        constituency_id: '',
        education: '',
        experience: '',
        manifesto: '',
        age: '40',
      });
      await loadModuleData('candidates');
      await loadAnalytics();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Candidate save failed.');
    }
  };

  const toggleCandidatePublish = async (c: Candidate) => {
    try {
      await apiFetch(`/api/admin/candidates/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: c.is_published === 1 ? 0 : 1 }),
      });
      showToast('success', `Candidate ${c.is_published === 1 ? 'unpublished' : 'published'}.`);
      await loadModuleData('candidates');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed.');
    }
  };

  const deleteCandidate = async (id: number) => {
    try {
      await apiFetch(`/api/admin/candidates/${id}`, { method: 'DELETE' });
      showToast('success', 'Candidate deleted.');
      await loadModuleData('candidates');
      await loadAnalytics();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const saveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (partyForm.id) {
        await apiFetch(`/api/admin/parties/${partyForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(partyForm),
        });
        showToast('success', 'Political party updated.');
      } else {
        await apiFetch('/api/admin/parties', { method: 'POST', body: JSON.stringify(partyForm) });
        showToast('success', 'Political party added.');
      }
      setPartyForm({
        id: 0,
        name: '',
        short_code: '',
        symbol_name: '',
        color_hex: '#1D4ED8',
        description: '',
        website: '',
        manifesto_summary: '',
      });
      await loadModuleData('parties');
      await loadAnalytics();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Party save failed.');
    }
  };

  const deleteParty = async (id: number) => {
    try {
      await apiFetch(`/api/admin/parties/${id}`, { method: 'DELETE' });
      showToast('success', 'Political party deleted.');
      await loadModuleData('parties');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const saveConstituency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/constituencies', { method: 'POST', body: JSON.stringify(constForm) });
      showToast('success', 'Constituency added.');
      setConstForm({ name: '', code: '', district: '', state: '' });
      await loadModuleData('constituencies');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add constituency.');
    }
  };

  const deleteConstituency = async (id: number) => {
    try {
      await apiFetch(`/api/admin/constituencies/${id}`, { method: 'DELETE' });
      showToast('success', 'Constituency deleted.');
      await loadModuleData('constituencies');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const saveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...stationForm,
        constituency_id: Number(stationForm.constituency_id || constituencies[0]?.id),
        latitude: Number(stationForm.latitude),
        longitude: Number(stationForm.longitude),
      };
      if (stationForm.id) {
        await apiFetch(`/api/admin/polling-stations/${stationForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('success', 'Polling station updated.');
      } else {
        await apiFetch('/api/admin/polling-stations', { method: 'POST', body: JSON.stringify(payload) });
        showToast('success', 'Polling station added.');
      }
      setStationForm({
        id: 0,
        name: '',
        address: '',
        pin_code: '',
        district: '',
        constituency_id: '',
        accessibility_facilities: 'Wheelchair Ramp, Tactile Path',
        available_facilities: 'Drinking Water, Help Desk',
        latitude: '13.0500',
        longitude: '80.2500',
      });
      await loadModuleData('stations');
      await loadAnalytics();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Station save failed.');
    }
  };

  const deleteStation = async (id: number) => {
    try {
      await apiFetch(`/api/admin/polling-stations/${id}`, { method: 'DELETE' });
      showToast('success', 'Polling station deleted.');
      await loadModuleData('stations');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const updateComplaintAdmin = async (c: ComplaintRecord) => {
    const entry = compReplyMap[c.id] || {
      status: c.status,
      response: c.officer_response,
      officerId: String(c.assigned_officer_id || ''),
    };
    try {
      await apiFetch(`/api/complaints/${c.id}/manage`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: entry.status,
          officer_response: entry.response,
          assigned_officer_id: entry.officerId ? Number(entry.officerId) : undefined,
        }),
      });
      showToast('success', `Complaint ${c.reference_number} updated.`);
      await loadModuleData('complaints');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const addCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/admin/elections', { method: 'POST', body: JSON.stringify(calForm) });
      showToast('success', 'Election calendar event added.');
      setCalForm({
        title: '',
        election_type: 'Notice',
        phase: 'Phase I',
        event_date: '2026-12-28',
        constituency: 'All Demo Constituencies',
        status: 'Scheduled',
        description: '',
        is_announcement: true,
      });
      await loadModuleData('calendar');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add event.');
    }
  };

  const broadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ message: string }>('/api/admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(notifForm),
      });
      showToast('success', res.message);
      setNotifForm({ target_role: 'voter', title: '', message: '' });
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Broadcast failed.');
    }
  };

  const createOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ message: string }>('/api/admin/officers', {
        method: 'POST',
        body: JSON.stringify(officerForm),
      });
      showToast('success', res.message);
      setOfficerForm({
        full_name: '',
        email: '',
        mobile: '',
        password: '',
        state: 'Tamil Nadu',
        district: 'Chennai',
        constituency: 'Chennai Central Demo',
        designation: 'Electoral Officer (Demo)',
      });
      await loadModuleData('officers');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to create officer.');
    }
  };

  const sidebarItems: Array<{ key: AdminModule; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'analytics', label: '01. Analytics & Overview', icon: BarChart3 },
    { key: 'users', label: '02. User Management', icon: Users },
    { key: 'profiles', label: '03. Voter Profiles', icon: UserCheck },
    { key: 'applications', label: '04. Applications', icon: ClipboardList },
    { key: 'candidates', label: '05. Candidates', icon: Users },
    { key: 'parties', label: '06. Political Parties', icon: Flag },
    { key: 'constituencies', label: '07. Constituencies', icon: Landmark },
    { key: 'stations', label: '08. Polling Stations', icon: MapPin },
    { key: 'complaints', label: '09. Complaints', icon: MessageSquareWarning },
    { key: 'calendar', label: '10. Election Calendar', icon: Calendar },
    { key: 'notifications', label: '11. Notifications', icon: Bell },
    { key: 'officers', label: '12. Officer Management', icon: UserCog },
    { key: 'security', label: '13. Security Monitoring', icon: ShieldAlert },
    { key: 'audit', label: '14. Audit Logs', icon: ScrollText },
    { key: 'reports', label: '15. Reports & Exports', icon: FileSpreadsheet },
  ];

  const st = analytics?.stats;

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
          <p className="text-xs font-semibold text-[#1D4ED8]">
            Administrator Console · {user?.full_name} ({user?.role.replace('_', ' ')})
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#0F2544]">{t(language, 'adminDashTitle')}</h1>
        </div>
        {user?.role === 'super_admin' && (
          <button
            type="button"
            onClick={() => navigate('super-admin-dashboard')}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white hover:bg-[#16345E]"
          >
            <Settings className="h-4 w-4 text-amber-400" />
            <span>Open Super Admin Controls</span>
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sidebar Navigation for 15 Modules */}
        <aside className="lg:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <nav className="grid grid-cols-2 gap-1 lg:grid-cols-1" aria-label="Admin Modules">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const active = activeMod === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveMod(item.key)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap transition-colors ${
                      active ? 'bg-[#0F2544] text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
              {user?.role === 'super_admin' && (
                <button
                  type="button"
                  onClick={() => navigate('super-admin-dashboard')}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50"
                >
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">16. System Settings (Super Admin)</span>
                </button>
              )}
            </nav>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="lg:col-span-9 space-y-6">
          {/* 01. ANALYTICS & CHARTS */}
          {activeMod === 'analytics' && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  ['Total Demo Users', st?.totalDemoUsers ?? 0],
                  ['Total Applications', st?.totalApplications ?? 0],
                  ['Pending Applications', st?.pendingApplications ?? 0],
                  ['Approved Applications', st?.approvedApplications ?? 0],
                  ['Total Candidates', st?.totalCandidates ?? 0],
                  ['Political Parties', st?.totalPoliticalParties ?? 0],
                  ['Polling Stations', st?.totalPollingStations ?? 0],
                  ['Open Complaints', st?.openComplaints ?? 0],
                  ['Security Alerts', st?.securityAlerts ?? 0],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[11px] font-medium text-slate-500">{label}</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">{val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <TrendColumnChart
                  title="Application Trends"
                  subtitle="Submissions grouped by date"
                  data={analytics?.charts.applicationTrends || []}
                  barColor="#1D4ED8"
                />
                <DonutDistributionChart
                  title="Application Status Distribution"
                  subtitle="Live status breakdown across all records"
                  data={analytics?.charts.applicationStatusDistribution || []}
                />
                <HorizontalBarChart
                  title="Complaint Trends by Category"
                  subtitle="Citizen grievances grouped by category"
                  data={analytics?.charts.complaintTrends || []}
                  accentColor="#D97706"
                />
                <HorizontalBarChart
                  title="User Registration Trends by Role"
                  subtitle="Accounts stored in SQLite database"
                  data={analytics?.charts.userRegistrationTrends || []}
                  accentColor="#0F2544"
                />
                <DonutDistributionChart
                  title="Verification Outcomes (Simulated)"
                  subtitle="Results from verification demonstration"
                  data={analytics?.charts.verificationOutcomes || []}
                />
                <HorizontalBarChart
                  title="Security Event Trends"
                  subtitle="Monitored anti-fraud & access events"
                  data={analytics?.charts.securityEventTrends || []}
                  accentColor="#DC2626"
                />
              </div>
            </>
          )}

          {/* 02. USER MANAGEMENT */}
          {activeMod === 'users' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-[#0F2544]">User Management</h2>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name, email, district..."
                  className="h-9 rounded-lg border border-slate-300 px-3 text-xs"
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3">Name & Email</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">District / Constituency</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 pl-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr key={u.id}>
                        <td className="py-2.5 pr-3">
                          <div className="font-semibold text-slate-900">{u.full_name}</div>
                          <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold uppercase text-[#1D4ED8]">{u.role}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {u.district} · {u.constituency}
                        </td>
                        <td className="py-2.5 px-3 font-semibold">
                          {u.is_active === 1 ? 'Active' : 'Deactivated'}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            type="button"
                            onClick={() => void toggleUserActive(u)}
                            className="h-8 rounded border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
          )}

          {/* 03. VOTER PROFILE MANAGEMENT */}
          {activeMod === 'profiles' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-display text-lg font-bold text-[#0F2544]">Voter Profile Management</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3">Demo Ref</th>
                      <th className="py-2 px-3">Voter</th>
                      <th className="py-2 px-3">Polling Station</th>
                      <th className="py-2 px-3">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profilesList.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-3 font-mono font-semibold text-[#1D4ED8]">{p.demo_ref_number}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{p.full_name}</div>
                          <div className="text-[11px] text-slate-500">{p.constituency}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{p.polling_station_name || 'Unassigned'}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={p.verification_status}
                            onChange={(e) => void updateVoterVerification(p.id, e.target.value)}
                            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Demo Verified">Demo Verified</option>
                            <option value="Manual Review Required">Manual Review Required</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 04. APPLICATION MANAGEMENT */}
          {activeMod === 'applications' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-display text-lg font-bold text-[#0F2544]">All Applications ({applications.length})</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-3">Reference</th>
                      <th className="py-2 px-3">Applicant & Category</th>
                      <th className="py-2 px-3">Constituency</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applications.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2.5 pr-3 font-mono font-bold text-[#1D4ED8]">{a.reference_number}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{a.applicant_name}</div>
                          <div className="text-[11px] text-slate-500">{a.category}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{a.constituency}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={a.status}
                            onChange={(e) => void quickUpdateAppStatus(a.id, e.target.value)}
                            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                          >
                            <option value="Submitted" disabled>
                              Submitted
                            </option>
                            <option value="Under Review">Under Review</option>
                            <option value="Action Required">Action Required</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 05. CANDIDATE MANAGEMENT */}
          {activeMod === 'candidates' && (
            <div className="space-y-5">
              <form onSubmit={saveCandidate} className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
                  <Plus className="h-4 w-4 text-[#1D4ED8]" />
                  <span>{candForm.id ? 'Edit Candidate' : 'Add New Candidate'}</span>
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    required
                    placeholder="Candidate Name"
                    value={candForm.name}
                    onChange={(e) => setCandForm({ ...candForm, name: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <select
                    value={candForm.party_id || parties[0]?.id || ''}
                    onChange={(e) => setCandForm({ ...candForm, party_id: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={candForm.constituency_id || constituencies[0]?.id || ''}
                    onChange={(e) => setCandForm({ ...candForm, constituency_id: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"
                  >
                    {constituencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={candForm.photo_url}
                    onChange={(e) => setCandForm({ ...candForm, photo_url: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"
                  >
                    <option value="/src/assets/images/candidate_portrait_1_1795605887697.jpg">Portrait Asset 1</option>
                    <option value="/src/assets/images/candidate_portrait_2_1795605887721.jpg">Portrait Asset 2</option>
                    <option value="/src/assets/images/candidate_portrait_3_1795605888220.jpg">Portrait Asset 3</option>
                  </select>
                  <input
                    required
                    placeholder="Education"
                    value={candForm.education}
                    onChange={(e) => setCandForm({ ...candForm, education: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    type="number"
                    placeholder="Age"
                    value={candForm.age}
                    onChange={(e) => setCandForm({ ...candForm, age: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    placeholder="Civic Experience"
                    value={candForm.experience}
                    onChange={(e) => setCandForm({ ...candForm, experience: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-2"
                  />
                  <textarea
                    required
                    rows={2}
                    placeholder="Neutral Manifesto Summary"
                    value={candForm.manifesto}
                    onChange={(e) => setCandForm({ ...candForm, manifesto: e.target.value })}
                    className="rounded-lg border border-slate-300 p-2.5 text-xs sm:col-span-2"
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="submit" className="h-9 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white">
                    {candForm.id ? 'Update Candidate' : 'Create Candidate'}
                  </button>
                  {candForm.id > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCandForm({
                          id: 0,
                          name: '',
                          photo_url: '/src/assets/images/candidate_portrait_1_1795605887697.jpg',
                          party_id: '',
                          constituency_id: '',
                          education: '',
                          experience: '',
                          manifesto: '',
                          age: '40',
                        })
                      }
                      className="h-9 rounded-lg border border-slate-300 px-3 text-xs"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-display text-base font-bold text-[#0F2544]">
                  Candidate Directory ({candidates.length})
                </h3>
                <div className="mt-3 divide-y divide-slate-100">
                  {candidates.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img src={c.photo_url} alt={c.name} className="h-10 w-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="text-slate-500">
                            {c.party_name} · {c.constituency_name} · {c.is_published ? 'Published' : 'Unpublished'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setCandForm({
                              id: c.id,
                              name: c.name,
                              photo_url: c.photo_url,
                              party_id: String(c.party_id),
                              constituency_id: String(c.constituency_id),
                              education: c.education,
                              experience: c.experience,
                              manifesto: c.manifesto,
                              age: String(c.age),
                            })
                          }
                          className="h-8 rounded border border-slate-300 px-2.5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleCandidatePublish(c)}
                          className="h-8 rounded border border-slate-300 px-2.5"
                        >
                          {c.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteCandidate(c.id)}
                          aria-label={`Delete ${c.name}`}
                          className="h-8 rounded border border-red-200 px-2 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 06. POLITICAL PARTY MANAGEMENT */}
          {activeMod === 'parties' && (
            <div className="space-y-5">
              <form onSubmit={saveParty} className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-display text-lg font-bold text-[#0F2544]">
                  {partyForm.id ? 'Edit Political Party' : 'Add Political Party'}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    required
                    placeholder="Party Name"
                    value={partyForm.name}
                    onChange={(e) => setPartyForm({ ...partyForm, name: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    placeholder="Short Code (e.g. CPA)"
                    value={partyForm.short_code}
                    onChange={(e) => setPartyForm({ ...partyForm, short_code: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs uppercase"
                  />
                  <input
                    required
                    placeholder="Symbol Name"
                    value={partyForm.symbol_name}
                    onChange={(e) => setPartyForm({ ...partyForm, symbol_name: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    placeholder="Website URL"
                    value={partyForm.website}
                    onChange={(e) => setPartyForm({ ...partyForm, website: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-2"
                  />
                  <input
                    type="color"
                    value={partyForm.color_hex}
                    onChange={(e) => setPartyForm({ ...partyForm, color_hex: e.target.value })}
                    aria-label="Party Color"
                    className="h-10 w-full rounded-lg border border-slate-300 p-1"
                  />
                  <input
                    required
                    placeholder="Party Description"
                    value={partyForm.description}
                    onChange={(e) => setPartyForm({ ...partyForm, description: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-3"
                  />
                  <input
                    placeholder="Manifesto Summary"
                    value={partyForm.manifesto_summary}
                    onChange={(e) => setPartyForm({ ...partyForm, manifesto_summary: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-3"
                  />
                </div>
                <button type="submit" className="mt-3 h-9 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white">
                  {partyForm.id ? 'Update Party' : 'Add Party'}
                </button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-white p-5 divide-y divide-slate-100">
                {parties.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img src={p.logo_url} alt={p.name} className="h-10 w-10 rounded-lg" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {p.name} ({p.short_code})
                        </p>
                        <p className="text-slate-500">
                          Symbol: {p.symbol_name} · Candidates: {p.candidates?.length ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPartyForm({
                            id: p.id,
                            name: p.name,
                            short_code: p.short_code,
                            symbol_name: p.symbol_name,
                            color_hex: p.color_hex,
                            description: p.description,
                            website: p.website,
                            manifesto_summary: p.manifesto_summary,
                          })
                        }
                        className="h-8 rounded border border-slate-300 px-2.5"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteParty(p.id)}
                        className="h-8 rounded border border-red-200 px-2 text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 07. CONSTITUENCY MANAGEMENT */}
          {activeMod === 'constituencies' && (
            <div className="space-y-5">
              <form onSubmit={saveConstituency} className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-display text-lg font-bold text-[#0F2544]">Add Constituency</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <input
                    required
                    placeholder="Constituency Name"
                    value={constForm.name}
                    onChange={(e) => setConstForm({ ...constForm, name: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    placeholder="Code (DEMO-XX-06)"
                    value={constForm.code}
                    onChange={(e) => setConstForm({ ...constForm, code: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 font-mono text-xs uppercase"
                  />
                  <input
                    required
                    placeholder="District"
                    value={constForm.district}
                    onChange={(e) => setConstForm({ ...constForm, district: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    placeholder="State"
                    value={constForm.state}
                    onChange={(e) => setConstForm({ ...constForm, state: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                </div>
                <button type="submit" className="mt-3 h-9 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white">
                  Add Constituency
                </button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-white p-5 divide-y divide-slate-100">
                {constituencies.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-3 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {c.name} (<span className="font-mono">{c.code}</span>)
                      </p>
                      <p className="text-slate-500">
                        {c.district}, {c.state}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteConstituency(c.id)}
                      className="h-8 rounded border border-red-200 px-2 text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 08. POLLING STATION MANAGEMENT */}
          {activeMod === 'stations' && (
            <div className="space-y-5">
              <form onSubmit={saveStation} className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-display text-lg font-bold text-[#0F2544]">
                  {stationForm.id ? 'Edit Polling Station' : 'Add Polling Station'}
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    required
                    placeholder="Station Name"
                    value={stationForm.name}
                    onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    placeholder="Street Address"
                    value={stationForm.address}
                    onChange={(e) => setStationForm({ ...stationForm, address: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-2"
                  />
                  <input
                    required
                    placeholder="PIN Code"
                    value={stationForm.pin_code}
                    onChange={(e) => setStationForm({ ...stationForm, pin_code: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 font-mono text-xs"
                  />
                  <input
                    required
                    placeholder="District"
                    value={stationForm.district}
                    onChange={(e) => setStationForm({ ...stationForm, district: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <select
                    value={stationForm.constituency_id || constituencies[0]?.id || ''}
                    onChange={(e) => setStationForm({ ...stationForm, constituency_id: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"
                  >
                    {constituencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Accessibility Facilities"
                    value={stationForm.accessibility_facilities}
                    onChange={(e) => setStationForm({ ...stationForm, accessibility_facilities: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-2"
                  />
                  <input
                    placeholder="Available Facilities"
                    value={stationForm.available_facilities}
                    onChange={(e) => setStationForm({ ...stationForm, available_facilities: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                </div>
                <button type="submit" className="mt-3 h-9 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white">
                  {stationForm.id ? 'Update Polling Station' : 'Add Polling Station'}
                </button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-white p-5 divide-y divide-slate-100">
                {stations.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                    <div>
                      <p className="font-mono font-bold text-[#1D4ED8]">
                        {s.station_code} · PIN {s.pin_code}
                        {s.booth_number ? ` · ${s.booth_number}` : ''}
                        {s.location_type ? ` (${s.location_type})` : ''}
                      </p>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-slate-500">
                        {s.address}, {s.district} → {s.constituency_name}
                        {s.polling_area ? ` → ${s.polling_area}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setStationForm({
                            id: s.id,
                            name: s.name,
                            address: s.address,
                            pin_code: s.pin_code,
                            district: s.district,
                            constituency_id: String(s.constituency_id),
                            accessibility_facilities: s.accessibility_facilities,
                            available_facilities: s.available_facilities,
                            latitude: String(s.latitude),
                            longitude: String(s.longitude),
                          })
                        }
                        className="h-8 rounded border border-slate-300 px-2.5"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteStation(s.id)}
                        className="h-8 rounded border border-red-200 px-2 text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 09. COMPLAINT MANAGEMENT */}
          {activeMod === 'complaints' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-[#0F2544]">Complaint Management</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={compFilter}
                    onChange={(e) => setCompFilter(e.target.value)}
                    placeholder="Search reference or subject..."
                    className="h-9 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <select
                    value={compStatusFilter}
                    onChange={(e) => setCompStatusFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
                  >
                    <option value="">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {complaints.map((c) => {
                  const state = compReplyMap[c.id] || {
                    status: c.status,
                    response: c.officer_response || '',
                    officerId: String(c.assigned_officer_id || ''),
                  };
                  return (
                    <div key={c.id} className="rounded-xl border border-slate-200 p-4 text-xs">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-mono font-bold text-[#1D4ED8]">{c.reference_number}</span>
                        <span className="font-semibold text-slate-700">
                          {c.category} · Complainant: {c.complainant_name}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-900">{c.subject}</p>
                      <p className="mt-0.5 text-slate-600">{c.description}</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-12">
                        <select
                          value={state.officerId}
                          onChange={(e) =>
                            setCompReplyMap({ ...compReplyMap, [c.id]: { ...state, officerId: e.target.value } })
                          }
                          className="h-9 rounded border border-slate-300 bg-white px-2 sm:col-span-3"
                        >
                          <option value="">Assign Officer</option>
                          {officers.map((o) => (
                            <option key={o.user_id} value={o.user_id}>
                              {o.full_name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={state.status}
                          onChange={(e) =>
                            setCompReplyMap({ ...compReplyMap, [c.id]: { ...state, status: e.target.value } })
                          }
                          className="h-9 rounded border border-slate-300 bg-white px-2 sm:col-span-2"
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="Assigned">Assigned</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                        <input
                          type="text"
                          value={state.response}
                          onChange={(e) =>
                            setCompReplyMap({ ...compReplyMap, [c.id]: { ...state, response: e.target.value } })
                          }
                          placeholder="Officer response..."
                          className="h-9 rounded border border-slate-300 px-2.5 sm:col-span-5"
                        />
                        <button
                          type="button"
                          onClick={() => void updateComplaintAdmin(c)}
                          className="h-9 rounded bg-[#0F2544] font-semibold text-white sm:col-span-2"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10. ELECTION CALENDAR */}
          {activeMod === 'calendar' && (
            <div className="space-y-5">
              <form onSubmit={addCalendarEvent} className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-display text-lg font-bold text-[#0F2544]">Add Election Calendar Notice</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    required
                    placeholder="Event Title"
                    value={calForm.title}
                    onChange={(e) => setCalForm({ ...calForm, title: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-2"
                  />
                  <input
                    type="date"
                    required
                    value={calForm.event_date}
                    onChange={(e) => setCalForm({ ...calForm, event_date: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 font-mono text-xs"
                  />
                  <input
                    placeholder="Constituency"
                    value={calForm.constituency}
                    onChange={(e) => setCalForm({ ...calForm, constituency: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    placeholder="Type (Roll Revision / Notice)"
                    value={calForm.election_type}
                    onChange={(e) => setCalForm({ ...calForm, election_type: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <select
                    value={calForm.status}
                    onChange={(e) => setCalForm({ ...calForm, status: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <input
                    required
                    placeholder="Description"
                    value={calForm.description}
                    onChange={(e) => setCalForm({ ...calForm, description: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs sm:col-span-3"
                  />
                </div>
                <button type="submit" className="mt-3 h-9 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white">
                  Add Calendar Entry
                </button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-white p-5 divide-y divide-slate-100">
                {elections.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-3 py-3 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{ev.title}</p>
                      <p className="text-slate-500">
                        {ev.event_date} · {ev.constituency} · {ev.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/elections/${ev.id}`, { method: 'DELETE' });
                        showToast('success', 'Calendar entry deleted.');
                        await loadModuleData('calendar');
                      }}
                      className="h-8 rounded border border-red-200 px-2 text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. NOTIFICATION MANAGEMENT */}
          {activeMod === 'notifications' && (
            <form onSubmit={broadcastNotification} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3.5">
              <h2 className="font-display text-lg font-bold text-[#0F2544]">Broadcast Portal Notification</h2>
              <p className="text-xs text-slate-500">
                Sends an in-app notification saved in the database to all active accounts of the selected role.
              </p>
              <select
                value={notifForm.target_role}
                onChange={(e) => setNotifForm({ ...notifForm, target_role: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="voter">All Active Voters</option>
                <option value="officer">All Election Officers</option>
                <option value="all">All Demonstration Users</option>
              </select>
              <input
                required
                placeholder="Notification Title"
                value={notifForm.title}
                onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
              <textarea
                required
                rows={3}
                placeholder="Notification message..."
                value={notifForm.message}
                onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm"
              />
              <button type="submit" className="h-10 rounded-lg bg-[#1D4ED8] px-5 text-xs font-semibold text-white">
                Send Notification Broadcast
              </button>
            </form>
          )}

          {/* 12. OFFICER MANAGEMENT */}
          {activeMod === 'officers' && (
            <div className="space-y-5">
              <form onSubmit={createOfficer} className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="font-display text-lg font-bold text-[#0F2544]">Create Election Officer Account</h2>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    required
                    placeholder="Officer Full Name"
                    value={officerForm.full_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, full_name: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email (e.g. officer6@demo.edu)"
                    value={officerForm.email}
                    onChange={(e) => setOfficerForm({ ...officerForm, email: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    placeholder="Test Mobile (10 digits)"
                    value={officerForm.mobile}
                    onChange={(e) => setOfficerForm({ ...officerForm, mobile: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 font-mono text-xs"
                  />
                  <input
                    required
                    type="password"
                    minLength={8}
                    placeholder="Password (min 8 chars)"
                    value={officerForm.password}
                    onChange={(e) => setOfficerForm({ ...officerForm, password: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    placeholder="Assigned District"
                    value={officerForm.district}
                    onChange={(e) => setOfficerForm({ ...officerForm, district: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                  <input
                    required
                    placeholder="Designation"
                    value={officerForm.designation}
                    onChange={(e) => setOfficerForm({ ...officerForm, designation: e.target.value })}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-xs"
                  />
                </div>
                <button type="submit" className="mt-3 h-9 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white">
                  Create Officer Account
                </button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-white p-5 divide-y divide-slate-100">
                {officers.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-3 text-xs">
                    <div>
                      <p className="font-mono font-bold text-[#1D4ED8]">{o.officer_code}</p>
                      <p className="font-semibold text-slate-900">
                        {o.full_name} ({o.email})
                      </p>
                      <p className="text-slate-500">
                        {o.designation} · {o.assigned_district} ({o.assigned_constituency})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/admin/officers/${o.id}`, { method: 'DELETE' });
                        showToast('success', 'Officer removed.');
                        await loadModuleData('officers');
                      }}
                      className="h-8 rounded border border-red-200 px-2 text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. SECURITY MONITORING */}
          {activeMod === 'security' && <SecurityMonitoringPanel />}

          {/* 14. AUDIT LOGS */}
          {activeMod === 'audit' && <AuditLogsPanel />}

          {/* 15. REPORTS */}
          {activeMod === 'reports' && <ReportsPanel />}
        </main>
      </div>
    </div>
  );
}
