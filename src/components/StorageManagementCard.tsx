import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  FolderPlus,
  Search,
  Filter,
  Layers,
  PieChart,
  ArrowUpRight,
  Plus,
  FileText,
  Cloud,
  ChevronDown,
  Upload,
  Settings,
  Terminal,
  FolderTree,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  StorageFolder,
  StorageSubfolder,
  StorageOverviewStats,
  HardDriveProfile,
  HddTransferPlan,
} from '../types';
import { StorageFolderCard } from './StorageFolderCard';
import { HddFolderSubfolderTreeView } from './HddFolderSubfolderTreeView';
import { HddHealthRebalanceAdvisor } from './HddHealthRebalanceAdvisor';
import { StorageCatalogView } from './StorageCatalogView';
import { SubFolderCatalog } from './SubFolderCatalog';
import { HddSettingsModal } from './HddSettingsModal';
import { PythonScriptModal } from './PythonScriptModal';
import { StorageExcelUploadModal } from './StorageExcelUploadModal';
import { formatBytes, generateSampleHddExcel } from '../utils/storageExcelHelper';

interface StorageManagementCardProps {
  folders: StorageFolder[];
  overviewStats: StorageOverviewStats;
  drives: HardDriveProfile[];
  transferPlans: HddTransferPlan[];
  onOpenFolder: (folder: StorageFolder) => void;
  onOpenSubfolder: (subfolder: StorageSubfolder, parentFolder: StorageFolder) => void;
  onUpdateSubfolder: (parentFolderId: string, subfolderId: string, updatedFields: Partial<StorageSubfolder>) => void;
  onDeleteSubfolder: (parentFolderId: string, subfolderId: string) => void;
  onBulkDeleteSubfolders: (items: { parentFolderId: string; subfolderId: string }[]) => void;
  onBulkMoveSubfoldersToHdd: (items: { parentFolderId: string; subfolderId: string }[], targetHddId: string, targetHddName?: string) => void;
  onBulkMoveSubfoldersToParent: (items: { parentFolderId: string; subfolderId: string }[], targetParentId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onBulkDeleteFolders: (folderIds: string[]) => void;
  onBulkMoveFoldersToHdd: (folderIds: string[], targetHddId: string, targetHddName?: string) => void;
  onOpenNewFolderModal: () => void;
  onSaveDrives: (newDrives: HardDriveProfile[]) => void;
  onAddCustomFolder: (newFolder: StorageFolder) => void;
  onImportExcelComplete: (folders: StorageFolder[], drives: HardDriveProfile[]) => void;
  onAddTransferPlan: (plan: Omit<HddTransferPlan, 'id' | 'createdAt'>) => void;
  onRemoveTransferPlan: (planId: string) => void;
  onTogglePlanStatus: (planId: string) => void;
  onClearCompletedPlans: () => void;
}

export const StorageManagementCard: React.FC<StorageManagementCardProps> = ({
  folders,
  overviewStats,
  drives,
  transferPlans,
  onOpenFolder,
  onOpenSubfolder,
  onUpdateSubfolder,
  onDeleteSubfolder,
  onBulkDeleteSubfolders,
  onBulkMoveSubfoldersToHdd,
  onBulkMoveSubfoldersToParent,
  onDeleteFolder,
  onBulkDeleteFolders,
  onBulkMoveFoldersToHdd,
  onOpenNewFolderModal,
  onSaveDrives,
  onAddCustomFolder,
  onImportExcelComplete,
  onAddTransferPlan,
  onRemoveTransferPlan,
  onTogglePlanStatus,
  onClearCompletedPlans,
}) => {
  // Navigation Tabs for Storage Management
  const [activeStorageTab, setActiveStorageTab] = useState<'subfolder-catalog' | 'catalog' | 'tree' | 'health' | 'cards'>('subfolder-catalog');

  // Modal open states
  const [isHddSettingsOpen, setIsHddSettingsOpen] = useState(false);
  const [isPythonScriptOpen, setIsPythonScriptOpen] = useState(false);
  const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);

  // Filters for Cards View
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('ALL');

  // Unique owners for filter dropdown
  const owners = useMemo(() => {
    return Array.from(new Set(folders.map(f => f.ownerName || 'Admin')));
  }, [folders]);

