import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, FilePlus2, FileSearch, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { translateStatus } from '../i18n/translations';
import type { ApplicationRecord, Constituency, HistoryEntry } from '../types';
import { apiFetch } from '../utils/api';

const APP_CATEGORIES = [
  'New Registration Demonstration',
  'Profile Correction',
  'Address Update',
  'Accessibility Assistance',
  'Document Assistance',
];

export function ApplicationsAndTrackingPage() {
  const { user, language, navigate, showToast } = useApp();
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);

  // Public Reference Tracker
  const [trackRef, setTrackRef] = useState('APP-DEMO-2026-1001');
  const [trackingResult, setTrackingResult] = useState<{
    application: ApplicationRecord;
    history: HistoryEntry[];
  } | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // Submit Application Form
  const [applicantName, setApplicantName] = useState(user?.full_name || '');
  const [category, setCategory] = useState(APP_CATEGORIES[0]);
  const [email, setEmail] = useState(user?.email || '');
  const [district, setDistrict] = useState(user?.district || 'Chennai');
  const [constituency, setConstituency] = useState(user?.constituency || 'Chennai Central Demo');
  const [description, setDescription] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submittedRef, setSubmittedRef] = useState('');

  useEffect(() => {
    apiFetch<{ constituencies: Constituency[] }>('/api/public/constituencies')
      .then((res) => setConstituencies(res.constituencies))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setApplicantName(user.full_name);
      setEmail(user.email);
      setDistrict(user.district);
      setConstituency(user.constituency);
    }
  }, [user]);

  const handleTrack = async (e?: React.FormEvent, overrideRef?: string) => {
    if (e) e.preventDefault();
    const targetRef = (overrideRef ?? trackRef).trim();
    if (!targetRef) return;
    setTrackError('');
    setTrackLoading(true);
    try {
      const res = await apiFetch<{ application: ApplicationRecord; history: HistoryEntry[] }>(
        `/api/public/track-application/${encodeURIComponent(targetRef)}`
      );
      setTrackingResult(res);
    } catch (err) {
      setTrackingResult(null);
      setTrackError(err instanceof Error ? err.message : 'Unable to find application.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('info', 'Please sign in to submit a demonstration application.');
      navigate('login');
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await apiFetch<{ application: ApplicationRecord; message: string; duplicateFlagged: boolean }>(
        '/api/applications',
        {
          method: 'POST',
          body: JSON.stringify({
            applicant_name: applicantName,
            category,
            email,
            district,
            constituency,
            description,
            document_name: documentName || 'demo_supporting_document.pdf',
          }),
        }
      );
      showToast(res.duplicateFlagged ? 'info' : 'success', res.message);
      setSubmittedRef(res.application.reference_number);
      setTrackRef(res.application.reference_number);
      setDescription('');
      setDocumentName('');
      await handleTrack(undefined, res.application.reference_number);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F2544]">
            Voter Services & Application Tracking
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Submit demonstration voter service applications or track any application reference number with full officer history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => navigate('verification')}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
          >
            <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" />
            <span>Face & QR Verification Demo</span>
          </button>
          {user && (
            <button
              type="button"
              onClick={() => navigate('voter-dashboard')}
              className="h-10 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white hover:bg-[#16345E]"
            >
              Go to My Dashboard
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Application Submission Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2 text-[#0F2544]">
            <FilePlus2 className="h-5 w-5 text-[#1D4ED8]" />
            <h2 className="font-display text-xl font-bold">Submit New Demonstration Application</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Creates a persistent database record, generates a unique reference ID, and notifies your constituency officer.
          </p>

          {!user && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-950">
              Sign in with any voter or demo account to submit applications.{' '}
              <button type="button" onClick={() => navigate('login')} className="font-semibold underline">
                Sign in now
              </button>
            </div>
          )}

          {submittedRef && (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <div>
                <p className="font-semibold">Application Saved in Database</p>
                <p className="mt-0.5">
                  Reference Number: <span className="font-mono font-bold">{submittedRef}</span>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Applicant Name</label>
              <input
                type="text"
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Full name"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voter@demo.edu"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Application Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {APP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">District</label>
              <input
                type="text"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Constituency (Demo)</label>
              <select
                value={constituency}
                onChange={(e) => setConstituency(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {constituencies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Supporting Demonstration Document (Filename / Label)
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g., demo_utility_bill_sample.pdf"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Application Description</label>
              <textarea
                required
                minLength={10}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your demonstration service request (minimum 10 characters)..."
                className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-[#1D4ED8] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={submitLoading}
                className="h-11 w-full rounded-lg bg-[#0F2544] text-sm font-semibold text-white hover:bg-[#16345E] disabled:opacity-50"
              >
                {submitLoading ? 'Submitting Application...' : 'Submit Demonstration Application'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Application Status Tracker */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2 text-[#0F2544]">
            <FileSearch className="h-5 w-5 text-[#1D4ED8]" />
            <h2 className="font-display text-xl font-bold">Track Application Status</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Enter a demonstration reference ID (e.g., APP-DEMO-2026-1001 through 1015) to inspect live status history.
          </p>

          <form onSubmit={(e) => void handleTrack(e)} className="mt-5 flex gap-2">
            <input
              type="text"
              value={trackRef}
              onChange={(e) => setTrackRef(e.target.value)}
              placeholder="APP-DEMO-2026-1001"
              className="h-10 flex-1 rounded-lg border border-slate-300 px-3 font-mono text-sm uppercase focus:border-[#1D4ED8] focus:outline-none"
            />
            <button
              type="submit"
              disabled={trackLoading}
              className="h-10 rounded-lg bg-[#1D4ED8] px-4 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              {trackLoading ? 'Checking...' : 'Track'}
            </button>
          </form>

          {trackError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{trackError}</div>
          )}

          {trackingResult && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-[#0F2544]">
                    {trackingResult.application.reference_number}
                  </span>
                  <span className="text-xs font-semibold text-[#1D4ED8]">
                    Status: {translateStatus(language, trackingResult.application.status)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  {trackingResult.application.category} · {trackingResult.application.constituency} ({trackingResult.application.district})
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  Last Updated: {trackingResult.application.updated_at.slice(0, 19).replace('T', ' ')}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-700">Status History Timeline</h3>
                <div className="mt-3 space-y-3 border-l border-slate-200 pl-4">
                  {trackingResult.history.map((h, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                          <Clock className="h-3.5 w-3.5 text-[#1D4ED8]" />
                          {translateStatus(language, h.status)}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {h.created_at.slice(0, 19).replace('T', ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{h.remarks}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">Officer / Actor: {h.changed_by_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
