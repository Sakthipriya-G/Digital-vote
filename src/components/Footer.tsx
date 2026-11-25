import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';

export function Footer() {
  const { language, navigate } = useApp();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-[#0F2544] text-slate-300">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-bold text-white">{t(language, 'brand')}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
              Complete digital voter services and election management educational demonstration system.
            </p>
            <div className="mt-4 space-y-1.5 text-xs text-slate-300">
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-amber-400" />
                <span>Helpline (Demo): 1800-000-2026</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-amber-400" />
                <span>support@smartelection.demo.edu</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span>Civic Technology Lab, Academic Demonstration Block</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Portal Modules</h4>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <button type="button" onClick={() => navigate('services')} className="text-left hover:text-white">
                {t(language, 'navServices')}
              </button>
              <button type="button" onClick={() => navigate('candidates')} className="text-left hover:text-white">
                {t(language, 'navCandidates')}
              </button>
              <button type="button" onClick={() => navigate('parties')} className="text-left hover:text-white">
                {t(language, 'navParties')}
              </button>
              <button type="button" onClick={() => navigate('polling-stations')} className="text-left hover:text-white">
                {t(language, 'navStations')}
              </button>
              <button type="button" onClick={() => navigate('verification')} className="text-left hover:text-white">
                {t(language, 'navVerify')}
              </button>
              <button type="button" onClick={() => navigate('help-centre')} className="text-left hover:text-white">
                {t(language, 'navHelp')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <h4 className="text-xs font-semibold text-amber-300">{t(language, 'disclaimerLabel')}</h4>
            <p className="mt-2 text-xs leading-relaxed text-slate-200">{t(language, 'disclaimerText')}</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p>© 2026 Smart Election Portal — Educational Demonstration Project.</p>
          <p>Fictional Data Only · No Real Voting or Official Voter ID Issuance</p>
        </div>
      </div>
    </footer>
  );
}
