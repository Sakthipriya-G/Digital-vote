import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  FileCheck2,
  FileSearch,
  HelpCircle,
  IdCard,
  Mail,
  MapPin,
  Megaphone,
  MessageSquareWarning,
  Phone,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react';
import { useApp, type AppRoute } from '../context/AppContext';
import { t } from '../i18n/translations';
import type { ElectionEvent } from '../types';
import { apiFetch } from '../utils/api';

interface OverviewResponse {
  announcements: ElectionEvent[];
  calendar: ElectionEvent[];
  publicNotices: ElectionEvent[];
  stats: {
    constituencies: number;
    pollingStations: number;
    candidates: number;
    parties: number;
    applicationsProcessed: number;
    registeredDemoVoters: number;
  };
}

const HOME_FAQS = [
  {
    q: 'What is the Smart Election Portal?',
    a: 'Smart Election Portal is an educational demonstration web application showcasing digital voter services, application workflows, candidate and party directories, polling station lookup, and security monitoring.',
  },
  {
    q: 'Can I cast a real vote or obtain an official Voter ID on this portal?',
    a: 'No. This application uses fictional demonstration data only. It does not conduct online voting, ballot casting, or official voter registration.',
  },
  {
    q: 'How do I test Voter, Election Officer, Admin, and Super Admin roles?',
    a: 'Open the Login page and use the built-in Demo Account Selector to fill any demonstration account across the four roles, or register a new demonstration voter account.',
  },
  {
    q: 'Does the Simulated Face Verification capture real photos or biometrics?',
    a: 'No. It never accesses your camera or stores facial images or biometric embeddings. You review an educational consent notice and select a fictional demo profile to test the workflow.',
  },
];

