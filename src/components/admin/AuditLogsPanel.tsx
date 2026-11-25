import React, { useCallback, useEffect, useState } from 'react';
import { Download, Eye, RefreshCw, ScrollText, Search, ShieldCheck, UserCog, MapPin, Settings, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { AuditLog } from '../../types';
import { apiFetch } from '../../utils/api';

interface AuditSummary {
  totalLogs: number;
  roleChanges: number;
  stationUpdates: number;
  configUpdates: number;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  totalPages: number;
  summary: AuditSummary;
  resourceTypes: string[];
  actions: string[];
}

function getActionBadgeClass(action: string): string {
  if (action.includes('DELETED') || action.includes('UNAUTHORISED') || action.includes('BLOCKED')) {
    return 'border-red-200 bg-red-50 text-red-800';
  }
  if (action.includes('ROLE') || action.includes('SETTINGS') || action.includes('SYSTEM')) {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  if (action.includes('STATION') || action.includes('CONSTITUENCY')) {
    return 'border-blue-200 bg-blue-50 text-blue-800';
  }
  if (action.includes('CREATED') || action.includes('APPROVED') || action.includes('RESOLVED')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  return 'border-slate-200 bg-slate-100 text-slate-800';
}

export function AuditLogsPanel() {
  const { showToast } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<AuditSummary>({
    totalLogs: 0,
    roleChanges: 0,
    stationUpdates: 0,
    configUpdates: 0,
  });
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const buildQueryParams = useCallback(
    (includePaging: boolean) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (role) params.set('role', role);
      if (resourceType) params.set('resource_type', resourceType);
      if (action) params.set('action', action);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (includePaging) {
        params.set('page', String(page));
        params.set('limit', '15');
      }
      return params.toString();
    },
    [q, role, resourceType, action, fromDate, toDate, page]
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQueryParams(true);
      const res = await apiFetch<AuditResponse>(`/api/admin/audit-logs?${qs}`);
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      if (res.summary) setSummary(res.summary);
      if (res.resourceTypes) setResourceTypes(res.resourceTypes);
      if (res.actions) setActions(res.actions);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams, showToast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const resetFilters = () => {
    setQ('');
    setRole('');
    setResourceType('');
    setAction('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const exportCsv = () => {
    const qs = buildQueryParams(false);
    window.location.href = `/api/admin/audit-logs/csv${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-5">
      {/* 4 Audit Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Audit Events</p>
            <ScrollText className="h-4 w-4 text-[#1D4ED8]" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">{summary.totalLogs}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Role & Account Changes</p>
            <UserCog className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">{summary.roleChanges}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Station & Roll Updates</p>
            <MapPin className="h-4 w-4 text-[#1D4ED8]" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">{summary.stationUpdates}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">System Config Events</p>
            <Settings className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">{summary.configUpdates}</p>
        </div>
      </div>

      {/* Filter & Export Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <ShieldCheck className="h-5 w-5 text-[#1D4ED8]" />
              <span>System-Wide Audit Logs</span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Immutable trail of role modifications, polling station updates, configuration changes, and administrative actions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F2544] px-3.5 text-xs font-semibold text-white hover:bg-[#16345E] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => handleFilterChange(setQ, e.target.value)}
              placeholder="Search actor, email, action, or details..."
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-xs focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={role}
              onChange={(e) => handleFilterChange(setRole, e.target.value)}
              aria-label="Filter by actor role"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="officer">Election Officer</option>
              <option value="voter">Voter</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={resourceType}
              onChange={(e) => handleFilterChange(setResourceType, e.target.value)}
              aria-label="Filter by resource type"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
            >
              <option value="">All Resources</option>
              {resourceTypes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={action}
              onChange={(e) => handleFilterChange(setAction, e.target.value)}
              aria-label="Filter by action"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
            >
              <option value="">All Actions</option>
              {actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
              aria-label="From date"
              className="h-9 w-full rounded-lg border border-slate-300 px-2.5 font-mono text-xs"
            />
          </div>
          <div className="md:col-span-3">
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleFilterChange(setToDate, e.target.value)}
              aria-label="To date"
              className="h-9 w-full rounded-lg border border-slate-300 px-2.5 font-mono text-xs"
            />
          </div>
          <div className="flex items-center justify-between md:col-span-6">
            <span className="font-mono text-xs text-slate-500">
              {total} matching {total === 1 ? 'record' : 'records'}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <div className="space-y-2 py-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No audit log entries match the selected filters.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-3">Timestamp</th>
                  <th className="py-2.5 px-3">Actor Details</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 pl-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-3 font-mono text-[11px] whitespace-nowrap text-slate-600">
                      {l.created_at.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{l.actor_name || l.actor_email}</div>
                      <div className="font-mono text-[11px] text-slate-500">{l.actor_email}</div>
                      <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#1D4ED8]">
                        {l.actor_role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap ${getActionBadgeClass(
                          l.action
                        )}`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {l.resource_type}#{l.resource_id}
                    </td>
                    <td className="max-w-md py-2.5 px-3 text-slate-700">{l.details}</td>
                    <td className="py-2.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(l)}
                        aria-label={`Inspect audit entry ${l.id}`}
                        className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 px-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span className="font-mono">
            Page {page} of {totalPages} · {total} total events
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Audit Entry Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div>
                <p className="font-mono text-xs font-semibold text-[#1D4ED8]">AUDIT ENTRY #{selectedLog.id}</p>
                <h3 className="mt-0.5 font-display text-lg font-bold text-[#0F2544]">{selectedLog.action}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label="Close audit detail modal"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="font-semibold text-slate-500">Timestamp</dt>
                <dd className="font-mono text-slate-900">{selectedLog.created_at}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="font-semibold text-slate-500">Actor Name</dt>
                <dd className="font-semibold text-slate-900">{selectedLog.actor_name || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="font-semibold text-slate-500">Actor Email</dt>
                <dd className="font-mono text-slate-900">{selectedLog.actor_email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="font-semibold text-slate-500">Actor Role</dt>
                <dd className="font-mono uppercase text-[#1D4ED8]">{selectedLog.actor_role}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                <dt className="font-semibold text-slate-500">Target Resource</dt>
                <dd className="font-mono text-slate-900">
                  {selectedLog.resource_type}#{selectedLog.resource_id}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Full Change Details</dt>
                <dd className="mt-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-800">
                  {selectedLog.details}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="h-9 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white hover:bg-[#16345E]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
