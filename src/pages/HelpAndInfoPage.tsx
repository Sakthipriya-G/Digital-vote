import React, { useEffect, useState } from 'react';
import { Calendar, HelpCircle, Mail, MapPin, Megaphone, Phone } from 'lucide-react';
import { PollBotPanel } from '../components/PollBotWidget';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import type { ElectionEvent } from '../types';
import { apiFetch } from '../utils/api';

export function ElectionInfoPage() {
  const { language, navigate } = useApp();
  const [events, setEvents] = useState<ElectionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ calendar: ElectionEvent[] }>('/api/public/overview')
      .then((res) => setEvents(res.calendar))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F2544]">
            {t(language, 'navInfo')} (Fictional Demo)
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Demonstration election announcements, roll revision calendar, and neutral civic awareness guidelines.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('polling-stations')}
          className="h-10 rounded-lg bg-[#0F2544] px-4 text-sm font-semibold text-white hover:bg-[#16345E]"
        >
          Find Polling Station
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-[#0F2544]">
            <Calendar className="h-5 w-5 text-[#1D4ED8]" />
            <span>Demonstration Election Calendar & Notices</span>
          </h2>
          {loading ? (
            <p className="mt-4 text-sm text-slate-500">Loading schedule...</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {events.map((ev) => (
                <div key={ev.id} className="flex flex-col justify-between gap-3 p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      {ev.election_type} · {ev.phase} · {ev.constituency}
                    </p>
                    <h3 className="mt-1 font-display text-base font-bold text-slate-900">{ev.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{ev.description}</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="font-mono text-sm font-bold tabular-nums text-[#0F2544]">{ev.event_date}</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#1D4ED8]">{ev.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <Megaphone className="h-5 w-5 text-amber-600" />
              <span>Citizen Awareness Guide</span>
            </h2>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
              <li>1. Verify your demonstration profile details early before roll revision deadlines.</li>
              <li>2. Check polling station accessibility facilities (ramps, tactile guides, priority queues) in advance.</li>
              <li>3. Compare candidate education, experience, and manifestos neutrally using official declarations.</li>
              <li>4. Report portal or accessibility issues through the Complaint Portal for tracked resolution.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HelpCentrePage() {
  const { language, navigate } = useApp();

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F2544]">
          {t(language, 'navHelp')} & PollBot Support
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Neutral civic assistance, portal walkthroughs, and demonstration contact channels.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#0F2544]">
              <HelpCircle className="h-5 w-5 text-[#1D4ED8]" />
              <span>Quick Citizen Actions</span>
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate('services')}
                className="rounded-lg border border-slate-200 p-3.5 text-left hover:border-[#1D4ED8]"
              >
                <p className="text-sm font-semibold text-slate-900">Track an Application</p>
                <p className="mt-1 text-xs text-slate-600">Look up APP-DEMO reference numbers.</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('polling-stations')}
                className="rounded-lg border border-slate-200 p-3.5 text-left hover:border-[#1D4ED8]"
              >
                <p className="text-sm font-semibold text-slate-900">Locate Polling Station</p>
                <p className="mt-1 text-xs text-slate-600">Search by PIN code or district.</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('verification')}
                className="rounded-lg border border-slate-200 p-3.5 text-left hover:border-[#1D4ED8]"
              >
                <p className="text-sm font-semibold text-slate-900">Simulated Verification</p>
                <p className="mt-1 text-xs text-slate-600">Test face simulation & QR tokens.</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('voter-dashboard')}
                className="rounded-lg border border-slate-200 p-3.5 text-left hover:border-[#1D4ED8]"
              >
                <p className="text-sm font-semibold text-slate-900">Submit a Grievance</p>
                <p className="mt-1 text-xs text-slate-600">Log complaints in Voter Dashboard.</p>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-[#0F2544]">Contact Desk (Demo)</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-[#1D4ED8]" />
                <span className="font-mono text-xs">1800-000-2026</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-[#1D4ED8]" />
                <span className="font-mono text-xs">support@smartelection.demo.edu</span>
              </p>
              <p className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-[#1D4ED8]" />
                <span className="text-xs">Academic Demonstration Civic Technology Desk</span>
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <PollBotPanel inline />
        </div>
      </div>
    </div>
  );
}
