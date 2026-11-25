import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GitCompare,
  Search,
  Square,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Candidate, Constituency, PoliticalParty } from '../types';
import { apiFetch } from '../utils/api';

const PAGE_SIZE = 18;

export function CandidatesPage() {
  const { navigate } = useApp();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [parties, setParties] = useState<PoliticalParty[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [district, setDistrict] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [partyId, setPartyId] = useState('');
  const [page, setPage] = useState(1);

  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);
  const [compareMap, setCompareMap] = useState<Record<number, Candidate>>({});
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<{ constituencies: Constituency[] }>('/api/public/constituencies'),
      apiFetch<{ parties: PoliticalParty[] }>('/api/public/parties'),
    ])
      .then(([cRes, pRes]) => {
        setConstituencies(cRes.constituencies);
        setParties(pRes.parties);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (district) params.set('district', district);
    if (constituencyId) params.set('constituency_id', constituencyId);
    if (partyId) params.set('party_id', partyId);

    apiFetch<{ candidates: Candidate[] }>(`/api/public/candidates?${params.toString()}`)
      .then((res) => {
        setCandidates(res.candidates);
        setPage(1);
      })
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, [q, district, constituencyId, partyId]);

  const uniqueDistricts = useMemo(
    () => Array.from(new Set(constituencies.map((c) => c.district))).sort(),
    [constituencies]
  );

  const filteredConstituencies = useMemo(
    () => (district ? constituencies.filter((c) => c.district === district) : constituencies),
    [constituencies, district]
  );

  const totalPages = Math.max(1, Math.ceil(candidates.length / PAGE_SIZE));
  const paginatedCandidates = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return candidates.slice(start, start + PAGE_SIZE);
  }, [candidates, page]);

  const compareIds = Object.keys(compareMap).map(Number);
  const comparedCandidates = Object.values(compareMap);

  const toggleCompare = (cand: Candidate) => {
    setCompareMap((prev) => {
      if (prev[cand.id]) {
        const copy = { ...prev };
        delete copy[cand.id];
        return copy;
      }
      if (Object.keys(prev).length >= 3) return prev;
      return { ...prev, [cand.id]: cand };
    });
  };

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    setConstituencyId('');
  };

  const handleConstituencyChange = (nextConstId: string) => {
    setConstituencyId(nextConstId);
    if (nextConstId && !district) {
      const found = constituencies.find((c) => String(c.id) === nextConstId);
      if (found) setDistrict(found.district);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1D4ED8]">
            {constituencies.length} Constituencies Covered · Neutral Candidate Profiles
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-[#0F2544]">
            Candidate Directory (Fictional Demo)
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Neutral, factual demonstration profiles across all {constituencies.length} constituencies. Filter by district, constituency, or political party, or compare up to 3 candidates side by side.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {compareIds.length >= 2 && (
            <button
              type="button"
              onClick={() => setShowCompareModal(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <GitCompare className="h-4 w-4" />
              <span>Compare ({compareIds.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('parties')}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-[#0F2544] hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            View Political Parties
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-12">
        <div className="relative md:col-span-4">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search candidate, constituency, education..."
            className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:border-[#1D4ED8] focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <select
            value={district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            aria-label="Filter by district"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
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
          <select
            value={constituencyId}
            onChange={(e) => handleConstituencyChange(e.target.value)}
            aria-label="Filter by constituency"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
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
          <select
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            aria-label="Filter by political party"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">All Political Parties</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.short_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span className="font-mono">
            Showing {candidates.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, candidates.length)} of {candidates.length} candidates
          </span>
          {(q || district || constituencyId || partyId) && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                setDistrict('');
                setConstituencyId('');
                setPartyId('');
              }}
              className="font-semibold text-[#1D4ED8] hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-900">No matching candidates found</p>
          <p className="mt-1 text-xs text-slate-500">Adjust your search keywords or clear the district/constituency/party filters.</p>
          <button
            type="button"
            onClick={() => {
              setQ('');
              setDistrict('');
              setConstituencyId('');
              setPartyId('');
            }}
            className="mt-4 h-9 rounded-lg border border-slate-300 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {paginatedCandidates.map((cand) => {
              const isSelected = Boolean(compareMap[cand.id]);
              return (
                <article
                  key={cand.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <img
                        src={cand.photo_url}
                        alt={cand.name}
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-display text-base font-bold text-[#0F2544]">{cand.name}</h2>
                        <p className="mt-0.5 text-xs font-medium text-[#1D4ED8]">
                          {cand.party_name} ({cand.party_code})
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {cand.constituency_name} ({cand.constituency_district}) · Age {cand.age}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">Education: </span>
                        {cand.education}
                      </p>
                      <p className="line-clamp-2">
                        <span className="font-semibold text-slate-800">Experience: </span>
                        {cand.experience}
                      </p>
                      <p className="line-clamp-2">
                        <span className="font-semibold text-slate-800">Manifesto: </span>
                        {cand.manifesto}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleCompare(cand)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                        isSelected ? 'bg-blue-50 text-[#1D4ED8]' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      <span>{isSelected ? 'Selected' : 'Compare'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailCandidate(cand)}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
                    >
                      View Details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <span>
                Page {page} of {totalPages} · {candidates.length} candidates total
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

      {/* Candidate Detail Modal */}
      {detailCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <img
                  src={detailCandidate.photo_url}
                  alt={detailCandidate.name}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 rounded-xl border border-slate-200 object-cover"
                />
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F2544]">{detailCandidate.name}</h2>
                  <p className="text-sm font-medium text-[#1D4ED8]">
                    {detailCandidate.party_name} · Symbol: {detailCandidate.party_symbol}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {detailCandidate.constituency_name} ({detailCandidate.constituency_district}) · Age {detailCandidate.age}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailCandidate(null)}
                aria-label="Close candidate details"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4 border-t border-slate-200 pt-4 text-sm">
              <div>
                <h3 className="text-xs font-semibold text-slate-500">Education</h3>
                <p className="mt-1 text-slate-900">{detailCandidate.education}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500">Civic Experience</h3>
                <p className="mt-1 text-slate-900">{detailCandidate.experience}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500">Manifesto Summary (Neutral)</h3>
                <p className="mt-1 leading-relaxed text-slate-800">{detailCandidate.manifesto}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500">Official Declaration Link (Demo)</h3>
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs text-[#1D4ED8]">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{detailCandidate.declaration_url}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[#0F2544]">Side-by-Side Candidate Comparison</h2>
                <p className="text-xs text-slate-500">Neutral factual comparison of selected demonstration profiles.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 pr-4 text-xs font-semibold text-slate-500">Attribute</th>
                    {comparedCandidates.map((c) => (
                      <th key={c.id} className="min-w-[200px] py-3 px-3 font-display font-bold text-[#0F2544]">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-600">Political Party</td>
                    {comparedCandidates.map((c) => (
                      <td key={c.id} className="py-3 px-3 text-slate-900">
                        {c.party_name} ({c.party_code})
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-600">Constituency</td>
                    {comparedCandidates.map((c) => (
                      <td key={c.id} className="py-3 px-3 text-slate-900">
                        {c.constituency_name}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-600">Age</td>
                    {comparedCandidates.map((c) => (
                      <td key={c.id} className="py-3 px-3 font-mono tabular-nums text-slate-900">
                        {c.age}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-600">Education</td>
                    {comparedCandidates.map((c) => (
                      <td key={c.id} className="py-3 px-3 text-slate-800">
                        {c.education}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-600">Experience</td>
                    {comparedCandidates.map((c) => (
                      <td key={c.id} className="py-3 px-3 text-slate-800">
                        {c.experience}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-semibold text-slate-600">Manifesto</td>
                    {comparedCandidates.map((c) => (
                      <td key={c.id} className="py-3 px-3 leading-relaxed text-slate-800">
                        {c.manifesto}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PartiesPage() {
  const { navigate } = useApp();
  const [parties, setParties] = useState<PoliticalParty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ parties: PoliticalParty[] }>('/api/public/parties')
      .then((res) => setParties(res.parties))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#0F2544]">
            Political Party Directory (Fictional Demo)
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Fictional demonstration political parties, emblems, manifesto summaries, and associated candidates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('candidates')}
          className="h-10 rounded-lg bg-[#0F2544] px-4 text-sm font-semibold text-white hover:bg-[#16345E] whitespace-nowrap shrink-0"
        >
          Browse All Candidates
        </button>
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {parties.map((party) => {
            const partyCandidates = party.candidates || [];
            const previewCandidates = partyCandidates.slice(0, 8);
            return (
              <article key={party.id} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-start gap-4">
                  <img
                    src={party.logo_url}
                    alt={`${party.name} emblem`}
                    className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-display text-xl font-bold text-[#0F2544]">{party.name}</h2>
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        {party.short_code} · Est. {party.founded_year}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-[#1D4ED8]">
                      Symbol: {party.symbol_name} · Demo Portal: {party.website}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-700">{party.description}</p>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Manifesto Summary: </span>
                  {party.manifesto_summary}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-600">
                      Associated Candidates ({partyCandidates.length})
                    </p>
                    {partyCandidates.length > previewCandidates.length && (
                      <button
                        type="button"
                        onClick={() => navigate('candidates')}
                        className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                      >
                        View all {partyCandidates.length} →
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {previewCandidates.map((c) => (
                      <span key={c.id} className="text-xs text-slate-700">
                        {c.name} ({c.constituency_name})
                      </span>
                    ))}
                    {partyCandidates.length === 0 && (
                      <span className="text-xs text-slate-400">No published candidates yet.</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
