import React from 'react';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Download,
  Sparkles,
  Sliders,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Copy,
  ArrowRight,
  Database,
  BarChart3,
} from 'lucide-react';
import { LinkItem, AppSettings } from '../types';

interface LinkManagementCardProps {
  items: LinkItem[];
  duplicatesPreventedCount: number;
  onOpenUploadModal: () => void;
  onOpenAddModal: () => void;
  onOpenExtractModal: () => void;
  onOpenSettingsModal: () => void;
  onExportExcel: () => void;
  onToggleCharts: () => void;
  showCharts: boolean;
  onScrollToFullTable?: () => void;
  onCopyLink: (link: string) => void;
}

export const LinkManagementCard: React.FC<LinkManagementCardProps> = ({
  items,
  duplicatesPreventedCount,
  onOpenUploadModal,
  onOpenAddModal,
  onOpenExtractModal,
  onOpenSettingsModal,
  onExportExcel,
  onToggleCharts,
  showCharts,
  onScrollToFullTable,
  onCopyLink,
}) => {
  // Key stats
  const totalCount = items.length;
  const downloadedCount = items.filter(
    i => i.status.toLowerCase().includes('download') || i.status.toLowerCase().includes('selesai')
  ).length;
  const downloadedPercentage =
    totalCount > 0 ? Math.min(100, Math.round((downloadedCount / totalCount) * 100)) : 0;
  const prosesCount = items.filter(
    i => i.status.toLowerCase().includes('proses') || i.status.toLowerCase().includes('pending')
  ).length;
  const blankCount = items.filter(
    i =>
      i.status.toLowerCase().includes('blank') ||
      i.status.toLowerCase().includes('404') ||
      i.status.toLowerCase().includes('error')
  ).length;

  // Recent 4 links for spotlight preview
  const recentLinks = items.slice(0, 4);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 mb-6">
      {/* Top Header of Link Management Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0 max-w-xl">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Link Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/50">
                Supabase Realtime
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kelola link download, deteksi error 404, filter periode, dan ekspor spreadsheet
            </p>

            {/* Visual Progress Bar beneath the 'Link Management' section title */}
            <div className="mt-3 pt-2.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-600 dark:text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Progres Terunduh:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {downloadedCount}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">/</span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono">
                    {totalCount} item
                  </span>
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center gap-1">
                  <span>{downloadedPercentage}%</span>
                  <span className="text-[10px] font-sans font-medium text-slate-500 dark:text-slate-400">selesai</span>
                </span>
              </div>
              <div
                id="link-management-progress-track"
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/70 dark:border-slate-700/60"
              >
                <div
                  id="link-management-progress-fill"
                  className="bg-emerald-600 dark:bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${downloadedPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Upload Excel */}
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Upload Excel</span>
          </button>

          {/* Add Link Manual */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-200/60 dark:shadow-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Link</span>
          </button>

          {/* Extract Links */}
          <button
            type="button"
            onClick={onOpenExtractModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition shadow-2xs cursor-pointer"
            title="Ekstrak Link Tertanam"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Ekstrak</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition shadow-2xs cursor-pointer"
            title="Export ke Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Settings Modal */}
          <button
            type="button"
            onClick={onOpenSettingsModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-semibold transition shadow-2xs cursor-pointer"
            title="Pengaturan Opsi"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline">Opsi</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Bar for Links - Harmonious Palette */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-3.5 border border-slate-200/60 dark:border-slate-700/60">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Tautan</div>
          <div className="font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 tracking-tight">{totalCount}</div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl p-3.5 border border-emerald-100/80 dark:border-emerald-800/40">
          <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Selesai Unduh</span>
          </div>
          <div className="font-display text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1 tracking-tight">{downloadedCount}</div>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl p-3.5 border border-amber-100/80 dark:border-amber-800/40">
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Dalam Proses</span>
          </div>
          <div className="font-display text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1 tracking-tight">{prosesCount}</div>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl p-3.5 border border-rose-100/80 dark:border-rose-800/40">
          <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Blank / 404</span>
          </div>
          <div className="font-display text-2xl font-extrabold text-rose-900 dark:text-rose-200 mt-1 tracking-tight">{blankCount}</div>
        </div>
      </div>

      {/* Spotlight: Recent Active Links Preview */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">
            Tautan Aktif Terbaru
          </span>
          {onScrollToFullTable && (
            <button
              type="button"
              onClick={onScrollToFullTable}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Buka Tabel Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentLinks.map(item => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {item.name || 'Tautan Tanpa Nama'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                    {item.status}
                  </span>
                </div>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline truncate block mt-0.5"
                >
                  {item.link}
                </a>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onCopyLink(item.link)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-750 rounded-lg transition cursor-pointer"
                  title="Salin Link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-750 rounded-lg transition cursor-pointer"
                  title="Buka Link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
