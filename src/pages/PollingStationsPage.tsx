import React, { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  Building2,
  ChevronLeft,
  ChevronRight,
  Compass,
  GraduationCap,
  Landmark,
  MapPin,
  Navigation,
  School,
  Search,
  X,
} from 'lucide-react';
import type { Constituency, PollingStation } from '../types';
import { apiFetch } from '../utils/api';

interface PollingAreaOption {
  polling_area: string;
  district: string;
  constituency_id: number;
  constituency_name: string;
  state_name: string;
  booth_count: number;
}

const LOCATION_TYPES = ['School', 'College', 'Community Hall', 'Civic Centre', 'Public Library'] as const;
const PAGE_SIZE = 18;

const QUICK_HIGHLIGHTS: Array<{ label: string; district: string; constituency?: string }> = [
  { label: 'All Regions', district: '' },
  { label: 'Chennai', district: 'Chennai' },
  { label: 'Perambur', district: 'Chennai', constituency: 'Perambur' },
  { label: 'Sholinganallur', district: 'Chennai', constituency: 'Sholinganallur' },
  { label: 'Velachery', district: 'Chennai', constituency: 'Velachery' },
  { label: 'Tambaram', district: 'Chengalpattu', constituency: 'Tambaram' },
  { label: 'Avadi', district: 'Thiruvallur', constituency: 'Avadi' },
  { label: 'Coimbatore', district: 'Coimbatore' },
  { label: 'Madurai', district: 'Madurai' },
  { label: 'Salem', district: 'Salem' },
];

function LocationIcon({ type }: { type?: string }) {
  if (type === 'College') return <GraduationCap className="h-3.5 w-3.5 text-[#1D4ED8]" />;
  if (type === 'School') return <School className="h-3.5 w-3.5 text-emerald-700" />;
  if (type === 'Community Hall' || type === 'Civic Centre') return <Building2 className="h-3.5 w-3.5 text-amber-700" />;
  return <Landmark className="h-3.5 w-3.5 text-slate-600" />;
}

