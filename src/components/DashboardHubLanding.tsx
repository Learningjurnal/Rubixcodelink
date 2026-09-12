import React, { useMemo } from 'react';
import {
  HardDrive,
  FileSpreadsheet,
  ArrowRight,
  Database,
  PieChart,
  FolderPlus,
  Plus,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  Layers,
  Sparkles,
  ShieldCheck,
  BarChart2,
  TrendingUp,
  Folder,
  ExternalLink,
} from 'lucide-react';
import { StorageFolder, LinkItem, StorageOverviewStats, CommandCenterTab } from '../types';

interface DashboardHubLandingProps {
  folders: StorageFolder[];
  links: LinkItem[];
  overviewStats: StorageOverviewStats;
  duplicatesPreventedCount: number;
  userEmail?: string;
  onSelectTab: (tab: CommandCenterTab) => void;
  onOpenNewFolderModal: () => void;
  onOpenAddLinkModal: () => void;
  onOpenUploadExcelModal: () => void;
}

export const DashboardHubLanding: React.FC<DashboardHubLandingProps> = ({
  folders,
  links,
  overviewStats,
  duplicatesPreventedCount,
  userEmail,
  onSelectTab,
  onOpenNewFolderModal,
  onOpenAddLinkModal,
  onOpenUploadExcelModal,
}) => {
  // Compute real-time dynamic stats from user's data
  const totalFiles = useMemo(() => {
    return folders.reduce((sum, f) => sum + (f.filesCount || (f.files?.length || 0)), 0);
  }, [folders]);

  const totalUsedBytes = useMemo(() => {
    return folders.reduce((sum, f) => sum + (f.usedBytes || 0), 0);
  }, [folders]);

  const totalCapacityBytes = useMemo(() => {
    const sum = folders.reduce((sum, f) => sum + (f.capacityBytes || 0), 0);
    return sum > 0 ? sum : 10 * 1024 * 1024 * 1024; // Default 10GB if no folders yet
  }, [folders]);

  const usedPercentage = useMemo(() => {
    if (totalCapacityBytes === 0) return 0;
    return Math.min(100, Math.round((totalUsedBytes / totalCapacityBytes) * 100));
  }, [totalUsedBytes, totalCapacityBytes]);

  const formattedUsedStorage = useMemo(() => {
    if (totalUsedBytes === 0) return '0 MB';
    if (totalUsedBytes < 1024 * 1024 * 1024) {
      return `${Math.round(totalUsedBytes / (1024 * 1024))} MB`;
    }
    return `${(totalUsedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }, [totalUsedBytes]);

  const formattedTotalCapacity = useMemo(() => {
    const gb = totalCapacityBytes / (1024 * 1024 * 1024);
    if (gb >= 1024) {
      return `${(gb / 1024).toFixed(1)} TB`;
    }
    return `${Math.round(gb)} GB`;
  }, [totalCapacityBytes]);

  // Links status breakdown
  const linkStats = useMemo(() => {
    const downloaded = links.filter(
      l => l.status.toLowerCase().includes('download') || l.status.toLowerCase().includes('selesai')
    ).length;
    const inProgress = links.filter(l => l.status.toLowerCase().includes('proses')).length;
    const blank = links.filter(
      l => l.status.toLowerCase() === 'blank' || l.status.trim() === ''
    ).length;
    const failed = links.filter(
      l => l.status.toLowerCase().includes('gagal') || l.status.toLowerCase().includes('inactive')
    ).length;

    return { downloaded, inProgress, blank, failed };
  }, [links]);

  // File type classification
  const fileTypeCounts = useMemo(() => {
    let docs = 0;
    let images = 0;
    let videos = 0;
    let archives = 0;
    let others = 0;

    folders.forEach(f => {
      f.files?.forEach(file => {
        const type = (file.type || '').toLowerCase();
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (['pdf', 'docx', 'doc', 'xlsx', 'txt', 'csv'].includes(type) || ['pdf', 'docx', 'doc', 'xlsx', 'txt', 'csv'].includes(ext)) {
          docs++;
        } else if (['image', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'ai', 'psd'].includes(type) || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ai', 'psd'].includes(ext)) {
          images++;
        } else if (['video', 'mp4', 'mkv', 'mov', 'avi'].includes(type) || ['mp4', 'mkv', 'mov', 'avi'].includes(ext)) {
          videos++;
        } else if (['archive', 'zip', 'tar.gz', 'tar', 'rar', 'sql', 'json'].includes(type) || ['zip', 'gz', 'tar', 'rar', 'sql', 'json'].includes(ext)) {
          archives++;
        } else {
          others++;
        }
      });
    });

    return { docs, images, videos, archives, others };
  }, [folders]);

  // Combined recent items
  const recentCombinedItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: 'storage_folder' | 'storage_file' | 'link';
      timestamp: string;
      badge: string;
      color: string;
    }> = [];

    // Recent folders
    folders.slice(0, 3).forEach(f => {
      items.push({
        id: `f-${f.id}`,
        title: f.name,
        subtitle: `${f.filesCount} berkas • ${f.usedStorageFormatted} terpakai`,
        type: 'storage_folder',
        timestamp: f.createdAt,
        badge: 'Folder',
        color: 'blue',
      });
    });

    // Recent links
    links.slice(0, 4).forEach(l => {
      items.push({
        id: `l-${l.id}`,
        title: l.name || l.link,
        subtitle: `${l.region} • ${l.output} • ${l.status}`,
        type: 'link',
        timestamp: l.diperbarui || new Date(l.createdAt).toLocaleDateString(),
        badge: l.status,
        color: l.status.toLowerCase().includes('download') ? 'emerald' : 'indigo',
      });
    });

    return items;
  }, [folders, links]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner: Single User Command Center Hub */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden transition-colors">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-50/60 dark:bg-indigo-950/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 translate-y-12 w-48 h-48 bg-blue-50/60 dark:bg-blue-950/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Database Cloud Firestore Privat
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Single-User Workspace
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Selamat Datang di Command Center Data
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Dashboard gabungan untuk visualisasi seluruh ekosistem data Anda. Pantau utilisasi penyimpanan berkas di{' '}
              <strong className="text-blue-700 dark:text-blue-400 font-semibold">Storage Management</strong> dan pengelolaan aliran tautan di{' '}
              <strong className="text-indigo-700 dark:text-indigo-400 font-semibold">Link Management</strong> secara real-time.
            </p>

            {userEmail && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Akun Terhubung:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {userEmail}
                </span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenNewFolderModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-blue-200 dark:shadow-none cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Buat Folder</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddLinkModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tautan</span>
            </button>

            <button
              type="button"
              onClick={onOpenUploadExcelModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Import Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Combined KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Real Storage Usage */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Kapasitas Penyimpanan
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {formattedUsedStorage}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span>Alokasi Kuota</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{usedPercentage}% ({formattedTotalCapacity})</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Folders & Files */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Folder & Berkas
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {folders.length} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Folder</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <Folder className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total Berkas:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{totalFiles} Berkas</span>
          </div>
        </div>

        {/* Metric 3: Links Managed */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tautan Dikelola
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {links.length} <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Link</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Sudah Terunduh:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{linkStats.downloaded} Tautan</span>
          </div>
        </div>

        {/* Metric 4: Integrity & Prevention */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Integritas Data
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {duplicatesPreventedCount} <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Dicegah</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-100 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Status Database:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Sinkron Realtime</span>
          </div>
        </div>
      </div>

      {/* Gateway Selection Section: THE TWO CHOICES */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Pilih Modul Pengelolaan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gunakan tombol di bawah atau tab pada top bar untuk membuka area kerja spesifik yang ingin Anda kelola:
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OPTION 1: Storage Management Gateway Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg transition-all p-6 sm:p-7 flex flex-col justify-between group relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-400 to-indigo-500" />
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      Storage Management
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Manajemen Folder, Berkas & Alokasi Kuota
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {folders.length} Folder
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                Kelola folder dokumen, aset media, berkas proyek, dan arsip sistem. Dilengkapi pemantauan kapasitas,
                fitur unggah berkas, dan visualisasi kuota penyimpanan.
              </p>

              {/* Quick Data Indicators */}
              <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4 text-center">
                <div>
                  <div className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100">{folders.length}</div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Total Folder</div>
                </div>
                <div className="border-x border-slate-200/70 dark:border-slate-700/60">
                  <div className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100">{totalFiles}</div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Total Berkas</div>
                </div>
                <div>
                  <div className="font-display text-base font-extrabold text-indigo-600 dark:text-indigo-400">{formattedUsedStorage}</div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Terpakai</div>
                </div>
              </div>

              {/* Storage Allocation Progress Bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Alokasi Kapasitas</span>
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                    {usedPercentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/70 dark:border-slate-700/60">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${usedPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('storage_management')}
              className="w-full py-3 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Buka Storage Management</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </div>

          {/* OPTION 2: Link Management Gateway Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-lg transition-all p-6 sm:p-7 flex flex-col justify-between group relative overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      Link Management
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Spreadsheet Tautan, Import Excel & Batch Action
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                  {links.length} Tautan
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                Pusat pengelolaan tautan spreadsheet lengkap dengan pencarian multi-kolom, pencegahan duplikat,
                ekstraksi tautan tertanam otomatis, filtering rentang tanggal, dan ekspor ke Excel (.xlsx).
              </p>

              {/* Quick Data Indicators */}
              <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4 text-center">
                <div>
                  <div className="font-display text-base font-extrabold text-slate-900 dark:text-slate-100">{links.length}</div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Total Tautan</div>
                </div>
                <div className="border-x border-slate-200/70 dark:border-slate-700/60">
                  <div className="font-display text-base font-extrabold text-emerald-600 dark:text-emerald-400">{linkStats.downloaded}</div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Terunduh</div>
                </div>
                <div>
                  <div className="font-display text-base font-extrabold text-amber-600 dark:text-amber-400">{linkStats.inProgress + linkStats.blank}</div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Tertunda</div>
                </div>
              </div>

              {/* Progress Bar for Sudah Terunduh Links */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Sudah Terunduh: {linkStats.downloaded} / {links.length} item</span>
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                    {links.length > 0 ? Math.min(100, Math.round((linkStats.downloaded / links.length) * 100)) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/70 dark:border-slate-700/60">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${links.length > 0 ? Math.min(100, Math.round((linkStats.downloaded / links.length) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('link_management')}
              className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-indigo-200/60 cursor-pointer"
            >
              <span>Buka Link Management</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>
      </div>

      {/* Visualisasi Dashboard: Gabungan Data Pengelolaan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visualisasi 1: Distribusi Format File Penyimpanan (Storage) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Distribusi Format Berkas Penyimpanan</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Komposisi berkas dalam folder aktif</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              {totalFiles} Berkas
            </span>
          </div>

          {totalFiles > 0 ? (
            <div className="space-y-3.5 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Dokumen (PDF, DOCX, XLSX, TXT)
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{fileTypeCounts.docs} berkas</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${totalFiles ? (fileTypeCounts.docs / totalFiles) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Media & Gambar (PNG, JPG, PSD, AI)
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{fileTypeCounts.images} berkas</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${totalFiles ? (fileTypeCounts.images / totalFiles) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <Film className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Video & Animasi (MP4, MKV)
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{fileTypeCounts.videos} berkas</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${totalFiles ? (fileTypeCounts.videos / totalFiles) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <Archive className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Arsip & Dumps (ZIP, TAR, SQL)
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{fileTypeCounts.archives} berkas</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${totalFiles ? (fileTypeCounts.archives / totalFiles) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              Belum ada berkas dalam folder Anda. Buka Storage Management untuk mengunggah berkas pertama.
            </div>
          )}
        </div>

        {/* Visualisasi 2: Status & Aliran Tautan (Link Management) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Status Aliran Tautan Spreadsheet</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Rincian status proses unduhan tautan</p>
              </div>
            </div>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/70">
              {links.length} Tautan
            </span>
          </div>

          {links.length > 0 ? (
            <div className="space-y-3.5 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Sudah Terunduh
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{linkStats.downloaded} ({links.length ? Math.round((linkStats.downloaded / links.length) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${links.length ? (linkStats.downloaded / links.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Dalam Proses
                  </span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{linkStats.inProgress} ({links.length ? Math.round((linkStats.inProgress / links.length) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${links.length ? (linkStats.inProgress / links.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    Blank / Belum Diproses
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{linkStats.blank} ({links.length ? Math.round((linkStats.blank / links.length) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className="bg-slate-400 dark:bg-slate-600 h-full rounded-full"
                    style={{ width: `${links.length ? (linkStats.blank / links.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                    Gagal / Web Inactive
                  </span>
                  <span className="font-bold text-red-600 dark:text-red-400">{linkStats.failed} ({links.length ? Math.round((linkStats.failed / links.length) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                  <div
                    className="bg-red-500 h-full rounded-full"
                    style={{ width: `${links.length ? (linkStats.failed / links.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              Belum ada tautan yang ditambahkan. Buka Link Management atau unggah file Excel untuk mulai mengelola.
            </div>
          )}
        </div>
      </div>

      {/* Stream Aktivitas Terkini (Combined Activity Stream) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Aktivitas & Berkas Terbaru</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Folder dan tautan yang baru saja diperbarui pada akun Anda</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTab('storage_management')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Lihat Folder →
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              onClick={() => onSelectTab('link_management')}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Lihat Tautan →
            </button>
          </div>
        </div>

        {recentCombinedItems.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentCombinedItems.map(item => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      item.type === 'storage_folder'
                        ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60'
                        : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60'
                    }`}
                  >
                    {item.type === 'storage_folder' ? (
                      <Folder className="w-4 h-4" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.type === 'storage_folder'
                        ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                        : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                    {item.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            Belum ada aktivitas. Silakan buat folder di Storage Management atau tambahkan tautan di Link Management.
          </div>
        )}
      </div>
    </div>
  );
};