export function HomePage() {
  const { language, user, navigate } = useApp();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  useEffect(() => {
    apiFetch<OverviewResponse>('/api/public/overview')
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const serviceCards: Array<{
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    target: AppRoute;
  }> = [
    {
      title: t(language, 'srvRegTitle'),
      desc: t(language, 'srvRegDesc'),
      icon: UserPlus,
      target: user ? 'services' : 'register',
    },
    {
      title: t(language, 'srvTrackTitle'),
      desc: t(language, 'srvTrackDesc'),
      icon: FileSearch,
      target: 'services',
    },
    {
      title: t(language, 'srvProfileTitle'),
      desc: t(language, 'srvProfileDesc'),
      icon: IdCard,
      target: user ? 'voter-dashboard' : 'login',
    },
    {
      title: t(language, 'srvStationTitle'),
      desc: t(language, 'srvStationDesc'),
      icon: MapPin,
      target: 'polling-stations',
    },
    {
      title: t(language, 'srvCandTitle'),
      desc: t(language, 'srvCandDesc'),
      icon: Users,
      target: 'candidates',
    },
    {
      title: t(language, 'srvCompTitle'),
      desc: t(language, 'srvCompDesc'),
      icon: MessageSquareWarning,
      target: user ? 'voter-dashboard' : 'login',
    },
  ];

  return (
    <div>
      {/* Educational Disclaimer Top Notice */}
      <section className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto flex max-w-[1440px] items-start gap-3 px-4 py-3 text-xs text-amber-950 sm:px-6 lg:px-8">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p className="leading-relaxed">
            <strong className="font-semibold">{t(language, 'disclaimerLabel')}: </strong>
            {t(language, 'disclaimerText')}
          </p>
        </div>
      </section>

      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-7">
              <p className="text-xs font-semibold tracking-wide text-[#1D4ED8]">
                Civic Digital Services · Educational Demonstration System
              </p>
              <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight text-[#0F2544] sm:text-5xl [text-wrap:balance]">
                {t(language, 'heroTitle')}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {t(language, 'heroDesc')}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('services')}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#0F2544] px-5 text-sm font-semibold text-white hover:bg-[#16345E] whitespace-nowrap shrink-0 transition-colors"
                >
                  <span>{t(language, 'exploreServices')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('polling-stations')}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0F2544] hover:bg-slate-50 whitespace-nowrap shrink-0 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-[#1D4ED8]" />
                  <span>{t(language, 'findStation')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('candidates')}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-[#0F2544] hover:bg-slate-50 whitespace-nowrap shrink-0 transition-colors"
                >
                  <Users className="h-4 w-4 text-amber-600" />
                  <span>{t(language, 'viewCandidates')}</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[260px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_civic_portal_1795605887144.jpg"
                    alt="Modern civic public administration hall for the Smart Election Portal demonstration"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-[#0F2544] to-[#1E40AF] p-8 text-center text-white">
                    <FileCheck2 className="h-12 w-12 text-amber-400" />
                    <p className="mt-3 font-display text-lg font-semibold">Smart Election Portal</p>
                    <p className="mt-1 text-xs text-slate-200">Digital Voter & Election Management Demo</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-Column Live Database KPI Strip */}
          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-slate-200 pt-8 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Demo Constituencies</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">
                {loading ? '—' : data?.stats.constituencies ?? 5}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Polling Stations</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">
                {loading ? '—' : data?.stats.pollingStations ?? 10}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Published Candidates</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#0F2544]">
                {loading ? '—' : data?.stats.candidates ?? 10}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Applications Processed</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-[#1D4ED8]">
                {loading ? '—' : data?.stats.applicationsProcessed ?? 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Voter Service Cards */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#0F2544] sm:text-3xl">
              {t(language, 'servicesHeading')}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">{t(language, 'servicesSubheading')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('verification')}
            className="inline-flex h-10 items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-[#0F2544] hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <span>Simulated Face & QR Verification</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {serviceCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => navigate(card.target)}
                className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 text-left hover:border-[#1D4ED8] transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[#0F2544] group-hover:bg-blue-50 group-hover:text-[#1D4ED8] transition-colors">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs text-slate-400">0{idx + 1}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-slate-900 group-hover:text-[#1D4ED8]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8]">
                  <span>Open service</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Announcements, Election Calendar, Latest Notifications */}
      <section className="border-y border-slate-200 bg-white py-12">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {/* Announcements */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-[#0F2544]">
              <Megaphone className="h-5 w-5 text-amber-600" />
              <h2 className="font-display text-lg font-bold">{t(language, 'announcementsTitle')}</h2>
            </div>
            <div className="mt-4 space-y-4">
              {loading ? (
                <p className="text-sm text-slate-500">Loading announcements...</p>
              ) : (data?.announcements || []).length === 0 ? (
                <p className="text-sm text-slate-500">No announcements scheduled.</p>
              ) : (
                data!.announcements.map((item) => (
                  <div key={item.id} className="border-b border-slate-200 pb-3.5 last:border-0 last:pb-0">
                    <p className="text-xs font-medium text-slate-500">
                      {item.election_type} · {item.event_date} · {item.status}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Election Calendar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-[#0F2544]">
              <Calendar className="h-5 w-5 text-[#1D4ED8]" />
              <h2 className="font-display text-lg font-bold">{t(language, 'calendarTitle')}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Loading calendar...</p>
              ) : (
                (data?.calendar || []).slice(0, 5).map((ev) => (
                  <div key={ev.id} className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{ev.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {ev.constituency} · {ev.phase}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-[#1D4ED8]">
                      {ev.event_date}
                    </span>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('election-info')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
            >
              <span>View full election schedule</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Latest Public Notifications */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-2 text-[#0F2544]">
              <FileCheck2 className="h-5 w-5 text-emerald-700" />
              <h2 className="font-display text-lg font-bold">{t(language, 'notificationsTitle')}</h2>
            </div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Loading notices...</p>
              ) : (
                (data?.publicNotices || []).map((notice) => (
                  <div key={notice.id} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                    <p className="font-mono text-[11px] text-slate-500">
                      {notice.event_date} · {notice.status}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{notice.title}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{notice.constituency}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions & Contact Information */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#1D4ED8]" />
              <h2 className="font-display text-2xl font-bold text-[#0F2544]">{t(language, 'faqTitle')}</h2>
            </div>
            <div className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {HOME_FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{item.a}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-display text-xl font-bold text-[#0F2544]">{t(language, 'contactTitle')}</h2>
              <p className="mt-2 text-sm text-slate-600">
                Citizen support desk for this educational demonstration portal. Use PollBot or the Complaint Portal for demo workflows.
              </p>
              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                  <div>
                    <p className="font-semibold text-slate-900">Demo Citizen Helpline</p>
                    <p className="font-mono text-xs text-slate-600">1800-000-2026 (Mon–Sat, 09:00–18:00)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                  <div>
                    <p className="font-semibold text-slate-900">Support Email</p>
                    <p className="font-mono text-xs text-slate-600">support@smartelection.demo.edu</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" />
                  <div>
                    <p className="font-semibold text-slate-900">Demonstration Address</p>
                    <p className="text-xs text-slate-600">Civic Systems Academic Lab, Sector 4, Demonstration Campus</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('help-centre')}
                  className="h-10 rounded-lg bg-[#0F2544] px-4 text-sm font-semibold text-white hover:bg-[#16345E]"
                >
                  Open Help Centre
                </button>
                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Demo Account Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