export function PollingStationsPage() {
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [pollingAreas, setPollingAreas] = useState<PollingAreaOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [district, setDistrict] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [pollingArea, setPollingArea] = useState('');
  const [locationType, setLocationType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedStation, setSelectedStation] = useState<PollingStation | null>(null);

  useEffect(() => {
    apiFetch<{ constituencies: Constituency[] }>('/api/public/constituencies')
      .then((res) => setConstituencies(res.constituencies))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (district) params.set('district', district);
    if (constituencyId) params.set('constituency_id', constituencyId);

    apiFetch<{ pollingAreas: PollingAreaOption[] }>(`/api/public/polling-areas?${params.toString()}`)
      .then((res) => setPollingAreas(res.pollingAreas))
      .catch(() => setPollingAreas([]));
  }, [district, constituencyId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (pinCode.trim()) params.set('pin_code', pinCode.trim());
    if (district) params.set('district', district);
    if (constituencyId) params.set('constituency_id', constituencyId);
    if (pollingArea) params.set('polling_area', pollingArea);
    if (locationType) params.set('location_type', locationType);

    apiFetch<{ pollingStations: PollingStation[] }>(`/api/public/polling-stations?${params.toString()}`)
      .then((res) => {
        setStations(res.pollingStations);
        setPage(1);
      })
      .catch(() => setStations([]))
      .finally(() => setLoading(false));
  }, [q, pinCode, district, constituencyId, pollingArea, locationType]);

  const uniqueDistricts = useMemo(() => {
    const tnSet = new Set<string>();
    const otherSet = new Set<string>();
    for (const c of constituencies) {
      if (c.state === 'Tamil Nadu') tnSet.add(c.district);
      else otherSet.add(c.district);
    }
    return [...Array.from(tnSet).sort(), ...Array.from(otherSet).sort()];
  }, [constituencies]);

  const filteredConstituencies = useMemo(() => {
    if (!district) return constituencies;
    return constituencies.filter((c) => c.district === district);
  }, [constituencies, district]);

  const uniquePollingAreas = useMemo(() => {
    return Array.from(new Set(pollingAreas.map((a) => a.polling_area)));
  }, [pollingAreas]);

  const selectedConstituencyObj = useMemo(
    () => constituencies.find((c) => String(c.id) === constituencyId) || null,
    [constituencies, constituencyId]
  );

  const totalPages = Math.max(1, Math.ceil(stations.length / PAGE_SIZE));
  const paginatedStations = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return stations.slice(start, start + PAGE_SIZE);
  }, [stations, page]);

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    setConstituencyId('');
    setPollingArea('');
  };

  const handleConstituencyChange = (nextConstId: string) => {
    setConstituencyId(nextConstId);
    setPollingArea('');
    if (nextConstId && !district) {
      const match = constituencies.find((c) => String(c.id) === nextConstId);
      if (match) setDistrict(match.district);
    }
  };

  const applyQuickHighlight = (item: { district: string; constituency?: string }) => {
    setDistrict(item.district);
    setPollingArea('');
    if (item.constituency) {
      const match = constituencies.find(
        (c) => c.district === item.district && c.name.toLowerCase() === item.constituency!.toLowerCase()
      );
      setConstituencyId(match ? String(match.id) : '');
    } else {
      setConstituencyId('');
    }
  };

  const clearAll = () => {
    setQ('');
    setPinCode('');
    setDistrict('');
    setConstituencyId('');
    setPollingArea('');
    setLocationType('');
  };

  const activeAreaCount = new Set(stations.map((s) => `${s.district}::${s.polling_area || s.name}`)).size;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
          Tamil Nadu Complete Polling Directory · District → Constituency → Polling Area → Booth
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[#0F2544]">
          Polling Station & Booth Locator (Fictional Demo)
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Browse district-wise and constituency-wise polling areas across Tamil Nadu, including Perambur, Sholinganallur, Velachery, Tambaram, Avadi, Coimbatore, Madurai, and Salem schools and colleges.
        </p>

        {/* Quick-jump Tamil Nadu District & Constituency Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {QUICK_HIGHLIGHTS.map((item) => {
            const isSelected =
              item.constituency
                ? selectedConstituencyObj?.name === item.constituency
                : district === item.district && !constituencyId;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => applyQuickHighlight(item)}
                className={`h-8 rounded-lg border px-3 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  isSelected
                    ? 'border-[#0F2544] bg-[#0F2544] text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-Level Cascading Hierarchy & Search Bar */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              1. District
            </label>
            <select
              value={district}
              onChange={(e) => handleDistrictChange(e.target.value)}
              aria-label="Filter by district"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              <option value="">All Districts ({uniqueDistricts.length})</option>
              {uniqueDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              2. Constituency
            </label>
            <select
              value={constituencyId}
              onChange={(e) => handleConstituencyChange(e.target.value)}
              aria-label="Filter by constituency"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              <option value="">All Constituencies ({filteredConstituencies.length})</option>
              {filteredConstituencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              3. Polling Area
            </label>
            <select
              value={pollingArea}
              onChange={(e) => setPollingArea(e.target.value)}
              aria-label="Filter by polling area"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              <option value="">All Polling Areas ({uniquePollingAreas.length})</option>
              {uniquePollingAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              4. Location Type
            </label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              aria-label="Filter by location type"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
            >
              <option value="">All Schools, Colleges & Halls</option>
              {LOCATION_TYPES.map((lt) => (
                <option key={lt} value={lt}>
                  {lt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 md:grid-cols-12">
          <div className="relative md:col-span-7">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search school, college, booth number, polling area, or street..."
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <input
              type="text"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="PIN code (e.g. 600011, 600119)"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={clearAll}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Hierarchy Breadcrumb & Live Counts */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-[#0F2544]">Hierarchy:</span>
            <span>{district || 'All Districts'}</span>
            <span>→</span>
            <span>{selectedConstituencyObj?.name || 'All Constituencies'}</span>
            <span>→</span>
            <span>{pollingArea || 'All Polling Areas'}</span>
            <span>→</span>
            <span className="font-semibold text-[#1D4ED8]">{stations.length} Booths</span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-slate-500">
            {activeAreaCount} Polling Areas · {stations.length} Booth Locations
          </span>
        </div>
      </div>

      {/* Stations / Booths Grid */}
      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-60 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : stations.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-900">No polling booths match your current filter</p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-4 h-9 rounded-lg border border-slate-300 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear Search Filters
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {paginatedStations.map((st) => (
              <article key={st.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-12">
                  <div className="sm:col-span-4 bg-slate-100">
                    <img
                      src={st.image_url}
                      alt={st.name}
                      referrerPolicy="no-referrer"
                      className="h-44 w-full object-cover sm:h-full"
                    />
                  </div>
                  <div className="flex flex-col justify-between p-5 sm:col-span-8">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-xs font-semibold text-[#1D4ED8]">
                          {st.station_code} · PIN {st.pin_code}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          <LocationIcon type={st.location_type} />
                          <span>{st.location_type || 'School'}</span>
                        </span>
                      </div>

                      <h2 className="mt-1.5 font-display text-lg font-bold text-[#0F2544]">{st.name}</h2>
                      {st.booth_number && (
                        <p className="mt-0.5 font-mono text-xs font-semibold text-amber-700">{st.booth_number}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-600">{st.address}</p>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        {st.district} → {st.constituency_name}
                        {st.polling_area ? ` → ${st.polling_area}` : ''}
                      </p>

                      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                        <p className="flex items-start gap-1.5 text-slate-700">
                          <Accessibility className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                          <span>
                            <strong>Accessibility:</strong> {st.accessibility_facilities}
                          </span>
                        </p>
                        <p className="text-slate-600">
                          <strong>Facilities:</strong> {st.available_facilities}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <span className="font-mono text-[11px] tabular-nums text-slate-500">
                        GPS: {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedStation(st)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F2544] px-3.5 text-xs font-semibold text-white hover:bg-[#16345E] whitespace-nowrap shrink-0"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>Map & Directions</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, stations.length)} of {stations.length} polling booths
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <span className="font-mono font-semibold text-[#0F2544]">
                  Page {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Map Location & Directions Modal */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="font-mono text-xs font-semibold text-[#1D4ED8]">
                  {selectedStation.station_code}
                  {selectedStation.booth_number ? ` · ${selectedStation.booth_number}` : ''}
                </p>
                <h2 className="font-display text-xl font-bold text-[#0F2544]">{selectedStation.name}</h2>
                <p className="mt-1 text-xs text-slate-600">
                  {selectedStation.district} → {selectedStation.constituency_name}
                  {selectedStation.polling_area ? ` → ${selectedStation.polling_area}` : ''} · PIN {selectedStation.pin_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                aria-label="Close directions modal"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interactive Civic Schematic Map View */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="relative h-56 w-full bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4">
                <svg viewBox="0 0 600 220" className="h-full w-full" aria-hidden="true">
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#CBD5E1" strokeWidth="0.7" />
                    </pattern>
                  </defs>
                  <rect width="600" height="220" fill="url(#grid)" />
                  <path d="M 30 165 Q 200 130 310 110 T 560 60" fill="none" stroke="#1D4ED8" strokeWidth="4" strokeDasharray="8 6" />
                  <circle cx="90" cy="155" r="7" fill="#0F2544" />
                  <text x="90" y="180" fontSize="11" fill="#334155" textAnchor="middle">Transit Hub</text>
                  <circle cx="310" cy="110" r="14" fill="#1D4ED8" opacity="0.2" />
                  <circle cx="310" cy="110" r="7" fill="#D97706" stroke="#FFFFFF" strokeWidth="2" />
                  <text x="310" y="88" fontSize="12" fontWeight="700" fill="#0F2544" textAnchor="middle">
                    {selectedStation.station_code}
                  </text>
                </svg>
                <div className="absolute bottom-3 left-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 font-mono text-xs text-slate-800">
                  Lat {selectedStation.latitude.toFixed(4)} · Lng {selectedStation.longitude.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 text-xs font-semibold text-[#0F2544]">
                  <Compass className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Demonstration Arrival Directions</span>
                </h3>
                <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs text-slate-700">
                  <li>Approach via {selectedStation.address} in {selectedStation.district}.</li>
                  <li>Follow blue civic wayfinding boards to the main step-free campus entrance.</li>
                  <li>Priority access & ramp assistance: {selectedStation.accessibility_facilities}.</li>
                </ol>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selectedStation.latitude}&mlon=${selectedStation.longitude}#map=16/${selectedStation.latitude}/${selectedStation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Open Coordinates in OpenStreetMap</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedStation(null)}
                  className="h-10 rounded-lg border border-slate-300 px-4 text-xs font-medium text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
