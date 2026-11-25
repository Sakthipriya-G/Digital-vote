import React, { useEffect, useState } from 'react';
import { ArrowUpDown, Download, FileSpreadsheet, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiFetch, downloadReportPdf } from '../../utils/api';

const REPORT_TYPES = [
  { key: 'user-registrations', label: 'Demo User Registration Report' },
  { key: 'application-status', label: 'Application Status Report' },
  { key: 'application-processing', label: 'Application Processing Report' },
  { key: 'candidate-directory', label: 'Candidate Directory Report' },
  { key: 'polling-stations', label: 'Polling Station Report' },
  { key: 'complaints', label: 'Complaint Report' },
  { key: 'security-events', label: 'Security Event Report' },
  { key: 'verification-outcomes', label: 'Verification Outcome Report' },
];

export function ReportsPanel() {
  const { showToast } = useApp();
  const [reportType, setReportType] = useState(REPORT_TYPES[0].key);
  const [q, setQ] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        from: fromDate,
        to: toDate,
        sortDir,
        page: String(page),
        limit: '10',
      });
      const res = await apiFetch<{
        rows: Array<Record<string, unknown>>;
        allRowsCount: number;
        totalPages: number;
      }>(`/api/admin/reports/${reportType}?${params.toString()}`);
      setRows(res.rows);
      setTotalCount(res.allRowsCount);
      setTotalPages(res.totalPages);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [reportType, q, fromDate, toDate, sortDir, page]);

  const handleExportCsv = () => {
    const params = new URLSearchParams({ q: q.trim(), from: fromDate, to: toDate, sortDir });
    window.open(`/api/admin/reports/${reportType}/csv?${params.toString()}`, '_self');
    showToast('success', 'CSV report download started.');
  };

  const handleExportPdf = async () => {
    try {
      const params = new URLSearchParams({ q: q.trim(), from: fromDate, to: toDate, sortDir, page: '1', limit: '100' });
      const res = await apiFetch<{ rows: Array<Record<string, unknown>> }>(
        `/api/admin/reports/${reportType}?${params.toString()}`
      );
      const label = REPORT_TYPES.find((r) => r.key === reportType)?.label || reportType;
      downloadReportPdf(label, res.rows);
      showToast('success', 'PDF report exported.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'PDF export failed.');
    }
  };

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <FileSpreadsheet className="h-5 w-5 text-[#1D4ED8]" />
              <span>Administrative Reports & Exports</span>
            </h2>
            <p className="text-xs text-slate-500">
              Filter, sort, paginate, and export authorized demonstration reports as CSV or PDF.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F2544] px-3.5 text-xs font-semibold text-white hover:bg-[#16345E]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium"
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="relative md:col-span-3">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search report..."
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              aria-label="From date"
              className="h-10 w-full rounded-lg border border-slate-300 px-2.5 font-mono text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              aria-label="To date"
              className="h-10 w-full rounded-lg border border-slate-300 px-2.5 font-mono text-xs"
            />
          </div>
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              title="Toggle date sort order"
              className="flex h-10 w-full items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{sortDir.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <p className="py-8 text-center text-xs text-slate-500">Generating report...</p>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">No matching demonstration records found.</p>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  {columns.map((c) => (
                    <th key={c} className="py-2.5 px-3 font-semibold capitalize whitespace-nowrap">
                      {c.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {columns.map((c) => (
                      <td key={c} className="max-w-[220px] truncate py-2.5 px-3 text-slate-800">
                        {String(row[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-600">
          <span className="font-mono tabular-nums">
            Total matching records: {totalCount} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 rounded border border-slate-300 px-3 font-medium disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 rounded border border-slate-300 px-3 font-medium disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
