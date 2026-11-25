import React, { useEffect, useState } from 'react';
import { CheckCircle2, QrCode, ScanFace, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { QrTokenRecord, VerificationRecord } from '../types';
import { apiFetch } from '../utils/api';

interface DemoFaceProfile {
  code: string;
  name: string;
  district: string;
  outcome: string;
  note: string;
}

export function VerificationPortalPage() {
  const { user, navigate, showToast } = useApp();

  // Simulated Face Verification state
  const [profiles, setProfiles] = useState<DemoFaceProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('SIM-PROF-01');
  const [consentChecked, setConsentChecked] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [latestResult, setLatestResult] = useState<VerificationRecord | null>(null);
  const [verifHistory, setVerifHistory] = useState<VerificationRecord[]>([]);

  // QR Verification state
  const [myTokens, setMyTokens] = useState<QrTokenRecord[]>([]);
  const [qrInput, setQrInput] = useState('DEMO-QR-2026-VALID1');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrValidationResult, setQrValidationResult] = useState<{
    valid: boolean;
    status: string;
    message?: string;
    error?: string;
  } | null>(null);

  const loadData = async () => {
    try {
      const pRes = await apiFetch<{ profiles: DemoFaceProfile[] }>('/api/verification/demo-profiles');
      setProfiles(pRes.profiles);
      if (user) {
        const [hRes, qRes] = await Promise.all([
          apiFetch<{ records: VerificationRecord[] }>('/api/verification/history'),
          apiFetch<{ tokens: QrTokenRecord[] }>('/api/qr/my-tokens'),
        ]);
        setVerifHistory(hRes.records);
        setMyTokens(qRes.tokens);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadData();
  }, [user]);

  const runSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('info', 'Please sign in to save simulated verification results.');
      navigate('login');
      return;
    }
    if (!consentChecked) {
      showToast('error', 'Please accept the educational consent notice first.');
      return;
    }
    setSimLoading(true);
    try {
      const res = await apiFetch<{ record: VerificationRecord; message: string }>('/api/verification/simulate', {
        method: 'POST',
        body: JSON.stringify({
          demo_profile_code: selectedProfile,
          consent_accepted: consentChecked,
        }),
      });
      setLatestResult(res.record);
      showToast('success', res.message);
      await loadData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Simulation failed.');
    } finally {
      setSimLoading(false);
    }
  };

  const requestManualReview = async (recordId: number) => {
    try {
      const res = await apiFetch<{ message: string }>(`/api/verification/${recordId}/manual-review`, {
        method: 'POST',
        body: JSON.stringify({ remarks: 'Requested manual review from Simulated Verification Demo page.' }),
      });
      showToast('success', res.message);
      await loadData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Request failed.');
    }
  };

  const generateQrToken = async () => {
    if (!user) {
      showToast('info', 'Please sign in to generate a demonstration QR token.');
      navigate('login');
      return;
    }
    setQrLoading(true);
    try {
      const res = await apiFetch<{ token: QrTokenRecord; message: string }>('/api/qr/generate', {
        method: 'POST',
      });
      setQrInput(res.token.token_code);
      showToast('success', res.message);
      await loadData();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not generate QR token.');
    } finally {
      setQrLoading(false);
    }
  };

  const validateQrToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setQrLoading(true);
    setQrValidationResult(null);
    try {
      const res = await apiFetch<{ valid: boolean; status: string; message: string }>('/api/qr/validate', {
        method: 'POST',
        body: JSON.stringify({ token_code: qrInput }),
      });
      setQrValidationResult({ valid: res.valid, status: res.status, message: res.message });
      showToast('success', res.message);
      if (user) await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Token validation failed.';
      setQrValidationResult({ valid: false, status: 'Rejected', error: msg });
      showToast('error', msg);
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F2544]">
          Simulated Face & QR Verification Demonstration
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Educational workflow simulation. This module never accesses cameras and never collects or stores real facial images or biometric templates.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Simulated Face Verification Demonstration */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center gap-2.5 text-[#0F2544]">
            <ScanFace className="h-5 w-5 text-[#1D4ED8]" />
            <h2 className="font-display text-xl font-bold">Simulated Face Verification (Demo Only)</h2>
          </div>

          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950">
            <strong className="font-semibold">Privacy & Consent Notice: </strong>
            This is a simulated face verification demonstration. No webcam feed, real facial photograph, facial embedding, or biometric template is collected or saved. Results are strictly fictional educational outputs.
          </div>

          <form onSubmit={runSimulation} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Select Fictional Demo Profile to Simulate
              </label>
              <div className="mt-2 space-y-2">
                {profiles.map((p) => (
                  <label
                    key={p.code}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${
                      selectedProfile === p.code
                        ? 'border-[#1D4ED8] bg-blue-50/50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="demoProfile"
                      value={p.code}
                      checked={selectedProfile === p.code}
                      onChange={() => setSelectedProfile(p.code)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="mt-0.5 text-slate-600">
                        Expected simulation outcome: <span className="font-semibold">{p.outcome}</span> · {p.district}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I understand this is a <strong>simulated face verification</strong> demonstration and consent to recording a fictional verification log entry (no biometrics collected).
              </span>
            </label>

            <button
              type="submit"
              disabled={simLoading}
              className="h-11 w-full rounded-lg bg-[#0F2544] text-sm font-semibold text-white hover:bg-[#16345E] disabled:opacity-50"
            >
              {simLoading ? 'Running Simulated Check...' : 'Run Simulated Face Verification'}
            </button>
          </form>

          {latestResult && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#0F2544]">{latestResult.verification_ref}</span>
                <span
                  className={`text-xs font-semibold ${
                    latestResult.result === 'Demo Verified'
                      ? 'text-emerald-700'
                      : latestResult.result === 'Manual Review Required'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {latestResult.result}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-700">{latestResult.confidence_note}</p>
              {latestResult.result !== 'Demo Verified' && latestResult.manual_review_status === 'None' && (
                <button
                  type="button"
                  onClick={() => void requestManualReview(latestResult.id)}
                  className="mt-3 h-9 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Request Manual Officer Review
                </button>
              )}
            </div>
          )}

          {/* Verification History */}
          {user && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h3 className="text-xs font-semibold text-slate-700">My Simulated Verification History</h3>
              {verifHistory.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">No verification simulations run on this account yet.</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {verifHistory.slice(0, 5).map((rec) => (
                    <div
                      key={rec.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-xs"
                    >
                      <div>
                        <p className="font-mono font-semibold text-slate-900">{rec.verification_ref}</p>
                        <p className="text-slate-600">{rec.demo_profile_name}</p>
                        <p className="font-mono text-[11px] text-slate-400">
                          {rec.created_at.slice(0, 19).replace('T', ' ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#0F2544]">{rec.result}</p>
                        {rec.manual_review_status !== 'None' && (
                          <p className="text-[11px] text-amber-700">Manual Review: {rec.manual_review_status}</p>
                        )}
                        {rec.result !== 'Demo Verified' && rec.manual_review_status === 'None' && (
                          <button
                            type="button"
                            onClick={() => void requestManualReview(rec.id)}
                            className="mt-1 text-[11px] font-semibold text-[#1D4ED8] hover:underline"
                          >
                            Request Manual Review
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Demonstration QR Verification System */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-[#0F2544]">
              <QrCode className="h-5 w-5 text-[#1D4ED8]" />
              <h2 className="font-display text-xl font-bold">Demonstration QR Verification System</h2>
            </div>
            <button
              type="button"
              onClick={() => void generateQrToken()}
              disabled={qrLoading}
              className="h-9 rounded-lg bg-[#1D4ED8] px-3.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Generate Demo QR
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            Generates single-use demonstration QR references with expiry checks. Reusing or forging a token is blocked and recorded in Security Monitoring.
          </p>

          {/* Validate Token Form */}
          <form onSubmit={validateQrToken} className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-semibold text-slate-700">Validate Demonstration QR Reference</label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="DEMO-QR-..."
                className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs uppercase"
              />
              <button
                type="submit"
                disabled={qrLoading}
                className="h-10 rounded-lg bg-[#0F2544] px-4 text-xs font-semibold text-white hover:bg-[#16345E] whitespace-nowrap shrink-0"
              >
                Validate Token
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span>Test presets:</span>
              <button type="button" onClick={() => setQrInput('DEMO-QR-2026-VALID1')} className="font-mono text-[#1D4ED8] hover:underline">
                VALID1
              </button>
              <button type="button" onClick={() => setQrInput('DEMO-QR-2026-USED02')} className="font-mono text-amber-700 hover:underline">
                USED02 (reuse test)
              </button>
              <button type="button" onClick={() => setQrInput('DEMO-QR-2026-EXP003')} className="font-mono text-red-700 hover:underline">
                EXP003 (expiry test)
              </button>
            </div>

            {qrValidationResult && (
              <div
                className={`mt-3 flex items-start gap-2.5 rounded-lg border p-3 text-xs ${
                  qrValidationResult.valid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-900'
                }`}
              >
                {qrValidationResult.valid ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                )}
                <div>
                  <p className="font-semibold">Status: {qrValidationResult.status}</p>
                  <p className="mt-0.5">{qrValidationResult.message || qrValidationResult.error}</p>
                </div>
              </div>
            )}
          </form>

          {/* User's Generated QR Tokens */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-slate-700">Your Generated Demo QR Tokens</h3>
            {!user ? (
              <p className="mt-2 text-xs text-slate-500">Sign in to generate and manage your personal demonstration QR tokens.</p>
            ) : myTokens.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Click "Generate Demo QR" above to create a single-use token.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {myTokens.slice(0, 4).map((tok) => {
                  const expired = new Date(tok.expires_at).getTime() < Date.now();
                  return (
                    <div
                      key={tok.id}
                      className="flex items-center gap-4 rounded-xl border border-slate-200 p-3 text-xs"
                    >
                      {tok.qrDataUrl ? (
                        <img
                          src={tok.qrDataUrl}
                          alt={`QR code for ${tok.token_code}`}
                          className="h-20 w-20 shrink-0 rounded border border-slate-200 bg-white"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50">
                          <ShieldCheck className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-mono font-bold text-[#0F2544]">{tok.token_code}</p>
                        <p className="mt-0.5 text-slate-600">Demo Ref: {tok.demo_ref_number}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                          Expires: {tok.expires_at.slice(0, 19).replace('T', ' ')} · Attempts: {tok.verification_attempts}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3">
                          <span
                            className={`font-semibold ${
                              tok.is_used ? 'text-slate-500' : expired ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {tok.is_used ? 'Used (Locked)' : expired ? 'Expired' : 'Active (Single-Use)'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQrInput(tok.token_code)}
                            className="font-semibold text-[#1D4ED8] hover:underline"
                          >
                            Test Validate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>
              Demonstration QR tokens are strictly for workflow education and are never connected to real voting eligibility or ballot casting.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