  // Filtered folders for Card View
  const filteredFolders = useMemo(() => {
    return folders.filter(folder => {
      const matchSearch =
        folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        folder.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (folder.ownerName && folder.ownerName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchOwner = selectedOwner === 'ALL' || folder.ownerName === selectedOwner;

      let matchSize = true;
      if (selectedSizeFilter === 'SMALL') {
        matchSize = folder.usedBytes < 1024 * 1024 * 1024; // < 1GB
      } else if (selectedSizeFilter === 'MEDIUM') {
        matchSize =
          folder.usedBytes >= 1024 * 1024 * 1024 && folder.usedBytes <= 3 * 1024 * 1024 * 1024;
      } else if (selectedSizeFilter === 'LARGE') {
        matchSize = folder.usedBytes > 3 * 1024 * 1024 * 1024;
      }

      return matchSearch && matchOwner && matchSize;
    });
  }, [folders, searchQuery, selectedOwner, selectedSizeFilter]);

  // Overall drives calculations
  const totalCapacityAllDrives = useMemo(() => {
    return drives.reduce((sum, d) => sum + (d.totalCapacityGB || 2000) * 1024 * 1024 * 1024, 0);
  }, [drives]);

  const totalUsedAllDrives = useMemo(() => {
    return drives.reduce((sum, d) => sum + (d.usedBytes || 0), 0);
  }, [drives]);

  const overallPercent = Math.min(
    100,
    Math.round((totalUsedAllDrives / (totalCapacityAllDrives || 1)) * 100)
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-6 mb-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 dark:shadow-none">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Storage Management & 4 External HDD
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/50">
                4 Hardisk Aktif
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50">
                Python + Excel Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pindai isi 4 hardisk via script Python, upload Excel manifest, visualisasikan folder & subfolder, serta jaga kesehatan HDD
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Settings & Custom Form Button */}
          <button
            type="button"
            onClick={() => setIsHddSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Buka pengaturan 4 HDD & form pengisian kustom"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Setting & Form Kustom</span>
          </button>

          {/* Python Scanner Button */}
          <button
            type="button"
            onClick={() => setIsPythonScriptOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
            title="Download script Python untuk mendata isi 4 HDD"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span>Script Python</span>
          </button>

          {/* Upload Excel Button */}
          <button
            type="button"
            onClick={() => setIsExcelUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            title="Upload file Excel hasil scanner Python"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Excel</span>
          </button>

          {/* New Folder Modal Button */}
          <button
            type="button"
            onClick={onOpenNewFolderModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Folder Baru</span>
          </button>
        </div>
      </div>

      {/* 4 HDD Health Quick Bar */}
      <div className="py-4 my-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
            <PieChart className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Status Kapasitas Gabungan 4 Hardisk Eksternal</span>
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            Terpakai: <span className="font-bold text-slate-800 dark:text-slate-200">{formatBytes(totalUsedAllDrives)}</span> dari{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">{formatBytes(totalCapacityAllDrives)}</span> (
            <span
              className={`font-bold ${
                overallPercent >= 85
                  ? 'text-rose-600 dark:text-rose-400'
                  : overallPercent >= 75
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {overallPercent}%
            </span>)
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden flex">
          <div
            style={{ width: `${overallPercent}%` }}
            className={`h-full transition-all duration-300 ${
              overallPercent >= 85
                ? 'bg-rose-500'
                : overallPercent >= 75
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
        </div>

        {/* 4 Hardisk Cards Quick Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {drives.map(drive => {
            const cap = (drive.totalCapacityGB || 1) * 1024 * 1024 * 1024;
            const usePct = Math.round((drive.usedBytes / cap) * 100);
            const isCrit = usePct >= 85;
            const isWarn = usePct >= (drive.warningThresholdPercent || 80);

            return (
              <div
                key={drive.id}
                onClick={() => setActiveStorageTab('tree')}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  isCrit
                    ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                    : isWarn
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {drive.driveLetterOrMount}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isCrit
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : isWarn
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {isCrit ? 'Kritis' : isWarn ? 'Waspada' : 'Aman'}
                  </span>
                </div>

                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                  {drive.name.split('-')[0]}
                </div>

                <div className="w-full bg-slate-200/80 dark:bg-slate-700 rounded-full h-1.5 my-1 overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, usePct)}%` }}
                    className={`h-full ${
                      isCrit ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>{usePct}% Terpakai</span>
                  <span>{formatBytes(drive.usedBytes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setActiveStorageTab('subfolder-catalog')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStorageTab === 'subfolder-catalog'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Katalog Subfolder (~8,000+)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStorageTab('catalog')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStorageTab === 'catalog'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Katalog Produk Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStorageTab('tree')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStorageTab === 'tree'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Hirarki Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStorageTab('health')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer relative ${
              activeStorageTab === 'health'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Jaga Kesehatan HDD</span>
            {transferPlans.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {transferPlans.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveStorageTab('cards')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStorageTab === 'cards'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Grid Kartu ({folders.length})</span>
          </button>
        </div>

        {/* Sample Excel Helper Shortcut */}
        <button
          type="button"
          onClick={generateSampleHddExcel}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Download Template Excel 4 HDD</span>
        </button>
      </div>

      {/* Tab: SubFolder Catalog View */}
      {activeStorageTab === 'subfolder-catalog' && (
        <SubFolderCatalog
          folders={folders}
          drives={drives}
          onOpenSubfolder={onOpenSubfolder}
          onUpdateSubfolder={onUpdateSubfolder}
          onDeleteSubfolder={onDeleteSubfolder}
          onBulkDelete={onBulkDeleteSubfolders}
          onBulkMoveToHdd={onBulkMoveSubfoldersToHdd}
          onBulkMoveToParent={onBulkMoveSubfoldersToParent}
        />
      )}

      {/* Tab 0: Catalog Product View */}
      {activeStorageTab === 'catalog' && (
        <StorageCatalogView
          folders={folders}
          drives={drives}
          onOpenFolder={onOpenFolder}
          onDeleteFolder={onDeleteFolder}
          onBulkDelete={onBulkDeleteFolders}
          onBulkMoveToHdd={onBulkMoveFoldersToHdd}
        />
      )}

      {/* Tab 1: Hierarchical Folder & Subfolder Tree View */}
      {activeStorageTab === 'tree' && (
        <HddFolderSubfolderTreeView
          folders={folders}
          drives={drives}
          onOpenFolderDetail={onOpenFolder}
          transferPlans={transferPlans}
          onAddTransferPlan={onAddTransferPlan}
          onRemoveTransferPlan={onRemoveTransferPlan}
          onTogglePlanStatus={onTogglePlanStatus}
        />
      )}

      {/* Tab 2: Health Rebalance Advisor */}
      {activeStorageTab === 'health' && (
        <HddHealthRebalanceAdvisor
          drives={drives}
          folders={folders}
          transferPlans={transferPlans}
          onAddTransferPlan={onAddTransferPlan}
          onRemoveTransferPlan={onRemoveTransferPlan}
          onTogglePlanStatus={onTogglePlanStatus}
          onClearCompleted={onClearCompletedPlans}
        />
      )}

      {/* Tab 3: Classic Cards View */}
      {activeStorageTab === 'cards' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search folders by name or tag..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-indigo-600 outline-none transition text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedOwner}
                onChange={e => setSelectedOwner(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium outline-none cursor-pointer"
              >
                <option value="ALL">All Owners</option>
                {owners.map(o => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>

              <select
                value={selectedSizeFilter}
                onChange={e => setSelectedSizeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-medium outline-none cursor-pointer"
              >
                <option value="ALL">All Sizes</option>
                <option value="SMALL">&lt; 1 GB</option>
                <option value="MEDIUM">1 GB - 3 GB</option>
                <option value="LARGE">&gt; 3 GB</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredFolders.map(folder => (
              <StorageFolderCard key={folder.id} folder={folder} onOpenFolder={onOpenFolder} />
            ))}
          </div>

          {filteredFolders.length === 0 && (
            <div className="text-center py-16 px-4 bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl mt-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-100 dark:border-indigo-900">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {searchQuery || selectedOwner !== 'ALL' || selectedSizeFilter !== 'ALL'
                  ? 'Tidak ada folder yang cocok'
                  : 'Belum Ada Folder Penyimpanan'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Gunakan tombol "Upload Excel" untuk mengimpor hasil scanner Python 4 HDD Anda, atau klik "Setting & Form Kustom" untuk menambah folder manual.
              </p>
              <button
                type="button"
                onClick={onOpenNewFolderModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Buat Folder Pertama</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals Managed by StorageManagementCard */}
      <HddSettingsModal
        isOpen={isHddSettingsOpen}
        onClose={() => setIsHddSettingsOpen(false)}
        drives={drives}
        onSaveDrives={onSaveDrives}
        onAddCustomFolder={onAddCustomFolder}
      />

      <PythonScriptModal
        isOpen={isPythonScriptOpen}
        onClose={() => setIsPythonScriptOpen(false)}
        onOpenUploadModal={() => setIsExcelUploadOpen(true)}
      />

      <StorageExcelUploadModal
        isOpen={isExcelUploadOpen}
        onClose={() => setIsExcelUploadOpen(false)}
        currentDrives={drives}
        onImportComplete={onImportExcelComplete}
        onOpenPythonModal={() => setIsPythonScriptOpen(true)}
      />
    </div>
  );
};
