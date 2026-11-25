import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, CheckCircle2, ClipboardCheck, MessageSquareWarning, ScanFace, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import type {
  ApplicationRecord,
  ComplaintRecord,
  HistoryEntry,
  NotificationItem,
  SecurityEvent,
  VerificationRecord,
} from '../types';
import { apiFetch } from '../utils/api';

interface OfficerDashData {
  counts: {
    assignedApplications: number;
    pendingReviews: number;
    approvedApplications: number;
    rejectedApplications: number;
    assignedComplaints: number;
    pendingComplaints: number;
  };
  pendingManualReviews: VerificationRecord[];
}

export function OfficerDashboardPage() {
  const { user, language, setRoute, showToast } = useApp();
  const [tab, setTab] = useState<'applications' | 'complaints' | 'verifications' | 'security' | 'notifications'>('applications');
  const [dash, setDash] = useState<OfficerDashData | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [secEvents, setSecEvents] = useState<SecurityEvent[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Active review modal/panel state
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [selectedAppHistory, setSelectedAppHistory] = useState<HistoryEntry[]>([]);
  const [appStatus, setAppStatus] = useState('Approved');
  const [appRemarks, setAppRemarks] = useState('');

  const [selectedComp, setSelectedComp] = useState<ComplaintRecord | null>(null);
  const [compStatus, setCompStatus] = useState('In Progress');
  const [compResponse, setCompResponse] = useState('');

  const loadAll = async () => {
    try {
      const [dRes, aRes, cRes, sRes, nRes] = await Promise.all([
        apiFetch<OfficerDashData>('/api/officer/dashboard'),
        apiFetch<{ applications: ApplicationRecord[] }>('/api/applications'),
        apiFetch<{ complaints: ComplaintRecord[] }>('/api/complaints'),
        apiFetch<{ events: SecurityEvent[] }>('/api/security/events'),
        apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
      ]);
      setDash(dRes);
      setApplications(aRes.applications);
      setComplaints(cRes.complaints);
      setSecEvents(sRes.events);
      setNotifications(nRes.notifications);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to load officer workspace.');
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const openAppReview = async (app: ApplicationRecord) => {
    setSelectedApp(app);
    setAppStatus(app.status === 'Submitted' ? 'Under Review' : 'Approved');
    setAppRemarks('');
    try {
      const res = await apiFetch<{ history: HistoryEntry[] }>(`/api/applications/${app.id}`);
      setSelectedAppHistory(res.history);
    } catch {
      setSelectedAppHistory([]);
    }
  };

  const submitAppReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    try {
      const res = await apiFetch<{ message: string }>(`/api/applications/${selectedApp.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status: appStatus, remarks: appRemarks }),
      });
      showToast('success', res.message);
      setSelectedApp(null);
      await loadAll();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update application.');
    }
  };

  const submitCompUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;
    try {
      const res = await apiFetch<{ message: string }>(`/api/complaints/${selectedComp.id}/manage`, {
        method: 'PATCH',
        body: JSON.stringify({ status: compStatus, officer_response: compResponse }),
      });
      showToast('success', res.message);
      setSelectedComp(null);
      await loadAll();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update complaint.');
    }
  };

  const resolveManualVerification = async (id: number, decision: 'Approved' | 'Rejected') => {
    try {
      const res = await apiFetch<{ message: string }>(`/api/verification/${id}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          remarks: `Manual officer review completed (${decision}) by ${user?.full_name}.`,
        }),
      });
      showToast('success', res.message);
      await loadAll();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to resolve review.');
    }
  };

  const updateSecurityEvent = async (id: number, status: string) => {
    try {
      const res = await apiFetch<{ message: string }>(`/api/security/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          officer_remarks: `Reviewed by ${user?.full_name} — marked ${status}.`,
        }),
      });
      showToast('success', res.message);
      await loadAll();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update security event.');
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-5">
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
          Constituency Officer Workspace · {user?.district} ({user?.constituency})
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-[#0F2544]">{t(language, 'officerDashTitle')}</h1>
      </div>

      {/* 6 KPI Cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Assigned Applications</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">
            {dash?.counts.assignedApplications ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Pending Reviews</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-amber-600">
            {dash?.counts.pendingReviews ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Approved</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-emerald-700">
            {dash?.counts.approvedApplications ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Rejected</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-red-700">
            {dash?.counts.rejectedApplications ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Assigned Complaints</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">
            {dash?.counts.assignedComplaints ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Pending Complaints</p>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#1D4ED8]">
            {dash?.counts.pendingComplaints ?? 0}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        {(
          [
            ['applications', 'Applications Queue'],
            ['complaints', 'Complaints Queue'],
            ['verifications', `Manual Verification (${dash?.pendingManualReviews.length ?? 0})`],
            ['security', 'Security Events'],
            ['notifications', 'Notifications'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === k ? 'bg-white text-[#0F2544] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB: APPLICATIONS */}
      {tab === 'applications' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <ClipboardCheck className="h-5 w-5 text-[#1D4ED8]" />
              <span>Authorized Application Queue</span>
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {applications.map((app) => (
                <div key={app.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-[#1D4ED8]">{app.reference_number}</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {app.applicant_name} · {app.category}
                    </p>
                    <p className="text-xs text-slate-500">
                      {app.district} · {app.constituency} · Status: <strong>{app.status}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openAppReview(app)}
                    className="h-9 rounded-lg bg-[#0F2544] px-3.5 text-xs font-semibold text-white hover:bg-[#16345E]"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
            {selectedApp ? (
              <div>
                <h3 className="font-display text-lg font-bold text-[#0F2544]">
                  Review {selectedApp.reference_number}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  {selectedApp.applicant_name} ({selectedApp.email}) · {selectedApp.category}
                </p>
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  {selectedApp.description}
                </p>

                <form onSubmit={submitAppReview} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Update Status</label>
                    <select
                      value={appStatus}
                      onChange={(e) => setAppStatus(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                    >
                      <option value="Under Review">Under Review</option>
                      <option value="Action Required">Request Additional Info (Action Required)</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Officer Remarks</label>
                    <textarea
                      required
                      minLength={4}
                      rows={3}
                      value={appRemarks}
                      onChange={(e) => setAppRemarks(e.target.value)}
                      placeholder="Enter clear decision remarks for the citizen..."
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-10 w-full rounded-lg bg-[#1D4ED8] text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Save Decision & Notify Applicant
                  </button>
                </form>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-semibold text-slate-700">Audit History</h4>
                  <div className="mt-2 space-y-2">
                    {selectedAppHistory.map((h, i) => (
                      <div key={i} className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">{h.status}</span> · {h.remarks} (
                        {h.changed_by_name})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-slate-500">
                Select an application on the left to review details, inspect history, and record an officer decision.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: COMPLAINTS */}
      {tab === 'complaints' && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <MessageSquareWarning className="h-5 w-5 text-amber-600" />
              <span>Assigned Grievance Queue</span>
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {complaints.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="font-mono text-xs font-bold text-[#1D4ED8]">{c.reference_number}</p>
                    <p className="text-sm font-semibold text-slate-900">{c.subject}</p>
                    <p className="text-xs text-slate-500">
                      {c.complainant_name} · {c.category} · <strong>{c.status}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedComp(c);
                      setCompStatus(c.status === 'Submitted' ? 'In Progress' : 'Resolved');
                      setCompResponse(c.officer_response || '');
                    }}
                    className="h-9 rounded-lg bg-[#0F2544] px-3.5 text-xs font-semibold text-white"
                  >
                    Respond
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
            {selectedComp ? (
              <form onSubmit={submitCompUpdate} className="space-y-3.5">
                <h3 className="font-display text-lg font-bold text-[#0F2544]">
                  Manage {selectedComp.reference_number}
                </h3>
                <p className="text-xs text-slate-600">{selectedComp.description}</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={compStatus}
                    onChange={(e) => setCompStatus(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                  >
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Officer Response</label>
                  <textarea
                    required
                    rows={4}
                    value={compResponse}
                    onChange={(e) => setCompResponse(e.target.value)}
                    placeholder="Write a clear, helpful resolution message..."
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 w-full rounded-lg bg-[#1D4ED8] text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Update Complaint & Notify Citizen
                </button>
              </form>
            ) : (
              <div className="py-12 text-center text-sm text-slate-500">
                Select a complaint from the queue to update status and send an officer response.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: MANUAL VERIFICATION REVIEWS */}
      {tab === 'verifications' && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
            <ScanFace className="h-5 w-5 text-[#1D4ED8]" />
            <span>Pending Manual Verification Reviews (Simulated Demo)</span>
          </h2>
          {!dash?.pendingManualReviews.length ? (
            <p className="mt-6 text-center text-sm text-slate-500">No pending manual verification reviews.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-200">
              {dash.pendingManualReviews.map((vr) => (
                <div key={vr.id} className="flex flex-wrap items-center justify-between gap-4 py-4 text-xs">
                  <div>
                    <p className="font-mono font-bold text-[#1D4ED8]">{vr.verification_ref}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {vr.user_name} ({vr.user_email})
                    </p>
                    <p className="text-slate-600">
                      {vr.demo_profile_name} · Result: {vr.result}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void resolveManualVerification(vr.id, 'Approved')}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void resolveManualVerification(vr.id, 'Rejected')}
                      className="h-9 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-800 hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SECURITY EVENTS */}
      {tab === 'security' && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <span>Security Monitoring Events</span>
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {secEvents.map((ev) => (
              <div key={ev.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">
                    {ev.event_type} · <span className="font-mono text-[#1D4ED8]">{ev.status}</span>
                  </p>
                  <p className="mt-0.5 text-slate-600">{ev.description}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                    Actor: {ev.actor_email} · IP: {ev.ip_address}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void updateSecurityEvent(ev.id, 'Under Review')}
                    className="h-8 rounded border border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Mark Review
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateSecurityEvent(ev.id, 'Cleared')}
                    className="h-8 rounded bg-emerald-700 px-2.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
            <Bell className="h-5 w-5 text-[#1D4ED8]" />
            <span>Officer Notifications</span>
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className="py-3 text-xs">
                <p className="font-semibold text-slate-900">{n.title}</p>
                <p className="mt-0.5 text-slate-600">{n.message}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-400">
                  {n.created_at.slice(0, 19).replace('T', ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
