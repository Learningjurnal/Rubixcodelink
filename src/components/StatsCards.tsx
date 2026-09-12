import React from 'react';
import {
  Link2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Globe2,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { LinkItem } from '../types';

interface StatsCardsProps {
  items: LinkItem[];
  duplicatesPreventedCount: number;
  onFilterChange: (filter: string) => void;
  activeFilter: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  items,
  duplicatesPreventedCount,
  onFilterChange,
  activeFilter,
}) => {
  const total = items.length;
  const blankCount = items.filter(i => i.status === 'Blank').length;
  const downloadedCount = items.filter(i => i.status === 'Sudah Terunduh').length;
  const inactiveCount = items.filter(
    i => i.note.toLowerCase().includes('inactive') || i.status === 'Gagal'
  ).length;

  const downloadProgress = total > 0 ? Math.round((downloadedCount / total) * 100) : 0;

  // Domain breakdown for Bento source analysis
  const domainCounts: Record<string, number> = {};
  items.forEach(item => {
    try {
      const url = new URL(item.link);
      const host = url.hostname.replace('www.', '');
      domainCounts[host] = (domainCounts[host] || 0) + 1;
    } catch {
      domainCounts['other'] = (domainCounts['other'] || 0) + 1;
    }
  });

  const topDomains: Array<[string, number]> = Object.entries(domainCounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 mb-6">
      {/* Bento Card 1: Total Links KPI (Lg: 3 cols) */}
      <div
        id="stat-total-links"
        onClick={() => onFilterChange('ALL')}
        className={`lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border shadow-[0_2px_10px_rgba(0,0,0,0.02)] cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
          activeFilter === 'ALL'
            ? 'ring-2 ring-indigo-500 border-indigo-400 dark:border-indigo-600 shadow-sm'
            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Database
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
            <TrendingUp className="w-3 h-3" />
            Aktif
          </span>
        </div>

        <div className="my-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {total}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">tautan tersimpan</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Klik untuk menampilkan seluruh koleksi link unduhan
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Koleksi Lengkap</span>
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            Lihat Semua →
          </span>
        </div>
      </div>

      {/* Bento Card 2: Status Unduhan KPI (Lg: 3 cols) - Harmonized Light Card */}
      <div
        id="stat-queue-progress"
        className={`lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
          activeFilter === 'Blank' || activeFilter === 'Sudah Terunduh'
            ? 'ring-2 ring-emerald-500/80 border-emerald-400 dark:border-emerald-600 shadow-sm'
            : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status Unduhan
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60">
            {downloadProgress}% Selesai
          </span>
        </div>

        <div className="my-3 space-y-2">
          {/* Belum Diunduh trigger */}
          <div
            id="stat-blank-links"
            onClick={() => onFilterChange('Blank')}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
              activeFilter === 'Blank'
                ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700'
                : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Belum (Blank)</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-amber-200 text-amber-700 dark:text-amber-300">
              {blankCount}
            </span>
          </div>

          {/* Sudah Terunduh trigger */}
          <div
            id="stat-downloaded-links"
            onClick={() => onFilterChange('Sudah Terunduh')}
            className={`p-2.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
              activeFilter === 'Sudah Terunduh'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700'
                : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:bg-emerald-50/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">Sudah Terunduh</span>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-emerald-200 text-emerald-700 dark:text-emerald-300">
              {downloadedCount}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      </div>

      {/* Bento Card 3: Anti Duplikasi Protection (Lg: 3 cols) - Harmonized Light Card */}
      <div
        id="stat-duplicates-prevented"
        className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-200 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/70 border border-violet-100 dark:border-violet-800/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Anti Duplikasi
            </span>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800/60">
            Aktif
          </span>
        </div>

        <div className="my-4">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {duplicatesPreventedCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">duplikat dicegah</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Sistem otomatis memblokir file ganda saat Anda mengimpor spreadsheet.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Proteksi Hash URL Unik</span>
        </div>
      </div>

      {/* Bento Card 4: Source Breakdown & Inactive Alert (Lg: 3 cols) - Harmonized Light Card */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/70 border border-sky-100 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Globe2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Analisis Host
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
            Top Domain
          </span>
        </div>

        <div className="my-3 space-y-2">
          {topDomains.length > 0 ? (
            topDomains.map(([host, count]) => (
              <div key={host} className="flex items-center justify-between text-xs py-0.5">
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[130px]" title={host}>
                  {host}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{count}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    ({total > 0 ? Math.round((Number(count) / total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 py-2">Belum ada data domain</p>
          )}
        </div>

        {/* Web Inactive quick check link */}
        <div
          id="stat-inactive-links"
          onClick={() => onFilterChange('Web Inactive')}
          className={`pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs cursor-pointer ${
            activeFilter === 'Web Inactive'
              ? 'text-amber-700 dark:text-amber-400 font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-400'
          }`}
        >
          <span className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Web Inactive / Gagal</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[11px] border border-amber-200/80 dark:border-amber-800/50">
            {inactiveCount}
          </span>
        </div>
      </div>
    </div>
  );
};

