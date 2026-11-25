import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { HorizontalBarChart, type ChartDatum } from '../Charts';
import { useApp } from '../../context/AppContext';
import type { DuplicateFlag, SecurityEvent } from '../../types';
import { apiFetch } from '../../utils/api';

interface SecurityOverview {
  stats: {
    totalVerificationAttempts: number;
    successfulDemoVerifications: number;
    failedDemoVerifications: number;
    duplicateRecordsFlagged: number;
    suspiciousActivityEvents: number;
    pendingManualReviews: number;
    resolvedSecurityCases: number;
  };
  byType: ChartDatum[];
  byStatus: ChartDatum[];
}

export function SecurityMonitoringPanel() {
  const { showToast } = useApp();
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateFlag[]>([]);

  const [q, setQ] = useState('');
  const [eventType, setEventType] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState('Under Review');
  const [editRemarks, setEditRemarks] = useState('');

  const loadSecurity = async () => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (eventType) params.set('event_type', eventType);
      if (dateFilter) params.set('date', dateFilter);

      const [ov, ev, dup] = await Promise.all([
        apiFetch<SecurityOverview>('/api/security/overview'),
        apiFetch<{ events: SecurityEvent[] }>(`/api/security/events?${params.toString()}`),
        apiFetch<{ duplicates: DuplicateFlag[] }>('/api/security/duplicates'),
      ]);
      setOverview(ov);
      setEvents(ev.events);
      setDuplicates(dup.duplicates);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to load security data.');
    }
  };

  useEffect(() => {
    void loadSecurity();
  }, [q, eventType, dateFilter]);

  const handleSaveEvent = async (id: number) => {
    try {
      const res = await apiFetch<{ message: string }>(`/api/security/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: editStatus, officer_remarks: editRemarks }),
      });
      showToast('success', res.message);
      setEditingId(null);
      await loadSecurity();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update security event.');
    }
  };

  const handleRunDuplicateScan = async () => {
    try {
      const res = await apiFetch<{ message: string }>('/api/security/duplicates/scan', { method: 'POST' });
      showToast('success', res.message);
      await loadSecurity();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Scan failed.');
    }
  };

  const handleReviewDuplicate = async (id: number, status: string) => {
    try {
      const res = await apiFetch<{ message: string }>(`/api/security/duplicates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          review_decision: `Reviewed in Security Console — marked ${status}.`,
        }),
      });
      showToast('success', res.message);
      await loadSecurity();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not update duplicate flag.');
    }
  };

  const s = overview?.stats;

  return (
    <div className="space-y-6">
      {/* 7 Security KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-medium text-slate-500">Verification Attempts</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#0F2544]">
            {s?.totalVerificationAttempts ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-medium text-slate-500">Successful Demo</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-700">
            {s?.successfulDemoVerifications ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-medium text-slate-500">Failed Demo</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-red-700">
            {s?.failedDemoVerifications ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-medium text-slate-500">Duplicates Flagged</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-amber-600">
            {s?.duplicateRecordsFlagged ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-medium text-slate-500">Suspicious Events</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#0F2544]">
            {s?.suspiciousActivityEvents ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-medium text-slate-500">Pending Reviews</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-[#1D4ED8]">
            {s?.pendingManualReviews ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <p className="text-[11px] font-medium text-slate-500">Resolved Cases</p>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-700">
            {s?.resolvedSecurityCases ?? 0}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <HorizontalBarChart
          title="Security Events by Type"
          subtitle="Live database counts across all 5 monitored event types"
          data={overview?.byType || []}
          accentColor="#0F2544"
        />
        <HorizontalBarChart
          title="Security Case Status Breakdown"
          subtitle="Flagged, Under Review, Cleared, and Escalated"
          data={overview?.byStatus || []}
          accentColor="#D97706"
        />
      </div>

      {/* Security Event Filters & Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <span>Security Events Log</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search actor or description..."
                className="h-9 rounded-lg border border-slate-300 pl-8 pr-3 text-xs"
              />
            </div>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
            >
              <option value="">All Event Types</option>
              <option value="Repeated Failed Login">Repeated Failed Login</option>
              <option value="Duplicate Demo Registration">Duplicate Demo Registration</option>
              <option value="Repeated Application Submission">Repeated Application Submission</option>
              <option value="Invalid Demo Token">Invalid Demo Token</option>
              <option value="Unauthorised Admin Access Attempt">Unauthorised Admin Access Attempt</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 px-2.5 font-mono text-xs"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-3">Event Type</th>
                <th className="py-2.5 px-3">Actor / IP</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 font-semibold text-slate-900">{ev.event_type}</td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    <div>{ev.actor_email}</div>
                    <div>{ev.ip_address}</div>
                  </td>
                  <td className="max-w-xs py-3 px-3 text-slate-700">
                    <div>{ev.description}</div>
                    {ev.officer_remarks && (
                      <div className="mt-1 text-[11px] text-[#1D4ED8]">Remarks: {ev.officer_remarks}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#0F2544]">{ev.status}</td>
                  <td className="py-3 pl-3 text-right">
                    {editingId === ev.id ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
                        >
                          <option value="Flagged">Flagged</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Cleared">Cleared</option>
                          <option value="Escalated">Escalated</option>
                        </select>
                        <input
                          type="text"
                          value={editRemarks}
                          onChange={(e) => setEditRemarks(e.target.value)}
                          placeholder="Officer remarks"
                          className="h-8 w-44 rounded border border-slate-300 px-2 text-xs"
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => void handleSaveEvent(ev.id)}
                            className="h-7 rounded bg-[#0F2544] px-2.5 text-[11px] font-semibold text-white"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="h-7 rounded border border-slate-300 px-2 text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(ev.id);
                          setEditStatus(ev.status);
                          setEditRemarks(ev.officer_remarks || '');
                        }}
                        className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-white"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anti-Fraud & Duplicate Detection Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#0F2544]">Anti-Fraud & Duplicate Detection</h3>
            <p className="text-xs text-slate-500">
              Detects duplicate demo references, repeated registrations, and repeated application submissions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleRunDuplicateScan()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Run Duplicate Scan</span>
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {duplicates.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
              <div>
                <p className="font-semibold text-slate-900">
                  {d.flag_type} · <span className="font-mono text-[#1D4ED8]">{d.entity_ref}</span>
                </p>
                <p className="mt-0.5 text-slate-600">{d.details}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Severity: {d.severity} · Status: <strong>{d.status}</strong>
                  {d.review_decision ? ` · ${d.review_decision}` : ''}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleReviewDuplicate(d.id, 'Cleared')}
                  className="h-8 rounded border border-emerald-300 bg-emerald-50 px-2.5 font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => void handleReviewDuplicate(d.id, 'Escalated')}
                  className="h-8 rounded border border-red-300 bg-red-50 px-2.5 font-semibold text-red-800 hover:bg-red-100"
                >
                  Escalate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
